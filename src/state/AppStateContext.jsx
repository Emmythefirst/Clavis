/* eslint-disable react-refresh/only-export-components -- context Provider + its hook are intentionally colocated */
import { createContext, useContext, useEffect, useState } from "react";
import { getVaultStatus, getRecentActivity, createRealVault } from "../lib/taurusSdk";
import { DEFAULT_GUARDIAN_RULES, DEFAULT_GUARDIAN_LOG } from "../lib/guardianRules";
import { generateMnemonicWords, deriveFirstAddress, loadStoredMnemonic, saveMnemonic } from "../lib/wallet";

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [vault, setVault] = useState(null);
  const [activity, setActivity] = useState([]);

  const [guardianResolved, setGuardianResolved] = useState(false);
  const [guardianRules, setGuardianRules] = useState(DEFAULT_GUARDIAN_RULES);
  const [guardianLog, setGuardianLog] = useState(DEFAULT_GUARDIAN_LOG);

  const [depositStep, setDepositStep] = useState(0);
  const [depositAmount, setDepositAmount] = useState("0.05");

  const [sendMode, setSendMode] = useState("send");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  const [exitSecondsLeft, setExitSecondsLeft] = useState(47);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [exitDone, setExitDone] = useState(false);

  const [tooltipKey, setTooltipKey] = useState(null);

  // Fallback so the Receive BTC screen (and real vault calls) always have a
  // wallet even when /app is reached directly, skipping onboarding.
  // Onboarding overwrites both with its own mnemonic via setWalletMnemonic /
  // setWalletAddress once it completes. The mnemonic is what lets
  // taurusSdk.js reconstruct the real signing wallet on demand for
  // createVault/depositToVault — see lib/wallet.js.
  //
  // Persisted to localStorage (see lib/wallet.js) so a page reload reuses the
  // same wallet instead of generating a new one and orphaning any address the
  // user already funded from a faucet.
  const [walletMnemonic, setWalletMnemonicState] = useState(() => {
    const stored = loadStoredMnemonic();
    if (stored) return stored;
    const fresh = generateMnemonicWords();
    saveMnemonic(fresh);
    return fresh;
  });
  const [walletAddress, setWalletAddress] = useState(() => deriveFirstAddress(walletMnemonic));

  function setWalletMnemonic(words) {
    setWalletMnemonicState(words);
    saveMnemonic(words);
  }

  // The real Vault object from @tachibtc/taurus-vault-core (p2tr address,
  // node keys, etc.) — created once per session and reused so the vault
  // address stays stable across Deposit/Send/Exit rather than re-deriving
  // (and re-fetching validators for) a new one on every screen.
  const [realVault, setRealVault] = useState(null);

  useEffect(() => {
    getVaultStatus().then(setVault);
    getRecentActivity().then(setActivity);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setExitSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Guardian's resolved state is the single source of truth for vault health —
  // the status pill, timelock headline, and Guardian banner all derive from it
  // so they can never independently drift into contradicting each other.
  const vaultStatus = guardianResolved ? "healthy" : "attention";

  function confirmGuardian() {
    setGuardianResolved(true);
    setGuardianLog((log) =>
      log.map((entry) => (entry.id === "log-1" ? { ...entry, status: "confirmed" } : entry))
    );
  }

  function toggleGuardianRule(id) {
    setGuardianRules((rules) =>
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }

  function resetSend() {
    setSendSuccess(false);
    setSendRecipient("");
    setSendAmount("");
  }

  function doSend() {
    setSendSuccess(true);
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

  function confirmExit() {
    setExitConfirmOpen(false);
    setExitDone(true);
  }

  const value = {
    vault,
    activity,
    guardianResolved,
    vaultStatus,
    guardianRules,
    guardianLog,
    confirmGuardian,
    toggleGuardianRule,

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
    doSend,
    resetSend,

    exitSecondsLeft,
    exitConfirmOpen,
    setExitConfirmOpen,
    exitDone,
    confirmExit,

    tooltipKey,
    openTooltip: setTooltipKey,
    closeTooltip: () => setTooltipKey(null),

    walletMnemonic,
    setWalletMnemonic,
    walletAddress,
    setWalletAddress,
    realVault,
    setRealVault,
    ensureRealVault,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
