import { Routes, Route } from "react-router-dom";
import AppShell from "./components/Layout/AppShell";
import Home from "./components/Home/Home";
import Deposit from "./components/Deposit/Deposit";
import Transfer from "./components/Transfer/Transfer";
import Exit from "./components/Exit/Exit";
import RecommendationScreen from "./components/Guardian/RecommendationScreen";
import SetupScreen from "./components/Guardian/SetupScreen";
import ActivityLog from "./components/Guardian/ActivityLog";

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/transfer" element={<Transfer />} />
        <Route path="/exit" element={<Exit />} />
        <Route path="/guardian" element={<RecommendationScreen />} />
        <Route path="/guardian/setup" element={<SetupScreen />} />
        <Route path="/guardian/log" element={<ActivityLog />} />
      </Route>
    </Routes>
  );
}

export default App;
