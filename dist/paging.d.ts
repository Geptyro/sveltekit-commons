/**
 * Paging arithmetic. Dependency-free, so a plain `node --test` can load it
 * without a bundler's import chain, and so a server load and the pager
 * component that renders its result agree on what a page is.
 */
export declare const PER_PAGE = 50;
export interface Paged<T> {
    rows: T[];
    page: number;
    pages: number;
    total: number;
    perPage: number;
}
/** Clamps a `?page` value from a URL to something that exists. */
export declare function pageNumber(raw: string | null, pages: number): number;
export declare function paginate<T>(all: T[], rawPage: string | null, perPage?: number): Paged<T>;
/**
 * Page numbers to show around the current one, with nulls marking gaps:
 * `1 … 4 5 [6] 7 8 … 20`
 *
 * @param span how many neighbours to keep either side of the current page
 */
export declare function pageWindow(page: number, pages: number, span?: number): (number | null)[];
