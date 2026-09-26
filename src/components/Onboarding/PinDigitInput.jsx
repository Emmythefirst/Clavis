/* eslint-disable react-refresh/only-export-components -- usePinDigits is colocated with its one consumer-facing component, same pattern as the context files */
import { useEffect, useRef, useState } from "react";

// Shared digit-box PIN entry — used by both AppLockScreen (setting a PIN
// during onboarding) and UnlockScreen (entering it on a later, locked
// visit). Owns its own digit state so callers just get a finished string via
// onComplete's caller pattern: read digits.join("") when they need it.
export default function PinDigitInput({ length = 4, value, onChange }) {
  const inputRefs = useRef([]);

  // Callers reset `value` to all-empty after a submit (success or error) —
  // refocus the first box so the next attempt doesn't need a manual tap.
  useEffect(() => {
    if (value.every((d) => !d)) inputRefs.current[0]?.focus();
  }, [value]);

  function updateDigit(index, raw) {
    const clean = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = clean;
    onChange(next);
    if (clean && index < length - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      {value.map((d, i) => (
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
  );
}

export function usePinDigits(length = 4) {
  const [digits, setDigits] = useState(Array(length).fill(""));
  return {
    digits,
    setDigits,
    pin: digits.join(""),
    reset: () => setDigits(Array(length).fill("")),
  };
}
