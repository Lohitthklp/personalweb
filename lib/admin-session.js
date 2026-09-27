'use strict';

const crypto = require('crypto');

const COOKIE_NAME = 'admin_session';
const SESSION_MS = 12 * 60 * 60 * 1000;
const MIN_PIN_LENGTH = 8;
const MAX_PIN_LENGTH = 128;
const MIN_SECRET_LENGTH = 16;
const LOGIN_ATTEMPT_LIMIT = 8;
const LOGIN_WINDOW_SECONDS = 15 * 60;

function adminConfig() {
    const pin = process.env.ADMIN_PIN || '';
    const secret = process.env.ADMIN_SESSION_SECRET || '';
    if (pin.length < MIN_PIN_LENGTH || secret.length < MIN_SECRET_LENGTH) {
        return null;
    }
    return {
        pin: pin,
        secret: secret
    };
}

function pinMatches(secret, provided, expected) {
    const left = crypto.createHmac('sha256', secret).update(String(provided)).digest();
    const right = crypto.createHmac('sha256', secret).update(String(expected)).digest();
    return crypto.timingSafeEqual(left, right);
}

function signSession(secret, expiresAt) {
    const payload = Buffer.from(JSON.stringify({ exp: expiresAt }), 'utf8').toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return payload + '.' + signature;
}

function verifySession(secret, token, now) {
    if (!secret || typeof token !== 'string') {
        return false;
    }
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return false;
    }
    const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest('base64url');
    const actualBuffer = Buffer.from(parts[1]);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length) {
        return false;
    }
    if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
        return false;
    }
    let data;
    try {
        data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    } catch {
        return false;
    }
    if (!data || typeof data.exp !== 'number' || !Number.isFinite(data.exp)) {
        return false;
    }
    const current = typeof now === 'number' ? now : Date.now();
    return data.exp > current;
}

function readCookie(header, name) {
    const parts = String(header || '').split(';');
    for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];
        const separator = part.indexOf('=');
        if (separator === -1) {
            continue;
        }
        if (part.slice(0, separator).trim() !== name) {
            continue;
        }
        try {
            return decodeURIComponent(part.slice(separator + 1).trim());
        } catch {
            return '';
        }
    }
    return '';
}

function sessionFromRequest(req) {
    const config = adminConfig();
    if (!config) {
        return false;
    }
    const cookieHeader = req && req.headers ? req.headers.cookie : '';
    const token = readCookie(cookieHeader, COOKIE_NAME);
    return verifySession(config.secret, token);
}

function cookieHeader(token, secure) {
    const parts = [
        COOKIE_NAME + '=' + encodeURIComponent(token),
        'HttpOnly',
        'SameSite=Strict',
        'Path=/',
        'Max-Age=' + String(Math.floor(SESSION_MS / 1000))
    ];
    if (secure) {
        parts.push('Secure');
    }
    return parts.join('; ');
}

function clearCookieHeader(secure) {
    const parts = [COOKIE_NAME + '=', 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=0'];
    if (secure) {
        parts.push('Secure');
    }
    return parts.join('; ');
}

function useSecureCookie() {
    return process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';
}

function failureKey(secret, ip) {
    const digest = crypto
        .createHmac('sha256', secret)
        .update(String(ip || 'unknown'))
        .digest('hex');
    return 'admin:fail:' + digest;
}

module.exports = {
    COOKIE_NAME,
    SESSION_MS,
    MIN_PIN_LENGTH,
    MAX_PIN_LENGTH,
    MIN_SECRET_LENGTH,
    LOGIN_ATTEMPT_LIMIT,
    LOGIN_WINDOW_SECONDS,
    adminConfig,
    pinMatches,
    signSession,
    verifySession,
    readCookie,
    sessionFromRequest,
    cookieHeader,
    clearCookieHeader,
    useSecureCookie,
    failureKey
};
