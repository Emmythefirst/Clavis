// Browser stand-in for Node's `crypto` module. @tachibtc/taurus-vault-core's
// compiled bundle does `import { createHash } from "crypto"` for its TachiTx
// hashing (vtxoId, sighash, etc.) — a Node builtin with no browser
// equivalent. Vite otherwise just externalizes the import, so calling
// createHash() throws "is not a function" the first time this code path
// actually runs (the ledger-registration step — see PROGRESS.md 2026-08-15).
//
// Every call site in the SDK's dist uses the same narrow shape:
// createHash("sha256").update(bytesOrString[, "utf8"]).digest([  "hex"]).
// That's the only thing this shim needs to support — not a general crypto
// polyfill. Tried `crypto-browserify` first: it drags in a known-vulnerable
// `elliptic` (via browserify-sign, for ECDSA/RSA we never call) just to get
// createHash. Tried `create-hash` alone next: its browser build needs Node's
// `stream`/`events` too (via cipher-base), same whack-a-mole. Settled on
// @noble/hashes — audited, zero-dependency, already in the tree transitively
// (bip32/bip39/bitcoinjs-lib all use it) — and wrapped its incremental
// hasher in a tiny class matching Node's createHash chain shape.
import { sha256 } from "@noble/hashes/sha2.js";
import { Buffer } from "buffer";

class Sha256Hash {
  constructor() {
    this._hasher = sha256.create();
  }

  update(data, encoding) {
    const bytes = typeof data === "string" ? Buffer.from(data, encoding || "utf8") : data;
    this._hasher.update(bytes);
    return this;
  }

  digest(encoding) {
    const bytes = Buffer.from(this._hasher.digest());
    return encoding ? bytes.toString(encoding) : bytes;
  }
}

export function createHash(algorithm) {
  if (algorithm !== "sha256") {
    throw new Error(`crypto-shim: unsupported hash algorithm "${algorithm}" (only sha256 is wired up)`);
  }
  return new Sha256Hash();
}
