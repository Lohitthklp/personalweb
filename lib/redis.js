'use strict';

const {
    countsFromHash,
    recordVisitCommand,
    visitStorageKeys,
    SEEN_TTL_SECONDS,
    DAY_TTL_SECONDS
} = require('./visit-rules');

const REDIS_TIMEOUT_MS = 5000;

const LOGIN_FAILURE_LUA = [
    "local count = redis.call('INCR', KEYS[1])",
    'if count == 1 then',
    "  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))",
    'end',
    'return count'
].join('\n');

function redisCredentials() {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
    if (!url || !token) {
        return null;
    }
    return {
        url: url.replace(/\/$/, ''),
        token: token
    };
}

function storageConfigured() {
    return redisCredentials() !== null;
}

function loginFailureCommand(key, windowSeconds) {
    return ['EVAL', LOGIN_FAILURE_LUA, 1, key, String(windowSeconds)];
}

async function redisFetch(path, body) {
    const credentials = redisCredentials();
    if (!credentials) {
        const error = new Error('Visit storage is not configured');
        error.code = 'STORAGE_UNCONFIGURED';
        throw error;
    }
    const controller = new AbortController();
    const timer = setTimeout(function () {
        controller.abort();
    }, REDIS_TIMEOUT_MS);
    try {
        const response = await fetch(credentials.url + path, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Authorization: 'Bearer ' + credentials.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            throw new Error('Visit storage returned ' + response.status);
        }
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

async function redisCommand(command) {
    const payload = await redisFetch('', command);
    if (!payload || payload.error) {
        throw new Error('Visit storage rejected a command');
    }
    return payload.result;
}

async function redisPipeline(commands) {
    const payload = await redisFetch('/pipeline', commands);
    if (!Array.isArray(payload)) {
        throw new Error('Visit storage returned an unexpected response');
    }
    return payload.map(function (entry) {
        if (!entry || entry.error) {
            throw new Error('Visit storage rejected a command');
        }
        return entry.result;
    });
}

async function recordVisit(input) {
    const keys = visitStorageKeys(input.day);
    return redisCommand(
        recordVisitCommand({
            seenKey: keys.seenKey,
            dayKey: keys.dayKey,
            totalKey: keys.totalKey,
            visitor: input.visitor,
            source: input.source,
            seenTtl: SEEN_TTL_SECONDS,
            dayTtl: DAY_TTL_SECONDS
        })
    );
}

async function loginFailureCount(key) {
    const value = await redisCommand(['GET', key]);
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) {
        return 0;
    }
    return count;
}

async function recordLoginFailure(key, windowSeconds) {
    const count = await redisCommand(loginFailureCommand(key, windowSeconds));
    const number = Number(count);
    if (!Number.isFinite(number) || number < 0) {
        return 0;
    }
    return number;
}

async function clearLoginFailures(key) {
    await redisCommand(['DEL', key]);
}

async function readVisitSummary(days) {
    const commands = [['HGETALL', 'visit:totals']];
    days.forEach(function (day) {
        commands.push(['HGETALL', visitStorageKeys(day).dayKey]);
    });
    const results = await redisPipeline(commands);
    return {
        allTime: countsFromHash(results[0]),
        daily: days.map(function (day, index) {
            const counts = countsFromHash(results[index + 1]);
            counts.day = day;
            return counts;
        })
    };
}

module.exports = {
    storageConfigured,
    loginFailureCommand,
    recordVisit,
    loginFailureCount,
    recordLoginFailure,
    clearLoginFailures,
    readVisitSummary
};
