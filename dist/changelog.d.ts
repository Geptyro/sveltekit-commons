/**
 * The changelog convention: one markdown file per user-visible change, filed
 * under `changelog/vX.Y.Z/`, committed alongside the change itself.
 *
 * This module is the parser and the assembler. It reads raw frontmatter+body
 * strings keyed by path — which is exactly the shape Vite's `import.meta.glob`
 * hands back — and returns releases newest first, entries sorted for display.
 * It never touches the filesystem and never imports Svelte, so a release script
 * running under plain node and a `+page.server.ts` running under Vite can share
 * it, and node:test can load it directly.
 *
 * WHY THE VOCABULARY IS A PARAMETER
 *
 * `impact` is universal — every site has a flagship change, a normal one, and
 * one nobody would notice — so it is fixed here. `type` and `area` are not:
 * UAR files changes under wiki/players/replays/site, STALZONE under
 * database/market/tools/site, and a third site will want its own again. So the
 * caller passes a `ChangelogSchema` and gets its own string-literal unions back
 * out of the generics, rather than this package guessing for everyone and every
 * consumer widening to `string`.
 *
 * Both lists are ORDERED, and the order is the display order: an entry sorts by
 * impact, then by its position in `types`, then in `areas`. Putting `feature`
 * first in the array is what puts features at the top of a release.
 */
/** Display order: major leads its release, minor trails (and renders compact). */
export declare const ENTRY_IMPACTS: readonly ["major", "normal", "minor"];
export type EntryImpact = (typeof ENTRY_IMPACTS)[number];
/**
 * A site's changelog vocabulary. Both lists are ordered — see the note above.
 * Declare them `as const` at the call site to keep the literal unions.
 */
export interface ChangelogSchema<T extends string = string, A extends string = string> {
    /** entry kinds, most prominent first (e.g. feature, improvement, fix) */
    types: readonly T[];
    /** parts of the site, in the order a release should list them */
    areas: readonly A[];
    /** used when an entry omits `type:` or names one not in the list; defaults to types[0] */
    defaultType?: T;
    /** used when an entry omits `area:` or names one not in the list; defaults to areas[0] */
    defaultArea?: A;
}
export interface ChangelogEntry<T extends string = string, A extends string = string> {
    title: string;
    type: T;
    area: A;
    impact: EntryImpact;
    /** the body, already rendered to the markdown subset below */
    html: string;
}
export interface ChangelogRelease<T extends string = string, A extends string = string> {
    version: string;
    /** ISO date from release.json, or '' for a version that never got one */
    date: string;
    entries: ChangelogEntry<T, A>[];
}
/** Negative when a < b. Missing components count as 0, so v1.2 sorts under v1.2.1. */
export declare function compareVersions(a: string, b: string): number;
/** Latest released version from glob keys like /changelog/v0.7.1/release.json. */
export declare function latestVersion(paths: string[]): string | null;
export interface VersionBadge {
    version: string | null;
    /** false when the latest release holds only minor entries — no dot then */
    notable: boolean;
}
/**
 * Badge data from a release.json glob map — the cheap read, for a layout that
 * wants the version number without pulling every entry's prose into its chunk.
 *
 * Releases cut before the `notable` count existed simply lack the field, and
 * are treated as notable: a missing count is not a claim that nothing shipped.
 */
export declare function latestVersionInfo(files: Record<string, {
    date?: string;
    notable?: number;
}>): VersionBadge;
export interface ParsedEntry<T extends string = string, A extends string = string> {
    title: string;
    type: T;
    area: A;
    impact: EntryImpact;
    /** raw markdown, trimmed — not yet rendered */
    body: string;
}
/**
 * One entry file: `---` frontmatter, then the body.
 *
 * Unknown keys are ignored; an unknown `type`/`area` falls back rather than
 * throwing, because a changelog entry must never be the thing that fails a
 * build. That forgiveness is why `lintEntry` exists: the fallback keeps a typo
 * off the error log AND out of sight, so something else has to go looking.
 */
export declare function parseEntry<T extends string, A extends string>(raw: string, schema: ChangelogSchema<T, A>): ParsedEntry<T, A>;
/** One thing wrong with one entry file. `field` is a frontmatter key, or `frontmatter`/`body`. */
export interface ChangelogProblem {
    field: string;
    message: string;
}
/**
 * Everything wrong with an entry, empty when it is clean.
 *
 * The counterpart to `parseEntry`'s forgiveness. Every check here covers a way
 * an entry can be WRONG WITHOUT LOOKING WRONG once the site is built:
 *
 * - `type: calculator` when the schema says `tools` does not fail a build, it
 *   files the change under whatever happens to sit first in the list, and the
 *   entry then reads as a change to a part of the site it never touched.
 * - `imapct: minor` is not an unknown impact, it is an unknown KEY — the entry
 *   keeps `normal` and lands on the front page the author meant to keep it off.
 * - a title `readFrontmatter` cannot unwrap keeps its quotes in the headline.
 * - a `[label](../items)` link renders as literal brackets in the page.
 *
 * So this is not schema pedantry: nothing downstream ever raises its voice, and
 * the author has usually moved on by the time a reader notices.
 */
export declare function lintEntry<T extends string, A extends string>(raw: string, schema: ChangelogSchema<T, A>): ChangelogProblem[];
/** Entry bodies use a small markdown subset: paragraphs, "- " lists, **bold**, `code`, links. */
export declare function renderMarkdown(md: string): string;
/**
 * Assemble releases (newest first) from raw glob maps:
 * `entryFiles` = path -> raw markdown, `releaseFiles` = path -> release.json.
 *
 * Paths that carry no `/changelog/vX.Y.Z/` segment are skipped, which is what
 * keeps `changelog/unreleased/README.md` out of the output when a glob is
 * widened past `v*`. An entry with no `title:` falls back to its filename —
 * a headline missing from the site is worse than an ugly one.
 */
export declare function buildChangelog<T extends string, A extends string>(entryFiles: Record<string, string>, releaseFiles: Record<string, {
    date?: string;
}>, schema: ChangelogSchema<T, A>): ChangelogRelease<T, A>[];
