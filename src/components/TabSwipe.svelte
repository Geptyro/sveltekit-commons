<script>
	/**
	 * Swipe the page sideways to move between a subject's tabs.
	 *
	 * TabBar's companion, and deliberately not part of it: the bar is a control
	 * you aim at, this is the page itself answering to the hand. Give it the
	 * same `tabs` and `active` the bar gets and it renders no chrome of its own
	 * beyond a peek at where you are going.
	 *
	 * ── Why the page does not follow the finger ──────────────────────────
	 *
	 * Because the tabs are routes. Each one has its own server load, so the tab
	 * you are pulling toward is not in the document to be dragged — a swipe that
	 * appeared to drag it in would be dragging in a blank. So the drag moves
	 * what actually exists: the current column nudges against the pull, and a
	 * peek slides in naming the destination and hardening once you have pulled
	 * far enough to commit. Let go past that point and the navigation happens.
	 *
	 * The nudge is Page's to draw. This publishes `data-tab-swipe` and
	 * `--tab-swipe-x` on the root and owns no box, so it needs a page that
	 * scrolls — `<Page>`, which reads both. A route on `<Page fill>`, whose
	 * insides scroll instead, is one this cannot take: whatever scrolls in there
	 * claims the drag first. That is UAR's replay table either way.
	 *
	 * Hand it `preload` (SvelteKit's `preloadData`) and the destination's data is
	 * fetched the moment the gesture arms, so by the time you let go the change
	 * is usually instant. Without it the swipe still works, just with the load
	 * you would have had from tapping the tab.
	 *
	 * ── What the gesture will not take ───────────────────────────────────
	 *
	 * A horizontal drag is the most contested gesture on a phone, and a page-wide
	 * one that grabbed every drag would break the things people actually came to
	 * do. Three rules, in the order they are applied:
	 *
	 *   1. Outside `<main>` is not the page. The shell's header, its rail and the
	 *      drawer's scrim all sit outside it, so the drawer keeps its own drag
	 *      and this never sees those pointers.
	 *   2. `touch-action: none`, a `<nav>`, a `<dialog>` or `[data-noswipe]`
	 *      anywhere up the chain means something there has already claimed the
	 *      gesture. STALZONE's pan-and-zoom trees declare the first, TabBar is
	 *      the second, and the attribute is there for anything a site wants to
	 *      keep for itself.
	 *   3. A horizontally scrollable ancestor keeps the drag until it runs out of
	 *      travel, and hands over the one pull it cannot use. Scroll UAR's replay
	 *      table to its last column and the next drag that way changes tab; every
	 *      drag the table can still spend stays the table's. How that is made to
	 *      work is under "Handing the gesture back" below — it is not the obvious
	 *      way, because the obvious way does not work.
	 *
	 * The gesture is narrow-screen only. On a desktop the tabs are labelled, the
	 * bar is a wide row of targets, and there is nothing a drag would improve.
	 */
	import { onMount } from 'svelte';

	let {
		/** Same array TabBar gets: `href`, `label`, optional `icon` and `key`. */
		tabs = [],
		/** `key` (or `href`) of the tab being shown. */
		active = '',
		/**
		 * Where a completed swipe sends the reader. Required — without it the
		 * gesture never arms, since it would have nowhere to go.
		 */
		onnavigate = null,
		/**
		 * SvelteKit's `preloadData`, called with the destination as soon as the
		 * gesture arms. Optional, and a prop rather than an import so this entry
		 * stays router-free and the Electron companion can still use it.
		 */
		preload = null,
		/** At or above this width the gesture is off. Match AppShell's `wideAt`. */
		upTo = 900,
		/**
		 * How far across the window the pull has to travel to commit, as a
		 * fraction of it. A throw commits from anywhere.
		 */
		commitAt = 0.3
	} = $props();

	const SLOP = 14; /* px before a touch is a swipe — larger than the drawer's,
	                    because this competes with reading rather than with a rail */
	const UPRIGHT = 1.2; /* how much more sideways than vertical a swipe must be */
	const FLICK = 0.5; /* px/ms that commits regardless of distance */
	const STALE = 100; /* ms; a finger that paused before lifting threw nothing */
	const NUDGE = 34; /* px the column gives, at the limit of a very long pull */

	const keyOf = (t) => t.key ?? t.href;
	const at = $derived(tabs.findIndex((t) => keyOf(t) === active));
	/* Clamped at both ends, not wrapped. TabBar's number keys wrap because a
	   keypress has no direction; a swipe is nothing but a direction, and coming
	   off the last tab into the first would send the page the opposite way to
	   the hand. At an end there is simply no neighbour and the gesture stands
	   down. */
	const prev = $derived(at > 0 ? tabs[at - 1] : null);
	const next = $derived(at >= 0 && at < tabs.length - 1 ? tabs[at + 1] : null);

	/* What the peek shows; null whenever no gesture is live. */
	let target = $state(null);
	let dir = $state(0); /* +1 pulling right, toward `prev`; -1 toward `next` */
	let p = $state(0); /* 0 → 1, where 1 is far enough to commit */

	let pid = null;
	let armed = false;
	let blocker = null; /* the sideways scroller the finger came down inside */
	let x0 = 0;
	let y0 = 0;
	let lastX = 0;
	let lastT = 0;
	let vx = 0;
	let swallow = false; /* the click that would follow a swipe off a link */
	let settle = null;

	/**
	 * What, up the chain from `el`, has a better claim on a sideways drag than
	 * the page does: `'never'` for a refusal, the element for a sideways
	 * scroller that may still hand the gesture over at its edge, or null.
	 */
	function claimant(el) {
		for (let n = el; n && n.nodeType === 1 && n.tagName !== 'MAIN'; n = n.parentElement) {
			if (n.dataset?.noswipe !== undefined) return 'never';
			const tag = n.tagName;
			if (tag === 'NAV' || tag === 'DIALOG') return 'never';
			const cs = getComputedStyle(n);
			/* it took the gesture out of the browser's hands, so it is not mine
			   to take either */
			if (cs.touchAction === 'none') return 'never';
			const ox = cs.overflowX;
			if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1) return n;
		}
		return null;
	}

	/** Whether `el` still has somewhere to go when the finger travels `d`. */
	const hasTravel = (el, d) =>
		d > 0 ? el.scrollLeft > 1 : el.scrollLeft < el.scrollWidth - el.clientWidth - 1;

	/* ── Handing the gesture back at a scroller's edge ────────────────────
	 *
	 * A wide table should keep every sideways drag it can use and give up the
	 * one it cannot: scroll it to its last column and the next pull that way is
	 * the page's. That is what the platform does for a list inside a pager, and
	 * the first attempt at it here failed outright — the gesture armed at the
	 * table's end, the browser took it anyway, `pointercancel` arrived and the
	 * page twitched and gave it back. `preventDefault` on a `pointermove` does
	 * not stop a scroll. Only `touch-action` does.
	 *
	 * Which is the way in, once you stop reading `touch-action` as a constant.
	 * It is read when the finger lands, and it has DIRECTIONAL values — so a
	 * scroller can say, before anything is touched, which way it can still go:
	 *
	 *     at the left edge    pan-y pan-right pinch-zoom   (only leftward drags)
	 *     mid-scroll          pan-y pan-x     pinch-zoom   (both, as before)
	 *     at the right edge   pan-y pan-left  pinch-zoom   (only rightward drags)
	 *
	 * The browser then declines the drag the table has no use for, no
	 * `pointercancel` is fired, and the pointer stream arrives here intact. The
	 * table's own scrolling is untouched in every direction it can actually
	 * scroll, and its vertical scrolling is untouched throughout.
	 *
	 * So the scrollers are found and marked — `data-swipe-x`, read by the rules
	 * at the bottom of this file — on mount, whenever `main`'s subtree changes,
	 * whenever anything resizes, and on every scroll. An attribute rather than an
	 * inline style: it is somebody else's markup, and a state you can read in
	 * devtools beats a computed value you cannot.
	 *
	 * A scroll container with nothing to scroll sideways is marked too, `still`,
	 * and that is not a formality — it is the same trap the shell's `main` fell
	 * into. `overflow-x: auto` claims sideways drags whether or not there is
	 * anything to pan: UAR's "Wins by mode" is three columns in a `.tablewrap`
	 * that never overflows on a phone, and it swallowed every swipe crossing it.
	 * Having nothing to scroll is not the same as not taking the gesture, and
	 * only `touch-action` can say the second thing.
	 *
	 * Directional `touch-action` is Chromium-only. Elsewhere the declaration is
	 * invalid and dropped, the scroller keeps `auto`, and the swipe simply does
	 * not start from inside a table — which is exactly where this stood before.
	 */
	let marked = [];

	function mark(el) {
		const room = el.scrollWidth - el.clientWidth;
		el.dataset.swipeX =
			room <= 1
				? 'still'
				: el.scrollLeft > 1
					? el.scrollLeft < room - 1
						? 'mid'
						: 'end'
					: 'start';
	}

	/**
	 * Find the scroll containers under `main` and mark them.
	 *
	 * Every element, and a `getComputedStyle` for each, because there is no
	 * cheaper question to ask: whether an element takes sideways drags is
	 * `overflow-x`, and no DOM property reports it. The tempting pre-filter —
	 * skip anything that does not overflow — is the bug this exists to fix,
	 * since a scroller with nothing to scroll takes the gesture just the same.
	 * Measured on the two heaviest pages of UAR: 1.6ms over 478 elements, 2.4ms
	 * over 1536. It runs on mount, on a coalesced mutation, and on a resize —
	 * never in a gesture, never per frame.
	 *
	 * Anything the swipe could not have started inside is left alone: a `<nav>`,
	 * a dialog, `[data-noswipe]`, or a surface that already took the gesture for
	 * itself. TabBar is the one that matters — the bar scrolls sideways when a
	 * subject has more tabs than fit, and it should go on doing that untouched.
	 */
	function rescan() {
		const root = document.querySelector('main');
		const found = [];
		if (root && innerWidth < upTo) {
			for (const el of root.querySelectorAll('*')) {
				const cs = getComputedStyle(el);
				const ox = cs.overflowX;
				if (ox !== 'auto' && ox !== 'scroll') continue;
				if (cs.touchAction === 'none') continue;
				if (el.closest('nav, dialog, [data-noswipe]')) continue;
				found.push(el);
			}
		}
		for (const el of marked) if (!found.includes(el)) delete el.dataset.swipeX;
		for (const el of found) mark(el);
		marked = found;
		return found;
	}

	function down(e) {
		reset();
		/* First, and past every guard below. An armed swipe calls preventDefault
		   on the move, which on a touch screen means the click it would have
		   produced never arrives — so the flag set on release has nothing to
		   spend itself on, and would be lying in wait for the next real tap. */
		swallow = false;
		if (!onnavigate || tabs.length < 2 || innerWidth >= upTo) return;
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		/* the shell's chrome lives outside `main`; so does the drawer it drags */
		if (!e.target?.closest?.('main')) return;
		const claim = claimant(e.target);
		if (claim === 'never') return;
		blocker = claim;
		pid = e.pointerId;
		x0 = lastX = e.clientX;
		y0 = e.clientY;
		lastT = e.timeStamp;
		vx = 0;
	}

	function move(e) {
		if (e.pointerId !== pid) return;

		if (!armed) {
			const dx = e.clientX - x0;
			const dy = e.clientY - y0;
			if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
			/* upright, or near enough that they are probably reading */
			if (Math.abs(dx) < Math.abs(dy) * UPRIGHT) return reset();
			const d = dx > 0 ? 1 : -1;
			/* the scroller under the finger has not finished with the gesture.
			   It reaches here at all only because it marked itself spent in this
			   direction, so the browser let the drag through rather than
			   scrolling — but the mark can be a frame stale, and this is the
			   authority. */
			if (blocker && hasTravel(blocker, d)) return reset();
			const t = d > 0 ? prev : next;
			if (!t) return reset();
			armed = true;
			dir = d;
			target = t;
			document.documentElement.dataset.tabSwipe = '';
			/* Fetched now, not on release: the whole point is that letting go
			   lands on a page rather than on a spinner. Swallowed if it fails —
			   a speculative fetch that did not work out is not the gesture's
			   problem, and the real navigation will report it properly. */
			Promise.resolve(preload?.(t.href)).catch(() => {});
		}

		const travelled = dir * (e.clientX - x0);
		p = Math.min(1, Math.max(0, travelled / (innerWidth * commitAt)));
		/* Asymptotic, so the column answers immediately and then firms up: it is
		   giving under the pull, not being dragged. */
		const give = dir * NUDGE * (1 - 1 / (1 + Math.max(0, travelled) / NUDGE));
		document.documentElement.style.setProperty('--tab-swipe-x', `${give}px`);

		const dt = e.timeStamp - lastT;
		if (dt > 0) vx = (e.clientX - lastX) / dt;
		lastX = e.clientX;
		lastT = e.timeStamp;
		if (e.cancelable) e.preventDefault();
	}

	function up(e) {
		if (e.pointerId !== pid) return;
		const thrown = e.timeStamp - lastT > STALE ? 0 : dir * vx;
		const go = armed && target && (p >= 1 || thrown > FLICK);
		const href = target?.href;
		if (armed) swallow = true;
		reset();
		if (go) onnavigate(href);
	}

	/**
	 * Back to nothing, and let the column come home. The attribute stays on for
	 * the length of the settle so there is something for the transition to run
	 * on — dropping it in the same frame would snap the page back.
	 */
	function reset() {
		pid = null;
		blocker = null;
		if (armed) {
			armed = false;
			const root = document.documentElement;
			root.style.setProperty('--tab-swipe-x', '0px');
			root.dataset.tabSwipe = 'settling';
			clearTimeout(settle);
			settle = setTimeout(() => {
				delete root.dataset.tabSwipe;
				root.style.removeProperty('--tab-swipe-x');
			}, 220);
		}
		target = null;
		dir = 0;
		p = 0;
	}

	/* Capture, and immediate: a swipe that came to rest on a link would follow
	   it, on top of the tab change the swipe already asked for. */
	function click(e) {
		if (!swallow) return;
		swallow = false;
		e.preventDefault();
		e.stopImmediatePropagation();
	}

	onMount(() => {
		/* not passive: an armed swipe has to be able to stop the page reading it
		   as anything else */
		const opts = { passive: false };
		addEventListener('pointerdown', down, opts);
		addEventListener('pointermove', move, opts);
		addEventListener('pointerup', up, opts);
		addEventListener('pointercancel', reset, opts);
		addEventListener('click', click, true);

		/* Capture, because `scroll` does not bubble: one listener then hears
		   every scroller under the document instead of one per element, and
		   re-marking the one that moved is a read of two numbers. */
		const onScroll = (e) => {
			const el = e.target;
			if (el?.nodeType === 1 && el.dataset?.swipeX !== undefined) mark(el);
		};
		addEventListener('scroll', onScroll, true);

		/* A scroller that changed size has only changed which mark it wants, so
		   this re-marks and never rescans — which is also what keeps it from
		   looping, since `observe` fires once per element the moment it is
		   called. */
		const sizes = new ResizeObserver((entries) => {
			for (const entry of entries) if (entry.target.isConnected) mark(entry.target);
		});

		/* Coalesced to a frame: a page settling in emits mutations by the
		   hundred, and the answer is the same for all of them. */
		let queued = 0;
		const soon = () => {
			cancelAnimationFrame(queued);
			queued = requestAnimationFrame(() => {
				sizes.disconnect();
				for (const el of rescan()) sizes.observe(el);
			});
		};
		const mo = new MutationObserver(soon);
		const ro = new ResizeObserver(soon);
		const root = document.querySelector('main');
		if (root) {
			mo.observe(root, { childList: true, subtree: true });
			/* the box, for a viewport that changed what fits and what overflows */
			ro.observe(root);
		}
		for (const el of rescan()) sizes.observe(el);

		return () => {
			removeEventListener('pointerdown', down, opts);
			removeEventListener('pointermove', move, opts);
			removeEventListener('pointerup', up, opts);
			removeEventListener('pointercancel', reset, opts);
			removeEventListener('click', click, true);
			removeEventListener('scroll', onScroll, true);
			mo.disconnect();
			ro.disconnect();
			sizes.disconnect();
			cancelAnimationFrame(queued);
			for (const el of marked) delete el.dataset.swipeX;
			marked = [];
			clearTimeout(settle);
			delete document.documentElement.dataset.tabSwipe;
			document.documentElement.style.removeProperty('--tab-swipe-x');
		};
	});
</script>

<!-- Named, because the gesture is worth nothing if you cannot tell what you are
     about to land on. It arrives from the edge the page is heading toward and
     goes solid the moment the pull is far enough to commit, so the release
     point is something you can see rather than guess. -->
{#if target}
	<div
		class="peek"
		class:right={dir < 0}
		class:ready={p >= 1}
		style="--p: {p}"
		aria-hidden="true"
	>
		{#if target.icon}{@html target.icon}{/if}
		<span>{target.label}</span>
	</div>
{/if}

<style>
	.peek {
		position: fixed;
		top: 50%;
		z-index: 30;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 8px 12px;
		max-width: 60vw;
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-3);
		background: var(--surface-raised);
		box-shadow: var(--shadow-2);
		color: var(--text-dim);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		white-space: nowrap;
		/* it is a label on a gesture, never a target */
		pointer-events: none;
		opacity: calc(0.35 + 0.65 * var(--p));
	}

	/* Rides in from whichever edge the page is heading for. The rail is the
	   left one on a phone, so the backward peek starts clear of it. */
	.peek.right {
		right: 0;
		transform: translate(calc((1 - var(--p)) * 100%), -50%);
	}
	.peek:not(.right) {
		left: var(--rail-w, 0px);
		transform: translate(calc((var(--p) - 1) * 100%), -50%);
	}

	.peek.ready {
		border-color: var(--accent);
		color: var(--text);
	}

	/* `:global` because the glyph arrives by `{@html}` */
	.peek :global(svg) {
		width: 15px;
		height: 15px;
		flex: none;
	}

	/*
	 * What this component owns is the gesture, and two declarations on the root:
	 * `data-tab-swipe` while one is live (then `settling` for the moment it
	 * takes to come home), and `--tab-swipe-x`, how far the column should give.
	 *
	 * Page reads both, because Page is the box that moves. The shell's `main`
	 * scrolls nothing now — it is a flex column holding the docked bar and the
	 * page — so there is no element here to put a transform on that would be the
	 * right one, and guessing at a caller's markup from a `:global` selector is
	 * how a package breaks the day a site restructures. Which is what happened:
	 * this used to move `main` and declare `pan-y` on it, and both went dead the
	 * moment the scrollbar moved down into Page.
	 *
	 * The `touch-action` that keeps the browser from claiming the gesture lives
	 * with the scrolling too, in Page, for the same reason and with the
	 * reasoning written out there.
	 */
	:global(html[data-tab-swipe]) {
		user-select: none;
		-webkit-user-select: none;
	}

	/*
	 * A sideways scroller, saying which way it can still go — the marks the
	 * script above keeps on it, spelled out as the only thing that can actually
	 * stop the browser claiming a drag.
	 *
	 * `pan-y` is in all four so the scroller never loses its vertical scrolling,
	 * and `pinch-zoom` so a table nobody can read at this size can still be
	 * zoomed. The directional halves are the point: at an edge the browser is
	 * told it may pan only the way there is travel, and the drag the other way
	 * arrives here instead of being swallowed as an overscroll. `still` names
	 * the box that could scroll sideways but has nothing to scroll, and takes
	 * the sideways half away from it altogether.
	 */
	:global([data-swipe-x='still']) {
		touch-action: pan-y pinch-zoom;
	}
	:global([data-swipe-x='start']) {
		touch-action: pan-y pan-right pinch-zoom;
	}
	:global([data-swipe-x='mid']) {
		touch-action: pan-y pan-x pinch-zoom;
	}
	:global([data-swipe-x='end']) {
		touch-action: pan-y pan-left pinch-zoom;
	}
</style>
