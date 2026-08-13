/**
 * Faculty Code Generation Utility
 * Rules:
 * - Take first letter of first name, first letter of middle name, and first letter of surname.
 * - Strip titles: Dr., Prof., Mr., Mrs., Ms., Er.
 * - Flag for review if fewer than 3 name tokens exist.
 */

export interface FacultyCodeResult {
  code: string;
  isFlagged: boolean;
  flagReason?: string;
}

export function generateFacultyCode(fullName: string): FacultyCodeResult {
  if (!fullName || typeof fullName !== 'string') {
    return {
      code: 'FAC',
      isFlagged: true,
      flagReason: 'Missing or invalid faculty name'
    };
  }

  // 1. Remove salutations and titles
  let cleanName = fullName
    .replace(/\b(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.|Er\.|Dr|Prof|Mr|Mrs|Ms|Er)\b/gi, '')
    .replace(/[,\(\)]/g, ' ')
    .trim();

  // 2. Split into tokens (handling dots e.g., "S. G. Rathod" or "Nirmal B. L.")
  const tokens = cleanName
    .split(/[\s.]+/)
    .filter(token => token.trim().length > 0);

  if (tokens.length >= 3) {
    // Standard rule: 1st letter of first, middle, surname
    const c1 = tokens[0][0].toUpperCase();
    const c2 = tokens[1][0].toUpperCase();
    const c3 = tokens[2][0].toUpperCase();
    return {
      code: `${c1}${c2}${c3}`,
      isFlagged: false
    };
  } else if (tokens.length === 2) {
    // 2 name parts (e.g. "Nutan Sarode" or "Barangale Shraddha")
    const c1 = tokens[0][0].toUpperCase();
    const c2 = tokens[1][0].toUpperCase();
    return {
      code: `${c1}${c2}`,
      isFlagged: true,
      flagReason: `Faculty name "${fullName}" has only 2 name components. Generated 2-letter code ${c1}${c2}. Flagged for admin review.`
    };
  } else if (tokens.length === 1) {
    const c1 = tokens[0].substring(0, 3).toUpperCase();
    return {
      code: c1,
      isFlagged: true,
      flagReason: `Faculty name "${fullName}" has only 1 name component. Flagged for admin review.`
    };
  }

  return {
    code: 'FAC',
    isFlagged: true,
    flagReason: `Could not parse valid initials from "${fullName}". Flagged for admin review.`
  };
}
