import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { getStatusMeta, getVaultStatusBucket, getTimelockHeadline, getGuardianMeta, getVaultWatchAlert, formatBtcFromSats } from "../../lib/vaultDisplay";
import {
  LogoCheckIcon,
  LockIcon,
  InfoIcon,
  ClockCircleIcon,
  ChevronRightIcon,
  CheckIcon,
  AlertTriangleIcon,
  GearIcon,
  HistoryIcon,
  ArrowDownToLineIcon,
  ArrowUpRightIcon,
  ExitNavIcon,
  ReceiveIcon,
} from "../icons";

export default function Home() {
  const navigate = useNavigate();
  const {
    activity,
    guardianAllClear,
    guardianLog,
    guardianRules,
    vaultWatchStatus,
    exitStatus,
    vaultBalanceSats,
    vaultLoading,
    vaultBalanceError,
    refreshVaultBalance,
    fundingWalletBalanceSats,
    openTooltip,
  } = useAppState();

  const breachDetected = vaultWatchStatus?.lastCheck?.breachDetected ?? false;
  const status = getStatusMeta(getVaultStatusBucket(exitStatus, breachDetected));
  const timelockHeadline = getTimelockHeadline(exitStatus, breachDetected);
  const vaultWatchAlert = getVaultWatchAlert(vaultWatchStatus);
  const guardian = getGuardianMeta(guardianAllClear, guardianLog[0] ?? null, vaultWatchAlert);
  const guardianOk = !vaultWatchAlert || vaultWatchAlert.level === "info";
  const enabledRuleCount = guardianRules.filter((r) => r.enabled).length;

  const hasBalance = vaultBalanceSats != null && vaultBalanceSats > 0n;
  // A vault can hold real on-chain BTC while its spendable (ledger) balance
  // is 0 — exactly the diverged state Exit's own safety check explains (a
  // real Send moved the ledger balance away without touching the on-chain
  // UTXO). hasBalance alone can't tell that apart from a vault that was
  // simply never funded, so the vault card below shows the real on-chain
  // total in that case instead of silently agreeing with the ledger's 0.
  const hasOnChainFunding = (exitStatus?.funding?.length ?? 0) > 0;
  const diverged = hasOnChainFunding && !hasBalance && exitStatus?.settled === false;
  const heroSats = diverged ? exitStatus.onChainTotalSats : vaultBalanceSats ?? 0n;
  const heroBtc = formatBtcFromSats(heroSats);
  const heroSatsLabel = heroSats.toLocaleString();
  // BTC sent to the funding address but not yet moved into the vault —
  // real, but previously invisible anywhere in the UI (getFundingWalletBalance
  // existed, nothing called it). Shown only when nonzero so a vault-only
  // user never sees an extra, perpetually-zero card.
  const hasFundingWalletBalance = fundingWalletBalanceSats != null && fundingWalletBalanceSats > 0n;

  if (vaultLoading && vaultBalanceSats == null) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8A8478", maxWidth: 260 }}>
          Loading your vault...
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 20px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "#1C2430", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogoCheckIcon />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", color: "#1C2430" }}>CLAVIS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: status.bg, padding: "6px 11px", borderRadius: 100 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: status.dot }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: status.text }}>{status.label}</span>
        </div>
      </div>

      {/* One vault card, always present — what changes is its content, not
          its shape. Balance, error, empty, and diverged states used to be
          four visually unrelated cards (or, for diverged, no real-balance
          card at all); now the vault reads as one object with a state,
          rather than a tile that sometimes exists and sometimes doesn't. */}
      <div style={{ background: "#1C2430", borderRadius: 22, padding: "22px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <LockIcon color="#9BA3AF" />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9BA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Your vault
          </span>
        </div>

        {vaultBalanceError ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FBF9F4", marginBottom: 6 }}>Couldn't check your balance</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#9BA3AF", margin: "0 0 16px" }}>
              This is a connection problem, not a confirmed empty vault. Try again.
            </p>
            <button
              onClick={() => refreshVaultBalance()}
              disabled={vaultLoading}
              style={{ background: "#FBF9F4", color: "#1C2430", border: "none", borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 700 }}
            >
              {vaultLoading ? "Checking..." : "Try again"}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 30, fontWeight: 600, color: "#FBF9F4", lineHeight: 1.1 }}>
                {heroSatsLabel}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#9BA3AF" }}>sats</span>
              <button onClick={() => openTooltip("locked")} style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", opacity: 0.7 }}>
                <InfoIcon color="#9BA3AF" />
              </button>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#6E7684", marginTop: 3, marginBottom: diverged || !hasOnChainFunding ? 16 : 0 }}>
              ≈{heroBtc} BTC
            </div>

            {diverged && (
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#E8B4A3", margin: "10px 0 0" }}>
                ⚠ Spendable right now: 0 sats — a Send moved this off-chain. See Exit for why a withdrawal isn't safe to build.
              </p>
            )}

            {!hasOnChainFunding && (
              <>
                <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#9BA3AF", margin: "0 0 16px" }}>
                  Deposit BTC to open your TAURUS vault and start using Clavis.
                </p>
                <button
                  onClick={() => navigate("/app/deposit")}
                  style={{ background: "#FBF9F4", color: "#1C2430", border: "none", borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 700 }}
                >
                  Deposit BTC
                </button>
              </>
            )}

            {(hasBalance || diverged) && (
              <button
                onClick={() => navigate("/app/exit")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  borderRadius: 14,
                  padding: "12px 14px",
                  marginTop: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ClockCircleIcon size={15} color={diverged ? "#E8B4A3" : "#FBF9F4"} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#FBF9F4" }}>{timelockHeadline}</span>
                </div>
                <ChevronRightIcon size={15} color="#6E7684" />
              </button>
            )}
          </>
        )}
      </div>

      {hasFundingWalletBalance && (
        <button
          onClick={() => navigate("/app/deposit")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid #E7E1D2",
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 14,
            textAlign: "left",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9C958A", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              BTC in wallet
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 600, color: "#1C2430" }}>
              {fundingWalletBalanceSats.toLocaleString()} sats
            </div>
            <div style={{ fontSize: 11.5, color: "#9C958A", marginTop: 2 }}>Ready to deposit into your vault</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1C2430" }}>Deposit</span>
            <ChevronRightIcon size={15} color="#B8842E" />
          </div>
        </button>
      )}

      <div style={{ background: guardian.bg, borderRadius: 16, padding: "14px 16px", marginBottom: 14, transition: "background 0.3s" }}>
        <button
          onClick={() => navigate("/app/guardian")}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: guardian.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {guardianOk ? (
                <CheckIcon size={14} color={guardian.iconColor} strokeWidth={2.4} />
              ) : (
                <AlertTriangleIcon color={guardian.iconColor} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1C2430" }}>{guardian.title}</div>
              <div style={{ fontSize: 12, color: "#8A8478", marginTop: 1 }}>{guardian.subtitle}</div>
            </div>
          </div>
          <ChevronRightIcon />
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11, paddingTop: 11, borderTop: "1px solid #EBDCC0" }}>
          <span style={{ fontSize: 11.5, color: "#7A7360" }}>Spend Protection</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#5F5A4E" }}>
            {enabledRuleCount} rule{enabledRuleCount === 1 ? "" : "s"} active
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 11.5, color: "#7A7360" }}>Vault Watch</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#5F5A4E" }}>
            {vaultWatchStatus ? "Active" : "Not connected"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 11, paddingTop: 11, borderTop: "1px solid #EBDCC0" }}>
          <button
            onClick={() => navigate("/app/guardian/setup")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0 }}
          >
            <GearIcon />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#7A7360" }}>Configure Guardian</span>
          </button>
          <button
            onClick={() => navigate("/app/guardian/log")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0 }}
          >
            <HistoryIcon />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#7A7360" }}>Activity log</span>
          </button>
        </div>
      </div>

      {/* Deposit and Send are what you come back to do; Receive and Exit are
          reachable but shouldn't visually compete with them (Exit especially
          — a special, infrequent security operation, not a everyday action). */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <button
          onClick={() => navigate("/app/deposit")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: "14px 6px", fontSize: 13.5, fontWeight: 700 }}
        >
          <ArrowDownToLineIcon color="#FBF9F4" />
          Deposit
        </button>
        <button
          onClick={() => navigate("/app/transfer")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: "14px 6px", fontSize: 13.5, fontWeight: 700 }}
        >
          <ArrowUpRightIcon color="#FBF9F4" />
          Send
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, marginBottom: 24 }}>
        <button onClick={() => navigate("/app/receive")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 4 }}>
          <ReceiveIcon size={14} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#7A7360" }}>Fund wallet</span>
        </button>
        <button onClick={() => navigate("/app/exit")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 4 }}>
          <ExitNavIcon size={14} color="#7A7360" />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#7A7360" }}>Exit vault</span>
        </button>
      </div>

      {hasBalance && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#9C958A", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Recent activity
            </span>
            {activity.length > 0 && (
              <button
                onClick={() => navigate("/app/activity")}
                style={{ display: "flex", alignItems: "center", gap: 2, background: "none", border: "none", padding: 0, fontSize: 11.5, fontWeight: 600, color: "#8A8478" }}
              >
                View all
                <ChevronRightIcon size={12} color="#8A8478" />
              </button>
            )}
          </div>
          {activity.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#9C958A", lineHeight: 1.55, margin: 0 }}>
              No activity recorded on this device yet — deposits and sends made from here will show up here.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {activity.slice(0, 3).map((item, i, shown) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 0",
                    borderBottom: i < shown.length - 1 ? "1px solid #EFEADD" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#F1EEE6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.type === "sent" ? <ArrowUpRightIcon size={13} /> : <LockIcon />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1C2430" }}>{item.label}</div>
                      <div style={{ fontSize: 11.5, color: "#9C958A" }}>{item.detail}</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: "#1C2430" }}>
                    {item.type === "sent" ? "-" : ""}
                    {item.amountBtc}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
