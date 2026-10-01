# Clavis

**A self-custody Bitcoin wallet built on Tachi's TAURUS vaults, with Guardian — a two-layer security system that checks payments before they send and watches the vault while you're away.**

Built for the [Tachi OP_Freedom Hackathon](https://www.tachibtc.com/) — Bounty #1: TAURUS-based Non-Custodial Wallet/Custody.

🔗 **Live demo:** [clavis-wallet.vercel.app](https://clavis-wallet.vercel.app/)

---

## The Problem

Lightning wallets deliver fast Bitcoin payments, but at a cost: users have to actively manage channels, watch inbound liquidity, and live with the risk of force-closures. Tachi's TAURUS vaults solve the sovereignty problem structurally — BTC locks into a timelocked vault, and once the timelock clears, you can always exit unilaterally back to Bitcoin mainnet, no permission needed from anyone.

But that guarantee only helps if you're actually paying attention. Most people won't be watching timelocks and liquidity conditions in real time.

**Clavis closes that gap.**

## What Clavis Does

- **TAURUS vault management** — real client-side key generation, real vault creation against Tachi's live signet validator quorum, real on-chain deposits, real ledger registration
- **Fast off-chain payments via VTXOs** — real vault-to-vault transfers over Tachi's ledger, no channel management
- **A real, working unilateral exit flow** — once your timelock clears, build/sign/broadcast a real Bitcoin transaction through the exit leaf, no counterparty required
- **Guardian** — one security layer, two surfaces:
  - **Spend Protection** checks a payment against your configured rules (spending limit, daily limit, new recipient, large fraction of balance) the moment you try to send it — on-device, real-time, never blocks on its own
  - **Vault Watch** monitors the vault continuously via a real backend (registration + a scheduled check against live on-chain/ledger state, plus Tachi's own watchtower breach-receipt endpoint), independent of whether the app is open — and can push a real notification to your device the moment something changes, via standard Web Push (opt-in, no third-party SDK or paid service)
- **Real PIN encryption** — AES-GCM + PBKDF2, native Web Crypto, no plaintext key material once a PIN is set

## Current Status

This started as a hackathon-in-progress submission; most of what was originally scoped as "not yet built" is now real. See `PROGRESS.md` for the full session-by-session log, including several real protocol findings and infra gaps discovered along the way (documented there rather than papered over).

**Real and working:**
- Full wallet flow: onboarding (create/import, real BIP39), Deposit, Send, Receive, Exit — all wired to Tachi's live signet daemon, not a mock
- Guardian: real Spend Protection rule evaluation, real Vault Watch backend (see setup below), real opt-in push notifications for Vault Watch's alerts
- Real activity feed (deposits + sends), real PIN encryption, real live payment detection (WebSocket push from Tachi's signet daemon — see PROGRESS.md for the infra gap this exposed on Tachi's side and its fix)

**Not yet built (deliberately, see PROGRESS.md for why):**
- Cooperative vault-state advance (needed so a full exit stays available after a real Send has partially spent a vault) — confirmed out of scope by Tachi directly: the daemon now accepts the transaction, but it only records a bare owner-signed state number with no balance or lifecycle semantics, and the SDK has no builder for it yet
- HAT/RIP on-chain balance verification — stretch goal

## Tech Stack

- **Frontend:** Vite + React, Tailwind CSS v4, React Router
- **Backend:** Vercel serverless functions.
  - `api/rpc-proxy.js` — watch-only CORS workaround for Tachi's hosted RPC. Never holds keys, never signs.
  - `api/guardian/*.js` — Vault Watch. Only ever receives/stores public vault data (address, output script, CSV block count) and reads public daemon state. Never a mnemonic, never a signature.
- **Deployment:** Vercel, auto-deployed from `main`, plus a Vercel Cron job for Vault Watch's scheduled checks

## Project Structure

```
clavis/
  api/
    rpc-proxy.js        → CORS workaround for Tachi's hosted RPC (watch-only)
    guardian/
      register.js       → registers a vault's public info, runs an immediate check
      check.js          → the daily cron: re-checks every registered vault, sends push alerts on real transitions
      status.js         → what the app polls for a vault's last known status
      push-subscribe.js → stores/removes one browser's push subscription for a vault
      _check.js         → the actual real checks (on-chain UTXOs, ledger balance, watchtower)
      _notify.js        → push notification sending (web-push, VAPID)
      _store.js         → persistence (Upstash Redis, or in-memory for local dev)
  public/
    sw.js               → service worker: receives push events, shows the notification
  src/
    components/
      Home/ Transfer/ Deposit/ Exit/ Onboarding/
      Guardian/
        RecommendationScreen.jsx   → unified Spend Protection + Vault Watch status, push toggle
        SetupScreen.jsx            → Spend Protection rule toggles
        ActivityLog.jsx
    lib/
      taurusSdk.js       → real Tachi/Bitcoin SDK calls (vault, deposit, send, exit, watch)
      guardianRules.js   → Spend Protection's real rule evaluation
      activityHistory.js → persisted send/deposit history + Guardian's log
      wallet.js / walletCrypto.js → key management + real PIN encryption
      pushNotifications.js → client side of Web Push (subscribe/unsubscribe)
    App.jsx
```

## Running Locally

```bash
git clone https://github.com/Emmythefirst/clavis.git
cd clavis
npm install
npm run dev
```

App runs at `http://localhost:5173`. Vault Watch's backend runs locally too (via a Vite dev-server middleware that executes the real `api/guardian/*.js` handlers), using an in-memory store — real checks against the live daemon work, but nothing persists across a dev-server restart. See below to make it persist for real.

### Setting up Vault Watch's persistence (optional, for real deployment)

Vault Watch needs somewhere to remember which vaults are registered between the scheduled checks. This app uses [Upstash Redis](https://upstash.com) (REST-based, works cleanly from Vercel's serverless runtime):

1. Create a free Redis database at [upstash.com](https://upstash.com) (or via Vercel's storage marketplace, which can provision the same thing).
2. Set two environment variables on your Vercel project (and in a local `.env` if you want persistence in dev too): `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Optionally set `CRON_SECRET` to any random string — Vercel sends it automatically as a bearer token when it triggers the scheduled check, and `api/guardian/check.js` verifies it. Without it, that endpoint runs unauthenticated (harmless — it's watch-only — but wastes function invocations if someone finds the URL).

Without these set, Vault Watch still works (in-memory fallback), just doesn't survive a cold start in production — real checks run, but state resets frequently.

The cron schedule itself lives in `vercel.json` (once daily — Vercel's Hobby plan doesn't allow more frequent cron jobs; upgrade to Pro if you want finer-grained checks).

### Setting up push notifications (optional)

Vault Watch can push a real notification to a device the moment something changes (a watchtower breach, a balance divergence, a matured timelock), via standard Web Push — no third-party SDK, no paid service, no account to create. The browser's own push service (Chrome/Edge, Firefox, Safari each run their own) delivers it once the server signs it with a VAPID keypair:

1. Generate a keypair: `npx web-push generate-vapid-keys`.
2. The **public** key isn't secret — it's already committed in `src/lib/pushNotifications.js` and `api/guardian/_notify.js` (both copies must match if you regenerate). Replace it in both places if you want your own.
3. Set the **private** key as a Vercel env var: `VAPID_PRIVATE_KEY`. Without it, `api/guardian/check.js` skips sending (logged once, not an error) — Vault Watch's detection and the in-app status still work exactly as before, only the push half is off.

The one real platform caveat: Safari on iOS only supports web push for a site added to the home screen (iOS 16.4+). Nothing to build differently for that — it's a browser capability check (`isPushSupported()`), and the toggle in Guardian's Vault Watch card reflects it honestly rather than pretending it works everywhere.

## Built By

Emmy ([@Emmythefirst](https://github.com/Emmythefirst)) — solo build for the Tachi OP_Freedom hackathon.

---
