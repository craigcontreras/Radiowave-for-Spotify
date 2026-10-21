import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import express from 'express';
import { createAuthRouter } from '../src/webserver/auth.js';

async function fixture(t, overrides = {}) {
    const accounts = [];
    const tokenRequests = [];
    const http = {
        async post(url, params, options) {
            tokenRequests.push({ url, params, options });
            return { data: { access_token: 'spotify-access', refresh_token: 'spotify-refresh' } };
        },
        async get(url) {
            if (url.endsWith('/me')) {
                return { data: { id: 'spotify-user', display_name: null, images: [] } };
            }
            return { data: { items: url.endsWith('/tracks')
                ? [{ id: 'track', name: 'Track', artists: [{ name: 'Artist' }], album: { images: [] } }]
                : [{ id: 'artist', name: 'Artist', images: [], genres: ['Pop', 'pop'] }] } };
        },
    };
    const app = express();
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const origin = `http://127.0.0.1:${server.address().port}`;
    app.use(createAuthRouter({
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: `${origin}/callback`,
        http,
        async createAccount(...args) {
            accounts.push(args);
            return 'firebase-custom-token';
        },
        ...overrides,
    }));
    const request = (path, options) => fetch(`${origin}${path}`, { redirect: 'manual', ...options });
    const begin = async () => {
        const response = await request('/auth/login');
        const cookies = response.headers.getSetCookie();
        const cookie = cookies.map(value => value.split(';')[0]).join('; ');
        const authorization = new URL(response.headers.get('location'));
        return { response, cookies, cookie, authorization };
    };
    return { request, begin, accounts, tokenRequests, origin };
}

test('login generates PKCE and cookies that work over local HTTP', async t => {
    const { begin, origin } = await fixture(t);
    const { response, cookies, cookie, authorization } = await begin();
    assert.equal(response.status, 302);
    assert.equal(authorization.origin, 'https://accounts.spotify.com');
    assert.equal(authorization.searchParams.get('redirect_uri'), `${origin}/callback`);
    assert.equal(authorization.searchParams.get('client_id'), 'test-client');
    const verifier = /verifier=([^;]+)/.exec(cookie)[1];
    assert.equal(authorization.searchParams.get('code_challenge'), createHash('sha256').update(verifier).digest('base64url'));
    for (const value of cookies) {
        assert.match(value, /HttpOnly/);
        assert.match(value, /SameSite=Lax/);
        assert.match(value, /Max-Age=600/);
        assert.doesNotMatch(value, /; Secure/);
    }
});

test('a successful callback uses the same redirect URI and creates an account without profile images or email', async t => {
    const { request, begin, accounts, tokenRequests, origin } = await fixture(t);
    const { cookie, authorization } = await begin();
    const response = await request(`/callback?state=${authorization.searchParams.get('state')}&code=auth-code`, {
        headers: { Cookie: cookie },
    });
    assert.equal(response.headers.get('location'), '/login');
    assert.equal(tokenRequests[0].params.get('redirect_uri'), `${origin}/callback`);
    assert.equal(tokenRequests[0].params.get('code_verifier'), /verifier=([^;]+)/.exec(cookie)[1]);
    assert.equal(accounts.length, 1);
    assert.deepEqual(accounts[0].slice(0, 6), ['spotify-user', 'spotify-access', 'spotify-refresh', 'spotify-user', '', undefined]);
    assert.deepEqual(accounts[0][6], ['track']);
    assert.deepEqual(accounts[0][8][0], { id: 'artist', name: 'Artist', image: '', genres: ['Pop', 'pop'] });
    assert.deepEqual(accounts[0][14], { pop: 2 });
    const tokenCookie = response.headers.getSetCookie().find(value => value.startsWith('access_firebase=firebase-custom-token'));
    assert.match(tokenCookie, /Max-Age=300/);
    const exchange = await request('/api/v1/firebase', { method: 'POST', headers: { Cookie: tokenCookie.split(';')[0], Origin: origin } });
    assert.equal(exchange.status, 200);
    assert.equal(exchange.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await exchange.json(), { access_firebase: 'firebase-custom-token' });
    assert.match(exchange.headers.get('set-cookie'), /access_firebase=;/);
});

test('callbacks with missing, mismatched, or repeated state cannot exchange codes', async t => {
    const { request, tokenRequests } = await fixture(t);
    for (const [path, cookie] of [
        ['/callback', ''],
        ['/callback?state=bad&code=code', 'state=good; verifier=verifier'],
        ['/callback?state=same&state=same&code=code', 'state=same; verifier=verifier'],
        ['/callback?state=same&code=code', 'state=same'],
    ]) {
        const response = await request(path, { headers: { Cookie: cookie } });
        assert.equal(response.headers.get('location'), '/login?error=invalid_state');
    }
    assert.equal(tokenRequests.length, 0);
});

test('denied consent and missing codes produce a retryable error', async t => {
    const { request, begin, tokenRequests } = await fixture(t);
    for (const [query, error] of [['error=access_denied', 'access_denied'], ['', 'missing_code']]) {
        const { cookie, authorization } = await begin();
        const response = await request(`/callback?state=${authorization.searchParams.get('state')}&${query}`, { headers: { Cookie: cookie } });
        assert.equal(response.headers.get('location'), `/login?error=${error}`);
    }
    assert.equal(tokenRequests.length, 0);
});

test('token exchange requires the HttpOnly cookie and rejects a different origin', async t => {
    const { request } = await fixture(t);
    const missingCookie = await request('/api/v1/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_firebase: 'untrusted-token' }),
    });
    assert.equal(missingCookie.status, 401);
    const crossOrigin = await request('/api/v1/firebase', { method: 'POST', headers: { Origin: 'https://elsewhere.example', Cookie: 'access_firebase=token' } });
    assert.equal(crossOrigin.status, 403);
});

test('Spotify and Firebase failures redirect instead of leaving the callback pending', async t => {
    for (const overrides of [
        { http: { async post() { throw Object.assign(new Error('do not log credentials'), { code: 'ETIMEDOUT' }); } } },
        { async createAccount() { throw Object.assign(new Error('account failed'), { code: 'auth/invalid-credential' }); } },
    ]) {
        const { request, begin } = await fixture(t, overrides);
        const { cookie, authorization } = await begin();
        const response = await request(`/callback?state=${authorization.searchParams.get('state')}&code=code`, { headers: { Cookie: cookie } });
        assert.equal(response.headers.get('location'), '/login?error=authentication_failed');
        assert.ok(!response.headers.getSetCookie().some(value => value.startsWith('access_firebase=firebase-custom-token')));
    }
});

test('login reports missing configuration and canonicalizes the callback host', async t => {
    const { request } = await fixture(t, { clientId: '' });
    assert.equal((await request('/auth/login')).status, 503);
    const configured = await fixture(t, { redirectUri: 'http://127.0.0.1:5173/callback' });
    const response = await configured.request('/auth/login');
    assert.equal(response.headers.get('location'), 'http://127.0.0.1:5173/auth/login');
});
