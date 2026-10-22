import { useState } from "react";
import PropertyCard from "../components/PropertyCard";
import { properties, filterProperties } from "../data/properties";

const categories = [...new Set(properties.map((property) => property.type))];

function Properties() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const filteredProperties = filterProperties(properties, search, category);

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold text-slate-900">Available Properties</h1>
        <p className="mt-2 text-slate-600">Explore our demo listings. These properties are not loaded from the backend.</p>
        <div className="mt-8 flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm md:flex-row md:items-end">
          <div className="flex-1">
            <label htmlFor="property-search" className="mb-2 block font-medium">Search by title or location</label>
            <input id="property-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Try Andheri or apartment" className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="property-category" className="mb-2 block font-medium">Property type</label>
            <select id="property-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500">
              <option value="">All types</option>
              {categories.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <button onClick={() => { setSearch(""); setCategory(""); }} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Clear filters</button>
        </div>
        <p role="status" className="mt-6 text-slate-600">{filteredProperties.length} properties found</p>
        {filteredProperties.length === 0 ? (
          <p className="mt-6 rounded-xl bg-white p-8 text-slate-600">No properties match your search. Try another location or clear the filters.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property) => <PropertyCard key={property.id} {...property} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default Properties;
