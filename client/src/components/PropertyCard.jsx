import { useState } from "react";
import { Link } from "react-router-dom";
import { getPropertyImage, DEFAULT_PROPERTY_IMAGES } from "../utils/propertyImages";

function PropertyCard({
  id,
  _id,
  title,
  location,
  price,
  type,
  status,
  description,
  image,
  images,
}) {
  const propertyId = id || _id;

  const initialImage = getPropertyImage({ title, type, image, images });
  const [imgSrc, setImgSrc] = useState(initialImage);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleImageError = () => {
    // If specific image failed, fallback to type image, then default fallback
    if (imgSrc !== DEFAULT_PROPERTY_IMAGES[type] && DEFAULT_PROPERTY_IMAGES[type]) {
      setImgSrc(DEFAULT_PROPERTY_IMAGES[type]);
    } else if (imgSrc !== DEFAULT_PROPERTY_IMAGES.default) {
      setImgSrc(DEFAULT_PROPERTY_IMAGES.default);
    }
  };

  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between">
      <div>
        {/* Property Image Container */}
        <div className="relative h-48 w-full overflow-hidden bg-slate-100">
          <img
            src={imgSrc}
            alt={title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={handleImageError}
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
              imgLoaded ? "opacity-100" : "opacity-90 blur-xs"
            }`}
          />

          {/* Gradient Overlay for Text/Badge Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-black/20" />

          {/* Status Badge on top-right of image */}
          <div className="absolute top-3 right-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
                status === "Available"
                  ? "bg-emerald-500/90 text-white border border-emerald-400"
                  : "bg-amber-500/90 text-white border border-amber-400"
              }`}
            >
              {status || "Available"}
            </span>
          </div>

          {/* Property Type Chip on bottom-left of image */}
          <div className="absolute bottom-3 left-3">
            <span className="rounded-lg bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
              🏷️ {type || "Apartment"}
            </span>
          </div>
        </div>

        <div className="p-5">
          {/* Property Title */}
          <h2 className="text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
            {title}
          </h2>

          {/* Location */}
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            <span>📍</span> {location}
          </p>

          {/* Description */}
          <p className="mt-2.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {description}
          </p>

          {/* Price */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
            <div>
              <span className="text-xs uppercase font-semibold text-slate-400 block">Monthly Rent</span>
              <p className="text-xl font-extrabold text-slate-900">
                ₹{price} <span className="text-xs font-normal text-slate-500">/ mo</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-5 pt-0 flex gap-2">
        {propertyId && (
          <Link
            to={`/properties/${propertyId}`}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400"
          >
            View Details
          </Link>
        )}
        <Link
          to={`/property-request?property=${encodeURIComponent(title)}`}
          className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-indigo-700 shadow-sm"
        >
          Request to Rent
        </Link>
      </div>
    </div>
  );
}

export default PropertyCard;
