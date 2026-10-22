import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

function Login() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setMessage("");
    try {
      await login(email, password);
      navigate("/");
    } catch (error) {
      setMessage(error.message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900 text-center">
          Welcome to Homezy
        </h1>

        <p className="mt-2 text-center text-slate-500">
          Login to find your perfect rental home
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          {/* Email */}
          <div className="mb-5">
            <label htmlFor="login-email" className="mb-2 block font-medium text-slate-700">
              Email
            </label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Password */}
          <div className="mb-5">
            <label htmlFor="login-password" className="mb-2 block font-medium text-slate-700">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Remember Me */}
          <div className="mb-6 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" />
              Remember me
            </label>

            <button
              type="button"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Forgot Password?
            </button>
          </div>

          {/* Message */}
          {message && (
            <p role="alert" className="mb-5 rounded-lg bg-slate-100 px-4 py-3 text-center text-sm text-slate-700">
              {message}
            </p>
          )}

          {/* Login */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {/* Register */}
          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
