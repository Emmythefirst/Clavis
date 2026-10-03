import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { ruleDescription } from "../../lib/guardianRules";
import { ChevronLeftIcon } from "../icons";

const VALUE_SUFFIX = { "single-limit": "sats", "daily-limit": "sats", "large-fraction": "%" };

// Local, controlled input per rule so typing a new value doesn't fight with
// AppStateContext re-rendering guardianRules on every keystroke — commits to
// real state (and localStorage, via updateGuardianRuleValue) on blur/Enter,
// not per-keystroke. Resets to the saved value on blur if left unparseable
// (e.g. cleared to empty) rather than silently keeping an invalid draft.
function RuleValueInput({ rule, onCommit }) {
  const [draft, setDraft] = useState(String(rule.value));

  function commit() {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed > 0) onCommit(parsed);
    else setDraft(String(rule.value));
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        inputMode="numeric"
        style={{
          width: 90,
          background: "#F1EEE6",
          border: "1px solid transparent",
          borderRadius: 8,
          padding: "6px 8px",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12.5,
          color: "#1C2430",
          outline: "none",
        }}
      />
      <span style={{ fontSize: 11.5, color: "#9C958A", fontWeight: 600 }}>{VALUE_SUFFIX[rule.id]}</span>
    </div>
  );
}

export default function SetupScreen() {
  const navigate = useNavigate();
  const { guardianRules, toggleGuardianRule, updateGuardianRuleValue } = useAppState();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <button onClick={() => navigate("/app")} style={{ background: "none", border: "none", padding: 4 }}>
          <ChevronLeftIcon />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2430" }}>Spend Protection</span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: "#8A8478", margin: "0 0 22px" }}>
        Choose which rules Guardian checks before a payment sends. It only ever recommends — your one-tap
        confirmation is always required. Vault Watch, Guardian's other half, monitors the vault continuously and has
        no rules to configure yet.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {guardianRules.map((rule) => (
          <div
            key={rule.id}
            style={{ background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 16, padding: "15px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1C2430", marginBottom: 4 }}>{rule.title}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#9C958A" }}>{ruleDescription(rule)}</div>
              {rule.value != null && (
                <RuleValueInput rule={rule} onCommit={(value) => updateGuardianRuleValue(rule.id, value)} />
              )}
            </div>
            <button
              onClick={() => toggleGuardianRule(rule.id)}
              style={{
                flexShrink: 0,
                width: 40,
                height: 24,
                borderRadius: 100,
                background: rule.enabled ? "#0F6A5C" : "#E7E1D2",
                border: "none",
                padding: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: rule.enabled ? "flex-end" : "flex-start",
                marginTop: 2,
              }}
            >
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
