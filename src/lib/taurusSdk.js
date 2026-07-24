// Adapter over the TAURUS vault SDK. Every export here is mock data today and
// will be swapped for real Tachi RPC calls once the SDK docs are published —
// callers should never depend on values beyond this module's return shapes.

const MOCK_VAULT = {
  lockedBtc: 0.0842,
  lockedSats: 8420000,
  spendableBtc: 0.0113,
  spendableSats: 1130000,
  timelockSecondsRemaining: 47,
  receiveAddress: "vtxo1qxy2k...9f4a7c",
};

const MOCK_ACTIVITY = [
  {
    id: "act-1",
    type: "received",
    label: "Received",
    detail: "2 hours ago · instant",
    amountBtc: 0.0012,
  },
  {
    id: "act-2",
    type: "vault-opened",
    label: "Vault opened",
    detail: "12 days ago",
    amountBtc: 0.0842,
  },
];

export function getVaultStatus() {
  return Promise.resolve(MOCK_VAULT);
}

export function getRecentActivity() {
  return Promise.resolve(MOCK_ACTIVITY);
}

export function depositToVault(amountBtc) {
  return Promise.resolve({ ok: true, amountBtc, txRef: "mock-deposit" });
}

export function sendPayment(recipient, amountBtc) {
  return Promise.resolve({ ok: true, recipient, amountBtc });
}

export function exitToMainnet() {
  return Promise.resolve({ ok: true, txRef: "7d3a...e91f" });
}
