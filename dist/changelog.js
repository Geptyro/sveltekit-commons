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
export const ENTRY_IMPACTS = ['major', 'normal', 'minor'];
const VERSION_RE = /\/changelog\/(v\d+\.\d+\.\d+)\//;
/** Negative when a < b. Missing components count as 0, so v1.2 sorts under v1.2.1. */
export function compareVersions(a, b) {
    const pa = a.replace(/^v/, '').split('.').map(Number);
    const pb = b.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const d = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (d)
            return d;
    }
    return 0;
}
/** Latest released version from glob keys like /changelog/v0.7.1/release.json. */
export function latestVersion(paths) {
    let best = null;
    for (const p of paths) {
        const v = VERSION_RE.exec(p)?.[1];
        if (v && (!best || compareVersions(v, best) > 0))
            best = v;
    }
    return best;
}
/**
 * Badge data from a release.json glob map — the cheap read, for a layout that
 * wants the version number without pulling every entry's prose into its chunk.
 *
 * Releases cut before the `notable` count existed simply lack the field, and
 * are treated as notable: a missing count is not a claim that nothing shipped.
 */
export function latestVersionInfo(files) {
    const version = latestVersion(Object.keys(files));
    if (!version)
        return { version: null, notable: false };
    const json = Object.entries(files).find(([p]) => p.includes(`/changelog/${version}/`))?.[1];
    return { version, notable: json?.notable === undefined ? true : json.notable > 0 };
}
/**
 * Split `---` frontmatter from the body.
 *
 * Deliberately not a YAML parser. The frontmatter is four flat `key: value`
 * lines by convention, and a real YAML dependency in a package that ships a
 * committed dist/ would be a build for every consumer to carry for that. A
 * value keeps any `:` after the first one, so an unquoted `title: Fixed: the
 * thing` reads correctly.
 *
 * A fully quoted value is unwrapped, which is not YAML sympathy — it is a bug
 * fix. Authors quote a title with a colon in it because the sibling companion
 * app's reader requires it and says so, and for fifteen releases those quotes
 * rendered as part of the headline here. Stripping them makes the two readers
 * agree, which is what both formats claim.
 *
 * The pattern demands no same-quote INSIDE, so `'a' and 'b'` is left alone
 * rather than greedily unwrapped to `a' and 'b`. `lintEntry` picks up what is
 * left over.
 *
 * Shared by `parseEntry` and `lintEntry` so the reader that ships the site and
 * the reader that polices entries can never disagree about what a file says.
 */
function readFrontmatter(raw) {
    const meta = {};
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!fm)
        return { meta, body: raw, found: false };
    for (const line of fm[1].split(/\r?\n/)) {
        const kv = line.match(/^(\w+):\s*(.*)$/);
        if (kv)
            meta[kv[1]] = unquote(kv[2].trim());
    }
    return { meta, body: raw.slice(fm[0].length), found: true };
}
/** `'x'` and `"x"` -> `x`; anything else, including `'a' and 'b'`, untouched. */
function unquote(value) {
    const m = value.match(/^'([^']*)'$/) ?? value.match(/^"([^"]*)"$/);
    return m ? m[1] : value;
}
/**
 * One entry file: `---` frontmatter, then the body.
 *
 * Unknown keys are ignored; an unknown `type`/`area` falls back rather than
 * throwing, because a changelog entry must never be the thing that fails a
 * build. That forgiveness is why `lintEntry` exists: the fallback keeps a typo
 * off the error log AND out of sight, so something else has to go looking.
 */
export function parseEntry(raw, schema) {
    const { meta, body } = readFrontmatter(raw);
    const type = schema.types.includes(meta.type ?? '')
        ? meta.type
        : (schema.defaultType ?? schema.types[0]);
    const area = schema.areas.includes(meta.area ?? '')
        ? meta.area
        : (schema.defaultArea ?? schema.areas[0]);
    const impact = ENTRY_IMPACTS.includes(meta.impact ?? '')
        ? meta.impact
        : 'normal';
    return { title: meta.title ?? '', type, area, impact, body: body.trim() };
}
const KNOWN_KEYS = ['title', 'type', 'area', 'impact'];
/** Links `renderMarkdown` will honour; anything else it leaves as literal text. */
const SAFE_HREF = /^(https?:\/\/|\/)/;
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
export function lintEntry(raw, schema) {
    const problems = [];
    const { meta, body, found } = readFrontmatter(raw);
    if (!found) {
        return [{ field: 'frontmatter', message: 'no `---` frontmatter block — the whole file reads as body' }];
    }
    for (const key of Object.keys(meta)) {
        if (!KNOWN_KEYS.includes(key)) {
            problems.push({ field: key, message: `unknown field (expected one of ${KNOWN_KEYS.join(', ')}) — it is ignored, so whatever it was meant to set kept its default` });
        }
    }
    if (!meta.title) {
        problems.push({ field: 'title', message: 'missing or empty — the entry falls back to its filename as the headline' });
    }
    else if (/^['"]/.test(meta.title) && /['"]$/.test(meta.title)) {
        // already past unquote(), so the quotes here are ones it would not strip
        problems.push({ field: 'title', message: `still quoted after unwrapping (\`${meta.title}\`) — a quote of the same kind inside blocks it, so the outer pair renders as part of the headline` });
    }
    for (const [field, allowed] of [
        ['type', schema.types],
        ['area', schema.areas]
    ]) {
        const value = meta[field];
        const list = allowed.join(', ');
        if (!value)
            problems.push({ field, message: `missing (expected one of ${list})` });
        else if (!allowed.includes(value)) {
            problems.push({ field, message: `\`${value}\` is not one of ${list} — it silently becomes \`${allowed[0]}\`` });
        }
    }
    if (meta.impact && !ENTRY_IMPACTS.includes(meta.impact)) {
        problems.push({ field: 'impact', message: `\`${meta.impact}\` is not one of ${ENTRY_IMPACTS.join(', ')} — it silently becomes \`normal\`` });
    }
    if (!body.trim())
        problems.push({ field: 'body', message: 'empty — the entry renders as a headline with nothing under it' });
    for (const [, label, href] of body.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
        if (!SAFE_HREF.test(href)) {
            problems.push({ field: 'body', message: `link [${label}](${href}) is neither absolute (https://) nor site-rooted (/) — it renders as literal brackets` });
        }
    }
    return problems;
}
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
/**
 * Inline marks, escaped first so the body can never inject markup.
 *
 * Code spans are split out ahead of everything else: `**` inside backticks is
 * two asterisks, not bold, and a link href is only honoured when it is absolute
 * or site-rooted — `javascript:` and friends are left as literal text.
 */
function inline(text) {
    return escapeHtml(text)
        .split(/(`[^`]+`)/)
        .map((part) => {
        if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
            return `<code>${part.slice(1, -1)}</code>`;
        }
        return part
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => /^(https?:\/\/|\/)/.test(href) ? `<a href="${href}">${label}</a>` : m);
    })
        .join('');
}
/** Entry bodies use a small markdown subset: paragraphs, "- " lists, **bold**, `code`, links. */
export function renderMarkdown(md) {
    return md
        .trim()
        .split(/\n\s*\n/)
        .map((block) => block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean))
        .filter((lines) => lines.length)
        .map((lines) => {
        if (lines.every((l) => l.startsWith('- '))) {
            return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
        }
        return `<p>${inline(lines.join(' '))}</p>`;
    })
        .join('\n');
}
/**
 * Assemble releases (newest first) from raw glob maps:
 * `entryFiles` = path -> raw markdown, `releaseFiles` = path -> release.json.
 *
 * Paths that carry no `/changelog/vX.Y.Z/` segment are skipped, which is what
 * keeps `changelog/unreleased/README.md` out of the output when a glob is
 * widened past `v*`. An entry with no `title:` falls back to its filename —
 * a headline missing from the site is worse than an ugly one.
 */
export function buildChangelog(entryFiles, releaseFiles, schema) {
    const typeRank = (t) => schema.types.indexOf(t);
    const areaRank = (a) => schema.areas.indexOf(a);
    const impactRank = (i) => ENTRY_IMPACTS.indexOf(i);
    const byVersion = new Map();
    for (const [path, raw] of Object.entries(entryFiles)) {
        const v = VERSION_RE.exec(path)?.[1];
        if (!v)
            continue;
        const e = parseEntry(raw, schema);
        const title = e.title || (path.split('/').pop() ?? '').replace(/\.md$/, '');
        let list = byVersion.get(v);
        if (!list)
            byVersion.set(v, (list = []));
        list.push({
            title,
            type: e.type,
            area: e.area,
            impact: e.impact,
            html: renderMarkdown(e.body)
        });
    }
    const dates = new Map();
    for (const [path, json] of Object.entries(releaseFiles)) {
        const v = VERSION_RE.exec(path)?.[1];
        if (v && json?.date)
            dates.set(v, json.date);
    }
    return [...byVersion.entries()]
        .sort(([a], [b]) => compareVersions(b, a))
        .map(([version, entries]) => ({
        version,
        date: dates.get(version) ?? '',
        entries: entries.sort((x, y) => impactRank(x.impact) - impactRank(y.impact) ||
            typeRank(x.type) - typeRank(y.type) ||
            areaRank(x.area) - areaRank(y.area) ||
            x.title.localeCompare(y.title))
    }));
}
