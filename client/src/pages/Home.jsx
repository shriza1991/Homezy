import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PropertyCard from "../components/PropertyCard";
import { properties as fallbackProperties } from "../data/properties";
import { fetchProperties } from "../services/api";

function Home() {
  const [featuredProperties, setFeaturedProperties] = useState(fallbackProperties.slice(0, 3));

  useEffect(() => {
    let isMounted = true;
    fetchProperties()
      .then((items) => {
        if (!isMounted) return;
        if (Array.isArray(items) && items.length > 0) {
          setFeaturedProperties(items.slice(0, 3));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-slate-100 px-6 py-20 text-center">
        <h1 className="text-3xl font-bold text-indigo-600 md:text-5xl lg:text-6xl">
          Find Your Perfect Home
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg lg:text-xl">
          Find your next home in Mumbai. Explore rental properties, compare prices, and apply with ease.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/properties"
            className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 shadow-md"
          >
            Explore All Properties
          </Link>
          <Link
            to="/register"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                Featured Properties
              </h2>
              <p className="mt-1 text-slate-500">
                Hand-picked listings available for immediate occupancy
              </p>
            </div>
            <Link
              to="/properties"
              className="text-indigo-600 font-semibold hover:text-indigo-800 transition flex items-center gap-1"
            >
              View all listings &rarr;
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map((property) => (
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
        </div>
      </section>
    </div>
  );
}

export default Home;
