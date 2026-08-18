import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "../../state/OnboardingContext";
import { useAppState } from "../../state/AppStateContext";
import { ShieldIcon } from "../icons";

const PIN_LENGTH = 4;

export default function AppLockScreen({ next }) {
  const navigate = useNavigate();
  const { lockStep, submitLockPin, resetLockSetup, derivedAddress, mnemonicWords } = useOnboarding();
  const { setWalletAddress, setWalletMnemonic } = useAppState();

  function carryWalletIntoApp() {
    if (derivedAddress) setWalletAddress(derivedAddress);
    if (mnemonicWords.length) setWalletMnemonic(mnemonicWords);
  }
  const [digits, setDigits] = useState(Array(PIN_LENGTH).fill(""));
  const [error, setError] = useState(null);
  const inputRefs = useRef([]);

  function updateDigit(index, value) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const updated = [...prev];
      updated[index] = clean;
      return updated;
    });
    setError(null);
    if (clean && index < PIN_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleSubmit() {
    const pin = digits.join("");
    if (pin.length !== PIN_LENGTH) {
      setError(`Enter all ${PIN_LENGTH} digits.`);
      return;
    }
    const result = submitLockPin(pin);
    setDigits(Array(PIN_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.done) {
      carryWalletIntoApp();
      navigate(next);
    }
  }

  function handleSkip() {
    resetLockSetup();
    carryWalletIntoApp();
    navigate(next);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px 32px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F1EEE6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <ShieldIcon size={22} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#1C2430", marginBottom: 8 }}>Protect this app</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", margin: "0 0 8px", maxWidth: 290 }}>
        A PIN protects Clavis on this device. It's separate from your recovery phrase, which
        remains the only way to restore your funds elsewhere.
      </p>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1C2430", margin: "20px 0 16px" }}>
        {lockStep === "enter" ? "Create a PIN" : "Confirm your PIN"}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            value={d}
            onChange={(e) => updateDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            type="password"
            maxLength={1}
            style={{
              width: 46,
              height: 54,
              textAlign: "center",
              background: "#F1EEE6",
              border: "1px solid transparent",
              borderRadius: 12,
              fontSize: 20,
              fontFamily: "'IBM Plex Mono', monospace",
              color: "#1C2430",
              outline: "none",
            }}
          />
        ))}
      </div>

      {error && (
        <p style={{ fontSize: 12.5, color: "#95392A", margin: "4px 0 0" }}>{error}</p>
      )}

      <button
        onClick={handleSubmit}
        style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: "auto" }}
      >
        {lockStep === "enter" ? "Continue" : "Confirm PIN"}
      </button>
      <button
        onClick={handleSkip}
        style={{ width: "100%", background: "none", border: "none", color: "#9C958A", padding: 14, fontSize: 13.5, fontWeight: 600 }}
      >
        Skip for now
      </button>
    </div>
  );
}
