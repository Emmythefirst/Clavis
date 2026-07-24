import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { ChevronLeftIcon, HistoryIcon, AlertTriangleIcon, CheckIcon } from "../icons";

export default function RecommendationScreen() {
  const navigate = useNavigate();
  const { guardianResolved, confirmGuardian } = useAppState();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate("/app")} style={{ background: "none", border: "none", padding: 4 }}>
            <ChevronLeftIcon />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2430" }}>Guardian</span>
        </div>
        <button onClick={() => navigate("/app/guardian/log")} style={{ background: "none", border: "none", padding: 4 }}>
          <HistoryIcon size={17} color="#9C958A" />
        </button>
      </div>

      {!guardianResolved ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#F3E2C0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <AlertTriangleIcon size={24} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1C2430", marginBottom: 8, lineHeight: 1.3 }}>
            Liquidity is dipping ahead of your risk window
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", margin: "0 0 20px", maxWidth: 290 }}>
            Your timelock enters its risk window in 3 days, and available VTXO liquidity has dropped over the last 24 hours.
          </p>
          <div style={{ width: "100%", background: "#F1EEE6", borderRadius: 14, padding: 16, textAlign: "left", marginBottom: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9C958A", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
              Why this matters
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#5F5A4E" }}>
              Exiting a portion now keeps you clear of any last-minute network congestion when the risk window opens.
              Nothing is wrong with your vault yet — this is early notice, and Guardian will never act without your confirmation.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 24 }}>
            <button
              onClick={confirmGuardian}
              style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700 }}
            >
              Exit early
            </button>
            <button
              onClick={() => navigate("/app")}
              style={{ width: "100%", background: "none", border: "1px solid #E7E1D2", color: "#8A8478", borderRadius: 14, padding: 15, fontSize: 13.5, fontWeight: 600 }}
            >
              Dismiss for now
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 30 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EAF2EF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <CheckIcon size={24} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1C2430", marginBottom: 6 }}>All clear</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", margin: "0 0 auto", maxWidth: 280 }}>
            You confirmed an early exit. Guardian will keep watching your vault and let you know if anything else needs attention.
          </p>
          <button
            onClick={() => navigate("/app")}
            style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: 24 }}
          >
            Back to vault
          </button>
        </div>
      )}
    </div>
  );
}
