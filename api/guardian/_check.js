// Real Vault Watch check logic — the same two signals Exit already computes
// client-side in lib/taurusSdk.js's getVaultExitStatus (on-chain UTXO state
// via scanForUtxos, real ledger balance via tachi_vtxoLocked), reimplemented
// here so the backend can run them on a schedule without needing a mnemonic
// at all: registration only ever sends public data (address, scriptPubKey,
// csvBlocks), all derived client-side from a vault the user already built.
//
// Also checks Tachi's real watchtower/breach-receipt endpoint (third
// signal). Two things had to be verified live against the hosted signet
// daemon before this could be trusted, since this session already found the
// SDK's own doc comments wrong once before (the `/tachi_ws` breach-event
// case) — trust the daemon's actual behavior, not just its typings:
//   1. `GET /tachi_watchtower/receipts?vault=<id>` — the SDK client's own
//      JSDoc says `vault` is "one vault address", but the live daemon
//      rejects a bech32 address with `invalid vault id` and only accepts a
//      64-hex-char VaultID. Confirmed directly with curl against
//      rpc-signet.tachibtc.com: an address 400s, a well-formed 64-hex value
//      (real or not) returns `{count, receipts: []}`.
//   2. Byte order for deriving that VaultID: `deriveVaultId(fundingTxid,
//      fundingVout)` needs `fundingTxid` in the daemon's internal byte
//      order, and `RegisterVaultArgs`'s own doc in taurus-vault-core spells
//      out the actionable conversion explicitly — "reverse an explorer hex
//      txid first". `scanForUtxos` here returns Bitcoin Core RPC's standard
//      (explorer/display) txid order, so it's reversed below before
//      deriving. This is the SDK's own unambiguous written contract, not a
//      guess — but hasn't been cross-checked against a real vault's daemon-
//      reported vaultId (that needs a `/tachi_listVaults?user=<pubkey>` call,
//      which needs a real owned, funded vault's pubkey on hand). Worth doing
//      the moment one's available; until then this is "correct per spec",
//      not "independently reproduced".
// Endpoint itself is real either way: `/tachi_watchtower/status` against the
// live daemon returns real, live data (`mode`, `last_scanned_height`,
// `receipt_count`), so this is not speculative plumbing against a dead route.

import { BitcoinCoreRpcClient, scanForUtxos } from "@tachibtc/taurus-wallet-aggregator";
import { deriveVaultId } from "@tachibtc/taurus-vault-core";

const RPC_BASE_URL = {
  signet: "https://rpc-signet.tachibtc.com",
  regtest: "https://rpc-regtest.tachibtc.com",
};

async function getLedgerBalanceSats(baseUrl, address) {
  const res = await fetch(`${baseUrl}/tachi_vtxoLocked?vault=${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error(`tachi_vtxoLocked HTTP ${res.status}`);
  const json = await res.json();
  const vtxos = json.vtxos ?? [];
  return vtxos.filter((v) => !v.spent).reduce((sum, v) => sum + BigInt(v.amount), 0n);
}

function reverseHexBytes(hex) {
  return hex.match(/../g).reverse().join("");
}

async function getBreachReceipts(baseUrl, txid, vout) {
  const vaultId = deriveVaultId(Buffer.from(reverseHexBytes(txid), "hex"), vout).toString("hex");
  const res = await fetch(`${baseUrl}/tachi_watchtower/receipts?vault=${vaultId}`);
  if (!res.ok) throw new Error(`tachi_watchtower/receipts HTTP ${res.status}`);
  const json = await res.json();
  return { vaultId, receipts: json.receipts ?? [] };
}

// Mirrors getVaultExitStatus (lib/taurusSdk.js) exactly, minus needing a
// mnemonic — the RPC client here never signs anything, it only reads.
export async function checkVault({ address, csvBlocks, network = "signet" }) {
  const baseUrl = RPC_BASE_URL[network] ?? RPC_BASE_URL.signet;
  const rpc = new BitcoinCoreRpcClient({ url: baseUrl, fetchImpl: (...args) => fetch(...args) });

  const [{ utxos }, ledgerBalanceSats] = await Promise.all([
    scanForUtxos(rpc, [`addr(${address})`]),
    getLedgerBalanceSats(baseUrl, address),
  ]);

  const funding = utxos.map((u) => ({
    txid: u.txid,
    vout: u.vout,
    valueSats: u.valueSats.toString(),
    confirmations: u.confirmations,
    blocksRemaining: Math.max(0, csvBlocks - u.confirmations),
    canExit: u.confirmations >= csvBlocks,
  }));
  const onChainTotalSats = utxos.reduce((sum, u) => sum + u.valueSats, 0n);
  const settled = onChainTotalSats === ledgerBalanceSats;
  const exitReady = funding.length > 0 && funding.every((f) => f.canExit);
  const blocksRemaining = funding.length > 0 ? Math.max(...funding.map((f) => f.blocksRemaining)) : null;

  // One watchtower lookup per funding outpoint, not per vault — a vault
  // with two deposits has two distinct funding outpoints and thus two
  // distinct VaultIDs (see deriveVaultId's own definition:
  // sha256(fundingTxid || vout)). Sequential, and failures here are
  // reported rather than thrown — this is a bonus third signal, and a
  // lookup hiccup shouldn't take down the settled/exitReady checks this
  // route already relied on before it existed.
  let breachCheckOk = true;
  let breachCheckError = null;
  const breaches = [];
  for (const f of funding) {
    try {
      const { vaultId, receipts } = await getBreachReceipts(baseUrl, f.txid, f.vout);
      for (const r of receipts) {
        if (r.classification !== "legitimate") breaches.push({ vaultId, ...r });
      }
    } catch (err) {
      breachCheckOk = false;
      breachCheckError = err.message;
    }
  }

  return {
    checkedAt: Date.now(),
    onChainTotalSats: onChainTotalSats.toString(),
    ledgerBalanceSats: ledgerBalanceSats.toString(),
    settled,
    exitReady,
    blocksRemaining,
    fundingCount: funding.length,
    breachCheckOk,
    breachCheckError,
    breachDetected: breaches.length > 0,
    breaches,
  };
}
