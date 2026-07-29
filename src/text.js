/**
 * String helpers that both sites had written for themselves. Dependency-free,
 * and pure — every one of them takes what it needs as an argument, so the same
 * input always gives the same output and a server render cannot disagree with
 * the hydration that follows it.
 */

/**
 * Escape a visitor-supplied string for use inside a regular expression.
 *
 * A search box that reaches a database as a `$regex` turns an unescaped `(` or
 * `*` from a literal the visitor typed into syntax — at best no matches, at
 * worst a pattern that costs real time to evaluate.
 *
 * @param {string} term
 * @returns {string}
 */
export function escapeRegex(term) {
	return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fold accents and case, so "Détecteur" matches a search for "detecteur".
 * @param {string} s
 * @returns {string}
 */
export function foldForSearch(s) {
	return s
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

/** Google renders about this much of a description before cutting it. */
export const DESC_MAX = 160;

/**
 * Collapse whitespace and clamp to `max`, backing off to a word boundary.
 *
 * The back-off is skipped when it would throw away most of the budget — one
 * very long token would otherwise leave a description a few characters long —
 * in which case the hard cut is the better answer.
 *
 * @param {string} text
 * @param {number} [max]
 * @returns {string}
 */
export function clampText(text, max = DESC_MAX) {
	const s = text.replace(/\s+/g, ' ').trim();
	if (s.length <= max) return s;
	const cut = s.slice(0, max - 1);
	const space = cut.lastIndexOf(' ');
	const kept = space > max * 0.6 ? cut.slice(0, space) : cut;
	return `${kept.replace(/[\s,;:.·—-]+$/, '')}…`;
}
