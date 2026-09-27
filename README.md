# Personal portfolio site

Static portfolio for **Lohith Prasanna Teja Kakumanu** — applied AI / data science work, experience, and projects.

## Contact

**Email:** [lohithprasannateja@gmail.com](mailto:lohithprasannateja@gmail.com)

## Stack

- HTML, CSS, vanilla JavaScript
- [Anime.js](https://animejs.com/) for motion
- A small Vercel function, `api/medium.js`, for the Medium list

## Development

This repository uses pnpm. `pnpm-lock.yaml` is the lockfile.

```bash
pnpm install
pnpm run dev
```

`pnpm run dev` serves the static site. It does not run `/api`, so the Writing section shows the saved Medium fallback. `python -m http.server 8000` does the same.

To load live Medium articles, run the Vercel development server from the repository root:

```bash
pnpm exec vercel dev
```

The Vercel CLI is not a project dependency. If that command is unavailable, use `npx vercel dev` and open the URL it prints.

Validation reports problems and does not rewrite files:

```bash
pnpm run validate
pnpm run format:check
```

`pnpm run validate` runs `lint:js`, `lint:html`, `lint:css`, `lint:syntax`, `format:check`, and `test`.

### Medium feed

The Medium username lives in `MEDIUM_USERNAME` at the top of `api/medium.js`. `#medium-feed` in `index.html` carries `data-medium-api` and `data-medium-profile` for the browser.

`GET /api/medium` fetches `https://medium.com/feed/@lohithprasannateja`, strips markup, and returns JSON:

```json
{ "profileUrl": "https://medium.com/@lohithprasannateja", "articles": [] }
```

Each article includes a plain-text title, excerpt, author, categories, publication date, an `http` or `https` link, and an optional cover image. The browser renders those fields as text and does not parse the RSS document. Successful responses send `Cache-Control: public, s-maxage=1800, stale-while-revalidate=86400`.

The **NEW** badge is applied to one card: the article with the latest publication date after the list is sorted newest first.

To test reduced motion, turn animation effects off in the operating system (on Windows: Settings, Accessibility, Visual effects), or emulate `prefers-reduced-motion: reduce` in the browser rendering tools. Reload and open Writing. The section glow and card entrance animations should not play.

To test the Medium fallback, use the static server (`pnpm run dev`) and open Writing. `/api/medium` is not available there, so the saved “Understanding Similarity Measures in Data Science” card remains, with a status message that the list could not be refreshed. The same message appears when `vercel dev` is running and the Medium request fails or times out.

## Visit counts

Open `/admin` and enter the PIN. The page is not linked from the public site. Counts stay there, and they are shown only after a visit has been stored. If storage is missing or a read fails, the page says so and does not substitute zeroes.

A visit is one browser on one US Eastern calendar day. Reloading does not add another visit. The same browser counts again on a later day. Bots, prefetched pages, the admin page, and local development are not counted. Preview deployments do not record new visits.

The browser tells the server only whether the referrer was outside this site. The server reads `utm_source` from that same-site request. A visit is stored only when that request includes this site's own page address. The server keeps a one-way daily hash only long enough to ignore a repeat visit that day, then deletes it. It does not store the IP address, user agent, referrer, or page URL. There is no analytics cookie for visitors.

`pnpm run dev` does not run `/admin` or `/api`. Use `pnpm exec vercel dev` to try the PIN page locally.

Use these URLs on the live domain:

- LinkedIn website field: `https://<your-domain>/?utm_source=linkedin`
- The website link inside the résumé PDF: `https://<your-domain>/?utm_source=resume`
- Direct visits use `https://<your-domain>/` with no campaign parameter

Percentages appear after 20 visits in that period. The admin page also lists the exact links for the domain you are signed in on.

Set these environment variables on the Vercel project. Do not commit the real values. `.env.example` lists the names.

- `ADMIN_PIN` — at least 8 characters
- `ADMIN_SESSION_SECRET` — at least 16 random characters. It signs the 12-hour admin session and the daily visitor hash. Changing it signs you out and can count the current day again.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, from an Upstash Redis database connected to the project. `KV_REST_API_URL` and `KV_REST_API_TOKEN` are accepted as well.

Eight wrong PINs from the same network pause sign-in for 15 minutes.

## Branches

- **`main`** — current site
- **`legacy-main`** — snapshot of the earlier `main` history
