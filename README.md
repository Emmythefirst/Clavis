# Clavis

**A self-custody Bitcoin wallet built on Tachi's TAURUS vaults, with a built-in Exit Guardian that watches your vault so you don't have to.**

Built for the [Tachi OP_Freedom Hackathon](https://www.tachibtc.com/) — Bounty #1: TAURUS-based Non-Custodial Wallet/Custody.

🔗 **Live demo:** [clavis-wallet.vercel.app](https://clavis-wallet.vercel.app/)
 
---

## The Problem

Lightning wallets deliver fast Bitcoin payments, but at a cost: users have to actively manage channels, watch inbound liquidity, and live with the risk of force-closures. Tachi's TAURUS vaults solve the sovereignty problem structurally — BTC locks into a timelocked vault, and once the timelock clears, you can always exit unilaterally back to Bitcoin mainnet, no permission needed from anyone.

But that guarantee only helps if you're actually paying attention. Most people won't be watching timelocks and liquidity conditions in real time.

**Clavis closes that gap.**

## What Clavis Does

- **TAURUS vault management** — deposit BTC, watch it lock on-chain, track your timelock status clearly
- **Fast off-chain payments via VTXOs** — Lightning-like send/receive speed, without channel management
- **A real, working unilateral exit flow** — once your timelock clears, you can exit back to mainnet, no counterparty required
- **Exit Guardian** — a background monitor that watches vault health and liquidity conditions, and surfaces a clear recommendation the moment something needs your attention. It never acts on its own — every action requires your one-tap confirmation, with a plain-language explanation of why it was triggered.

## Why This, Not Just Another Wallet

Every team in this bounty can build vault creation, send/receive, and an exit button — that's the requirements list. Clavis's edge is twofold:

1. **Nothing here is faked.** The exit flow, in particular, is a real, working unilateral withdrawal — not a "success!" screen with no mechanism behind it.
2. **The Guardian is a genuinely harder build than a standard wallet UI.** Most people won't watch their own vault closely enough to catch a real risk before it becomes a problem. Clavis does that watching for you — and shows its reasoning, so it's never a black box making decisions on your behalf.

## Current Status

This is a hackathon-in-progress submission. Here's where things honestly stand:

**Built and working:**
- Full wallet UI: Home dashboard, Deposit flow, Send/Receive, Exit flow
- Exit Guardian: Recommendation screen, Setup screen (rule templates), Activity Log
- Tooltips explaining key Bitcoin/TAURUS concepts for newer users

**Not yet built:**
- Real TAURUS SDK integration — currently running against a mock adapter (`lib/taurusSdk.js`), pending Tachi's RPC/Swagger documentation
- Always-on Guardian backend (persistent monitoring even when the app is closed) — currently foreground-only
- HAT/RIP on-chain balance verification — stretch goal

We've deliberately built the mock layer behind a clean adapter interface specifically so real integration is a swap-in, not a rewrite, once Tachi's endpoints are published.

## Tech Stack

- **Frontend:** Vite + React, Tailwind CSS v4, React Router
- **Backend (planned):** Vercel serverless functions — watch-only, never holds private keys or signs transactions. All signing happens client-side; the backend only observes public vault state.
- **Deployment:** Vercel, auto-deployed from `main`

## Project Structure

```
clavis/
  api/
    guardian/
      check.js         → polls vault state, evaluates rules, returns alerts
      register.js      → stores a user's vault address + chosen Guardian rules
  src/
    components/
      Home/
      Transfer/
      Deposit/
      Exit/
      Guardian/
        RecommendationScreen.jsx
        SetupScreen.jsx
        ActivityLog.jsx
    lib/
      taurusSdk.js      → adapter interface — mock data now, real SDK calls later
      guardianRules.js  → shared rule logic
    hooks/
      useVaultStatus.js
      useGuardianAlerts.js
    App.jsx
```

## Running Locally

```bash
git clone https://github.com/Emmythefirst/clavis.git
cd clavis
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Roadmap

- [ ] Swap `taurusSdk.js` to real Tachi RPC calls (regtest/Signet)
- [ ] Wire receiver-side VTXO payment detection
- [ ] Guardian backend: persistent storage + scheduled polling
- [ ] Stretch: HAT/RIP proof verification for balance display

## Built By

Emmy ([@Emmythefirst](https://github.com/Emmythefirst)) — solo build for the Tachi OP_Freedom hackathon.

---

*Submission deadline: August 15, 2026*