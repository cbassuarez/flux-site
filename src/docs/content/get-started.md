# Get Started

Flux is a deterministic, paged document system. A `.flux` source evaluates into a runtime snapshot parameterized by **seed**, **docstep**, and **time**, then renders to HTML/PDF with stable page breaks.

> Requires Node ≥ 20.

## Install The Launcher

Flux ships with a launcher that installs and updates the managed toolchain for you.

```bash
npm i -g @flux-lang/flux
flux self update
flux
```

- `npm i -g @flux-lang/flux` installs the launcher.
- `flux self update` fetches or updates the managed toolchain.
- `flux` runs the launcher entrypoint.

## What Flux Is

- **Deterministic:** the same inputs yield the same runtime snapshot and pages.
- **Paged:** rendering is done as paged HTML and can be exported to PDF.
- **Slot-driven:** changing content lives inside layout-locked slots to preserve pagination.

## Next Steps

- [Installation](/docs/installation)
- [CLI Overview](/docs/cli-overview)
- [Language Overview](/docs/language-overview)
- [Rendering](/docs/render-html)
- [Viewer](/docs/viewer)
