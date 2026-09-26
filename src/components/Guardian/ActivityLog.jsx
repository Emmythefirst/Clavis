import { useNavigate } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { ChevronLeftIcon } from "../icons";

// Real outcomes Guardian can log now (see AppStateContext.logGuardianReview):
// a send that cleared every enabled check, one that triggered a rule but the
// user sent anyway, and one the user canceled after seeing why it was flagged.
const BADGE_STYLE = {
  clean: { label: "Clean", bg: "#EAF2EF", color: "#0F6A5C" },
  confirmed: { label: "Sent anyway", bg: "#FBF1E1", color: "#8A6420" },
  cancelled: { label: "Canceled", bg: "#F1EEE6", color: "#8A8478" },
};

export default function ActivityLog() {
  const navigate = useNavigate();
  const { guardianLog } = useAppState();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <button onClick={() => navigate("/app")} style={{ background: "none", border: "none", padding: 4 }}>
          <ChevronLeftIcon />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2430" }}>Guardian activity</span>
      </div>
      {guardianLog.length === 0 && (
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "#9C958A", textAlign: "center", marginTop: 40 }}>
          No Guardian activity yet — every payment you send will be reviewed against your configured rules and
          logged here.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {guardianLog.map((entry, i) => {
          const badge = BADGE_STYLE[entry.status];
          return (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
                padding: "13px 0",
                borderBottom: i < guardianLog.length - 1 ? "1px solid #EFEADD" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1C2430", marginBottom: 2 }}>{entry.title}</div>
                <div style={{ fontSize: 12, color: "#9C958A", lineHeight: 1.5, marginBottom: 3 }}>{entry.reason}</div>
                <div style={{ fontSize: 11, color: "#B3AA97" }}>{entry.date}</div>
              </div>
              <div
                style={{
                  flexShrink: 0,
                  background: badge.bg,
                  color: badge.color,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "5px 10px",
                  borderRadius: 100,
                  marginTop: 1,
                }}
              >
                {badge.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
