<script>
	/**
	 * Site-wide search, as a modal palette — the panel that `SearchChip` and the
	 * Ctrl/Cmd+F, Ctrl/Cmd+K and "/" bindings open.
	 *
	 * A native <dialog> rather than a hand-rolled overlay: `showModal()` traps
	 * focus, makes the rest of the page inert to a screen reader, closes on Esc,
	 * sits in the top layer above every piece of chrome without joining the
	 * z-index argument, and gives us ::backdrop — all things a div would have to
	 * reimplement and would get subtly wrong.
	 *
	 * It owns the chrome, the cursor and the keys. What it does not own is where
	 * the rows come from: the caller passes `groups` and reacts to `query`,
	 * which is what lets one site answer from a bundled list while another waits
	 * on a fetch. A group whose rows are still coming sets `busy` and gets a
	 * spinner on its heading rather than a blank stretch of panel.
	 */
	import { flattenGroups, step } from '../../dist/palette.js';

	let {
		groups = [],
		query = $bindable(''),
		onselect,
		onopen,
		onclose,
		placeholder = 'Search…',
		label = 'Search',
		emptyText,
		pixelated = false,
		footer
	} = $props();

	let dialog = $state(null);
	let input = $state(null);
	let active = $state(0);

	/* One flat list, so ↑/↓ walks the whole thing rather than several lists with
	   boundaries the reader cannot see. The markup renders it group by group and
	   each group offsets its index into this — the cursor and the keys agree on
	   one numbering. */
	const list = $derived(flattenGroups(groups));

	/** Where each group's first row sits in `list`, by group index. */
	const offsets = $derived.by(() => {
		const out = [];
		let n = 0;
		for (const g of groups) {
			out.push(n);
			n += g.rows.length;
		}
		return out;
	});

	/** Nothing found, and nothing still coming that could change that. */
	const blank = $derived(
		Boolean(query.trim()) && list.length === 0 && !groups.some((g) => g.busy)
	);

	// a new query invalidates the cursor; without this, narrowing the results
	// leaves the highlight past the end and Enter navigates nowhere
	$effect(() => {
		query;
		active = 0;
	});

	export function open() {
		query = '';
		active = 0;
		onopen?.();
		dialog?.showModal();
		// showModal focuses the dialog itself, not the field inside it
		queueMicrotask(() => input?.focus());
	}

	export function close() {
		dialog?.close();
	}

	function go(row) {
		close();
		onselect?.(row);
	}

	function onKeydown(e) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = step(active, 1, list.length);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = step(active, -1, list.length);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const row = list[active];
			if (row) go(row);
		}
	}
</script>

<dialog
	bind:this={dialog}
	aria-label={label}
	onclose={() => {
		query = '';
		onclose?.();
	}}
	onclick={(e) => {
		// the backdrop is the dialog element itself; a click inside the panel
		// lands on a child, so this only fires for the surround
		if (e.target === dialog) close();
	}}
>
	<div class="panel">
		<div class="field">
			<span class="field-icon" aria-hidden="true">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="11" cy="11" r="7" />
					<line x1="20" y1="20" x2="16.65" y2="16.65" />
				</svg>
			</span>
			<input
				bind:this={input}
				bind:value={query}
				type="search"
				{placeholder}
				aria-label={label}
				autocomplete="off"
				spellcheck="false"
				onkeydown={onKeydown}
			/>
			<kbd>Esc</kbd>
		</div>

		<ul role="listbox" aria-label="Results" aria-busy={groups.some((g) => g.busy)}>
			{#each groups as group, gi (group.label ?? gi)}
				{#if group.rows.length || group.busy}
					{#if group.label}
						<!-- a seam in the list, not a break in it: ↑/↓ walks straight
						     through, and the spinner rides the heading so a group that
						     cannot answer instantly still shows it is trying -->
						<li class="divider" role="presentation">
							<span>{group.label}</span>
							{#if group.busy}<span class="spinner" aria-hidden="true"></span>{/if}
						</li>
					{/if}

					{#each group.rows as row, i (row.kind + row.id)}
						{@const index = offsets[gi] + i}
						<li>
							<a
								href={row.href}
								class:active={index === active}
								class:muted={row.muted}
								role="option"
								aria-selected={index === active}
								onmouseenter={() => (active = index)}
								onclick={(e) => {
									e.preventDefault();
									go(row);
								}}
							>
								{#if row.icon}
									<img
										class="icon"
										class:round={row.round}
										class:pixelated
										src={row.icon}
										alt=""
										width="22"
										height="22"
										loading="lazy"
									/>
								{:else}
									<span class="icon glyph" aria-hidden="true">{@html row.glyph ?? '⌗'}</span>
								{/if}

								<span class="name" style:color={row.tint || null}>{row.label}</span>
								{#if row.note}<span class="note">{row.note}</span>{/if}
							</a>
						</li>
					{/each}

					{#if group.busy && !group.rows.length && group.pending}
						<li class="pending" role="presentation">{group.pending}</li>
					{/if}
				{/if}
			{/each}

			{#if blank}
				<li class="empty" role="presentation">
					{emptyText ?? `Nothing matches “${query.trim()}”.`}
				</li>
			{/if}
		</ul>

		<footer>
			{#if footer}
				{@render footer()}
			{:else}
				<span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
				<span><kbd>↵</kbd> open</span>
				<!-- Ctrl rather than the platform's own modifier: every binding
				     accepts either, so this line is true on a Mac as well -->
				<span class="wide"><kbd>Ctrl</kbd><kbd>F</kbd> reopen</span>
			{/if}
		</footer>
	</div>
</dialog>

<style>
	dialog {
		border: none;
		background: none;
		padding: 0;
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		color: inherit;
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.55);
		backdrop-filter: blur(2px);
	}

	/* sits high rather than centred: the list grows downwards, and a centred
	   panel would walk up the screen as results arrive */
	.panel {
		width: min(38rem, calc(100vw - 2rem));
		margin: 12vh auto 0;
		background: var(--surface);
		border: var(--border-width) solid var(--border-strong);
		border-radius: var(--radius-3);
		box-shadow: var(--shadow-2);
		overflow: hidden;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px 14px;
		border-bottom: var(--border-width) solid var(--border);
	}

	.field-icon {
		display: flex;
		flex: none;
		color: var(--text-faint);
	}
	.field-icon svg {
		width: 17px;
		height: 17px;
	}

	/* --text-lg is 18px: at or above 16px, which is what stops iOS zooming the
	   page the moment the field takes focus */
	.field input {
		flex: 1;
		min-width: 0;
		border: none;
		background: none;
		font-family: var(--font-sans);
		font-size: var(--text-lg);
		line-height: 1.4;
		color: var(--text);
		outline: none;
	}
	.field input::placeholder {
		color: var(--text-faint);
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 5px;
		max-height: 50vh;
		overflow-y: auto;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 9px 9px 4px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-faint);
	}
	/* the rule fills whatever the heading and the spinner leave, so the spinner
	   sits beside the word rather than out at the far end of the panel */
	.divider span:first-child {
		flex: none;
	}
	.divider::after {
		content: '';
		order: 3;
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	/* An arc, not a full ring: a circle spinning is only legible because part of
	   it is missing. 10px, so it reads as punctuation on the heading rather than
	   as a piece of chrome the panel grew. */
	.spinner {
		width: 10px;
		height: 10px;
		flex: none;
		border: 1.5px solid var(--border-strong);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 700ms linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}
	/* Turning is the part that has to go, not the indicator: the arc stays, and
	   fades instead. The word below it carries the meaning either way. */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: fade 1.6s ease-in-out infinite;
		}
		@keyframes fade {
			50% {
				opacity: 0.25;
			}
		}
	}

	/* the placeholder for the first query of a session, when there are no rows
	   from a previous term to leave standing */
	.pending {
		padding: 7px 9px;
		font-size: var(--text-sm);
		color: var(--text-faint);
	}

	a {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 9px;
		border-radius: var(--radius-2);
		text-decoration: none;
		color: inherit;
	}

	/* one highlight for both pointer and keyboard: hovering moves `active`, so
	   there is never a second, competing indicator */
	a.active {
		background: var(--surface-raised);
	}

	.icon {
		width: 22px;
		height: 22px;
		flex: none;
		object-fit: cover;
		border-radius: 4px;
	}
	.icon.round {
		border-radius: 50%;
	}
	/* pixel art, drawn at its own scale rather than smeared by the browser's
	   smoothing — an item sprite, not a photograph */
	.icon.pixelated {
		object-fit: contain;
		image-rendering: pixelated;
	}
	.glyph {
		display: grid;
		place-items: center;
		color: var(--text-faint);
	}
	.glyph :global(svg) {
		width: 16px;
		height: 16px;
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* a way out of the palette, not an answer in it */
	a.muted .name {
		color: var(--text-dim);
	}

	.note {
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--text-faint);
		white-space: nowrap;
	}

	.empty {
		padding: 10px 9px;
		color: var(--text-dim);
		font-size: var(--text-sm);
	}

	footer {
		display: flex;
		gap: 14px;
		padding: 7px 14px;
		border-top: var(--border-width) solid var(--border);
		background: var(--surface-sunken);
		font-size: var(--text-xs);
		color: var(--text-faint);
	}

	kbd {
		font-family: var(--font-mono);
		font-size: 10px;
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-1);
		padding: 0 0.35em;
		margin-right: 0.2em;
		color: var(--text-dim);
	}

	/* the shortcut hint is no use to the device that has no keyboard */
	@media (max-width: 620px) {
		.panel {
			margin-top: 6vh;
		}
		footer :global(.wide) {
			display: none;
		}
	}
</style>
