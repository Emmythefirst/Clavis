// Real client-side key generation and standard Bitcoin address derivation.
// Uses the audited @scure suite (bip39/bip32/btc-signer) — no custom crypto.
// The TAURUS vault/VTXO address format stays mocked in taurusSdk.js until
// Tachi's SDK docs are published; only the underlying wallet keys are real.
import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";
import { getAddress, NETWORK } from "@scure/btc-signer";

export const MNEMONIC_WORD_COUNT = 12;

const RECEIVE_PATH = "m/84'/0'/0'/0/0";

export function generateMnemonicWords() {
  return generateMnemonic(wordlist, 128).split(" ");
}

export function isValidMnemonic(words) {
  const phrase = words.join(" ").trim().toLowerCase();
  if (words.some((w) => !w)) return false;
  return validateMnemonic(phrase, wordlist);
}

export function deriveFirstAddress(words) {
  const seed = mnemonicToSeedSync(words.join(" "));
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(RECEIVE_PATH);
  return getAddress("wpkh", child.privateKey, NETWORK);
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
