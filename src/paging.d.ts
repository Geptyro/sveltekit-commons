export interface Paged<T> {
	rows: T[];
	page: number;
	pages: number;
	total: number;
	perPage: number;
}

export declare const PER_PAGE: number;

/** Clamps a `?page` value from a URL to something that exists. */
export declare function pageNumber(raw: string | null, pages: number): number;

export declare function paginate<T>(all: T[], rawPage: string | null, perPage?: number): Paged<T>;

/** Page numbers around the current one; `null` marks an elided gap. */
export declare function pageWindow(page: number, pages: number, span?: number): (number | null)[];
