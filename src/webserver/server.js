import "dotenv/config";
import { pathToFileURL } from "node:url";
import { createAuthRouter } from "./auth.js";
import cookieParser from "cookie-parser";
import express from "express";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as Pusher from "pusher";
import axios from "axios";
import * as cron from "node-cron";

//initialize express server
export const app = express();

// Spotify credentials are loaded from the local environment.
const id = process.env.SPOTIFY_CLIENT_ID;

//middleware
app.use(cookieParser()); //parses all cookies incoming from requests
app.use(express.json()); //parses all headers into json that are intended as json but not formatted in json
// app.use(prerender.set('prerenderToken', 'rCgpsgWBD1pqJ1kMfX0M'));

//initialize firebase admin sdk
if (!getApps().length) initializeApp({
    credential: applicationDefault(), //uses the environment variable
    databaseURL: ""
});

const db = getFirestore();

//initialize pusher node (only intended for server) client
const pusher = new Pusher.default({
    key: "5e07f212c04ae7ccbb27",
    appId: "1429007",
    secret: "c697355a10163fb3bdf4",
    cluster: "us2",
});

/**
 * EXPRESS ROUTES
 * everything that should be handled by backend goes in here
 * (encryption, decryption, firebase admin sdk)
 * everything else should be handled by sveltekit
 */

app.use(createAuthRouter({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    createAccount: createFirebaseAccount,
    onLogin: startCronJobs,
}));

// Vite mounts the same backend without starting a second listener.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { handler } = await import('../../build/handler.js');
    app.use(handler);
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Listening on port ${port}`));
}

//firebase functions
export async function createFirebaseAccount(uuid, access, refresh, name, photoURL, email, topTracks, topArtists, artistsPastFourWeeks, tracksPastFourWeeks, artistsPastSixMonths, tracksPastSixMonths, artistsPastLifetime, tracksPastLifetime, genresFourWeeks, genresSixMonths, genresLifetime) {
    const profile = {
        displayName: name,
        ...(email ? { email, emailVerified: true } : {}),
        ...(photoURL ? { photoURL } : {}),
    };
    await getAuth().updateUser(uuid, profile).catch(async err => {
        if (err.code === "auth/user-not-found") {
            await getAuth().createUser({ uid: uuid, ...profile });
        } else {
            throw err;
        }
    });
    await db.collection("users").doc(uuid).set({
        displayName: name,
        photoURL,
        access,
        ...(refresh ? { refresh } : {}),
        topTracks,
        topArtists,
        artistsPastFourWeeks,
        tracksPastFourWeeks,
        artistsPastSixMonths,
        tracksPastSixMonths,
        artistsPastLifetime,
        tracksPastLifetime,
        genresFourWeeks,
        genresSixMonths,
        genresLifetime,
    }, {
        merge: true
    });

    const token = await getAuth().createCustomToken(uuid);
    return token;
}

async function runTransactionForTrack(uuid, trackId, playedAt, amntOfPlays) {
    try {
        const reference = db.collection("users").doc(uuid).collection("tracker").doc(trackId);
        await db.runTransaction(async (transaction) => {
            const track = await transaction.get(reference);

            if (!track.exists) {
                await transaction.create(reference, {
                    playedAt,
                    plays: amntOfPlays,
                })
            } else {
                const lastPlayed = track.data().playedAt.toDate();
    
                if (lastPlayed >= playedAt) {
                    throw new Error("Last played is equal to playedAt");
                } else {
                    await transaction.update(reference, {
                        playedAt,
                        plays: FieldValue.increment(amntOfPlays),
                    });
                }
            }
        });
    } catch (err) {
        console.log(err);
    }
}

async function pushActivityToFirebase(arr, uuid) {
    let trackPlays = {};
    let currentTrackId = "";

    arr.forEach(async (track) => {
        currentTrackId = track.id;
        let lastPlayedFirebase = null;
        let trackPlayedAt = new Date(track.played_at);
        if (track.id !== currentTrackId) {
            const data = await db.collection("users").doc(uuid).collection("tracker").doc(trackId).get();
            lastPlayedFirebase = data.data().playedAt.toDate();
        }
        if (trackPlays[track.id] && trackPlays[track.id].hasOwnProperty("plays")) {
            if (trackPlayedAt > lastPlayedFirebase) {
                trackPlays[track.id].plays = trackPlays[track.id].plays + 1;
                trackPlays[track.id].lastPlayed = trackPlayedAt;
            }
        } else {
            trackPlays[track.id] = {
                id: track.id,
                lastPlayed: trackPlayedAt,
                plays: 1,
            };
        }
    });

    console.log(trackPlays);

    for (const data in trackPlays) {
        runTransactionForTrack(uuid, trackPlays[data].id, trackPlays[data].lastPlayed, trackPlays[data].plays);
    }
}

async function startCronJobs(uuid) {
    const userData = await db.collection("users").doc(uuid).get();
    let access1 = userData.data().access;
    let refresh1 = userData.data().refresh;

    // for initial load
    axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=20", {
            headers: {
                Authorization: `Bearer ${access1}`
            }        
        }).then(data => {
            const items = data.data.items;
            const arr = items.map(e => ({
                played_at: e.played_at,
                id: e.track.id,
                name: e.track.name,
                artist: e.track.album.artists[0].name,
                image: e.track.album.images[1].url,
            }));

            pusher.trigger("cache-recently-played", uuid, {
                data: arr
            });
            
            pushActivityToFirebase(arr, uuid);
        }).catch(err => {
            console.log("first try: ", err);
            const params = new URLSearchParams();
            params.append("grant_type", "refresh_token");
            params.append("refresh_token", refresh1);
            params.append("client_id", id);
            axios.post("https://accounts.spotify.com/api/token", params, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }).then(async (spotifyData) => {
                //if we can refresh the access, then retry
                const newAccess = spotifyData.data.access_token;
                const newRefresh = spotifyData.data.refresh_token;

                await db.collection("users").doc(uuid).set({
                    access: newAccess,
                    refresh: newRefresh
                }, {
                    merge: true 
                }); 

                axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=20", {
                    headers: {
                        Authorization: `Bearer ${newAccess}`
                    }        
                }).then(tracksData => {
                    const items = tracksData.data.items;
                    const arr = items.map(e => ({
                        played_at: e.played_at,
                        id: e.track.id,
                        name: e.track.name,
                        artist: e.tracks.artists[0].name,
                        image: e.tracks.images[1].url,
                    }));

                    pusher.trigger("cache-recently-played", uuid, {
                        data: arr
                    });
        
                    pushActivityToFirebase(arr, uuid);
                }).catch(reason => {
                    console.log("second try: ", reason);
                })
            })    
        });

    //cron job that runs every 40 minutes
    //this one gets the user's recently played and uses pusher to serve the new tracks in real time
    const fiveMin = cron.schedule('*/40 * * * *', async () => {
        const userData = await db.collection("users").doc(uuid).get();
        let access2 = userData.data().access;
        let refresh2 = userData.data().refresh;

        axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=20", {
            headers: {
                Authorization: `Bearer ${access2}`
            }        
        }).then(data => {
            const items = data.data.items;
            const arr = items.map(e => ({
                played_at: e.played_at,
                id: e.track.id,
                name: e.track.name,
                artist: e.track.album.artists[0].name,
                image: e.track.album.images[1].url,
                albumId: e.track.album.id,
            }));

            pusher.trigger("cache-recently-played", uuid, {
                data: arr
            });
            
            pushActivityToFirebase(arr, uuid);
        }).catch(err => {
            console.log("first try ", err);
            const params = new URLSearchParams();
            params.append("grant_type", "refresh_token");
            params.append("refresh_token", refresh2);
            params.append("client_id", id);
            axios.post("https://accounts.spotify.com/api/token", params, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }).then(async (spotifyData) => {
                //if we can refresh the access, then retry
                const newAccess = spotifyData.data.access_token;
                const newRefresh = spotifyData.data.refresh_token;

                await db.collection("users").doc(uuid).set({
                    access: newAccess,
                    refresh: newRefresh
                }, {
                    merge: true 
                }); 

                axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=20", {
                    headers: {
                        Authorization: `Bearer ${newAccess}`
                    }        
                }).then(tracksData => {
                    const items = tracksData.data.items;
                    const arr = items.map(e => ({
                        played_at: e.played_at,
                        id: e.track.id,
                        name: e.track.name,
                        artist: e.tracks.artists[0].name,
                        image: e.tracks.images[1].url,
                    }));

                    pusher.trigger("cache-recently-played", uuid, {
                        data: arr
                    });
        
                    pushActivityToFirebase(arr, uuid);
                }).catch(reason => {
                    console.log("first try ", reason);
                    //otherwise, stop the cron job entirely
                    fiveMin.stop();
                })
            });
        });
    });
}
