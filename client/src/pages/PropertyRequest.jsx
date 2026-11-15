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

  const todayStr = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    property: params.get("property") || "",
    moveInDate: todayStr,
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

  const handleDemoFill = () => {
    const defaultProp = availableProperties[0]?.title || "Modern 2 BHK Apartment";
    setFormData((prev) => ({
      ...prev,
      property: prev.property || defaultProp,
      phone: prev.phone || "9876543210",
      moveInDate: todayStr,
      message: "Hello, I am interested in this rental listing for a 1-year lease. Please review my application.",
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

    const cleanPhone = (formData.phone || user?.phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit contact phone number.");
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
        phone: formData.phone || user?.phone || "9876543210",
        moveInDate: formData.moveInDate || todayStr,
        message: formData.message || "Requesting tenancy viewing and agreement.",
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
  const selectedProp = availableProperties.find((p) => p.title === currentProperty);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        {/* Breadcrumb Navigation */}
        <div className="mb-4 flex items-center gap-2 text-xs sm:text-sm text-slate-500">
          <Link to="/" className="hover:text-indigo-600">Home</Link>
          <span>/</span>
          <Link to="/properties" className="hover:text-indigo-600">Properties</Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">Rental Application</span>
        </div>

        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Request to Rent Property
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Submit an official tenancy application. Saved directly to MongoDB with real-time alerts.
              </p>
            </div>
            {!submittedData && (
              <button
                type="button"
                onClick={handleDemoFill}
                className="self-start sm:self-auto rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
              >
                ⚡ 1-Click Sample Data
              </button>
            )}
          </div>

          {!isAuthenticated && (
            <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 text-xs sm:text-sm">
              <span>⚠️</span> You are not currently logged in.{" "}
              <Link to="/login" className="font-bold underline hover:text-amber-950">
                Sign in
              </Link>{" "}
              or{" "}
              <Link to="/register" className="font-bold underline hover:text-amber-950">
                create an account
              </Link>{" "}
              to persist and track your application.
            </div>
          )}

          {error && (
            <div role="alert" className="mt-5 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-xs sm:text-sm font-medium">
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
            <div role="status" className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-emerald-900 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-lg text-emerald-800">
                <span>✓</span> Rental Request Submitted Successfully
              </div>
              <p className="mt-2 text-xs sm:text-sm text-emerald-700">
                Your rental application for <strong>{submittedData.propertyTitle}</strong> has been stored in MongoDB with status:{" "}
                <span className="font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded text-xs">
                  {submittedData.status}
                </span>. Real-time notification was dispatched to the property administrator.
              </p>

              <div className="mt-4 rounded-lg bg-white/80 p-4 text-xs text-slate-700 space-y-1.5 border border-emerald-100">
                <p><strong>Applicant:</strong> {submittedData.tenantName} ({submittedData.tenantEmail})</p>
                <p><strong>Target Move-in:</strong> {submittedData.moveInDate}</p>
                <p><strong>Monthly Rent:</strong> ₹{submittedData.monthlyRent}</p>
                <p><strong>Application ID:</strong> <span className="font-mono text-[11px]">{submittedData._id}</span></p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/rental-requests"
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 font-bold text-white transition hover:bg-indigo-700 text-xs sm:text-sm shadow-md"
                >
                  View My Applications History
                </Link>
                <button
                  type="button"
                  onClick={() => setSubmittedData(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 text-xs sm:text-sm"
                >
                  Submit Another Application
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Selected Property Preview Banner */}
              {selectedProp && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                    Selected Listing Summary
                  </span>
                  <p className="mt-0.5 font-bold text-slate-900 text-base">{selectedProp.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    📍 {selectedProp.location} &bull; <strong className="text-indigo-700">₹{selectedProp.price}</strong> / month &bull; {selectedProp.type}
                  </p>
                </div>
              )}

              {/* Property Choice */}
              <div>
                <label htmlFor="request-property" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Property Choice
                </label>
                <select
                  id="request-property"
                  name="property"
                  value={currentProperty}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                >
                  <option value="">-- Choose a property --</option>
                  {availableProperties.map((prop) => (
                    <option key={prop._id || prop.id} value={prop.title}>
                      {prop.title} &mdash; ₹{prop.price} ({prop.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="request-name" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Applicant Name
                </label>
                <input
                  type="text"
                  id="request-name"
                  name="name"
                  value={currentName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="request-email" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Applicant Email Address
                </label>
                <input
                  type="email"
                  id="request-email"
                  name="email"
                  value={currentEmail}
                  onChange={handleChange}
                  placeholder="Enter contact email"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="request-phone" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Phone Number (10 Digits)
                </label>
                <input
                  type="tel"
                  id="request-phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              {/* Target Move-In Date */}
              <div>
                <label htmlFor="request-movein" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Target Move-In Date
                </label>
                <input
                  type="date"
                  id="request-movein"
                  name="moveInDate"
                  min={todayStr}
                  value={formData.moveInDate}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="request-message" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Applicant Notes / Requirements
                </label>
                <textarea
                  id="request-message"
                  name="message"
                  rows="3"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Share details like family size, preferred lease term, or viewing availability..."
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 shadow-md"
              >
                {loading ? "Submitting Application to MongoDB..." : "Submit Tenancy Application"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default PropertyRequest;
