'use strict';

const { sendJson, isSameOrigin, clientIp, readJsonObject } = require('../lib/http');
const session = require('../lib/admin-session');
const redis = require('../lib/redis');

function setCookie(res, value) {
    res.setHeader('Set-Cookie', value);
}

async function handler(req, res) {
    if (!isSameOrigin(req)) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
    }

    if (req.method === 'GET') {
        if (!session.adminConfig()) {
            sendJson(res, 503, { error: 'Admin sign-in is not configured.' });
            return;
        }
        if (!redis.storageConfigured()) {
            sendJson(res, 503, {
                error: 'Visit storage is not configured, so there are no counts to show.'
            });
            return;
        }
        const signedIn = session.sessionFromRequest(req);
        sendJson(res, signedIn ? 200 : 401, { signedIn: signedIn });
        return;
    }

    if (req.method === 'DELETE') {
        setCookie(res, session.clearCookieHeader(session.useSecureCookie()));
        sendJson(res, 200, { signedIn: false });
        return;
    }

    if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
    }

    const config = session.adminConfig();
    if (!config) {
        sendJson(res, 503, { error: 'Admin sign-in is not configured.' });
        return;
    }
    if (!redis.storageConfigured()) {
        sendJson(res, 503, {
            error: 'Visit storage is not configured, so there are no counts to show.'
        });
        return;
    }

    const body = readJsonObject(req);
    const pin = typeof body.pin === 'string' ? body.pin : '';
    if (!pin || pin.length > session.MAX_PIN_LENGTH) {
        sendJson(res, 401, { error: 'That PIN is not correct.' });
        return;
    }

    const key = session.failureKey(config.secret, clientIp(req) || 'unknown');
    let failures;
    try {
        failures = await redis.loginFailureCount(key);
    } catch (err) {
        console.error(
            'Admin sign-in could not be checked.',
            err && err.message ? err.message : err
        );
        sendJson(res, 503, { error: 'Sign-in could not be checked. Try again later.' });
        return;
    }
    if (failures >= session.LOGIN_ATTEMPT_LIMIT) {
        sendJson(res, 429, { error: 'Too many attempts. Try again later.' });
        return;
    }

    if (!session.pinMatches(config.secret, pin, config.pin)) {
        try {
            await redis.recordLoginFailure(key, session.LOGIN_WINDOW_SECONDS);
        } catch (err) {
            console.error(
                'Admin sign-in failure could not be stored.',
                err && err.message ? err.message : err
            );
        }
        sendJson(res, 401, { error: 'That PIN is not correct.' });
        return;
    }

    try {
        await redis.clearLoginFailures(key);
    } catch (err) {
        console.error(
            'Admin sign-in failures could not be cleared.',
            err && err.message ? err.message : err
        );
    }

    const token = session.signSession(config.secret, Date.now() + session.SESSION_MS);
    setCookie(res, session.cookieHeader(token, session.useSecureCookie()));
    sendJson(res, 200, { signedIn: true });
}

module.exports = handler;
