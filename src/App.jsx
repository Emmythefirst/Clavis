import { Routes, Route } from "react-router-dom";
import AppShell from "./components/Layout/AppShell";
import Landing from "./components/Landing/Landing";
import Welcome from "./components/Onboarding/Welcome";
import GeneratingScreen from "./components/Onboarding/Create/GeneratingScreen";
import SeedDisplayScreen from "./components/Onboarding/Create/SeedDisplayScreen";
import SeedVerifyScreen from "./components/Onboarding/Create/SeedVerifyScreen";
import SuccessScreen from "./components/Onboarding/Create/SuccessScreen";
import ImportEnterScreen from "./components/Onboarding/Import/ImportEnterScreen";
import AppLockScreen from "./components/Onboarding/AppLockScreen";
import Home from "./components/Home/Home";
import ActivityScreen from "./components/Activity/ActivityScreen";
import ReceiveBTC from "./components/Receive/ReceiveBTC";
import Deposit from "./components/Deposit/Deposit";
import Transfer from "./components/Transfer/Transfer";
import Exit from "./components/Exit/Exit";
import RecommendationScreen from "./components/Guardian/RecommendationScreen";
import SetupScreen from "./components/Guardian/SetupScreen";
import ActivityLog from "./components/Guardian/ActivityLog";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<AppShell />}>
        <Route path="/onboarding/welcome" element={<Welcome />} />
        <Route path="/onboarding/create/generating" element={<GeneratingScreen />} />
        <Route path="/onboarding/create/seed" element={<SeedDisplayScreen />} />
        <Route path="/onboarding/create/verify" element={<SeedVerifyScreen />} />
        <Route path="/onboarding/create/lock" element={<AppLockScreen next="/onboarding/create/success" />} />
        <Route path="/onboarding/create/success" element={<SuccessScreen />} />
        <Route path="/onboarding/import" element={<ImportEnterScreen />} />
        <Route path="/onboarding/import/lock" element={<AppLockScreen next="/app" />} />

        <Route path="/app" element={<Home />} />
        <Route path="/app/activity" element={<ActivityScreen />} />
        <Route path="/app/receive" element={<ReceiveBTC />} />
        <Route path="/app/deposit" element={<Deposit />} />
        <Route path="/app/transfer" element={<Transfer />} />
        <Route path="/app/exit" element={<Exit />} />
        <Route path="/app/guardian" element={<RecommendationScreen />} />
        <Route path="/app/guardian/setup" element={<SetupScreen />} />
        <Route path="/app/guardian/log" element={<ActivityLog />} />
      </Route>
    </Routes>
  );
}

export default App;
