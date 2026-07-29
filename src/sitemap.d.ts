export interface SitemapUrl {
	/** Root-relative, leading slash, already percent-encoded. */
	path: string;
	/** ISO date the page last changed, where it is known. */
	lastmod?: string;
	/** 0..1, relative to the rest of this sitemap only. */
	priority?: number;
}

export declare function xmlEscape(s: string): string;

export declare function sitemapXml(origin: string, urls: SitemapUrl[]): string;

/** Takes the date off the front of an ISO string, without a timezone shift. */
export declare function sitemapDate(iso: string | undefined | null): string | undefined;
