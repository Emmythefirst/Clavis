import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "../../state/OnboardingContext";
import { useAppState } from "../../state/AppStateContext";
import { ShieldIcon } from "../icons";
import PinDigitInput, { usePinDigits } from "./PinDigitInput";
import { clearEncryptedVault } from "../../lib/wallet";

const PIN_LENGTH = 4;

export default function AppLockScreen({ next }) {
  const navigate = useNavigate();
  const { lockStep, submitLockPin, resetLockSetup, derivedAddress, mnemonicWords } = useOnboarding();
  const { setWalletAddress, setWalletMnemonic, unlockWithMnemonic } = useAppState();

  const { digits, setDigits, pin, reset } = usePinDigits(PIN_LENGTH);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (pin.length !== PIN_LENGTH) {
      setError(`Enter all ${PIN_LENGTH} digits.`);
      return;
    }
    setBusy(true);
    const result = await submitLockPin(pin);
    setBusy(false);
    reset();
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.done) {
      // The mnemonic's only persisted copy is now the encrypted blob
      // submitLockPin just wrote — unlockWithMnemonic brings it into this
      // session WITHOUT also writing a plaintext copy (that would defeat
      // the PIN entirely).
      if (derivedAddress) setWalletAddress(derivedAddress);
      if (mnemonicWords.length) unlockWithMnemonic(mnemonicWords);
      navigate(next);
    }
  }

  function handleSkip() {
    resetLockSetup();
    // No PIN means no encryption key to derive from — stays on the existing,
    // documented plaintext-localStorage path. Clear any encrypted vault left
    // over from a PIN set up in an earlier run on this device, so the app
    // doesn't show a stale unlock screen for a wallet that's no longer current.
    clearEncryptedVault();
    if (derivedAddress) setWalletAddress(derivedAddress);
    if (mnemonicWords.length) setWalletMnemonic(mnemonicWords);
    navigate(next);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px 32px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F1EEE6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <ShieldIcon size={22} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#1C2430", marginBottom: 8 }}>Protect this app</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", margin: "0 0 8px", maxWidth: 290 }}>
        Your PIN encrypts your wallet keys on this device. It's separate from your recovery
        phrase, which remains the only way to restore your funds elsewhere — losing both means
        losing access, same as any encrypted secret with no PIN reset.
      </p>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1C2430", margin: "20px 0 16px" }}>
        {lockStep === "enter" ? "Create a PIN" : "Confirm your PIN"}
      </div>
      <PinDigitInput
        length={PIN_LENGTH}
        value={digits}
        onChange={(next) => {
          setDigits(next);
          setError(null);
        }}
      />

      {error && (
        <p style={{ fontSize: 12.5, color: "#95392A", margin: "4px 0 0" }}>{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={busy}
        style={{ width: "100%", background: busy ? "#5A6472" : "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: "auto" }}
      >
        {busy ? "Securing your wallet..." : lockStep === "enter" ? "Continue" : "Confirm PIN"}
      </button>
      <button
        onClick={handleSkip}
        disabled={busy}
        style={{ width: "100%", background: "none", border: "none", color: "#9C958A", padding: 14, fontSize: 13.5, fontWeight: 600 }}
      >
        Skip for now
      </button>
    </div>
  );
}
