// Real Guardian rule evaluation — replaces the old static mock scenario
// ("Liquidity dipping ahead of risk window") with rules that actually inspect
// a real pending Send: amount, recipient, today's spending so far, and vault
// balance. No AI, no elaborate policy engine — a handful of deterministic
// checks, same as the reasoning that shaped every other real integration in
// this app: fewer things that are genuinely real beats many that only look it.
//
// The old rule set (auto-exit on liquidity dip, operator-issue notification)
// is gone, not just disabled — it depended on vault-liquidity/operator-health
// monitoring that was never built and remains a stretch goal (see
// PROGRESS.md). These rules are the ones actually implementable today with
// real data: a real amount, a real vault balance, and real send history.

export const SINGLE_LIMIT_SATS = 50_000n;
export const DAILY_LIMIT_SATS = 150_000n;
export const LARGE_FRACTION = 0.5;

export const DEFAULT_GUARDIAN_RULES = [
  {
    id: "single-limit",
    title: "Spending limit",
    desc: `Flag any single payment over ${SINGLE_LIMIT_SATS.toLocaleString()} sats.`,
    enabled: true,
  },
  {
    id: "daily-limit",
    title: "Daily limit",
    desc: `Flag payments that would push today's total over ${DAILY_LIMIT_SATS.toLocaleString()} sats.`,
    enabled: true,
  },
  {
    id: "new-recipient",
    title: "New recipient",
    desc: "Flag the first payment to an address you haven't paid before from this device.",
    enabled: true,
  },
  {
    id: "large-fraction",
    title: "Large fraction of balance",
    desc: `Flag payments spending more than ${Math.round(LARGE_FRACTION * 100)}% of your vault balance.`,
    enabled: true,
  },
];

function startOfTodayMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Runs every check regardless of whether its rule is enabled (so a disabled
// rule's true/false state stays knowable), then reports only the enabled
// ones — an enabled-but-passing check is what tells the user "Guardian looked
// at this and it was fine," not just silence.
export function evaluateGuardianRules({ rules, amountSats, recipient, vaultBalanceSats, sendHistory }) {
  const enabledIds = new Set(rules.filter((r) => r.enabled).map((r) => r.id));
  const todayStart = startOfTodayMs();
  const spentToday = sendHistory
    .filter((h) => h.timestamp >= todayStart)
    .reduce((sum, h) => sum + h.amountSats, 0n);
  const projectedDaily = spentToday + amountSats;
  const isKnownRecipient = sendHistory.some((h) => h.recipient === recipient);
  const balance = vaultBalanceSats ?? 0n;
  const fraction = balance > 0n ? Number(amountSats) / Number(balance) : 1;

  // `label` is the neutral rule statement shown in the review checklist next
  // to a pass/fail icon (works either way, since the icon carries the
  // pass/fail meaning there). `reason` is a plain-language, failure-specific
  // sentence used in the Guardian log's prose summary, which has no icon to
  // lean on — reusing `label` there read backwards for a failed check (e.g.
  // "Recipient has been paid before" as the stated reason for flagging a
  // brand-new recipient).
  const allChecks = [
    {
      id: "single-limit",
      label: `Within single-payment limit (${SINGLE_LIMIT_SATS.toLocaleString()} sats)`,
      passed: amountSats <= SINGLE_LIMIT_SATS,
      detail: `${amountSats.toLocaleString()} sats`,
      reason: `Payment of ${amountSats.toLocaleString()} sats exceeds your ${SINGLE_LIMIT_SATS.toLocaleString()} sat single-payment limit`,
    },
    {
      id: "daily-limit",
      label: `Within today's daily limit (${DAILY_LIMIT_SATS.toLocaleString()} sats)`,
      passed: projectedDaily <= DAILY_LIMIT_SATS,
      detail: `${projectedDaily.toLocaleString()} / ${DAILY_LIMIT_SATS.toLocaleString()} sats today if sent`,
      reason: `This payment would bring today's total to ${projectedDaily.toLocaleString()} sats, over your ${DAILY_LIMIT_SATS.toLocaleString()} sat daily limit`,
    },
    {
      id: "new-recipient",
      label: "Recipient has been paid before",
      passed: isKnownRecipient,
      detail: isKnownRecipient ? "Previously used" : "First payment to this address",
      reason: "This is the first payment to this address from this device",
    },
    {
      id: "large-fraction",
      label: `Under ${Math.round(LARGE_FRACTION * 100)}% of vault balance`,
      passed: fraction <= LARGE_FRACTION,
      detail: `${Math.round(fraction * 100)}% of balance`,
      reason: `This payment is ${Math.round(fraction * 100)}% of your vault balance, over your ${Math.round(LARGE_FRACTION * 100)}% limit`,
    },
  ];

  const checks = allChecks.filter((c) => enabledIds.has(c.id));
  const triggered = checks.filter((c) => !c.passed);
  return { checks, triggered, needsReview: triggered.length > 0 };
}
