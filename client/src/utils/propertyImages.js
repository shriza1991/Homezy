// High-quality real estate & rental property photographs from Unsplash
export const DEFAULT_PROPERTY_IMAGES = {
  Apartment:
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
  "Independent House":
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
  Flat:
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
  "Luxury Apartment":
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  Villa:
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
  Studio:
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
  default:
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
};

// Gallery collections for detailed view
export const PROPERTY_GALLERY = {
  "Modern 2 BHK Apartment": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
  ],
  "Spacious 3 BHK House": [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  ],
  "Cozy 1 BHK Flat": [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1502005229762-ee1b2b90e980?auto=format&fit=crop&w=800&q=80",
  ],
  "Luxury 2 BHK Apartment": [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
  ],
};

/**
 * Resolve the best matching image URL for a property
 */
export function getPropertyImage(property = {}) {
  if (property.image && typeof property.image === "string" && property.image.trim()) {
    return property.image;
  }
  if (Array.isArray(property.images) && property.images.length > 0 && property.images[0]) {
    return property.images[0];
  }

  // Check gallery by exact title match
  if (property.title && PROPERTY_GALLERY[property.title]) {
    return PROPERTY_GALLERY[property.title][0];
  }

  // Fallback by type
  if (property.type && DEFAULT_PROPERTY_IMAGES[property.type]) {
    return DEFAULT_PROPERTY_IMAGES[property.type];
  }

  return DEFAULT_PROPERTY_IMAGES.default;
}

/**
 * Resolve gallery photos for a property
 */
export function getPropertyGallery(property = {}) {
  if (Array.isArray(property.images) && property.images.length > 0) {
    return property.images;
  }
  if (property.title && PROPERTY_GALLERY[property.title]) {
    return PROPERTY_GALLERY[property.title];
  }
  const mainImage = getPropertyImage(property);
  return [mainImage];
}
