const STATUS_META = {
  healthy: { label: "Vault healthy", dot: "#0F6A5C", bg: "#EAF2EF", text: "#0F6A5C", iconBg: "#EAF2EF" },
  attention: { label: "Needs attention", dot: "#B8842E", bg: "#FBF1E1", text: "#8A6420", iconBg: "#FBF1E1" },
  action: { label: "Action recommended", dot: "#B1503B", bg: "#FBE9E4", text: "#95392A", iconBg: "#FBE9E4" },
};

const TIMELOCK_HEADLINE = {
  healthy: "Unlocks in 6d 14h",
  attention: "Entering risk window in 3 days",
  action: "Action recommended on your vault",
};

export function getStatusMeta(vaultStatus) {
  return STATUS_META[vaultStatus] || STATUS_META.attention;
}

export function getTimelockHeadline(vaultStatus) {
  return TIMELOCK_HEADLINE[vaultStatus] || TIMELOCK_HEADLINE.attention;
}

export function getGuardianMeta(guardianResolved) {
  return guardianResolved
    ? {
        bg: "#EAF2EF",
        iconBg: "#D9EBE5",
        iconColor: "#0F6A5C",
        title: "Guardian: all clear",
        subtitle: "Early exit confirmed · vault is healthy",
      }
    : {
        bg: "#FBF1E1",
        iconBg: "#F3E2C0",
        iconColor: "#B8842E",
        title: "Guardian flagged something",
        subtitle: "Liquidity dipping ahead of risk window",
      };
}

export function formatBtcFromSats(sats) {
  if (sats == null) return "0.00000000";
  return (Number(sats) / 1e8).toFixed(8);
}

export function formatCountdown(totalSeconds) {
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const ss = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}
