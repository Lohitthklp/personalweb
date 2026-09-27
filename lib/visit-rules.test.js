'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('./visit-rules');

test('campaign parameters map to the four visit sources', function () {
    assert.equal(rules.classifySource('linkedin', false), 'linkedin');
    assert.equal(rules.classifySource('LinkedIn', true), 'linkedin');
    assert.equal(rules.classifySource('resume', true), 'resume');
    assert.equal(rules.classifySource('Résumé', false), 'resume');
    assert.equal(rules.classifySource('twitter', false), 'other');
    assert.equal(rules.classifySource('', false), 'direct');
    assert.equal(rules.classifySource('', true), 'other');
    assert.equal(rules.classifySource('', null), null);
    assert.equal(rules.classifySource('', true, true), 'linkedin');
    assert.equal(rules.classifySource('', false, true), 'linkedin');
    assert.equal(rules.classifySource('resume', true, true), 'resume');
    assert.equal(rules.isLinkedInReferrerHost('www.linkedin.com'), true);
    assert.equal(rules.isLinkedInReferrerHost('linkedin.com'), true);
    assert.equal(rules.isLinkedInReferrerHost('lnkd.in'), true);
    assert.equal(rules.isLinkedInReferrerHost('notlinkedin.com'), false);
    assert.equal(rules.isLinkedInReferrerHost('linkedin.com.example'), false);
});

test('utm source is read only from the same site', function () {
    assert.equal(
        rules.utmSourceFromPage(
            'https://example.com/?utm_source=linkedin&email=person@example.com',
            'example.com'
        ),
        'linkedin'
    );
    assert.equal(rules.utmSourceFromPage('https://example.com/', 'example.com'), '');
    assert.equal(
        rules.utmSourceFromPage('https://evil.example/?utm_source=linkedin', 'example.com'),
        null
    );
    assert.equal(rules.utmSourceFromPage('not a url', 'example.com'), null);
});

test('bots and prefetch requests are excluded', function () {
    assert.equal(rules.isBotUserAgent(''), true);
    assert.equal(
        rules.isBotUserAgent(
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        ),
        true
    );
    assert.equal(rules.isBotUserAgent('LinkedInBot/1.0'), true);
    assert.equal(
        rules.isBotUserAgent(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]'
        ),
        false
    );
    assert.equal(
        rules.isBotUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        ),
        false
    );
    assert.equal(rules.isPrefetch({ purpose: 'prefetch' }), true);
    assert.equal(rules.isPrefetch({ 'sec-purpose': 'prerender' }), true);
    assert.equal(rules.isPrefetch({ 'x-moz': 'prefetch' }), true);
    assert.equal(rules.isPrefetch({}), false);
});

test('visitor ids stay stable for one day and do not keep the ip', function () {
    const secret = 'analytics-secret-value';
    const ip = '203.0.113.50';
    const first = rules.visitorId(secret, '2026-09-27', ip, 'Browser/1');
    const second = rules.visitorId(secret, '2026-09-27', ip, 'Browser/1');
    const nextDay = rules.visitorId(secret, '2026-09-28', ip, 'Browser/1');
    assert.equal(first, second);
    assert.notEqual(first, nextDay);
    assert.equal(first.includes(ip), false);
    assert.equal(first.length, 64);
});

test('eastern calendar days and recent keys stay unique', function () {
    assert.equal(rules.formatDay(new Date('2026-01-15T04:30:00Z')), '2026-01-14');
    assert.equal(rules.formatDay(new Date('2026-01-15T05:30:00Z')), '2026-01-15');
    const keys = rules.recentDayKeys(30, new Date('2026-03-09T12:00:00Z'));
    assert.equal(keys.length, 30);
    assert.equal(new Set(keys).size, 30);
    assert.equal(keys[0], '2026-03-09');
});

test('stored hashes become counts and shares wait for enough visits', function () {
    const fromObject = rules.countsFromHash({ linkedin: '2', resume: '0', extra: '9' });
    assert.deepEqual(fromObject, {
        linkedin: 2,
        resume: 0,
        direct: 0,
        other: 0,
        total: 2
    });
    const fromArray = rules.countsFromHash(['direct', '3', 'other', '1', 'ignored', '4']);
    assert.equal(fromArray.direct, 3);
    assert.equal(fromArray.other, 1);
    assert.equal(fromArray.total, 4);
    const summed = rules.sumCounts([fromObject, fromArray]);
    assert.equal(summed.total, 6);
    assert.equal(rules.shouldShowShares(19), false);
    assert.equal(rules.shouldShowShares(20), true);
});

test('a visit command counts a new visitor once and keeps the all-time total', function () {
    const keys = rules.visitStorageKeys('2026-09-27');
    const command = rules.recordVisitCommand({
        seenKey: keys.seenKey,
        dayKey: keys.dayKey,
        totalKey: keys.totalKey,
        visitor: 'abc',
        source: 'direct',
        seenTtl: rules.SEEN_TTL_SECONDS,
        dayTtl: rules.DAY_TTL_SECONDS
    });
    assert.equal(command[0], 'EVAL');
    assert.equal(command[2], 3);
    assert.deepEqual(command.slice(3, 6), [
        'visit:seen:2026-09-27',
        'visit:day:2026-09-27',
        'visit:totals'
    ]);
    assert.equal(command[1].includes("redis.call('SADD'"), true);
    assert.equal(/EXPIRE',\s*KEYS\[3\]/.test(command[1]), false);
    assert.throws(function () {
        rules.visitStorageKeys('09-27-2026');
    });
});
