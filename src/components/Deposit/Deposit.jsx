import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { btcToSats } from "@tachibtc/taurus-wallet-aggregator";
import { useAppState } from "../../state/AppStateContext";
import { depositRealBtc, registerDepositOnLedger } from "../../lib/taurusSdk";
import { formatBtcFromSats } from "../../lib/vaultDisplay";
import { ChevronLeftIcon, CheckIcon, CopyIcon, ShieldIcon } from "../icons";

const DOT_COLOR = (active) => (active ? "#1C2430" : "#EFEADD");
const PRESET_AMOUNTS = ["0.0001", "0.001", "0.01"];

// btcToSats throws on anything that isn't a plain decimal ("", "0.001abc",
// "."), which is expected while the user is mid-typing — this is just the
// safe wrapper so Deposit's render never crashes on an in-progress value.
function parseAmountSats(amountBtc) {
  try {
    return btcToSats(amountBtc);
  } catch {
    return null;
  }
}

// Maps depositRealBtc's real onStage callbacks to user-facing copy — each
// one fires at a genuine before/after point in the deposit (see taurusSdk.js),
// not on a timer, so this never shows a stage the app isn't actually in.
const DEPOSIT_STAGE_LABEL = {
  syncing: "Checking your wallet's balance...",
  depositing: "Sending your deposit to the vault...",
  registering: "Registering it on Tachi's ledger...",
};

function truncate(address) {
  if (!address || address.length <= 24) return address;
  return `${address.slice(0, 14)}...${address.slice(-8)}`;
}

function BusyState({ label }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "#1C2430",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          animation: "clavis-pulse 1.4s ease-in-out infinite",
        }}
      >
        <ShieldIcon color="#FBF9F4" />
      </div>
      <style>{`
        @keyframes clavis-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", maxWidth: 260, margin: 0 }}>{label}</p>
    </div>
  );
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
    refreshFundingWalletBalance,
    recordDeposit,
    fundingWalletBalanceSats,
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
    setBusyLabel(DEPOSIT_STAGE_LABEL.syncing);
    setDepositError(null);
    try {
      const result = await depositRealBtc(walletMnemonic, realVault, depositAmount, {
        onStage: (stage) => setBusyLabel(DEPOSIT_STAGE_LABEL[stage]),
      });
      if (result.ok) {
        setDepositResult(result);
        setDepositStep(2);
        recordDeposit(result.amountSats, result.txid);
        refreshVaultBalance();
        refreshFundingWalletBalance();
      } else {
        setDepositError(result);
      }
    } catch (err) {
      // Backstop only — depositRealBtc is documented to always resolve, never
      // throw. Keeping this means a regression there leaves an error on
      // screen instead of a busy screen stuck forever.
      setDepositError({ reason: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function retryRegistration() {
    setBusy(true);
    setBusyLabel("Registering your deposit on Tachi's ledger...");
    try {
      const registration = await registerDepositOnLedger(walletMnemonic, depositResult.amountSats);
      setDepositResult((prev) => ({
        ...prev,
        vtxoId: registration.ok ? registration.vtxoId : null,
        registrationError: registration.ok ? null : registration.message,
      }));
    } catch (err) {
      setDepositResult((prev) => ({ ...prev, vtxoId: null, registrationError: err.message }));
    } finally {
      setBusy(false);
    }
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

      {depositStep === 0 && (() => {
        const amountSats = parseAmountSats(depositAmount);
        const hasBalance = fundingWalletBalanceSats != null;
        const tooMuch = hasBalance && amountSats != null && amountSats > fundingWalletBalanceSats;
        const invalid = amountSats == null || amountSats <= 0n;
        return (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ textAlign: "center", margin: "24px 0 32px" }}>
              <div style={{ fontSize: 12.5, color: "#9C958A", marginBottom: 8 }}>Amount to deposit</div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
                <input
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  placeholder="0.00"
                  style={{
                    width: 180,
                    textAlign: "right",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 40,
                    fontWeight: 600,
                    color: "#1C2430",
                    background: "none",
                    border: "none",
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: 15, color: "#9C958A", fontWeight: 600 }}>BTC</span>
              </div>
              {tooMuch ? (
                <p style={{ fontSize: 12, color: "#95392A", marginTop: 10 }}>
                  More than your wallet holds ({formatBtcFromSats(fundingWalletBalanceSats)} BTC available)
                </p>
              ) : (
                <p style={{ fontSize: 12, color: "#B3AA97", marginTop: 10 }}>signet test BTC — worthless, for demo only</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: "auto" }}>
              {PRESET_AMOUNTS.map((amt) => {
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
              {hasBalance && fundingWalletBalanceSats > 0n && (
                <button
                  onClick={() => setDepositAmount(formatBtcFromSats(fundingWalletBalanceSats))}
                  style={{
                    background: "#F1EEE6",
                    border: "none",
                    borderRadius: 100,
                    padding: "9px 16px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#5F5A4E",
                  }}
                >
                  Max
                </button>
              )}
            </div>
            <button
              onClick={goToReview}
              disabled={invalid || tooMuch}
              style={{
                width: "100%",
                background: "#1C2430",
                color: "#FBF9F4",
                border: "none",
                borderRadius: 14,
                padding: 16,
                fontSize: 14.5,
                fontWeight: 700,
                marginTop: 20,
                opacity: invalid || tooMuch ? 0.6 : 1,
              }}
            >
              Continue
            </button>
          </div>
        );
      })()}

      {depositStep === 1 && busy && <BusyState label={busyLabel} />}

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

      {depositStep === 1 && !busy && depositError?.reason === "vault_already_funded" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1C2430", marginBottom: 6 }}>This vault already holds a deposit</div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#8A8478", margin: 0 }}>
              TAURUS vaults accept exactly one deposit for their lifetime — yours already has funds
              locked in it. To deposit more BTC, you'd need a separate, new vault.
            </p>
          </div>
          <button
            onClick={() => {
              setDepositStep(0);
              navigate("/app");
            }}
            style={{ width: "100%", background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700, marginTop: "auto" }}
          >
            View your vault
          </button>
        </div>
      )}

      {depositStep === 1 && !busy && depositError && !["insufficient_funds", "vault_already_funded"].includes(depositError.reason) && (
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
