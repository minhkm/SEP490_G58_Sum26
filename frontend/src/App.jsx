import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MasterDashboard from "./pages/MasterDashboard";
import AddVesselPage from "./pages/AddVesselPage";
import CreateVoyagePage from "./pages/CreateVoyagePage";
import CargoPage from "./pages/CargoPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/master-dashboard" element={<MasterDashboard />} />
        <Route path="/vessels/new" element={<AddVesselPage />} />
        <Route path="/voyages/new" element={<CreateVoyagePage />} />
        <Route path="/cargos" element={<CargoPage />} />
      </Routes>
    </Router>
  );
}

// Wrapper để truyền navigate function vào LandingPage
function LandingPageWrapper() {
  const navigate = useNavigate();
  return <LandingPage onEnterSystem={() => navigate("/login")} />;
}

export default App;