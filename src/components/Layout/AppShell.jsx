import { Outlet, useLocation } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import BottomNav from "./BottomNav";
import TooltipSheet from "./TooltipSheet";

const NAV_ROUTES = new Set(["/", "/transfer", "/exit"]);

export default function AppShell() {
  const { pathname } = useLocation();
  const { exitConfirmOpen } = useAppState();
  const showNav = NAV_ROUTES.has(pathname) && !exitConfirmOpen;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        background: "#EDE8DD",
      }}
    >
      <div
        className="app-shell"
        style={{
          width: "100%",
          maxWidth: 428,
          minHeight: "100vh",
          background: "#FBF9F4",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Outlet />
        <TooltipSheet />
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
