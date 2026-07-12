import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Guards a route behind authentication, and optionally behind a set of
 * allowed roles. Unauthenticated users are sent to /login (preserving the
 * page they were headed to). Authenticated users lacking the right role are
 * sent to /dashboard with a restricted-access message handled by the page.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace state={{ restricted: true }} />;
  }

  return children;
}
