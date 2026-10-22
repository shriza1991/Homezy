import { Link } from "react-router-dom";

function PropertyCard({
  title,
  location,
  price,
  type,
  status,
  description,
}) {

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl">

      {/* Property Image */}
      <div className="flex h-40 items-center justify-center bg-indigo-500 font-semibold text-white">
        Property Image
      </div>

      <div className="p-6">

        {/* Status */}
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
          {status}
        </span>

        {/* Property Title */}
        <h2 className="mt-4 text-xl font-bold text-slate-800">
          {title}
        </h2>

        {/* Property Type */}
        <p className="mt-1 text-sm font-medium text-indigo-600">
          {type}
        </p>

        {/* Description */}
        <p className="mt-2 text-slate-600">
          {description}
        </p>

        {/* Location */}
        <p className="mt-4 text-sm text-slate-500">
          📍 {location}
        </p>

        {/* Price */}
        <p className="mt-2 text-lg font-bold text-slate-900">
          ₹{price} / month
        </p>

        {/* Request Button */}
        <Link
          to={`/property-request?property=${encodeURIComponent(title)}`}
          className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
        >
          Request to Rent (Demo)
        </Link>

      </div>
    </div>
  );
}

export default PropertyCard;