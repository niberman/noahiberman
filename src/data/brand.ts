// Brand configuration - easily add, remove, or reorder words
export const BrandWords = ["Founder", "Pilot", "Engineer"] as const;

// Formatted string for display (e.g., "Founder, Pilot, Engineer")
export const BrandWordsString = BrandWords.join(", ");
