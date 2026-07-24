import { useNavigate } from "react-router-dom";
import { useOnboarding } from "../../../state/OnboardingContext";
import { ChevronLeftIcon, AlertTriangleIcon, EyeIcon } from "../../icons";

export default function SeedDisplayScreen() {
  const navigate = useNavigate();
  const { mnemonicWords, revealed, revealSeed } = useOnboarding();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <button onClick={() => navigate("/onboarding/welcome")} style={{ background: "none", border: "none", padding: 4 }}>
          <ChevronLeftIcon />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2430" }}>Recovery phrase</span>
      </div>

      <div style={{ background: "#FBE9E4", border: "1px solid #F3D3CB", borderRadius: 14, padding: "14px 15px", display: "flex", gap: 10, marginBottom: 20 }}>
        <AlertTriangleIcon size={16} color="#95392A" />
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: "#95392A", fontWeight: 500 }}>
          Never screenshot this screen. Never share these words with anyone. Store them offline —
          this is the only way to recover your funds.
        </p>
      </div>

      <div style={{ position: "relative", flex: "0 0 auto", marginBottom: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            filter: revealed ? "none" : "blur(7px)",
            userSelect: revealed ? "auto" : "none",
            transition: "filter 0.2s",
          }}
        >
          {mnemonicWords.map((word, i) => (
            <div
              key={i}
              style={{ background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 10, padding: "10px 8px", display: "flex", alignItems: "baseline", gap: 6 }}
            >
              <span style={{ fontSize: 10.5, color: "#B3AA97", fontWeight: 600, minWidth: 14 }}>{i + 1}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: "#1C2430" }}>
                {word}
              </span>
            </div>
          ))}
        </div>

        {!revealed && (
          <button
            onClick={revealSeed}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(28,36,48,0.06)",
              border: "none",
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1C2430", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <EyeIcon color="#FBF9F4" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1C2430", background: "#FBF9F4", padding: "6px 12px", borderRadius: 100 }}>
              Tap to reveal
            </span>
          </button>
        )}
      </div>

      <button
        disabled={!revealed}
        onClick={() => navigate("/onboarding/create/verify")}
        style={{
          width: "100%",
          background: revealed ? "#1C2430" : "#EFEADD",
          color: revealed ? "#FBF9F4" : "#B3AA97",
          border: "none",
          borderRadius: 14,
          padding: 16,
          fontSize: 14.5,
          fontWeight: 700,
          marginTop: "auto",
        }}
      >
        I've saved my phrase
      </button>
    </div>
  );
}
