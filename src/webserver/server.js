import { handler } from "../../build/handler.js";
import encryption from "./encryption.js";
import cookieParser from "cookie-parser";
import express from "express";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from 'firebase-admin/auth';
import * as Pusher from "pusher";
import crypto from "crypto";
import base64url from "base64url";
import querystring from "querystring";
import axios from "axios";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import * as cron from "node-cron";

//initialize express server
const app = express();

//spotify credentials
const id = "4d5e942d117f4de793c86a1c53c3d393";
const secret = "1e694b8c1aae43efa11b0df5330dfd72";
const redirect = "http://localhost:3000/callback";

//middleware
app.use(cookieParser()); //parses all cookies incoming from requests
app.use(express.json()); //parses all headers into json that are intended as json but not formatted in json

//initialize firebase admin sdk
initializeApp({
    credential: applicationDefault(), //uses the environment variable
    databaseURL: ""
});

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
        params.append("redirect_uri", "http://localhost:3000/callback");
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
            const spotifyTopTracks = axios.get(`https://api.spotify.com/v1/me/top/tracks`, {
                params : {
                    time_range: "short_term",
                },
                headers: {
                    Authorization: `Bearer ${access}`
                }
            });
            const spotifyTopArtists = axios.get(`https://api.spotify.com/v1/me/top/artists`, {
                params : {
                    time_range: "short_term",
                },
                headers: {
                    Authorization: `Bearer ${access}`
                }
            });
            axios.all([spotifyMe, spotifyTopTracks, spotifyTopArtists]).then(axios.spread(async (...allResponses) => {
                const userData = allResponses[0];
                const topTracks = allResponses[1];
                const topArtists = allResponses[2];
                
                let tracks = [];

                for (let track of topTracks.data.items) {
                    tracks.push(track.id);
                }
                
                let artists = [];

                for (let artist of topArtists.data.items) {
                    artists.push(artist.id);
                }

                const customToken = await createFirebaseAccount(userData.data.id, access, refresh, userData.data.display_name, userData.data.images[0].url, userData.data.email, tracks, artists);
                const customTokenEncrypted = encryption.encrypt(customToken);
                res.cookie("access_firebase", customTokenEncrypted, {
                    secure: true,
                    httpOnly: true,
                    maxAge: 3600,
                });
                startCronJobs(access, refresh, userData.data.uid);
                res.redirect("/signin");
            }));
        });
    }
})

app.use(handler); //sends users to the frontend

app.listen(3000, () => {
    console.log("Listening on port 3000");
});

//firebase functions
async function createFirebaseAccount(uuid, access, refresh, name, photoURL, email, topTracks, topArtists) {
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
    await setDoc(doc(db, `users/${uuid}`), {
        displayName: name,
        photoURL,
        access,
        refresh,
        topTracks,
        topArtists
    });

    const token = await getAuth().createCustomToken(uuid);
    return token;
}

function startCronJobs(access, refresh, uuid) {
    //cron job that runs every 5 minutes
    //this one gets the user's recently played and uses pusher to serve the new tracks in real time
    const fiveMin = cron.schedule('*/5 * * * *', () => {
        axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=5", {
            headers: {
                Authorization: `Bearer ${access}`
            }        
        }).then(data => {
            const items = data.data.items;
            const arr = items.map(e => ({
                played_at: e.played_at,
                track_name: e.track.name
            }));

            pusher.trigger("cache-recently-played", uuid, {
                data: arr
            });
        }).catch(err => {
            //if the error code is 401, that means the access token is invalid
            //get a new access token by using the refresh
            if (err.response?.status === 401) {
                const params = new URLSearchParams();
                params.append("grant_type", "refresh_token");
                params.append("refresh_token", refresh);
                params.append("client_id", id);
                axios.post("https://accounts.spotify.com/api/token", params, {
                    headers: {
                        "Authorization": "Basic " + (new Buffer(id + ":" + secret).toString("base64")),
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }).then(spotifyData => {
                    //if we can refresh the access, then retry
                    const newAccess = spotifyData.data.access_token;
                    axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=5", {
                        headers: {
                            Authorization: `Bearer ${newAccess}`
                        }        
                    }).then(tracksData => {
                        const items = tracksData.data.items;
                        const arr = items.map(e => ({
                            played_at: e.played_at,
                            track_name: e.track.name
                        }));

                        pusher.trigger("cache-recently-played", uuid, {
                            data: arr
                        });
                    }).catch(reason => {
                        //otherwise, stop the cron job entirely
                        fiveMin.stop();
                    })
                })    
            }
        });
    });

    //cron job that executes every 13 minutes
    //this one is for tracking the user's recently played and adding it to firebase
    //unsure if this will be implemented fully since this could be potentially super expensive on firebase
    const thirteenMin = cron.schedule('*/13 * * * *', () => {
        axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=10", {
            headers: {
                Authorization: `Bearer ${access}`
            }        
        }).then(data => {
            for (let item of data.data.items) {
                console.log(item);
            }
            
            pusher.trigger("spotify-scrobbles", uuid, {
                test: "test" 
            });
        }).catch(err => {
            if (err.response.status === 401) {
                const params = new URLSearchParams();
                params.append("grant_type", "refresh_token");
                params.append("refresh_token", refresh);
                params.append("client_id", id);
                axios.post("https://accounts.spotify.com/api/token", params, {
                    headers: {
                        "Authorization": "Basic " + (new Buffer(id + ":" + secret).toString("base64")),
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }).then((spotifyData) => {
                    const newAccess = spotifyData.data.access_token;
                    axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=10", {
                        headers: {
                            Authorization: `Bearer ${newAccess}`
                        }        
                    }).then(tracksData => {
                        for (let item of data.data.items) {
                            console.log(item);
                        }
                        
                        pusher.trigger("spotify-scrobbles", uuid, {
                            test: "test" 
                        });
                    }).catch(err => {
                        thirteenMin.stop();
                    });
                })
            }
        })
    });
}