import encryption from "./encryption.js";
import cookieParser from "cookie-parser";
import express from "express";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as Pusher from "pusher";
import crypto from "crypto";
import base64url from "base64url";
import querystring from "querystring";
import axios from "axios";
import * as cron from "node-cron";
import { handler } from "./build/handler.js";

//initialize express server
const app = express();

//spotify credentials
const id = "4d5e942d117f4de793c86a1c53c3d393";
const secret = "1e694b8c1aae43efa11b0df5330dfd72";
const redirect = "https://radiowave.app/callback";

//middleware
app.use(cookieParser()); //parses all cookies incoming from requests
app.use(express.json()); //parses all headers into json that are intended as json but not formatted in json
// app.use(prerender.set('prerenderToken', 'rCgpsgWBD1pqJ1kMfX0M'));

//initialize firebase admin sdk
initializeApp({
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

//decrypts encrypted firebase custom access token and sends it back to the client
app.post("/api/v1/firebase", (req, res) => {
    const decryptedCookie = encryption.decrypt(req.body.access_firebase);
    res.send({
        access_firebase: decryptedCookie
    });
});

app.get("/login", (req, res) => {
    const state = encryption.generateRandString(16); //used for auth code flow in spotify to verify that the request is coming from this server
    //whole bunch of bullshit for spotify authentication and verifying it so it minimizes attacks from diff servers
    const verifier = encryption.generateRandString(64);
    const digest = crypto.createHash("sha256").update(verifier).digest("base64");
    const challenge = base64url.fromBase64(digest);

    const verifierEncrypted = encryption.encrypt(verifier);
    res.cookie("verifier", verifierEncrypted, {
        httpOnly: true,
        secure: true,
        maxAge: 30000,
    });

    res.cookie("state", state, {
        httpOnly: true,
        secure: true,
        maxAge: 30000,
    });
    
    //redirects user to spotify to sign in
    res.redirect("https://accounts.spotify.com/authorize?" +
        querystring.stringify({
            response_type: "code",
            client_id: id,
            redirect_uri: redirect,
            state: state,
            code_challenge_method: "S256",
            code_challenge: challenge,
            scope: "user-read-private user-top-read user-read-currently-playing user-read-email user-read-playback-state user-read-recently-played",
        })); //creates a query string because i don't know how else to do that
});

app.get("/callback", (req, res) => {
    //verifying that the state from spotify's response is the state the server sent in
    if (req.query.state === req.cookies.state) {
        //i don't know how else to format a urlencoded header
        const params = new URLSearchParams();
        let decryptedVerifier = encryption.decrypt(req.cookies.verifier);

        params.append("grant_type", "authorization_code");
        params.append("code", req.query.code.toString());
        params.append("redirect_uri", "https://radiowave.app/callback");
        params.append("client_id", id);
        params.append("code_verifier", decryptedVerifier);

        //sending a request to spotify for an access and refresh token
        axios.post("https://accounts.spotify.com/api/token", params, {
            headers: {
                "Authorization": "Basic " + (new Buffer(id + ":" + secret).toString("base64")),
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
            },
        }).then(response => {
            const refresh = response.data.refresh_token;
            const access = response.data.access_token;

            //creating or updating the users firebase account
            const spotifyMe = axios.get(`https://api.spotify.com/v1/me`, {
                headers: {
                    Authorization: `Bearer ${access}`
                }
            });
            const spotifyTopTracksPastFourWeeks = axios.get(`https://api.spotify.com/v1/me/top/tracks`, {
                params : {
                    time_range: "short_term",
                },
                headers: {
                    Authorization: `Bearer ${access}`
                }
            });
            const spotifyTopArtistsPastFourWeeks = axios.get(`https://api.spotify.com/v1/me/top/artists`, {
                params : {
                    time_range: "short_term",
                },
                headers: {
                    Authorization: `Bearer ${access}`
                }
            });
            const spotifyTopTracksPastSixMo = axios.get(`https://api.spotify.com/v1/me/top/tracks`, {
                params : {
                    time_range: "medium_term",
                },
                headers: {
                    Authorization: `Bearer ${access}`
                }
            });
            const spotifyTopArtistsPastSixMo = axios.get(`https://api.spotify.com/v1/me/top/artists`, {
                params : {
                    time_range: "medium_term",
                },
                headers: {
                    Authorization: `Bearer ${access}`
                }
            });
            const spotifyTopTracksPastLifetime = axios.get(`https://api.spotify.com/v1/me/top/tracks`, {
                params : {
                    time_range: "long_term",
                },
                headers: {
                    Authorization: `Bearer ${access}`
                }
            });
            const spotifyTopArtistsPasLifetime = axios.get(`https://api.spotify.com/v1/me/top/artists`, {
                params : {
                    time_range: "long_term",
                },
                headers: {
                    Authorization: `Bearer ${access}`
                }
            });
            axios.all([spotifyMe, spotifyTopTracksPastFourWeeks, spotifyTopArtistsPastFourWeeks, spotifyTopTracksPastSixMo, spotifyTopArtistsPastSixMo, spotifyTopTracksPastLifetime, spotifyTopArtistsPasLifetime]).then(axios.spread(async (...allResponses) => {
                const userData = allResponses[0];
                const topTracksPastFourWeeks = allResponses[1];
                const topArtistsPastFourWeeks = allResponses[2];
                const topTracksPastSixMo = allResponses[3];
                const topArtistsPastSixMo = allResponses[4];
                const topTracksPastLifetime = allResponses[5];
                const topArtistsPastLifetime = allResponses[6];
                
                let tracksFourWeeks = [];
                for (let track of topTracksPastFourWeeks.data.items) {
                    tracksFourWeeks.push(track.id);
                    tracksFourWeeks = tracksFourWeeks;
                }
                
                let artistsFourWeeks = [];
                for (let artist of topArtistsPastFourWeeks.data.items) {
                    artistsFourWeeks.push(artist.id);
                    artistsFourWeeks = artistsFourWeeks;
                }
                
                let tracksFourWeeksFullData = [];
                for (let track of topTracksPastFourWeeks.data.items) {
                    tracksFourWeeksFullData.push({
                        id: track.id,
                        name: track.name,
                        artist: track.artists[0].name,
                        image: track.album.images[1].url,
                    });
                    tracksFourWeeksFullData = tracksFourWeeksFullData;
                }
                
                let artistsFourWeeksFullData = [];
                for (let artist of topArtistsPastFourWeeks.data.items) {
                    artistsFourWeeksFullData.push({
                        id: artist.id,
                        name: artist.name,
                        image: artist.images[1].url,
                        genres: artist.genres,
                    });
                    artistsFourWeeksFullData = artistsFourWeeksFullData;
                }
                
                let tracksSixMo = [];
                for (let track of topTracksPastSixMo.data.items) {
                    tracksSixMo.push({
                        id: track.id,
                        name: track.name,
                        artist: track.artists[0].name,
                        image: track.album.images[1].url,
                    });
                    tracksSixMo = tracksSixMo;
                }
                
                let artistsSixMo = [];
                for (let artist of topArtistsPastSixMo.data.items) {
                    artistsSixMo.push({
                        id: artist.id,
                        name: artist.name,
                        image: artist.images[1].url,
                        genres: artist.genres,
                    });
                    artistsSixMo = artistsSixMo;
                }
                
                let tracksLifetime = [];
                for (let track of topTracksPastLifetime.data.items) {
                    tracksLifetime.push({
                        id: track.id,
                        name: track.name,
                        artist: track.artists[0].name,
                        image: track.album.images[1].url,
                    });
                    tracksLifetime = tracksLifetime;
                }
                
                let artistsLifetime = [];
                for (let artist of topArtistsPastLifetime.data.items) {
                    artistsLifetime.push({
                        id: artist.id,
                        name: artist.name,
                        image: artist.images[1].url,
                        genres: artist.genres,
                    });
                    artistsLifetime = artistsLifetime;
                }

                let genresFourWeeks = countGenreOccurrencesForArtists(artistsFourWeeksFullData);
                let genresSixMonths = countGenreOccurrencesForArtists(artistsSixMo);
                let genresLifetime = countGenreOccurrencesForArtists(artistsLifetime);

                const customToken = await createFirebaseAccount(userData.data.id, access, 
                    refresh, userData.data.display_name, userData.data.images[0].url, 
                    userData.data.email, tracksFourWeeks, artistsFourWeeks, artistsFourWeeksFullData, 
                    tracksFourWeeksFullData, artistsSixMo, tracksSixMo, artistsLifetime,
                    tracksLifetime, genresFourWeeks, genresSixMonths, genresLifetime);
                const customTokenEncrypted = encryption.encrypt(customToken);
                res.cookie("access_firebase", customTokenEncrypted, {
                    secure: true,
                    httpOnly: true,
                    maxAge: 3600,
                });
                startCronJobs(userData.data.id);
                res.redirect("/signin");
            }));
        });
    }
})

app.use(handler); //sends users to the frontend

app.listen(3000, () => {
    console.log("Listening on port 3000");
});

function countGenreOccurrencesForArtists(artists) {
    const occurrences = {};
    for (const artist of artists) {
        console.log(artist);
        for (const genre of artist.genres) {
            if (occurrences[genre.toLowerCase()]) {
                occurrences[genre.toLowerCase()] = occurrences[genre.toLowerCase()] + 1;
            } else {
                occurrences[genre.toLowerCase()] = 1;
            }
        }
    }
    return occurrences;
}

//firebase functions
async function createFirebaseAccount(uuid, access, refresh, name, photoURL, email, topTracks, topArtists, artistsPastFourWeeks, tracksPastFourWeeks, artistsPastSixMonths, tracksPastSixMonths, artistsPastLifetime, tracksPastLifetime, genresFourWeeks, genresSixMonths, genresLifetime) {
    const createAccount = getAuth().updateUser(uuid, {
        email,
        emailVerified: true,
        displayName: name,
        photoURL,
    }).catch(err => {
        if (err.code === "auth/user-not-found") {
            getAuth().createUser({
                uid: uuid,
                email,
                displayName: name,
                photoURL,
                emailVerified: true,
            });
        }
    });

    await Promise.all([createAccount]);
    await db.collection("users").doc(uuid).set({
        displayName: name,
        photoURL,
        access,
        refresh,
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
    arr.forEach((track) => {
        if (trackPlays[track.id] && trackPlays[track.id].hasOwnProperty("plays")) {
            trackPlays[track.id].plays = trackPlays[track.id].plays + 1;
        } else {
            trackPlays[track.id] = {
                id: track.id,
                lastPlayed: new Date(track.played_at),
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
    let access = userData.data().access;
    let refresh = userData.data().refresh;

    // for initial load
    axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=20", {
            headers: {
                Authorization: `Bearer ${access}`
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
            params.append("refresh_token", refresh);
            params.append("client_id", id);
            axios.post("https://accounts.spotify.com/api/token", params, {
                headers: {
                    "Authorization": "Basic " + (new Buffer(id + ":" + secret).toString("base64")),
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
        let access = userData.data().access;
        let refresh = userData.data().refresh;

        axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=20", {
            headers: {
                Authorization: `Bearer ${access}`
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
            params.append("refresh_token", refresh);
            params.append("client_id", id);
            axios.post("https://accounts.spotify.com/api/token", params, {
                headers: {
                    "Authorization": "Basic " + (new Buffer(id + ":" + secret).toString("base64")),
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