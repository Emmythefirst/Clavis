# Clavis — Progress Log

Running session-to-session log: what's built, what changed, what's broken, what's next.
Read this before `MASTER_BRIEFING.md` (or whatever the latest pasted briefing is called) —
this file is the fast-context version; the briefing is the full design rationale.

Update this file at the end of any session that changes app behavior, fixes a bug, or
makes a decision worth remembering. Newest entries at the top of the Session Log.

---

## Status Snapshot (as of 2026-08-15)

**Deadline: today (Aug 15, 2026).**

**Real / working:**
- Core wallet UI: Home, Deposit (3-step), Transfer (Send/Receive VTXO), Exit (countdown → confirm → complete)
- Guardian: Recommendation, Setup (3 rule templates), Activity Log — mocked rule evaluation, real one-tap-confirm UX
- Onboarding: Landing page → Welcome → Create (generate → reveal → verify → optional PIN → success) → Import (word entry → validate → optional PIN)
- **Real client-side key generation** via `@tachibtc/taurus-wallet-aggregator` (signet, p2wpkh) — replaced the old mainnet `@scure/*` stack
- **Real vault creation** — `createVault` + `verifyVaultP2tr` against Tachi's live signet validator quorum, real `tb1p...` P2TR address
- **Real deposit attempt** — `depositToVault` wired into the Deposit flow with an honest "needs funding" state when the wallet balance is 0 (which it is, until someone runs a signet faucet — see below), instead of faking success
- **Real ledger registration** — after a successful on-chain deposit, `registerDepositOnLedger` (`buildTachiTxDeposit` → `signTachiTx` → `broadcastTachiTx` → `waitForVtxoCommit`) mints the deposit's spendable `vtxoId` on Tachi's ledger. This is a genuinely separate step from the on-chain deposit (confirmed via Tachi's own docs — see 2026-08-15 "Two deposits" entry below) and was missing entirely until this session; without it, a future transfer would fail with `vtxo not found` even though the vault held real BTC on-chain. Verified live end-to-end against the signet daemon (fake never-funded account, but the full call chain — nonce → build → sign → broadcast → commit → read-back — all confirmed real). Deposit's success screen shows the registered `vtxoId`, or an honest retry-able error if registration failed while the on-chain deposit still succeeded.
- Receive BTC screen (`/app/receive`) — separate from VTXO Receive tab, shows the real signet funding address (`tb1q...`)
- **VTXO Receive tab in Transfer now shows the real vault P2TR address** (`tb1p...`), not the old fictional `vtxo1qxy2k...` string — correctly distinct from the funding address above, since these really are two different addresses (funding wallet vs. vault)
- Home status pill / Guardian banner now share one source of truth (`guardianResolved` in `AppStateContext`)
- `/api/rpc-proxy` — a Vercel serverless function that works around a CORS gap on Tachi's hosted RPC (see 2026-08-15 entry)
- `AppStateContext.ensureRealVault()` — shared "create the vault once, reuse everywhere" helper; both Deposit and Transfer's Receive tab call it instead of duplicating vault-creation logic
- **Wallet mnemonic now persists to `localStorage`** (`lib/wallet.js`'s `loadStoredMnemonic`/`saveMnemonic`) — a page reload reuses the same wallet instead of silently generating a new random one and orphaning any address already funded from a faucet. Plaintext localStorage, deliberately: this is a signet demo wallet holding worthless test coins, not a claim about production key storage (same scoping principle as the PIN lock).

**Mocked / not yet real:**
- `lib/taurusSdk.js`'s `MOCK_VAULT`/`MOCK_ACTIVITY` — Home's balances, timelock countdown, and activity feed are still the original mock data, not wired to the real vault yet
- Send (VTXO transfer pipeline) and Exit (unilateral exit) — not wired to the real SDK yet. The transfer pipeline's client-side steps are now understood precisely (see 2026-08-15 "Two deposits" entry) but not yet implemented — needs a real registered `vtxoId` to test against, which needs a funded wallet first.
- Guardian backend (no `/api` polling, no persistent storage) — stretch goal, foreground-only by design
- HAT/RIP verification — stretch goal, not started
- Encrypted PIN lock — onboarding-only route guard today, does not encrypt stored key material (deliberate scope, documented, not a bug)

**Not yet done, blocking a full live demo:** the funding wallet needs an actual signet balance. Generate a wallet in the app, grab its address from `/app/receive`, and send it test coins from a public signet faucet — manual, needs a human. Once funded, "I've sent funds — try again" on the Deposit insufficient-funds screen will complete a real on-chain deposit. **The wallet now survives reloads** (see persistence note above), so a funded address stays usable across sessions on the same browser.

---

## Session Log

### 2026-08-15 (continued 2) — Found the missing docs; fixed the deposit gap they revealed

**Found real Tachi documentation.** `@tachibtc/taurus-vault-core`'s README references `docs/INTEGRATION.md` and an `examples/` folder, but the `tachibtc/taurus-vault-core` GitHub repo is private (confirmed via `gh api repos/tachibtc/taurus-vault-core` → 404, even though the npm package itself is public). However, `gh api orgs/tachibtc/repos` shows a separate **public** repo, `tachibtc/tachi-sdk-ts`, which ships a full Docusaurus docs site at `website/docs/` — this is very likely what's actually served at `docs.tachibtc.com`. Pulled two pages directly via `gh api repos/tachibtc/tachi-sdk-ts/contents/...`:
- `website/docs/vtxo-quickstart.md` — "Your First VTXO in 30 Minutes," a full copy-paste walkthrough of the entire vault lifecycle
- `website/docs/vault/vtxo.md` — the deeper VTXO transaction flow reference

**Confirmed: deposits really are two separate steps.** The quickstart has an explicit callout, quoted in full because it's exactly the ambiguity from the previous session:

> **Two "deposits", one word:** There are two distinct steps that both get called a deposit: 1. **On-chain funding** — `depositToVault` sends BTC to the vault's P2TR address on Bitcoin. 2. **Ledger registration** — a **DEPOSIT `TachiTx`** registers that vault UTXO as a spendable `vtxoId` on the Tachi ledger. You need both. A transfer references the `vtxoId` from step 2, so skipping it makes the transfer fail with `vtxo not found`.

`depositRealBtc` only ever did step 1. Implemented step 2 as `registerDepositOnLedger(mnemonicWords, amountSats)` in `lib/taurusSdk.js`: `getAccountNonce` → `buildTachiTxDeposit` → `signTachiTx` → `broadcastTachiTx` → `vtxoIdFromDeposit` → `waitForVtxoCommit`. Notably, `buildTachiTxDeposit`'s args take no Bitcoin-layer reference at all (no txid/vout, empty `psbtPayload`) — it's a pure ledger-level mint keyed only on `userXOnly` + `amountSats` + `nonce`, entirely independent of the on-chain deposit's txid. `depositRealBtc` now calls this automatically after a successful on-chain deposit and reports the two outcomes separately (`ok: true` + `vtxoId` on full success; `ok: true` + `registrationError` if the on-chain part landed but registration didn't, since those are different failure domains and conflating them would misreport a real deposit as failed). Deposit's success screen shows the registered `vtxoId`, or a "retry registration" action if it failed.

Needed a new signer type for this — VTXO/TachiTx operations need Schnorr (BIP-340) signatures, but the existing funding wallet only signs ECDSA. Added `getUserSigner(words)` to `lib/wallet.js`, built via `Keystore.fromMnemonic(mnemonic, "", getNetwork("signet"), "p2wpkh", 0).signerFor(false, 0)` (same mnemonic/network/addressType/account as the funding wallet, so it signs for the exact key `vault.userKey` commits to) — both newly discovered exports from `@tachibtc/taurus-wallet-aggregator` that weren't referenced anywhere in the old README-only research.

**One real correction found only by testing live, not by reading docs:** `buildTachiTxDeposit`'s TypeScript doc comment says `feeSats` "defaults to `0n`" — the live signet daemon rejects that with `VtxoBroadcastError: tachi mempool rejected VTXO (code=8): fee below minimum`. The quickstart's own copy-paste example actually uses `feeSats: 2n` (silently overriding its documented default), which the daemon accepts. Used `2n`. This is exactly the kind of gap that only shows up by running the real call against the real daemon — worth remembering as a pattern for the transfer pipeline too, since its docs likely have similar undocumented daemon-side minimums.

**Verified with a throwaway Node script** (`scratch-test-register.mjs`, deleted after) against the live signet daemon, full chain: real nonce fetch (`0n` for a fresh never-used key) → build + sign a DEPOSIT TachiTx → broadcast (`accepted: true`, real Tendermint tx hash) → `waitForVtxoCommit` resolved → `getVtxo` read back the exact `{id, owner, amountSats, height, spent: false}` record. This was a fake account with no real on-chain deposit behind it, and the daemon accepted the ledger mint anyway — meaning the daemon does not appear to synchronously cross-check the ledger deposit against actual on-chain vault activity at broadcast time. Not our problem to fix, just worth knowing: the ledger-registration step is really a separate trust domain from the Bitcoin-layer deposit, exactly as the "two deposits" doc implies.

Also verified the Deposit UI still behaves correctly end-to-end in-browser after this change (real vault creation → real deposit attempt → correctly reaches the "needs signet BTC first" screen, zero console errors) — the registration step only runs after a successful on-chain deposit, so the current zero-balance wallet's error path is unaffected.

**Next up:** same as before minus the ambiguity — the VTXO transfer pipeline (item 7 below) can now be built with confidence once a funded, registered VTXO actually exists to spend from a real deposit.

---

### 2026-08-15 — Tachi SDK investigation (real integration begins)

**Installed:** `@tachibtc/tachi-sdk-ts@0.2.1`, `@tachibtc/taurus-vault-core@0.3.3`, `@tachibtc/taurus-wallet-aggregator@0.4.4` — all public on the standard npm registry (the briefing's `.npmrc` GitHub Packages instructions turned out to be stale/unnecessary; these are plain `npm install`, no auth). Ran `npm audit fix` — cleaned up everything except a no-fix-available transitive vuln in `sats-connect` (Xverse SDK, pulled in by `taurus-wallet-aggregator` for a wallet-connect path we don't use). Accepted, not blocking.

**Confirmed live and reachable** (curl'd directly, not just docs):
- `https://rpc-regtest.tachibtc.com` and `https://rpc-signet.tachibtc.com` both respond to `/health` and `/tachi_validators` (7 validators on regtest).
- Raw Bitcoin RPC proxy (`POST /`) works for read-only methods (`getblockchaininfo` etc).

**Blocker found — regtest has no funding path for us.** `generatetoaddress` (and presumably other mining/wallet RPCs) returns `"method not permitted: not in the common read-only set and no API key authorizes it"`. Tachi's regtest is their own private chain (already at block ~8025) — nobody outside Tachi can mine it, and there's no faucet documented anywhere in the SDK READMEs, `docs.tachibtc.com`, or the tutorial page. Without an API key or a faucet, we cannot get test BTC into a wallet on regtest.

**Workaround / pivot: use signet, not regtest, for anything that needs a real funded wallet.** Confirmed `rpc-signet.tachibtc.com`'s `getblockchaininfo` reports the **standard default signet `signet_challenge`** — i.e. this is the real public global signet chain, not a private one. That means any public signet faucet works to fund a `taurus-wallet-aggregator` p2wpkh address here, no Tachi-side permission needed. `taurus-wallet-aggregator` already defaults to signet and ships an Esplora indexer for it (`btc-signet.xverse.app`, confirmed reachable), so signet is also the *faster* network (~0.4s balance queries vs ~14s `scantxoutset` on regtest).

**Decision:** build against **signet** as the primary demo network. Keep regtest wired in code (the aggregator/vault-core both support it, cheaply) as a fallback/dev option, but don't depend on it for anything that needs real coins. **Open item:** ask Tachi (Discord/hackathon channel) whether they issue an API key or faucet for regtest — if yes, may be worth switching back since regtest matches the briefing's original assumption. Not blocking today either way.

**Key architectural finding — our existing `lib/wallet.js` needs to be replaced, not extended.** It currently derives a BIP84 **mainnet** address via `@scure/bip39` + `@scure/bip32` + `@scure/btc-signer`. Two problems:
1. Wrong network — Tachi only operates on regtest/signet (no mainnet), so a `bc1q...` address is unusable for actually funding a vault.
2. Wrong wallet shape — `createVault({ userWallet })` and `depositToVault({ userWallet })` both expect a `Wallet` instance from `@tachibtc/taurus-wallet-aggregator`'s `WalletAggregator`, not a raw derived key. The vault-core package is built to consume the aggregator's wallet object directly.

So the onboarding seed-generation flow needs to switch from our own `@scure` calls to `WalletAggregator.createNew({ network: "signet", rpc })` (their own audited bip32/bip39 under the hood — still not hand-rolled crypto, just a different audited library than `@scure`, and the one the vault SDK actually expects). UX (seed display, tap-to-reveal, verify-random-words, import) stays identical — only the generation/validation call underneath changes.

**Confirmed API shapes** (from `.d.ts`, not just READMEs — READMEs can drift):
- `WalletAggregator.createNew({ network, rpc }, strength?)` → `{ aggregator, mnemonic }`
- `aggregator.addAccount({ addressType: "p2wpkh" })` → `Wallet` (only supported address type as of 0.4.x — matches what we need)
- `createVault({ network, userWallet, validators: { endpoint }, csvBlocks? })` → `Vault` (`Vault.p2tr.address` is the real vault address, `bcrt1p...`/`tb1p...`)
- `depositToVault({ vault, userWallet, rpc, amountSats, feeRateSatVb })` → `DepositResult` — funds the vault from the user's own p2wpkh UTXOs, so **the funding wallet needs a signet balance before this call works** (faucet step, manual, see above)
- Validators endpoint for the hosted daemon: `https://rpc-{network}.tachibtc.com/tachi_validators` (the README's `127.0.0.1:26670` example is for a locally-run daemon, not the hosted one)

**Done this session** (items 1, 2, 4 from the original plan below — 3 needs a human, 5–8 are next):
1. ✅ Rewrote `lib/wallet.js` around `WalletAggregator` (signet, p2wpkh) — `generateMnemonicWords`/`isValidMnemonic`/`deriveFirstAddress`/`buildVerifyChallenges` all kept the same signatures, so `OnboardingContext.jsx` needed zero changes. Added `getFundingWallet(words)` (returns live `{ aggregator, wallet, rpc }`) and `getWalletNetworkConfig()`.
2. ✅ `lib/taurusSdk.js` gained `createRealVault`, `getFundingWalletBalance`, `depositRealBtc` — all real, alongside the still-mocked `getVaultStatus`/`getRecentActivity`.
4. ✅ `Deposit.jsx` rewritten: step 1 creates a real vault (async, shows a busy state), "Confirm deposit" attempts a real deposit; insufficient funds shows the real funding address + retry instead of faking success.
5. ✅ VTXO Receive tab in Transfer now shows the real vault P2TR address instead of the old fictional `vtxo1...` string, via a new shared `ensureRealVault()` helper on `AppStateContext` (also used by Deposit, so vault creation logic lives in one place, not two).

**Two browser-only bugs found and fixed** (neither showed up in Node CLI testing — see the sub-entry below for the full story):
- `Buffer is not defined` — `taurus-vault-core` needs Node's `Buffer` global. Fixed with a `buffer` polyfill imported first in `main.jsx`, plus `define: { global: 'globalThis' }` in `vite.config.js`.
- `Failed to execute 'fetch' on 'Window': Illegal invocation` — `BitcoinCoreRpcClient` calls its stored fetch reference as `this.#fetchImpl(...)`, which browsers reject. Fixed by passing an explicit `fetchImpl: (...args) => fetch(...args)` wrapper.
- Also found (not exactly a bug, a real infra gap): **Tachi's hosted POST `/` Bitcoin-RPC-proxy endpoint doesn't send CORS headers on its preflight**, so browsers block it cross-origin (GET routes like `/tachi_validators` are fine). Fixed with `api/rpc-proxy.js`, a thin watch-only relay Vercel will serve in production, plus a matching `vite.config.js` dev-server proxy so it also works locally. See PROGRESS.md entry below for the full trace.

**Verified end-to-end in a real headless-Chromium session** (not just Node): real 12-word mnemonic → real signet address → real vault creation against Tachi's live validator quorum → real deposit attempt → honest "this wallet needs signet BTC first" screen with the real funding address, zero console errors. Screenshots confirm a real `tb1p...` vault address and a real `tb1q...` funding address, both distinct and both correct.

**Next up:**
6. Get a signet faucet address funded for live demo/testing (manual step — needs a human to visit a faucet site, then click "I've sent funds — try again" on the Deposit screen)
7. VTXO transfer pipeline (`buildVtxoPsbt` → ... → `broadcastTachiTx`) into Send
8. Unilateral exit (`buildUnilateralExitPsbt` → ... ) into Exit
9. WSS live payment detection (`tachi-sdk-ts`'s `client.watch()`) into Receive
10. Wire Home's balances/timelock/activity to the real vault instead of `MOCK_VAULT`/`MOCK_ACTIVITY`

---

### 2026-08-15 (continued) — Making it actually work in a browser

Everything in the "confirmed API shapes" section above was validated with a **Node CLI script first** (`node --eval` against `src/lib/wallet.js` and `taurus-vault-core` directly) before touching any React code — real mnemonic, real signet address, real `wallet.sync()` balance (0, as expected), real `createVault` against the live validator quorum (7 keys), real `verifyVaultP2tr` (no throw), real `depositToVault` call that correctly threw `VaultDepositError: Insufficient funds`. That gave high confidence the SDK integration logic itself was right before debugging anything React/browser-specific.

Wiring the same calls into the actual app (via Playwright + manually-extracted Chromium, same setup as earlier sessions — the sandbox's `/tmp` gets wiped between long gaps, so this had to be redone: `apt-get download libnspr4 libnss3 libasound2t64` + `dpkg-deb -x`, `LD_LIBRARY_PATH` pointed at the extracted `.so`s) surfaced two real browser-only bugs and one real infra gap, none of which the Node test could have caught:

1. **`Buffer is not defined`** — crashed immediately on page load, because `AppStateContext.jsx` statically imports `lib/taurusSdk.js`, which imports `@tachibtc/taurus-vault-core`, which (via `bitcoinjs-lib`) references Node's `Buffer` global at module scope. Fixed with `src/polyfills.js` (imports the `buffer` npm package, sets `globalThis.Buffer`) imported as the very first line of `main.jsx` — has to be first, since ES module imports evaluate their whole dependency graph before the importing file's own code runs, so anything after the first import statement is too late.
2. **`Failed to execute 'fetch' on 'Window': Illegal invocation`** — surfaced only once a real network call happened (the deposit attempt). Traced into `taurus-wallet-aggregator`'s compiled bundle (`chunk-V3QPXLNG.js`): `BitcoinCoreRpcClient` does `this.#fetchImpl = config.fetchImpl ?? globalThis.fetch ?? unsupportedFetch` then later calls `this.#fetchImpl(...)` — calling a bare native `fetch` reference through an object property changes its receiver, and browsers' `fetch` implementation throws on that. Their own `RpcConfig.fetchImpl` option exists for exactly this; passing `fetchImpl: (...args) => fetch(...args)` (a plain wrapper, not the native function itself) fixes it because the *wrapper* doesn't care what `this` it's called with.
3. **CORS gap on Tachi's POST `/` endpoint** — after fixing #2, deposit attempts failed with a CORS preflight error. Confirmed via curl that GET routes (`/health`, `/tachi_validators`) send `Access-Control-Allow-Origin: *`, but an OPTIONS preflight against POST `/` (needed for the JSON-RPC calls `depositToVault` makes internally — coin selection, `scantxoutset`, broadcast) comes back with no CORS headers at all, so the browser blocks the real POST before it's even sent. This is on Tachi's side, not fixable from our code. Standard workaround: proxy it through our own backend, since CORS is a browser-only restriction and server-to-server calls aren't subject to it. Added `api/rpc-proxy.js` (Vercel serverless function — pure relay, no keys, no signing, matches the same watch-only boundary as the planned Guardian backend) and a matching `vite.config.js` `server.proxy` entry so the same relative URL (`/api/rpc-proxy?network=signet`) works in both local dev (Vite proxies it) and production (Vercel serves the function). **Open item:** flag this CORS gap to Tachi (Discord/hackathon channel) — would be good for them to fix upstream so the proxy becomes unnecessary, though it's harmless to keep either way.

After all three fixes: full real flow verified in-browser, zero console errors, screenshots confirm real addresses at every step. The deposit itself resolved in ~32 seconds (an internal `scantxoutset`-shaped balance/UTXO check inside `depositToVault`, not the fast Esplora path `wallet.sync()` uses) before correctly reporting insufficient funds — worth knowing so a live demo doesn't look frozen during that wait; consider a slightly more descriptive busy-state message than what's there now if this comes up again.

**VTXO Receive tab fixed** to show the real vault P2TR address instead of the old fictional `vtxo1...` string, via a new shared `ensureRealVault()` on `AppStateContext` (also used by Deposit — one place creates the vault, not two). Verified in-browser: the vault address (`tb1p...`) and funding address (`tb1q...`) are correctly distinct.

**Wallet persistence gap found live** — while testing with a real signet faucet, sent funds to a generated address, then asked whether Home would reflect it. Good question that surfaced two things: (1) Home is still mock, confirmed as a known gap, not a surprise; (2) more importantly, the wallet mnemonic had **no persistence at all** — it was regenerated fresh via `useState(() => generateMnemonicWords())` on every page load, so a browser reload after getting a receive address would silently swap in a brand-new wallet and orphan the just-funded address (funds still safe on-chain, just unreachable through the UI without the original mnemonic). Fixed with `localStorage` persistence (`lib/wallet.js`'s `loadStoredMnemonic`/`saveMnemonic`, wired into `AppStateContext`'s `walletMnemonic` state) — verified with a real reload test in-browser, same address before and after. Plaintext storage is an accepted tradeoff here (signet test coins only), not a pattern to copy for anything holding real value.

---

### 2026-07-24 — Home status contradiction fixed

Top-right status pill and Guardian banner could show contradictory states (pill said "Needs attention" while banner said "Guardian: all clear" after resolving). Root cause: two independent state variables (`vault.status` from the mock SDK, `guardianResolved` from `AppStateContext`) that could drift apart. Fix: removed `status` from the mocked vault object entirely; `AppStateContext` now derives `vaultStatus` directly from `guardianResolved` (`guardianResolved ? "healthy" : "attention"`) and both the pill and the timelock headline read that single derived value. Verified in-browser: pill, timelock card, and banner now flip together on Guardian confirm.

### 2026-07-24 — Onboarding, real key gen, landing page, Receive BTC screen

Large build in one session:
- Landing page (`/`) — responsive marketing page in front of the app, Lightning-wallets contrast section, "Get Started" CTA
- Full onboarding flow under `/onboarding/*`: Welcome (create/import choice) → Create (generating → seed reveal with tap-to-reveal + serious-tone warnings, no clipboard copy on seed by design → verify random words → optional PIN lock → success) → Import (12 word-input boxes, paste support, real bip39 checksum validation, non-silent error state)
- `lib/wallet.js` — real mnemonic generation/validation/address derivation via `@scure/bip39` + `@scure/bip32` + `@scure/btc-signer` (mainnet BIP84 at the time — **now known to be wrong network, see 2026-08-15 entry**)
- Routing restructured: wallet screens moved from `/` to `/app/*` so `/` could become the landing page
- Receive BTC screen at `/app/receive` — real derived address (was mainnet, will move to signet/regtest), separate from VTXO Receive tab, explicitly labeled to avoid confusing the two
- Home quick actions changed from 3-tile row to 2×2 grid: Receive, Deposit / Send, Exit
- Copy tightened on Home + Exit: "no counterparty" language now scoped specifically to the post-timelock unilateral exit, not implying every operation is counterparty-free (the cooperative fast path co-signs with the TAURUS operator)

Verified via a real headless-Chromium pass (Playwright, manually installed since no `chromium-cli` was available in this environment — had to hand-extract `libnspr4`/`libnss3`/`libasound2` `.deb`s via `apt-get download` + `dpkg-deb -x` since `sudo apt-get install` wasn't available without a password). All flows screenshotted and confirmed pixel-matching the design, zero console errors.

### 2026-07-23 — Initial build

Full wallet UI implemented from the Claude Design import (`TAURUS Wallet.dc.html`): Home, Deposit, Transfer, Exit, Guardian (Recommendation/Setup/ActivityLog). Tailwind v4, react-router-dom, inline-style port matching the design pixel-for-pixel. Mock data throughout via `lib/taurusSdk.js`. Verified in-browser (same Playwright/manual-chromium setup as above).

---

## Known Issues / Open Questions

- **Regtest funding is blocked** for us specifically (no faucet, no API key) — see 2026-08-15 entry. Building against signet instead.
- **Whether `WalletAggregator.addAccount` supports `p2wpkh`** — resolved, yes, it's the *only* supported type as of 0.4.x. The SDK quick-start's `p2pkh` mention in the briefing was stale/wrong.
- **Exact WSS message format for payment detection** — not yet investigated in detail; `tachi-sdk-ts`'s `client.watch()` is documented in its README (filters: address/vault/vaultId/blocks/validators, requires Node ≥22 or a passed-in `WebSocket` for older runtimes — dev machine here is Node 20, browser doesn't care).
- **Hackathon submission format** (video length, form, judging rubric) — not yet confirmed, not blocking build work.

## Decisions Worth Remembering

- Guardian recommends, never auto-acts — firm, do not build autonomous execution.
- Backend (when built) is watch-only — never holds keys, never signs/broadcasts.
- Seed generation is 100% client-side, never touches a backend, never logged, no clipboard copy button (deliberate — clipboard is a leak vector).
- PIN lock is onboarding-only config today (no real encryption, no relaunch gate) — documented as scoped, not a bug. Build it properly (Web Crypto encryption) or leave as-is; no cosmetic middle version.
- Timelock is protocol-fixed at 1008 blocks — never build a duration picker.
- No Google/social auth as a signing mechanism, ever — app-lock convenience only, never key custody.
