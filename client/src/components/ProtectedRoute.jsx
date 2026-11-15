import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * Route protection component for Homezy
 * Enforces authentication and optional role-based access control.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.allowedRoles] - Optional allowed roles (e.g. ['admin', 'owner'])
 */
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isVerifying, user } = useAuth();
  const location = useLocation();

  // Show accessible loading state while verified session restoration is in progress
  if (isVerifying) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-slate-600">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
          role="status"
          aria-label="Verifying authentication"
        />
        <p className="mt-4 text-sm font-medium">Verifying authorization...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login preserving attempted destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role-based restrictions apply and user role is not authorized
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700">
            !
          </div>
          <h2 className="text-2xl font-bold text-amber-900">Access Restricted</h2>
          <p className="mt-3 text-slate-700">
            Your account role is <strong>{user?.role || "unknown"}</strong>, which does not have permission to view this section.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            This area requires one of the following roles: {allowedRoles.join(", ")}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
            >
              Return to Home
            </Link>
            <Link
              to="/properties"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Browse Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
