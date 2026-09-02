# Pranava — Store Launch Checklist

Live PWA: https://anupbkc.github.io/pranava/ · A GIRI product.

## Status legend: ✅ done · 🟡 I can do next · 🔵 needs YOU (account/credential/purchase)

## Web / PWA (already global, free)
- ✅ Installable PWA, offline, service worker
- ✅ PNG icons 192 / 512 / maskable + apple-touch (generated from the lotus logo)
- ✅ Privacy policy page (`privacy.html`) — required by both stores
- ✅ Manifest with id, scope, categories, maskable icon
- 🟡 App screenshots (phone) for store listings — I can capture these
- 🔵 **Custom domain** (~$12/yr, e.g. `pranava.app`) — needed for a clean Android TWA and listings. You buy it; I wire GitHub Pages to it.

## Google Play (Android) — cheapest first store, ~$25 one-time
- 🔵 Google Play Developer account — **$25 once** (you create it)
- 🔵 Domain (above) — TWA verifies domain ownership via a `assetlinks.json` file
- 🟡 Generate the signed Android package with **PWABuilder** (free, from the live URL) — I can prepare everything; you upload + sign in Play Console
- 🟡 Store listing copy, feature graphic, screenshots — I can draft/produce
- Result: a thin shell over the live site → every `git push` updates all users, no re-review for content changes.

## Apple App Store (iPhone) — defer until traction, $99/yr
- 🔵 Apple Developer Program — **$99/yr** (you enroll)
- 🟡 Wrap with **Capacitor** (keeps 100% of the web code) — I can set this up
- 🟡 Add 1–2 native touches so Apple doesn't reject as a "thin wrapper": haptic taps on bells, and log **Mindful Minutes to Apple Health** — I can implement via Capacitor plugins
- Until then: iPhone users install free via Safari → Share → Add to Home Screen (works today, offline)

## Monetization (see MONETIZATION.md) — needs a backend first
- 🔵 Supabase account (free tier) — for optional sign-in + entitlements
- 🔵 Payment: Apple/Google in-app purchase (in the wrapped apps) and/or Stripe (web)
- 🟡 Freemium gating in-app (free core; premium = full guided library, healing frequencies, custom imports, cross-device sync) — I build once the backend exists

## Recommended order
1. 🔵 Buy domain → 🟡 I wire it + capture screenshots
2. 🔵 Google Play account ($25) → 🟡 I build the TWA package → you upload
3. Gather real users (the market study's validation channel)
4. 🔵 Supabase → 🟡 I add optional accounts + premium gating
5. 🔵 Apple account ($99) when iPhone demand justifies → 🟡 I wrap with Capacitor + native touches

**Total cash to be live on Android + web: ~$37 (domain + Play).** Apple and monetization come after you have users.
