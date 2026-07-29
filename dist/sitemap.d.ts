/**
 * Sitemap XML. Import-free so a plain `node --test` can load it — the route
 * gathers the paths, this only serialises them.
 */
export interface SitemapUrl {
    /** Root-relative, leading slash, already percent-encoded. */
    path: string;
    /** ISO date the page last changed, where it is known. */
    lastmod?: string;
    /** 0..1, relative to the rest of this sitemap only. */
    priority?: number;
}
export declare function xmlEscape(s: string): string;
/** @param origin absolute, no trailing slash */
export declare function sitemapXml(origin: string, urls: SitemapUrl[]): string;
/**
 * `lastmod` wants a date; records usually carry a full timestamp.
 *
 * Taken off the front of the string rather than through `Date`: stored values
 * often carry no zone ("2026-07-27T17:37:49"), so Date reads them as local time
 * and toISOString then converts to UTC — which moves the day for anything
 * recorded near midnight.
 */
export declare function sitemapDate(iso: string | undefined | null): string | undefined;
