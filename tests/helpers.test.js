import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PER_PAGE, pageNumber, pageWindow, paginate } from '../src/paging.js';
import { cacheKeyMatches, cacheState } from '../src/cache.js';
import { clampText, escapeRegex, foldForSearch } from '../src/text.js';
import { timeAgo } from '../src/time.js';
import { sitemapDate, sitemapXml, xmlEscape } from '../src/sitemap.js';
import { placeFloating } from '../src/place.js';

/* ── paging ──────────────────────────────────────────────────────────── */

test('pageNumber clamps junk and out-of-range values into the real range', () => {
	assert.equal(pageNumber(null, 5), 1);
	assert.equal(pageNumber('nonsense', 5), 1);
	assert.equal(pageNumber('0', 5), 1);
	assert.equal(pageNumber('-3', 5), 1);
	assert.equal(pageNumber('2.7', 5), 2);
	assert.equal(pageNumber('99', 5), 5);
	// no rows at all still leaves page 1 addressable
	assert.equal(pageNumber('4', 0), 1);
});

test('paginate slices the requested page and reports the totals', () => {
	const all = Array.from({ length: 120 }, (_, i) => i);
	const p = paginate(all, '2', 50);
	assert.deepEqual(p.rows, all.slice(50, 100));
	assert.deepEqual(
		{ page: p.page, pages: p.pages, total: p.total, perPage: p.perPage },
		{ page: 2, pages: 3, total: 120, perPage: 50 }
	);
});

test('paginate reports one page, not zero, for an empty set', () => {
	const p = paginate([], null);
	assert.deepEqual(p.rows, []);
	assert.equal(p.pages, 1);
	assert.equal(p.total, 0);
	assert.equal(p.perPage, PER_PAGE);
});

test('pageWindow elides with nulls and always keeps the ends', () => {
	assert.deepEqual(pageWindow(6, 20), [1, null, 4, 5, 6, 7, 8, null, 20]);
	// adjacent to the end: no gap marker where there is no gap
	assert.deepEqual(pageWindow(2, 5), [1, 2, 3, 4, 5]);
	assert.deepEqual(pageWindow(1, 1), [1]);
});

/* ── cache ───────────────────────────────────────────────────────────── */

test('cacheState measures the stale window from the end of the TTL', () => {
	assert.equal(cacheState(999, 1000, 500), 'fresh');
	assert.equal(cacheState(1000, 1000, 500), 'stale');
	assert.equal(cacheState(1499, 1000, 500), 'stale');
	assert.equal(cacheState(1500, 1000, 500), 'expired');
});

test('cacheKeyMatches respects the : boundary, not a bare string prefix', () => {
	assert.equal(cacheKeyMatches('player:abc', ['player']), true);
	assert.equal(cacheKeyMatches('player', ['player']), true);
	// the whole point: invalidating "player" must not throw away "players:count"
	assert.equal(cacheKeyMatches('players:count', ['player']), false);
	assert.equal(cacheKeyMatches('a:b', ['x', 'a']), true);
});

/* ── text ────────────────────────────────────────────────────────────── */

test('escapeRegex neutralises metacharacters', () => {
	assert.equal(escapeRegex('a(b)*c'), 'a\\(b\\)\\*c');
	assert.equal(new RegExp(escapeRegex('a(b)*c')).test('a(b)*c'), true);
});

test('foldForSearch strips accents and case', () => {
	assert.equal(foldForSearch('Détecteur'), 'detecteur');
	assert.equal(foldForSearch('ÀÉÎÕÜ'), 'aeiou');
});

test('clampText backs off to a word boundary and marks the cut', () => {
	assert.equal(clampText('  a   b  '), 'a b');
	const long = 'word '.repeat(60);
	const out = clampText(long, 40);
	assert.ok(out.length <= 40, `got ${out.length}`);
	assert.ok(out.endsWith('…'));
	assert.ok(!out.endsWith(' …'));
});

test('clampText takes a hard cut rather than gutting the budget for one long token', () => {
	const out = clampText(`${'x'.repeat(50)} tail`, 20);
	assert.equal(out, `${'x'.repeat(19)}…`);
});

/* ── time ────────────────────────────────────────────────────────────── */

test('timeAgo never reports a negative age from a skewed clock', () => {
	const now = Date.parse('2026-07-29T12:00:00Z');
	assert.equal(timeAgo('2026-07-29T12:00:30Z', now), 'just now');
});

test('timeAgo floors rather than rounding up past the unit', () => {
	const now = Date.parse('2026-07-29T12:00:00Z');
	// 59m36s: rounding would print "60 min ago", which reads as broken
	assert.equal(timeAgo('2026-07-29T11:00:24Z', now), '59 min ago');
	assert.equal(timeAgo('2026-07-29T09:30:00Z', now), '2h ago');
	assert.equal(timeAgo('2026-07-26T12:00:00Z', now), '3d ago');
	assert.equal(timeAgo('2026-07-15T12:00:00Z', now), '2w ago');
});

test('timeAgo gives up past the useful range, and on junk', () => {
	const now = Date.parse('2026-07-29T12:00:00Z');
	assert.equal(timeAgo('2026-01-01T12:00:00Z', now), null);
	assert.equal(timeAgo('not a date', now), null);
});

/* ── sitemap ─────────────────────────────────────────────────────────── */

test('xmlEscape covers every character that would break the document', () => {
	assert.equal(xmlEscape(`&<>"'`), '&amp;&lt;&gt;&quot;&apos;');
});

test('sitemapXml emits the optional fields only when given', () => {
	const xml = sitemapXml('https://example.test', [
		{ path: '/', priority: 1 },
		{ path: '/a?b=1&c=2', lastmod: '2026-07-29' }
	]);
	assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
	assert.ok(xml.includes('<loc>https://example.test/</loc>'));
	assert.ok(xml.includes('<priority>1.0</priority>'));
	assert.ok(xml.includes('<loc>https://example.test/a?b=1&amp;c=2</loc>'));
	assert.ok(xml.includes('<lastmod>2026-07-29</lastmod>'));
	// the first entry carried no lastmod, so exactly one appears
	assert.equal(xml.match(/<lastmod>/g)?.length, 1);
	assert.ok(xml.trimEnd().endsWith('</urlset>'));
});

test('sitemapDate takes the day off the front, without a timezone shift', () => {
	// a zoneless timestamp near midnight is exactly what Date would move
	assert.equal(sitemapDate('2026-07-27T23:37:49'), '2026-07-27');
	assert.equal(sitemapDate(null), undefined);
	assert.equal(sitemapDate('rubbish'), undefined);
});

/* ── place ───────────────────────────────────────────────────────────── */

test('placeFloating falls back to a side the card fits on', () => {
	const viewport = { width: 800, height: 600 };
	const card = { width: 240, height: 200 };
	// anchor hard against the top: "top" cannot fit, so it flips
	const anchor = { top: 4, bottom: 24, left: 100, right: 160, width: 60, height: 20 };
	const r = placeFloating({ anchor, card, viewport, placement: 'top' });
	assert.equal(r.side, 'bottom');
	assert.equal(r.y, 32);
});

test('placeFloating clamps a card that would hang off the edge', () => {
	const viewport = { width: 360, height: 640 };
	const card = { width: 240, height: 120 };
	// a trigger near the right edge of a phone used to push its pop off-screen
	const anchor = { top: 100, bottom: 120, left: 330, right: 356, width: 26, height: 20 };
	const r = placeFloating({ anchor, card, viewport, placement: 'bottom', align: 'end' });
	assert.ok(r.x >= 8, `x=${r.x}`);
	assert.ok(r.x + card.width <= viewport.width - 8, `x=${r.x}`);
	// the arrow still points back at the anchor after the card was moved
	assert.ok(r.arrow >= 10 && r.arrow <= card.width - 10, `arrow=${r.arrow}`);
});
