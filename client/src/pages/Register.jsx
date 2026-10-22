import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { authRequest } from "../services/api";

function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "tenant", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const submitting = useRef(false);
  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting.current || registered) return;
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    submitting.current = true;
    setLoading(true);
    try {
      const { name, email, phone, role, password } = form;
      await authRequest("register", { name, email, phone, role, password });
      setRegistered(true);
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    } catch (error) {
      setError(error.message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-16">
      <div className="mx-auto max-w-md rounded-xl bg-white p-8 shadow-md">
        <h1 className="text-3xl font-bold text-slate-900">Create Your Homezy Account</h1>
        <p className="mt-2 text-slate-600">Register to start exploring rental properties.</p>
        {registered ? (
          <p role="status" className="mt-6 rounded-lg bg-green-100 p-4 text-green-800">Account created successfully. <Link to="/login" className="underline">Login to continue</Link>.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {[
              ["name", "Name", "text", "name"],
              ["email", "Email", "email", "email"],
              ["phone", "Phone Number", "tel", "tel"],
              ["password", "Password", "password", "new-password"],
              ["confirmPassword", "Confirm Password", "password", "new-password"],
            ].map(([name, label, type, autoComplete]) => (
              <div key={name}>
                <label htmlFor={`register-${name}`} className="mb-1 block font-medium text-slate-700">{label}</label>
                <input id={`register-${name}`} name={name} type={type} autoComplete={autoComplete} value={form[name]} onChange={handleChange} required className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
            <div>
              <label htmlFor="register-role" className="mb-1 block font-medium text-slate-700">Account type</label>
              <select id="register-role" name="role" value={form.role} onChange={handleChange} className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-indigo-500">
                <option value="tenant">Tenant</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">{loading ? "Creating account..." : "Create Account"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Register;
