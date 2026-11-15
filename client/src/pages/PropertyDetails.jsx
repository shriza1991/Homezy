import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchPropertyById, fetchMyRentalRequests } from "../services/api";
import { properties as fallbackProperties } from "../data/properties";
import { useAuth } from "../hooks/useAuth";

function PropertyDetails() {
  const { id } = useParams();
  const { user, token, isAuthenticated } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [existingRequest, setExistingRequest] = useState(null);

  useEffect(() => {
    let isMounted = true;

    fetchPropertyById(id)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setProperty(data);
        } else {
          // Check fallback properties
          const fallback = fallbackProperties.find(
            (p) => String(p.id) === String(id) || p.title.toLowerCase() === decodeURIComponent(id).toLowerCase()
          );
          setProperty(fallback || null);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback = fallbackProperties.find(
          (p) => String(p.id) === String(id) || p.title.toLowerCase() === decodeURIComponent(id).toLowerCase()
        );
        setProperty(fallback || null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Check if tenant already has an active or past application for this property
  useEffect(() => {
    let isMounted = true;
    if (!token || user?.role !== "tenant" || !property) return;

    fetchMyRentalRequests(token)
      .then((reqs) => {
        if (!isMounted || !Array.isArray(reqs)) return;
        const propTitle = property.title?.trim().toLowerCase();
        const propId = String(property._id || property.id || "");
        const match = reqs.find((r) => {
          const reqPropId = String(r.property?._id || r.property || r.propertyId || "");
          const reqTitle = String(r.propertyTitle || "").trim().toLowerCase();
          return (reqPropId && reqPropId === propId) || (reqTitle && reqTitle === propTitle);
        });
        setExistingRequest(match || null);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [token, user?.role, property]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-4 text-slate-600 font-medium">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-100 px-6 py-20">
        <div className="mx-auto max-w-lg rounded-xl bg-white p-8 text-center shadow-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl font-bold text-red-600">
            !
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Property Not Found</h1>
          <p className="mt-2 text-slate-600">
            The property you are looking for does not exist or may have been unlisted.
          </p>
          <Link
            to="/properties"
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
          >
            Browse All Properties
          </Link>
        </div>
      </div>
    );
  }

  const amenitiesList = Array.isArray(property.amenities) && property.amenities.length > 0
    ? property.amenities
    : ["Parking", "Wi-Fi", "Security", "Lift"];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb Navigation */}
        <div className="mb-4 sm:mb-6 flex items-center gap-2 text-xs sm:text-sm text-slate-500">
          <Link to="/" className="hover:text-indigo-600">Home</Link>
          <span>/</span>
          <Link to="/properties" className="hover:text-indigo-600">Properties</Link>
          <span>/</span>
          <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-none">{property.title}</span>
        </div>

        {/* Property Hero Banner */}
        <div className="h-56 sm:h-80 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 flex flex-col items-center justify-center shadow-lg text-white p-6 text-center">
          <span className="text-4xl sm:text-5xl">🏡</span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">{property.title}</h2>
          <p className="mt-1 sm:mt-2 text-indigo-100 text-sm sm:text-lg">📍 {property.location}</p>
        </div>

        {/* Property Information Grid */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Main Details Column */}
          <div className="rounded-2xl bg-white p-5 sm:p-8 shadow-sm lg:col-span-2 border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {property.title}
              </h1>

              <span
                className={`rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wider ${
                  property.status === "Available"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {property.status || "Available"}
              </span>
            </div>

            <p className="mt-2 text-lg text-slate-600">📍 {property.location}</p>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-indigo-600">
                ₹{property.price}
              </span>
              <span className="text-slate-500 font-medium">/ month</span>
            </div>

            {/* Spec Features Grid */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4 text-center border border-slate-100">
                <p className="text-xs font-semibold uppercase text-slate-400">Bedrooms</p>
                <p className="mt-1 font-bold text-slate-800">{property.bedrooms || "2 BHK"}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-center border border-slate-100">
                <p className="text-xs font-semibold uppercase text-slate-400">Bathrooms</p>
                <p className="mt-1 font-bold text-slate-800">{property.bathrooms || 2}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-center border border-slate-100">
                <p className="text-xs font-semibold uppercase text-slate-400">Area</p>
                <p className="mt-1 font-bold text-slate-800">{property.area || "1200 sq.ft"}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-center border border-slate-100">
                <p className="text-xs font-semibold uppercase text-slate-400">Furnishing</p>
                <p className="mt-1 font-bold text-slate-800">{property.furnished || "Yes"}</p>
              </div>
            </div>

            {/* Description Section */}
            <div className="mt-8 border-t border-slate-100 pt-8">
              <h2 className="text-xl font-bold text-slate-900">About this Property</h2>
              <p className="mt-3 leading-relaxed text-slate-600 whitespace-pre-line">
                {property.description}
              </p>
            </div>

            {/* Amenities Section */}
            <div className="mt-8 border-t border-slate-100 pt-8">
              <h2 className="text-xl font-bold text-slate-900">Amenities & Highlights</h2>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {amenitiesList.map((amenity) => (
                  <span
                    key={amenity}
                    className="rounded-lg bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 text-sm font-medium text-indigo-700 flex items-center gap-1.5"
                  >
                    <span>✓</span> {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                Ready to move in?
              </h2>

              {existingRequest ? (
                <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      Your Application
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        existingRequest.status === "Approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : existingRequest.status === "Rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {existingRequest.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-indigo-950">
                    {existingRequest.status === "Approved"
                      ? "Congratulations! Your application for this listing has been approved."
                      : existingRequest.status === "Rejected"
                      ? "Your application was reviewed and rejected."
                      : "Your application is currently under review by the administrator."}
                  </p>
                  {existingRequest.adminNotes && (
                    <div className="mt-2 rounded bg-white/80 p-2 text-xs text-slate-700 italic border border-indigo-100">
                      &ldquo;{existingRequest.adminNotes}&rdquo;
                    </div>
                  )}
                  <Link
                    to="/rental-requests"
                    className="mt-4 block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-indigo-700"
                  >
                    View in My Applications &rarr;
                  </Link>
                </div>
              ) : property.status === "Rented" ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
                  <p className="font-semibold">Listing Currently Rented</p>
                  <p className="mt-1 text-xs text-amber-800">
                    This property has already been leased out and is not currently accepting new tenancy applications.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-sm text-slate-600">
                    Submit an instant rental request directly to schedule a viewing or secure this listing.
                  </p>

                  <Link
                    to={`/property-request?property=${encodeURIComponent(property.title)}&propertyId=${property._id || property.id}`}
                    className="mt-6 block w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-center font-semibold text-white transition hover:bg-indigo-700 shadow-md"
                  >
                    Request to Rent
                  </Link>
                </>
              )}

              {!isAuthenticated && !existingRequest && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
                    Sign in
                  </Link>{" "}
                  with a Tenant account to submit an application.
                </p>
              )}

              <Link
                to="/properties"
                className="mt-4 block w-full rounded-xl border border-slate-300 px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to All Properties
              </Link>
            </div>

            {/* Verification Note */}
            <div className="rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                <span>🛡️</span> Homezy Verified Listing
              </div>
              <p className="mt-1 text-xs text-emerald-700">
                This listing is validated against the Homezy property repository.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetails;
