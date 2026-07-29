/**
 * The read cache's freshness decision, and the key-scoping rule invalidation
 * uses. Both are here as named functions rather than inline at the call site
 * because inline they were possible to break by changing a constant elsewhere
 * in the file, with nothing to notice.
 */
/**
 * `staleWindow` is measured **from the end of the TTL**, not from when the
 * value was stored. That distinction is the whole point: as an absolute age it
 * silently stops working the moment a TTL is raised past it, and every expiry
 * goes back to blocking a visitor on the full read.
 *
 * @param age ms since the value was stored
 */
export function cacheState(age, ttl, staleWindow) {
    if (age < ttl)
        return 'fresh';
    if (age < ttl + staleWindow)
        return 'stale';
    return 'expired';
}
/**
 * Does a cache key fall under one of these prefixes?
 *
 * A prefix matches the key exactly, or the key up to a `:` separator — never a
 * bare string prefix. `player` must not reach `players:count`, or scoping an
 * invalidation to one thing would quietly throw away another; the separator is
 * what keeps sibling namespaces apart.
 */
export function cacheKeyMatches(key, prefixes) {
    return prefixes.some((p) => key === p || key.startsWith(`${p}:`));
}
