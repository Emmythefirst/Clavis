/* eslint-disable react-refresh/only-export-components -- context Provider + its hook are intentionally colocated */
import { createContext, useContext, useEffect, useState } from "react";
import { getVaultStatus, getRecentActivity } from "../lib/taurusSdk";
import { DEFAULT_GUARDIAN_RULES, DEFAULT_GUARDIAN_LOG } from "../lib/guardianRules";
import { generateMnemonicWords, deriveFirstAddress } from "../lib/wallet";

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
  const [copyLabel, setCopyLabel] = useState("Tap to copy your receiving address");

  const [exitSecondsLeft, setExitSecondsLeft] = useState(47);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [exitDone, setExitDone] = useState(false);

  const [tooltipKey, setTooltipKey] = useState(null);

  // Fallback so the Receive BTC screen always has a real address even when
  // /app is reached directly, skipping onboarding. Onboarding overwrites this
  // with its own derived address via setWalletAddress once it completes.
  const [walletAddress, setWalletAddress] = useState(() => deriveFirstAddress(generateMnemonicWords()));

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

  function copyAddress() {
    if (vault?.receiveAddress) {
      navigator.clipboard?.writeText(vault.receiveAddress).catch(() => {});
    }
    setCopyLabel("Copied to clipboard");
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
    copyLabel,
    copyAddress,

    exitSecondsLeft,
    exitConfirmOpen,
    setExitConfirmOpen,
    exitDone,
    confirmExit,

    tooltipKey,
    openTooltip: setTooltipKey,
    closeTooltip: () => setTooltipKey(null),

    walletAddress,
    setWalletAddress,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
