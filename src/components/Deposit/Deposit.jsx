import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { ChevronLeftIcon, CheckIcon } from "../icons";

const DOT_COLOR = (active) => (active ? "#1C2430" : "#EFEADD");

export default function Deposit() {
  const navigate = useNavigate();
  const { depositStep, setDepositStep, depositAmount, setDepositAmount } = useAppState();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", padding: 4 }}>
          <ChevronLeftIcon />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2430" }}>Add to vault</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        <div style={{ height: 3, flex: 1, borderRadius: 2, background: DOT_COLOR(depositStep >= 0) }} />
        <div style={{ height: 3, flex: 1, borderRadius: 2, background: DOT_COLOR(depositStep >= 1) }} />
        <div style={{ height: 3, flex: 1, borderRadius: 2, background: DOT_COLOR(depositStep >= 2) }} />
      </div>

      {depositStep === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", margin: "24px 0 32px" }}>
            <div style={{ fontSize: 12.5, color: "#9C958A", marginBottom: 8 }}>Amount to deposit</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 40, fontWeight: 600, color: "#1C2430" }}>
                {depositAmount}
              </span>
              <span style={{ fontSize: 15, color: "#9C958A", fontWeight: 600 }}>BTC</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: "auto" }}>
            {["0.01", "0.05", "0.1"].map((amt) => (
              <button
                key={amt}
                onClick={() => setDepositAmount(amt)}
                style={{ background: "#F1EEE6", border: "none", borderRadius: 100, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, color: "#5F5A4E" }}
              >
                {amt}
              </button>
            ))}
            <button
              onClick={() => setDepositAmount("0.24")}
              style={{ background: "#F1EEE6", border: "none", borderRadius: 100, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, color: "#5F5A4E" }}
            >
              Max
            </button>
          </div>
          <button
            onClick={() => setDepositStep(1)}
            style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: 20 }}
          >
            Continue
          </button>
        </div>
      )}

      {depositStep === 1 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 30, fontWeight: 600, color: "#1C2430" }}>
              {depositAmount} BTC
            </div>
            <div style={{ fontSize: 12.5, color: "#9C958A", marginTop: 4 }}>locks into a new TAURUS vault</div>
          </div>
          <div style={{ background: "#F1EEE6", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            {[
              "Your timelock starts the moment this confirms on-chain.",
              "This BTC is your collateral — it's what backs your instant off-chain balance.",
              "Once the timelock clears, you can exit back to mainnet any time — unilaterally, no counterparty needed.",
            ].map((line) => (
              <div key={line} style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#A8672E", marginTop: 6, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#5F5A4E" }}>{line}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setDepositStep(2)}
            style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: "auto" }}
          >
            Confirm deposit
          </button>
        </div>
      )}

      {depositStep === 2 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 20 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#EAF2EF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <CheckIcon />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1C2430", marginBottom: 6 }}>Vault created</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#8A8478", margin: "0 0 28px", maxWidth: 280 }}>
            Your {depositAmount} BTC is locked and secured on-chain. Timelock started just now.
          </p>
          <button
            onClick={() => {
              setDepositStep(0);
              navigate("/");
            }}
            style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: "auto" }}
          >
            View vault
          </button>
        </div>
      )}
    </div>
  );
}
