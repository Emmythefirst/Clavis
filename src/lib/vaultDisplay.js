const STATUS_META = {
  healthy: { label: "Vault healthy", dot: "#0F6A5C", bg: "#EAF2EF", text: "#0F6A5C", iconBg: "#EAF2EF" },
  attention: { label: "Timelock counting down", dot: "#B8842E", bg: "#FBF1E1", text: "#8A6420", iconBg: "#FBF1E1" },
  action: { label: "Action recommended", dot: "#B1503B", bg: "#FBE9E4", text: "#95392A", iconBg: "#FBE9E4" },
};

// Home's top-level status pill, now driven by the exact same real signals
// Exit's own 4-state logic already uses (exitStatus.settled/funding/canExit
// from getVaultExitStatus — see Exit.jsx) plus Vault Watch's breach signal,
// rather than a separate, independently-invented notion of "vault health."
// `breachDetected` takes priority since a flagged spend is more urgent than
// a routine timelock still counting down.
export function getVaultStatusBucket(exitStatus, breachDetected) {
  if (breachDetected) return "action";
  if (!exitStatus || exitStatus.funding.length === 0) return "healthy";
  if (!exitStatus.settled) return "action";
  const allReady = exitStatus.funding.every((f) => f.canExit);
  return allReady ? "healthy" : "attention";
}

export function getStatusMeta(bucket) {
  return STATUS_META[bucket] || STATUS_META.attention;
}

export function getTimelockHeadline(exitStatus, breachDetected) {
  if (breachDetected) return "Watchtower flagged a spend — see Guardian";
  if (!exitStatus || exitStatus.funding.length === 0) return "No deposit yet";
  if (!exitStatus.settled) return "Action recommended — see Exit for details";
  const allReady = exitStatus.funding.every((f) => f.canExit);
  if (allReady) return "Ready to exit any time";
  const blocksRemaining = Math.max(...exitStatus.funding.map((f) => f.blocksRemaining));
  return `Unlocks in ${estimateTimeFromBlocks(blocksRemaining)}`;
}

// Guardian is one security layer with two surfaces — Spend Protection
// (evaluates a payment the moment you try to send it, on-device, see
// lib/guardianRules.js) and Vault Watch (monitors the vault continuously,
// backend + real on-chain/ledger checks, see api/guardian/*.js). They're
// presented as one Guardian, not two competing cards, so "which Guardian is
// protecting me" is never a question the UI raises.

// Derives Vault Watch's alert (if any) from the backend's last real check.
// null means "nothing to report" — either genuinely all clear, or Vault
// Watch hasn't connected yet (see the `connected` flag callers should check
// separately; this function only interprets a check that actually happened).
export function getVaultWatchAlert(vaultWatchStatus) {
  const check = vaultWatchStatus?.lastCheck;
  if (!check) return null;
  if (check.breachDetected) {
    const anomalous = check.breaches?.some((b) => b.classification === "anomalous");
    return {
      level: "danger",
      message: anomalous
        ? "Tachi's watchtower flagged an anomalous spend of your vault's funding outpoint — this needs your attention now."
        : "Tachi's watchtower detected a stale/replayed state spend of your vault's funding outpoint.",
    };
  }
  if (!check.settled) {
    return {
      level: "warning",
      message: "Your vault's on-chain and spendable balances have diverged — a unilateral exit isn't safe to build yet. See Exit for details.",
    };
  }
  if (check.exitReady) {
    return {
      level: "info",
      message: "Your exit timelock has matured — you can unilaterally withdraw to mainnet any time.",
    };
  }
  return null;
}

// guardianAllClear reflects the MOST RECENT real Send Guardian reviewed (or
// "no sends yet" if there haven't been any) — see AppStateContext.
// vaultWatchAlert is getVaultWatchAlert's result, or null.
export function getGuardianMeta(guardianAllClear, hasHistory, vaultWatchAlert) {
  if (vaultWatchAlert?.level === "danger") {
    return {
      bg: "#FBE9E4",
      iconBg: "#F3CFC5",
      iconColor: "#95392A",
      title: "Guardian: breach detected",
      subtitle: vaultWatchAlert.message,
    };
  }
  if (vaultWatchAlert?.level === "warning" || (hasHistory && !guardianAllClear)) {
    return {
      bg: "#FBF1E1",
      iconBg: "#F3E2C0",
      iconColor: "#B8842E",
      title: "Guardian: action recommended",
      subtitle: vaultWatchAlert?.level === "warning" ? vaultWatchAlert.message : "See activity for what triggered it",
    };
  }
  if (vaultWatchAlert?.level === "info") {
    return {
      bg: "#EAF2EF",
      iconBg: "#D9EBE5",
      iconColor: "#0F6A5C",
      title: "Guardian: exit available",
      subtitle: vaultWatchAlert.message,
    };
  }
  if (!hasHistory) {
    return {
      bg: "#F1EEE6",
      iconBg: "#E7E1D2",
      iconColor: "#8A8478",
      title: "Guardian is watching",
      subtitle: "No payments reviewed yet",
    };
  }
  return {
    bg: "#EAF2EF",
    iconBg: "#D9EBE5",
    iconColor: "#0F6A5C",
    title: "Guardian: protected",
    subtitle: "Your last payment was within every enabled limit",
  };
}

export function formatBtcFromSats(sats) {
  if (sats == null) return "0.00000000";
  return (Number(sats) / 1e8).toFixed(8);
}

// Rough estimate only, labeled as such wherever it's shown — signet block
// times aren't strictly 10 minutes, but that's the standard assumption
// Tachi's own docs use for this same math (vtxo-quickstart.md: "1008 → ~1
// week at 10-min blocks").
const MINUTES_PER_BLOCK = 10;

export function estimateTimeFromBlocks(blocks) {
  if (blocks <= 0) return "now";
  const totalMinutes = blocks * MINUTES_PER_BLOCK;
  if (totalMinutes < 60) return `~${totalMinutes} min`;
  const hours = totalMinutes / 60;
  if (hours < 48) return `~${Math.round(hours)}h`;
  return `~${Math.round(hours / 24)}d`;
}

// Used for Home's real activity feed (deposits + sends) — plain relative
// time, no library, matches the scale of the app's other date formatting
// (Guardian's log just uses toLocaleString()).
export function formatRelativeTime(timestampMs) {
  const diffSec = Math.floor((Date.now() - timestampMs) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}
