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
export function rateLimiter({ limit, windowMs, now = Date.now }) {
    /** key -> event times, oldest first (push-only, so it stays sorted). */
    const events = new Map();
    /**
     * Keys are remote addresses: attacker-supplied, unbounded in number, and
     * on a machine that stays up for weeks. Pruning only the key being read —
     * which is what the hand-rolled copies of this did — never frees the
     * millions of keys that are never seen again, so the Map is a slow leak
     * with an open faucet. One O(n) pass per window is cheap enough to just do.
     */
    let nextSweep = now() + windowMs;
    function sweep(t) {
        if (t < nextSweep)
            return;
        nextSweep = t + windowMs;
        for (const [key, times] of events) {
            // times is oldest-first, so the last entry is the key's newest
            if (!times.length || t - times[times.length - 1] >= windowMs)
                events.delete(key);
        }
    }
    function recent(key) {
        const t = now();
        sweep(t);
        const times = (events.get(key) ?? []).filter((at) => t - at < windowMs);
        if (times.length)
            events.set(key, times);
        else
            events.delete(key);
        return times;
    }
    return {
        allows: (key) => recent(key).length < limit,
        count: (key) => recent(key).length,
        size: () => events.size,
        record(key) {
            const times = recent(key);
            times.push(now());
            events.set(key, times);
        },
        hit(key) {
            const times = recent(key);
            if (times.length >= limit)
                return false;
            times.push(now());
            events.set(key, times);
            return true;
        },
        reset(key) {
            if (key === undefined)
                events.clear();
            else
                events.delete(key);
        }
    };
}
