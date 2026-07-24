import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { ChevronLeftIcon, CopyIcon } from "../icons";

function truncateAddress(address) {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

export default function ReceiveBTC() {
  const navigate = useNavigate();
  const { walletAddress } = useAppState();
  const [copyLabel, setCopyLabel] = useState("Tap to copy your Bitcoin address");

  function copyAddress() {
    if (walletAddress) {
      navigator.clipboard?.writeText(walletAddress).catch(() => {});
    }
    setCopyLabel("Copied to clipboard");
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <button onClick={() => navigate("/app")} style={{ background: "none", border: "none", padding: 4 }}>
          <ChevronLeftIcon />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2430" }}>Receive BTC</span>
      </div>
      <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "#9C958A", margin: "0 0 22px" }}>
        Your standard Bitcoin address — for receiving from an exchange or another wallet. Not the
        same as your VTXO receive address, which is for instant off-chain transfers.
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
        <div style={{ width: 190, height: 190, borderRadius: 18, background: "#FFFFFF", border: "1px solid #E7E1D2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
          <div
            style={{
              width: 150,
              height: 150,
              borderRadius: 10,
              background: "repeating-linear-gradient(45deg, #EFEADD, #EFEADD 8px, #F7F4EB 8px, #F7F4EB 16px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: "#B3AA97",
              fontWeight: 600,
            }}
          >
            QR code
          </div>
        </div>
        <div style={{ width: "100%", background: "#F1EEE6", borderRadius: 13, padding: "13px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 20 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#5F5A4E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {walletAddress ? truncateAddress(walletAddress) : "Generating address..."}
          </span>
          <button onClick={copyAddress} style={{ background: "none", border: "none", flexShrink: 0, padding: 2 }}>
            <CopyIcon />
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: "#9C958A", textAlign: "center", margin: "0 0 auto", lineHeight: 1.5 }}>
          {copyLabel}
        </p>

        <button
          onClick={() => navigate("/app/deposit")}
          style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: 20 }}
        >
          Continue to deposit
        </button>
      </div>
    </div>
  );
}
