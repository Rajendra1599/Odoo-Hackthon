import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import VehicleRegistry from './pages/VehicleRegistry.jsx';
import DriverManagement from './pages/DriverManagement.jsx';
import TripManagement from './pages/TripManagement.jsx';
import Maintenance from './pages/Maintenance.jsx';
import FuelExpense from './pages/FuelExpense.jsx';
import Reports from './pages/Reports.jsx';

function Protected({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/vehicles" element={<Protected><VehicleRegistry /></Protected>} />
        <Route path="/drivers" element={<Protected><DriverManagement /></Protected>} />
        <Route path="/trips" element={<Protected><TripManagement /></Protected>} />
        <Route path="/maintenance" element={<Protected><Maintenance /></Protected>} />
        <Route path="/fuel-expense" element={<Protected><FuelExpense /></Protected>} />
        <Route
          path="/reports"
          element={
            <Protected allowedRoles={['FleetManager', 'FinancialAnalyst']}>
              <Reports />
            </Protected>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ToastProvider>
  );
}
