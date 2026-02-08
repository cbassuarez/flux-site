# Installation

Flux is delivered through a launcher that installs and updates the managed toolchain.

## Install The Launcher

```bash
npm i -g @flux-lang/flux
```

## Update The Toolchain

```bash
flux self update
```

## Run Flux

```bash
flux
```

## Notes

- The launcher keeps the underlying toolchain in sync.
- If you need to pin or inspect versions, use the launcher output as the source of truth.
