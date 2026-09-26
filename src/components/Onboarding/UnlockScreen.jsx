import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { ShieldIcon } from "../icons";
import PinDigitInput, { usePinDigits } from "./PinDigitInput";

const PIN_LENGTH = 4;

// Shown by AppShell instead of any /app route whenever AppStateContext's
// vaultLocked is true — a device that has a PIN-encrypted wallet (see
// lib/walletCrypto.js) always re-locks on a fresh load, since the decrypted
// mnemonic lives only in memory for that session. This is the real
// counterpart to AppLockScreen's onboarding-time PIN setup: without this
// screen, a PIN would only ever have been checked once, at setup, and would
// protect nothing afterward.
export default function UnlockScreen() {
  const navigate = useNavigate();
  const { unlockWithPin, unlockError, unlockBusy } = useAppState();
  const { digits, setDigits, pin, reset } = usePinDigits(PIN_LENGTH);

  async function handleUnlock() {
    if (pin.length !== PIN_LENGTH) return;
    const ok = await unlockWithPin(pin);
    reset();
    if (!ok) return; // unlockError is already set by AppStateContext
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px 32px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F1EEE6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <ShieldIcon size={22} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#1C2430", marginBottom: 8 }}>Vault locked</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", margin: "0 0 8px", maxWidth: 290 }}>
        Your wallet keys are encrypted on this device.
      </p>

      <div style={{ marginTop: 24, marginBottom: 4 }}>
        <PinDigitInput
          length={PIN_LENGTH}
          value={digits}
          onChange={(next) => setDigits(next)}
        />
      </div>

      {unlockError && (
        <p style={{ fontSize: 12.5, color: "#95392A", margin: "4px 0 0", maxWidth: 290 }}>{unlockError}</p>
      )}

      <button
        onClick={handleUnlock}
        disabled={unlockBusy || pin.length !== PIN_LENGTH}
        style={{
          width: "100%",
          background: unlockBusy ? "#5A6472" : "#1C2430",
          color: "#FBF9F4",
          border: "none",
          borderRadius: 14,
          padding: 16,
          fontSize: 14.5,
          fontWeight: 700,
          marginTop: "auto",
          opacity: pin.length !== PIN_LENGTH ? 0.6 : 1,
        }}
      >
        {unlockBusy ? "Unlocking..." : "Unlock"}
      </button>
      <button
        onClick={() => navigate("/onboarding/import")}
        style={{ width: "100%", background: "none", border: "none", color: "#9C958A", padding: 14, fontSize: 13.5, fontWeight: 600 }}
      >
        Recover with recovery phrase
      </button>
    </div>
  );
}
