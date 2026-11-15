import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  fetchMyRentalRequests,
  fetchAllRentalRequests,
  updateRentalRequestStatus,
} from "../services/api";

function RentalRequests() {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    let isMounted = true;
    if (!token) return;

    const loader = isAdmin
      ? fetchAllRentalRequests(token)
      : fetchMyRentalRequests(token);

    loader
      .then((data) => {
        if (!isMounted) return;
        setRequests(data || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load rental requests");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, isAdmin, refreshTrigger]);

  const handleStatusUpdate = async (id, newStatus) => {
    const notes = window.prompt(
      `Enter optional administrator note for marking as ${newStatus}:`,
      newStatus === "Approved" ? "Application approved. Welcome to Homezy!" : "Listing unavailable or application incomplete."
    );

    if (notes === null) return; // User cancelled

    setActionSuccess("");
    setError("");

    try {
      await updateRentalRequestStatus(id, newStatus, token, notes);
      setActionSuccess(`Application status successfully updated to ${newStatus}.`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to update status");
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status.toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                {isAdmin ? "Rental Applications Management" : "My Rental Applications"}
              </h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  isAdmin ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {user?.role} view
              </span>
            </div>
            <p className="mt-1 text-slate-600">
              {isAdmin
                ? "Review, approve, and manage tenant rental requests across all Homezy properties."
                : "Track the real-time review status and admin feedback for your submitted rental requests."}
            </p>
          </div>

          {!isAdmin && (
            <Link
              to="/property-request"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 text-center shadow-sm"
            >
              + New Rental Request
            </Link>
          )}
        </div>

        {/* Notifications */}
        {actionSuccess && (
          <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 font-medium">
            ✓ {actionSuccess}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Session Identity Card */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Authenticated Tab Identity</p>
              <p className="mt-1 font-bold text-slate-800">
                {user?.name} ({user?.email}) &mdash; <span className="capitalize text-indigo-600 font-semibold">{user?.role}</span>
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 self-start sm:self-center">
              MongoDB-Backed Session
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f} ({requests.filter((r) => f === "all" || r.status.toLowerCase() === f).length})
            </button>
          ))}
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="mt-8 rounded-xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="mt-4 text-slate-500 font-medium">Loading applications...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="mt-8 rounded-xl bg-white p-12 text-center shadow-sm border border-slate-200">
            <p className="text-lg font-semibold text-slate-800">No rental requests found</p>
            <p className="mt-1 text-sm text-slate-500">
              {filter !== "all"
                ? `You have no rental requests with status '${filter}'.`
                : "You haven't submitted any rental applications yet."}
            </p>
            {!isAdmin && (
              <Link
                to="/properties"
                className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 text-sm shadow-sm"
              >
                Explore Properties to Rent
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredRequests.map((req) => (
              <div
                key={req._id || req.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">{req.propertyTitle}</h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                          req.status === "Approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "Rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-600">
                      📍 {req.propertyLocation || "Mumbai"} &bull; ₹{req.monthlyRent || "25,000"} / month
                    </p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
                      <p><strong>Applicant:</strong> {req.tenantName} ({req.tenantEmail})</p>
                      <p><strong>Phone:</strong> {req.tenantPhone}</p>
                      <p><strong>Target Move-in:</strong> {req.moveInDate || "Not specified"}</p>
                      <p><strong>Submitted:</strong> {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>

                    {req.message && (
                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 italic border border-slate-100">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}

                    {req.adminNotes && (
                      <div className="mt-3 rounded-lg bg-purple-50 p-3 text-xs text-purple-900 border border-purple-100">
                        <span className="font-bold">Administrator Feedback:</span> {req.adminNotes}
                      </div>
                    )}
                  </div>

                  {/* Admin Action Buttons */}
                  {isAdmin && req.status === "Pending" && (
                    <div className="flex flex-row md:flex-col gap-2 shrink-0 self-end md:self-start">
                      <button
                        onClick={() => handleStatusUpdate(req._id || req.id, "Approved")}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Approve Request
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(req._id || req.id, "Rejected")}
                        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                      >
                        Reject Request
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RentalRequests;
