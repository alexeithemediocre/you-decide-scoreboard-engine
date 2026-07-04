# CLAUDE.md

## What this project is

An interactive Eurovision-style scoreboard for **live-streamed fan contests** (e.g. shown via OBS window capture). A host adds entries and awards points from a control page; a separate scoreboard page updates live with animated reordering.

**Important:** The project owner does not know JavaScript or web development. Explain changes in plain language, avoid unexplained jargon, and don't ask them to make code-level decisions. Verify changes work (e.g. via browser preview) rather than asking them to test code paths.

## Current state (proof of concept)

Two self-contained HTML pages, no build step, no dependencies, no framework — plain HTML/CSS/vanilla JS with everything inlined:

- `scoreboard.html` — the stream-facing view. Renders entries ranked by points. Rows are absolutely positioned and moved with `translateY` + CSS transitions, which produces the up/down glide animation when rankings change. Also shows a pink flash and a "+N" badge on entries that just scored, and gold/silver/bronze accents for the top 3.
- `control.html` — backstage page. Add/remove entries, award Eurovision point values (1–8, 10, 12), reset points, clear the board.

### How the pages sync

Shared state lives in `localStorage` under the key **`ydse-state`**:

```json
{
  "entries": [{ "id": "...", "name": "...", "points": 0, "order": 0 }],
  "nextOrder": 5
}
```

- `control.html` writes state; `scoreboard.html` listens to the `storage` event **and** polls every 400 ms as a fallback.
- Ranking: points descending, ties broken by `order` (insertion order) so sorting is stable.
- Consequence: both pages must be open in the same browser on the same machine. Multi-machine or viewer participation would require a real backend — that is the anticipated future direction ("engine" in the repo name).

If you change the state shape or storage key, update **both** pages — they each have their own copy of the read/write helpers by design (self-contained files).

## Running / verifying

No server is required for normal use (double-click the HTML files). For automated verification, `.claude/launch.json` defines a static server:

```
python3 -m http.server 8123
```

Start it with the preview tools, drive `control.html`, and confirm changes appear on `scoreboard.html`. State persists in localStorage between sessions — clear the `ydse-state` key after testing so the owner starts clean.

## Conventions

- Keep pages self-contained (inline CSS/JS) unless growth genuinely forces a split.
- No frameworks, package managers, or build tooling without discussing it with the owner first — simplicity of "just open the file" is a feature for their streaming workflow.
- Visual style: dark stage background, pink/purple/gold Eurovision palette; the scoreboard is designed to look good on stream.
