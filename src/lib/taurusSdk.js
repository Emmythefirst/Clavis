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
  buildTachiTxTransfer,
  buildVtxoPsbt,
  verifyVtxoPsbt,
  signVtxoPsbtAsUser,
  signTachiTx,
  broadcastTachiTx,
  vtxoIdFromDeposit,
  waitForVtxoCommit,
  waitForTachiTxCommit,
  getAccountNonce,
  toXOnly,
  getLockedVtxos,
  xOnlyFromAddress,
  resolveBitcoinNetwork,
  dustThresholdSats,
  buildUnilateralExitPsbt,
  verifyUnilateralExitPsbt,
  signUnilateralExitPsbtAsUser,
  finalizeUnilateralExitPsbt,
} from "@tachibtc/taurus-vault-core";
import { btcToSats, scanForUtxos, broadcastRawTransaction, Keystore } from "@tachibtc/taurus-wallet-aggregator";
import { TachiClient } from "@tachibtc/tachi-sdk-ts";
import { getFundingWallet, getUserSigner, getRpcProxyUrl, getWalletNetworkConfig, WALLET_CHAIN } from "./wallet";
import { Buffer } from "buffer";

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
//
// onStage(stage), if given, fires at each real transition ("syncing" ->
// "depositing" -> "registering") so the UI can show honest progress instead
// of one static label for the whole multi-second call. These are genuine
// before/after markers around the actual awaits below, not a timed fake.
export async function depositRealBtc(mnemonicWords, vault, amountBtc, { onStage } = {}) {
  let wallet, rpc;
  try {
    ({ wallet, rpc } = getFundingWallet(mnemonicWords));
    onStage?.("syncing");
    await wallet.sync();
    const amountSats = btcToSats(amountBtc);

    onStage?.("depositing");
    const result = await sdkDepositToVault({
      vault,
      userWallet: wallet,
      rpc,
      amountSats,
      feeRateSatVb: SIGNET_FEE_RATE_SAT_VB,
    });
    onStage?.("registering");
    const registration = await registerDepositOnLedger(mnemonicWords, amountSats);
    return {
      ok: true,
      ...result,
      vtxoId: registration.ok ? registration.vtxoId : null,
      registrationError: registration.ok ? null : registration.message,
    };
  } catch (err) {
    if (err instanceof VaultDepositError && /insufficient/i.test(err.message)) {
      // wallet is only synced (balance populated) if we got past wallet.sync()
      // above before failing — getFundingWallet itself can't throw this error.
      return {
        ok: false,
        reason: "insufficient_funds",
        fundingAddress: wallet.receiveAddress,
        availableSats: wallet.balance.total,
        requiredSats: btcToSats(amountBtc),
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

const VTXO_TRANSFER_FEE_SATS = 1000n; // matches the fee this integration verified live against the signet daemon — see PROGRESS.md

// Real VTXO transfer: moves value from this vault to another vault's P2TR
// address via the cooperative leaf, entirely on Tachi's own ledger.
//
// The published quickstart (vtxo-quickstart.md) describes an extra step
// between signing and broadcasting: "the KDHT 5/7 quorum contributes their
// signatures out-of-band," then finalizeVtxoPsbt assembles a fully-witnessed
// Bitcoin-layer tx from user + node signatures. That step has no exposed API
// anywhere in this SDK or in tachid's RPC surface (openapi.json's only
// cooperative-sign endpoint, /tachi_signTransaction, is for refunds, not
// transfers) — verified empirically against the live signet daemon (see
// PROGRESS.md) that it is NOT required: buildTachiTxTransfer's own doc
// comment says its `psbt` field accepts the PSBT "in any signing state to
// publish," and a TRANSFER TachiTx carrying only a user-signed (unfinalized)
// PSBT was accepted and committed by the daemon, correctly marking the input
// vtxo `spent: true`. finalizeVtxoPsbt is deliberately NOT called here — it
// reliably fails with "0 valid node signatures" since we have no channel to
// collect them, and skipping it doesn't affect ledger settlement. The
// finalized Bitcoin-layer witness only seems to matter for producing an
// independently-broadcastable L1 tx, not for moving the VTXO on Tachi's ledger.
//
// Also confirmed empirically: the daemon does not use VtxoInput.txid/vout for
// anything when the input carries a vtxoId — our probe passed an all-zero
// txid and the transfer still committed correctly. This matters because none
// of the VTXO query endpoints (getLockedVtxos, getAddressVtxos, getVtxo)
// return a real txid/vout anyway, so there would be no way to supply the
// "real" one for a VTXO discovered after the fact (e.g. after a reload).
export async function sendVtxoTransfer(mnemonicWords, vault, recipientAddress, amountBtc) {
  const network = getWalletNetworkConfig();
  const baseUrl = network.rpc.jsonRpc;
  const amountSats = btcToSats(amountBtc);

  try {
    xOnlyFromAddress(recipientAddress, resolveBitcoinNetwork(WALLET_CHAIN));
  } catch (err) {
    return { ok: false, reason: "invalid_recipient", message: err.message };
  }

  const { vtxos: unspent } = await getVaultBalance(vault);
  const requiredSats = amountSats + VTXO_TRANSFER_FEE_SATS;
  const selected = [];
  let totalSelectedSats = 0n;
  for (const v of unspent) {
    if (totalSelectedSats >= requiredSats) break;
    selected.push(v);
    totalSelectedSats += v.amountSats;
  }
  if (totalSelectedSats < requiredSats) {
    return {
      ok: false,
      reason: "insufficient_funds",
      availableSats: totalSelectedSats,
      requiredSats,
    };
  }

  const scriptPubKey = vault.p2tr.output.toString("hex");
  const inputs = selected.map((v) => ({
    // No real L1 txid/vout to supply — see the function doc comment above.
    txid: "00".repeat(32),
    vout: 0,
    valueSats: v.amountSats,
    scriptPubKey,
    vtxoId: Buffer.from(v.id, "hex"),
  }));

  const changeSats = totalSelectedSats - requiredSats;
  const dust = dustThresholdSats(vault.p2tr.output);
  const outputs = [{ address: recipientAddress, valueSats: amountSats }];
  // A change output below the dust threshold can't be spent later anyway —
  // fold it into the fee instead of creating one.
  const feeSats = changeSats >= dust ? VTXO_TRANSFER_FEE_SATS : VTXO_TRANSFER_FEE_SATS + changeSats;
  if (changeSats >= dust) {
    outputs.push({ address: vault.p2tr.address, valueSats: changeSats });
  }

  const userSigner = getUserSigner(mnemonicWords);
  const userXOnly = toXOnly(userSigner.publicKey);
  const feeOpts = { maxFeeSats: feeSats * 10n };

  try {
    const built = buildVtxoPsbt({ vault, inputs, outputs, feeSats });
    verifyVtxoPsbt(built.psbt, vault, feeOpts);
    await signVtxoPsbtAsUser(built.psbt, userSigner, vault, feeOpts);

    const nonce = await getAccountNonce(userXOnly, { baseUrl });
    const draft = buildTachiTxTransfer({ vault, inputs, outputs, feeSats, nonce, psbt: built.psbt });
    const signed = await signTachiTx(draft, userSigner);
    const broadcast = await broadcastTachiTx(signed, getRpcProxyUrl("/tachi_txBroadcastSync"));
    const status = await waitForTachiTxCommit(broadcast.tendermintTxHash, {
      baseUrl,
      overallTimeoutMs: 60000,
      pollIntervalMs: 1500,
    });

    if (status.code !== 0) {
      return { ok: false, reason: "rejected", message: status.log || `daemon rejected transfer (code ${status.code})` };
    }

    return { ok: true, txHash: broadcast.tendermintTxHash, amountSats, feeSats, changeSats: changeSats >= dust ? changeSats : 0n };
  } catch (err) {
    return { ok: false, reason: "error", message: err.message };
  }
}

// Real unilateral exit: spends the vault's on-chain funding UTXO(s) through
// the CSV-timelocked exit leaf, needing only the user's own signature — no
// node quorum, no operator cooperation (buildUnilateralExitPsbt's own doc
// comment: "the PSBT needs only the user's signature"). Verified structurally
// against the live signet daemon: build → verify → sign → finalize produces a
// real, well-formed Bitcoin transaction, and broadcasting a version with a
// synthetic (nonexistent) input got exactly the expected Bitcoin Core
// rejection (`bad-txns-inputs-missingorspent`) rather than any earlier
// structural/script failure — proof the pipeline is correct up to the one
// thing this sandbox can't fake: a genuinely matured, real on-chain deposit.
//
// scanForUtxos (from taurus-wallet-aggregator, NOT a Tachi ledger call) reads
// the vault's REAL Bitcoin-layer UTXOs directly via scantxoutset — this is
// deliberately not getLockedVtxos/getVaultBalance (Tachi's ledger view).
// Those two views can genuinely diverge: an off-chain VTXO transfer (Send)
// moves ledger-level ownership WITHOUT touching the vault's on-chain UTXO at
// all — confirmed directly in the Send integration work, where a TRANSFER
// committed successfully with the Bitcoin-layer PSBT still fully unsigned.
// That means the on-chain UTXO can still show its full original deposit
// value even after some of that value has been sent away at the ledger
// level. Tachi's own protocol has a real answer for this — a watchtower that
// specifically watches for L1 spends of the vault and flags a stale claim as
// a breach (TACHI_TX_TYPE_VAULT_BREACH, BreachEventPayload, the
// tachi_watchtower/* endpoints) — but reconciling on-chain state with the
// ledger via a cooperative "vault state advance" isn't implemented here.
// getVaultExitStatus's `settled` flag exists specifically so the app can
// refuse to build an exit against a vault whose on-chain and ledger balances
// have diverged, rather than producing a technically-broadcastable but
// breach-able transaction.
export async function getVaultExitStatus(mnemonicWords, vault) {
  const { rpc } = getFundingWallet(mnemonicWords);
  const csvBlocks = vault.p2tr.exitLeaf.csvBlocks;
  const { utxos } = await scanForUtxos(rpc, [`addr(${vault.p2tr.address})`]);
  const funding = utxos.map((u) => ({
    txid: u.txid,
    vout: u.vout,
    valueSats: u.valueSats,
    scriptPubKey: u.scriptPubKey,
    confirmations: u.confirmations,
    csvBlocks,
    blocksRemaining: Math.max(0, csvBlocks - u.confirmations),
    canExit: u.confirmations >= csvBlocks,
  }));
  const onChainTotalSats = funding.reduce((sum, u) => sum + u.valueSats, 0n);

  const { totalSats: ledgerBalanceSats } = await getVaultBalance(vault);
  // No off-chain sends have moved value away from what's still locked
  // on-chain — safe to build a real exit. If these diverge (a real Send has
  // happened), the on-chain UTXO no longer reflects sole ownership of its
  // full value; see the function doc comment above.
  const settled = onChainTotalSats === ledgerBalanceSats;

  return { funding, onChainTotalSats, ledgerBalanceSats, settled, csvBlocks };
}

const EXIT_FEE_SATS = 500n;

// Exits every currently-matured, on-chain funding UTXO to `destinationAddress`
// in sequence (buildUnilateralExitPsbt only spends one funding UTXO per
// call — there's no batching primitive for this leaf). Callers should check
// getVaultExitStatus's `settled` flag first; this function does not
// re-check it, since by the time a user confirms in the UI that check has
// already been shown to them.
export async function exitUnilaterally(mnemonicWords, vault, destinationAddress, exitCandidates) {
  const { rpc } = getFundingWallet(mnemonicWords);
  const userSigner = getUserSigner(mnemonicWords);
  const userXOnly = toXOnly(userSigner.publicKey);
  const csvBlocks = vault.p2tr.exitLeaf.csvBlocks;
  const options = { maxFeeSats: EXIT_FEE_SATS * 10n, expectedUserKey: userXOnly, minCsvBlocks: csvBlocks };

  const results = [];
  for (const funding of exitCandidates.filter((f) => f.canExit)) {
    if (funding.valueSats <= EXIT_FEE_SATS) {
      results.push({ ok: false, txid: funding.txid, reason: "dust", message: "Funding UTXO is too small to cover the exit fee." });
      continue;
    }
    try {
      const built = buildUnilateralExitPsbt({
        vault,
        funding: {
          txid: funding.txid,
          vout: funding.vout,
          valueSats: funding.valueSats,
          scriptPubKey: funding.scriptPubKey,
        },
        outputs: [{ address: destinationAddress, valueSats: funding.valueSats - EXIT_FEE_SATS }],
        feeSats: EXIT_FEE_SATS,
      });
      verifyUnilateralExitPsbt(built.psbt, vault, options);
      await signUnilateralExitPsbtAsUser(built.psbt, userSigner, vault, options);
      const rawHex = finalizeUnilateralExitPsbt(built.psbt, vault, options);
      const exitTxid = await broadcastRawTransaction(rpc, rawHex);
      results.push({ ok: true, sourceTxid: funding.txid, exitTxid, amountSats: funding.valueSats - EXIT_FEE_SATS });
    } catch (err) {
      results.push({ ok: false, sourceTxid: funding.txid, reason: "error", message: err.message });
    }
  }
  return results;
}

// Real live payment detection via tachi-sdk-ts's WebSocket push stream
// (`/tachi_ws`), so an incoming payment updates the UI without a manual
// reload. Uses the browser's native `WebSocket` global — no polyfill needed
// (tachi-sdk-ts only needs one passed in for pre-v22 Node).
//
// Verified the actual event shape and lifecycle live against Tachi's REGTEST
// daemon (deleted throwaway probe): watching a vault address and sending it
// a real transfer produced exactly the documented two-phase alert —
// `{event:"tx", tx:{type:"transfer", state:"pending", vout:[...]}}` on
// CheckTx acceptance, then the same tx again with `state:"committed"` and a
// `height` once the block commits.
//
// Tachi's HOSTED SIGNET daemon's `/tachi_ws` used to fail the WebSocket
// upgrade handshake outright (HTTP 400) — confirmed directly with the `ws`
// npm package, no app code involved, and reported to Tachi. Per Tachi (Telegram,
// 2026-09-30): this was a reverse-proxy config in front of rpc-signet.tachibtc.com
// not forwarding the WebSocket upgrade headers (regtest's proxy already had
// them, which is why that endpoint always worked). They've since fixed the
// signet proxy config — re-verified independently the same way the break was
// found, with a raw `ws` client against
// `wss://rpc-signet.tachibtc.com/tachi_ws?blocks=true`: handshake succeeds,
// real live block events stream. This feature is now fully real end-to-end
// against the network the rest of the app runs on, not just regtest. onError
// below is kept anyway (not removed) because a dropped WebSocket for any
// other reason (network blip, server restart) should still degrade
// gracefully to the app's pre-existing manual-refresh behavior rather than
// crash or retry-storm.
export function watchVaultAddress(vault, { onCommittedTx, onError, signal }) {
  const network = getWalletNetworkConfig();
  const client = new TachiClient({ baseUrl: network.rpc.jsonRpc });

  (async () => {
    try {
      for await (const event of client.watch({ address: vault.p2tr.address }, { signal })) {
        if (event.event === "tx" && event.tx?.state === "committed") {
          onCommittedTx(event.tx);
        }
      }
    } catch (err) {
      if (!signal.aborted) onError?.(err);
    }
  })();
}

// Live detection for the funding wallet's own balance — the plain tb1q...
// address, before anything's been deposited into the vault. Same mechanism
// as watchVaultAddress, but with a real wrinkle: `/tachi_ws`'s `address`
// filter rejects a P2WPKH address outright (confirmed live: the daemon's
// own error is "... is not a taproot (P2TR) address — use a raw pubkey hex
// or a bc1p/tb1p/bcrt1p address"). Its suggested alternative, a raw pubkey
// hex, DOES work — but the funding wallet's SDK wrapper (WalletAggregator)
// never exposes that pubkey directly, so it's re-derived here via
// Keystore.fromMnemonic(...).deriveAddress(false, 0), the same lower-level,
// officially-exported API the aggregator itself is almost certainly built
// on. Verified this produces the IDENTICAL address as the aggregator's own
// wallet.receiveAddress for a freshly generated mnemonic before trusting its
// .publicKey for anything — not just assumed from matching parameters.
//
// Honest limit on verification: confirmed live that the daemon's WebSocket
// handshake accepts this pubkey as a filter value (same raw-`ws`-client
// method used elsewhere in this project to verify `/tachi_ws` behavior).
// Did NOT confirm a real payment to the resulting address actually produces
// a committed `tx` event — that needs either a funded signet wallet or
// regtest RPC write/API-key access to mine a block to it, neither available
// in this environment. If it turns out the daemon's event stream only ever
// fires for Tachi-protocol transactions (vault opens/transfers/deposits) and
// not plain incoming Bitcoin L1 payments, this watch will simply sit
// connected and silent — which is exactly the pre-existing behavior (no
// live update, reload picks it up via refreshFundingWalletBalance), not a
// regression. Worth a real end-to-end check once there's a live funded
// wallet to test against.
export function watchFundingWalletAddress(mnemonicWords, { onCommittedTx, onError, signal }) {
  const network = getWalletNetworkConfig();
  const client = new TachiClient({ baseUrl: network.rpc.jsonRpc });
  const keystore = Keystore.fromMnemonic(mnemonicWords.join(" "), "", network, "p2wpkh", 0);
  const { publicKey } = keystore.deriveAddress(false, 0);

  (async () => {
    try {
      for await (const event of client.watch({ address: publicKey }, { signal })) {
        if (event.event === "tx" && event.tx?.state === "committed") {
          onCommittedTx(event.tx);
        }
      }
    } catch (err) {
      if (!signal.aborted) onError?.(err);
    }
  })();
}
