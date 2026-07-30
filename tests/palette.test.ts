/**
 * The search palette's ranking and keyboard rules (node:test, `npm test`).
 *
 * These are the parts two sites had each written for themselves, and the parts
 * a reader notices immediately when they are wrong: the row they meant not
 * coming first, or ↑ from the top row going nowhere.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	flattenGroups,
	isSearchShortcut,
	modKey,
	rankRows,
	step,
	type PaletteRow
} from '../src/helpers/palette.ts';

const row = (label: string, extra: Partial<PaletteRow> = {}): PaletteRow => ({
	kind: 'entity',
	id: label,
	href: `/${label}`,
	label,
	...extra
});

const labels = (rows: PaletteRow[]) => rows.map((r) => r.label);

test('a prefix beats a word start beats a match in the middle', () => {
	const rows = [row('Quartz'), row('Body Art'), row('Artefact')];
	assert.deepEqual(labels(rankRows(rows, 'art')), ['Artefact', 'Body Art', 'Quartz']);
});

test('an alias matches, and ranks below every match on the label', () => {
	const rows = [row('AMX S-880', { alias: ['SiegeTank'] }), row('Siege Platform')];
	assert.deepEqual(labels(rankRows(rows, 'siege')), ['Siege Platform', 'AMX S-880']);
});

test('accents and case fold away', () => {
	assert.deepEqual(labels(rankRows([row('Détecteur')], 'detec')), ['Détecteur']);
	assert.deepEqual(labels(rankRows([row('detecteur')], 'DÉTEC')), ['detecteur']);
});

test('weight breaks a tie before length does', () => {
	// the destination is one keystroke from everything under it, so it goes
	// first even though its name is the longer of the two
	const rows = [row('Weapon', { weight: 3 }), row('Weapons index', { kind: 'page', weight: 0 })];
	assert.deepEqual(labels(rankRows(rows, 'weapon')), ['Weapons index', 'Weapon']);
});

test('among equals the shorter name wins', () => {
	const rows = [row('Sniper Rifle Ammo Crate'), row('Sniper')];
	assert.deepEqual(labels(rankRows(rows, 'sniper')), ['Sniper', 'Sniper Rifle Ammo Crate']);
});

test('an empty query matches nothing at all', () => {
	assert.deepEqual(rankRows([row('Sniper')], '   '), []);
});

test('limit is honoured', () => {
	const rows = ['a1', 'a2', 'a3', 'a4'].map((l) => row(l));
	assert.equal(rankRows(rows, 'a', 2).length, 2);
});

test('groups flatten in the order they are drawn', () => {
	const groups = [
		{ rows: [row('one'), row('two')] },
		{ label: 'Players', rows: [row('three')], busy: true },
		{ rows: [] }
	];
	assert.deepEqual(labels(flattenGroups(groups)), ['one', 'two', 'three']);
});

test('the cursor wraps at both ends', () => {
	assert.equal(step(0, -1, 3), 2);
	assert.equal(step(2, 1, 3), 0);
	// an empty list has nowhere to go, and must not produce NaN
	assert.equal(step(0, 1, 0), 0);
});

/** The shape `isSearchShortcut` reads off a real KeyboardEvent. */
const key = (
	k: string,
	opts: { mod?: boolean; alt?: boolean; tag?: string; editable?: boolean } = {}
) =>
	({
		key: k,
		ctrlKey: opts.mod ?? false,
		metaKey: false,
		altKey: opts.alt ?? false,
		target: { tagName: opts.tag ?? 'BODY', isContentEditable: opts.editable ?? false }
	}) as unknown as KeyboardEvent;

test('the three bindings open the palette', () => {
	assert.ok(isSearchShortcut(key('f', { mod: true })));
	assert.ok(isSearchShortcut(key('k', { mod: true })));
	assert.ok(isSearchShortcut(key('/')));
});

test('a bare printable belongs to whatever is being typed in', () => {
	assert.equal(isSearchShortcut(key('/', { tag: 'INPUT' })), false);
	assert.equal(isSearchShortcut(key('/', { tag: 'TEXTAREA' })), false);
	assert.equal(isSearchShortcut(key('/', { tag: 'DIV', editable: true })), false);
	// but Ctrl+F inside a filter box still means "search the site"
	assert.ok(isSearchShortcut(key('f', { mod: true, tag: 'INPUT' })));
});

test('unrelated keystrokes are left alone', () => {
	assert.equal(isSearchShortcut(key('f')), false);
	assert.equal(isSearchShortcut(key('g', { mod: true })), false);
	assert.equal(isSearchShortcut(key('f', { mod: true, alt: true })), false);
});

test('the modifier is named for the platform', () => {
	assert.equal(modKey('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), '⌘');
	assert.equal(modKey('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), '⌘');
	assert.equal(modKey('Mozilla/5.0 (X11; Linux x86_64)'), 'Ctrl');
	// never read during render, so it must survive having nothing to read
	assert.equal(modKey(''), 'Ctrl');
});
