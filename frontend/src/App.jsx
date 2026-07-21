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
import CargoTypePage from "./pages/CargoTypePage";
import SettingsPage from "./pages/SettingsPage";
import VoyageListPage from "./pages/VoyageListPage";
import CrewListPage from "./pages/CrewListPage";
import AddCrewPage from "./pages/AddCrewPage";
import CrewDashboard from "./pages/CrewDashboard";
import CrewProfilePage from "./pages/CrewProfilePage";
import EngineLogPage from "./pages/EngineLogPage";
import ShiftSchedulePage from "./pages/ShiftSchedulePage";
import ShiftViewPage from "./pages/ShiftViewPage";
import AttendancePage from "./pages/AttendancePage";
import RoutePlannerPage from "./pages/RoutePlannerPage";
import RequireRole from "./components/RequireRole";
import { CARGO_ROLES, REPORT_ROLES, DECK_LOG_ROLES, ENGINE_LOG_ROLES } from "./config/roles";
import { SHIFT_OFFICER_ROLES } from "./config/shifts";

import DeckLogPage from "./pages/DeckLogPage";
import EngineManagePage from "./pages/EngineManagePage";
import ReportListPage from "./pages/ReportListPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import MyVoyagesPage from './pages/MyVoyagesPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/my-voyages" element={<MyVoyagesPage />} />
        <Route path="/master-dashboard" element={<MasterDashboard />} />
        <Route path="/agency-dashboard" element={<AgencyDashboard />} />
        <Route path="/vessels" element={<VesselListPage />} />
        <Route path="/vessels/new" element={<AddVesselPage />} />
        <Route path="/vessels/edit/:id" element={<AddVesselPage />} />
        <Route path="/vessels/view/:id" element={<VesselDetailPage />} />
        <Route path="/voyages" element={<VoyageListPage />} />
        <Route path="/voyages/new" element={<CreateVoyagePage />} />
        <Route path="/voyages/:id/attendance" element={<AttendancePage />} />
        <Route path="/route-planner" element={<RoutePlannerPage />} />
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
        <Route
          path="/settings"
          element={
            <RequireRole allow={['Admin']}>
              <SettingsPage />
            </RequireRole>
          }
        />
        <Route
          path="/cargo-types"
          element={
            <RequireRole allow={['Admin']}>
              <CargoTypePage />
            </RequireRole>
          }
        />
        <Route path="/crews" element={<CrewListPage />} />
        <Route path="/crews/new" element={<AddCrewPage />} />
        <Route path="/crews/edit/:id" element={<AddCrewPage />} />
        <Route path="/crew-dashboard" element={<CrewDashboard />} />
        <Route path="/crew-profile" element={<CrewProfilePage />} />
        <Route path="/engine-logs" element={
          <RequireRole allow={ENGINE_LOG_ROLES}>
            <EngineLogPage />
          </RequireRole>
        } />
        <Route path="/shifts" element={<ShiftViewPage />} />
        <Route
          path="/shifts/manage"
          element={
            <RequireRole allow={SHIFT_OFFICER_ROLES}>
              <ShiftSchedulePage />
            </RequireRole>
          }
        />

        <Route path="/deck-logs" element={
          <RequireRole allow={DECK_LOG_ROLES}>
            <DeckLogPage />
          </RequireRole>
        } />
        <Route path="/engine-management" element={
          <RequireRole allow={['EngineOfficer', 'ChiefEngineer']}>
            <EngineManagePage />
          </RequireRole>
        } />
        <Route
          path="/reports"
          element={
            <RequireRole allow={REPORT_ROLES}>
              <ReportListPage />
            </RequireRole>
          }
        />
        <Route
          path="/reports/:id"
          element={
            <RequireRole allow={REPORT_ROLES}>
              <ReportDetailPage />
            </RequireRole>
          }
        />
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
