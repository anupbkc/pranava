# Pranava — Architecture & Function Map

**A product of GIRI — Gayatri Interdisciplinary Research Institute**
Live: https://anupbkc.github.io/pranava/ · Repo = backend: https://github.com/anupbkc/pranava

## Design principles

1. **Zero dependencies** — vanilla HTML/CSS/JS, no framework, no build step. Loads instantly, runs forever.
2. **Repo as backend** — guided audio + `guided.json` manifest are served from this repo via GitHub Pages. Adding content never requires touching code.
3. **All built-in sounds are synthesized** — Web Audio API, tuned to the 432 Hz family (gong 108, bowl 216, bell 432, tick 864, tingsha 2160). No audio assets for the instrument sounds.
4. **Offline-first** — service worker, network-first with cache fallback. User data never leaves the device.
5. **Modules by file** — each file owns one concern; `app.js` is sectioned by `/* ——— name ——— */` banners in load order.

## File map

| File | Concern |
|---|---|
| `index.html` | All views (splash, 3 tabs, session overlay, mini pill, builder console) |
| `style.css` | Design tokens (`:root` palette), components, animations |
| `storage.js` | `SoundDB` — IndexedDB for imported sounds (ArrayBuffer records — iOS-safe) |
| `audio.js` | `Aud` — synthesis engine, ambience generators, cues, voice, imported playback |
| `presets.js` | `BREATH_PRESETS` — breathwork patterns data |
| `app.js` | UI wiring + session engine (sections below) |
| `sw.js` | Service worker, cache `pranava-vN` (bump on each release) |
| `manifest.webmanifest` | PWA install metadata |
| `guided.json` | **Backend manifest** — guided session catalog |
| `guided/*.m4a` | Guided voice tracks (generated with macOS `say`, or recorded) |
| `icon.svg` / `giri.svg` | App logo (lotus+bindu) / GIRI emblem |

## `audio.js` — Aud

| Function | Purpose |
|---|---|
| `init / resume / suspend` | Context lifecycle; sets `navigator.audioSession.type='playback'` (iOS silent-switch fix); master → warmth lowpass (5.2 kHz) |
| `unlock()` | iOS gesture unlock — silent buffer inside first tap |
| `partial / strike / noiseBuffer / brownBuffer` | Synthesis primitives |
| `bowl / gong / tingsha / bell / tick` | 432-family instruments |
| `sweep / cue / hum` | Breath-phase sound cues |
| `voice(text, voiceName)` | speechSynthesis wrapper (rate .8, pitch .72) |
| `startAmbient(id, buf?) / stopAmbient` | om, rain, ocean, wind, forest, or imported loop |
| `decodeImported / playImported` | IndexedDB → AudioBuffer (cached) |

## `app.js` sections

| Section | Key functions / state |
|---|---|
| splash | pull-up dismiss; global one-time `Aud.unlock()` on first touch |
| dial | `dialSVG`, `setProg` (arc), `flowerSVG` (bg only) |
| chakra viz | `CH_COLORS/CH_Y`, `buildOrbs` (lotus figure svg), `updateOrbs` (orbs + spine beam) |
| tabs | bottom nav switching |
| sound pickers | `bellOptions/ambOptions` (imported ≤45 s → bells, >45 s → ambience), `fillSelect`, `playBell`, `startAmbience`; **live while running** |
| chips | `renderChips` (with custom-minutes input); live retiming |
| breath presets | `renderPresets` (pattern bars), custom builder (`openBuilder/builderRow`) |
| library | `renderLibrary`, import flow (decodes for duration), `loadImported` |
| report | `renderStats` — totals, streak, 7-day chart; `logSession` |
| session engine | state `S`; `beginSession(mode, gSess?, gUrl?)` (modes: meditate/breathe/guided), `tick`, `nextPhase`, `endSession`, `prep` countdown, wake lock |
| guided | `loadGuided` (fetch manifest), per-session voice select, `guidedAudio` (HTMLAudio: media channel + pause/resume), soft endings (`soft`), chakra marks |
| mini pill | minimize (`#btn-min`), reopen, end (`#mini-end`); live time |
| mixer | `#rng-voice` (guided volume), `#rng-bg` (ambience) |
| builder console | 7 taps on GIRI emblem + passphrase → export/import data, force update |

## Data stores (all on-device)

| Store | Contents |
|---|---|
| `localStorage pranava.cfg` | All settings (durations, sounds, voice, preset) |
| `localStorage pranava.log` | Session history `[{d, mode, m}]` → progress report |
| `localStorage pranava.custom` | Custom breath patterns |
| `IndexedDB pranava/sounds` | Imported audio `{name, type, buf, dur}` |

## guided.json schema

```json
{ "id": "slug", "name": "Display", "desc": "subtitle", "dur": 300,
  "voices": {"Label": "guided/file.m4a"} | null,
  "soft": true,                      // optional: whisper-bell ending (sleep)
  "chakras": [0.08, ...7 fractions]  // optional: chakra viz timing marks
}
```

## Release process

1. Edit files → bump `CACHE` in `sw.js` → test locally (`python3 -m http.server 8431` in folder).
2. `git add -A && git commit && git push` → GitHub Pages deploys in ~1–2 min.
3. Clients pick up changes on next online launch (network-first SW).

## Roadmap

- ES-module refactor + bundle-less imports once module count grows
- Optional cloud accounts (Supabase: auth + session-log sync) — sign-in stays optional
- Studio-quality guided voices (own recordings or ElevenLabs)
- App Store wrapper (Capacitor) if distribution demands it
