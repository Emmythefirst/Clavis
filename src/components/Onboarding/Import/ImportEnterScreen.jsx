import { useNavigate } from "react-router-dom";
import { useOnboarding } from "../../../state/OnboardingContext";
import { ChevronLeftIcon, AlertTriangleIcon } from "../../icons";

export default function ImportEnterScreen() {
  const navigate = useNavigate();
  const { importWords, importError, setImportWord, pasteImportWords, submitImport } = useOnboarding();

  function handlePaste(e) {
    const text = e.clipboardData.getData("text");
    if (text.trim().split(/\s+/).length > 1) {
      e.preventDefault();
      pasteImportWords(text);
    }
  }

  function handleSubmit() {
    if (submitImport()) {
      navigate("/onboarding/import/lock");
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <button onClick={() => navigate("/onboarding/welcome")} style={{ background: "none", border: "none", padding: 4 }}>
          <ChevronLeftIcon />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2430" }}>Import your wallet</span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: "#8A8478", margin: "0 0 20px" }}>
        Enter your 12-word recovery phrase. You can paste the whole phrase into the first box.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {importWords.map((word, i) => (
          <div
            key={i}
            style={{ background: "#F1EEE6", border: "1px solid transparent", borderRadius: 10, padding: "8px 8px", display: "flex", alignItems: "center", gap: 5 }}
          >
            <span style={{ fontSize: 10.5, color: "#B3AA97", fontWeight: 600, minWidth: 13, flexShrink: 0 }}>{i + 1}</span>
            <input
              value={word}
              onChange={(e) => setImportWord(i, e.target.value.trim().toLowerCase())}
              onPaste={handlePaste}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#1C2430" }}
            />
          </div>
        ))}
      </div>

      {importError && (
        <div style={{ background: "#FBE9E4", border: "1px solid #F3D3CB", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 9, marginBottom: 16 }}>
          <AlertTriangleIcon size={14} color="#95392A" />
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "#95392A" }}>{importError}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: "auto" }}
      >
        Import wallet
      </button>
    </div>
  );
}
