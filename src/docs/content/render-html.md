# Render HTML

Flux has a small, explicit pipeline: source → runtime snapshot → paged render. Live playback advances `docstep` and/or `time`, re-evaluates, and patches only slot nodes.

## Paged Rendering

- Flux renders to paged HTML with stable page breaks.
- The same snapshot can be exported to PDF.

## Slot Patching

Slots are the only nodes that change during playback. By isolating changes to slots, Flux preserves layout and avoids repagination.
