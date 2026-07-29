/**
 * Sliding-window rate limiter (node:test, `npm test`).
 *
 * The clock is injected in every test here. A limiter tested against the real
 * `Date.now()` can only assert "the first N pass" — the two behaviours that
 * actually matter, that a window *expires* and that dead keys are *dropped*,
 * both need time to move without the test sleeping for an hour.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimiter } from '../src/helpers/rate-limit.ts';

const HOUR = 60 * 60 * 1000;

/** A limiter whose clock the test drives. */
function fixture(limit = 3, windowMs = HOUR) {
	let clock = 1_000_000;
	const rl = rateLimiter({ limit, windowMs, now: () => clock });
	return { rl, advance: (ms: number) => (clock += ms) };
}

test('allows up to the limit, refuses the next', () => {
	const { rl } = fixture(3);
	assert.ok(rl.hit('a'));
	assert.ok(rl.hit('a'));
	assert.ok(rl.hit('a'));
	assert.ok(!rl.hit('a'));
	assert.equal(rl.count('a'), 3);
});

test('a refused hit is not counted, so it cannot deepen its own ban', () => {
	const { rl } = fixture(2);
	rl.hit('a');
	rl.hit('a');
	rl.hit('a');
	rl.hit('a');
	assert.equal(rl.count('a'), 2);
});

test('keys are independent', () => {
	const { rl } = fixture(1);
	assert.ok(rl.hit('a'));
	assert.ok(!rl.hit('a'));
	assert.ok(rl.hit('b'), 'one key at its limit must not affect another');
});

test('the window slides — it does not reset in fixed blocks', () => {
	const { rl, advance } = fixture(3);
	rl.hit('a'); // t+0
	advance(HOUR / 2);
	rl.hit('a'); // t+30m
	rl.hit('a'); // t+30m
	assert.ok(!rl.hit('a'));

	// t+61m: only the first event has aged out, so exactly one slot frees up
	advance(HOUR / 2 + 60_000);
	assert.equal(rl.count('a'), 2);
	assert.ok(rl.hit('a'));
	assert.ok(!rl.hit('a'));
});

test('a full window of silence clears the key', () => {
	const { rl, advance } = fixture(2);
	rl.hit('a');
	rl.hit('a');
	assert.ok(!rl.hit('a'));
	advance(HOUR + 1);
	assert.equal(rl.count('a'), 0);
	assert.ok(rl.hit('a'));
});

test('allows() reports without counting', () => {
	const { rl } = fixture(2);
	assert.ok(rl.allows('a'));
	assert.ok(rl.allows('a'));
	assert.equal(rl.count('a'), 0, 'checking must not consume budget');

	rl.record('a');
	rl.record('a');
	assert.ok(!rl.allows('a'));
});

test('allows()/record() lets a caller charge only accepted events', () => {
	// The feedback form's contract: a bot tripping the honeypot is rejected
	// before record(), so it cannot lock out a human behind the same address.
	const { rl } = fixture(2);
	const submit = (spam: boolean) => {
		if (!rl.allows('ip')) return 'rate-limited';
		if (spam) return 'rejected';
		rl.record('ip');
		return 'stored';
	};

	assert.equal(submit(true), 'rejected');
	assert.equal(submit(true), 'rejected');
	assert.equal(submit(true), 'rejected');
	assert.equal(submit(false), 'stored', 'spam must not have consumed the budget');
	assert.equal(submit(false), 'stored');
	assert.equal(submit(false), 'rate-limited');
});

test('reset forgets one key, or everything', () => {
	const { rl } = fixture(1);
	rl.hit('a');
	rl.hit('b');
	rl.reset('a');
	assert.ok(rl.hit('a'));
	assert.ok(!rl.hit('b'));

	rl.reset();
	assert.ok(rl.hit('b'));
});

test('keys that stop appearing are swept, not kept forever', () => {
	// The leak this guards: keys are remote addresses on a machine that stays
	// up for weeks. Pruning only the key being read never frees the rest.
	const { rl, advance } = fixture(5);
	for (let i = 0; i < 500; i++) rl.hit(`ip-${i}`);

	// Two windows on, with only one key still active, the other 499 are gone.
	advance(HOUR + 1);
	rl.hit('ip-0');
	advance(HOUR + 1);
	rl.hit('ip-0');

	assert.equal(rl.size(), 1);
});
