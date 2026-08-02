<script>
	/**
	 * A page's own bar of tabs, pinned under the shell's.
	 *
	 * This is the frame for a subject that has more to say than one column can
	 * hold — an item's stats, its recipe and its price history; a product's
	 * sheet, its readings and its nutrition. Each tab is an ordinary link to a
	 * sub-route, so it prerenders by crawling, middle-clicks, and works with
	 * JavaScript off.
	 *
	 * ── Where it has to sit ──────────────────────────────────────────────
	 *
	 * First thing inside AppShell's content column, and nowhere else. The
	 * margins are what make it a bar rather than a boxed widget: it bleeds out
	 * through `--content-pad-x` on both sides so nothing scrolls past in the
	 * gutters, and up through `--content-pad-top` so there is no seam between it
	 * and the header above. Put it below anything and those negative margins pull
	 * it over whatever came first.
	 *
	 * `top: 0` and not `--chrome-h`: AppShell scrolls `main`, not the window, and
	 * its header sits outside that box — so zero parks this directly beneath it.
	 * It takes the header's surface and rule for the same reason, and the two
	 * read as one stack of chrome.
	 *
	 * ── One tab is no choice, unless the bar is also a place ─────────────
	 *
	 * By default fewer than two tabs renders nothing, so a subject that has only
	 * its overview reads exactly as it did before it was ever split, and the bar
	 * appears on its own the day a second tab is earned.
	 *
	 * `showAlone` overrides that, and there is a real argument for it: on a site
	 * where every detail page carries the bar, a page that drops it looks like a
	 * page that lost its chrome rather than one with less to say. A lone tab
	 * stops being a choice and becomes a label for where you are. Which reading
	 * is right depends on how uniform the rest of the site is, so it is the
	 * caller's call.
	 */
	import { onMount } from 'svelte';

	let {
		/**
		 * In tab order. `key` is what `active` is matched against — the caller's
		 * own name for the tab, usually a path segment; it falls back to `href`.
		 * `icon` is inert markup you own, rendered with `{@html}`, and below
		 * 900px it is all a tab shows.
		 */
		tabs = [],
		/** `key` (or `href`) of the tab being shown. */
		active = '',
		/** Accessible name for the bar — say what the tabs are sections *of*. */
		label = 'Sections',
		/**
		 * Draw the bar even when there is only one tab. Never draws an empty one:
		 * no tabs is still nothing at all.
		 */
		showAlone = false,
		/**
		 * The bar's measured height. Bindable, because a tab that wants the rest
		 * of the window has to subtract it, and it changes between the wide and
		 * the icons-only layout — so it is measured, never guessed.
		 */
		height = $bindable(0),
		/**
		 * Claim `KeyQ` and `KeyE` — previous and next tab — and the number row.
		 *
		 * Bound by POSITION, not by character, exactly as the digits are: `KeyQ`
		 * is the key an AZERTY keyboard prints "A" on and a QWERTY one prints
		 * "Q" on, so the same two fingers work on both layouts and there is
		 * nothing for a reader to configure. The hint names whatever their own
		 * keyboard prints.
		 *
		 * **Off by default.** These are typing keys, so a page that takes them
		 * has to be sure it is not somewhere people type: `claimable` stands
		 * down inside inputs and while a dialog is open, but that is a floor,
		 * not a licence. Right for a reference browsed with a mouse.
		 */
		shortcuts = false,
		/**
		 * Physical key codes for previous and next tab, when `shortcuts` is on.
		 *
		 * Props rather than constants, so the question of a settings page never
		 * has to be answered here: a site that really does want its bindings
		 * configurable already holds its own preferences and can pass them in.
		 * Positional binding is what makes that unnecessary for almost everyone
		 * — the defaults are already the same two fingers on every layout.
		 */
		prevKey = 'KeyQ',
		nextKey = 'KeyE',
		/** Where `shortcuts` sends the reader. Required for them to do anything. */
		onnavigate = null,
		class: klass = '',
		...rest
	} = $props();

	const keyOf = (t) => t.key ?? t.href;

	/** Shared by both bindings: a press nothing else has a better claim on. */
	function claimable(e) {
		if (!shortcuts || !onnavigate) return false;
		if (e.ctrlKey || e.metaKey || e.altKey) return false;
		if (tabs.length < 2) return false;
		const el = e.target;
		if (el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? ''))
			return false;
		// the palette traps focus and manages its own order; stealing Tab from an
		// open dialog leaves it unusable
		return !document.querySelector('dialog[open]');
	}

	function onkeydown(e) {
		if (!claimable(e)) return;

		/* Previous/next, by physical position — `KeyQ` and `KeyE` are "A" and
		   "E" on AZERTY, "Q" and "E" on QWERTY. Neither is the key that moves
		   focus, which is what lets this be offered at all: a Tab binding would
		   have made everything inside the tab unreachable without a pointer. */
		const step = e.code === prevKey ? -1 : e.code === nextKey ? 1 : 0;
		if (step) {
			if (e.shiftKey) return;
			e.preventDefault();
			const i = tabs.findIndex((t) => keyOf(t) === active);
			onnavigate(tabs[(Math.max(i, 0) + step + tabs.length) % tabs.length].href);
			return;
		}

		/* The number row, by POSITION rather than by character.

		   `e.code` is the physical key: the one an AZERTY keyboard prints "&" on
		   reports `Digit1`, exactly as QWERTY's "1" does. So the same finger
		   works on both layouts and there is nothing for a reader to configure —
		   which is why this needs no settings page. `e.key` would have needed
		   one, because it reports "&" and "1" respectively, and the list of
		   layouts is not one anybody wants to maintain by hand. */
		const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
		if (!m || e.shiftKey) return;
		const tab = tabs[Number(m[1]) - 1];
		if (!tab) return;
		e.preventDefault();
		onnavigate(tab.href);
	}

	/**
	 * What each number key actually prints on this reader's keyboard.
	 *
	 * The binding is positional, but a hint has to name the key they will
	 * physically press: telling a French reader to press "2" when their key is
	 * marked "é" is worse than saying nothing. `getLayoutMap` answers exactly
	 * that. It is Chromium-only and secure-context-only, so the digits stand in
	 * everywhere else — which is right, because the layouts that cannot answer
	 * are overwhelmingly the ones whose caps say the digits anyway.
	 *
	 * Resolved on mount, never during render: it is a fact about one machine,
	 * and a prerendered page is built on one that is nobody's.
	 */
	let keyCaps = $state([]);
	/** What the two nav keys print here — "A"/"E" on AZERTY, "Q"/"E" on QWERTY. */
	let navCaps = $state({ prev: 'Q', next: 'E' });
	onMount(async () => {
		if (!shortcuts) return;
		try {
			const map = await navigator.keyboard?.getLayoutMap?.();
			if (!map) return;
			keyCaps = Array.from({ length: 9 }, (_, i) => map.get(`Digit${i + 1}`) ?? '');
			navCaps = {
				prev: (map.get(prevKey) || 'Q').toUpperCase(),
				next: (map.get(nextKey) || 'E').toUpperCase()
			};
		} catch {
			// unsupported or blocked; the defaults above are already the answer
		}
	});

	/** The cap for tab `i`, falling back to the digit its position implies. */
	const capFor = (i) => keyCaps[i] || String(i + 1);
</script>

<!-- Unconditional: `<svelte:window>` cannot sit inside a block, and wrapping it
     in one is a compile error the consuming site only sees at render time —
     svelte-check passes and every page 500s. `claimable` is the gate instead,
     and it answers false the moment `shortcuts` is off. -->
<svelte:window {onkeydown} />

{#if tabs.length > (showAlone ? 0 : 1)}
	<nav class="tabs {klass}" bind:clientHeight={height} aria-label={label} {...rest}>
		{#each tabs as t, i (keyOf(t))}
			<!-- The label is hidden below 900px, not removed, so `aria-label`
			     carries the name at every width and the tooltip covers a pointer
			     that cannot read the glyph either. -->
			<a
				href={t.href}
				aria-current={keyOf(t) === active ? 'page' : undefined}
				aria-label={t.label}
				title={t.label}
			>
				{#if t.icon}{@html t.icon}{/if}
				<span class="label">{t.label}</span>
				{#if shortcuts && onnavigate && i < 9}<kbd class="cap">{capFor(i)}</kbd>{/if}
			</a>
		{/each}

		{#if shortcuts && onnavigate}
			<!-- The bar is the only place the binding is discoverable, so it says
			     so — quietly, and only where there is room for it. -->
			<span class="hint" aria-hidden="true"
				><kbd>{navCaps.prev}</kbd> back · <kbd>{navCaps.next}</kbd> next</span
			>
		{/if}
	</nav>
{/if}

<style>
	.tabs {
		position: sticky;
		top: 0;
		/* under the drawer (--z-nav: 50), over the page */
		z-index: 20;
		display: flex;
		align-items: stretch;
		gap: var(--space-1);
		height: 36px;
		overflow-x: auto;
		scrollbar-width: none;
		margin: calc(-1 * var(--content-pad-top, 26px)) calc(-1 * var(--content-pad-x, 36px))
			var(--space-4);
		padding: 0 var(--content-pad-x, 36px);
		background: var(--surface-sunken);
		border-bottom: var(--border-width) solid var(--border);
	}

	.tabs::-webkit-scrollbar {
		display: none;
	}

	.tabs a {
		flex: none;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 0 var(--space-3);
		color: var(--text-dim);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		text-decoration: none;
		white-space: nowrap;
	}

	/* `:global` because the glyph arrives by `{@html}` — the compiler cannot
	   mark up markup it never saw. */
	.tabs a :global(svg) {
		width: 15px;
		height: 15px;
		flex: none;
	}

	.tabs a:hover {
		color: var(--text);
	}

	/* An inset shadow rather than a border: the link is stretched to the bar's
	   full height, so a real border would have to be juggled against the bar's
	   own bottom rule with negative margins. This just draws over it. */
	.tabs a[aria-current='page'] {
		box-shadow: inset 0 -2px 0 var(--accent);
		color: var(--text);
	}

	/* the number key that jumps straight here, worn on the tab it belongs to */
	.cap {
		font-family: var(--font-mono);
		font-size: 9px;
		line-height: 1;
		padding: 2px 3px;
		border-radius: var(--radius-1);
		background: var(--surface-raised);
		color: var(--text-faint);
	}

	.tabs a[aria-current='page'] .cap {
		color: var(--text-dim);
	}

	/* pushed to the far end and kept quiet: a hint, not a control */
	.hint {
		margin-left: auto;
		align-self: center;
		padding-left: var(--space-3);
		flex: none;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.04em;
		text-transform: none;
		color: var(--text-faint);
		white-space: nowrap;
	}

	.hint kbd {
		font-family: var(--font-mono);
		font-size: 10px;
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-1);
		padding: 0 0.35em;
		margin-left: 2px;
		color: var(--text-faint);
	}

	/* Icons only, at the width where AppShell drops its own labels and folds the
	   rail into a drawer — the tab bar goes quiet at the same moment the rest of
	   the chrome does, rather than at a line of its own. Hardcoded because a
	   media query cannot read a prop, so it tracks AppShell's `wideAt` default;
	   a site that moves that breakpoint has to restate this one. */
	@media (max-width: 899.98px) {
		.tabs a {
			/* square, so a row of them reads as buttons and not a ragged strip */
			justify-content: center;
			padding: 0;
			min-width: 44px;
		}
		.label,
		.cap,
		.hint {
			display: none;
		}
		.tabs a :global(svg) {
			width: 18px;
			height: 18px;
		}
	}
</style>
