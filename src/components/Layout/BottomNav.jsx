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
        onClick={() => navigate("/")}
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
        <HomeNavIcon color={colorFor("/")} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: colorFor("/") }}>Home</span>
      </button>
      <button
        onClick={() => navigate("/transfer")}
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
        <ArrowUpRightIcon size={19} color={colorFor("/transfer")} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: colorFor("/transfer") }}>
          Send
        </span>
      </button>
      <button
        onClick={() => navigate("/exit")}
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
        <ExitNavIcon color={colorFor("/exit")} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: colorFor("/exit") }}>Exit</span>
      </button>
    </div>
  );
}
