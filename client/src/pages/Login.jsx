import { useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Login() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [demoNotice, setDemoNotice] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const handleDemoFill = (demoRole) => {
    setMessage("");
    if (demoRole === "admin") {
      setEmail("admin@homezy.com");
      setPassword("password123");
      setDemoNotice("Filled Demo Administrator credentials. Click 'Login' to proceed.");
    } else if (demoRole === "owner1") {
      setEmail("owner1@homezy.com");
      setPassword("password123");
      setDemoNotice("Filled Demo Owner 1 credentials (owns Modern 2 BHK Apartment). Click 'Login' to proceed.");
    } else if (demoRole === "owner2") {
      setEmail("owner2@homezy.com");
      setPassword("password123");
      setDemoNotice("Filled Demo Owner 2 credentials (owns Spacious 3 BHK House). Click 'Login' to proceed.");
    } else if (demoRole === "owner3") {
      setEmail("owner3@homezy.com");
      setPassword("password123");
      setDemoNotice("Filled Demo Owner 3 credentials (owns Cozy 1 BHK Flat). Click 'Login' to proceed.");
    } else if (demoRole === "owner4") {
      setEmail("owner4@homezy.com");
      setPassword("password123");
      setDemoNotice("Filled Demo Owner 4 credentials (owns Luxury 2 BHK Apartment). Click 'Login' to proceed.");
    } else if (demoRole === "owner") {
      setEmail("owner1@homezy.com");
      setPassword("password123");
      setDemoNotice("Filled Demo Property Owner credentials. Click 'Login' to proceed.");
    } else {
      setEmail("tenant@homezy.com");
      setPassword("password123");
      setDemoNotice("Filled Demo Tenant credentials. Click 'Login' to proceed.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setMessage("Please enter both email and password.");
      return;
    }

    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setMessage("");
    setDemoNotice("");

    try {
      const result = await login(email, password);
      const destination = location.state?.from?.pathname || (result?.user?.role === "admin" ? "/admin" : "/");
      navigate(destination, { replace: true });
    } catch (error) {
      setMessage(error.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-slate-200">
        {/* Brand & Heading */}
        <div className="text-center">
          <span className="text-4xl">🏡</span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Welcome to Homezy
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to manage listings or track your rental requests
          </p>
        </div>

        {/* Demonstration Quick-Fill Pills (M7) */}
        <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
            Demonstration Accounts (1-Click Fill)
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            <button
              type="button"
              onClick={() => handleDemoFill("tenant")}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm border border-emerald-200 hover:bg-emerald-50 transition"
            >
              Demo Tenant
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill("admin")}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-purple-700 shadow-sm border border-purple-200 hover:bg-purple-50 transition"
            >
              Demo Admin
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill("owner1")}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-50 transition"
              title="Modern 2 BHK Apartment (Andheri)"
            >
              Owner 1 (2 BHK)
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill("owner2")}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-50 transition"
              title="Spacious 3 BHK House (Powai)"
            >
              Owner 2 (3 BHK)
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill("owner3")}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-50 transition"
              title="Cozy 1 BHK Flat (Bandra)"
            >
              Owner 3 (1 BHK)
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill("owner4")}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-50 transition"
              title="Luxury 2 BHK Apartment (Worli)"
            >
              Owner 4 (Luxury)
            </button>
          </div>
        </div>

        {demoNotice && (
          <p className="mt-3 text-center text-xs font-medium text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
            ✓ {demoNotice}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. tenant@homezy.com"
              required
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="block text-xs font-semibold uppercase text-slate-600">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          {/* Error Banner */}
          {message && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-center text-xs font-medium text-red-700 border border-red-200">
              {message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 shadow-md"
          >
            {loading ? "Authenticating..." : "Login to Homezy"}
          </button>

          {/* Register Link */}
          <p className="pt-2 text-center text-xs text-slate-600">
            Don't have an account yet?{" "}
            <Link
              to="/register"
              className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Create Account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
