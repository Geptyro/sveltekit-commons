/** One row of the palette, whatever it is a row *of*. */
export interface PaletteRow {
    /**
     * The site's own vocabulary — 'page', 'entity', 'player'. Only used to key
     * the list, so two rows of different kinds may share an id.
     */
    kind: string;
    /** Unique within a kind. */
    id: string;
    href: string;
    label: string;
    /** Short mono note on the right — a category, a class code, a clan tag. */
    note?: string;
    /** The row's picture. A mark is drawn in its place when there is none. */
    icon?: string | null;
    /** SVG source, or a single character, for the row that has no picture. */
    glyph?: string;
    /** Round the picture: a person rather than a thing. */
    round?: boolean;
    /** Any CSS colour for the label — a rank, a faction, an outcome. */
    tint?: string | null;
    /** Dim the label: a way out of the palette rather than an answer in it. */
    muted?: boolean;
    /** Words that should match without being shown, e.g. a map-internal id. */
    alias?: string[];
    /**
     * Tie-break among equally good matches, smallest first. A page is one
     * keystroke from everything under it, so a site gives its destinations a
     * lower weight than its individual records. Defaults to 0.
     */
    weight?: number;
}
/**
 * A run of rows under one heading.
 *
 * The heading is a seam, not a boundary: ↑/↓ walks straight through it, and a
 * group with no label is a run that needed no seam at all. `busy` is for the
 * half of a palette that cannot answer instantly — it puts a spinner on the
 * heading so the reader can see that rows are on the way rather than absent.
 */
export interface RowGroup {
    rows: PaletteRow[];
    label?: string;
    busy?: boolean;
    /** Stand-in shown while `busy` with nothing yet to show. */
    pending?: string;
}
/**
 * Rows matching `query`, best first.
 *
 * `limit` is small on purpose: this is a keyboard target, not a results page.
 * A site with more to show than fits should offer its own browse page as a
 * row, the way a palette offers a way out of itself.
 */
export declare function rankRows(rows: PaletteRow[], query: string, limit?: number): PaletteRow[];
/**
 * The groups as one list, in the order they are drawn.
 *
 * The cursor and the markup both number rows off this, which is what keeps
 * ↑/↓ and the highlight agreeing about which row is selected.
 */
export declare function flattenGroups(groups: RowGroup[]): PaletteRow[];
/** Wrap around at both ends, so ↑ from the top row lands on the last one. */
export declare function step(index: number, delta: number, length: number): number;
/**
 * Should this keystroke open the palette?
 *
 * Ctrl/Cmd+F is the key already in the hand of anyone looking for something on
 * a page, which is why the chip names it. The cost is that it shadows the
 * browser's find-in-page, so Ctrl/Cmd+K and "/" open the palette too and
 * anyone who wants that key back has two other ways in.
 *
 * "/" is ignored while typing: a search box or a textarea has a better claim on
 * a printable character than any shortcut does. The modified pair is not,
 * because Ctrl+F inside a filter box still means "search the site".
 */
export declare function isSearchShortcut(e: KeyboardEvent): boolean;
/**
 * What to call the modifier in front of a reader.
 *
 * Takes the user-agent rather than reading it, so it is pure and so a caller
 * cannot forget that this must not run during render: a prerendered layout is
 * built on a machine that is nobody's, and a hint baked in there would be wrong
 * for half the readers and would hydrate mismatched. Call it on mount.
 */
export declare function modKey(userAgent: string): string;
