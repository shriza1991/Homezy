import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <nav className="bg-indigo-600 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-4 md:flex-row">
        <Link to="/" className="text-2xl font-bold md:text-3xl">
          Homezy
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-5 md:gap-6">
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
            <>
              <span>Welcome, {user.name}</span>
              <button onClick={logout} className="transition hover:text-yellow-300">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="transition hover:text-yellow-300">Login</Link>
              <Link to="/register" className="transition hover:text-yellow-300">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
