'use strict';

function sendJson(res, status, payload) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (typeof res.status === 'function' && typeof res.json === 'function') {
        res.status(status).json(payload);
        return;
    }
    res.statusCode = status;
    res.end(JSON.stringify(payload));
}

function sendEmpty(res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (typeof res.status === 'function' && typeof res.end === 'function') {
        res.status(204).end();
        return;
    }
    res.statusCode = 204;
    res.end();
}

function firstHeader(value) {
    const raw = Array.isArray(value) ? value[0] : value;
    return String(raw || '')
        .split(',')[0]
        .trim();
}

function comparableHost(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) {
        return '';
    }
    try {
        return new URL(raw.includes('://') ? raw : 'https://' + raw).hostname;
    } catch {
        return raw.replace(/:\d+$/, '');
    }
}

function requestHost(req) {
    const headers = (req && req.headers) || {};
    return comparableHost(firstHeader(headers['x-forwarded-host']) || firstHeader(headers.host));
}

function isSameOrigin(req) {
    const host = requestHost(req);
    if (!host) {
        return false;
    }
    const headers = (req && req.headers) || {};
    const origin = headers.origin;
    if (typeof origin === 'string' && origin) {
        return comparableHost(origin) === host;
    }
    const fetchSite = firstHeader(headers['sec-fetch-site']).toLowerCase();
    return fetchSite === 'same-origin' || fetchSite === 'same-site';
}

function clientIp(req) {
    const headers = (req && req.headers) || {};
    const forwarded = firstHeader(headers['x-forwarded-for']);
    if (forwarded) {
        return forwarded;
    }
    return firstHeader(headers['x-real-ip']);
}

function parseObject(text) {
    if (typeof text !== 'string' || text.length > 2048) {
        return {};
    }
    try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        return parsed;
    } catch {
        return {};
    }
}

function readJsonObject(req) {
    const body = req ? req.body : null;
    if (body === null || body === undefined || body === '') {
        return {};
    }
    if (Buffer.isBuffer(body)) {
        return parseObject(body.toString('utf8'));
    }
    if (typeof body === 'string') {
        return parseObject(body);
    }
    if (typeof body === 'object' && !Array.isArray(body)) {
        return body;
    }
    return {};
}

function recordingEnabled() {
    const env = process.env.VERCEL_ENV;
    return !env || env === 'production';
}

module.exports = {
    sendJson,
    sendEmpty,
    requestHost,
    isSameOrigin,
    clientIp,
    readJsonObject,
    recordingEnabled
};
