import { Link } from "react-router-dom";

function PropertyCard({
  id,
  _id,
  title,
  location,
  price,
  type,
  status,
  description,
}) {
  const propertyId = id || _id;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between">
      <div>
        {/* Property Image Placeholder */}
        <div className="flex h-44 items-center justify-center bg-gradient-to-r from-indigo-500 to-indigo-600 font-semibold text-white">
          <span className="text-lg">🏡 {type || "Homezy Property"}</span>
        </div>

        <div className="p-6">
          {/* Status Badge */}
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              status === "Available"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {status || "Available"}
          </span>

          {/* Property Title */}
          <h2 className="mt-3 text-xl font-bold text-slate-800 line-clamp-1">
            {title}
          </h2>

          {/* Property Type */}
          <p className="mt-1 text-sm font-semibold text-indigo-600">
            {type}
          </p>

          {/* Description */}
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">
            {description}
          </p>

          {/* Location */}
          <p className="mt-4 text-sm text-slate-500 flex items-center gap-1">
            <span>📍</span> {location}
          </p>

          {/* Price */}
          <p className="mt-2 text-xl font-extrabold text-slate-900">
            ₹{price} <span className="text-sm font-normal text-slate-500">/ month</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 pt-0 flex flex-wrap gap-2">
        {propertyId && (
          <Link
            to={`/properties/${propertyId}`}
            className="flex-1 rounded-lg border border-indigo-600 px-3 py-2 text-center text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
          >
            View Details
          </Link>
        )}
        <Link
          to={`/property-request?property=${encodeURIComponent(title)}`}
          className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Request to Rent
        </Link>
      </div>
    </div>
  );
}

export default PropertyCard;
