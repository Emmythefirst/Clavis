import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { ChevronLeftIcon, ArrowUpRightIcon, ArrowDownToLineIcon } from "../icons";

// Real outcomes Guardian can log for a completed send (see
// AppStateContext.logGuardianReview) — 'cancelled' never appears here since
// a cancelled review has no corresponding completed send to attach a badge
// to; that outcome only shows up in Guardian's own log (see the link below).
const GUARDIAN_BADGE = {
  clean: { label: "Guardian: clean", bg: "#EAF2EF", color: "#0F6A5C" },
  confirmed: { label: "Guardian: sent anyway", bg: "#FBF1E1", color: "#8A6420" },
};

export default function ActivityScreen() {
  const navigate = useNavigate();
  const { activity, guardianLog } = useAppState();

  // Correlates a sent entry to its Guardian outcome by the exact shared
  // timestamp executeSend writes to both records (see AppStateContext) —
  // not a fuzzy match, so an entry from before this correlation existed
  // simply shows no badge rather than risking a wrong one.
  function guardianBadgeFor(item) {
    if (item.type !== "sent") return null;
    const entry = guardianLog.find((e) => e.timestamp === item.timestamp);
    return entry ? GUARDIAN_BADGE[entry.status] : null;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <button onClick={() => navigate("/app")} style={{ background: "none", border: "none", padding: 4 }}>
          <ChevronLeftIcon />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2430" }}>Activity</span>
      </div>

      {activity.length === 0 ? (
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "#9C958A", textAlign: "center", marginTop: 40 }}>
          No activity recorded on this device yet — deposits and sends made from here will show up here.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {activity.map((item, i) => {
            const badge = guardianBadgeFor(item);
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "13px 0",
                  borderBottom: i < activity.length - 1 ? "1px solid #EFEADD" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "#F1EEE6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.type === "sent" ? <ArrowUpRightIcon size={14} /> : <ArrowDownToLineIcon size={14} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1C2430" }}>{item.label}</div>
                    <div style={{ fontSize: 11.5, color: "#9C958A" }}>{item.detail}</div>
                    {badge && (
                      <div
                        style={{
                          display: "inline-flex",
                          background: badge.bg,
                          color: badge.color,
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 100,
                          marginTop: 4,
                        }}
                      >
                        {badge.label}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: "#1C2430", flexShrink: 0 }}>
                  {item.type === "sent" ? "-" : "+"}
                  {item.amountBtc}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate("/app/guardian/log")}
        style={{ marginTop: 24, background: "none", border: "1px solid #E7E1D2", color: "#8A8478", borderRadius: 14, padding: 15, fontSize: 13, fontWeight: 600 }}
      >
        View Guardian's full review log
      </button>
    </div>
  );
}
