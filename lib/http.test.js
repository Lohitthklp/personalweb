'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('./http');

test('visit and admin requests must come from the same site', function () {
    assert.equal(
        http.isSameOrigin({
            headers: { host: 'example.com', origin: 'https://example.com' }
        }),
        true
    );
    assert.equal(
        http.isSameOrigin({
            headers: { host: 'example.com', origin: 'https://evil.example' }
        }),
        false
    );
    assert.equal(http.isSameOrigin({ headers: { host: 'example.com' } }), false);
    assert.equal(
        http.requestHost({
            headers: { 'x-forwarded-host': 'example.com, internal', host: 'localhost' }
        }),
        'example.com'
    );
});

test('the client address is the first forwarded address', function () {
    assert.equal(
        http.clientIp({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' } }),
        '203.0.113.5'
    );
    assert.equal(http.clientIp({ headers: { 'x-real-ip': '203.0.113.8' } }), '203.0.113.8');
    assert.equal(http.clientIp({ headers: {} }), '');
});

test('request bodies only accept a small object', function () {
    assert.deepEqual(http.readJsonObject({ body: { external: true, pin: 'secret' } }), {
        external: true,
        pin: 'secret'
    });
    assert.deepEqual(http.readJsonObject({ body: '{"external":false}' }), { external: false });
    assert.deepEqual(http.readJsonObject({ body: '["linkedin"]' }), {});
    assert.deepEqual(http.readJsonObject({ body: 'not-json' }), {});
    assert.deepEqual(http.readJsonObject({ body: 'x'.repeat(3000) }), {});
});

test('only production records visits when the platform environment is set', function () {
    const previous = process.env.VERCEL_ENV;
    delete process.env.VERCEL_ENV;
    assert.equal(http.recordingEnabled(), true);
    process.env.VERCEL_ENV = 'production';
    assert.equal(http.recordingEnabled(), true);
    process.env.VERCEL_ENV = 'preview';
    assert.equal(http.recordingEnabled(), false);
    process.env.VERCEL_ENV = 'development';
    assert.equal(http.recordingEnabled(), false);
    if (previous === undefined) {
        delete process.env.VERCEL_ENV;
    } else {
        process.env.VERCEL_ENV = previous;
    }
});
