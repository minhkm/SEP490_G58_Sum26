import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import MasterDashboard from "./pages/MasterDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import VesselListPage from "./pages/VesselListPage";
import AddVesselPage from "./pages/AddVesselPage";
import VesselDetailPage from "./pages/VesselDetailPage";
import CreateVoyagePage from "./pages/CreateVoyagePage";
import CargoPage from "./pages/CargoPage";
import AddCargoPage from "./pages/AddCargoPage";
import CargoDetailPage from "./pages/CargoDetailPage";
import CargoTypePage from "./pages/CargoTypePage";
import PortPage from "./pages/PortPage";
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
import SewageLogPage from "./pages/SewageLogPage";
import { CARGO_ROLES, REPORT_ROLES, DECK_LOG_ROLES, ENGINE_LOG_ROLES, ONBOARD_ROLES, CREW_DASHBOARD_ROLES } from "./config/roles";
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
        <Route path="/my-voyages" element={<RequireRole allow={ONBOARD_ROLES}><MyVoyagesPage /></RequireRole>} />
        <Route path="/master-dashboard" element={<RequireRole allow={['Master', 'ChiefOfficer']}><MasterDashboard /></RequireRole>} />
        <Route path="/admin-dashboard" element={<RequireRole allow={['Admin']}><AdminDashboard /></RequireRole>} />
        <Route path="/vessels" element={<RequireRole allow={['Admin']}><VesselListPage /></RequireRole>} />
        <Route path="/vessels/new" element={<RequireRole allow={['Admin']}><AddVesselPage /></RequireRole>} />
        <Route path="/vessels/edit/:id" element={<RequireRole allow={['Admin']}><AddVesselPage /></RequireRole>} />
        <Route path="/vessels/view/:id" element={<RequireRole allow={['Admin']}><VesselDetailPage /></RequireRole>} />
        <Route path="/voyages" element={<RequireRole allow="any"><VoyageListPage /></RequireRole>} />
        <Route path="/voyages/new" element={<RequireRole allow={['Admin']}><CreateVoyagePage /></RequireRole>} />
        <Route path="/voyages/:id/attendance" element={<RequireRole allow={['Master', 'ChiefOfficer']}><AttendancePage /></RequireRole>} />
        <Route path="/route-planner" element={<RequireRole allow={['Master', 'ChiefOfficer']}><RoutePlannerPage /></RequireRole>} />
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
        <Route
          path="/ports"
          element={
            <RequireRole allow={['Admin']}>
              <PortPage />
            </RequireRole>
          }
        />
        <Route path="/crews" element={<RequireRole allow={['Admin']}><CrewListPage /></RequireRole>} />
        <Route path="/crews/new" element={<RequireRole allow={['Admin']}><AddCrewPage /></RequireRole>} />
        <Route path="/crews/edit/:id" element={<RequireRole allow={['Admin']}><AddCrewPage /></RequireRole>} />
        <Route path="/crew-dashboard" element={<RequireRole allow={CREW_DASHBOARD_ROLES}><CrewDashboard /></RequireRole>} />
        <Route path="/crew-profile" element={<RequireRole allow={ONBOARD_ROLES}><CrewProfilePage /></RequireRole>} />
        <Route path="/engine-logs" element={
          <RequireRole allow={ENGINE_LOG_ROLES}>
            <EngineLogPage />
          </RequireRole>
        } />
        <Route path="/shifts" element={<RequireRole allow={ONBOARD_ROLES}><ShiftViewPage /></RequireRole>} />
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
                <Route path="/vessel-supplies" element={
          <RequireRole allow={['Master', 'ChiefOfficer']}>
            <EngineManagePage />
          </RequireRole>
        } />
        <Route path="/engine-management" element={
          <RequireRole allow={['EngineOfficer']}>
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
        <Route path="/sewage-logs" element={<RequireRole allow={['Master', 'ChiefOfficer', 'Admin']}><SewageLogPage /></RequireRole>} />
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
