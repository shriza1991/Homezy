// Demo listings: matching real property visuals and data
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
        image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
        images: [
            "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
        ],
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
        image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80",
        images: [
            "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
        ],
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
        image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
        images: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1502005229762-ee1b2b90e980?auto=format&fit=crop&w=800&q=80",
        ],
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
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
        images: [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
        ],
    },
];

export function filterProperties(listings, search, category) {
  const query = search.trim().toLowerCase();
  return listings.filter((property) =>
    (category === "" || property.type === category) &&
    `${property.title} ${property.location}`.toLowerCase().includes(query)
  );
}
