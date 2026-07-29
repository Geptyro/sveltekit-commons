<script>
	/**
	 * The app shell: a top bar, a sidebar that collapses to an icon rail on
	 * wide screens and slides in as a drawer on narrow ones, and a scrolling
	 * content column.
	 *
	 * Router-free on purpose. It used to sit behind the package's SvelteKit
	 * entry for one call — afterNavigate, to close the drawer after an in-page
	 * link — which put it out of reach of every Svelte app that is not a
	 * SvelteKit one. That call is a `closeOn` prop now, so the Electron
	 * companion runs the same shell as the site instead of a copy of it;
	 * `sveltekit-commons/app` still exports a wrapper that wires afterNavigate
	 * for SvelteKit callers, and their markup does not change.
	 *
	 * Everything site-specific arrives as a snippet — the brand mark, the page
	 * heading, the top-right tools, the sidebar's contents and its footer. What
	 * is here is the geometry and the behaviour: the breakpoints, the burger,
	 * the drawer and its scrim, the remembered collapse, and the rail's scroll
	 * hints.
	 *
	 * ── How the collapse works ───────────────────────────────────────────
	 *
	 * `.shell` declares the collapsed geometry as custom properties and the two
	 * expanded states override them. Nothing toggles a class on a nav row, and
	 * nothing measures anything: the rail's width, the label visibility, the
	 * icon size and the burger's own glyph all read from the same variables and
	 * transition together.
	 *
	 * That also solves the awkward part of putting this in a package. Svelte
	 * scopes styles to the component that declares the markup, so this file
	 * cannot style anything a caller passes in through a snippet. It does not
	 * need to — the variables cascade, so snippet content that reads them
	 * collapses in step. The ones worth knowing:
	 *
	 *   --label-display   `none` in the rail, `block` expanded. Put it on any
	 *                     text that should disappear when the rail collapses.
	 *   --nav-slot        icon column width      --nav-glyph  icon size
	 *   --nav-pad-x/y     row padding            --nav-justify  row alignment
	 *   --label-align     alignment for group headings
	 *   --foot-dir        footer stacking direction (column; a site may override)
	 *
	 * NavItem and NavSection already read them, so the common cases need none
	 * of this.
	 */
	import { onMount } from 'svelte';

	let {
		/** localStorage key for the remembered collapse, e.g. `sz:nav-open`. */
		navKey = 'nav-open',
		/**
		 * Any change to this value closes an open drawer. It exists because the
		 * shell cannot ask a router whether the page changed — the SvelteKit
		 * wrapper on `sveltekit-commons/app` feeds it from afterNavigate, and an
		 * app with no router (the Electron companion) bumps it from its own view
		 * state, or leaves it alone and closes from the `nav` snippet's `close`.
		 */
		closeOn = 0,
		/** At or above this width the sidebar docks instead of overlaying. */
		wideAt = 900,
		/** Below this the `tools` snippet is asked to render compactly. */
		compactAt = 1100,
		/** Accessible name for the burger's target. */
		navLabel = 'Main',
		brand,
		crumb,
		tools,
		nav,
		foot,
		children
	} = $props();

	/* `navOpen === null` means "not decided yet" — the CSS default (docked when
	   wide) then holds, so prerendered markup cannot flash the wrong state. */
	let wide = $state(true);
	let compact = $state(false);
	let navOpen = $state(null);
	const drawer = $derived(navOpen === true && !wide);

	onMount(() => {
		const wideMq = matchMedia(`(min-width: ${wideAt}px)`);
		const compactMq = matchMedia(`(max-width: ${compactAt}px)`);
		const syncNav = () => {
			wide = wideMq.matches;
			// a phone always starts closed; a desktop restores your last choice
			let remembered = true;
			try {
				remembered = localStorage.getItem(navKey) !== '0';
			} catch {
				// private mode, or storage disabled: default to open
			}
			navOpen = wide ? remembered : false;
		};
		const syncCompact = () => (compact = compactMq.matches);
		syncNav();
		syncCompact();
		wideMq.addEventListener('change', syncNav);
		compactMq.addEventListener('change', syncCompact);
		return () => {
			wideMq.removeEventListener('change', syncNav);
			compactMq.removeEventListener('change', syncCompact);
		};
	});

	function toggleNav() {
		navOpen = !(navOpen ?? wide);
		if (wide) {
			try {
				localStorage.setItem(navKey, navOpen ? '1' : '0');
			} catch {
				// as above: the choice just won't outlive the tab
			}
		}
	}

	/* The rail's edge hints: which way there is more to see. Reading it from
	   the scroll position is what lets CSS fade each edge in and out — the two
	   numbers are the only state the stylesheet needs. */
	/* Width the brand actually occupies, fed to --brand-w so the crumb's offset
	   lands on the content column's left edge.
	   Only applied once measured, so a site that declares --brand-w itself (UAR
	   sets 32px) keeps its value through SSR and the first paint, and simply
	   gets a more accurate one after hydration. Overriding from zero would make
	   the heading jump on every load. */
	let brandW = $state(0);

	let sideEl = $state(null);
	let hintUp = $state(0);
	let hintDown = $state(0);
	function syncHints() {
		if (!sideEl) return;
		const max = sideEl.scrollHeight - sideEl.clientHeight;
		hintUp = sideEl.scrollTop > 1 ? 1 : 0;
		hintDown = max > 1 && sideEl.scrollTop < max - 1 ? 1 : 0;
	}
	onMount(() => {
		if (!sideEl) return;
		// the box for viewport and collapse changes, the children for the
		// content growing or folding under them
		const ro = new ResizeObserver(syncHints);
		ro.observe(sideEl);
		for (const child of sideEl.children) ro.observe(child);
		return () => ro.disconnect();
	});

	/* Picking a destination closes the overlay; the docked sidebar stays put.
	   Both routes earn their keep: `closeOn` catches links inside the page, and
	   `close` is handed to the nav snippet for a tap on the page you are
	   already on, which navigates nowhere and so changes nothing. */
	const close = () => {
		if (!wide) navOpen = false;
	};
	/* the initial run is the mount, which is not a navigation */
	let closeArmed = false;
	$effect(() => {
		closeOn;
		if (closeArmed) close();
		else closeArmed = true;
	});
</script>

<div
	class="shell"
	class:nav-open={navOpen === true}
	class:nav-closed={navOpen === false}
	style={brandW ? `--brand-w: ${brandW}px` : undefined}
>
	<header class="topbar">
		<button
			class="burger"
			onclick={toggleNav}
			aria-label={(navOpen ?? wide) ? 'Close menu' : 'Open menu'}
			aria-expanded={navOpen ?? wide}
			aria-controls="site-nav"
			title="Menu"
		>
			<!-- one glyph, not two icons swapped: the bars fold into the cross and
			     the whole mark turns with them, so opening and closing read as the
			     same motion run both ways. Which end it rests at comes from the
			     shell variables, so prerendered markup cannot flash the wrong
			     icon before the nav state is known. -->
			<span class="burger-glyph" aria-hidden="true">
				<span class="bar"></span><span class="bar"></span><span class="bar"></span>
			</span>
		</button>

		<!-- measured, not declared: the crumb's offset subtracts whatever the brand
	     occupies, and a consumer cannot be expected to keep a hand-written
	     --brand-w in step with a logo that changes with the viewport or reflows
	     when its font loads. Zero until hydration, which the max() below absorbs. -->
	{#if brand}<div class="brand" bind:clientWidth={brandW}>{@render brand()}</div>{/if}

		<!-- the elastic item, and it starts where the content starts, so the
		     heading sits directly above its own column -->
		<div class="crumb">{@render crumb?.()}</div>

		{#if tools}<div class="tools">{@render tools(compact)}</div>{/if}
	</header>

	<div class="body">
		{#if drawer}
			<button class="scrim" aria-label="Close menu" onclick={() => (navOpen = false)}></button>
		{/if}

		<aside
			class="sidebar"
			id="site-nav"
			bind:this={sideEl}
			onscroll={syncHints}
			ontransitionend={syncHints}
			style="--hint-up: {hintUp}; --hint-down: {hintDown}"
		>
			<nav aria-label={navLabel}>{@render nav?.(close)}</nav>
			{#if foot}<div class="foot">{@render foot()}</div>{/if}
		</aside>

		<main>
			<div class="content">{@render children?.()}</div>
		</main>
	</div>
</div>

<style>
	.shell {
		/* ── shell metrics; a site may override any of them ─────────────── */
		--rail-w: 58px;
		--chrome-h: 52px;
		--content-pad-x: 36px;
		--top-gap: 10px;
		--top-pad-x: 14px;
		--burger-w: 34px;
		--z-scrim: 45;
		--z-nav: 50;

		/* ── collapsed geometry; the two blocks below expand it ─────────── */
		--side-w: var(--rail-w);
		--side-pad-x: 8px;
		--label-display: none;
		--nav-justify: center;
		--nav-pad-x: 0px;
		--nav-pad-y: 5px;
		--label-align: center;
		/* Stacked in both states. Side by side reads better in the rail and was
		   the original choice, but it only fit while the footer had two marks —
		   a third (the tip link) ran it off the 42px of usable width a 58px rail
		   has. A column cannot overflow however many links a site puts there. */
		--foot-dir: column;
		--side-scrollbar: none;
		/* with no labels to line up against, the icons take the room back */
		--nav-slot: 28px;
		--nav-glyph: 20px;

		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100dvh;
	}

	/* Expanded, in two halves: wide screens unless you collapsed the nav,
	   narrow screens only while the drawer is open. Keep them in step. */
	@media (min-width: 900px) {
		.shell:not(.nav-closed) {
			--side-w: 240px;
			--side-pad-x: 12px;
			--label-display: block;
			--nav-justify: flex-start;
			--nav-pad-x: 10px;
			--nav-pad-y: 7px;
			--label-align: left;
			--side-scrollbar: thin;
			--nav-slot: 22px;
			--nav-glyph: 16px;
			/* the button says what it does next: close */
			--burger-turn: 180deg;
			--burger-fold: 6px;
			--burger-cross: 45deg;
			--burger-mid: 0;
		}
	}
	@media (max-width: 899.98px) {
		.shell {
			--content-pad-x: 16px;
		}
		/* --side-w stays the rail: the panel overlays the content, so the
		   gutter under it must not move */
		.shell.nav-open {
			--side-pad-x: 12px;
			--label-display: block;
			--nav-justify: flex-start;
			--nav-pad-x: 10px;
			--nav-pad-y: 7px;
			--label-align: left;
			--side-scrollbar: thin;
			--nav-slot: 22px;
			--nav-glyph: 16px;
			--burger-turn: 180deg;
			--burger-fold: 6px;
			--burger-cross: 45deg;
			--burger-mid: 0;
		}
	}

	/* one line, always: only the crumb may shrink, everything else is nowrap
	   and flex:none, and the tools go compact before the bar runs out of room */
	.topbar {
		/* containing block for a navigation progress bar, which rides on the
		   header's bottom edge rather than floating above the window */
		position: relative;
		flex: 0 0 var(--chrome-h);
		display: flex;
		align-items: center;
		gap: var(--top-gap);
		padding: 0 var(--top-pad-x);
		background: var(--surface-sunken);
		color: var(--text);
		border-bottom: var(--border-width) solid var(--border);
	}

	.burger {
		display: grid;
		place-items: center;
		flex: none;
		width: var(--burger-w);
		height: 34px;
		padding: 0;
		background: none;
		color: inherit;
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-2);
		cursor: pointer;
		transition:
			background 120ms ease,
			color 120ms ease;
	}
	.burger:hover {
		background: var(--surface-raised);
	}

	/* Closed is the base state written here; the shell overrides these four
	   variables while the nav is open, and the glyph takes the trip between
	   them — the outer bars swing into the cross, the middle one goes, and the
	   mark turns half a revolution on the way. */
	.burger-glyph {
		position: relative;
		width: 20px;
		height: 14px;
		transform: rotate(var(--burger-turn, 0deg));
		transition: transform 260ms cubic-bezier(0.2, 0.7, 0.3, 1);
	}
	.burger-glyph .bar {
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		border-radius: 2px;
		background: currentColor;
		transition:
			transform 260ms cubic-bezier(0.2, 0.7, 0.3, 1),
			opacity 160ms ease;
	}
	.burger-glyph .bar:nth-child(1) {
		top: 0;
		transform: translateY(var(--burger-fold, 0px)) rotate(var(--burger-cross, 0deg));
	}
	.burger-glyph .bar:nth-child(2) {
		top: 6px;
		opacity: var(--burger-mid, 1);
		transform: scaleX(var(--burger-mid, 1));
	}
	.burger-glyph .bar:nth-child(3) {
		top: 12px;
		transform: translateY(calc(-1 * var(--burger-fold, 0px)))
			rotate(calc(-1 * var(--burger-cross, 0deg)));
	}

	.brand {
		display: flex;
		flex: none;
	}

	/* What is already spent on the left of the crumb — padding, burger, brand,
	   the gaps — comes off, so it lines up with the content column below.
	   max() keeps it honest when the rail is narrower than that. */
	.crumb {
		display: flex;
		/* centre, not baseline: the crumb carries a picture of its subject next
		   to the heading, and an <img> sits *on* the text baseline — so a 24px
		   icon rides high against the words instead of beside them. Text-only
		   crumbs look the same either way. */
		align-items: center;
		gap: 7px;
		min-width: 0;
		flex: 1 1 auto;
		margin-left: max(
			0px,
			calc(
				var(--side-w) + var(--content-pad-x) - var(--top-pad-x) - var(--burger-w) -
					var(--brand-w, 0px) - var(--top-gap) * 2
			)
		);
		transition: margin-left 180ms ease;
	}

	.tools {
		display: flex;
		align-items: center;
		flex: none;
		/* holds the bar's right end even when the crumb is empty */
		margin-left: auto;
		gap: 10px;
	}

	.body {
		flex: 1;
		display: flex;
		min-height: 0;
	}

	/* dims the content behind the open drawer; tapping it closes */
	.scrim {
		position: fixed;
		inset: var(--chrome-h) 0 0 0;
		z-index: var(--z-scrim);
		border: 0;
		padding: 0;
		background: rgb(10 12 8 / 0.5);
		cursor: pointer;
	}

	/* The rail's two scroll hints, registered so they can be transitioned: an
	   unregistered custom property flips from one value to the next with
	   nothing in between, and the edge would blink on. As numbers they
	   interpolate, so the glow arrives and leaves. */
	@property --hint-up {
		syntax: '<number>';
		inherits: false;
		initial-value: 0;
	}
	@property --hint-down {
		syntax: '<number>';
		inherits: false;
		initial-value: 0;
	}

	.sidebar {
		flex: 0 0 var(--side-w);
		display: flex;
		flex-direction: column;
		/* Once the scrollbar is hidden the rail gives no sign that it scrolls,
		   so its edges carry it: a soft highlight pinned to the top and bottom
		   of the box, each shown only while there is more content that way. */
		background:
			linear-gradient(
					color-mix(in srgb, var(--accent) calc(var(--hint-up, 0) * 45%), transparent),
					transparent
				)
				scroll top / 100% 16px no-repeat,
			linear-gradient(
					transparent,
					color-mix(in srgb, var(--accent) calc(var(--hint-down, 0) * 45%), transparent)
				)
				scroll bottom / 100% 16px no-repeat,
			var(--surface-sunken);
		color: var(--text);
		overflow-y: auto;
		/* the labels are clipped by the box as it narrows, so the collapse
		   reads as the words sliding away behind the icons */
		overflow-x: hidden;
		padding: 14px var(--side-pad-x);
		scrollbar-color: var(--border) transparent;
		scrollbar-width: var(--side-scrollbar);
		transition:
			flex-basis 180ms ease,
			width 180ms ease,
			padding 180ms ease,
			--hint-up 220ms ease,
			--hint-down 220ms ease;
	}

	nav {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.foot {
		margin-top: auto;
		padding: calc(var(--nav-pad-y) * 2 + 4px) var(--nav-pad-x) 0;
		font-size: 10.5px;
		color: var(--text-faint);
		line-height: 1.5;
	}

	main {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
	}

	.content {
		--content-pad-top: 26px;
		--content-pad-bottom: 72px;
		padding: var(--content-pad-top) var(--content-pad-x) var(--content-pad-bottom);
	}

	/* Narrow: the rail stays put and opening it lays the full panel over the
	   content, so the gutter under it never moves and the page does not reflow
	   behind the drawer. */
	@media (max-width: 899.98px) {
		.body {
			padding-left: var(--rail-w);
		}
		.sidebar {
			position: fixed;
			top: var(--chrome-h);
			bottom: 0;
			left: 0;
			z-index: var(--z-nav);
			width: var(--side-w);
		}
		.shell.nav-open .sidebar {
			width: min(280px, 82vw);
			border-right: var(--border-width) solid var(--border);
			box-shadow: var(--shadow-2);
		}
		.content {
			--content-pad-top: 16px;
			--content-pad-bottom: 24px;
		}
	}

	/* Phone: the bar takes a second row. The burger drops to it and sits in a
	   rail-wide slot — directly above the rail's icons, with the heading
	   starting on the content's own left edge — which leaves the whole first
	   row to the brand and the tools. */
	@media (max-width: 620px) {
		.shell {
			--chrome-h: 78px;
		}
		.topbar {
			flex-wrap: wrap;
			align-content: center;
			column-gap: 0;
			row-gap: 2px;
			padding: 5px var(--top-pad-x) 5px 0;
		}
		.brand {
			order: 1;
			margin-left: var(--top-pad-x);
		}
		.tools {
			order: 1;
			gap: 8px;
		}
		/* the row break */
		.topbar::after {
			content: '';
			order: 2;
			flex-basis: 100%;
			height: 0;
		}
		.burger {
			order: 3;
			width: var(--rail-w);
		}
		.crumb {
			order: 4;
			margin-left: 0;
			padding-left: var(--content-pad-x);
		}
	}
</style>
