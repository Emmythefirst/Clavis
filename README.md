# Clavis

**A self-custody Bitcoin wallet built on Tachi's TAURUS vaults, with Guardian — a two-layer security system that checks payments before they send and watches the vault while you're away.**

Built for the [Tachi OP_Freedom Hackathon](https://www.tachibtc.com/) — Bounty #1: TAURUS-based Non-Custodial Wallet/Custody.

🔗 **Live demo:** [clavis-wallet.vercel.app](https://clavis-wallet.vercel.app/)
🎥 **Demo video:** [youtu.be/QrbfQxfRWuc](https://youtu.be/QrbfQxfRWuc)

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
  - **Spend Protection** checks a payment against your configured rules (spending limit, daily limit, new recipient, large fraction of balance — all user-editable) the moment you try to send it — on-device, real-time, never blocks on its own
  - **Vault Watch** monitors the vault continuously via a real backend (registration + a scheduled check against live on-chain/ledger state, plus Tachi's own watchtower breach-receipt endpoint), independent of whether the app is open — and can push a real notification to your device the moment something changes, via standard Web Push (opt-in, no third-party SDK or paid service)
- **Real PIN encryption** — AES-GCM + PBKDF2 (210,000 iterations), native Web Crypto, 6-digit PIN, no plaintext key material once a PIN is set

## Current Status

Most of what was originally scoped as "not yet built" is now real and wired to Tachi's live signet daemon — not a mock. See `PROGRESS.md` for the full session-by-session log, including every protocol finding and infra gap discovered along the way, documented as it happened rather than cleaned up after the fact.

**Real and working:**
- Full wallet flow: onboarding (create/import, real BIP39), Deposit (custom amounts), Send, Receive, Exit — all against Tachi's live signet daemon
- Guardian: real, user-editable Spend Protection rules; real Vault Watch backend (see setup below); real opt-in push notifications for Vault Watch's alerts
- Real activity feed, real PIN encryption, real live payment detection (WebSocket push from Tachi's signet daemon)
- The app correctly detects and explains a vault whose on-chain and ledger balances have diverged (after a real Send, or — see below — a currently-known registration issue) rather than either hiding it or building an unsafe exit

**Not yet built (our own scope decisions, not a Tachi-side gap):**
- HAT/RIP on-chain balance verification — stretch goal, not started
- A duration picker for the exit timelock — deliberately not built; see `PROGRESS.md` for the safety reasoning

## Known Gaps — On Tachi's Side

These aren't bugs in Clavis. They're real, confirmed limitations in the TAURUS protocol/SDK as it stands today, found through direct testing against the live daemon and confirmed with Tachi's team directly (Telegram). Documenting them here instead of quietly working around them, because that's the same honesty standard the rest of this app holds itself to.

### 1. A deposited vault's balance doesn't register as spendable (active, fix in progress)

After a real on-chain deposit and successful ledger registration, a vault's balance should show as locked/spendable via Tachi's `tachi_vtxoLocked` endpoint. It doesn't — confirmed by testing the full chain directly against a real, 190+ confirmation deposit:

- The deposit's `TxDeposit` mint succeeds (confirmed via `waitForVtxoCommit`).
- `TxVaultOpen` (`registerVault` in the SDK) — a second, separate registration step this project found was never documented in Tachi's own public quickstart guide — also succeeds, confirmed via `tachi_listVaults` showing the vault as genuinely `"open"`.
- `tachi_vtxoLocked` still reports the vault as empty, indefinitely, for both a synthetic test vault and a real funded one.

Reported to Tachi directly with the full reproduction trail. Their response: this is a known issue, a fix is close to merging on their end, and in the meantime they asked that this submission use placeholder data for the affected display/Send paths rather than wait on the merge.

**What this means for the demo and live app right now:** a vault's spendable balance display and the Send flow's final ledger confirmation use an explicit, narrowly-scoped, clearly-labeled stand-in (`TACHI_LEDGER_LOCK_BUG_WORKAROUND` in `src/lib/taurusSdk.js`) while this is pending. Everything else — the real on-chain deposit, PIN encryption, Guardian's rule evaluation, Vault Watch, the exit timelock, the activity log — is untouched and fully real. The workaround is designed to turn itself off automatically the moment a vault's real ledger balance actually matches its on-chain total, and is meant to be deleted entirely once Tachi's fix ships.

### 2. No way to reconcile a vault's on-chain state after a partial spend (confirmed out of scope)

A real Send moves value off-chain through Tachi's ledger without touching the vault's on-chain UTXO. That's expected and by design — but it means the on-chain amount and the real spendable (ledger) amount now genuinely differ, and there's currently no protocol-level way to reconcile them. `TACHI_TX_TYPE_VAULT_STATE_ADVANCE` (the transaction type that looks like it should do this) is accepted by the daemon, but only records a bare, owner-signed, monotonically increasing state number — no balance or lifecycle semantics attached — and the SDK has no builder for it at all.

Confirmed directly with Tachi: "treat reconciling on-chain state after a partial spend as out of scope" for now.

**What this means:** once you send from a vault, a full unilateral exit of that vault becomes unavailable — not because anything is wrong or funds are at risk, but because building one would mean overclaiming on-chain what you no longer fully hold at the ledger level. Clavis detects this correctly and explains it on-screen rather than either hiding it or letting you build an unsafe exit transaction. There's currently no path to clear this short of Tachi adding the reconciliation capability.

### 3. A couple of resolved issues, kept here for the record

- **`/tachi_ws` WebSocket handshake on signet** — was rejecting all connections due to a reverse-proxy config gap (regtest was unaffected). Flagged to Tachi, fixed same-day on their end, independently re-verified.
- **`getWatchtowerReceipts`'s documented `vault` parameter** — the SDK's own JSDoc says it accepts a vault address; the live daemon only accepts a 64-hex VaultID. Confirmed as a doc bug, not a daemon bug; Tachi said they'd correct the comment. Clavis was already built around the real (not documented) behavior.

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
      Home/ Transfer/ Deposit/ Exit/ Onboarding/ Activity/
      Guardian/
        RecommendationScreen.jsx   → unified Spend Protection + Vault Watch status, push toggle
        SetupScreen.jsx            → Spend Protection rule toggles + editable thresholds
        ActivityLog.jsx
    lib/
      taurusSdk.js       → real Tachi/Bitcoin SDK calls (vault, deposit, send, exit, watch) — see Known Gaps above for TACHI_LEDGER_LOCK_BUG_WORKAROUND
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
