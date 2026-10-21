import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import axios from 'axios';

const scopes = 'user-read-private user-top-read user-read-currently-playing user-read-email user-read-playback-state user-read-recently-played';

function matchesState(state, storedState) {
    return typeof state === 'string' && typeof storedState === 'string' &&
        state.length > 0 && Buffer.byteLength(state) === Buffer.byteLength(storedState) &&
        timingSafeEqual(Buffer.from(state), Buffer.from(storedState));
}

function countGenres(artists) {
    const counts = {};
    for (const artist of artists) {
        for (const genre of artist.genres) {
            const name = genre.toLowerCase();
            counts[name] = (counts[name] || 0) + 1;
        }
    }
    return counts;
}

function trackSummary(track) {
    return {
        id: track.id,
        name: track.name,
        artist: track.artists?.[0]?.name || '',
        image: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
    };
}

function artistSummary(artist) {
    return {
        id: artist.id,
        name: artist.name,
        image: artist.images?.[1]?.url || artist.images?.[0]?.url || '',
        genres: artist.genres || [],
    };
}

export function createAuthRouter({
    clientId,
    clientSecret,
    redirectUri = 'http://127.0.0.1:5173/callback',
    createAccount,
    onLogin = () => {},
    http = axios,
}) {
    const router = express.Router();
    const callback = new URL(redirectUri);
    const cookieOptions = {
        httpOnly: true,
        secure: callback.protocol === 'https:',
        sameSite: 'lax',
        path: '/',
    };

    router.use(cookieParser());
    router.use(['/auth/login', '/callback', '/api/v1/firebase'], (_req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
    });

    router.get('/auth/login', (req, res) => {
        if (!clientId || !clientSecret) {
            return res.status(503).send('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env, then restart the server.');
        }
        
        if (req.get('host') !== callback.host) {
            return res.redirect(`${callback.origin}/auth/login`);
        }

        const state = randomBytes(32).toString('base64url');
        const verifier = randomBytes(64).toString('base64url');
        res.cookie('state', state, { ...cookieOptions, maxAge: 10 * 60 * 1000 });
        res.cookie('verifier', verifier, { ...cookieOptions, maxAge: 10 * 60 * 1000 });

        const query = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            state,
            code_challenge_method: 'S256',
            code_challenge: createHash('sha256').update(verifier).digest('base64url'),
            scope: scopes,
        });
        res.redirect(`https://accounts.spotify.com/authorize?${query}`);
    });

    router.get('/callback', async (req, res) => {
        const { state, verifier } = req.cookies;
        res.clearCookie('state', cookieOptions);
        res.clearCookie('verifier', cookieOptions);
        res.clearCookie('access_firebase', cookieOptions);

        if (!matchesState(req.query.state, state) || typeof verifier !== 'string' || !verifier) {
            return res.redirect('/login?error=invalid_state');
        }
        if (req.query.error) {
            return res.redirect('/login?error=access_denied');
        }
        if (typeof req.query.code !== 'string' || !req.query.code) {
            return res.redirect('/login?error=missing_code');
        }

        try {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: req.query.code,
                redirect_uri: redirectUri,
                client_id: clientId,
                code_verifier: verifier,
            });
            const { data: tokens } = await http.post('https://accounts.spotify.com/api/token', params, {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 15000,
            });
            const options = { headers: { Authorization: `Bearer ${tokens.access_token}` }, timeout: 15000 };
            const requests = ['short_term', 'medium_term', 'long_term'].flatMap(timeRange => [
                http.get('https://api.spotify.com/v1/me/top/tracks', { ...options, params: { time_range: timeRange } }),
                http.get('https://api.spotify.com/v1/me/top/artists', { ...options, params: { time_range: timeRange } }),
            ]);
            const [profile, ...top] = await Promise.all([
                http.get('https://api.spotify.com/v1/me', options),
                ...requests,
            ]);
            const user = profile.data;
            const [shortTracks, shortArtists, mediumTracks, mediumArtists, longTracks, longArtists] =
                top.map((response, index) => response.data.items.map(index % 2 === 0 ? trackSummary : artistSummary));

            const token = await createAccount(user.id, tokens.access_token, tokens.refresh_token,
                user.display_name || user.id, user.images?.[0]?.url || '', user.email,
                shortTracks.map(track => track.id), shortArtists.map(artist => artist.id),
                shortArtists, shortTracks, mediumArtists, mediumTracks, longArtists, longTracks,
                countGenres(shortArtists), countGenres(mediumArtists), countGenres(longArtists));

            res.cookie('access_firebase', token, { ...cookieOptions, maxAge: 5 * 60 * 1000 });
            res.redirect('/login');
            Promise.resolve().then(() => onLogin(user.id)).catch(() => {
                console.error('Could not start listening-history updates.');
            });
        } catch (error) {
            console.error('Spotify sign-in failed:', error.response?.status || error.code || 'account setup failed');
            res.redirect('/login?error=authentication_failed');
        }
    });

    router.post('/api/v1/firebase', (req, res) => {
        if (req.get('origin') && req.get('origin') !== callback.origin) {
            return res.status(403).json({ error: 'Invalid origin.' });
        }
        const token = req.cookies.access_firebase;
        if (!token) {
            return res.status(401).json({ error: 'Your sign-in has expired. Please try again.' });
        }
        res.clearCookie('access_firebase', cookieOptions);
        res.json({ access_firebase: token });
    });

    return router;
}
