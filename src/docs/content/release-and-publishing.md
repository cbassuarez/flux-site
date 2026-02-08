# Release And Publishing

This repo ships a Vite-based marketing site and bundles the viewer/editor assets alongside it.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

The build runs a prebuild step (`npm run sync:flux-version`) before Vite to align the site with the current Flux version.

## Notes

- The editor landing page is served at `/edit` when the viewer server is running locally.
- Additional publish automation is still evolving.

> TODO: Document release checklists once the CLI and viewer packages ship publicly.
