/**
 * The string helpers that are not covered by search.test.js (escapeRegex) —
 * accent folding, and the description clamp.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DESC_MAX, clampText, foldForSearch } from '../src/text.js';

test('foldForSearch strips accents and case', () => {
	// the case this exists for: a French item name typed without its accents
	assert.equal(foldForSearch('Détecteur'), 'detecteur');
	assert.equal(foldForSearch('ÀÉÎÕÜ'), 'aeiou');
	assert.equal(foldForSearch('ALREADY plain'), 'already plain');
	assert.equal(foldForSearch(''), '');
});

test('foldForSearch leaves scripts without diacritics alone', () => {
	assert.equal(foldForSearch('Разряд'), 'разряд');
	assert.equal(foldForSearch('서지'), '서지');
});

test('clampText collapses whitespace and leaves short text intact', () => {
	assert.equal(clampText('  a   b  '), 'a b');
	assert.equal(clampText('short enough'), 'short enough');
	assert.equal(clampText('line\nbreak'), 'line break');
});

test('clampText cuts on a word boundary and marks the cut', () => {
	const out = clampText('word '.repeat(60), 40);
	assert.ok(out.length <= 40, `got ${out.length}`);
	assert.ok(out.endsWith('…'));
	// the ellipsis replaces the trailing space rather than following it
	assert.ok(!out.endsWith(' …'));
});

test('clampText takes a hard cut rather than gutting the budget for one long token', () => {
	assert.equal(clampText(`${'x'.repeat(50)} tail`, 20), `${'x'.repeat(19)}…`);
});

test('clampText defaults to the length a search result will render', () => {
	assert.equal(DESC_MAX, 160);
	assert.ok(clampText('sentence. '.repeat(40)).length <= DESC_MAX);
});
