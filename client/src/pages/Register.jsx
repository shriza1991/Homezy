import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { authRequest } from "../services/api";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "tenant",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const submitting = useRef(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;
  const passwordsMismatch = form.confirmPassword && form.password !== form.confirmPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting.current || registered) return;
    setError("");

    // Client-side validations
    if (form.name.trim().length < 2) {
      setError("Name must be at least 2 characters long.");
      return;
    }

    if (!form.email.includes("@") || !form.email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    const cleanPhone = form.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Phone number must contain at least 10 digits.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      const { name, email, phone, role, password } = form;
      await authRequest("register", { name, email, phone, role, password });
      setRegistered(true);
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-12 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-slate-200">
        <div className="text-center">
          <span className="text-4xl">🏡</span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Create Your Account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Join Homezy to browse properties and submit rental applications
          </p>
        </div>

        {registered ? (
          <div role="status" className="mt-6 rounded-xl bg-emerald-50 p-6 text-center border border-emerald-200 text-emerald-900">
            <span className="text-3xl">✓</span>
            <h2 className="mt-2 font-bold text-lg text-emerald-800">Account Created Successfully!</h2>
            <p className="mt-1 text-xs text-emerald-700">
              Your account has been registered in the database. You can now sign in to your dashboard.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-6 py-2.5 font-bold text-white hover:bg-indigo-700 text-sm shadow-md"
            >
              Sign In to Homezy &rarr;
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
            {/* Full Name */}
            <div>
              <label htmlFor="register-name" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Full Name
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Email Address
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="e.g. john@example.com"
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="register-phone" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Phone Number (10 Digits)
              </label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Role / Account Type */}
            <div>
              <label htmlFor="register-role" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Account Type
              </label>
              <select
                id="register-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              >
                <option value="tenant">Tenant (Browse & Rent Properties)</option>
                <option value="owner">Owner (List & Manage Properties)</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Password (min. 6 characters)
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="register-confirmPassword" className="block text-xs font-semibold uppercase text-slate-600">
                  Confirm Password
                </label>
                {passwordsMatch && (
                  <span className="text-[11px] font-bold text-emerald-600">✓ Match</span>
                )}
                {passwordsMismatch && (
                  <span className="text-[11px] font-bold text-red-500">Passwords differ</span>
                )}
              </div>
              <input
                id="register-confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
                className={`w-full rounded-lg border px-3.5 py-2 text-sm outline-none transition ${
                  passwordsMismatch
                    ? "border-red-400 focus:border-red-500 bg-red-50/30"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                }`}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div role="alert" className="rounded-lg bg-red-50 p-2.5 text-center text-xs font-medium text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 shadow-md"
            >
              {loading ? "Registering account..." : "Complete Registration"}
            </button>

            <p className="pt-2 text-center text-xs text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default Register;
