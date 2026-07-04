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
  "entries": [{ "id": "...", "country": "Sweden", "artist": "Loreen", "song": "Euphoria",
                "points": 0, "order": 0, "flagUrl": "https://…/1f1f8-1f1ea.png" }],
  "nextOrder": 5,
  "lastAward": { "id": "...", "amount": 12, "seq": 3 },
  "display": { "showArtist": true, "showSong": true }
}
```

Entry names are structured (`country` required; `artist`/`song` optional, editable inline on the control page). Both pages' `readState` migrate legacy entries that still have a single `name` string by splitting on dashes. `display` toggles whether artist/song appear on the scoreboard; the control page has checkboxes for it.

Further optional state keys, all set from the control page:

- `title`: `{ text, font, color }` — scoreboard heading. Empty strings mean the defaults (text "Grand Final", the CSS font, the pink/purple gradient; a non-empty `color` replaces the gradient with a solid color).
- `background`: `{ kind: "image"|"video", name, seq }` or null. The actual file is a Blob in **IndexedDB** (db `ydse-files`, store `files`, key `background`) because localStorage can't hold videos; `seq` increments on every change so the scoreboard knows to re-read the blob. Videos play muted and looped. Any failure (missing blob, unreadable file, IndexedDB unavailable) makes the scoreboard fall back to its default CSS gradient background.

`flagUrl` is optional (null/absent = no flag). It is resolved once at add time on the control page: the country is parsed from the entry name (text before the first dash), looked up in an inline country→code map, and turned into a Twemoji PNG URL on the jsDelivr CDN (`jdecked/twemoji`). Flags therefore need internet access to display; both pages hide broken flag images gracefully.

The map covers all 258 emoji flags (every country and territory, incl. England/Scotland/Wales tag sequences) plus typed-name aliases. It is **generated** by `tools/gen-flags.mjs` (Node): the script enumerates CLDR region names via `Intl.DisplayNames`, verifies each Twemoji PNG exists on the CDN, and prints the `COUNTRY_CODES` literal to paste into control.html — rerun it rather than editing the map by hand. `FLAG_OVERRIDES` in control.html maps ISO codes to replacement image URLs and wins over Twemoji; Belarus (`by`) deliberately uses the white-red-white 1918/1991–1995 flag from Wikimedia — do not "fix" it to the official flag.

`lastAward` records the most recent points award (`seq` increments each time) so the scoreboard can flash the receiving entry even when the total doesn't change — e.g. a "+0" award or a negative correction from the custom-amount box.

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
