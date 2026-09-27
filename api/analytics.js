'use strict';

const { sendJson, isSameOrigin, recordingEnabled } = require('../lib/http');
const { sessionFromRequest } = require('../lib/admin-session');
const { storageConfigured, readVisitSummary } = require('../lib/redis');
const {
    recentDayKeys,
    sumCounts,
    SHARE_MINIMUM,
    TIME_ZONE,
    shouldShowShares
} = require('../lib/visit-rules');

function publicCounts(counts) {
    return {
        linkedin: counts.linkedin,
        resume: counts.resume,
        direct: counts.direct,
        other: counts.other,
        total: counts.total,
        showShares: shouldShowShares(counts.total)
    };
}

async function handler(req, res) {
    if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
    }
    if (!isSameOrigin(req)) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
    }
    if (!sessionFromRequest(req)) {
        sendJson(res, 401, { error: 'Sign in required.' });
        return;
    }
    if (!storageConfigured()) {
        sendJson(res, 503, {
            ready: false,
            error: 'Visit storage is not configured, so there are no counts to show.'
        });
        return;
    }

    try {
        const days = recentDayKeys(30);
        const summary = await readVisitSummary(days);
        const recentDays = summary.daily
            .filter(function (day) {
                return day.total > 0;
            })
            .slice(0, 14)
            .map(function (day) {
                return {
                    day: day.day,
                    linkedin: day.linkedin,
                    resume: day.resume,
                    direct: day.direct,
                    other: day.other,
                    total: day.total
                };
            });
        sendJson(res, 200, {
            ready: true,
            recording: recordingEnabled(),
            timezone: TIME_ZONE,
            shareMinimum: SHARE_MINIMUM,
            hasVisits: summary.allTime.total > 0,
            allTime: publicCounts(summary.allTime),
            last7Days: publicCounts(sumCounts(summary.daily.slice(0, 7))),
            last30Days: publicCounts(sumCounts(summary.daily)),
            recentDays: recentDays
        });
    } catch (err) {
        console.error('Visit counts could not be loaded.', err && err.message ? err.message : err);
        sendJson(res, 503, {
            ready: false,
            error: 'Visit counts could not be loaded. Nothing is shown in their place.'
        });
    }
}

module.exports = handler;
