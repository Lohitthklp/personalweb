'use strict';

const {
    sendJson,
    sendEmpty,
    isSameOrigin,
    requestHost,
    clientIp,
    readJsonObject,
    recordingEnabled
} = require('../lib/http');
const {
    classifySource,
    utmSourceFromPage,
    isBotUserAgent,
    isPrefetch,
    visitorId,
    formatDay
} = require('../lib/visit-rules');
const { adminConfig } = require('../lib/admin-session');
const { storageConfigured, recordVisit } = require('../lib/redis');

async function handler(req, res) {
    if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
    }
    if (!isSameOrigin(req)) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
    }
    if (
        !recordingEnabled() ||
        isPrefetch(req.headers) ||
        isBotUserAgent(req.headers['user-agent'])
    ) {
        sendEmpty(res);
        return;
    }

    const config = adminConfig();
    const ip = clientIp(req);
    if (!config || !ip || !storageConfigured()) {
        sendEmpty(res);
        return;
    }

    const utmSource = utmSourceFromPage(
        req.headers.referer || req.headers.referrer,
        requestHost(req)
    );
    if (utmSource === null) {
        sendEmpty(res);
        return;
    }

    const body = readJsonObject(req);
    const external = typeof body.external === 'boolean' ? body.external : null;
    const fromLinkedIn = body.linkedin === true;
    const source = classifySource(utmSource, external, fromLinkedIn);
    if (!source) {
        sendEmpty(res);
        return;
    }

    try {
        const day = formatDay(new Date());
        await recordVisit({
            day: day,
            source: source,
            visitor: visitorId(config.secret, day, ip, req.headers['user-agent'])
        });
    } catch (err) {
        console.error('Visit could not be stored.', err && err.message ? err.message : err);
    }
    sendEmpty(res);
}

module.exports = handler;
