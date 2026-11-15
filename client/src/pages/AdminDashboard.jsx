import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getPropertyImage } from "../utils/propertyImages";
import {
  fetchAdminData,
  checkServerHealth,
  fetchProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  fetchAllRentalRequests,
  updateRentalRequestStatus,
  deleteRentalRequest,
} from "../services/api";

function AdminDashboard() {
  const { user, token } = useAuth();
  const [adminData, setAdminData] = useState(null);
  const [propertiesList, setPropertiesList] = useState([]);
  const [rentalRequests, setRentalRequests] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // New property form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProp, setNewProp] = useState({
    title: "",
    location: "",
    price: "",
    type: "Apartment",
    description: "",
    bedrooms: "2 BHK",
  });

  // Edit property modal state
  const [editingProperty, setEditingProperty] = useState(null);

  // Review application modal state
  const [reviewModal, setReviewModal] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!token) return;

    Promise.all([
      fetchAdminData(token).catch((err) => ({ error: err.message })),
      checkServerHealth().catch(() => null),
      fetchProperties().catch(() => []),
      fetchAllRentalRequests(token).catch(() => []),
    ]).then(([data, health, properties, requests]) => {
      if (!isMounted) return;
      if (data?.error) {
        setError(data.error);
      } else {
        setAdminData(data);
      }
      setHealthStatus(health);
      setPropertiesList(properties || []);
      setRentalRequests(requests || []);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [token, refreshTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    if (!newProp.title || !newProp.location || !newProp.price || !newProp.description) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    setActionMessage("");
    try {
      await createProperty(newProp, token);
      setActionMessage(`Property "${newProp.title}" created successfully in MongoDB!`);
      setNewProp({
        title: "",
        location: "",
        price: "",
        type: "Apartment",
        description: "",
        bedrooms: "2 BHK",
      });
      setShowAddForm(false);
      handleRefresh();
    } catch (err) {
      alert(`Error creating property: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditProperty = (prop) => {
    setEditingProperty({
      id: prop._id || prop.id,
      title: prop.title || "",
      location: prop.location || "",
      price: prop.price || "",
      type: prop.type || "Apartment",
      status: prop.status || "Available",
      bedrooms: prop.bedrooms || "2 BHK",
      description: prop.description || "",
    });
  };

  const handleSaveEditProperty = async (e) => {
    e.preventDefault();
    if (!editingProperty) return;

    setIsSubmitting(true);
    setActionMessage("");

    try {
      await updateProperty(editingProperty.id, editingProperty, token);
      setActionMessage(`Property "${editingProperty.title}" updated successfully!`);
      setEditingProperty(null);
      handleRefresh();
    } catch (err) {
      alert(`Failed to update property: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProperty = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete listing "${title}"?`)) return;

    setActionMessage("");
    try {
      await deleteProperty(id, token);
      setActionMessage(`Listing "${title}" removed.`);
      handleRefresh();
    } catch (err) {
      alert(`Failed to delete property: ${err.message}`);
    }
  };

  // Open the review modal
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

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModal) return;

    setIsSubmitting(true);
    setActionMessage("");

    try {
      await updateRentalRequestStatus(reviewModal.id, reviewModal.status, token, {
        adminNotes: reviewModal.adminNotes,
        updatePropertyStatus: reviewModal.updatePropertyStatus,
      });

      setActionMessage(
        `Application for "${reviewModal.propertyTitle}" marked as ${reviewModal.status}.${reviewModal.updatePropertyStatus ? " Property status set to Rented." : ""
        }`
      );
      setReviewModal(null);
      handleRefresh();
    } catch (err) {
      alert(`Error updating request: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRentalRequest = async (req) => {
    const reqId = req._id || req.id;
    if (!window.confirm(`Delete rental application for "${req.propertyTitle}" from ${req.tenantName}?`)) {
      return;
    }

    try {
      await deleteRentalRequest(reqId, token);
      setActionMessage(`Rental application removed.`);
      handleRefresh();
    } catch (err) {
      alert(`Failed to delete application: ${err.message}`);
    }
  };

  const pendingRequests = rentalRequests.filter((r) => r.status === "Pending");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Admin Dashboard</h1>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-700">
                Administrator
              </span>
            </div>
            <p className="mt-1 text-sm sm:text-base text-slate-600">
              Logged in as <strong className="text-slate-800">{user?.name}</strong> ({user?.email})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="rounded-lg bg-emerald-600 px-3.5 py-2 font-semibold text-white transition hover:bg-emerald-700 shadow-sm text-xs sm:text-sm"
            >
              {showAddForm ? "Cancel" : "+ Add Property Listing"}
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 text-xs sm:text-sm"
            >
              {loading ? "Refreshing..." : "Refresh Stats"}
            </button>
            <Link
              to="/rental-requests"
              className="rounded-lg border border-indigo-300 bg-indigo-50 px-3.5 py-2 font-semibold text-indigo-700 transition hover:bg-indigo-100 text-xs sm:text-sm"
            >
              All Applications ({rentalRequests.length})
            </Link>
            <Link
              to="/properties"
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-medium text-slate-700 transition hover:bg-slate-50 text-xs sm:text-sm"
            >
              Live Catalog
            </Link>
          </div>
        </div>

        {/* Action / Success Banner */}
        {actionMessage && (
          <div className="mt-6 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 font-medium">
            <span>✓ {actionMessage}</span>
            <button
              onClick={() => setActionMessage("")}
              className="text-emerald-600 hover:text-emerald-900 font-bold ml-4 text-lg leading-none"
              aria-label="Dismiss banner"
            >
              &times;
            </button>
          </div>
        )}

        {/* Tab Session Independence Banner */}
        <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/70 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              i
            </span>
            <div>
              <h2 className="font-semibold text-indigo-950">Independent Tab Session Active</h2>
              <p className="mt-1 text-sm text-indigo-800">
                This browser tab is authenticated independently as an <strong>Administrator</strong>. You can open a separate tab in this browser, log in as a Tenant or Owner, and test multi-role workflows simultaneously without session conflicts.
              </p>
            </div>
          </div>
        </div>

        {/* Add Property Form (Modal / Expandable) */}
        {showAddForm && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-white p-6 shadow-md">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add New MongoDB Property Listing</h2>
            <form onSubmit={handleCreateProperty} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Sea-Facing 2 BHK"
                  value={newProp.title}
                  onChange={(e) => setNewProp({ ...newProp, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bandra West, Mumbai"
                  value={newProp.location}
                  onChange={(e) => setNewProp({ ...newProp, location: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹ / month)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 45,000"
                  value={newProp.price}
                  onChange={(e) => setNewProp({ ...newProp, price: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property Type</label>
                <select
                  value={newProp.type}
                  onChange={(e) => setNewProp({ ...newProp, type: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="Apartment">Apartment</option>
                  <option value="Independent House">Independent House</option>
                  <option value="Flat">Flat</option>
                  <option value="Luxury Apartment">Luxury Apartment</option>
                  <option value="Villa">Villa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bedrooms / Configuration</label>
                <input
                  type="text"
                  placeholder="e.g. 2 BHK, 3 BHK Studio"
                  value={newProp.bedrooms}
                  onChange={(e) => setNewProp({ ...newProp, bedrooms: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Describe property features, location advantages, connectivity..."
                  value={newProp.description}
                  onChange={(e) => setNewProp({ ...newProp, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-600 hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-emerald-600 px-6 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? "Creating..." : "Save to MongoDB"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Property Modal */}
        {editingProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">
                  Edit Property: {editingProperty.title}
                </h3>
                <button
                  onClick={() => setEditingProperty(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveEditProperty} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editingProperty.title}
                    onChange={(e) => setEditingProperty({ ...editingProperty, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={editingProperty.location}
                    onChange={(e) => setEditingProperty({ ...editingProperty, location: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Price (₹ / month)</label>
                  <input
                    type="text"
                    required
                    value={editingProperty.price}
                    onChange={(e) => setEditingProperty({ ...editingProperty, price: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Status</label>
                  <select
                    value={editingProperty.status}
                    onChange={(e) => setEditingProperty({ ...editingProperty, status: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold outline-none focus:border-indigo-500"
                  >
                    <option value="Available">Available</option>
                    <option value="Rented">Rented</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Property Type</label>
                  <select
                    value={editingProperty.type}
                    onChange={(e) => setEditingProperty({ ...editingProperty, type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="Apartment">Apartment</option>
                    <option value="Independent House">Independent House</option>
                    <option value="Flat">Flat</option>
                    <option value="Luxury Apartment">Luxury Apartment</option>
                    <option value="Villa">Villa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Bedrooms</label>
                  <input
                    type="text"
                    value={editingProperty.bedrooms}
                    onChange={(e) => setEditingProperty({ ...editingProperty, bedrooms: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Description</label>
                  <textarea
                    rows="3"
                    value={editingProperty.description}
                    onChange={(e) => setEditingProperty({ ...editingProperty, description: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingProperty(null)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Admin Review Modal */}
        {reviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
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
                    className={`rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 ${reviewModal.status === "Approved"
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

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Users</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {adminData?.stats?.totalUsers ?? (loading ? "..." : 1)}
            </p>
            <p className="mt-2 text-xs text-slate-500">Registered platform accounts</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Pending Applications</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-600">
              {pendingRequests.length}
            </p>
            <p className="mt-2 text-xs text-slate-500">Applications awaiting review</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">MongoDB Properties</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {propertiesList.length}
            </p>
            <p className="mt-2 text-xs text-slate-500">Live property catalog items</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Backend API Health</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${healthStatus?.ok ? "bg-emerald-500" : "bg-amber-500"
                  }`}
              />
              <p className="text-2xl font-bold text-slate-900">
                {healthStatus?.ok ? "Healthy" : "Connecting..."}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Database: {healthStatus?.data?.database?.status || "checked via API"}
            </p>
          </div>
        </div>

        {/* Tenant Rental Applications Section */}
        <div className="mt-10 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tenant Rental Applications</h2>
              <p className="text-sm text-slate-500">
                Review and approve or reject persistent applications from tenants
              </p>
            </div>
            <Link to="/rental-requests" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View All Applications &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-3">Property</th>
                  <th scope="col" className="px-6 py-3">Applicant</th>
                  <th scope="col" className="px-6 py-3">Phone</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rentalRequests.length > 0 ? (
                  rentalRequests.slice(0, 5).map((req) => {
                    const reqId = req._id || req.id;
                    return (
                      <tr key={reqId} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {req.propertyTitle}
                        </td>
                        <td className="px-6 py-4">{req.tenantName} ({req.tenantEmail})</td>
                        <td className="px-6 py-4">{req.tenantPhone || "Not specified"}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${req.status === "Approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : req.status === "Rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {req.status === "Pending" ? (
                            <>
                              <button
                                onClick={() => openReviewModal(req, "Approved")}
                                className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Approve...
                              </button>
                              <button
                                onClick={() => openReviewModal(req, "Rejected")}
                                className="rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 ml-1.5"
                              >
                                Reject...
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Reviewed</span>
                          )}
                          <button
                            onClick={() => handleDeleteRentalRequest(req)}
                            className="text-xs text-slate-400 hover:text-red-600 ml-2"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                      No rental applications submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Property Catalog Management Table */}
        <div className="mt-10 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Property Catalog Management</h2>
              <p className="text-sm text-slate-500">
                List, inspect, and manage properties stored in MongoDB
              </p>
            </div>
            <span className="text-xs font-semibold uppercase text-slate-400">
              {propertiesList.length} listings
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-3">Property</th>
                  <th scope="col" className="px-6 py-3">Location</th>
                  <th scope="col" className="px-6 py-3">Rent</th>
                  <th scope="col" className="px-6 py-3">Type</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {propertiesList.length > 0 ? (
                  propertiesList.map((p) => {
                    const propId = p._id || p.id;
                    return (
                      <tr key={propId} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <img
                              src={getPropertyImage(p)}
                              alt={p.title}
                              className="h-10 w-12 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                            <Link to={`/properties/${propId}`} className="hover:text-indigo-600 font-semibold line-clamp-1">
                              {p.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4">{p.location}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">₹{p.price}</td>
                        <td className="px-6 py-4 text-xs font-medium text-indigo-600">{p.type}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === "Available"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                              }`}
                          >
                            {p.status || "Available"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Link
                            to={`/properties/${propId}`}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleStartEditProperty(p)}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 ml-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProperty(propId, p.title)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 ml-2"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                      {loading ? "Loading properties from MongoDB..." : "No properties found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Directory Table */}
        <div className="mt-10 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">Platform User Directory</h2>
            <p className="text-sm text-slate-500">
              Accounts authorized through Homezy JWT authentication
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-3">Name</th>
                  <th scope="col" className="px-6 py-3">Email</th>
                  <th scope="col" className="px-6 py-3">Role</th>
                  <th scope="col" className="px-6 py-3">Identifier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminData?.users && adminData.users.length > 0 ? (
                  adminData.users.map((u) => (
                    <tr key={u.id || u._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                      <td className="px-6 py-4">{u.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${u.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : u.role === "owner"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {u.id || u._id}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                      {loading ? "Loading users..." : "No users found or running in initial state."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
