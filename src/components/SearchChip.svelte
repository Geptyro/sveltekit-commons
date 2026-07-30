<script>
	/**
	 * The top bar's way into the search palette.
	 *
	 * The keyboard shortcuts are the fast path, but they are also invisible and
	 * a phone has no keyboard to press them on — so the palette gets a control
	 * you can see and tap, sized like the chips beside it.
	 *
	 * Wide, it names its own shortcut; compact it is the magnifier alone, which
	 * is the shape a phone has room for.
	 *
	 * Three keys open the palette (see `isSearchShortcut`) and the chip only has
	 * room to name one, so it names Ctrl/Cmd+F: the one already in the hand of
	 * anyone who wants to find something on a page, and the easiest of the three
	 * to reach. It does shadow the browser's find-in-page, which is the cost of
	 * saying it out loud — the other two are in the tooltip for anyone who would
	 * rather keep that key.
	 */
	import { onMount } from 'svelte';
	import { modKey } from '../../dist/palette.js';

	let {
		onopen,
		compact = false,
		label = 'Search',
		shortcut = 'F',
		title = '',
		icon,
		class: klass = '',
		...rest
	} = $props();

	/* Resolved after mount, not during render: a layout like this is usually
	   prerendered, so the markup is built on a machine that is nobody's. */
	let mod = $state('Ctrl');
	onMount(() => {
		mod = modKey(navigator.userAgent);
	});

	const hint = $derived(title || `${label} — ${mod}+F, ${mod}+K or /`);
</script>

<button
	class="search-chip {klass}"
	class:compact
	onclick={onopen}
	aria-label={label}
	title={hint}
	{...rest}
>
	<span class="glyph" aria-hidden="true">
		{#if icon}
			{@render icon()}
		{:else}
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
		{/if}
	</span>
	{#if !compact}
		<span class="label">{label}</span>
		{#if shortcut}<kbd>{mod} {shortcut}</kbd>{/if}
	{/if}
</button>

<style>
	/* 30px, the height every other chip in a top bar takes here, so the bar
	   reads as one row of controls rather than three sizes of them */
	.search-chip {
		display: flex;
		align-items: center;
		gap: 7px;
		height: 30px;
		padding: 0 8px 0 9px;
		background: var(--surface);
		color: var(--text-dim);
		border: var(--border-width) solid var(--border-strong);
		border-radius: 99px;
		cursor: pointer;
		transition:
			border-color 120ms ease,
			color 120ms ease,
			background 120ms ease;
	}
	.search-chip:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.search-chip.compact {
		width: 30px;
		padding: 0;
		justify-content: center;
	}

	.glyph {
		display: flex;
		flex: none;
	}
	.glyph :global(svg) {
		width: 15px;
		height: 15px;
	}

	.label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 500;
		line-height: 1;
		letter-spacing: 0.03em;
	}

	/* the shortcut, worn like a label: quiet, and it never takes the hover
	   colour — it is a fact about the button, not part of the button's state */
	kbd {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 500;
		line-height: 1;
		color: var(--text-faint);
		background: var(--surface-raised);
		border-radius: var(--radius-1);
		padding: 4px 5px;
	}
</style>
