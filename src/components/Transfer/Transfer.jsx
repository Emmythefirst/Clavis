import { useEffect, useState } from "react";
import { useAppState } from "../../state/AppStateContext";
import { CheckIcon, CopyIcon, AlertTriangleIcon, ShieldIcon } from "../icons";

function truncate(address) {
  if (!address || address.length <= 24) return address;
  return `${address.slice(0, 14)}...${address.slice(-8)}`;
}

export default function Transfer() {
  const {
    sendMode,
    setSendMode,
    sendRecipient,
    setSendRecipient,
    sendAmount,
    setSendAmount,
    sendSuccess,
    sendBusy,
    sendError,
    sendTxHash,
    doSend,
    resetSend,
    realVault,
    ensureRealVault,
    guardianReview,
    confirmReviewedSend,
    cancelReviewedSend,
  } = useAppState();

  const [vaultError, setVaultError] = useState(null);
  const [copyLabel, setCopyLabel] = useState("Tap to copy your vault address");
  const vaultBusy = sendMode === "receive" && !realVault && !vaultError;

  useEffect(() => {
    if (sendMode !== "receive" || realVault) return;
    ensureRealVault().catch((err) => setVaultError(err.message));
  }, [sendMode, realVault, ensureRealVault]);

  function copyAddress() {
    if (realVault?.p2tr?.address) {
      navigator.clipboard?.writeText(realVault.p2tr.address).catch(() => {});
    }
    setCopyLabel("Copied to clipboard");
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2430" }}>Transfer</span>
      </div>

      <div style={{ display: "flex", background: "#F1EEE6", borderRadius: 13, padding: 4, marginBottom: 26 }}>
        <button
          onClick={() => setSendMode("send")}
          style={{
            flex: 1,
            background: sendMode === "send" ? "#FFFFFF" : "none",
            color: sendMode === "send" ? "#1C2430" : "#9C958A",
            border: "none",
            borderRadius: 10,
            padding: 10,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Send
        </button>
        <button
          onClick={() => setSendMode("receive")}
          style={{
            flex: 1,
            background: sendMode === "receive" ? "#FFFFFF" : "none",
            color: sendMode === "receive" ? "#1C2430" : "#9C958A",
            border: "none",
            borderRadius: 10,
            padding: 10,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Receive
        </button>
      </div>

      {sendMode === "send" &&
        (guardianReview ? (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FBF1E1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ShieldIcon size={18} color="#8A6420" />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1C2430" }}>Guardian review</div>
                <div style={{ fontSize: 12, color: "#9C958A" }}>
                  This payment triggered {guardianReview.triggered.length} of your configured rules
                </div>
              </div>
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 14, padding: "6px 16px", marginBottom: 20 }}>
              {guardianReview.checks.map((check, i) => (
                <div
                  key={check.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px 0",
                    borderBottom: i < guardianReview.checks.length - 1 ? "1px solid #EFEADD" : "none",
                  }}
                >
                  {check.passed ? (
                    <CheckIcon size={15} color="#0F6A5C" strokeWidth={2.4} />
                  ) : (
                    <AlertTriangleIcon size={15} color="#B1503B" />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1C2430" }}>{check.label}</div>
                    <div style={{ fontSize: 11.5, color: "#9C958A", marginTop: 1 }}>{check.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#9C958A", margin: "0 0 auto", lineHeight: 1.5 }}>
              Guardian only ever recommends — it's your call whether to continue.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
              <button
                onClick={confirmReviewedSend}
                disabled={sendBusy}
                style={{ width: "100%", background: sendBusy ? "#7C9C93" : "#0F6A5C", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700 }}
              >
                {sendBusy ? "Sending..." : "Send anyway"}
              </button>
              <button
                onClick={cancelReviewedSend}
                disabled={sendBusy}
                style={{ width: "100%", background: "none", border: "1px solid #E7E1D2", color: "#8A8478", borderRadius: 14, padding: 15, fontSize: 13.5, fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : sendSuccess ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 30 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EAF2EF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <CheckIcon size={24} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1C2430" }}>Sent instantly</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#8A8478", marginTop: 6 }}>
              {sendAmount} BTC · off-chain
            </div>
            {sendTxHash && (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#B3AA97", marginTop: 10, wordBreak: "break-all", padding: "0 10px" }}>
                Tachi ledger tx: {sendTxHash}
              </div>
            )}
            <button
              onClick={resetSend}
              style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: "auto" }}
            >
              Send another
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#9C958A", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
              To
            </label>
            <input
              value={sendRecipient}
              onChange={(e) => setSendRecipient(e.target.value)}
              placeholder="Recipient vault address (tb1p...)"
              style={{ width: "100%", background: "#F1EEE6", border: "1px solid transparent", borderRadius: 13, padding: 14, fontSize: 13.5, color: "#1C2430", marginBottom: 6 }}
            />
            <p style={{ fontSize: 11.5, color: "#9C958A", margin: "0 0 20px", lineHeight: 1.5 }}>
              VTXO transfers move vault-to-vault — paste another Tachi vault's P2TR address, not a
              regular Bitcoin address.
            </p>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#9C958A", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
              Amount
            </label>
            <div style={{ display: "flex", alignItems: "center", background: "#F1EEE6", borderRadius: 13, padding: 14, marginBottom: 16 }}>
              <input
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.00"
                style={{ flex: 1, background: "none", border: "none", fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, color: "#1C2430", outline: "none" }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#9C958A" }}>BTC</span>
            </div>
            {sendError && (
              <p style={{ fontSize: 12.5, color: "#95392A", margin: "0 0 16px", lineHeight: 1.5 }}>{sendError}</p>
            )}
            <button
              onClick={doSend}
              disabled={sendBusy || !sendRecipient || !sendAmount}
              style={{
                width: "100%",
                background: sendBusy ? "#7C9C93" : "#0F6A5C",
                color: "#FBF9F4",
                border: "none",
                borderRadius: 14,
                padding: 16,
                fontSize: 14.5,
                fontWeight: 700,
                marginTop: "auto",
                opacity: !sendRecipient || !sendAmount ? 0.6 : 1,
              }}
            >
              {sendBusy ? "Sending..." : "Send"}
            </button>
          </div>
        ))}

      {sendMode === "receive" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "#9C958A", textAlign: "center", margin: "0 0 20px" }}>
            Your vault address — VTXO transfers move directly between vault addresses, so this is
            the same address your vault locks BTC into. Not the same as your plain Bitcoin receive
            address, which is for funding the vault in the first place.
          </p>
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
              {vaultBusy ? "Creating your vault..." : vaultError ? "Couldn't create vault" : truncate(realVault?.p2tr?.address)}
            </span>
            <button onClick={copyAddress} style={{ background: "none", border: "none", flexShrink: 0, padding: 2 }}>
              <CopyIcon />
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: vaultError ? "#95392A" : "#9C958A", textAlign: "center", margin: "0 0 auto", lineHeight: 1.5 }}>
            {vaultError || copyLabel}
          </p>
        </div>
      )}
    </div>
  );
}
