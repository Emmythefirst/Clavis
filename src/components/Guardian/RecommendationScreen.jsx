import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { getVaultWatchAlert } from "../../lib/vaultDisplay";
import { ChevronLeftIcon, HistoryIcon, AlertTriangleIcon, CheckIcon, GearIcon } from "../icons";

// Guardian is one security layer with two surfaces, not two competing
// Guardians: Spend Protection evaluates a payment the moment you try to send
// it (on-device, lib/guardianRules.js); Vault Watch monitors the vault
// continuously, independent of whether the app is open (real backend,
// api/guardian/*.js). This screen shows both under one roof so "which
// Guardian is protecting me" never becomes a real question.
function CheckRow({ ok, label, detail }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0" }}>
      {ok ? <CheckIcon size={15} color="#0F6A5C" strokeWidth={2.4} /> : <AlertTriangleIcon size={15} color="#B1503B" />}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1C2430" }}>{label}</div>
        {detail && <div style={{ fontSize: 11.5, color: "#9C958A", marginTop: 1 }}>{detail}</div>}
      </div>
    </div>
  );
}

export default function RecommendationScreen() {
  const navigate = useNavigate();
  const { guardianLog, guardianAllClear, guardianRules, vaultWatchStatus, vaultWatchError } = useAppState();

  const enabledRules = guardianRules.filter((r) => r.enabled);
  const lastEntry = guardianLog[0];
  const flaggedCount = guardianLog.filter((e) => e.status !== "clean").length;
  const vaultWatchAlert = getVaultWatchAlert(vaultWatchStatus);
  const check = vaultWatchStatus?.lastCheck;

  const spendProtectionOk = guardianLog.length === 0 || guardianAllClear;
  const vaultWatchOk = !vaultWatchAlert || vaultWatchAlert.level === "info";
  const overallOk = spendProtectionOk && vaultWatchOk;

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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: overallOk ? "#EAF2EF" : "#F3E2C0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          {overallOk ? <CheckIcon size={24} color="#0F6A5C" /> : <AlertTriangleIcon size={24} />}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#1C2430", marginBottom: 20 }}>
          {overallOk ? "Everything looks good" : "Action recommended"}
        </div>

        <div style={{ width: "100%", background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 16, padding: "14px 16px", marginBottom: 14, textAlign: "left" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9C958A", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
            Spend Protection · checks a payment before it sends
          </div>
          {enabledRules.length === 0 ? (
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "#9C958A" }}>No rules currently enabled.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {enabledRules.map((r) => (
                <CheckRow key={r.id} ok label={r.title} />
              ))}
            </div>
          )}
          {guardianLog.length > 0 && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#9C958A", lineHeight: 1.5 }}>
              {lastEntry.status === "clean"
                ? "Last payment was within every enabled limit."
                : `Last payment: ${lastEntry.reason}`}
              {" · "}
              {flaggedCount} of {guardianLog.length} reviewed payment{guardianLog.length === 1 ? "" : "s"} triggered a rule.
            </p>
          )}
        </div>

        <div style={{ width: "100%", background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 16, padding: "14px 16px", marginBottom: "auto", textAlign: "left" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9C958A", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
            Vault Watch · monitors the vault while you're away
          </div>
          {!vaultWatchStatus ? (
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "#9C958A", lineHeight: 1.5 }}>
              {vaultWatchError
                ? "Not connected — the Vault Watch backend didn't respond."
                : "Connecting..."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <CheckRow
                ok={check.settled}
                label="On-chain balance matches spendable balance"
                detail={check.settled ? undefined : "A real Send has diverged the two — see Exit for details"}
              />
              {check.fundingCount > 0 && (
                <CheckRow
                  ok={!check.breachDetected}
                  label={check.breachDetected ? "Watchtower flagged a spend" : "No breach flagged by Tachi's watchtower"}
                  detail={
                    check.breachDetected
                      ? vaultWatchAlert?.message
                      : check.breachCheckOk === false
                        ? "Last breach check failed — will retry"
                        : undefined
                  }
                />
              )}
              <CheckRow
                ok
                label={
                  check.fundingCount === 0
                    ? "Exit timelock"
                    : check.exitReady
                      ? "Exit timelock has matured"
                      : "Exit timelock counting down"
                }
                detail={
                  check.fundingCount === 0
                    ? "No on-chain deposit yet"
                    : check.exitReady
                      ? "Ready to withdraw unilaterally"
                      : `${check.blocksRemaining} blocks remaining`
                }
              />
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 20 }}>
          <button
            onClick={() => navigate("/app/guardian/setup")}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#1C2430", color: "#FBF9F4", border: "none", borderRadius: 14, padding: 16, fontSize: 14.5, fontWeight: 700 }}
          >
            <GearIcon color="#FBF9F4" />
            Configure rules
          </button>
          <button
            onClick={() => navigate("/app/guardian/log")}
            style={{ width: "100%", background: "none", border: "1px solid #E7E1D2", color: "#8A8478", borderRadius: 14, padding: 15, fontSize: 13.5, fontWeight: 600 }}
          >
            View activity log
          </button>
        </div>
      </div>
    </div>
  );
}
