# CLI Commands

This page expands on the CLI commands referenced elsewhere in the repo. Use the launcher-based install flow in [Installation](/docs/installation).

## View

Starts the local viewer UI for a `.flux` file.

```bash
flux view examples/viewer-demo.flux --docstep-ms 700 --seed 1
```

## Step

Advances the deterministic `docstep` and prints or streams runtime output.

```bash
flux step examples/viewer-demo.flux --n 1 --seed 1
```

## Tick

Advances wallclock time without changing `docstep`.

```bash
flux tick examples/viewer-demo.flux --seconds 2 --seed 1
```

## Export

Exports a paged render to PDF.

```bash
flux export examples/viewer-demo.flux --out ./viewer-demo.pdf
```

## Parse / Check

The CLI package currently documents parser and checker commands:

```bash
npx @flux-lang/cli parse example.flux
npx @flux-lang/cli check example.flux
```

> TODO: Confirm option flags and launcher equivalents before publishing external docs.
