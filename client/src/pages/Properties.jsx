import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PropertyCard from "../components/PropertyCard";
import { properties as fallbackProperties, filterProperties } from "../data/properties";
import { fetchProperties } from "../services/api";

function Properties() {
  const [allProperties, setAllProperties] = useState(fallbackProperties);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetchProperties()
      .then((items) => {
        if (!isMounted) return;
        if (Array.isArray(items) && items.length > 0) {
          setAllProperties(items);
        }
      })
      .catch(() => {
        // Fall back gracefully to demo listings
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = [...new Set(allProperties.map((property) => property.type))];
  const filteredProperties = filterProperties(allProperties, search, category);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb Navigation */}
        <div className="mb-4 flex items-center gap-2 text-xs sm:text-sm text-slate-500">
          <Link to="/" className="hover:text-indigo-600">Home</Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">Properties Catalog</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Available Rental Properties
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-600">
              Explore rental homes across Mumbai and find a place that fits your lifestyle and budget.
            </p>
          </div>
          {loading && (
            <span className="self-start sm:self-auto rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700 animate-pulse">
              Loading properties...
            </span>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-6 rounded-2xl bg-white p-5 sm:p-6 shadow-md border border-slate-200 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label htmlFor="property-search" className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">
                Search Listings
              </label>
              <input
                id="property-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Try 'Bandra', 'Apartment', 'Sea-facing'..."
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            <div className="w-full md:w-56">
              <label htmlFor="property-category" className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">
                Category Filter
              </label>
              <select
                id="property-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              >
                <option value="">All Categories</option>
                {categories.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {(search || category) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                }}
                className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shrink-0"
              >
                &times; Clear Filters
              </button>
            )}
          </div>

          {/* Quick Category Chips (Tap-friendly for mobile/tablet) */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="font-semibold text-slate-400 uppercase text-[10px] shrink-0 mr-1">Quick:</span>
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`rounded-full px-3 py-1 font-semibold transition shrink-0 ${
                category === ""
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Types ({allProperties.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1 font-semibold transition shrink-0 ${
                  category === cat
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat} ({allProperties.filter((p) => p.type === cat).length})
              </button>
            ))}
          </div>
        </div>

        {/* Results Count Header */}
        <div className="mt-6 flex items-center justify-between">
          <p role="status" className="text-sm font-semibold text-slate-700">
            Showing {filteredProperties.length} of {allProperties.length} listings
          </p>
          {(search || category) && (
            <span className="text-xs text-slate-500">
              Filtered by: {search ? `"${search}"` : ""} {category ? `[${category}]` : ""}
            </span>
          )}
        </div>

        {/* Property Grid or Empty State */}
        {filteredProperties.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-12 text-center shadow-md border border-slate-200">
            <span className="text-4xl">🏡</span>
            <p className="mt-2 text-lg font-bold text-slate-800">No properties match your filter.</p>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              We couldn't find any listings matching your search criteria. Try selecting another category or clearing your query.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("");
              }}
              className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-sm"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property._id || property.id}
                id={property._id || property.id}
                title={property.title}
                description={property.description}
                location={property.location}
                price={property.price}
                type={property.type}
                status={property.status}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Properties;
