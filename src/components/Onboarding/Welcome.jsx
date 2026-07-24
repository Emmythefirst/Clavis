import { useNavigate } from "react-router-dom";
import { useOnboarding } from "../../state/OnboardingContext";
import { LogoCheckIcon } from "../icons";

export default function Welcome() {
  const navigate = useNavigate();
  const { generateWallet } = useOnboarding();

  function handleCreate() {
    generateWallet();
    navigate("/onboarding/create/generating");
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 24px", textAlign: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: 13, background: "#1C2430", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <LogoCheckIcon size={22} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#1C2430", marginBottom: 8 }}>Set up your wallet</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", margin: "0 0 36px", maxWidth: 280 }}>
        Choose how you'd like to get started.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        <button
          onClick={handleCreate}
          style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 17, fontSize: 14.5, fontWeight: 700 }}
        >
          Create a new wallet
        </button>
        <button
          onClick={() => navigate("/onboarding/import")}
          style={{ width: "100%", background: "none", border: "1px solid #E7E1D2", color: "#1C2430", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700 }}
        >
          Import an existing wallet
        </button>
      </div>
    </div>
  );
}
