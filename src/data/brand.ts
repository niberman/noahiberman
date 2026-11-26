// Brand configuration - easily add, remove, or reorder words
export const BrandWords = ["Pilot", "Engineer"] as const;

// Formatted string for display (e.g., "Pilot, Engineer")
export const BrandWordsString = BrandWords.join(", ");
