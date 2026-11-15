import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  fetchMyRentalRequests,
  fetchAllRentalRequests,
  updateRentalRequestStatus,
  deleteRentalRequest,
} from "../services/api";

function RentalRequests() {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Admin Review Modal state
  const [reviewModal, setReviewModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Tenant withdraws own pending application
  const handleWithdrawApplication = async (req) => {
    const reqId = req._id || req.id;
    if (
      !window.confirm(
        `Are you sure you want to withdraw your rental application for "${req.propertyTitle}"?`
      )
    ) {
      return;
    }

    setActionSuccess("");
    setError("");

    try {
      await deleteRentalRequest(reqId, token);
      setActionSuccess(`Application for "${req.propertyTitle}" has been withdrawn successfully.`);
      setRequests((prev) => prev.filter((r) => (r._id || r.id) !== reqId));
    } catch (err) {
      setError(err.message || "Failed to withdraw application");
    }
  };

  // Admin deletes any application
  const handleAdminDelete = async (req) => {
    const reqId = req._id || req.id;
    if (
      !window.confirm(
        `Permanently remove the application for "${req.propertyTitle}" submitted by ${req.tenantName}?`
      )
    ) {
      return;
    }

    setActionSuccess("");
    setError("");

    try {
      await deleteRentalRequest(reqId, token);
      setActionSuccess(`Application removed from platform.`);
      setRequests((prev) => prev.filter((r) => (r._id || r.id) !== reqId));
    } catch (err) {
      setError(err.message || "Failed to delete application");
    }
  };

  // Open the review modal with defaults
  const openReviewModal = (req, targetStatus) => {
    setReviewModal({
      id: req._id || req.id,
      propertyTitle: req.propertyTitle,
      tenantName: req.tenantName,
      status: targetStatus,
      adminNotes:
        targetStatus === "Approved"
          ? "Application approved. Welcome to your new home!"
          : "Property is currently unavailable or application criteria unmet.",
      updatePropertyStatus: targetStatus === "Approved",
    });
  };

  // Submit review status update
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModal) return;

    setIsSubmitting(true);
    setActionSuccess("");
    setError("");

    try {
      await updateRentalRequestStatus(reviewModal.id, reviewModal.status, token, {
        adminNotes: reviewModal.adminNotes,
        updatePropertyStatus: reviewModal.updatePropertyStatus,
      });

      setActionSuccess(
        `Application for "${reviewModal.propertyTitle}" marked as ${reviewModal.status}.${
          reviewModal.updatePropertyStatus ? " Property status set to Rented." : ""
        }`
      );
      setReviewModal(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to update application review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesFilter =
      filter === "all" || r.status?.toLowerCase() === filter.toLowerCase();
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query ||
      r.propertyTitle?.toLowerCase().includes(query) ||
      r.propertyLocation?.toLowerCase().includes(query) ||
      r.tenantName?.toLowerCase().includes(query) ||
      r.tenantEmail?.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const approvedCount = requests.filter((r) => r.status === "Approved").length;
  const rejectedCount = requests.filter((r) => r.status === "Rejected").length;

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
                : "Track the real-time review status, admin feedback, and manage your submitted applications."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isAdmin ? (
              <Link
                to="/property-request"
                className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 text-center shadow-sm text-sm"
              >
                + New Rental Request
              </Link>
            ) : (
              <Link
                to="/admin"
                className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 text-sm shadow-sm"
              >
                &larr; Admin Dashboard
              </Link>
            )}
            <Link
              to="/properties"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Browse Catalog
            </Link>
          </div>
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

        {/* Status Metrics Bar */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs font-semibold uppercase text-slate-400">Total Applications</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{requests.length}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm text-center">
            <p className="text-xs font-semibold uppercase text-amber-600">Pending Review</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm text-center">
            <p className="text-xs font-semibold uppercase text-emerald-600">Approved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{approvedCount}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm text-center">
            <p className="text-xs font-semibold uppercase text-red-600">Rejected</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{rejectedCount}</p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All", count: requests.length },
              { id: "pending", label: "Pending", count: pendingCount },
              { id: "approved", label: "Approved", count: approvedCount },
              { id: "rejected", label: "Rejected", count: rejectedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                  filter === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by property or tenant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
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
              {searchTerm
                ? `No requests matching "${searchTerm}".`
                : filter !== "all"
                ? `You have no rental requests with status '${filter}'.`
                : "No rental applications submitted yet."}
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
            {filteredRequests.map((req) => {
              const reqId = req._id || req.id;
              const propId = req.property?._id || req.property || req.propertyId;

              return (
                <div
                  key={reqId}
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
                        <p><strong>Phone:</strong> {req.tenantPhone || "Not specified"}</p>
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

                      {propId && (
                        <div className="mt-4">
                          <Link
                            to={`/properties/${propId}`}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            View Property Listing &rarr;
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Actions Column */}
                    <div className="flex flex-row md:flex-col gap-2 shrink-0 self-end md:self-start">
                      {/* Tenant Actions */}
                      {!isAdmin && req.status === "Pending" && (
                        <button
                          onClick={() => handleWithdrawApplication(req)}
                          className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Withdraw Application
                        </button>
                      )}

                      {/* Admin Review Actions */}
                      {isAdmin && (
                        <>
                          {req.status === "Pending" && (
                            <>
                              <button
                                onClick={() => openReviewModal(req, "Approved")}
                                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
                              >
                                Approve...
                              </button>
                              <button
                                onClick={() => openReviewModal(req, "Rejected")}
                                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 shadow-sm"
                              >
                                Reject...
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleAdminDelete(req)}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Admin Review Modal */}
        {reviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">
                  Review Application: {reviewModal.propertyTitle}
                </h3>
                <button
                  onClick={() => setReviewModal(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Decision Status
                  </label>
                  <select
                    value={reviewModal.status}
                    onChange={(e) =>
                      setReviewModal({ ...reviewModal, status: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold outline-none focus:border-indigo-500"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Feedback / Instructions for Applicant ({reviewModal.tenantName})
                  </label>
                  <textarea
                    rows="3"
                    value={reviewModal.adminNotes}
                    onChange={(e) =>
                      setReviewModal({ ...reviewModal, adminNotes: e.target.value })
                    }
                    placeholder="Enter approval conditions, key handover info, or rejection reason..."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {reviewModal.status === "Approved" && (
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewModal.updatePropertyStatus}
                      onChange={(e) =>
                        setReviewModal({
                          ...reviewModal,
                          updatePropertyStatus: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Automatically mark property status as <strong>Rented</strong> in catalog
                  </label>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReviewModal(null)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 ${
                      reviewModal.status === "Approved"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {isSubmitting
                      ? "Saving..."
                      : `Confirm ${reviewModal.status}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RentalRequests;
