/**
 * "3h ago" for the places where when-it-happened matters more than the date.
 *
 * Takes `now` rather than reading the clock, so it is pure: the same inputs
 * always give the same string, which is what makes it testable and what keeps
 * a server render and the hydration that follows it from disagreeing for any
 * reason other than the time that genuinely passed between them.
 */
/**
 * Returns null once something is old enough that "5w ago" stops meaning
 * anything useful — the caller shows the date instead.
 *
 * @param now ms since epoch
 */
export declare function timeAgo(iso: string, now: number): string | null;
