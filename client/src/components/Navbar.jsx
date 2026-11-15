import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "./NotificationBell";

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
      isActive(path)
        ? "bg-indigo-700 text-yellow-300 font-semibold shadow-inner"
        : "text-indigo-100 hover:bg-indigo-700/50 hover:text-yellow-300"
    }`;

  const mobileNavLinkClass = (path) =>
    `block px-4 py-2.5 rounded-lg text-sm font-medium transition ${
      isActive(path)
        ? "bg-indigo-700 text-yellow-300 font-semibold shadow-inner"
        : "text-indigo-100 hover:bg-indigo-700/50 hover:text-yellow-300"
    }`;

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="bg-indigo-600 text-white shadow-md sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={closeMenu}
          className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white transition hover:opacity-95"
        >
          <span className="text-2xl">🏡</span>
          <span>Homezy</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex md:items-center md:gap-2">
          <Link to="/" className={navLinkClass("/")}>
            Home
          </Link>
          <Link to="/properties" className={navLinkClass("/properties")}>
            Properties
          </Link>
          <Link to="/property-request" className={navLinkClass("/property-request")}>
            Rental Request
          </Link>

          {isAuthenticated && user?.role === "admin" && (
            <>
              <Link to="/admin" className={navLinkClass("/admin")}>
                Admin Panel
              </Link>
              <Link to="/rental-requests" className={navLinkClass("/rental-requests")}>
                Applications
              </Link>
            </>
          )}

          {isAuthenticated && (user?.role === "tenant" || user?.role === "owner") && (
            <Link to="/rental-requests" className={navLinkClass("/rental-requests")}>
              My Requests
            </Link>
          )}
        </div>

        {/* Right Section: Desktop User & Notifications */}
        <div className="hidden md:flex md:items-center md:gap-3">
          {isAuthenticated ? (
            <>
              {/* Notification Bell */}
              <NotificationBell />

              {/* User Identity Chip */}
              <div className="flex items-center gap-2 rounded-lg bg-indigo-700/60 px-3 py-1.5 border border-indigo-500/40">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    user?.role === "admin"
                      ? "bg-purple-200 text-purple-900"
                      : user?.role === "owner"
                      ? "bg-blue-200 text-blue-900"
                      : "bg-emerald-200 text-emerald-900"
                  }`}
                >
                  {user?.role}
                </span>
                <span className="text-sm font-semibold text-slate-100 max-w-[120px] truncate" title={user?.name}>
                  {user?.name}
                </span>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-indigo-400/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 hover:text-yellow-300"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-3 py-1.5 text-sm font-medium text-white transition hover:text-yellow-300"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-white px-3.5 py-1.5 text-sm font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Header Controls: Notification Bell + Hamburger Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          {isAuthenticated && <NotificationBell />}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
            className="rounded-lg p-2 text-white hover:bg-indigo-700 focus:outline-none"
          >
            {mobileMenuOpen ? (
              <span className="text-2xl font-bold leading-none">&times;</span>
            ) : (
              <span className="text-2xl leading-none">&#9776;</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (Visible when toggled on mobile) */}
      {mobileMenuOpen && (
        <div className="border-t border-indigo-500/60 bg-indigo-650 px-4 py-4 md:hidden space-y-2 animate-fadeIn">
          {isAuthenticated && (
            <div className="mb-3 rounded-xl bg-indigo-700/70 p-3 flex items-center justify-between border border-indigo-500/40">
              <div className="flex items-center gap-2.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    user?.role === "admin"
                      ? "bg-purple-200 text-purple-900"
                      : user?.role === "owner"
                      ? "bg-blue-200 text-blue-900"
                      : "bg-emerald-200 text-emerald-900"
                  }`}
                >
                  {user?.role}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{user?.name}</p>
                  <p className="text-xs text-indigo-200">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  logout();
                }}
                className="rounded-lg border border-indigo-400 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-800"
              >
                Logout
              </button>
            </div>
          )}

          <Link to="/" onClick={closeMenu} className={mobileNavLinkClass("/")}>
            🏡 Home
          </Link>
          <Link to="/properties" onClick={closeMenu} className={mobileNavLinkClass("/properties")}>
            🔍 Browse Properties
          </Link>
          <Link to="/property-request" onClick={closeMenu} className={mobileNavLinkClass("/property-request")}>
            📝 Submit Rental Request
          </Link>

          {isAuthenticated && user?.role === "admin" && (
            <>
              <Link to="/admin" onClick={closeMenu} className={mobileNavLinkClass("/admin")}>
                ⚙️ Admin Dashboard
              </Link>
              <Link to="/rental-requests" onClick={closeMenu} className={mobileNavLinkClass("/rental-requests")}>
                📋 All Applications
              </Link>
            </>
          )}

          {isAuthenticated && (user?.role === "tenant" || user?.role === "owner") && (
            <Link to="/rental-requests" onClick={closeMenu} className={mobileNavLinkClass("/rental-requests")}>
              📋 My Rental Requests
            </Link>
          )}

          {!isAuthenticated && (
            <div className="pt-3 border-t border-indigo-500/50 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={closeMenu}
                className="block text-center rounded-lg border border-white/50 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={closeMenu}
                className="block text-center rounded-lg bg-white px-4 py-2 font-bold text-indigo-600 hover:bg-indigo-50 shadow-sm"
              >
                Create Free Account
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
