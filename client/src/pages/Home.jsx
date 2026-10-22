import PropertyCard from "../components/PropertyCard";

import { Link } from "react-router-dom";
import { properties } from "../data/properties";

function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-slate-100 px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-indigo-600 md:text-4xl lg:text-6xl">
          Find Your Perfect Home
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg lg:text-xl">
          Discover rental properties that match your lifestyle, location, and
          budget.
        </p>

        <Link to="/properties" className="inline-block mt-8 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700">
          Explore Properties
        </Link>
      </section>

      {/* Properties Section */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">

          <h2 className="text-3xl font-bold text-slate-900">
            Featured Properties (Demo)
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {properties.slice(0, 3).map((property) => (
              <PropertyCard
                key={property.id}
                title={property.title}
                description={property.description}
                location={property.location}
                price={property.price}
                type={property.type}
                status={property.status}
              />
            ))}
          </div>

        </div>
      </section>
    </div>
  );
}

export default Home;