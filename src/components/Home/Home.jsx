import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { getStatusMeta, getTimelockHeadline, getGuardianMeta } from "../../lib/vaultDisplay";
import {
  LogoCheckIcon,
  LockIcon,
  BoltIcon,
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
  ArrowUpCircleIcon,
  ReceiveIcon,
} from "../icons";

export default function Home() {
  const navigate = useNavigate();
  const { vault, activity, guardianResolved, openTooltip } = useAppState();

  if (!vault) return null;

  const status = getStatusMeta(vault.status);
  const timelockHeadline = getTimelockHeadline(vault.status);
  const guardian = getGuardianMeta(guardianResolved);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 20px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
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

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, background: "#1C2430", borderRadius: 20, padding: "18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <LockIcon />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#9BA3AF", letterSpacing: "0.02em" }}>
              Locked in vault
            </span>
            <button
              onClick={() => openTooltip("locked")}
              style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", opacity: 0.7 }}
            >
              <InfoIcon />
            </button>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 21, fontWeight: 600, color: "#FBF9F4", lineHeight: 1.1 }}>
            {vault.lockedBtc}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#6E7684", marginTop: 3 }}>
            {vault.lockedSats.toLocaleString()} sats
          </div>
        </div>
        <div style={{ flex: 1, background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 20, padding: "18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <BoltIcon />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#8A8478", letterSpacing: "0.02em" }}>
              Spendable
            </span>
            <button
              onClick={() => openTooltip("spendable")}
              style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", opacity: 0.7 }}
            >
              <InfoIcon color="#8A8478" />
            </button>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 21, fontWeight: 600, color: "#1C2430", lineHeight: 1.1 }}>
            {vault.spendableBtc}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#9C958A", marginTop: 3 }}>
            {vault.spendableSats.toLocaleString()} sats
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 16, padding: "14px 16px", marginBottom: 12 }}>
        <button
          onClick={() => navigate("/app/exit")}
          style={{ display: "flex", alignItems: "center", gap: 11, background: "none", border: "none", padding: 0, textAlign: "left", flex: 1, minWidth: 0 }}
        >
          <div style={{ width: 34, height: 34, borderRadius: 10, background: status.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ClockCircleIcon color={status.dot} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1C2430" }}>{timelockHeadline}</div>
            <div style={{ fontSize: 12, color: "#9C958A", marginTop: 1 }}>Tap to view exit details</div>
          </div>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button onClick={() => openTooltip("timelock")} style={{ background: "none", border: "none", padding: 6, display: "flex", alignItems: "center" }}>
            <InfoIcon size={13} color="#B3AA97" />
          </button>
          <button onClick={() => navigate("/app/exit")} style={{ background: "none", border: "none", padding: 6, display: "flex", alignItems: "center" }}>
            <ChevronRightIcon size={16} color="#C4BDAE" />
          </button>
        </div>
      </div>

      <div style={{ background: guardian.bg, borderRadius: 16, padding: "14px 16px", marginBottom: 20, transition: "background 0.3s" }}>
        <button
          onClick={() => navigate("/app/guardian")}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: guardian.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {guardianResolved ? (
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => navigate("/app/receive")}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 14, padding: "14px 6px" }}
        >
          <ReceiveIcon />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1C2430" }}>Receive</span>
        </button>
        <button
          onClick={() => navigate("/app/deposit")}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 14, padding: "14px 6px" }}
        >
          <ArrowDownToLineIcon />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1C2430" }}>Deposit</span>
        </button>
        <button
          onClick={() => navigate("/app/transfer")}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 14, padding: "14px 6px" }}
        >
          <ArrowUpRightIcon />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1C2430" }}>Send</span>
        </button>
        <button
          onClick={() => navigate("/app/exit")}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "#FFFFFF", border: "1px solid #E7E1D2", borderRadius: 14, padding: "14px 6px" }}
        >
          <ExitNavIcon size={16} color="#1C2430" />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1C2430" }}>Exit</span>
        </button>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: "#9C958A", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
        Recent activity
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {activity.map((item, i) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: i < activity.length - 1 ? "1px solid #EFEADD" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: item.type === "received" ? "#EAF2EF" : "#F1EEE6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.type === "received" ? <ArrowUpCircleIcon /> : <LockIcon />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1C2430" }}>{item.label}</div>
                <div style={{ fontSize: 11.5, color: "#9C958A" }}>{item.detail}</div>
              </div>
            </div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                color: item.type === "received" ? "#0F6A5C" : "#1C2430",
              }}
            >
              {item.type === "received" ? "+" : ""}
              {item.amountBtc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
