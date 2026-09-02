# Pranava — Monetization Plan

**Honest status: nothing is built yet.** No accounts, no payments, no ads. This is the plan for
*after* you have initial users — deliberately not before, so the app earns goodwill first.

## Principle
A meditation app must never wall off the first breath. The free tier stays genuinely useful forever;
paying unlocks depth, not basic function. (Calm/Headspace gate content behind accounts + subscription;
we do the same but keep a real free core and never use ads — ads break the calm and cheapen the brand.)

## Model: freemium (recommended)
| Free forever | Premium (subscription or one-time) |
|---|---|
| Timer, all breathwork patterns, custom pattern builder | Full guided library + your own recorded sessions |
| Synthesized bells/bowls (432 Hz) + basic ambiences | Healing-frequency suite (Solfeggio + binaural) |
| Local progress report | Cross-device history sync |
| Offline | Import your own sounds without limit; premium sound packs |

Why this split: the *content and sync* are what cost you to produce and host, and what dedicated
practitioners happily pay for — the timer itself should stay free to build trust and word-of-mouth
(your best growth channel, per the market study's studio-seeding insight).

## Pricing (validate, don't assume)
- Subscription: ~US$3–5/mo or ~$25–35/yr (meditation-app norm), OR
- **One-time "lifetime unlock" ~$15–25** — fits a conscious/anti-subscription-fatigue audience and is
  simpler to run. Worth A/B testing against subscription.
- Optional "Support / pay-what-you-want" tier — aligns with the brand, low effort.

## What it technically requires (the honest gating)
1. **Accounts + entitlement store** — who paid, what they unlock. → Supabase (free tier) auth + a
   `is_premium` flag. Sign-in stays optional; guests keep the free tier.
2. **Payments:**
   - In the **wrapped store apps**, you must use Apple/Google **in-app purchase** (they take ~15–30%,
     and forbid external payment links for digital goods).
   - On the **web/PWA**, use **Stripe** or **Gumroad** (lower fees, but can't be linked from inside the
     iOS app).
3. **Gating logic in-app** — trivial once 1 and 2 exist; I build it then.

## Sequence
Users first → Supabase accounts (optional sync as the free hook) → add premium content gate →
turn on payments. Do **not** add payments before there's an audience and a backend; premature
monetization on zero users just adds risk and maintenance.

## My recommendation
Start with **one-time lifetime unlock via Stripe on the web** (simplest, no app-store cut, fits the
conscious buyer), and add store IAP only when the native apps ship. Keep the free tier strong.
