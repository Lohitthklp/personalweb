'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const session = require('./admin-session');

const SECRET = 'session-secret-value';

test('a pin match compares equal secrets without accepting a different pin', function () {
    assert.equal(session.pinMatches(SECRET, 'correct-pin', 'correct-pin'), true);
    assert.equal(session.pinMatches(SECRET, 'wrong-pin', 'correct-pin'), false);
    assert.equal(session.pinMatches(SECRET, 'short', 'correct-pin'), false);
});

test('sessions expire and reject a changed signature', function () {
    const expiresAt = 1_800_000_000_000;
    const token = session.signSession(SECRET, expiresAt);
    assert.equal(session.verifySession(SECRET, token, expiresAt - 1000), true);
    assert.equal(session.verifySession(SECRET, token, expiresAt), false);
    const broken = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    assert.equal(session.verifySession(SECRET, broken, expiresAt - 1000), false);
    assert.equal(session.verifySession(SECRET, 'only-one-part', expiresAt), false);
});

test('cookies round-trip and failure keys omit the raw ip', function () {
    const header = 'theme=dark; admin_session=abc.def; other=1';
    assert.equal(session.readCookie(header, 'admin_session'), 'abc.def');
    assert.equal(session.readCookie(header, 'missing'), '');
    const key = session.failureKey(SECRET, '203.0.113.10');
    assert.equal(key.startsWith('admin:fail:'), true);
    assert.equal(key.includes('203.0.113.10'), false);
});

test('admin config requires a long pin and secret', function () {
    const previousPin = process.env.ADMIN_PIN;
    const previousSecret = process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_PIN = 'short';
    process.env.ADMIN_SESSION_SECRET = SECRET;
    assert.equal(session.adminConfig(), null);
    process.env.ADMIN_PIN = 'long-enough-pin';
    process.env.ADMIN_SESSION_SECRET = 'too-short';
    assert.equal(session.adminConfig(), null);
    process.env.ADMIN_PIN = 'long-enough-pin';
    process.env.ADMIN_SESSION_SECRET = SECRET;
    assert.deepEqual(session.adminConfig(), {
        pin: 'long-enough-pin',
        secret: SECRET
    });
    if (previousPin === undefined) {
        delete process.env.ADMIN_PIN;
    } else {
        process.env.ADMIN_PIN = previousPin;
    }
    if (previousSecret === undefined) {
        delete process.env.ADMIN_SESSION_SECRET;
    } else {
        process.env.ADMIN_SESSION_SECRET = previousSecret;
    }
});

test('the session cookie is httpOnly and secure only on deployed environments', function () {
    const header = session.cookieHeader('token.value', true);
    assert.equal(header.includes('HttpOnly'), true);
    assert.equal(header.includes('SameSite=Strict'), true);
    assert.equal(header.includes('Secure'), true);
    assert.equal(session.clearCookieHeader(false).includes('Max-Age=0'), true);
    const previous = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = 'production';
    assert.equal(session.useSecureCookie(), true);
    process.env.VERCEL_ENV = 'development';
    assert.equal(session.useSecureCookie(), false);
    if (previous === undefined) {
        delete process.env.VERCEL_ENV;
    } else {
        process.env.VERCEL_ENV = previous;
    }
});
