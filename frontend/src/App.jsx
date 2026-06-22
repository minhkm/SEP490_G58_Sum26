import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import MasterDashboard from "./pages/MasterDashboard";
import AgencyDashboard from "./pages/AgencyDashboard";
import VesselListPage from "./pages/VesselListPage";
import AddVesselPage from "./pages/AddVesselPage";
import VesselDetailPage from "./pages/VesselDetailPage";
import CreateVoyagePage from "./pages/CreateVoyagePage";
import CargoPage from "./pages/CargoPage";
import AddCargoPage from "./pages/AddCargoPage";
import CargoDetailPage from "./pages/CargoDetailPage";
import VoyageListPage from "./pages/VoyageListPage";
import CrewListPage from "./pages/CrewListPage";
import AddCrewPage from "./pages/AddCrewPage";
import CrewDashboard from "./pages/CrewDashboard";
import CrewProfilePage from "./pages/CrewProfilePage";
import EngineLogPage from "./pages/EngineLogPage";
import RequireRole from "./components/RequireRole";
import { CARGO_ROLES } from "./config/roles";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/master-dashboard" element={<MasterDashboard />} />
        <Route path="/agency-dashboard" element={<AgencyDashboard />} />
        <Route path="/vessels" element={<VesselListPage />} />
        <Route path="/vessels/new" element={<AddVesselPage />} />
        <Route path="/vessels/edit/:id" element={<AddVesselPage />} />
        <Route path="/vessels/view/:id" element={<VesselDetailPage />} />
        <Route path="/voyages" element={<VoyageListPage />} />
        <Route path="/voyages/new" element={<CreateVoyagePage />} />
        <Route
          path="/cargos"
          element={
            <RequireRole allow={CARGO_ROLES}>
              <CargoPage />
            </RequireRole>
          }
        />
        <Route
          path="/cargos/new"
          element={
            <RequireRole allow={CARGO_ROLES}>
              <AddCargoPage />
            </RequireRole>
          }
        />
        <Route
          path="/cargos/edit/:id"
          element={
            <RequireRole allow={CARGO_ROLES}>
              <AddCargoPage />
            </RequireRole>
          }
        />
        <Route
          path="/cargos/view/:id"
          element={
            <RequireRole allow={CARGO_ROLES}>
              <CargoDetailPage />
            </RequireRole>
          }
        />
        <Route path="/crews" element={<CrewListPage />} />
        <Route path="/crews/new" element={<AddCrewPage />} />
        <Route path="/crews/edit/:id" element={<AddCrewPage />} />
        <Route path="/crew-dashboard" element={<CrewDashboard />} />
        <Route path="/crew-profile" element={<CrewProfilePage />} />
        <Route path="/engine-logs" element={<EngineLogPage />} />
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
