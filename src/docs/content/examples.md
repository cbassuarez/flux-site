# Examples

This page collects reference snippets and mental models to reuse across docs.

## Pipeline Sketch

```text
(.flux source)
   ↓ parse + evaluate
(runtime snapshot / IR)
  { seed, time, docstep, assets, body }
   ↓ render to HTML/CSS
(paged layout)
   ↓

Live mode (viewer):
  advance docstep/time
   ↓ re-evaluate
  compute slot patches
   ↓ patch only slot DOM nodes
  (no repaginate; page breaks stay stable)
```

## Slot Invariant

```text
Anything that changes during playback must be inside a layout-locked slot
(with reserved geometry + a declared fit policy).
```

> TODO: Add runnable `.flux` examples once the docs repo is published.
