/**
 * A per-key sliding-window counter — the crude flood guard that sits in front
 * of a form action or an upload endpoint.
 *
 * This is the one helper here that holds state, so: nothing is created at
 * module scope. `rateLimiter()` is a factory, and the Map belongs to the
 * instance the caller made. Importing this module allocates nothing and
 * connects to nothing, which is what keeps it out of the `./server` rules.
 *
 * IN MEMORY, AND DELIBERATELY
 *
 * Both consuming sites run one always-on machine, so a shared store would buy
 * nothing but an outage surface. The consequence is worth stating where the
 * limits are set: a deploy or `fly apps restart` forgets every window. That is
 * an acceptable trade for a spam guard and NOT acceptable for anything that
 * needs to actually hold — quotas, billing, lockouts. Those need a store.
 */
export interface RateLimitOptions {
    /** Events allowed within one window. The (limit + 1)th is refused. */
    limit: number;
    windowMs: number;
    /**
     * Injectable clock. Tests drive it; production leaves it alone. Without
     * this a window test either sleeps for real or reaches into module state.
     */
    now?: () => number;
}
export interface RateLimiter {
    /**
     * Is `key` under the limit right now? Counts nothing against it.
     *
     * Split from `record` because the two call sites this was written for
     * disagree about what an "event" is, and collapsing them into one call
     * gets one of them wrong. A feedback form counts only *accepted*
     * submissions, so that a bot tripping the honeypot cannot burn the budget
     * of a real visitor behind the same NAT. An upload endpoint counts every
     * *attempt*, because there the attempt is the cost.
     */
    allows(key: string): boolean;
    /** Count one event against `key`. */
    record(key: string): void;
    /** `allows()` then `record()` if allowed. Returns whether it was allowed. */
    hit(key: string): boolean;
    /** Events counted against `key` inside the current window. */
    count(key: string): number;
    /**
     * How many keys are currently tracked. Exists so the sweep below is
     * testable — an unbounded Map is invisible until it is a problem.
     */
    size(): number;
    /** Forget one key, or — with no argument — all of them. */
    reset(key?: string): void;
}
export declare function rateLimiter({ limit, windowMs, now }: RateLimitOptions): RateLimiter;
