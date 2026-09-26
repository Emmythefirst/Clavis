// Real Vault Watch check logic — the same two signals Exit already computes
// client-side in lib/taurusSdk.js's getVaultExitStatus (on-chain UTXO state
// via scanForUtxos, real ledger balance via tachi_vtxoLocked), reimplemented
// here so the backend can run them on a schedule without needing a mnemonic
// at all: registration only ever sends public data (address, scriptPubKey,
// csvBlocks), all derived client-side from a vault the user already built.
//
// Deliberately does NOT check Tachi's watchtower/breach-receipt endpoints
// yet — that needs a vault ID derived from the real on-chain funding
// txid/vout (deriveVaultId), and verifying that derivation matches the
// daemon's own byte-order expectations needs a real funded vault to test
// against, which wasn't available this session. Left out rather than
// shipped unverified — see PROGRESS.md.

import { BitcoinCoreRpcClient, scanForUtxos } from "@tachibtc/taurus-wallet-aggregator";

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

  return {
    checkedAt: Date.now(),
    onChainTotalSats: onChainTotalSats.toString(),
    ledgerBalanceSats: ledgerBalanceSats.toString(),
    settled,
    exitReady,
    blocksRemaining,
    fundingCount: funding.length,
  };
}
