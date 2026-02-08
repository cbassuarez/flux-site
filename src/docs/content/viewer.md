# Viewer

The Flux viewer renders paged HTML, advances `docstep`/`time`, and hosts the editor UI.

## Local Viewer Server

To use the editor, run the Flux viewer server and open `/edit` on the same host.

## Live Playback

- `docstep` advances discrete edition states.
- `time` advances wallclock-driven updates.
- Slot patches update without repagination.

> TODO: Document the viewer server flags once they are published.
