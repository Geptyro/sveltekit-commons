export type CacheState =
	/** young enough to serve as-is */
	| 'fresh'
	/** past its life, but worth serving while a refresh runs behind it */
	| 'stale'
	/** too old to hand out; the caller must wait for a fresh read */
	| 'expired';

/** `staleWindow` is measured from the end of the TTL, not from storage time. */
export declare function cacheState(age: number, ttl: number, staleWindow: number): CacheState;

/** Prefix match on `:` boundaries only — `player` must not reach `players:count`. */
export declare function cacheKeyMatches(key: string, prefixes: string[]): boolean;
