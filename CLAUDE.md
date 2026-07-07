# CLAUDE.md

## What this project is

An interactive Eurovision-style scoreboard for **live-streamed fan contests** (e.g. shown via OBS window capture). A host adds entries and awards points from a control page; a separate scoreboard page updates live with animated reordering.

**Important:** The project owner does not know JavaScript or web development. Explain changes in plain language, avoid unexplained jargon, and don't ask them to make code-level decisions. Verify changes work (e.g. via browser preview) rather than asking them to test code paths.

## Current state (proof of concept)

Plain HTML/CSS/vanilla JS pages, no build step, no dependencies, no framework. Two independent boards, each a stream page + control page pair:

- `scoreboard.html` — the stream-facing scoreboard. Renders entries ranked by points in two columns. Rows are absolutely positioned and moved with `translate(x, y)` + CSS transitions, which produces the glide animation when rankings change. Also shows a pink flash and a "+N" badge on entries that just scored, and gold/silver/bronze accents for the top 3.
- `control.html` — scoreboard backstage. Add/edit/remove entries, award Eurovision point values (0–8, 10, 12) or custom amounts, tie-break arrows, title/background/display customization, reset points, clear the board.
- `qualifiers.html` + `qualifiers-control.html` — a second, points-free board for qualifier announcements: country blocks in two columns in insertion order, with the same flag/title/background/display customization but no scoring, ranks, or award flashes. Separate localStorage key `ydse-qual-state` and IndexedDB background key `qualifiers-background`, so the two boards never interfere.
- `flags.js` — shared by both control pages (plain `<script src>`, works from file://): the generated `COUNTRY_CODES` map, `FLAG_OVERRIDES`, `SPECIAL_FLAG_NAMES`, and the flag-URL helpers. The stream pages don't need it (they only render stored `flagUrl`s).

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

The map covers all 258 emoji flags (every country and territory, incl. England/Scotland/Wales tag sequences) plus typed-name aliases. It is **generated** by `tools/gen-flags.mjs` (Node): the script enumerates CLDR region names via `Intl.DisplayNames`, verifies each Twemoji PNG exists on the CDN, and prints the `COUNTRY_CODES` literal to paste into `flags.js` — rerun it rather than editing the map by hand. `FLAG_OVERRIDES` in flags.js maps ISO codes to replacement image URLs and wins over Twemoji; Belarus (`by`), Russia (`ru`) and Iran (`ir`) deliberately use alternative flags shipped in the local `static/` folder (relative paths, so they work offline) — do not "fix" them to the official flags.

`lastAward` records the most recent points award (`seq` increments each time) so the scoreboard can flash the receiving entry even when the total doesn't change — e.g. a "+0" award or a negative correction from the custom-amount box.

- `control.html` writes state; `scoreboard.html` listens to the `storage` event **and** polls every 400 ms as a fallback.
- **Browser caveat:** opening the pages via file:// only syncs in Chrome/Edge (all file:// pages share one origin there). Firefox (since 68) and Safari isolate each local file's storage, so nothing syncs — the pages must be served from http://localhost instead. `Start scoreboard.command` (double-clickable) starts `python3 -m http.server 8123` and opens the control room; both control pages' footer hints mention it.
- Ranking: points descending, then `tieBreak` ascending, then `order` (insertion order). `tieBreak` defaults to `order`; the control page's ▲▼ arrows permute it within a group of equal-point entries to resolve ties manually. Any award that actually changes an entry's points resets that entry's `tieBreak` to `order` ("manual nudges are forgotten"), as does "Reset all points". The sort comparator must stay identical in both pages.
- Consequence: both pages must be open in the same browser on the same machine. Multi-machine or viewer participation would require a real backend — that is the anticipated future direction ("engine" in the repo name).

If you change a state shape or storage key, update **both pages of that board** — each page has its own copy of the read/write helpers by design (self-contained files). The qualifiers state (`ydse-qual-state`) is the same shape minus `points`/`tieBreak`/`lastAward`, plus: `entries[].qualified` (increasing stamp from `state.qualSeq`, null/absent = not qualified), `display.showBanner` (toggles the announcement banner), and `maxQualifiers` (0 = hide the "N/M qualifiers announced" line; no other validation by design). On qualifiers.html all blocks render at full opacity; a qualified block's glass background gets 50% more opaque (white alpha 0.10→0.15 / 0.04→0.06). Each new stamp enqueues a bottom banner ("X qualified for the Grand Final!") that rolls in from the left, holds centered ~5s, rolls out right — banners queue one at a time, are skipped while `showBanner` is off, and are not replayed for stamps that predate page load.

## Running / verifying

In Chrome/Edge, no server is required (double-click the HTML files); other browsers need the local server (see the browser caveat above). For automated verification, `.claude/launch.json` defines a static server:

```
python3 -m http.server 8123
```

Start it with the preview tools, drive `control.html`, and confirm changes appear on `scoreboard.html`. State persists in localStorage between sessions — clear the `ydse-state` key after testing so the owner starts clean.

## Conventions

- Keep pages self-contained (inline CSS/JS) unless growth genuinely forces a split.
- No frameworks, package managers, or build tooling without discussing it with the owner first — simplicity of "just open the file" is a feature for their streaming workflow.
- Visual style: dark stage background, pink/purple/gold Eurovision palette; the scoreboard is designed to look good on stream.
