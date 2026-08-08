# Pranava — Global Launch Plan

A GIRI product. Goal: Pranava on Android, iPhone and the open web, worldwide, at minimum cost.

## Phase 0 — Now (cost: $0)
- App is live worldwide already: https://anupbkc.github.io/pranava/ (installable PWA, offline).
- Anup uses it daily and refines by feel; Claude ships iterations on request.
- Record own guided voices (Voice Memos is fine; quiet room, 20 cm from mouth, re-record rather than edit). Drop into `guided/` + one entry in `guided.json`.

## Phase 1 — Identity (cost: ~$10–15/yr) — do before any store submission
- Buy a domain (e.g. `pranava.app` or `pranava.giri.org.np` subdomain — subdomain is $0).
- Point GitHub Pages to it (Settings → Pages → Custom domain; HTTPS automatic).
- Why first: store listings and QR codes should never carry the github.io URL.

## Phase 2 — Android (cost: $25 one-time)
- Package the PWA as a **Trusted Web Activity** with PWABuilder (pwabuilder.com — free, generates the signed package from the live URL).
- Google Play developer account: **$25 once**. Review takes ~ days.
- The store app is a thin shell over the live site → every git push updates all users instantly, no store re-review for content.

## Phase 3 — iPhone (cost: $99/yr — defer until traction)
- Wrap with **Capacitor** (free, keeps 100% of the web code) → Xcode → App Store.
- Apple Developer Program **$99/yr** and stricter review (they dislike thin wrappers: ship with native touches — haptics on bells, HealthKit "Mindful Minutes" logging — Capacitor plugins make both easy).
- Until then iPhone users install via Safari → Add to Home Screen (works today, offline, free).

## Phase 4 — Accounts (cost: $0 on free tier)
- **Yes, sign-in makes sense at global scale** (Headspace/Calm model) — but always optional; guest mode stays.
- Stack: **Supabase free tier** (auth + Postgres). Sign in with Apple/Google/email magic link.
- Syncs: session log (progress report across devices), custom patterns, settings.
- Later it becomes the entitlement layer if premium content is ever sold.
- Prereq: Anup creates the Supabase account (free); Claude wires `auth.js` + sync.

## Phase 5 — Content & partnerships
- Own-voice guided library grows via the repo backend (no code changes).
- **Spotify reality check**: there is no public API for playing Spotify audio inside a third-party app session flow — their Web Playback SDK requires Premium login, approval, and forbids background/mixing use cases. A "vast catalog" integration is a *partnership conversation* (much later, with user numbers), not an engineering task today. Near-term substitute: keep growing the license-clean library (CC0/PD from archive.org & Wikimedia — 12 tracks shipped) and user-imported sounds.
- Alternative catalog path with real APIs today: none worth the complexity; revisit at scale.

## Cost summary
| Step | Cost |
|---|---|
| Web/PWA worldwide | $0 (GitHub Pages) |
| Domain | ~$12/yr (or $0 subdomain) |
| Google Play | $25 once |
| Apple App Store | $99/yr (defer) |
| Accounts/sync (Supabase) | $0 free tier |
| **Total to global Android+web launch** | **~$37 first year** |

## Order of operations
1. Anup practices daily → feature/feel refinements (ongoing)
2. Record own guided voices → replace synthesized ones
3. Domain → custom URL
4. PWABuilder → Google Play ($25)
5. Supabase accounts + sync
6. Apple wrapper when demand justifies $99/yr
7. Partnership conversations (Spotify et al.) with traction data
