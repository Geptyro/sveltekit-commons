/**
 * Paging arithmetic. Dependency-free, so a plain `node --test` can load it
 * without a bundler's import chain, and so a server load and the pager
 * component that renders its result agree on what a page is.
 */

export const PER_PAGE = 50;

/**
 * Clamps a `?page` value from a URL to something that exists.
 * @param {string | null} raw
 * @param {number} pages
 * @returns {number}
 */
export function pageNumber(raw, pages) {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 1) return 1;
	return Math.min(Math.floor(n), Math.max(1, pages));
}

/**
 * @template T
 * @param {T[]} all
 * @param {string | null} rawPage
 * @param {number} [perPage]
 * @returns {import('./paging.d.ts').Paged<T>}
 */
export function paginate(all, rawPage, perPage = PER_PAGE) {
	const total = all.length;
	const pages = Math.max(1, Math.ceil(total / perPage));
	const page = pageNumber(rawPage, pages);
	return { rows: all.slice((page - 1) * perPage, page * perPage), page, pages, total, perPage };
}

/**
 * Page numbers to show around the current one, with nulls marking gaps:
 * `1 … 4 5 [6] 7 8 … 20`
 * @param {number} page
 * @param {number} pages
 * @param {number} [span]  how many neighbours either side of the current page
 * @returns {(number | null)[]}
 */
export function pageWindow(page, pages, span = 2) {
	if (pages <= 1) return [1];
	const wanted = new Set([1, pages]);
	for (let p = page - span; p <= page + span; p++) if (p >= 1 && p <= pages) wanted.add(p);
	const sorted = [...wanted].sort((a, b) => a - b);
	/** @type {(number | null)[]} */
	const out = [];
	let previous = 0;
	for (const p of sorted) {
		if (previous && p - previous > 1) out.push(null);
		out.push(p);
		previous = p;
	}
	return out;
}
