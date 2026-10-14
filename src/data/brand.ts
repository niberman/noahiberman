// Brand configuration - easily add, remove, or reorder words
export const BrandWords = ["Pilot", "Software Engineer"] as const;

// Formatted string for display (e.g., "Pilot, Software Engineer")
export const BrandWordsString = BrandWords.join(", ");
