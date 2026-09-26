import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { depositRealBtc, registerDepositOnLedger } from "../../lib/taurusSdk";
import { ChevronLeftIcon, CheckIcon, CopyIcon } from "../icons";

const DOT_COLOR = (active) => (active ? "#1C2430" : "#EFEADD");

function truncate(address) {
  if (!address || address.length <= 24) return address;
  return `${address.slice(0, 14)}...${address.slice(-8)}`;
}

export default function Deposit() {
  const navigate = useNavigate();
  const {
    depositStep,
    setDepositStep,
    depositAmount,
    setDepositAmount,
    walletMnemonic,
    realVault,
    ensureRealVault,
    refreshVaultBalance,
    recordDeposit,
  } = useAppState();

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [depositError, setDepositError] = useState(null);
  const [depositResult, setDepositResult] = useState(null);

  async function goToReview() {
    setDepositStep(1);
    setDepositError(null);
    if (realVault) return;
    setBusy(true);
    setBusyLabel("Creating your vault — deriving keys and fetching the validator quorum...");
    try {
      await ensureRealVault();
    } catch (err) {
      setDepositError({ reason: "vault_create_error", message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeposit() {
    setBusy(true);
    setBusyLabel("Sending your deposit to the vault, then registering it on Tachi's ledger...");
    setDepositError(null);
    const result = await depositRealBtc(walletMnemonic, realVault, depositAmount);
    setBusy(false);
    if (result.ok) {
      setDepositResult(result);
      setDepositStep(2);
      recordDeposit(result.amountSats, result.txid);
      refreshVaultBalance();
    } else {
      setDepositError(result);
    }
  }

  async function retryRegistration() {
    setBusy(true);
    setBusyLabel("Registering your deposit on Tachi's ledger...");
    const registration = await registerDepositOnLedger(walletMnemonic, depositResult.amountSats);
    setBusy(false);
    setDepositResult((prev) => ({
      ...prev,
      vtxoId: registration.ok ? registration.vtxoId : null,
      registrationError: registration.ok ? null : registration.message,
    }));
  }

  function copyFundingAddress(address) {
    navigator.clipboard?.writeText(address).catch(() => {});
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button
          onClick={() => {
            setDepositStep(0);
            navigate("/app");
          }}
          style={{ background: "none", border: "none", padding: 4 }}
        >
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
            <p style={{ fontSize: 12, color: "#B3AA97", marginTop: 10 }}>signet test BTC — worthless, for demo only</p>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: "auto" }}>
            {["0.0001", "0.001", "0.01"].map((amt) => {
              const active = depositAmount === amt;
              return (
                <button
                  key={amt}
                  onClick={() => setDepositAmount(amt)}
                  style={{
                    background: active ? "#1C2430" : "#F1EEE6",
                    border: "none",
                    borderRadius: 100,
                    padding: "9px 16px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: active ? "#FBF9F4" : "#5F5A4E",
                  }}
                >
                  {amt}
                </button>
              );
            })}
          </div>
          <button
            onClick={goToReview}
            style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: 20 }}
          >
            Continue
          </button>
        </div>
      )}

      {depositStep === 1 && busy && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", maxWidth: 260 }}>{busyLabel}</p>
        </div>
      )}

      {depositStep === 1 && !busy && depositError?.reason === "insufficient_funds" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1C2430", marginBottom: 6 }}>This wallet needs signet BTC first</div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#8A8478", margin: 0 }}>
              Your funding wallet has {depositError.availableSats.toString()} sats — send test signet BTC to the
              address below from a public signet faucet, then try again.
            </p>
          </div>
          <div style={{ width: "100%", background: "#F1EEE6", borderRadius: 13, padding: "13px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#5F5A4E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {truncate(depositError.fundingAddress)}
            </span>
            <button onClick={() => copyFundingAddress(depositError.fundingAddress)} style={{ background: "none", border: "none", flexShrink: 0, padding: 2 }}>
              <CopyIcon />
            </button>
          </div>
          <button
            onClick={confirmDeposit}
            style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: "auto" }}
          >
            I've sent funds — try again
          </button>
        </div>
      )}

      {depositStep === 1 && !busy && depositError && depositError.reason !== "insufficient_funds" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#95392A", marginBottom: 6 }}>Something went wrong</div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#8A8478", margin: 0 }}>{depositError.message}</p>
          </div>
          <button
            onClick={realVault ? confirmDeposit : goToReview}
            style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: "auto" }}
          >
            Try again
          </button>
        </div>
      )}

      {depositStep === 1 && !busy && !depositError && realVault && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 30, fontWeight: 600, color: "#1C2430" }}>
              {depositAmount} BTC
            </div>
            <div style={{ fontSize: 12.5, color: "#9C958A", marginTop: 4 }}>locks into your TAURUS vault</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#B3AA97", marginTop: 8 }}>
              {truncate(realVault.p2tr.address)}
            </div>
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
            onClick={confirmDeposit}
            style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: "auto" }}
          >
            Confirm deposit
          </button>
        </div>
      )}

      {depositStep === 2 && depositResult && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 20 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#EAF2EF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <CheckIcon />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1C2430", marginBottom: 6 }}>Vault created</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#8A8478", margin: "0 0 12px", maxWidth: 280 }}>
            Your {depositAmount} BTC is locked and secured on-chain. Timelock started just now.
          </p>
          <div style={{ width: "100%", background: "#F1EEE6", borderRadius: 13, padding: "13px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#9C958A", marginBottom: 4 }}>Transaction ID</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#5F5A4E", wordBreak: "break-all" }}>
              {depositResult.txid}
            </div>
          </div>

          {busy && (
            <p style={{ fontSize: 12.5, color: "#8A8478", margin: "0 0 auto" }}>{busyLabel}</p>
          )}

          {!busy && depositResult.vtxoId && (
            <div style={{ width: "100%", background: "#EAF2EF", borderRadius: 13, padding: "13px 14px", marginBottom: "auto" }}>
              <div style={{ fontSize: 11, color: "#0F6A5C", marginBottom: 4 }}>Registered on Tachi's ledger — ready to send</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#0F6A5C", wordBreak: "break-all" }}>
                {depositResult.vtxoId}
              </div>
            </div>
          )}

          {!busy && depositResult.registrationError && (
            <div style={{ width: "100%", background: "#FBE9E4", borderRadius: 13, padding: "13px 14px", marginBottom: "auto", textAlign: "left" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#95392A", marginBottom: 4 }}>
                On-chain, but not yet registered for sending
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: "#95392A", margin: "0 0 10px" }}>
                Your BTC is safely locked in the vault on-chain — that part is done. Registering it on
                Tachi's ledger (required before you can send from it) failed: {depositResult.registrationError}
              </p>
              <button
                onClick={retryRegistration}
                style={{ width: "100%", background: "#95392A", color: "#FBF9F4", border: "none", borderRadius: 10, padding: 10, fontSize: 12.5, fontWeight: 700 }}
              >
                Retry registration
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setDepositStep(0);
              navigate("/app");
            }}
            style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: 20 }}
          >
            View vault
          </button>
        </div>
      )}
    </div>
  );
}
