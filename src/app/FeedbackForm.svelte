<script>
	/**
	 * The visitor feedback form: message, optional name and contact, honeypot.
	 *
	 * Lives on the `./app` entry rather than the root because of `use:enhance`
	 * — `$app/forms` is a SvelteKit virtual module, and the root entry has to
	 * stay resolvable from a plain Svelte app (the Electron companion).
	 *
	 * The site owns the action, the storage and the copy around this; this owns
	 * the fields, the limits and the failure states. It renders no colour of
	 * its own — every value below is a contract token, so the form arrives in
	 * the consuming site's palette without being told about it.
	 */
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	// Reaches into the committed dist/ on purpose: the limits are shared with
	// the form action, which imports them from `sveltekit-commons/feedback`.
	// A self-reference by package name would resolve too, but this is one less
	// thing depending on how a consumer's bundler treats the exports map.
	import { DEFAULT_FEEDBACK_LIMITS } from '../../dist/feedback.js';

	let {
		/** The action's `ActionData`: `{ success }` or `{ error, values }`. */
		form,
		limits = DEFAULT_FEEDBACK_LIMITS,
		/** Passed through to the `<form>`; default posts to the current route. */
		action = '',
		messagePlaceholder = "What's wrong, missing, or worth adding?",
		namePlaceholder = 'Your name',
		contactPlaceholder = 'Discord, e-mail — if you want a reply',
		sendLabel = 'Send feedback',
		successTitle = 'Thanks — your feedback is saved.',
		/**
		 * Where "send another" points. Defaults to the current path, with
		 * `data-sveltekit-reload` so it re-enters the route rather than
		 * re-rendering the same `form` prop and landing back on this card.
		 */
		againHref = page.url.pathname,
		/** Replaces the whole success card. */
		success
	} = $props();

	let sending = $state(false);
</script>

{#if form?.success}
	{#if success}
		{@render success()}
	{:else}
		<div class="surface thanks">
			<p class="thanks-title">{successTitle}</p>
			<p class="thanks-sub">
				It will be read soon. <a href={againHref} data-sveltekit-reload>Send another</a>
			</p>
		</div>
	{/if}
{:else}
	<form
		class="surface fb"
		method="POST"
		{action}
		use:enhance={() => {
			sending = true;
			return async ({ update }) => {
				sending = false;
				await update();
			};
		}}
	>
		<label class="field">
			<span class="label">Message</span>
			<textarea
				name="message"
				rows="7"
				required
				maxlength={limits.messageMax}
				placeholder={messagePlaceholder}
				value={form?.values?.message ?? ''}
			></textarea>
		</label>

		<div class="row">
			<label class="field">
				<span class="label">Name <em>(optional)</em></span>
				<input
					type="text"
					name="name"
					maxlength={limits.nameMax}
					placeholder={namePlaceholder}
					value={form?.values?.name ?? ''}
				/>
			</label>
			<label class="field">
				<span class="label">Contact <em>(optional)</em></span>
				<input
					type="text"
					name="contact"
					maxlength={limits.contactMax}
					placeholder={contactPlaceholder}
					value={form?.values?.contact ?? ''}
				/>
			</label>
		</div>

		<!-- honeypot: humans never see this field; bots fill it and get rejected.
		     Off-screen rather than display:none, which the better bots check for. -->
		<div class="hp" aria-hidden="true">
			<label>
				Website
				<input type="text" name="website" tabindex="-1" autocomplete="off" />
			</label>
		</div>

		<div class="actions">
			<button type="submit" disabled={sending}>{sending ? 'Sending…' : sendLabel}</button>
			{#if form?.error}
				<p class="result err" role="alert">{form.error}</p>
			{/if}
		</div>
	</form>
{/if}

<style>
	/* Carries its own surface rather than borrowing a site's `.card`: UAR
	   defines one globally, STALZONE defines nothing of the sort, and a
	   component whose background only arrives if you also adopted a particular
	   stylesheet is the exact failure this package was split out to fix. The
	   declarations match commons' own `Card`, so the two sit together. */
	.surface {
		background: var(--surface);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-3);
		box-shadow: var(--shadow-1);
	}

	.fb {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: 640px;
		padding: var(--space-4) var(--space-5);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		flex: 1;
		min-width: 200px;
	}
	.label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-faint);
	}
	.label em {
		font-style: normal;
		text-transform: none;
		letter-spacing: 0.02em;
		font-weight: 400;
	}
	textarea,
	input[type='text'] {
		background: var(--surface);
		color: var(--text);
		border: var(--border-width) solid var(--border-strong);
		border-radius: var(--radius-2);
		padding: var(--space-2) var(--space-3);
		font: inherit;
		transition:
			border-color 120ms ease,
			box-shadow 120ms ease;
	}
	textarea {
		resize: vertical;
		min-height: 120px;
		line-height: 1.55;
	}
	textarea:focus,
	input[type='text']:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}
	textarea::placeholder,
	input[type='text']::placeholder {
		color: var(--text-faint);
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
	.hp {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		flex-wrap: wrap;
	}
	.actions button {
		padding: var(--space-2) var(--space-5);
		border: none;
		border-radius: var(--radius-2);
		background: var(--accent);
		color: var(--accent-contrast);
		font-family: var(--font-sans);
		font-weight: 650;
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.actions button:hover {
		background: var(--accent-dim);
	}
	.actions button:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	.result {
		margin: 0;
		font-size: var(--text-sm);
		font-weight: 600;
	}
	/* --danger, not a site-local name: this is the contract's status colour. */
	.result.err {
		color: var(--danger);
	}
	.thanks {
		max-width: 640px;
		padding: var(--space-5);
	}
	.thanks-title {
		margin: 0;
		font-weight: 650;
		color: var(--accent);
	}
	.thanks-sub {
		margin: var(--space-2) 0 0;
		font-size: var(--text-sm);
		color: var(--text-dim);
	}
	.thanks-sub a {
		color: var(--accent);
		text-decoration: none;
		font-weight: 550;
	}
	.thanks-sub a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
