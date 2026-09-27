'use strict';

const crypto = require('crypto');

const TIME_ZONE = 'America/New_York';
const SHARE_MINIMUM = 20;
const SOURCES = ['linkedin', 'resume', 'direct', 'other'];
const SEEN_TTL_SECONDS = 48 * 60 * 60;
const DAY_TTL_SECONDS = 400 * 24 * 60 * 60;
const USER_AGENT_LIMIT = 180;

const BOT_PATTERN =
    /bot\b|spider|crawler|slurp|facebookexternalhit|embedly|quora link preview|whatsapp|telegrambot|slackbot|discordbot|linkedinbot|twitterbot|applebot|petalbot|ahrefs|semrush|mj12bot|dotbot|pingdom|uptimerobot|headlesschrome|lighthouse|pagespeed|wget|curl\/|python-requests|go-http-client|skypeuripreview|bingpreview/i;

const RECORD_VISIT_LUA = [
    'local source = ARGV[2]',
    "if source ~= 'linkedin' and source ~= 'resume' and source ~= 'direct' and source ~= 'other' then",
    '  return 0',
    'end',
    "local added = redis.call('SADD', KEYS[1], ARGV[1])",
    'if added == 0 then',
    '  return 0',
    'end',
    "redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3]))",
    "redis.call('HINCRBY', KEYS[2], source, 1)",
    "redis.call('EXPIRE', KEYS[2], tonumber(ARGV[4]))",
    "redis.call('HINCRBY', KEYS[3], source, 1)",
    'return 1'
].join('\n');

function normalizeUtmSource(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFKC');
}

function isLinkedInReferrerHost(hostname) {
    const host = String(hostname || '')
        .trim()
        .toLowerCase()
        .replace(/\.+$/, '');
    return (
        host === 'linkedin.com' ||
        host.endsWith('.linkedin.com') ||
        host === 'lnkd.in' ||
        host.endsWith('.lnkd.in')
    );
}

function classifySource(utmSource, externalReferrer, fromLinkedIn) {
    const raw = normalizeUtmSource(utmSource);
    if (raw === 'linkedin') {
        return 'linkedin';
    }
    if (raw === 'resume' || raw === 'résumé') {
        return 'resume';
    }
    if (raw) {
        return 'other';
    }
    if (fromLinkedIn === true) {
        return 'linkedin';
    }
    if (typeof externalReferrer !== 'boolean') {
        return null;
    }
    return externalReferrer ? 'other' : 'direct';
}

function utmSourceFromPage(referer, host) {
    if (!referer || !host) {
        return null;
    }
    let page;
    try {
        page = new URL(referer);
    } catch {
        return null;
    }
    if (page.host.toLowerCase() !== String(host).toLowerCase()) {
        return null;
    }
    return page.searchParams.get('utm_source') || '';
}

function headerValue(headers, name) {
    if (!headers) {
        return '';
    }
    const value = headers[name];
    if (Array.isArray(value)) {
        return String(value[0] || '');
    }
    return String(value || '');
}

function isBotUserAgent(userAgent) {
    const value = String(userAgent || '').trim();
    if (!value) {
        return true;
    }
    return BOT_PATTERN.test(value);
}

function isPrefetch(headers) {
    const purpose = [
        headerValue(headers, 'purpose'),
        headerValue(headers, 'sec-purpose'),
        headerValue(headers, 'x-purpose')
    ]
        .join(' ')
        .toLowerCase();
    if (
        purpose.includes('prefetch') ||
        purpose.includes('prerender') ||
        purpose.includes('preview')
    ) {
        return true;
    }
    return headerValue(headers, 'x-moz').toLowerCase() === 'prefetch';
}

function formatDay(date, timeZone) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: timeZone || TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

function recentDayKeys(count, fromDate, timeZone) {
    const keys = [];
    const seen = new Set();
    let cursor = fromDate ? new Date(fromDate.getTime()) : new Date();
    const zone = timeZone || TIME_ZONE;
    while (keys.length < count) {
        const key = formatDay(cursor, zone);
        if (!seen.has(key)) {
            seen.add(key);
            keys.push(key);
        }
        cursor = new Date(cursor.getTime() - 12 * 60 * 60 * 1000);
        if (seen.size > count + 10) {
            break;
        }
    }
    return keys;
}

function emptyCounts() {
    return {
        linkedin: 0,
        resume: 0,
        direct: 0,
        other: 0,
        total: 0
    };
}

function readCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
        return 0;
    }
    return Math.floor(number);
}

function countsFromHash(result) {
    const counts = emptyCounts();
    if (Array.isArray(result)) {
        for (let index = 0; index < result.length; index += 2) {
            const key = result[index];
            if (SOURCES.includes(key)) {
                counts[key] = readCount(result[index + 1]);
            }
        }
    } else if (result && typeof result === 'object') {
        SOURCES.forEach(function (key) {
            counts[key] = readCount(result[key]);
        });
    }
    counts.total = SOURCES.reduce(function (sum, key) {
        return sum + counts[key];
    }, 0);
    return counts;
}

function addCounts(target, extra) {
    SOURCES.forEach(function (source) {
        target[source] += extra && extra[source] ? extra[source] : 0;
    });
    target.total = SOURCES.reduce(function (sum, source) {
        return sum + target[source];
    }, 0);
    return target;
}

function sumCounts(list) {
    return list.reduce(function (total, counts) {
        return addCounts(total, counts);
    }, emptyCounts());
}

function shouldShowShares(total) {
    return Number(total) >= SHARE_MINIMUM;
}

function visitorId(secret, day, ip, userAgent) {
    const ua = String(userAgent || '').slice(0, USER_AGENT_LIMIT);
    return crypto
        .createHmac('sha256', secret)
        .update(String(day) + '\n' + String(ip) + '\n' + ua)
        .digest('hex');
}

function visitStorageKeys(day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        throw new Error('Invalid visit day');
    }
    return {
        seenKey: 'visit:seen:' + day,
        dayKey: 'visit:day:' + day,
        totalKey: 'visit:totals'
    };
}

function recordVisitCommand(input) {
    return [
        'EVAL',
        RECORD_VISIT_LUA,
        3,
        input.seenKey,
        input.dayKey,
        input.totalKey,
        input.visitor,
        input.source,
        String(input.seenTtl),
        String(input.dayTtl)
    ];
}

module.exports = {
    TIME_ZONE,
    SHARE_MINIMUM,
    SOURCES,
    SEEN_TTL_SECONDS,
    DAY_TTL_SECONDS,
    normalizeUtmSource,
    classifySource,
    isLinkedInReferrerHost,
    utmSourceFromPage,
    isBotUserAgent,
    isPrefetch,
    formatDay,
    recentDayKeys,
    emptyCounts,
    countsFromHash,
    addCounts,
    sumCounts,
    shouldShowShares,
    visitorId,
    visitStorageKeys,
    recordVisitCommand
};
