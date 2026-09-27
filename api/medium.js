'use strict';

// Single source of truth for the Medium account used by this site.
const MEDIUM_USERNAME = 'lohithprasannateja';
const MEDIUM_PROFILE_URL = 'https://medium.com/@' + MEDIUM_USERNAME;
const MEDIUM_FEED_URL = 'https://medium.com/feed/@' + MEDIUM_USERNAME;
const MAX_ARTICLES = 10;
const FETCH_TIMEOUT_MS = 8000;

function profileUrl() {
    return MEDIUM_PROFILE_URL;
}

function decodeXmlEntities(value) {
    return String(value || '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, function (_, code) {
            return String.fromCharCode(Number(code));
        })
        .replace(/&#x([0-9a-f]+);/gi, function (_, hex) {
            return String.fromCharCode(parseInt(hex, 16));
        });
}

function firstTagContent(xml, tagName) {
    const cdata = xml.match(
        new RegExp(
            '<' + tagName + '[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</' + tagName + '>',
            'i'
        )
    );
    if (cdata) {
        return cdata[1].trim();
    }
    const plain = xml.match(
        new RegExp('<' + tagName + '[^>]*>([\\s\\S]*?)</' + tagName + '>', 'i')
    );
    if (!plain) {
        return '';
    }
    return decodeXmlEntities(plain[1]).trim();
}

function allTagContents(xml, tagName) {
    const values = [];
    const cdataRe = new RegExp(
        '<' + tagName + '[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</' + tagName + '>',
        'gi'
    );
    let match;
    while ((match = cdataRe.exec(xml))) {
        const value = match[1].trim();
        if (value) {
            values.push(value);
        }
    }
    if (values.length) {
        return values;
    }
    const plainRe = new RegExp('<' + tagName + '[^>]*>([\\s\\S]*?)</' + tagName + '>', 'gi');
    while ((match = plainRe.exec(xml))) {
        const value = decodeXmlEntities(match[1]).trim();
        if (value) {
            values.push(value);
        }
    }
    return values;
}

function htmlToPlainText(html) {
    return decodeXmlEntities(String(html || ''))
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
        .replace(/<object[\s\S]*?<\/object>/gi, ' ')
        .replace(/<embed[\s\S]*?>/gi, ' ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/(p|div|h[1-6]|li|blockquote|figcaption)>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function truncateExcerpt(text, maxLength) {
    const normalized = String(text || '')
        .replace(/\s+/g, ' ')
        .trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }
    const slice = normalized.slice(0, maxLength);
    const lastSpace = slice.lastIndexOf(' ');
    const clipped = lastSpace > 80 ? slice.slice(0, lastSpace) : slice;
    return clipped.replace(/[.,;:!?-]+$/, '') + '…';
}

function isHttpUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function sanitizeHttpUrl(value) {
    if (!isHttpUrl(value)) {
        return '';
    }
    return new URL(String(value).trim()).toString();
}

function canonicalArticleLink(value) {
    const sanitized = sanitizeHttpUrl(value);
    if (!sanitized) {
        return '';
    }
    try {
        const url = new URL(sanitized);
        url.hash = '';
        url.search = '';
        return url.toString().replace(/\/$/, '');
    } catch {
        return sanitized;
    }
}

function preferMediumLink(link, guid) {
    const candidates = [link, guid].map(sanitizeHttpUrl).filter(Boolean);
    const mediumLink = candidates.find(function (url) {
        try {
            const host = new URL(url).hostname.toLowerCase();
            return host === 'medium.com' || host.endsWith('.medium.com');
        } catch {
            return false;
        }
    });
    return mediumLink || candidates[0] || '';
}

function isTrackingOrTinyImage(tag, url) {
    const lowerUrl = String(url || '').toLowerCase();
    if (lowerUrl.includes('medium.com/_/stat') || lowerUrl.includes('referrersource=full_rss')) {
        return true;
    }
    const normalizedTag = String(tag || '');
    const widthOne = /\bwidth\s*=\s*["']?1["'\s>/]/i.test(normalizedTag);
    const heightOne = /\bheight\s*=\s*["']?1["'\s>/]/i.test(normalizedTag);
    return widthOne && heightOne;
}

function attributeValue(tag, name) {
    const match = String(tag || '').match(
        new RegExp('\\b' + name + '\\s*=\\s*["\']([^"\']+)["\']', 'i')
    );
    return match ? match[1] : '';
}

function extractCoverImage(html, itemXml) {
    const source = String(html || '');
    const imgRe = /<img\b[^>]*>/gi;
    let match;
    while ((match = imgRe.exec(source))) {
        const tag = match[0];
        const rawSrc = attributeValue(tag, 'src') || (tag.match(/\bsrc=([^\s>]+)/i) || [])[1] || '';
        const src = sanitizeHttpUrl(rawSrc);
        if (!src || isTrackingOrTinyImage(tag, src)) {
            continue;
        }
        return src;
    }

    const block = String(itemXml || '');
    const media = block.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i);
    if (media && isHttpUrl(media[1]) && !isTrackingOrTinyImage(media[0], media[1])) {
        return sanitizeHttpUrl(media[1]);
    }
    const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i);
    if (enclosure && /type=["']image\//i.test(enclosure[0]) && isHttpUrl(enclosure[1])) {
        return sanitizeHttpUrl(enclosure[1]);
    }
    return '';
}

function publicationTimestamp(value) {
    const parsed = Date.parse(value || '');
    return Number.isNaN(parsed) ? 0 : parsed;
}

function parseMediumRss(xml) {
    const source = String(xml || '');
    const itemBlocks = source.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const seen = Object.create(null);
    const articles = [];

    itemBlocks.forEach(function (block) {
        const title = htmlToPlainText(firstTagContent(block, 'title'));
        const rawLink = firstTagContent(block, 'link');
        const guid = firstTagContent(block, 'guid');
        const link = preferMediumLink(rawLink, guid);
        if (!title || !link) {
            return;
        }

        const id = guid || canonicalArticleLink(link);
        const dedupeKey = (id || link).toLowerCase();
        if (seen[dedupeKey]) {
            return;
        }
        seen[dedupeKey] = true;

        const encoded =
            firstTagContent(block, 'content:encoded') || firstTagContent(block, 'description');
        const categories = [];
        const seenTags = Object.create(null);
        allTagContents(block, 'category').forEach(function (tag) {
            const clean = htmlToPlainText(tag);
            const key = clean.toLowerCase();
            if (!clean || seenTags[key]) {
                return;
            }
            seenTags[key] = true;
            categories.push(clean);
        });

        articles.push({
            id: id,
            title: title,
            link: canonicalArticleLink(link) || link,
            publicationDate: firstTagContent(block, 'pubDate'),
            author: htmlToPlainText(firstTagContent(block, 'dc:creator')),
            categories: categories,
            excerpt: truncateExcerpt(htmlToPlainText(encoded), 220),
            thumbnail: extractCoverImage(encoded, block),
            guid: guid
        });
    });

    articles.sort(function (a, b) {
        return publicationTimestamp(b.publicationDate) - publicationTimestamp(a.publicationDate);
    });

    return articles.slice(0, MAX_ARTICLES);
}

async function fetchMediumFeed() {
    const controller = new AbortController();
    const timer = setTimeout(function () {
        controller.abort();
    }, FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(MEDIUM_FEED_URL, {
            signal: controller.signal,
            headers: {
                Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
                'User-Agent': 'personalweb-medium-feed/1.0'
            }
        });
        if (!response.ok) {
            const error = new Error('Medium RSS returned ' + response.status);
            error.statusCode =
                response.status >= 400 && response.status < 600 ? response.status : 502;
            throw error;
        }
        return await response.text();
    } finally {
        clearTimeout(timer);
    }
}

function sendJson(res, status, payload) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (status >= 200 && status < 300) {
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    } else {
        res.setHeader('Cache-Control', 'no-store');
    }
    if (typeof res.status === 'function' && typeof res.json === 'function') {
        res.status(status).json(payload);
        return;
    }
    res.statusCode = status;
    res.end(JSON.stringify(payload));
}

async function handler(req, res) {
    if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
        sendJson(res, 405, {
            error: 'Method not allowed',
            profileUrl: profileUrl()
        });
        return;
    }

    try {
        const xml = await fetchMediumFeed();
        const articles = parseMediumRss(xml);
        sendJson(res, 200, {
            profileUrl: profileUrl(),
            articles: articles
        });
    } catch (err) {
        const aborted = err && (err.name === 'AbortError' || err.code === 'ABORT_ERR');
        const statusCode = aborted ? 504 : (err && err.statusCode) || 502;
        sendJson(res, statusCode, {
            error: aborted
                ? 'Medium RSS timed out'
                : 'Medium articles could not be refreshed right now.',
            profileUrl: profileUrl()
        });
    }
}

handler.parseMediumRss = parseMediumRss;
handler.truncateExcerpt = truncateExcerpt;
handler.extractCoverImage = extractCoverImage;
handler.MEDIUM_USERNAME = MEDIUM_USERNAME;
handler.MEDIUM_PROFILE_URL = MEDIUM_PROFILE_URL;

module.exports = handler;
