// Real local encryption for the wallet mnemonic, gated by the user's PIN —
// replaces the old "PIN is just a route guard, mnemonic sits in plaintext
// localStorage regardless" scheme. Uses only the browser's native Web Crypto
// (SubtleCrypto) — no new dependency, same "audited primitives, not
// hand-rolled crypto" principle as lib/crypto-shim.js.
//
// PBKDF2-SHA256 (not Argon2id) is a deliberate choice: SubtleCrypto has no
// native Argon2, and pulling in a WASM Argon2 library is a real dependency
// with its own supply-chain surface for a demo app that already leans on
// "standard, audited, minimal" everywhere else. 210,000 iterations matches
// OWASP's 2023 minimum recommendation for PBKDF2-SHA256.
//
// Model: PIN encrypts the mnemonic locally (device/app unlock). It is not,
// and must never become, a replacement for the recovery phrase — losing the
// PIN with no recovery phrase backup means the encrypted blob is genuinely
// unrecoverable, same as forgetting a password with no reset path. That's
// correct: a "PIN reset" that could bypass this would mean the PIN was never
// real security to begin with.

const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
export const WALLET_VAULT_VERSION = 1;

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveAesKey(pin, salt, iterations) {
  const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypts a mnemonic word list under a PIN. Returns a plain object safe to
// JSON.stringify into localStorage — salt/iv/ciphertext are hex, everything
// needed to decrypt (except the PIN itself) travels with the blob.
export async function encryptMnemonic(words, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveAesKey(pin, salt, PBKDF2_ITERATIONS);
  const plaintext = new TextEncoder().encode(words.join(" "));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    v: WALLET_VAULT_VERSION,
    kdf: "PBKDF2-SHA256",
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(new Uint8Array(ciphertext)),
  };
}

// Decrypts a blob from encryptMnemonic. Throws a plain, honest message on a
// wrong PIN or a tampered/corrupt blob — AES-GCM's auth tag makes those two
// cases indistinguishable from each other, which is the correct behavior
// (never leak "the ciphertext was fine, just the PIN was wrong" vs. "the
// blob itself is broken").
export async function decryptMnemonic(pin, blob) {
  const salt = hexToBytes(blob.salt);
  const iv = hexToBytes(blob.iv);
  const key = await deriveAesKey(pin, salt, blob.iterations);
  let plainBuf;
  try {
    plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, hexToBytes(blob.ciphertext));
  } catch {
    throw new Error("Incorrect PIN. Your encrypted wallet has not been changed.");
  }
  return new TextDecoder().decode(plainBuf).split(" ");
}
