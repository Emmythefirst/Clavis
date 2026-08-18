// Real client-side key generation and wallet management, built directly on
// Tachi's own SDK (@tachibtc/taurus-wallet-aggregator) rather than a
// hand-rolled bip39/bip32/address stack. This matters for two reasons:
//   1. Network — Tachi only operates on regtest/signet, never mainnet, so a
//      mainnet-derived address can't actually fund a vault.
//   2. Shape — @tachibtc/taurus-vault-core's createVault/depositToVault both
//      expect a `Wallet` instance from this aggregator, not a raw keypair.
// bip39 wordlist comes from the `bip39` package (a wallet-aggregator
// dependency, already installed) purely for building verify-challenge
// distractors — it's the same standard 2048-word English list regardless of
// which library reads it.
import {
  WalletAggregator,
  BitcoinCoreRpcClient,
  getWalletNetwork,
  generateMnemonic,
  validateMnemonic,
  Keystore,
  getNetwork,
} from "@tachibtc/taurus-wallet-aggregator";
import { wordlists } from "bip39";
import { Buffer } from "buffer";

export const MNEMONIC_WORD_COUNT = 12; // 128-bit strength

// Tachi's regtest is a private chain with no faucet we have access to (see
// PROGRESS.md, 2026-08-15). Signet is the real public signet chain, so any
// public signet faucet can fund a wallet here — that's what we build against.
export const WALLET_CHAIN = "signet";

const wordlist = wordlists.english;

function getRpc() {
  return new BitcoinCoreRpcClient({
    // Routed through our own /api/rpc-proxy (see api/rpc-proxy.js) rather
    // than Tachi's rpc.jsonRpc URL directly: Tachi's POST / Bitcoin-RPC-proxy
    // endpoint doesn't send CORS headers on its preflight, so a browser
    // can't call it cross-origin. GET routes (validators, health) don't have
    // this problem and are still called directly — see getWalletNetworkConfig.
    url: "/api/rpc-proxy?network=" + WALLET_CHAIN,
    // BitcoinCoreRpcClient defaults to a bare `globalThis.fetch` reference and
    // later calls it as `this.#fetchImpl(...)` — browsers reject that with
    // "Illegal invocation" because native fetch requires `window` as its
    // receiver. Wrapping it in a plain function keeps the call a bare
    // `fetch(...)` invocation, which browsers accept.
    fetchImpl: (...args) => fetch(...args),
  });
}

export function getWalletNetworkConfig() {
  return getWalletNetwork(WALLET_CHAIN);
}

// Absolute URL to our CORS-workaround proxy (see api/rpc-proxy.js) for a
// given Tachi daemon path. Unlike getRpc() above, this has to be a full
// absolute URL, not a bare "/api/rpc-proxy..." string — broadcastTachiTx and
// friends run their own `new URL(url)` scheme check (CWE-319 guard) with no
// base, which throws on a relative path. window.location.origin is https://
// on Vercel; only local `npm run dev` is http://, so allowInsecureHttp is
// scoped to that via import.meta.env.DEV, not left on unconditionally.
export function getRpcProxyUrl(path) {
  return {
    url: `${window.location.origin}/api/rpc-proxy?network=${WALLET_CHAIN}&path=${encodeURIComponent(path)}`,
    allowInsecureHttp: import.meta.env.DEV,
  };
}

const STORAGE_KEY = "clavis.walletMnemonic";

// Persists the funding wallet's mnemonic across reloads. Without this, a
// fresh random wallet was generated on every page load, silently orphaning
// any address a user had already funded from a faucet — real signet coins,
// unreachable through the UI. Plaintext localStorage isn't real key security;
// this is scoped to a signet demo wallet holding worthless test coins, not a
// claim about how a production wallet should store secrets (same principle
// as the PIN-lock scoping note in PROGRESS.md).
export function loadStoredMnemonic() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMnemonic(words) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch {
    // Storage unavailable (private browsing, quota) — non-fatal, this
    // session's wallet just won't survive a reload.
  }
}

export function generateMnemonicWords() {
  return generateMnemonic(128).split(" ");
}

export function isValidMnemonic(words) {
  if (words.some((w) => !w)) return false;
  return validateMnemonic(words.join(" ").trim().toLowerCase());
}

// Builds a live aggregator + p2wpkh funding wallet for the given mnemonic.
// Stateless/on-demand by design — callers re-derive from the mnemonic rather
// than holding a long-lived signer in memory.
export function getFundingWallet(words) {
  const rpc = getRpc();
  const aggregator = WalletAggregator.fromMnemonic(words.join(" "), {
    network: WALLET_CHAIN,
    rpc,
  });
  const wallet = aggregator.addAccount({ addressType: "p2wpkh" });
  return { aggregator, wallet, rpc };
}

export function deriveFirstAddress(words) {
  return getFundingWallet(words).wallet.receiveAddress;
}

// Derives a Schnorr-capable signer for VTXO/TachiTx signing — separate from
// the funding wallet above, which only needs to sign ECDSA (the P2WPKH
// deposit tx). Same mnemonic/network/addressType/account as getFundingWallet,
// so it signs for the exact key vault.userKey commits to (per Tachi's
// vtxo-quickstart.md "Derive a Schnorr signer" step).
export function getUserSigner(words) {
  const keystore = Keystore.fromMnemonic(words.join(" "), "", getNetwork(WALLET_CHAIN), "p2wpkh", 0);
  const node = keystore.signerFor(false, 0); // receive, index 0
  return {
    publicKey: Buffer.from(node.publicKey),
    sign: (hash) => Buffer.from(node.sign(hash)),
    signSchnorr: (hash) => Buffer.from(node.signSchnorr(hash)),
  };
}

function randomWord() {
  return wordlist[Math.floor(Math.random() * wordlist.length)];
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Builds N multiple-choice challenges asking the user to identify the word
// at a given position in their phrase — proves they actually saved it.
export function buildVerifyChallenges(words, challengeCount = 3, optionCount = 3) {
  const positions = shuffle([...Array(words.length).keys()]).slice(0, challengeCount).sort((a, b) => a - b);
  const usedWords = new Set(words);

  return positions.map((position) => {
    const correct = words[position];
    const distractors = new Set();
    while (distractors.size < optionCount - 1) {
      const w = randomWord();
      if (!usedWords.has(w) && w !== correct) distractors.add(w);
    }
    return { position, correct, options: shuffle([...distractors, correct]) };
  });
}
