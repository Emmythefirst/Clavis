import { useLocation, useNavigate } from "react-router-dom";
import { HomeNavIcon, ArrowUpRightIcon, ExitNavIcon } from "../icons";

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
      <button
        onClick={() => navigate("/app")}
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
        <HomeNavIcon color={colorFor("/app")} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: colorFor("/app") }}>Home</span>
      </button>
      <button
        onClick={() => navigate("/app/transfer")}
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
        <ArrowUpRightIcon size={19} color={colorFor("/app/transfer")} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: colorFor("/app/transfer") }}>
          Send
        </span>
      </button>
      <button
        onClick={() => navigate("/app/exit")}
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
        <ExitNavIcon color={colorFor("/app/exit")} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: colorFor("/app/exit") }}>Exit</span>
      </button>
    </div>
  );
}
