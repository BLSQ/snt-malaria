# Documentation site

This repository includes a small **static documentation site generator** that turns Markdown files in `docs/src/` into plain HTML pages in `docs/build/`.

## Quick start

From the repo root:

```bash
npm install
npm run docs:build
```

Then open:

- `docs/build/index.html` (redirects to English)

## Structure

### Sources

- **English docs**: `docs/src/en/`
- **French docs**: `docs/src/fr/`
- **Private (not built)**: `docs/src/private/`
- **Shared static assets**: `docs/src/assets/` (images, svg, etc.)

The private folder serves as a place to store internal documentation, it is ignored by the build process.

### Templates

- **HTML template**: `docs/templates/page.html`
- **CSS**: `docs/templates/styles.css`

### Output

The build generates:

- `docs/build/styles.css`
- `docs/build/assets/` (copied from `docs/src/assets/`)
- `docs/build/en/**` and `docs/build/fr/**`
- `docs/build/index.html` (redirects to `./en/index.html`)

## Conventions

### Page title

The generator uses the **first H1** (`# ...`) in each Markdown file as the page title and removes that H1 from the rendered content body.

### Sidebar (TOC)

- Pages are grouped by **top-level folder** (section header).
- Files directly under `docs/src/<lang>/` appear without a section header.

### “Home” page (per language)

Each language’s `index.html` redirects to `creer-un-plan.html` if `creer-un-plan.md` exists in that language folder; otherwise it falls back to the first page (sorted).

### Language switcher

- A floating language selector is rendered at the **top-right of the page**.
- When switching languages, it tries to open the **same source-relative page** in the other language (same path under `docs/src/<lang>/`).
- If that translation does not exist, it falls back to that language’s home page.

## Adding new pages

1. Create a Markdown file under `docs/src/en/` and/or `docs/src/fr/`.
2. Give it an H1 title as the first heading.
3. Rebuild:

```bash
npm run docs:build
```

## Notes

- The output uses plain HTML+CSS and a CSS-only mobile hamburger menu for the sidebar.
- The generator script lives in `docs/scripts/build-docs.mjs`.

