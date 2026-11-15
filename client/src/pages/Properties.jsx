import { useState, useEffect } from "react";
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
    <div className="min-h-screen bg-slate-100 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Available Properties</h1>
            <p className="mt-2 text-slate-600">
              Browse real property listings backed by MongoDB Atlas and managed through Homezy.
            </p>
          </div>
          {loading && (
            <span className="text-sm font-medium text-indigo-600 animate-pulse">
              Syncing with database...
            </span>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-8 flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm md:flex-row md:items-end">
          <div className="flex-1">
            <label htmlFor="property-search" className="mb-2 block font-medium">
              Search by title or location
            </label>
            <input
              id="property-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Try Andheri or apartment"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="property-category" className="mb-2 block font-medium">
              Property type
            </label>
            <select
              id="property-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All types</option>
              {categories.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSearch("");
              setCategory("");
            }}
            className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 transition"
          >
            Clear filters
          </button>
        </div>

        {/* Results Count */}
        <p role="status" className="mt-6 text-slate-600 font-medium">
          {filteredProperties.length} {filteredProperties.length === 1 ? "property" : "properties"} found
        </p>

        {/* Property Grid or Empty State */}
        {filteredProperties.length === 0 ? (
          <div className="mt-6 rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-slate-700">No properties match your search.</p>
            <p className="mt-1 text-sm text-slate-500">
              Try adjusting your search query, selecting another category, or clearing the filters.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("");
              }}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
