/**
 * "3h ago". Takes `now` rather than reading the clock, so it is pure.
 * Returns null once the age is too old to be more useful than the date.
 */
export declare function timeAgo(iso: string, now: number): string | null;
