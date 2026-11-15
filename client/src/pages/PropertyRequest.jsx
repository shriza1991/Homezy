import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { properties as fallbackProperties } from "../data/properties";
import { useAuth } from "../hooks/useAuth";
import { createRentalRequest, fetchProperties } from "../services/api";

function PropertyRequest() {
  const [params] = useSearchParams();
  const { user, token, isAuthenticated } = useAuth();
  const [availableProperties, setAvailableProperties] = useState(fallbackProperties);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedData, setSubmittedData] = useState(null);

  const [formData, setFormData] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    property: params.get("property") || "",
    moveInDate: "",
    message: "",
  }));

  // Load latest property catalog for dropdown
  useEffect(() => {
    let isMounted = true;
    fetchProperties()
      .then((items) => {
        if (!isMounted) return;
        if (Array.isArray(items) && items.length > 0) {
          setAvailableProperties(items);
          const idParam = params.get("propertyId");
          if (idParam) {
            const matched = items.find((p) => String(p._id || p.id) === String(idParam));
            if (matched) {
              setFormData((prev) => (prev.property ? prev : { ...prev, property: matched.title }));
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [params]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const effectiveProperty = formData.property || params.get("property") || "";
    if (!effectiveProperty) {
      setError("Please select a property to submit your request.");
      return;
    }

    if (!isAuthenticated) {
      setError("Please log in to your Homezy account to submit a rental application.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const selectedPropObj = availableProperties.find((p) => p.title === effectiveProperty);

      const payload = {
        propertyTitle: effectiveProperty,
        propertyLocation: selectedPropObj?.location || "Mumbai",
        monthlyRent: selectedPropObj?.price || "25,000",
        propertyId: selectedPropObj?._id || null,
        phone: formData.phone || user?.phone || "Not specified",
        moveInDate: formData.moveInDate || new Date().toISOString().split("T")[0],
        message: formData.message,
      };

      const result = await createRentalRequest(payload, token);
      setSubmittedData(result);
    } catch (err) {
      setError(err.message || "Failed to submit rental request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Derive values with fallbacks to authenticated user
  const currentName = formData.name || user?.name || "";
  const currentEmail = formData.email || user?.email || "";
  const currentProperty = formData.property || params.get("property") || "";

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-16">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-lg border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-900">
          Request a Rental Property
        </h1>

        <p className="mt-2 text-slate-600">
          Submit your official rental application. Applications are saved to MongoDB and reviewed directly by the property administrator.
        </p>

        {!isAuthenticated && (
          <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
            <span>⚠️</span> You are not currently logged in.{" "}
            <Link to="/login" className="font-semibold underline hover:text-amber-900">
              Sign in
            </Link>{" "}
            or{" "}
            <Link to="/register" className="font-semibold underline hover:text-amber-900">
              create an account
            </Link>{" "}
            to persist and track your application.
          </div>
        )}

        {error && (
          <div role="alert" className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm font-medium">
            <p>{error}</p>
            {error.toLowerCase().includes("already have an active") && (
              <div className="mt-2">
                <Link
                  to="/rental-requests"
                  className="font-bold underline text-red-800 hover:text-red-950 text-xs"
                >
                  View your current applications in My Requests &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {submittedData ? (
          <div role="status" className="mt-8 rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-emerald-900">
            <div className="flex items-center gap-2 font-bold text-lg text-emerald-800">
              <span>✓</span> Rental Request Submitted Successfully
            </div>
            <p className="mt-2 text-sm text-emerald-700">
              Your rental application for <strong>{submittedData.propertyTitle}</strong> has been stored in MongoDB with status:{" "}
              <span className="font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded text-xs">
                {submittedData.status}
              </span>.
            </p>

            <div className="mt-4 rounded-lg bg-white/80 p-4 text-xs text-slate-700 space-y-1">
              <p><strong>Applicant:</strong> {submittedData.tenantName} ({submittedData.tenantEmail})</p>
              <p><strong>Target Move-in:</strong> {submittedData.moveInDate}</p>
              <p><strong>Monthly Rent:</strong> ₹{submittedData.monthlyRent}</p>
              <p><strong>Application ID:</strong> <span className="font-mono">{submittedData._id}</span></p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/rental-requests"
                className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 text-sm shadow-sm"
              >
                View My Applications History
              </Link>
              <button
                type="button"
                onClick={() => setSubmittedData(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 text-sm"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8">
            {availableProperties.find((p) => p.title === currentProperty) && (
              <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Target Property Selected
                </span>
                <p className="mt-1 font-bold text-slate-900">
                  {availableProperties.find((p) => p.title === currentProperty).title}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  📍 {availableProperties.find((p) => p.title === currentProperty).location} &bull; ₹
                  {availableProperties.find((p) => p.title === currentProperty).price} / month &bull;{" "}
                  {availableProperties.find((p) => p.title === currentProperty).type}
                </p>
              </div>
            )}

            {/* Name */}
            <div className="mb-5">
              <label htmlFor="request-name" className="mb-2 block font-medium text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                id="request-name"
                name="name"
                value={currentName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Email */}
            <div className="mb-5">
              <label htmlFor="request-email" className="mb-2 block font-medium text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                id="request-email"
                name="email"
                value={currentEmail}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Phone */}
            <div className="mb-5">
              <label htmlFor="request-phone" className="mb-2 block font-medium text-slate-700">
                Phone Number
              </label>
              <input
                type="tel"
                id="request-phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Property Dropdown */}
            <div className="mb-5">
              <label htmlFor="request-property" className="mb-2 block font-medium text-slate-700">
                Property Choice
              </label>
              <select
                id="request-property"
                name="property"
                value={currentProperty}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              >
                <option value="">Select a property</option>
                {availableProperties.map((prop) => (
                  <option key={prop._id || prop.id} value={prop.title}>
                    {prop.title} &mdash; ₹{prop.price} ({prop.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Move-In Date */}
            <div className="mb-5">
              <label htmlFor="request-movein" className="mb-2 block font-medium text-slate-700">
                Target Move-In Date
              </label>
              <input
                type="date"
                id="request-movein"
                name="moveInDate"
                value={formData.moveInDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Message */}
            <div className="mb-6">
              <label htmlFor="request-message" className="mb-2 block font-medium text-slate-700">
                Message / Tenant Requirements
              </label>
              <textarea
                id="request-message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Mention lease duration, family size, parking requirements..."
                rows="4"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isAuthenticated}
              className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Submitting Application..." : "Submit Rental Application"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default PropertyRequest;
