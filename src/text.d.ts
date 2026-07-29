/** Escape a visitor-supplied string for use inside a regular expression. */
export declare function escapeRegex(term: string): string;

/** Fold accents and case, so "Détecteur" matches "detecteur". */
export declare function foldForSearch(s: string): string;

export declare const DESC_MAX: number;

/** Collapse whitespace and clamp to `max`, backing off to a word boundary. */
export declare function clampText(text: string, max?: number): string;
