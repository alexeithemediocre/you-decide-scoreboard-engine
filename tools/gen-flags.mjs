// Generates the COUNTRY_CODES map for flags.js:
// every ISO region code that (a) CLDR knows a display name for and
// (b) actually has a Twemoji flag PNG on the jsDelivr CDN.
// Keep this base URL in sync with TWEMOJI_BASE in flags.js.
const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/72x72/";

const dn = new Intl.DisplayNames(["en"], { type: "region" });
const letters = "abcdefghijklmnopqrstuvwxyz";

function hexForCode(code) {
  return code.split("").map(ch => (0x1f1e6 + ch.charCodeAt(0) - 97).toString(16)).join("-");
}

// 1. Collect all codes CLDR has a real name for
const candidates = [];
for (const a of letters) for (const b of letters) {
  const code = a + b;
  let name;
  try { name = dn.of(code.toUpperCase()); } catch { continue; }
  if (!name || name === code.toUpperCase()) continue; // unknown region
  candidates.push({ code, name });
}
console.error(`CLDR regions found: ${candidates.length}`);

// 2. Keep only those with an existing Twemoji flag
const existing = [];
const missing = [];
const queue = [...candidates];
async function worker() {
  while (queue.length) {
    const item = queue.shift();
    const res = await fetch(TWEMOJI_BASE + hexForCode(item.code) + ".png", { method: "HEAD" });
    (res.ok ? existing : missing).push(item);
  }
}
await Promise.all(Array.from({ length: 16 }, worker));
console.error(`with Twemoji flag: ${existing.length}; missing: ${missing.map(m => m.code).join(", ") || "none"}`);

// 3. Build name -> code map with normalized keys and common aliases
function normalize(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/’/g, "'");
}

const map = new Map();
function put(key, code) {
  key = normalize(key).trim();
  if (key && !map.has(key)) map.set(key, code);
}

for (const { code, name } of existing.sort((x, y) => x.name.localeCompare(y.name))) {
  put(name, code);
  // "St. Kitts & Nevis" -> "saint kitts and nevis" etc.
  let alt = name.replace(/\bSt\.\s/g, "Saint ").replace(/\s&\s/g, " and ");
  put(alt, code);
  // "Myanmar (Burma)" -> "myanmar" + "burma"
  const paren = name.match(/^(.*?)\s\((.*?)\)$/);
  if (paren) { put(paren[1], code); put(paren[2], code); }
  // "Congo - Kinshasa" -> first part only handled via aliases below
}

// Hand-picked aliases people actually type
const ALIASES = {
  "uk": "gb", "great britain": "gb", "britain": "gb",
  "usa": "us", "united states of america": "us", "america": "us",
  "czech republic": "cz", "macedonia": "mk", "fyr macedonia": "mk",
  "turkiye": "tr", "holland": "nl", "moldova": "md",
  "russian federation": "ru", "republic of ireland": "ie",
  "bosnia": "ba", "bosnia and herzegovina": "ba",
  "palestine": "ps", "hong kong": "hk", "macau": "mo", "macao": "mo",
  "south korea": "kr", "korea": "kr", "republic of korea": "kr",
  "north korea": "kp", "dprk": "kp",
  "democratic republic of the congo": "cd", "dr congo": "cd", "drc": "cd",
  "republic of the congo": "cg", "congo": "cg",
  "ivory coast": "ci", "cote d'ivoire": "ci",
  "cape verde": "cv", "east timor": "tl", "timor leste": "tl",
  "swaziland": "sz", "vatican": "va", "vatican city": "va",
  "uae": "ae", "united arab emirates": "ae",
  "laos": "la", "brunei": "bn", "syria": "sy", "iran": "ir",
  "micronesia": "fm", "the gambia": "gm", "gambia": "gm",
  "falklands": "fk", "burma": "mm", "european union": "eu",
  "united nations": "un", "sao tome and principe": "st",
  "trinidad": "tt", "antigua": "ag", "saint barthelemy": "bl",
  "saint martin": "mf", "sint maarten": "sx", "curacao": "cw",
  "reunion": "re", "aland": "ax", "aland islands": "ax"
};
for (const [k, v] of Object.entries(ALIASES)) put(k, v);

// UK home nations use Twemoji tag-sequence flags, not ISO codes
put("england", "1f3f4-e0067-e0062-e0065-e006e-e0067-e007f");
put("scotland", "1f3f4-e0067-e0062-e0073-e0063-e0074-e007f");
put("wales", "1f3f4-e0067-e0062-e0077-e006c-e0073-e007f");

// 4. Emit as a compact JS object literal, alphabetical by key
const entries = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
console.error(`total keys (with aliases): ${entries.length}`);
let out = "  var COUNTRY_CODES = {\n";
let line = "   ";
for (const [k, v] of entries) {
  const piece = ` ${JSON.stringify(k)}: ${JSON.stringify(v)},`;
  if (line.length + piece.length > 96) { out += line + "\n"; line = "   "; }
  line += piece;
}
out += line.replace(/,$/, "") + "\n  };";
console.log(out);
