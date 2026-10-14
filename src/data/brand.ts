// Brand configuration - easily add, remove, or reorder words
export const BrandWords = ["Pilot", "Software Engineer"] as const;

// Homepage hero h1 (and the index.html static shell that mirrors it). Noah
// kept the original hero on 2026-10-13; the footer and menu use BrandWords.
export const HeroWords = ["Founder", "Pilot", "Engineer"] as const;

// Formatted string for display (e.g., "Pilot, Software Engineer")
export const BrandWordsString = BrandWords.join(", ");
