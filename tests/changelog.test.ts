import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	buildChangelog,
	compareVersions,
	latestVersion,
	latestVersionInfo,
	lintEntry,
	parseEntry,
	renderMarkdown,
	type ChangelogSchema
} from '../src/helpers/changelog.ts';

const SCHEMA = {
	types: ['feature', 'improvement', 'fix', 'data'],
	areas: ['wiki', 'players', 'site']
} as const satisfies ChangelogSchema;

const entry = (fm: string, body = 'Body.') => `---\n${fm}\n---\n${body}\n`;

test('compareVersions orders by component, not lexically', () => {
	assert.ok(compareVersions('v0.10.0', 'v0.9.0') > 0);
	assert.ok(compareVersions('v0.2.13', 'v0.2.4') > 0);
	assert.equal(compareVersions('v1.2.3', 'v1.2.3'), 0);
	// a missing component counts as 0
	assert.ok(compareVersions('v1.2', 'v1.2.1') < 0);
});

test('latestVersion picks the newest from glob keys, ignoring other paths', () => {
	assert.equal(
		latestVersion([
			'/changelog/v0.9.0/release.json',
			'/changelog/v0.10.0/release.json',
			'/changelog/unreleased/README.md'
		]),
		'v0.10.0'
	);
	assert.equal(latestVersion([]), null);
});

test('latestVersionInfo treats a missing notable count as notable', () => {
	assert.deepEqual(
		latestVersionInfo({
			'/changelog/v0.1.0/release.json': { date: '2026-01-01' },
			'/changelog/v0.2.0/release.json': { date: '2026-02-01' }
		}),
		{ version: 'v0.2.0', notable: true }
	);
	assert.deepEqual(
		latestVersionInfo({ '/changelog/v0.2.0/release.json': { date: '2026-02-01', notable: 0 } }),
		{ version: 'v0.2.0', notable: false }
	);
	assert.deepEqual(latestVersionInfo({}), { version: null, notable: false });
});

test('parseEntry reads frontmatter and falls back rather than throwing', () => {
	const ok = parseEntry(entry('title: A thing\ntype: fix\narea: players\nimpact: major'), SCHEMA);
	assert.deepEqual(ok, {
		title: 'A thing',
		type: 'fix',
		area: 'players',
		impact: 'major',
		body: 'Body.'
	});

	// unknown type/area/impact fall back to the schema's defaults
	const odd = parseEntry(entry('title: B\ntype: nonsense\narea: nowhere\nimpact: huge'), SCHEMA);
	assert.deepEqual(odd, {
		title: 'B',
		type: 'feature',
		area: 'wiki',
		impact: 'normal',
		body: 'Body.'
	});

	// explicit defaults win over the first list member
	const withDefaults = parseEntry(entry('title: C'), {
		...SCHEMA,
		defaultType: 'improvement',
		defaultArea: 'site'
	});
	assert.equal(withDefaults.type, 'improvement');
	assert.equal(withDefaults.area, 'site');
});

test('parseEntry survives a file with no frontmatter at all', () => {
	const e = parseEntry('Just prose.\n', SCHEMA);
	assert.equal(e.title, '');
	assert.equal(e.body, 'Just prose.');
	assert.equal(e.type, 'feature');
});

test('renderMarkdown escapes, then applies the subset', () => {
	assert.equal(renderMarkdown('a **b** c'), '<p>a <strong>b</strong> c</p>');
	assert.equal(renderMarkdown('- one\n- two'), '<ul><li>one</li><li>two</li></ul>');
	assert.equal(renderMarkdown('p1\n\np2'), '<p>p1</p>\n<p>p2</p>');
	// html in the body is text, not markup
	assert.equal(renderMarkdown('<script>x</script>'), '<p>&lt;script&gt;x&lt;/script&gt;</p>');
	// asterisks inside a code span are literal
	assert.equal(renderMarkdown('`**not bold**`'), '<p><code>**not bold**</code></p>');
});

test('renderMarkdown honours only absolute and site-rooted links', () => {
	assert.equal(renderMarkdown('[a](/players)'), '<p><a href="/players">a</a></p>');
	assert.equal(renderMarkdown('[a](https://x.dev)'), '<p><a href="https://x.dev">a</a></p>');
	// left as literal text — this is the guard, not a nicety
	assert.equal(
		renderMarkdown('[a](javascript:alert(1))'),
		'<p>[a](javascript:alert(1))</p>'
	);
});

test('buildChangelog groups by version, newest first, and sorts entries for display', () => {
	const releases = buildChangelog(
		{
			'/changelog/v0.1.0/launch.md': entry('title: Launch\ntype: feature\narea: site'),
			'/changelog/v0.2.0/tweak.md': entry('title: Tweak\ntype: improvement\narea: site\nimpact: minor'),
			'/changelog/v0.2.0/flagship.md': entry('title: Flagship\ntype: fix\narea: wiki\nimpact: major'),
			'/changelog/v0.2.0/plain.md': entry('title: Plain\ntype: feature\narea: wiki'),
			// not under a version folder — must be ignored
			'/changelog/unreleased/wip.md': entry('title: WIP\ntype: feature\narea: site')
		},
		{
			'/changelog/v0.1.0/release.json': { date: '2026-01-01' },
			'/changelog/v0.2.0/release.json': { date: '2026-02-01' }
		},
		SCHEMA
	);

	assert.deepEqual(
		releases.map((r) => r.version),
		['v0.2.0', 'v0.1.0']
	);
	// major first, then by type order (feature before improvement), minor last
	assert.deepEqual(
		releases[0].entries.map((e) => e.title),
		['Flagship', 'Plain', 'Tweak']
	);
	assert.equal(releases[0].date, '2026-02-01');
});

test('buildChangelog falls back to the filename when an entry has no title', () => {
	const [release] = buildChangelog(
		{ '/changelog/v0.1.0/some-change.md': entry('type: fix\narea: site') },
		{},
		SCHEMA
	);
	assert.equal(release.entries[0].title, 'some-change');
	// a version with no release.json still renders, just undated
	assert.equal(release.date, '');
});

// lintEntry — every case below is one parseEntry falls back on rather than
// reporting, which is exactly why it needs a second reader.
const fields = (raw: string) => lintEntry(raw, SCHEMA).map((p) => p.field);

test('lintEntry passes a well-formed entry', () => {
	assert.deepEqual(lintEntry(entry('title: Clans\ntype: feature\narea: players'), SCHEMA), []);
	// impact is optional, and all three values are legal spellings
	assert.deepEqual(lintEntry(entry('title: X\ntype: fix\narea: site\nimpact: major'), SCHEMA), []);
});

test('lintEntry catches an off-schema type or area that parseEntry swallows', () => {
	const raw = entry('title: X\ntype: calculator\narea: nowhere');
	assert.deepEqual(fields(raw), ['type', 'area']);
	// the silent fallback the lint exists to expose
	assert.equal(parseEntry(raw, SCHEMA).type, 'feature');
	assert.match(lintEntry(raw, SCHEMA)[0].message, /silently becomes `feature`/);
});

test('lintEntry catches a misspelled key, not just a bad value', () => {
	// `imapct: minor` keeps impact at normal — the entry ships to the front page
	const raw = entry('title: X\ntype: fix\narea: site\nimapct: minor');
	assert.deepEqual(fields(raw), ['imapct']);
	assert.equal(parseEntry(raw, SCHEMA).impact, 'normal');
});

test('lintEntry catches a missing title', () => {
	assert.deepEqual(fields(entry('type: fix\narea: site')), ['title']);
});

test('a quoted title is unwrapped, so it is not a problem', () => {
	// the habit comes from the companion app, whose reader requires the quotes
	const quoted = entry("title: 'Fixed: the thing'\ntype: fix\narea: site");
	assert.equal(parseEntry(quoted, SCHEMA).title, 'Fixed: the thing');
	assert.deepEqual(fields(quoted), []);
	// an unquoted colon works too — the value keeps everything after the first
	const bare = entry('title: Fixed: the thing\ntype: fix\narea: site');
	assert.equal(parseEntry(bare, SCHEMA).title, 'Fixed: the thing');
	assert.deepEqual(fields(bare), []);
	// inner quotes of the other kind survive the unwrap
	assert.equal(
		parseEntry(entry('title: \'"Ready to play" in the top bar\'\ntype: fix\narea: site'), SCHEMA).title,
		'"Ready to play" in the top bar'
	);
});

test('lintEntry flags a title unquote() cannot unwrap rather than corrupting it', () => {
	// greedy stripping would leave `a' and 'b` — it is left alone and reported
	const raw = entry("title: 'a' and 'b'\ntype: fix\narea: site");
	assert.equal(parseEntry(raw, SCHEMA).title, "'a' and 'b'");
	assert.deepEqual(fields(raw), ['title']);
	assert.match(lintEntry(raw, SCHEMA)[0].message, /still quoted after unwrapping/);
});

test('lintEntry catches an empty body and a link renderMarkdown will not honour', () => {
	assert.deepEqual(fields(entry('title: X\ntype: fix\narea: site', '')), ['body']);
	const raw = entry('title: X\ntype: fix\narea: site', 'See [items](../items).');
	assert.deepEqual(fields(raw), ['body']);
	assert.match(lintEntry(raw, SCHEMA)[0].message, /literal brackets/);
	// site-rooted and absolute links both render, so neither is a problem
	assert.deepEqual(fields(entry('title: X\ntype: fix\narea: site', 'See [a](/items) and [b](https://x.dev).')), []);
});

test('lintEntry reports a file with no frontmatter once, not field by field', () => {
	assert.deepEqual(lintEntry('Just a body.', SCHEMA), [
		{ field: 'frontmatter', message: 'no `---` frontmatter block — the whole file reads as body' }
	]);
});
