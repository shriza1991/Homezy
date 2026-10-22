// Demo listings: there is no property-listing API.
export const properties = [
    {
        id: 1,
        title: "Modern 2 BHK Apartment",
        description:
            "Modern apartment with spacious rooms and excellent connectivity.",
        location: "Andheri, Mumbai",
        price: "25,000",
        type: "Apartment",
        status: "Available",
    },
    {
        id: 2,
        title: "Spacious 3 BHK House",
        description:
            "Large family house located in a peaceful residential area.",
        location: "Powai, Mumbai",
        price: "40,000",
        type: "Independent House",
        status: "Available",
    },
    {
        id: 3,
        title: "Cozy 1 BHK Flat",
        description:
            "Comfortable and affordable flat suitable for working professionals.",
        location: "Bandra, Mumbai",
        price: "20,000",
        type: "Flat",
        status: "Available",
    },
    {
        id: 4,
        title: "Luxury 2 BHK Apartment",
        description:
            "Premium apartment with modern interiors and excellent amenities.",
        location: "Worli, Mumbai",
        price: "55,000",
        type: "Luxury Apartment",
        status: "Available",
    },
];


export function filterProperties(listings, search, category) {
  const query = search.trim().toLowerCase();
  return listings.filter((property) =>
    (category === "" || property.type === category) &&
    `${property.title} ${property.location}`.toLowerCase().includes(query)
  );
}
