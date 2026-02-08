# CLI Overview

Flux ships with a CLI that wraps the parser, runtime, and viewer workflows. The docs below summarize commands that are already referenced in the repo.

## Viewer Workflow

The viewer pipeline supports stepping through a deterministic runtime snapshot. These commands are already used in the existing docs examples:

```bash
# Start the viewer (offline local web UI)
flux view examples/viewer-demo.flux --docstep-ms 700 --seed 1

# Step the runtime (deterministic snapshot by docstep)
flux step examples/viewer-demo.flux --n 1 --seed 1

# Advance wallclock time (timestep) without changing docstep
flux tick examples/viewer-demo.flux --seconds 2 --seed 1

# Export PDF (adjust flags to match your CLI)
flux export examples/viewer-demo.flux --out ./viewer-demo.pdf
```

## Parser And Checks

The tooling page documents the parser and checker as part of the standalone CLI package:

```bash
npx @flux-lang/cli parse example.flux
npx @flux-lang/cli check example.flux
```

> TODO: Confirm how these commands map into the launcher-managed toolchain.
