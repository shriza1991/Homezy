import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { fetchAdminData, checkServerHealth } from "../services/api";

function AdminDashboard() {
  const { user, token } = useAuth();
  const [adminData, setAdminData] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!token) return;

    Promise.all([
      fetchAdminData(token).catch((err) => ({ error: err.message })),
      checkServerHealth().catch(() => null),
    ]).then(([data, health]) => {
      if (!isMounted) return;
      if (data?.error) {
        setError(data.error);
      } else {
        setAdminData(data);
      }
      setHealthStatus(health);
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

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-700">
                Administrator
              </span>
            </div>
            <p className="mt-1 text-slate-600">
              Logged in as <strong className="text-slate-800">{user?.name}</strong> ({user?.email})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh Stats"}
            </button>
            <Link
              to="/properties"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              View Listings
            </Link>
          </div>
        </div>

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
            <p className="text-sm font-medium text-slate-500">Tenants / Owners</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {adminData?.stats ? `${adminData.stats.tenants} / ${adminData.stats.owners}` : (loading ? "..." : "1 / 0")}
            </p>
            <p className="mt-2 text-xs text-slate-500">Active user roles</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Live Properties</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {adminData?.stats?.activeListings ?? 4}
            </p>
            <p className="mt-2 text-xs text-slate-500">Available demo properties</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Backend API Health</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  healthStatus?.ok ? "bg-emerald-500" : "bg-amber-500"
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
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                            u.role === "admin"
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
