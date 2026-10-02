import { useLocation, useNavigate } from "react-router-dom";
import { HomeNavIcon, HistoryIcon, ShieldIcon } from "../icons";

// Home / Activity / Guardian — the app's three real destinations. Send,
// Receive, Deposit, and Exit are actions reached FROM Home, not places you
// return to, so they don't belong in persistent navigation (they used to be
// here as Send/Exit; this correctly matches what a judge/user actually
// comes back to repeatedly vs. a one-off flow they start and finish).
const TABS = [
  { path: "/app", label: "Home", Icon: HomeNavIcon },
  { path: "/app/activity", label: "Activity", Icon: HistoryIcon },
  { path: "/app/guardian", label: "Guardian", Icon: ShieldIcon },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const colorFor = (path) => (pathname === path ? "#1C2430" : "#B3AA97");

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        display: "flex",
        background: "#FBF9F4",
        borderTop: "1px solid #EFEADD",
        padding: "10px 20px calc(10px + env(safe-area-inset-bottom))",
      }}
    >
      {TABS.map(({ path, label, Icon }) => (
        <button
          key={path}
          onClick={() => navigate(path)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            padding: 6,
          }}
        >
          <Icon size={19} color={colorFor(path)} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: colorFor(path) }}>{label}</span>
        </button>
      ))}
    </div>
  );
}
