// Adapter over the TAURUS vault SDK. Vault creation and deposit below are
// REAL — live calls against Tachi's hosted signet daemon via
// @tachibtc/taurus-vault-core. Vault/Guardian *display* state (balances,
// activity, timelock countdown shown on Home/Exit) is still mocked pending
// broader real-state wiring — see PROGRESS.md for what's real vs mocked.

import {
  createVault,
  verifyVaultP2tr,
  depositToVault as sdkDepositToVault,
  VaultDepositError,
  buildTachiTxDeposit,
  signTachiTx,
  broadcastTachiTx,
  vtxoIdFromDeposit,
  waitForVtxoCommit,
  getAccountNonce,
  toXOnly,
  getLockedVtxos,
} from "@tachibtc/taurus-vault-core";
import { btcToSats } from "@tachibtc/taurus-wallet-aggregator";
import { getFundingWallet, getUserSigner, getRpcProxyUrl, getWalletNetworkConfig, WALLET_CHAIN } from "./wallet";

const SIGNET_FEE_RATE_SAT_VB = 1;

// Local, free, deterministic — derives + verifies the vault's P2TR address.
// Does not touch funds and does not require the wallet to hold a balance.
export async function createRealVault(mnemonicWords) {
  const { wallet } = getFundingWallet(mnemonicWords);
  const network = getWalletNetworkConfig();
  const vault = await createVault({
    network: WALLET_CHAIN,
    userWallet: wallet,
    validators: { endpoint: `${network.rpc.jsonRpc}/tachi_validators` },
  });
  verifyVaultP2tr(vault.p2tr);
  return vault;
}

export async function getFundingWalletBalance(mnemonicWords) {
  const { wallet } = getFundingWallet(mnemonicWords);
  await wallet.sync();
  return { address: wallet.receiveAddress, balanceSats: wallet.balance.total };
}

// Registers an on-chain vault deposit on Tachi's own ledger, minting the
// spendable vtxoId a future transfer will reference.
//
// This is a genuinely separate step from the on-chain deposit below, not
// redundant bookkeeping — confirmed against Tachi's own "Two deposits, one
// word" doc (vtxo-quickstart.md): depositToVault only performs the
// Bitcoin-layer funding transaction; without this ledger registration, a
// transfer fails with "vtxo not found" even though the vault genuinely holds
// the BTC on-chain. Deliberately independent of depositRealBtc's txid/vout —
// buildTachiTxDeposit takes no Bitcoin-layer reference at all (psbtPayload is
// empty for deposits per the SDK types); it's a ledger-level mint keyed only
// on the user's pubkey, amount, and nonce.
export async function registerDepositOnLedger(mnemonicWords, amountSats) {
  const userSigner = getUserSigner(mnemonicWords);
  const userXOnly = toXOnly(userSigner.publicKey);
  const network = getWalletNetworkConfig();
  const baseUrl = network.rpc.jsonRpc;

  try {
    const nonce = await getAccountNonce(userXOnly, { baseUrl });
    // The SDK's own type doc says feeSats defaults to 0n, but the live
    // daemon rejects that with "fee below minimum" (code=8) — confirmed by
    // testing directly against rpc-signet.tachibtc.com. 2n matches Tachi's
    // own vtxo-quickstart.md example and is accepted.
    const draft = buildTachiTxDeposit({ userXOnly, amountSats, nonce, feeSats: 2n });
    const signed = await signTachiTx(draft, userSigner);
    // Routed through our proxy (see api/rpc-proxy.js), not baseUrl directly —
    // /tachi_txBroadcastSync is a POST route with the same CORS gap as the
    // raw Bitcoin RPC proxy (PROGRESS.md 2026-08-15). GET routes below
    // (waitForVtxoCommit, and getAccountNonce above) don't have this problem.
    await broadcastTachiTx(signed, getRpcProxyUrl("/tachi_txBroadcastSync"));
    const vtxoId = vtxoIdFromDeposit(signed, 0);
    await waitForVtxoCommit(vtxoId, { baseUrl, overallTimeoutMs: 60000, pollIntervalMs: 1500 });
    return { ok: true, vtxoId: vtxoId.toString("hex") };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

// Attempts a real on-chain deposit from the funding wallet into the vault,
// then registers it on Tachi's ledger (see registerDepositOnLedger above).
// Returns a typed result instead of throwing so the UI can show an honest
// "fund this wallet first" state rather than a raw SDK error — the funding
// wallet needs a real signet balance (faucet) before this can succeed.
//
// The on-chain deposit and the ledger registration are reported separately:
// `ok: true` means the L1 deposit genuinely landed (money moved) even if
// `registrationError` is set, since those are two different failure domains
// and conflating them would misreport a real deposit as failed.
export async function depositRealBtc(mnemonicWords, vault, amountBtc) {
  const { wallet, rpc } = getFundingWallet(mnemonicWords);
  await wallet.sync();
  const amountSats = btcToSats(amountBtc);

  try {
    const result = await sdkDepositToVault({
      vault,
      userWallet: wallet,
      rpc,
      amountSats,
      feeRateSatVb: SIGNET_FEE_RATE_SAT_VB,
    });
    const registration = await registerDepositOnLedger(mnemonicWords, amountSats);
    return {
      ok: true,
      ...result,
      vtxoId: registration.ok ? registration.vtxoId : null,
      registrationError: registration.ok ? null : registration.message,
    };
  } catch (err) {
    if (err instanceof VaultDepositError && /insufficient/i.test(err.message)) {
      return {
        ok: false,
        reason: "insufficient_funds",
        fundingAddress: wallet.receiveAddress,
        availableSats: wallet.balance.total,
        requiredSats: amountSats,
      };
    }
    return { ok: false, reason: "error", message: err.message };
  }
}

// Real vault balance: sums the unspent VTXOs Tachi's ledger has locked to
// this vault. Deliberately reported as the SAME number for both "locked" and
// "spendable" (see AppStateContext's vaultBalanceSats) — in the current
// single-vault model there is no separate non-spendable pool; the entire
// registered balance both backs the eventual unilateral exit AND is
// instantly transferable via the cooperative leaf, simultaneously. That
// distinction would only diverge with real partial-spend history, which
// doesn't exist yet (Send isn't wired to the real SDK).
export async function getVaultBalance(vault) {
  const network = getWalletNetworkConfig();
  const baseUrl = network.rpc.jsonRpc;
  const result = await getLockedVtxos(vault.p2tr.address, { baseUrl });
  const unspent = result.vtxos.filter((v) => !v.spent);
  const totalSats = unspent.reduce((sum, v) => sum + v.amountSats, 0n);
  return { totalSats, vtxos: unspent };
}

// The activity feed is still mocked — needs a real transaction history
// source, not built yet (see PROGRESS.md). Exit's own countdown
// (AppStateContext's exitSecondsLeft) is a separate, already-independent
// demo timer, not sourced from here.
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

export function getRecentActivity() {
  return Promise.resolve(MOCK_ACTIVITY);
}

export function sendPayment(recipient, amountBtc) {
  return Promise.resolve({ ok: true, recipient, amountBtc });
}

export function exitToMainnet() {
  return Promise.resolve({ ok: true, txRef: "7d3a...e91f" });
}
