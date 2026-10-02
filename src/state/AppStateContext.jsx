/* eslint-disable react-refresh/only-export-components -- context Provider + its hook are intentionally colocated */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createRealVault, getVaultBalance, sendVtxoTransfer, getVaultExitStatus, exitUnilaterally, watchVaultAddress } from "../lib/taurusSdk";
import { isPushSupported, getExistingPushSubscription, enablePushNotifications, disablePushNotifications } from "../lib/pushNotifications";
import { DEFAULT_GUARDIAN_RULES, evaluateGuardianRules } from "../lib/guardianRules";
import {
  loadSendHistory,
  appendSendHistory,
  loadDepositHistory,
  appendDepositHistory,
  loadGuardianLog,
  prependGuardianLog,
  loadGuardianRuleToggles,
  saveGuardianRuleToggles,
} from "../lib/activityHistory";
import { formatBtcFromSats, formatRelativeTime } from "../lib/vaultDisplay";
import {
  generateMnemonicWords,
  deriveFirstAddress,
  loadStoredMnemonic,
  saveMnemonic,
  hasEncryptedVault,
  loadEncryptedVault,
} from "../lib/wallet";
import { decryptMnemonic } from "../lib/walletCrypto";
import { btcToSats } from "@tachibtc/taurus-wallet-aggregator";

const AppStateContext = createContext(null);

// Turns sendVtxoTransfer's typed failure result into plain-language copy —
// same "honest error, not a raw SDK exception" principle as Deposit.
function describeSendError(result) {
  switch (result.reason) {
    case "invalid_recipient":
      return "That doesn't look like a valid vault address. VTXO transfers go to another vault's P2TR address (starts with tb1p on signet).";
    case "insufficient_funds":
      return `Not enough spendable balance. Available: ${result.availableSats} sats, needed: ${result.requiredSats} sats (including fee).`;
    case "rejected":
      return `The Tachi ledger rejected this transfer: ${result.message}`;
    default:
      return result.message || "Something went wrong sending this payment.";
  }
}

export function AppStateProvider({ children }) {
  // Real record of past deposits (amountSats, txid, timestamp) — feeds Home's
  // activity feed alongside sendHistory below. Persisted the same way; starts
  // empty on a fresh device (or for a vault that was funded before this
  // tracking existed) rather than showing invented history.
  const [depositHistory, setDepositHistory] = useState(() => loadDepositHistory());

  // Rule definitions live in code (lib/guardianRules.js); only which ones are
  // on/off is persisted, so a stale localStorage entry from an older rule set
  // can never leave mismatched copy on screen (see loadGuardianRuleToggles).
  const [guardianRules, setGuardianRules] = useState(() => {
    const toggles = loadGuardianRuleToggles();
    return DEFAULT_GUARDIAN_RULES.map((r) => (r.id in toggles ? { ...r, enabled: toggles[r.id] } : r));
  });
  // Real log of past Guardian reviews — starts empty on a fresh device (see
  // ActivityLog's empty state) rather than showing invented history.
  const [guardianLog, setGuardianLog] = useState(() => loadGuardianLog());
  // Real record of past sends (recipient, amountSats, timestamp) — what
  // evaluateGuardianRules checks a new payment against for the daily-limit
  // and new-recipient rules. Persisted so those rules see real history across
  // reloads, not just the current tab's session.
  const [sendHistory, setSendHistory] = useState(() => loadSendHistory());
  // Set while a pending Send has triggered one or more enabled rules and is
  // waiting on the user's explicit "Send anyway" / "Cancel" — null otherwise,
  // including for the common case where nothing was triggered and the send
  // just goes straight through. See doSend below.
  const [guardianReview, setGuardianReview] = useState(null);

  const [depositStep, setDepositStep] = useState(0);
  const [depositAmount, setDepositAmount] = useState("0.05");

  const [sendMode, setSendMode] = useState("send");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendTxHash, setSendTxHash] = useState(null);

  // Real exit readiness — null until the first refreshExitStatus() completes
  // (see the [realVault] effect below). Replaces the old 47-second demo
  // timer: exit readiness now comes from getVaultExitStatus's real on-chain
  // UTXO confirmations vs. the vault's real exitLeaf.csvBlocks (1008).
  const [exitStatus, setExitStatus] = useState(null);
  const [exitStatusLoading, setExitStatusLoading] = useState(true);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [exitDestination, setExitDestination] = useState("");
  const [exitBusy, setExitBusy] = useState(false);
  const [exitError, setExitError] = useState(null);
  const [exitResults, setExitResults] = useState(null);

  // Vault Watch — the always-on half of Guardian (see PROGRESS.md). Real
  // backend (api/guardian/*.js): registers this vault's PUBLIC info (address,
  // scriptPubKey, csvBlocks — never a mnemonic) and polls what it's found on
  // its own schedule, independent of whether this tab is open. null until the
  // first registerVaultWatch() completes; stays null (not an error) if the
  // backend isn't deployed/configured yet, which is a real, expected state
  // for local dev without Upstash set up — see the component's honest
  // "not connected" display for that case.
  const [vaultWatchStatus, setVaultWatchStatus] = useState(null);
  const [vaultWatchError, setVaultWatchError] = useState(null);

  const [tooltipKey, setTooltipKey] = useState(null);

  // If this device has a PIN-encrypted vault (see lib/walletCrypto.js), the
  // mnemonic does NOT get loaded here — it stays null (locked) until
  // unlockWithPin succeeds. AppShell renders UnlockScreen instead of the
  // /app routes whenever vaultLocked is true, so nothing downstream ever
  // sees a null mnemonic while trying to act on it.
  //
  // Fallback so the Receive BTC screen (and real vault calls) always have a
  // wallet even when /app is reached directly, skipping onboarding — but
  // only when there's no encrypted vault to unlock first. Onboarding
  // overwrites this with its own mnemonic via setWalletMnemonic (skip-PIN
  // path) or unlockWithMnemonic (PIN path) once it completes. The mnemonic
  // is what lets taurusSdk.js reconstruct the real signing wallet on demand
  // for createVault/depositToVault — see lib/wallet.js.
  //
  // Persisted to localStorage (see lib/wallet.js) so a page reload reuses the
  // same wallet instead of generating a new one and orphaning any address the
  // user already funded from a faucet.
  const [vaultLocked, setVaultLocked] = useState(() => hasEncryptedVault());
  const [unlockError, setUnlockError] = useState(null);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [walletMnemonic, setWalletMnemonicState] = useState(() => {
    if (hasEncryptedVault()) return null;
    const stored = loadStoredMnemonic();
    if (stored) return stored;
    const fresh = generateMnemonicWords();
    saveMnemonic(fresh);
    return fresh;
  });
  const [walletAddress, setWalletAddress] = useState(() => (walletMnemonic ? deriveFirstAddress(walletMnemonic) : ""));

  function setWalletMnemonic(words) {
    setWalletMnemonicState(words);
    saveMnemonic(words);
    // Assigning a plaintext mnemonic always means "usable right now" — most
    // importantly after a recovery-phrase re-import that skips PIN setup,
    // where vaultLocked would otherwise stay stuck true from the OLD
    // encrypted vault this call's saveMnemonic just cleared out from under it.
    setVaultLocked(false);
  }

  // Brings a mnemonic into the live session WITHOUT touching storage — used
  // right after PIN setup (the encrypted blob was already persisted by
  // OnboardingContext.submitLockPin) and after a successful unlockWithPin
  // decrypt. Persisting a second, plaintext copy here would defeat the PIN
  // entirely.
  function unlockWithMnemonic(words) {
    setWalletMnemonicState(words);
    setWalletAddress(deriveFirstAddress(words));
    setVaultLocked(false);
  }

  async function unlockWithPin(pin) {
    setUnlockError(null);
    setUnlockBusy(true);
    try {
      const blob = loadEncryptedVault();
      if (!blob) throw new Error("No encrypted wallet found on this device.");
      const words = await decryptMnemonic(pin, blob);
      unlockWithMnemonic(words);
      return true;
    } catch (err) {
      setUnlockError(err.message);
      return false;
    } finally {
      setUnlockBusy(false);
    }
  }

  // The real Vault object from @tachibtc/taurus-vault-core (p2tr address,
  // node keys, etc.) — created once per session and reused so the vault
  // address stays stable across Deposit/Send/Exit rather than re-deriving
  // (and re-fetching validators for) a new one on every screen.
  const [realVault, setRealVault] = useState(null);

  // Guards refreshAllVaultState against running twice concurrently for the
  // same vault — both refreshExitStatus and registerVaultWatch call Bitcoin
  // Core's scantxoutset, which allows only one scan at a time node-wide (a
  // real finding — see refreshAllVaultState below). Two overlapping callers
  // (React StrictMode's dev-only double effect invocation is the obvious
  // one, but a live WebSocket event landing while a Send's own post-success
  // refresh is still in flight is a real production scenario too) would
  // otherwise race each other for that single slot and one would fail with
  // "Scan already in progress" for no reason a user could do anything about.
  const vaultStateRefreshInFlight = useRef(false);

  // null = not loaded yet (vaultLoading covers the distinction from "loaded
  // and genuinely empty," which is a real 0n). See getVaultBalance in
  // taurusSdk.js for why locked/spendable share this one number.
  const [vaultBalanceSats, setVaultBalanceSats] = useState(null);
  const [vaultLoading, setVaultLoading] = useState(true);
  // True only when the balance has NEVER been successfully read yet and the
  // most recent attempt failed — distinct from a genuinely empty vault.
  // Without this, a cold-start network failure leaves vaultBalanceSats at
  // its initial `null` forever, which Home's hasBalance check can't tell
  // apart from a real zero balance, so it silently shows "nothing in your
  // vault yet" for what's actually a failed fetch. A failure AFTER a real
  // balance was already read doesn't set this — the last known real balance
  // stays on screen instead (see refreshVaultBalance's catch block).
  const [vaultBalanceError, setVaultBalanceError] = useState(false);

  // Real activity feed — merges real deposit and send history (no more mock
  // data, see PROGRESS.md). Derived on every render rather than kept as its
  // own state: it's a cheap map+sort over two arrays that are already state,
  // and deriving it avoids a second, easy-to-forget place to keep in sync
  // whenever depositHistory/sendHistory change.
  const activity = [...depositHistory.map((d) => ({ ...d, kind: "deposit" })), ...sendHistory.map((s) => ({ ...s, kind: "sent" }))]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20)
    .map((e) =>
      e.kind === "deposit"
        ? {
            id: `deposit-${e.timestamp}`,
            type: "deposit",
            label: "Deposit",
            detail: formatRelativeTime(e.timestamp),
            amountBtc: formatBtcFromSats(e.amountSats),
            timestamp: e.timestamp,
          }
        : {
            id: `send-${e.timestamp}`,
            type: "sent",
            label: "Sent",
            detail: formatRelativeTime(e.timestamp),
            amountBtc: formatBtcFromSats(e.amountSats),
            timestamp: e.timestamp,
            recipient: e.recipient,
          }
    );

  // Records a real completed deposit — called by Deposit.jsx right after
  // depositRealBtc succeeds. Recording only ever happens on a genuine on-chain
  // result, same "don't log what didn't happen" rule as Guardian's send log.
  function recordDeposit(amountSats, txid) {
    setDepositHistory(appendDepositHistory({ amountSats, txid, timestamp: Date.now() }));
  }

  // Eagerly derive the real vault on app load (not just lazily from Deposit)
  // so Home/Exit can show real balance for a returning user who already
  // deposited in a previous session. Cheap and free — just a validator-quorum
  // fetch + deterministic address derivation, no funds required.
  //
  // Skipped entirely while vaultLocked — there's no mnemonic to derive
  // anything from yet, and AppShell renders UnlockScreen instead of any
  // route that would need this anyway. Re-runs once unlockWithPin/
  // unlockWithMnemonic flips vaultLocked to false.
  useEffect(() => {
    if (vaultLocked) return;
    ensureRealVault().catch(() => setVaultLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureRealVault closes over walletMnemonic, which is stable by the time vaultLocked flips false
  }, [vaultLocked]);

  useEffect(() => {
    if (!realVault) return;
    refreshAllVaultState(realVault);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshAllVaultState is stable enough for this mount-on-vault-ready trigger
  }, [realVault]);

  // Live payment detection (see watchVaultAddress's doc comment in
  // taurusSdk.js) — refreshes real state the moment a committed transaction
  // touches this vault, instead of only on manual navigation. Confirmed
  // working against Tachi's hosted SIGNET daemon as of 2026-09-30 (Tachi
  // fixed a reverse-proxy config that was dropping the WebSocket upgrade —
  // see PROGRESS.md). onError is kept as a simple log rather than a retry
  // loop regardless: a dropped connection here degrades to exactly the
  // app's pre-existing manual-refresh behavior, since every screen that
  // shows balance/exit status already refreshes on its own mount.
  useEffect(() => {
    if (!realVault) return;
    const controller = new AbortController();
    watchVaultAddress(realVault, {
      signal: controller.signal,
      onCommittedTx: () => {
        refreshAllVaultState(realVault);
      },
      onError: (err) => {
        console.info("Live payment detection unavailable:", err.message);
      },
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshVaultBalance/refreshExitStatus are stable enough for this vault-ready subscription
  }, [realVault]);

  // Whether the most recent real Guardian review found anything — the honest
  // replacement for the old guardianResolved boolean. No entries yet, or the
  // last send cleared every enabled check: "all clear." The last send
  // triggered at least one enabled rule (whether the user sent anyway or
  // canceled): flagged. This can flip on every real Send, unlike the old
  // scripted scenario that only ever resolved once.
  const guardianAllClear = guardianLog.length === 0 || guardianLog[0].status === "clean";

  function toggleGuardianRule(id) {
    setGuardianRules((rules) => {
      const next = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
      saveGuardianRuleToggles(next);
      return next;
    });
  }

  // Records a completed Guardian review (whatever its outcome) to the
  // persisted log and local state together, so ActivityLog and the Home
  // banner never disagree about what's already happened.
  function logGuardianReview({ checks, triggered, amountSats, recipient, status, timestamp = Date.now() }) {
    const entry = {
      id: `log-${timestamp}`,
      title:
        status === "clean"
          ? "Payment sent"
          : status === "confirmed"
            ? "Payment sent after review"
            : "Payment canceled after review",
      reason:
        triggered.length > 0
          ? triggered.map((c) => c.reason).join("; ")
          : `All ${checks.length} enabled check${checks.length === 1 ? "" : "s"} passed.`,
      date: new Date(timestamp).toLocaleString(),
      // Raw timestamp, same one appendSendHistory writes for the matching
      // send — lets the Activity screen correlate the two exactly rather
      // than fuzzy-matching by display date. A 'cancelled' entry has no
      // timestamp-matching send at all, since the payment never went out.
      timestamp,
      status, // 'clean' | 'confirmed' | 'cancelled'
      amountSats: amountSats.toString(),
      recipient,
    };
    setGuardianLog(prependGuardianLog(entry));
  }

  function resetSend() {
    setSendSuccess(false);
    setSendError(null);
    setSendTxHash(null);
    setSendRecipient("");
    setSendAmount("");
    setGuardianReview(null);
  }

  // Real VTXO transfer via sendVtxoTransfer (lib/taurusSdk.js) — a genuine
  // cooperative-leaf move on Tachi's ledger, not the old fire-and-forget
  // setSendSuccess(true) mock. Reuses ensureRealVault so Send works even if
  // the user reaches Transfer before Deposit's Receive tab has created the
  // vault object yet.
  async function executeSend({ checks, triggered }, amountSats, recipient, amountBtc) {
    setSendBusy(true);
    try {
      const vault = await ensureRealVault();
      const result = await sendVtxoTransfer(walletMnemonic, vault, recipient, amountBtc);
      if (!result.ok) {
        setSendError(describeSendError(result));
        return;
      }
      // One shared timestamp for both writes — lets the Activity screen match
      // a send to its Guardian outcome exactly, instead of guessing from two
      // independently-timed Date.now() calls a line apart.
      const timestamp = Date.now();
      setSendHistory(appendSendHistory({ recipient, amountSats, timestamp }));
      logGuardianReview({ checks, triggered, amountSats, recipient, status: triggered.length > 0 ? "confirmed" : "clean", timestamp });
      setSendTxHash(result.txHash);
      setSendSuccess(true);
      await refreshAllVaultState(vault);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSendBusy(false);
    }
  }

  // Entry point from the Send button. Evaluates the real, currently-enabled
  // Guardian rules against this specific payment first — most payments won't
  // trigger anything and go straight through with zero extra friction; only
  // a payment that actually trips an enabled rule stops for the user's
  // explicit "Send anyway" / "Cancel" (see confirmReviewedSend/
  // cancelReviewedSend). Guardian never blocks on its own — it only ever asks.
  async function doSend() {
    setSendError(null);
    let amountSats;
    try {
      amountSats = btcToSats(sendAmount);
      if (amountSats <= 0n) throw new Error("Enter an amount greater than zero.");
    } catch {
      setSendError("Enter a valid BTC amount.");
      return;
    }
    const recipient = sendRecipient.trim();
    const evaluation = evaluateGuardianRules({
      rules: guardianRules,
      amountSats,
      recipient,
      vaultBalanceSats: vaultBalanceSats ?? 0n,
      sendHistory,
    });
    if (evaluation.needsReview) {
      setGuardianReview({ ...evaluation, amountSats, recipient, amountBtc: sendAmount });
      return;
    }
    await executeSend(evaluation, amountSats, recipient, sendAmount);
  }

  async function confirmReviewedSend() {
    if (!guardianReview) return;
    const { checks, triggered, amountSats, recipient, amountBtc } = guardianReview;
    setGuardianReview(null);
    await executeSend({ checks, triggered }, amountSats, recipient, amountBtc);
  }

  function cancelReviewedSend() {
    if (!guardianReview) return;
    const { checks, triggered, amountSats, recipient } = guardianReview;
    logGuardianReview({ checks, triggered, amountSats, recipient, status: "cancelled" });
    setGuardianReview(null);
  }

  // Creates the real vault on first use and reuses it after — shared by
  // Deposit (needs it to fund) and Transfer's Receive tab (needs its address
  // to show as the VTXO receive address, since VTXOs aren't a separate
  // address format — see PROGRESS.md 2026-08-15).
  async function ensureRealVault() {
    if (realVault) return realVault;
    const created = await createRealVault(walletMnemonic);
    setRealVault(created);
    return created;
  }

  // Queries the real balance for whatever vault currently exists. Called
  // automatically once the vault is ready (see the [realVault] effect above)
  // and again by Deposit right after a successful deposit, so Home reflects
  // the change without needing a manual refresh.
  async function refreshVaultBalance() {
    if (!realVault) return;
    setVaultLoading(true);
    try {
      const { totalSats } = await getVaultBalance(realVault);
      setVaultBalanceSats(totalSats);
      setVaultBalanceError(false);
    } catch {
      // Transient network hiccup — leave the last known balance in place
      // rather than clearing it to null/0, which would misreport a real
      // balance as empty. But if there's no last known balance yet (a fresh
      // session's very first attempt), there's nothing to preserve — flag it
      // explicitly instead of letting the null stand in for "confirmed empty".
      if (vaultBalanceSats == null) setVaultBalanceError(true);
    } finally {
      setVaultLoading(false);
    }
  }

  // Real on-chain exit readiness — see getVaultExitStatus's doc comment in
  // taurusSdk.js for why this checks the vault's actual Bitcoin-layer UTXOs
  // (scanForUtxos) rather than Tachi's ledger balance, and what `settled`
  // guards against.
  async function refreshExitStatus() {
    if (!realVault) return;
    setExitStatusLoading(true);
    try {
      const status = await getVaultExitStatus(walletMnemonic, realVault);
      setExitStatus(status);
    } catch {
      // Transient network hiccup — keep the last known status rather than
      // clearing it, same principle as refreshVaultBalance.
    } finally {
      setExitStatusLoading(false);
    }
  }

  // Registers this vault with the real Vault Watch backend and pulls back
  // the immediate check it runs on registration — see api/guardian/register.js.
  // Idempotent (re-registering just re-checks), so this is safe to call again
  // after anything that could change on-chain/ledger state for real (a
  // completed Send, a committed WebSocket event), to keep Vault Watch fresher
  // than waiting for the next hourly cron tick.
  //
  // Fails silently into vaultWatchError rather than surfacing a scary error —
  // the backend genuinely may not be deployed/configured (no Upstash env vars
  // set yet is an expected state during local dev), and Vault Watch being
  // unavailable doesn't take anything else in the app down with it.
  async function registerVaultWatch(vault) {
    try {
      const res = await fetch("/api/guardian/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: vault.p2tr.address,
          scriptPubKey: vault.p2tr.output.toString("hex"),
          csvBlocks: vault.p2tr.exitLeaf.csvBlocks,
        }),
      });
      if (!res.ok) throw new Error(`guardian backend responded ${res.status}`);
      const record = await res.json();
      setVaultWatchStatus(record);
      setVaultWatchError(null);
    } catch (err) {
      setVaultWatchError(err.message);
    }
  }

  // Refreshes everything real that can change: balance, exit readiness, and
  // Vault Watch's backend check. Deliberately sequenced, not
  // Promise.all'd — refreshExitStatus and registerVaultWatch both end up
  // calling Bitcoin Core's scantxoutset against the SAME shared hosted
  // signet daemon, and scantxoutset only allows one scan at a time
  // node-wide (confirmed live: running them concurrently produced a real
  // "bitcoin rpc error -8: Scan already in progress" from our own two calls
  // racing each other, not from any other user of the shared daemon).
  // refreshVaultBalance uses a different, non-scanning endpoint
  // (tachi_vtxoLocked) so it's safe to run alongside the others.
  async function refreshAllVaultState(vault) {
    if (vaultStateRefreshInFlight.current) return;
    vaultStateRefreshInFlight.current = true;
    try {
      refreshVaultBalance();
      await refreshExitStatus();
      await registerVaultWatch(vault);
    } finally {
      vaultStateRefreshInFlight.current = false;
    }
  }

  // Push notifications for Vault Watch's real alerts (see api/guardian/_notify.js)
  // — opt-in, same "Guardian recommends, never acts on its own" principle as
  // everything else here: nothing subscribes a device without the user
  // explicitly asking. pushSubscribed reflects the BROWSER's own actual
  // subscription state (re-checked on load), not just in-session UI state,
  // so a toggle left on from a previous visit shows correctly without the
  // user having to re-enable it.
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState(null);
  const pushSupported = isPushSupported();

  useEffect(() => {
    if (!pushSupported) return;
    getExistingPushSubscription()
      .then((sub) => setPushSubscribed(!!sub))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pushSupported is a static browser-capability check, not state; this is a real run-once-on-mount effect
  }, []);

  async function enablePush() {
    if (!realVault) return;
    setPushBusy(true);
    setPushError(null);
    try {
      await enablePushNotifications(realVault.p2tr.address);
      setPushSubscribed(true);
    } catch (err) {
      setPushError(err.message);
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    if (!realVault) return;
    setPushBusy(true);
    try {
      await disablePushNotifications(realVault.p2tr.address);
      setPushSubscribed(false);
    } finally {
      setPushBusy(false);
    }
  }

  async function confirmExit() {
    if (!exitStatus) return;
    setExitError(null);
    setExitBusy(true);
    try {
      const destination = exitDestination.trim();
      const results = await exitUnilaterally(walletMnemonic, realVault, destination, exitStatus.funding);
      setExitResults(results);
      const anyFailed = results.some((r) => !r.ok);
      if (anyFailed && !results.some((r) => r.ok)) {
        // Every attempt failed — surface the first failure's message rather
        // than silently showing an empty "done" screen.
        setExitError(results[0]?.message || "The exit transaction was rejected.");
        setExitResults(null);
        return;
      }
      setExitConfirmOpen(false);
      await refreshAllVaultState(realVault);
    } catch (err) {
      setExitError(err.message);
    } finally {
      setExitBusy(false);
    }
  }

  const value = {
    activity,
    recordDeposit,
    guardianAllClear,
    guardianRules,
    guardianLog,
    toggleGuardianRule,
    guardianReview,
    confirmReviewedSend,
    cancelReviewedSend,

    depositStep,
    setDepositStep,
    depositAmount,
    setDepositAmount,

    sendMode,
    setSendMode,
    sendRecipient,
    setSendRecipient,
    sendAmount,
    setSendAmount,
    sendSuccess,
    sendBusy,
    sendError,
    sendTxHash,
    doSend,
    resetSend,

    exitStatus,
    exitStatusLoading,
    refreshExitStatus,
    exitConfirmOpen,
    setExitConfirmOpen,
    exitDestination,
    setExitDestination,
    exitBusy,
    exitError,
    exitResults,
    confirmExit,

    vaultWatchStatus,
    vaultWatchError,

    pushSupported,
    pushSubscribed,
    pushBusy,
    pushError,
    enablePush,
    disablePush,

    tooltipKey,
    openTooltip: setTooltipKey,
    closeTooltip: () => setTooltipKey(null),

    walletMnemonic,
    setWalletMnemonic,
    unlockWithMnemonic,
    walletAddress,
    setWalletAddress,
    vaultLocked,
    unlockWithPin,
    unlockError,
    unlockBusy,
    realVault,
    setRealVault,
    ensureRealVault,
    vaultBalanceSats,
    vaultLoading,
    vaultBalanceError,
    refreshVaultBalance,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
