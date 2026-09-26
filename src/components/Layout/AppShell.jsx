import { Outlet, useLocation } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import BottomNav from "./BottomNav";
import TooltipSheet from "./TooltipSheet";
import UnlockScreen from "../Onboarding/UnlockScreen";

const NAV_ROUTES = new Set(["/app", "/app/transfer", "/app/exit"]);

export default function AppShell() {
  const { pathname } = useLocation();
  const { exitConfirmOpen, vaultLocked } = useAppState();
  // Onboarding routes stay reachable even with an encrypted vault present —
  // that's how a device bootstraps a wallet (or recovers one) in the first
  // place. Only the /app/* routes, which assume a decrypted mnemonic is
  // already in memory, are gated behind unlocking.
  const locked = vaultLocked && pathname.startsWith("/app");
  const showNav = NAV_ROUTES.has(pathname) && !exitConfirmOpen && !locked;

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
        {locked ? <UnlockScreen /> : <Outlet />}
        {!locked && <TooltipSheet />}
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
