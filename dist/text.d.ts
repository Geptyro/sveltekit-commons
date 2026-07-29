/**
 * String helpers that more than one site had written for itself.
 * Dependency-free, and pure — every one takes what it needs as an argument, so
 * the same input always gives the same output and a server render cannot
 * disagree with the hydration that follows it.
 */
/**
 * Escape a visitor-supplied string for use inside a regular expression.
 *
 * A search box that reaches a database as a `$regex` turns an unescaped `(` or
 * `*` from a literal the visitor typed into syntax — at best no matches, at
 * worst a pattern that costs real time to evaluate.
 */
export declare function escapeRegex(term: string): string;
/**
 * Fold accents and case, so "Détecteur" matches a search for "detecteur".
 *
 * The trailing NFC is not decoration. NFD decomposes Hangul syllables into
 * their jamo as readily as it separates a French acute, and stripping
 * diacritics leaves those jamo behind — so "서지" folded to something that no
 * longer equalled itself, and any caller comparing folded text against text
 * that had not been folded silently stopped matching Korean.
 */
export declare function foldForSearch(s: string): string;
/** Google renders about this much of a description before cutting it. */
export declare const DESC_MAX = 160;
/**
 * Collapse whitespace and clamp to `max`, backing off to a word boundary.
 *
 * The back-off is skipped when it would throw away most of the budget — one
 * very long token would otherwise leave a description a few characters long —
 * in which case the hard cut is the better answer.
 */
export declare function clampText(text: string, max?: number): string;
