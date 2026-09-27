'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const redis = require('./redis');

test('login failures expire on a fixed window', function () {
    const command = redis.loginFailureCommand('admin:fail:abc', 900);
    assert.equal(command[0], 'EVAL');
    assert.equal(command[2], 1);
    assert.equal(command[3], 'admin:fail:abc');
    assert.equal(command[4], '900');
    assert.equal(command[1].includes("redis.call('INCR'"), true);
    assert.equal(command[1].includes("redis.call('EXPIRE'"), true);
});

test('storage is configured only when both redis settings exist', function () {
    const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
    const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const previousKvUrl = process.env.KV_REST_API_URL;
    const previousKvToken = process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    assert.equal(redis.storageConfigured(), false);
    process.env.KV_REST_API_URL = 'https://example.upstash.io';
    process.env.KV_REST_API_TOKEN = 'token';
    assert.equal(redis.storageConfigured(), true);

    function restore(name, value) {
        if (value === undefined) {
            delete process.env[name];
            return;
        }
        process.env[name] = value;
    }
    restore('UPSTASH_REDIS_REST_URL', previousUrl);
    restore('UPSTASH_REDIS_REST_TOKEN', previousToken);
    restore('KV_REST_API_URL', previousKvUrl);
    restore('KV_REST_API_TOKEN', previousKvToken);
});
