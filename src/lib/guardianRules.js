export const DEFAULT_GUARDIAN_RULES = [
  {
    id: "auto-exit",
    title: "Exit if timelock < 24h and liquidity is low",
    desc: "Recommend an early exit when your risk window is close and VTXO liquidity has dropped.",
    enabled: true,
  },
  {
    id: "operator",
    title: "Notify me on operator issues",
    desc: "Flag detected problems with the operator so you can react early.",
    enabled: true,
  },
  {
    id: "manual",
    title: "Manual approval for all actions",
    desc: "Require your one-tap confirmation before Guardian surfaces any recommendation.",
    enabled: true,
  },
];

export const DEFAULT_GUARDIAN_LOG = [
  {
    id: "log-1",
    title: "Liquidity dipping ahead of risk window",
    reason: "VTXO liquidity dropped 24h before timelock risk window",
    date: "Today, 9:14 AM",
    status: "pending",
  },
  {
    id: "log-2",
    title: "Timelock entered 24h risk window",
    reason: "Manual approval rule triggered a routine check-in",
    date: "3 days ago",
    status: "dismissed",
  },
  {
    id: "log-3",
    title: "Operator response latency increased",
    reason: "Operator issue rule flagged slower-than-usual responses",
    date: "11 days ago",
    status: "confirmed",
  },
];
