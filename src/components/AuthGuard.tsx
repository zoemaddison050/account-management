import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  area: 'client' | 'admin';
}

/**
 * Validates session token and roles, directing unauthorized traffic to login.
 */
export default function AuthGuard({ area }: AuthGuardProps) {
  const { session, isAuthenticated } = useAuth();

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" replace />;
  }

  // Role validation
  if (area === 'client') {
    if (session.role !== 'client') {
      // If staff user tries to access client area, redirect to admin
      return <Navigate to="/admin/applications" replace />;
    }
  } else if (area === 'admin') {
    const isStaff = ['Administrator', 'OperationsReviewer', 'ComplianceApprover', 'AccountManager'].includes(session.role);
    if (!isStaff) {
      // If client tries to access admin area, redirect to client dashboard
      return <Navigate to="/client/dashboard" replace />;
    }
  }

  return <Outlet />;
}
