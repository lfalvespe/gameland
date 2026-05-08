/**
 * Normalizes a string by converting it to lowercase and removing accents/diacritics.
 * Example: "Bárbara" -> "barbara"
 */
export const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose combined characters into base + accent
    .replace(/[\u0300-\u036f]/g, ''); // Remove accent symbols
};
