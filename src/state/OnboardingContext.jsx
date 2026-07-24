/* eslint-disable react-refresh/only-export-components -- context Provider + its hook are intentionally colocated */
import { createContext, useContext, useState } from "react";
import {
  MNEMONIC_WORD_COUNT,
  generateMnemonicWords,
  deriveFirstAddress,
  buildVerifyChallenges,
  isValidMnemonic,
} from "../lib/wallet";

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [mnemonicWords, setMnemonicWords] = useState([]);
  const [derivedAddress, setDerivedAddress] = useState("");
  const [revealed, setRevealed] = useState(false);

  const [verifyChallenges, setVerifyChallenges] = useState([]);
  const [verifyAnswers, setVerifyAnswers] = useState({});
  const [verifyError, setVerifyError] = useState(false);

  const [importWords, setImportWords] = useState(Array(MNEMONIC_WORD_COUNT).fill(""));
  const [importError, setImportError] = useState(null);

  const [lockPin, setLockPin] = useState("");
  const [lockStep, setLockStep] = useState("enter"); // 'enter' | 'confirm'
  const [lockEnabled, setLockEnabled] = useState(false);

  function generateWallet() {
    const words = generateMnemonicWords();
    setMnemonicWords(words);
    setDerivedAddress(deriveFirstAddress(words));
    setRevealed(false);
    setVerifyAnswers({});
    setVerifyError(false);
    setVerifyChallenges(buildVerifyChallenges(words));
  }

  function revealSeed() {
    setRevealed(true);
  }

  function retakeVerification() {
    setVerifyAnswers({});
    setVerifyError(false);
    setVerifyChallenges(buildVerifyChallenges(mnemonicWords));
  }

  function answerVerifyChallenge(position, word) {
    setVerifyAnswers((prev) => ({ ...prev, [position]: word }));
    setVerifyError(false);
  }

  function checkVerification() {
    const allAnswered = verifyChallenges.every((c) => verifyAnswers[c.position]);
    const allCorrect = allAnswered && verifyChallenges.every((c) => verifyAnswers[c.position] === c.correct);
    if (!allCorrect) setVerifyError(true);
    return allCorrect;
  }

  function setImportWord(index, value) {
    setImportWords((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setImportError(null);
  }

  function pasteImportWords(text) {
    const parts = text
      .trim()
      .split(/\s+/)
      .map((w) => w.toLowerCase())
      .slice(0, MNEMONIC_WORD_COUNT);
    setImportWords((prev) => {
      const next = [...prev];
      parts.forEach((w, i) => {
        next[i] = w;
      });
      return next;
    });
    setImportError(null);
  }

  function submitImport() {
    const words = importWords.map((w) => w.trim().toLowerCase());
    if (words.some((w) => !w)) {
      setImportError(`Enter all ${MNEMONIC_WORD_COUNT} words.`);
      return false;
    }
    if (!isValidMnemonic(words)) {
      setImportError("This phrase doesn't look right — check for typos or a missing word.");
      return false;
    }
    setMnemonicWords(words);
    setDerivedAddress(deriveFirstAddress(words));
    return true;
  }

  function submitLockPin(pin) {
    if (lockStep === "enter") {
      setLockPin(pin);
      setLockStep("confirm");
      return { done: false };
    }
    if (pin !== lockPin) {
      setLockStep("enter");
      setLockPin("");
      return { done: false, error: "PINs didn't match — try again." };
    }
    setLockEnabled(true);
    return { done: true };
  }

  function resetLockSetup() {
    setLockPin("");
    setLockStep("enter");
  }

  const value = {
    mnemonicWords,
    derivedAddress,
    revealed,
    generateWallet,
    revealSeed,

    verifyChallenges,
    verifyAnswers,
    verifyError,
    answerVerifyChallenge,
    checkVerification,
    retakeVerification,

    importWords,
    importError,
    setImportWord,
    pasteImportWords,
    submitImport,

    lockStep,
    lockEnabled,
    submitLockPin,
    resetLockSetup,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
