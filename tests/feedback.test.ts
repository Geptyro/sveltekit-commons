/**
 * Feedback form validation and field reading (node:test, `npm test`).
 *
 * Ported from UAR, where these rules lived before STALZONE needed the same
 * form. The honeypot and non-string cases are the ones with teeth: both are
 * what a submission looks like when it did not come from the rendered form.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	validateFeedback,
	readFeedbackForm,
	DEFAULT_FEEDBACK_LIMITS as L
} from '../src/helpers/feedback.ts';

const input = (over: Record<string, unknown>) => ({
	message: 'This unit page shows the wrong damage value.',
	name: '',
	contact: '',
	website: '',
	...over
});

test('valid message alone passes, optional fields omitted', () => {
	const v = validateFeedback(input({}));
	assert.ok(v.ok);
	assert.deepEqual(v.fields, { message: 'This unit page shows the wrong damage value.' });
});

test('name and contact are trimmed and included when present', () => {
	const v = validateFeedback(input({ name: '  Znimu ', contact: ' someone@example.com ' }));
	assert.ok(v.ok);
	assert.equal(v.fields.name, 'Znimu');
	assert.equal(v.fields.contact, 'someone@example.com');
});

test('message is trimmed before length check', () => {
	const v = validateFeedback(input({ message: '   short   ' }));
	assert.ok(!v.ok); // "short" is 5 chars < messageMin
});

test('too-short and empty messages are rejected', () => {
	assert.ok(!validateFeedback(input({ message: '' })).ok);
	assert.ok(!validateFeedback(input({ message: 'hi' })).ok);
});

test('overlong fields are rejected', () => {
	assert.ok(!validateFeedback(input({ message: 'x'.repeat(L.messageMax + 1) })).ok);
	assert.ok(!validateFeedback(input({ name: 'x'.repeat(L.nameMax + 1) })).ok);
	assert.ok(!validateFeedback(input({ contact: 'x'.repeat(L.contactMax + 1) })).ok);
});

test('exactly max-length message passes', () => {
	assert.ok(validateFeedback(input({ message: 'x'.repeat(L.messageMax) })).ok);
});

test('filled honeypot rejects the submission', () => {
	assert.ok(!validateFeedback(input({ website: 'https://spam.example' })).ok);
});

test('the honeypot rejection does not say it was the honeypot', () => {
	const v = validateFeedback(input({ website: 'https://spam.example' }));
	assert.ok(!v.ok);
	assert.ok(!/website|honeypot/i.test(v.error), 'a bot that learns the tell stops filling it');
});

test('non-string fields are treated as empty, not crashes', () => {
	assert.ok(!validateFeedback(input({ message: null })).ok);
	assert.ok(!validateFeedback(input({ message: 42 })).ok);
	const v = validateFeedback(input({ name: undefined, contact: 7, website: null }));
	assert.ok(v.ok);
	assert.deepEqual(v.fields, { message: 'This unit page shows the wrong damage value.' });
});

test('limits are overridable per site', () => {
	const strict = { ...L, messageMin: 200 };
	assert.ok(validateFeedback(input({})).ok);

	const v = validateFeedback(input({}), strict);
	assert.ok(!v.ok);
	assert.match(v.error, /at least 200/, 'the message quotes the limit it was given');
});

test('readFeedbackForm pulls the fields the shared form renders', () => {
	const form = new FormData();
	form.set('message', ' a real message ');
	form.set('name', 'Znimu');
	form.set('contact', '');
	form.set('website', '');

	const { input: read, values } = readFeedbackForm(form);
	const v = validateFeedback(read);
	assert.ok(v.ok);
	assert.deepEqual(v.fields, { message: 'a real message', name: 'Znimu' });

	// values are the raw strings, untrimmed — they go back into the textarea
	assert.deepEqual(values, { message: ' a real message ', name: 'Znimu', contact: '' });
});

test('readFeedbackForm turns missing fields into empty strings, not "null"', () => {
	const { input: read, values } = readFeedbackForm(new FormData());
	assert.deepEqual(values, { message: '', name: '', contact: '' });
	assert.ok(!validateFeedback(read).ok);
});
