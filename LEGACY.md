# Legacy lint notes

Validation is configured so new work is checked without rewriting the existing portfolio. These items were already in the repository. They are not introduced by the Medium feed or the standards setup.

## JavaScript

`eslint` covers `script.js` (browser) and `api/**/*.js` (Node.js CommonJS). `no-var` stays enabled. Four `var` bindings in the personal-photo viewer were changed to `const` so that rule can apply to the whole file. An unused `achievementsCloseBtn` binding was removed; the shared `.close-btn` listener already closes that modal.

## HTML

`html-validate` still checks structure that the current `index.html` satisfies, including duplicate IDs. These recommended rules are off because they fail only on older markup, and fixing them would be a site-wide HTML rewrite:

- `no-implicit-button-type` — buttons outside Writing omit `type`
- `aria-label-misuse` — labels on elements that do not support them
- `attribute-allowed-values` — empty `src` placeholders on the photo viewer and achievement frame
- `no-raw-characters` — raw `&` in older copy
- `element-required-attributes` — achievement iframes have no `title`
- `no-deprecated-attr` — `frameborder` on those iframes
- `element-permitted-content` — `div` elements nested in achievement buttons
- `no-inline-style` — photo tiles use inline custom properties
- `heading-level` — the page uses more than one `h1`

New HTML should still follow those rules. The Writing section does not add violations for them.

## CSS

Stylelint uses a small rule set that `styles.css` already passes: unknown properties, invalid colors, empty blocks, and similar syntax checks. `stylelint-config-standard` was not enabled, because it would report a large set of legacy selector, quote, and `!important` issues. The reduced-motion block and other older rules still use `!important`. New CSS should avoid `!important` even though the linter does not flag it.

## Formatting

Prettier checks JSON, Markdown, YAML, and JavaScript that are not listed in `.prettierignore`. These files are ignored so a format check does not rewrite them:

- `index.html`
- `styles.css`
- `script.js`
- `pnpm-lock.yaml`
- `vercel.json`
- `data/` and `scripts/`
- `.github/workflows/update-medium-posts.yml`

## Other files left in place

`scripts/update_medium_posts.py`, `data/medium-posts.json`, and `.github/workflows/update-medium-posts.yml` are a separate snapshot path. The page reads `GET /api/medium` instead. Those files were not deleted.
