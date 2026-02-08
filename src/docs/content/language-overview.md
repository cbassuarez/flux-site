# Language Overview

Flux is specified in terms of a typed AST and a canonical JSON IR. The grammar is versioned, tested, and designed to be embedded inside other tools.

## Core Concepts

- **Source → Runtime Snapshot:** `.flux` source parses into a document, then evaluates into a runtime snapshot.
- **Determinism:** snapshots are keyed by `seed`, `docstep`, and `time` to produce repeatable output.
- **Slots:** content that changes over time is wrapped in layout-locked slots to preserve pagination.

## Runtime Snapshot

A snapshot contains the evaluated document tree and the asset catalog used during rendering.

```ts
interface FluxRuntimeSnapshot {
  meta: { version: string; title?: string };
  seed: number;
  time: number;     // seconds (wallclock-driven timestep)
  docstep: number;  // integer step (docstep-driven iteration)
  assets: Array<{
    id: string;
    name: string;
    kind: "image" | "font" | "data" | string;
    path: string;
    tags?: string[];
    weight?: number;
    source?: { type: "bank"; name: string } | { type: string };
  }>;
  body: FluxNode[];
}
```
