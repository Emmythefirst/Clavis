import { useNavigate } from "react-router-dom";
import { useOnboarding } from "../../../state/OnboardingContext";
import { CheckIcon } from "../../icons";

export default function SuccessScreen() {
  const navigate = useNavigate();
  const { derivedAddress } = useOnboarding();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px 20px 32px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#EAF2EF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <CheckIcon size={28} />
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: "#1C2430", marginBottom: 8 }}>Wallet ready</div>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", margin: "0 0 22px", maxWidth: 280 }}>
          Your keys were generated and verified entirely on this device.
        </p>
        {derivedAddress && (
          <div style={{ width: "100%", background: "#F1EEE6", borderRadius: 13, padding: "13px 14px" }}>
            <div style={{ fontSize: 11, color: "#9C958A", marginBottom: 4 }}>First receiving address</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#5F5A4E", wordBreak: "break-all" }}>
              {derivedAddress}
            </div>
          </div>
        )}
      </div>
      <button
        onClick={() => navigate("/app")}
        style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700 }}
      >
        Enter wallet
      </button>
    </div>
  );
}
