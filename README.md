# Flux Site

A Vite + React + TypeScript microsite for the Flux score language, styled with Tailwind CSS and deployed to GitHub Pages.

## Development

```bash
npm install
npm run dev
```

## Editor (served at /edit)

```bash
pnpm dev
```

```bash
pnpm build:edit
```

To test against the Flux viewer server, run the viewer and open `http://localhost:<port>/edit` so the editor loads under the `/edit/` base path.

To build the marketing site at the root path, set `VITE_BASE=/`:

```bash
pnpm build:site
```

## Production build

```bash
npm run build
npm run preview
```
