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

`pnpm run validate` runs `lint:js`, `lint:html`, `lint:css`, `lint:syntax`, and `format:check`.

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

## Branches

- **`main`** — current site
- **`legacy-main`** — snapshot of the earlier `main` history
