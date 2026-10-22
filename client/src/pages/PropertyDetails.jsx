function PropertyDetails() {
  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Property Image */}
        <div className="h-80 rounded-xl bg-indigo-500 flex items-center justify-center shadow-md">
          <span className="text-2xl font-bold text-white">Property Image</span>
        </div>

        {/* Property Information */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Details */}
          <div className="rounded-xl bg-white p-8 shadow-md lg:col-span-2">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-slate-900">
                Modern 2 BHK Apartment
              </h1>

              <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                Available
              </span>
            </div>

            <p className="mt-3 text-lg text-slate-600">Andheri, Mumbai</p>

            <p className="mt-6 text-2xl font-bold text-indigo-600">
              ₹25,000 / month
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-slate-100 p-4 text-center">
                <p className="text-sm text-slate-500">Bedrooms</p>
                <p className="mt-1 font-bold text-slate-800">2 BHK</p>
              </div>

              <div className="rounded-lg bg-slate-100 p-4 text-center">
                <p className="text-sm text-slate-500">Bathrooms</p>
                <p className="mt-1 font-bold text-slate-800">2</p>
              </div>

              <div className="rounded-lg bg-slate-100 p-4 text-center">
                <p className="text-sm text-slate-500">Area</p>
                <p className="mt-1 font-bold text-slate-800">1200 sq.ft</p>
              </div>

              <div className="rounded-lg bg-slate-100 p-4 text-center">
                <p className="text-sm text-slate-500">Furnished</p>
                <p className="mt-1 font-bold text-slate-800">Yes</p>
              </div>
            </div>

            {/* Description */}
            <div className="mt-8">
              <h2 className="text-xl font-bold text-slate-900">Description</h2>

              <p className="mt-3 leading-7 text-slate-600">
                A modern and comfortable 2 BHK apartment located in Andheri,
                Mumbai. The property offers spacious rooms, good connectivity,
                and essential amenities suitable for families and working
                professionals.
              </p>
            </div>

            {/* Amenities */}
            <div className="mt-8">
              <h2 className="text-xl font-bold text-slate-900">Amenities</h2>

              <div className="mt-4 flex flex-wrap gap-3">
                <span className="rounded-lg bg-slate-100 px-4 py-2 text-slate-700">
                  Parking
                </span>

                <span className="rounded-lg bg-slate-100 px-4 py-2 text-slate-700">
                  Wi-Fi
                </span>

                <span className="rounded-lg bg-slate-100 px-4 py-2 text-slate-700">
                  Security
                </span>

                <span className="rounded-lg bg-slate-100 px-4 py-2 text-slate-700">
                  Lift
                </span>
              </div>
            </div>
          </div>

          {/* Rental Request */}
          <div className="h-fit rounded-xl bg-white p-6 shadow-md">
            <h2 className="text-xl font-bold text-slate-900">
              Interested in this property?
            </h2>

            <p className="mt-2 text-slate-600">
              Send a rental request to the property owner.
            </p>

            <button className="mt-6 w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700">
              Request to Rent
            </button>

            <button className="mt-3 w-full rounded-lg border border-indigo-600 px-6 py-3 font-semibold text-indigo-600 transition hover:bg-indigo-50">
              Add to Shortlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetails;
