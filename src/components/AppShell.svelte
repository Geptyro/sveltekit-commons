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
	 * the drawer, its scrim and the drag that opens it, the remembered collapse,
	 * and the rail's scroll hints.
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

	/* ── Dragging the drawer ─────────────────────────────────────────────
	 *
	 * On a phone the burger is a small mark in a corner and the panel it opens
	 * starts under your thumb, so the panel is draggable too: pull the rail
	 * right to open it, push the panel or its scrim left to close it, let go
	 * and it finishes the trip — past halfway by position, or from anywhere by
	 * a throw. The burger keeps working; this is a second way in, not a
	 * replacement.
	 *
	 * The gesture drives one number, `--drag-p`, from 0 (rail) to 1 (open).
	 * The panel's width, the burger's fold and the scrim's dimming are all
	 * calc()ed off it, so everything that moves during the 180ms transition
	 * moves under the finger instead — the panel tracks the hand rather than
	 * playing a canned animation at the end of it. The open variable set
	 * applies for the whole drag, which is what makes the labels slide out
	 * from behind the icons the way they do on the way in.
	 *
	 * Narrow only. Wide, the sidebar is docked furniture and its collapse is a
	 * remembered preference, not something to fling about.
	 */
	const DRAG_SLOP = 8; /* px of travel before a press is a drag and not a tap */
	const DRAG_FLICK = 0.4; /* px/ms past which the throw decides, not the position */
	const DRAG_STALE = 80; /* ms; a finger that paused before lifting threw nothing */

	let shellEl = $state(null);
	/* null means "not dragging" — the stylesheet owns the width again */
	let dragP = $state(null);
	let dragPid = null;
	let dragEl = null; /* whichever of the two holds the pointer capture */
	let dragAxis = null; /* null while the gesture is still undecided */
	let dragX0 = 0;
	let dragY0 = 0;
	let dragXa = 0; /* x where it committed to the horizontal, so nothing jumps */
	let dragFrom = 0; /* the p it started at: 0 from the rail, 1 from the panel */
	let dragTravel = 1;
	let dragVx = 0;
	let dragLastX = 0;
	let dragLastT = 0;
	/* a drag that ends over a nav row must not also count as a tap on it */
	let dragTapped = false;

	function dragStart(e) {
		/* first, and past the guards: a drag that settled shut takes its scrim
		   down with it, and a click has nowhere to land — the flag would still
		   be up when the next real one arrives */
		dragTapped = false;
		if (wide || dragPid !== null) return;
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		dragPid = e.pointerId;
		dragEl = e.currentTarget;
		dragAxis = null;
		dragX0 = dragLastX = e.clientX;
		dragY0 = e.clientY;
		dragLastT = e.timeStamp;
		dragVx = 0;
	}

	function dragMove(e) {
		if (e.pointerId !== dragPid) return;

		if (dragAxis === null) {
			const dx = e.clientX - dragX0;
			const dy = e.clientY - dragY0;
			if (Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return;
			/* upright is the rail scrolling; hand the gesture back untouched */
			if (Math.abs(dy) >= Math.abs(dx)) return dragCancel(e);
			dragAxis = 'x';
			dragXa = e.clientX;
			dragFrom = navOpen === true ? 1 : 0;
			/* Both are registered lengths, so this reads them back in px —
			   unregistered, `min(280px, 82vw)` comes back as that string and
			   there is no travel to measure. The fallbacks are the declared
			   defaults, for a browser without @property. */
			const css = getComputedStyle(shellEl);
			const rail = parseFloat(css.getPropertyValue('--rail-w')) || 42;
			const open = parseFloat(css.getPropertyValue('--drawer-w')) || 280;
			dragTravel = Math.max(1, open - rail);
			dragEl.setPointerCapture(dragPid);
		}

		const dt = e.timeStamp - dragLastT;
		if (dt > 0) dragVx = (e.clientX - dragLastX) / dt;
		dragLastX = e.clientX;
		dragLastT = e.timeStamp;
		dragP = Math.min(1, Math.max(0, dragFrom + (e.clientX - dragXa) / dragTravel));
		/* mouse drags would otherwise select the labels they pass over */
		if (e.cancelable) e.preventDefault();
	}

	function dragEnd(e) {
		if (e.pointerId !== dragPid) return;
		dragPid = null;
		dragAxis = null;
		if (dragP === null) return; /* never became a drag: it was a tap */
		const thrown = e.timeStamp - dragLastT > DRAG_STALE ? 0 : dragVx;
		const settled = thrown > DRAG_FLICK ? true : thrown < -DRAG_FLICK ? false : dragP > 0.5;
		dragP = null;
		dragTapped = true;
		navOpen = settled;
	}

	function dragCancel(e) {
		if (e.pointerId !== dragPid) return;
		dragPid = null;
		dragAxis = null;
		if (dragP === null) return;
		dragP = null;
		dragTapped = true;
	}

	/* Capture phase, and immediate: the click lands on whatever the finger came
	   to rest on — a nav link, the scrim — and both would act on a gesture that
	   was never aimed at them. */
	function dragClick(e) {
		if (!dragTapped) return;
		dragTapped = false;
		e.preventDefault();
		e.stopImmediatePropagation();
	}

	const shellVars = $derived(
		[brandW ? `--brand-w: ${brandW}px` : '', dragP !== null ? `--drag-p: ${dragP}` : '']
			.filter(Boolean)
			.join('; ') || undefined
	);
</script>

<div
	class="shell"
	bind:this={shellEl}
	class:nav-open={navOpen === true || dragP !== null}
	class:nav-closed={navOpen === false && dragP === null}
	class:dragging={dragP !== null}
	style={shellVars}
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
		<!-- also up during a drag out of the rail, dimming with it: the panel is
		     coming over the page, so the page has to start giving way at once -->
		{#if drawer || dragP !== null}
			<button
				class="scrim"
				aria-label="Close menu"
				style="opacity: {dragP ?? 1}"
				onclick={() => (navOpen = false)}
				onclickcapture={dragClick}
				onpointerdown={dragStart}
				onpointermove={dragMove}
				onpointerup={dragEnd}
				onpointercancel={dragCancel}
			></button>
		{/if}

		<aside
			class="sidebar"
			id="site-nav"
			bind:this={sideEl}
			onscroll={syncHints}
			ontransitionend={syncHints}
			onclickcapture={dragClick}
			onpointerdown={dragStart}
			onpointermove={dragMove}
			onpointerup={dragEnd}
			onpointercancel={dragCancel}
			style="--hint-up: {hintUp}; --hint-down: {hintDown}"
		>
			<nav aria-label={navLabel}>{@render nav?.(close)}</nav>
			{#if foot}<div class="foot">{@render foot()}</div>{/if}
		</aside>

		<!-- No padding, no scrollbar: a box of a known height, and what happens
		     inside it is the page's business. `Page` is the ordinary answer. -->
		<main>{@render children?.()}</main>
	</div>
</div>

<style>
	/* Registered so the drag can read them back as pixels: an unregistered
	   custom property comes out of getComputedStyle as whatever was typed, and
	   `min(280px, 82vw)` is not a distance to divide a finger's travel by. As
	   registered lengths they compute, viewport units and all. */
	@property --rail-w {
		syntax: '<length>';
		inherits: true;
		initial-value: 42px;
	}
	@property --drawer-w {
		syntax: '<length>';
		inherits: true;
		initial-value: 280px;
	}

	.shell {
		/* ── shell metrics; a site may override any of them ─────────────── */
		--rail-w: 42px;
		/* how far the narrow drawer opens; the rail's width is its other end */
		--drawer-w: min(280px, 82vw);
		--chrome-h: 52px;
		/* The page's own gutters, declared here and spent by `Page`. They live on
		   the shell because they belong to the column's geometry — the crumb's
		   offset below reads --content-pad-x to line the heading up with the text
		   under it — and because a separate component can only inherit them. */
		--content-pad-x: 36px;
		--content-pad-top: 26px;
		--content-pad-bottom: 72px;
		/* How much room the scrollbar takes out of a scrolling box. `Page` takes
		   it off its right padding so the two gutters match on screen and not
		   merely in the stylesheet.

		   Declared rather than measured because measuring means painting once at
		   one width and reflowing to another, and a media query gets it right
		   before the first paint. See the coarse-pointer override below for the
		   half of this that is not 10px, and keep it in step with the site's own
		   ::-webkit-scrollbar width — nothing can check that for you. */
		--scrollbar-w: 10px;
		--top-gap: 10px;
		--top-pad-x: 14px;
		--burger-w: 34px;
		--z-scrim: 45;
		--z-nav: 50;

		/* ── collapsed geometry; the two blocks below expand it ─────────── */
		--side-w: var(--rail-w);
		--side-pad-x: 4px;
		--label-display: none;
		--nav-justify: center;
		--nav-pad-x: 0px;
		--nav-pad-y: 5px;
		--label-align: center;
		/* Stacked in both states. Side by side reads better in the rail and was
		   the original choice, but it only fit while the footer had two marks —
		   a third (the tip link) ran it off the ~34px of usable width the rail
		   has. A column cannot overflow however many links a site puts there. */
		--foot-dir: column;
		--side-scrollbar: none;
		/* The rail is a gutter the content is permanently indented by, and on a
		   phone it is the *only* state most visitors ever see it in, so its width
		   is spent on every page. It used to be 58px around a 20px glyph — 19px
		   of dead air either side, which read as an oversized gutter rather than
		   a generous one.

		   What actually sets the floor is the footer, not the icons. A collapsed
		   nav row only needs its glyph, but a site's credit marks keep their text
		   down here: STALZONE's "EXBO" attribution measures 32.4px at 12px, so
		   34px of usable width (42 less 4px of padding each side) is the narrowest
		   the rail goes before that starts clipping. Take the rail below this and
		   check the footers, not the nav. */
		--nav-slot: 26px;
		--nav-glyph: 18px;

		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100dvh;
	}

	/* A touch device overlays its scrollbars: they float over the content and
	   take no room, so there is none to give back and taking any would leave the
	   right gutter short by exactly the width of a scrollbar that was never
	   there. This is the whole reason the width is a variable rather than a
	   number written into `Page`.

	   `pointer: coarse` and not a width: it is the input that decides this, not
	   the viewport. A desktop window dragged narrow still has a real scrollbar,
	   and a phone has none at any size. */
	@media (pointer: coarse) {
		.shell {
			--scrollbar-w: 0px;
		}
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
		/* Under the finger the mark folds by degrees rather than running its own
		   animation ahead of the panel — drag halfway and the bars are halfway
		   into the cross, drag back and they come out of it. Same specificity as
		   the block above, so it has to sit after it. */
		.shell.dragging {
			--burger-turn: calc(180deg * var(--drag-p, 0));
			--burger-fold: calc(6px * var(--drag-p, 0));
			--burger-cross: calc(45deg * var(--drag-p, 0));
			--burger-mid: calc(1 - var(--drag-p, 0));
		}
	}

	/* nothing under the hand animates: the hand is the animation */
	.shell.dragging {
		user-select: none;
		-webkit-user-select: none;
	}
	.shell.dragging .burger-glyph,
	.shell.dragging .burger-glyph .bar {
		transition: none;
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

	/* The containing block for the narrow drawer and its scrim. Both used to be
	   fixed to the viewport and offset down by --chrome-h, which quietly made
	   that token load-bearing: it is the bar's flex-basis, and a flex item's
	   automatic minimum size floors it at its content, so a bar whose rows need
	   more than the token says is taller than the token says. The rail then
	   started that much too high and painted over the bar's bottom border —
	   visible as the border going missing across the rail's width, and only
	   there. Positioned against this box instead, they start where the bar
	   actually ends, whatever it measures. */
	.body {
		position: relative;
		flex: 1;
		display: flex;
		min-height: 0;
	}

	/* dims the content behind the open drawer; tapping it closes, and pushing it
	   left closes it the way it was opened */
	.scrim {
		position: absolute;
		inset: 0;
		z-index: var(--z-scrim);
		border: 0;
		padding: 0;
		background: rgb(10 12 8 / 0.5);
		cursor: pointer;
		touch-action: none;
		transition: opacity 180ms ease;
	}
	.shell.dragging .scrim {
		transition: none;
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
		/* A rule down the rail's inner edge, off unless a site asks for it:
		   whether the rail needs dividing from the content depends on whether
		   the two already differ in surface, which is the site's palette and
		   not this shell's business. Wide state only — the narrow drawer sets
		   its own below, where the rule is not decoration but the edge of a
		   panel lying over the page. */
		border-right: var(--rail-border, none);
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
		padding: var(--side-pad-top, 14px) var(--side-pad-x);
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

	/* The shell does not scroll the page, and this is the whole of why.

	   A scrollbar always spans its own scroller, top to bottom. While this box
	   was the scroller, anything a page wanted to pin above the scrolling
	   part — a bar of tabs — could only be `position: sticky` *content*, so the
	   scrollbar ran up alongside it and the bar stopped a scrollbar's width
	   short of the window. Nothing a page could write would fix that from
	   inside. The bar had to be outside the scroller, and the only way to be
	   outside a scroller the shell owns is for the shell not to own one.

	   So this is a box of a known height and nothing else: no padding, no
	   overflow, no opinion about what a page is. A page composes its own —
	   `Page` for the ordinary case, chrome plus a `Page` for a frame like
	   STALZONE's entity tabs or UAR's profile — and the scrollbar it gets is
	   the one it asked for, starting where it put it.

	   The column is `flex` so a page can hand a child the rest of the height
	   with `flex: 1` and have it mean something. */
	main {
		flex: 1;
		min-width: 0;
		/* a flex item floors at its content without this, and a box that cannot
		   be shorter than what it holds hands its children a lie */
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* Narrow: the rail stays put and opening it lays the full panel over the
	   content, so the gutter under it never moves and the page does not reflow
	   behind the drawer. */
	@media (max-width: 899.98px) {
		.body {
			padding-left: var(--rail-w);
		}
		.shell {
			/* The rail here butts straight onto the bar rather than sitting under a
			   docked header with room to spare, and 14px read as a gap the rhythm
			   below it never repeats. One row clears the next by its own padding,
			   nav's 1px gap, then the next row's padding — so clearing the bar by
			   the same amount means padding + --nav-pad-y = --nav-pad-y + 1px +
			   --nav-pad-y, which is this. 6px against the collapsed rail, 8px once
			   the drawer's rows loosen, and it eases between the two with the rest
			   of the collapse instead of being a second number to keep in step. */
			--side-pad-top: calc(var(--nav-pad-y) + 1px);
		}
		.sidebar {
			/* absolute against .body, so the top edge is the bar's real bottom
			   rather than what --chrome-h claims it is */
			position: absolute;
			top: 0;
			bottom: 0;
			left: 0;
			z-index: var(--z-nav);
			width: var(--side-w);
			/* The rail is the drawer's handle, so the sideways gesture has to
			   reach this component — but the rail scrolls, and that gesture is
			   the browser's. `pan-y` splits them at the source: upright never
			   arrives here, sideways is never a scroll. */
			touch-action: pan-y pinch-zoom;
		}
		.shell.nav-open .sidebar {
			width: var(--drawer-w);
			border-right: var(--border-width) solid var(--border);
			box-shadow: var(--shadow-2);
		}
		/* mid-gesture the width is a position, not a destination */
		.shell.dragging .sidebar {
			width: calc(var(--rail-w) + (var(--drawer-w) - var(--rail-w)) * var(--drag-p, 0));
			transition: none;
		}
		.shell {
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
			/* 5 + 34 + 2 + 34 + 5 + 1: the padding, the two rows, the row gap and
			   the bottom border. 78 was the same sum taken against a 32px first
			   row, and the bar has been three pixels taller than its own token
			   ever since the tools grew — which nothing inside the shell notices
			   any more, but the sites do: half a dozen panes size themselves
			   `calc(100dvh - var(--chrome-h) - …)` and were that much too tall
			   here. A floor rather than a promise, so a site whose tools are
			   taller still gets a correct bar and a slightly stale token. */
			--chrome-h: 81px;
			/* Both ends of the bar's first row, as one number so they cannot
			   drift apart. It is the brand's offset onto the rail's axis that
			   sets it — the mark has to line up with the burger and the rail's
			   icons under it, and that is not a free choice — so the tools take
			   the same inset on the right rather than the bar keeping
			   --top-pad-x there and sitting visibly further off that edge than
			   the mark does on this one. */
			--bar-inset: max(0px, calc((var(--rail-w) - var(--brand-w, 32px)) / 2));
		}
		.topbar {
			flex-wrap: wrap;
			align-content: center;
			column-gap: 0;
			row-gap: 2px;
			/* left is 0 because the burger below fills a rail-wide slot from the
			   very edge; the brand adds --bar-inset back for itself, and the right
			   is that same inset so the two ends match */
			padding: 5px var(--bar-inset) 5px 0;
		}
		/* On the rail's centre line, which is where the burger's glyph and every
		   collapsed nav icon already sit — all three centre in the same rail-wide
		   slot, so the axis is --rail-w / 2 and nothing below has to be measured
		   to find it.

		   Centre and not left edge, though the left edge is the tempting one: a
		   brand mark is a filled block and the icons are line art, so matching
		   their left edges (11px here) leaves a 32px badge hanging 13px past a
		   18px icon and reads as further out of column than the 14px inset this
		   replaced. Aligning the axes puts it at 5px and the eye settles.

		   --brand-w is the width the crumb already has measured. The fallback is
		   the 32px mark all three sites ship, so prerendered markup lands on the
		   offset hydration then confirms instead of jumping to it — see
		   --bar-inset above, which the bar's right padding spends too. */
		.brand {
			order: 1;
			margin-left: var(--bar-inset);
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
