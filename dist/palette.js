/**
 * The row model, the ranking and the keyboard rules behind `SearchChip` and
 * `SearchDialog`.
 *
 * Every site's palette answers a slightly different set of questions — "what is
 * this thing", "where do I go", "who is this" — but they all reduce to one
 * flat, keyboard-walkable list. Groups would make the reader choose a list
 * before typing, so a group here is a seam in one list rather than a list of
 * its own, and the ranking is what puts the likely answer at the top.
 *
 * What stays with the site is where the rows come from: an index to fetch, a
 * language to fetch it in, a database to ask about people. What lives here is
 * everything that was written the same way twice.
 *
 * Pure and dependency-free apart from the shared fold, so plain node:test loads
 * it without a bundler.
 */
import { foldForSearch } from "./text.js";
/**
 * Where a match landed, best first:
 *   0 the label starts with it        "sni" → Sniper
 *   1 a word of the label starts      "sni" → Undead Sniper
 *   2 anywhere in the label           "nip" → Sniper
 *   3 an alias starts with it         "siege" → AMX S-880 (id SiegeTank)
 *   4 anywhere in an alias
 * A match in the middle of a word is kept but ranked last: it is the one that
 * turns up by accident, and dropping it would lose partial ids.
 */
function score(row, needle) {
    const label = foldForSearch(row.label);
    if (label.startsWith(needle))
        return 0;
    if (wordStart(label, needle))
        return 1;
    if (label.includes(needle))
        return 2;
    let best = -1;
    for (const a of row.alias ?? []) {
        const folded = foldForSearch(a);
        if (folded.startsWith(needle))
            return 3;
        if (folded.includes(needle))
            best = 4;
    }
    return best;
}
/** Does `needle` start a word of `hay`? Both are already folded. */
function wordStart(hay, needle) {
    let from = 0;
    for (;;) {
        const at = hay.indexOf(needle, from);
        if (at < 0)
            return false;
        if (at > 0 && !/[a-z0-9]/.test(hay[at - 1]))
            return true;
        from = at + 1;
    }
}
/**
 * Rows matching `query`, best first.
 *
 * `limit` is small on purpose: this is a keyboard target, not a results page.
 * A site with more to show than fits should offer its own browse page as a
 * row, the way a palette offers a way out of itself.
 */
export function rankRows(rows, query, limit = 8) {
    const needle = foldForSearch(query.trim());
    if (!needle)
        return [];
    const scored = [];
    for (const row of rows) {
        const s = score(row, needle);
        if (s >= 0)
            scored.push({ row, score: s });
    }
    // among equals the shorter name wins: someone typing "sniper" means Sniper,
    // not "Sniper Rifle Ammo Crate"
    scored.sort((a, b) => a.score - b.score ||
        (a.row.weight ?? 0) - (b.row.weight ?? 0) ||
        a.row.label.length - b.row.label.length ||
        a.row.label.localeCompare(b.row.label));
    return scored.slice(0, limit).map(({ row }) => row);
}
/**
 * The groups as one list, in the order they are drawn.
 *
 * The cursor and the markup both number rows off this, which is what keeps
 * ↑/↓ and the highlight agreeing about which row is selected.
 */
export function flattenGroups(groups) {
    return groups.flatMap((g) => g.rows);
}
/** Wrap around at both ends, so ↑ from the top row lands on the last one. */
export function step(index, delta, length) {
    if (length === 0)
        return 0;
    return (index + delta + length) % length;
}
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
export function isSearchShortcut(e) {
    const mod = e.ctrlKey || e.metaKey;
    const wanted = (mod && (e.key === 'f' || e.key === 'k')) || (!mod && e.key === '/');
    if (!wanted || e.altKey)
        return false;
    const el = e.target;
    const typing = el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? '');
    return !(typing && !mod);
}
/**
 * What to call the modifier in front of a reader.
 *
 * Takes the user-agent rather than reading it, so it is pure and so a caller
 * cannot forget that this must not run during render: a prerendered layout is
 * built on a machine that is nobody's, and a hint baked in there would be wrong
 * for half the readers and would hydrate mismatched. Call it on mount.
 */
export function modKey(userAgent) {
    return /mac|iphone|ipad/i.test(userAgent) ? '⌘' : 'Ctrl';
}
