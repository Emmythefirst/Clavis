// Persists real on-device activity across reloads: deposits, sends, and
// Guardian's log of past reviews. Same localStorage pattern as
// lib/wallet.js's mnemonic persistence: without this, every reload would
// forget every past payment — Home's activity feed would go back to showing
// nothing (or, before this file existed, mock data), and Guardian's
// "new recipient" / "daily limit" rules would never be able to see anything
// before the current page load.
//
// amountSats is a BigInt everywhere in the app but JSON.stringify can't
// serialize BigInt — stored as a decimal string, revived with BigInt() on
// load. Kept in this one file rather than scattered try/catches at each call
// site. (Formerly lib/guardianHistory.js — renamed once it started also
// holding deposit history, which Guardian's rules don't use but Home's
// activity feed does.)

const SEND_HISTORY_KEY = "clavis.sendHistory";
const DEPOSIT_HISTORY_KEY = "clavis.depositHistory";
const LOG_KEY = "clavis.guardianLog";
const RULES_KEY = "clavis.guardianRules";
const LOG_MAX_ENTRIES = 100;

export function loadSendHistory() {
  try {
    const raw = localStorage.getItem(SEND_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((h) => ({ ...h, amountSats: BigInt(h.amountSats) }));
  } catch {
    return [];
  }
}

export function appendSendHistory(entry) {
  try {
    const existing = loadSendHistory();
    const next = [...existing, entry];
    localStorage.setItem(
      SEND_HISTORY_KEY,
      JSON.stringify(next.map((h) => ({ ...h, amountSats: h.amountSats.toString() })))
    );
    return next;
  } catch {
    return loadSendHistory();
  }
}

export function loadDepositHistory() {
  try {
    const raw = localStorage.getItem(DEPOSIT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((d) => ({ ...d, amountSats: BigInt(d.amountSats) }));
  } catch {
    return [];
  }
}

export function appendDepositHistory(entry) {
  try {
    const existing = loadDepositHistory();
    const next = [...existing, entry];
    localStorage.setItem(
      DEPOSIT_HISTORY_KEY,
      JSON.stringify(next.map((d) => ({ ...d, amountSats: d.amountSats.toString() })))
    );
    return next;
  } catch {
    return loadDepositHistory();
  }
}

export function loadGuardianLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Newest first, capped so localStorage doesn't grow unbounded over a long
// demo session.
export function prependGuardianLog(entry) {
  try {
    const next = [entry, ...loadGuardianLog()].slice(0, LOG_MAX_ENTRIES);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [entry, ...loadGuardianLog()];
  }
}

// Only the enabled/disabled toggles are user config worth persisting — the
// rule definitions themselves (title/desc/thresholds) live in code, so a
// stored blob from an older rule set can't leave stale copy on screen.
export function loadGuardianRuleToggles() {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveGuardianRuleToggles(rules) {
  try {
    const toggles = Object.fromEntries(rules.map((r) => [r.id, r.enabled]));
    localStorage.setItem(RULES_KEY, JSON.stringify(toggles));
  } catch {
    // non-fatal — toggles just won't survive a reload
  }
}
