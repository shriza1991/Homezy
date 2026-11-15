import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const initialRequests = [
  {
    id: "req-1",
    propertyTitle: "Modern 2 BHK Apartment",
    location: "Andheri, Mumbai",
    applicantName: "Aarav Sharma",
    applicantEmail: "aarav@example.com",
    applicantPhone: "9876543210",
    moveInDate: "2026-12-01",
    status: "Pending Review",
    monthlyRent: "₹25,000",
  },
  {
    id: "req-2",
    propertyTitle: "Luxury 2 BHK Apartment",
    location: "Worli, Mumbai",
    applicantName: "Priya Patel",
    applicantEmail: "priya@example.com",
    applicantPhone: "9812345678",
    moveInDate: "2026-11-25",
    status: "Approved",
    monthlyRent: "₹55,000",
  },
];

function RentalRequests() {
  const { user } = useAuth();
  const [requests] = useState(initialRequests);
  const [filter, setFilter] = useState("all");

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">Rental Requests</h1>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                {user?.role} view
              </span>
            </div>
            <p className="mt-1 text-slate-600">
              Manage incoming and submitted rental applications for Homezy properties.
            </p>
          </div>

          <Link
            to="/property-request"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 text-center"
          >
            + New Rental Request
          </Link>
        </div>

        {/* Tab Session Card */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Current Tab Identity</p>
              <p className="mt-1 font-bold text-slate-800">
                {user?.name} ({user?.email}) &mdash; <span className="capitalize text-indigo-600">{user?.role}</span>
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 self-start sm:self-center">
              Tab-Isolated Session
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-8 flex items-center gap-2">
          {["all", "pending", "approved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div className="mt-6 space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-900">{req.propertyTitle}</h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        req.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{req.location} &bull; {req.monthlyRent}</p>
                </div>

                <div className="text-sm sm:text-right">
                  <p className="font-semibold text-slate-700">Applicant: {req.applicantName}</p>
                  <p className="text-xs text-slate-500">{req.applicantEmail} &bull; {req.applicantPhone}</p>
                  <p className="mt-1 text-xs text-slate-400">Target Move-in: {req.moveInDate}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RentalRequests;
