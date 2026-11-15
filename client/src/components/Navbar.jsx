import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="bg-indigo-600 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-4 md:flex-row">
        <Link to="/" className="text-2xl font-bold tracking-tight md:text-3xl">
          Homezy
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm md:text-base">
          <Link to="/" className="transition hover:text-yellow-300">
            Home
          </Link>

          <Link to="/properties" className="transition hover:text-yellow-300">
            Properties
          </Link>

          <Link
            to="/property-request"
            className="transition hover:text-yellow-300"
          >
            Rental Request
          </Link>

          {isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              {user?.role === "admin" && (
                <>
                  <Link
                    to="/admin"
                    className="rounded-lg bg-indigo-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-300 transition hover:bg-indigo-800"
                  >
                    Admin Panel
                  </Link>
                  <Link
                    to="/rental-requests"
                    className="transition hover:text-yellow-300 text-sm font-medium"
                  >
                    Applications
                  </Link>
                </>
              )}

              {(user?.role === "tenant" || user?.role === "owner") && (
                <Link
                  to="/rental-requests"
                  className="transition hover:text-yellow-300"
                >
                  My Requests
                </Link>
              )}

              <div className="flex items-center gap-2">
                {user?.role && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                      user.role === "admin"
                        ? "bg-purple-200 text-purple-900"
                        : user.role === "owner"
                        ? "bg-blue-200 text-blue-900"
                        : "bg-emerald-200 text-emerald-900"
                    }`}
                  >
                    {user.role}
                  </span>
                )}
                {user?.name && (
                  <span className="text-slate-100 font-medium">
                    {user.name}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-indigo-400 px-3 py-1 text-sm transition hover:bg-indigo-700 hover:text-yellow-300"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="transition hover:text-yellow-300">
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-white px-3 py-1.5 font-semibold text-indigo-600 transition hover:bg-indigo-50"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
