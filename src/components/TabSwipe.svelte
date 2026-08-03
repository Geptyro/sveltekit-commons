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
	 * The finger's version is narrow-screen only. On a desktop the tabs are
	 * labelled and the bar is a wide row of targets, so a drag adds nothing —
	 * but the same motion on a mouse does, and there are two of those below.
	 *
	 * ── The same move on a desktop ───────────────────────────────────────
	 *
	 * `wheel` is the one that costs nothing and reaches everyone. Chrome reports
	 * the three ways of asking for horizontal scroll differently, which is worth
	 * knowing before reading the handler:
	 *
	 *   trackpad, two fingers   deltaX          scrolls sideways
	 *   a wheel that tilts      deltaX          scrolls sideways
	 *   Shift + a plain wheel   deltaY + shift  scrolls sideways
	 *
	 * The third is the important one: it means this works on any mouse ever
	 * made, not only the ones with a tilt. And unlike a `pointermove`, a `wheel`
	 * event is cancelable — `preventDefault` genuinely stops the scroll. So the
	 * edge negotiation here is the plain thing the touch path had to go the long
	 * way round for: ask the scroller under the cursor whether it has travel, and
	 * either leave the event alone or take it.
	 *
	 * `middle` is off by default, because it is not free: holding the middle
	 * button is the browser's autoscroll on Windows and Linux, and arming this
	 * takes that away for the whole site. A plain middle click still opens links
	 * in a new tab — only a click that turned into a drag is swallowed.
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
		/**
		 * At or above this width the *finger's* swipe is off. Match AppShell's
		 * `wideAt`. The mouse gestures below ignore it — they are for exactly the
		 * screens this excludes.
		 */
		upTo = 900,
		/**
		 * How far across the window the pull has to travel to commit, as a
		 * fraction of it. A throw commits from anywhere.
		 */
		commitAt = 0.3,
		/**
		 * Horizontal scroll — a trackpad's two fingers, a wheel that tilts, or
		 * `Shift` and any wheel at all — moves between tabs once whatever is under
		 * the cursor has no sideways travel left. On by default: it takes only the
		 * scrolling nothing else wanted.
		 */
		wheel = true,
		/**
		 * Hold the middle button and move sideways. **Off by default** — it costs
		 * the browser's autoscroll for the whole site, which is a real thing to
		 * spend and the caller's to decide.
		 */
		middle = false
	} = $props();

	const SLOP = 14; /* px before a touch is a swipe — larger than the drawer's,
	                    because this competes with reading rather than with a rail */
	const UPRIGHT = 1.2; /* how much more sideways than vertical a swipe must be */
	const FLICK = 0.5; /* px/ms that commits regardless of distance */
	const STALE = 100; /* ms; a finger that paused before lifting threw nothing */
	const NUDGE = 34; /* px the column gives, at the limit of a very long pull */
	const WHEEL_COMMIT = 220; /* accumulated delta that turns the page */
	const WHEEL_END = 140; /* ms of quiet that ends a wheel gesture — it has no
	                          "up" event, so the only end is stopping */
	const WHEEL_QUIET = 200; /* ms of stillness that ends the lock after a commit */

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

	/* Where the hand is, and how much room it has. The indicator is drawn at the
	   pointer rather than at the screen's edge, which means it has to be told
	   both — and the awkward part is that the direction you are travelling is
	   the direction the room runs out in. */
	let ptrX = $state(0);
	let ptrY = $state(0);
	let byTouch = $state(false);
	/* the content's left edge, which is not the window's: AppShell's rail and
	   its docked sidebar are outside `main`. Measured once per gesture. */
	let safeL = $state(0);

	const CHEVRONS = 5;
	/* Clearance either side of the pointer. The two halves used to start almost
	   on top of it, which on a touch screen puts the first chevron under the
	   edge of the thumb and leaves the whole composition looking like one
	   crowded lump. Held apart, the anchor reads as the thing the two halves
	   are arranged around. */
	const MARK_GAP = 34;
	const NAME_GAP = 30;
	/* How far the run reaches at this pull, in step with the geometry below. */
	const reach = $derived(MARK_GAP + 4 * (13 + p * 9) + 16 * 1.3);
	/* Near enough for the clamp; the plate sizes itself from its own text. */
	const nameW = $derived((target?.label?.length ?? 8) * 7.4 + 52);

	/**
	 * The anchor, and which side of it the name sits on.
	 *
	 * Clamped rather than flipped. Putting the run on the other side of the
	 * pointer when it runs out of room would move the thing being tracked
	 * mid-gesture; holding the whole composition inside the safe rect keeps it
	 * on screen without ever jumping, and only bites over the last stretch of a
	 * pull toward an edge.
	 *
	 * The name sits on the far side of the anchor from the run: chevrons lead
	 * away in the direction of travel, the name stays back where the hand is.
	 * Putting it out past the last chevron instead was tried and is worse in
	 * two ways — it reads as one long streak rather than as a thing being
	 * pulled toward somewhere, and it stacks the whole 240px composition on one
	 * side of the pointer, which the clamp then has to drag back off the finger
	 * almost immediately. Straddling the anchor halves the width that has to
	 * fit, so the indicator stays where the hand is for nearly all of a pull.
	 */
	const anchor = $derived.by(() => {
		if (!target) return { x: 0, y: 0, side: -dir };
		const pad = 10;
		const right = innerWidth - pad;
		const left = safeL + pad;

		const side = -dir;
		const fwd = reach;
		const back = NAME_GAP + nameW;
		const lo = ptrX - (dir < 0 ? fwd : back);
		const hi = ptrX + (dir < 0 ? back : fwd);
		const shift = lo < left ? left - lo : hi > right ? right - hi : 0;

		/* What the backdrop has to cover, measured from the anchor rather than
		   guessed at: the run and the name are not symmetrical about it, and a
		   veil centred on the anchor would sit half off the thing it is meant to
		   be lifting off the page. */
		const vLo = lo - ptrX - shift;
		const vHi = hi - ptrX - shift;

		/* a finger covers what it is pointing at, so the whole thing lifts clear
		   of the contact point; a mouse cursor hides nothing */
		return {
			x: ptrX + shift,
			y: ptrY - (byTouch ? 52 : 0),
			side,
			vx: (vLo + vHi) / 2,
			vw: vHi - vLo + 104
		};
	});

	/** The five marks, all of it derived from the pull. */
	const marks = $derived.by(() => {
		const step = 13 + p * 9;
		return Array.from({ length: CHEVRONS }, (_, i) => {
			const frac = Math.min(1, Math.max(0, p * CHEVRONS - i));
			const a = (5 + i * 1.9) * (0.58 + 0.42 * p);
			return {
				i,
				x: MARK_GAP + i * step + i * i * 1.3,
				a,
				w: (1.9 + i * 0.3) * (0.7 + 0.3 * p),
				alpha: frac > 0 ? 0.26 + 0.6 * frac : 0.1
			};
		});
	});
	const boxW = $derived(reach + 26);
	const boxH = $derived(2 * ((5 + 4 * 1.9) * 1 + 6));

	let pid = null;
	let armed = false;
	let mid = false; /* this drag is the middle button's, not a finger's */
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
	 *
	 * None of this is needed by the mouse. A `wheel` is cancelable and a middle
	 * drag scrolls nothing, so both just ask `claimant` and `hasTravel` at the
	 * moment they need an answer. The marking is the finger's tax alone, and it
	 * is skipped entirely on a screen too wide for the finger's swipe.
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

	/** True when there are tabs to move between and somewhere to send them. */
	const live = () => !!onnavigate && tabs.length > 1;

	function down(e) {
		reset();
		/* First, and past every guard below. An armed swipe calls preventDefault
		   on the move, which on a touch screen means the click it would have
		   produced never arrives — so the flag set on release has nothing to
		   spend itself on, and would be lying in wait for the next real tap. */
		swallow = false;
		if (!live()) return;

		/* The middle button is a gesture of its own, and not a narrow-screen one:
		   it exists for the widths the finger's swipe stands down at. */
		const isMiddle = e.button === 1 && e.pointerType === 'mouse';
		if (isMiddle ? !middle : innerWidth >= upTo || (e.pointerType === 'mouse' && e.button !== 0))
			return;
		/* the shell's chrome lives outside `main`; so does the drawer it drags */
		if (!e.target?.closest?.('main')) return;
		const claim = claimant(e.target);
		if (claim === 'never') return;
		/* A middle drag scrolls nothing, so a scroller has no claim on it — it can
		   start over a table mid-scroll and still turn the page. Only the outright
		   refusals above apply. */
		blocker = isMiddle ? null : claim;
		mid = isMiddle;
		if (isMiddle) {
			/* what stops the autoscroll cursor appearing and taking the pointer */
			e.preventDefault();
		}
		pid = e.pointerId;
		x0 = lastX = e.clientX;
		y0 = e.clientY;
		lastT = e.timeStamp;
		vx = 0;
		byTouch = e.pointerType !== 'mouse';
		/* measured once, here: the content's left edge does not move during a
		   gesture, and reading layout on every move would be a reflow per frame */
		safeL = e.target.closest('main')?.getBoundingClientRect().left ?? 0;
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

		ptrX = e.clientX;
		ptrY = e.clientY;
		const travelled = dir * (e.clientX - x0);
		/* A fraction of the window is right for a thumb on a phone and absurd on
		   a 27-inch monitor, where it would ask for half a metre of mouse. The
		   cap is what a wrist does without moving the arm. */
		const full = mid ? Math.min(innerWidth * commitAt, 220) : innerWidth * commitAt;
		p = Math.min(1, Math.max(0, travelled / full));
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
		mid = false;
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
	   it, on top of the tab change the swipe already asked for. `auxclick` is
	   the same story for the middle button, where following the link means a
	   new tab — and only a drag is swallowed, so a plain middle click on a link
	   still opens one. */
	function click(e) {
		if (!swallow) return;
		swallow = false;
		e.preventDefault();
		e.stopImmediatePropagation();
	}

	/* ── The wheel ────────────────────────────────────────────────────────
	 *
	 * A wheel gesture has no beginning and no end, only a stream — so this
	 * accumulates, and calls the stream over when it goes quiet. Everything else
	 * is the drag's: the same neighbours, the same peek, the same nudge.
	 *
	 * The direction is the finger's, inverted. `deltaX` above zero is a scroll
	 * to the right, which moves the content left, which is the hand pulling the
	 * page toward the next tab.
	 */
	let acc = 0;
	let wheelEnd = null;
	let locked = null; /* null | 'spent' | 'scroller' */
	let lockTimer = null;

	/**
	 * Who owns the rest of this wheel gesture, until it goes quiet.
	 *
	 * `'spent'` — a tab was just turned. Everything further is swallowed, or one
	 * flick walks the whole bar. A fixed lockout cannot do this, which took a
	 * measurement to believe: a throw keeps arriving for as long as the momentum
	 * lasts, and one flick went three tabs past a 450ms window. What ends a
	 * gesture is not a duration, it is stillness.
	 *
	 * `'scroller'` — something under the cursor had travel and was given the
	 * event. It keeps the whole gesture, not merely the part it could spend:
	 * otherwise one long throw runs a table to its last column and then turns
	 * the page as well, which is two answers to one movement. Stop, and the next
	 * flick is the page's.
	 */
	function hold(kind) {
		locked = kind;
		clearTimeout(lockTimer);
		lockTimer = setTimeout(() => (locked = null), WHEEL_QUIET);
	}

	function onWheel(e) {
		if (!wheel || !live()) return;
		/* The rest of a gesture already spoken for. Swallowed if a tab was
		   turned; passed straight through if a scroller has it, since taking it
		   back would stop the very scrolling it was handed over for. */
		if (locked) {
			if (locked === 'spent') e.preventDefault();
			hold(locked);
			return;
		}

		/* Sideways, however it was asked for. Shift with a plain wheel reports a
		   vertical delta and scrolls horizontally, which is the only reason this
		   works on a mouse without a tilt. */
		const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
		if (!dx || (!e.shiftKey && Math.abs(e.deltaX) <= Math.abs(e.deltaY))) return end();
		if (!e.target?.closest?.('main')) return end();

		/* Two directions here, and they are not the same one.

		   `scroll` is where the content would actually go, and it is the only
		   thing a scroller can be asked about: `deltaX` above zero scrolls right,
		   which moves the content left.

		   `d` is which tab, and it deliberately does NOT follow the scroll. It
		   follows the hand, so that every input on the page agrees on one rule —
		   a gesture from right to left brings the next tab in, whether that is a
		   thumb, the middle button, or a wheel. Reading it off the scroll instead
		   is defensible and was the first cut, but it means the same physical
		   movement changes tabs one way on a phone and the other on a desktop,
		   and which of the two a given movement produces is the reader's
		   natural-scrolling setting rather than anything this can know. */
		const scroll = dx > 0 ? -1 : 1;
		const d = -scroll;
		const claim = claimant(e.target);
		if (claim === 'never') return end();
		/* the plain version of the whole touch-action apparatus: a cancelable
		   event, asked at the moment it matters — and asked about the scroll,
		   not the tab */
		if (claim && hasTravel(claim, scroll)) {
			hold('scroller');
			return end();
		}

		const t = d > 0 ? prev : next;
		if (!t) return end();

		e.preventDefault();
		/* the wheel has no drag, so the cursor is wherever it already was */
		ptrX = e.clientX;
		ptrY = e.clientY;
		byTouch = false;
		if (d !== dir || !armed) {
			acc = 0;
			armed = true;
			dir = d;
			target = t;
			safeL = e.target.closest('main')?.getBoundingClientRect().left ?? 0;
			document.documentElement.dataset.tabSwipe = '';
			Promise.resolve(preload?.(t.href)).catch(() => {});
		}
		acc += Math.abs(dx);
		p = Math.min(1, acc / WHEEL_COMMIT);
		const give = dir * NUDGE * (1 - 1 / (1 + acc / NUDGE));
		document.documentElement.style.setProperty('--tab-swipe-x', `${give}px`);

		clearTimeout(wheelEnd);
		if (p >= 1) {
			const href = target.href;
			hold('spent');
			acc = 0;
			reset();
			onnavigate(href);
		} else {
			wheelEnd = setTimeout(end, WHEEL_END);
		}
	}

	/** The wheel went quiet, or turned out not to be ours. */
	function end() {
		clearTimeout(wheelEnd);
		acc = 0;
		if (armed && pid === null) reset();
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
		addEventListener('auxclick', click, true);
		addEventListener('wheel', onWheel, opts);

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
			removeEventListener('auxclick', click, true);
			removeEventListener('wheel', onWheel, opts);
			removeEventListener('scroll', onScroll, true);
			clearTimeout(wheelEnd);
			clearTimeout(lockTimer);
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

<!--
	A sweep out of the edge the page is heading for, and the name of what is
	behind it.

	The gesture is worth nothing if you cannot tell where you are about to land,
	and it is worth little if you cannot tell how much further to pull. This says
	both at once: the disc's centre sits exactly on the screen's edge, so it
	reads as something arriving from off-screen, which is what the next tab
	literally is — and the swept angle is the progress, half a turn being the
	release point. Nothing here is a target; it is a picture of the gesture.
-->
{#if target}
	<div
		class="swipe"
		class:back={dir < 0}
		class:ready={p >= 1}
		style="--p: {p}; --x: {anchor.x}px; --y: {anchor.y}px; --vx: {anchor.vx}px; --vw: {anchor.vw}px; --lx: {anchor.side *
			(anchor.side === dir ? reach + NAME_GAP + 2 + nameW / 2 : NAME_GAP + 2 + nameW / 2)}px"
		aria-hidden="true"
	>
		<!-- First, so it sits under the rest: the page dimmed and blurred just
		     where the indicator is, which is what lets thin strokes read over a
		     column of figures without either of them being made louder. -->
		<div class="veil"></div>
		<!-- Drawn pointing right and mirrored for the other direction, so there is
		     one set of numbers rather than two that can drift apart. -->
		<svg class="marks" width={boxW} height={boxH} viewBox="0 {-boxH / 2} {boxW} {boxH}">
			{#each marks as m (m.i)}
				<path
					class="mark"
					style="--a: {m.alpha}; --w: {m.w}; --i: {m.i}"
					d="M{m.x - m.a * 0.7} {-m.a} L{m.x + m.a * 0.7} 0 L{m.x - m.a * 0.7} {m.a}"
				/>
			{/each}
		</svg>
		<span class="name">
			{#if target.icon}{@html target.icon}{/if}
			<span>{target.label}</span>
		</span>
	</div>
{/if}

<style>
	/* A point, not a box: the marks and the name position themselves against it,
	   and it sits wherever the hand is. Nothing here is a target. */
	.swipe {
		position: fixed;
		left: var(--x);
		top: var(--y);
		width: 0;
		height: 0;
		z-index: 30;
		pointer-events: none;
		color: var(--accent);
	}

	/* The page, dimmed and blurred, only where the indicator is.

	   Thin accent strokes over a table of figures are a contrast problem that
	   has two bad answers — a heavier stroke, or a plate the shape of a box —
	   and one good one: take the busyness out of the background instead. The
	   radial mask is what keeps it from reading as a box. `closest-side` makes
	   the fade elliptical to match, so it has no edge anywhere, and it carries
	   the backdrop filter with it rather than clipping it to a rectangle.

	   Widest at the commit, faint at the start: at a tenth of a pull there is
	   almost nothing to see through it, and dimming the page for that would be
	   a bigger statement than the gesture has earned. */
	.veil {
		position: absolute;
		top: 0;
		left: var(--vx);
		width: var(--vw);
		height: calc(78px + 34px * var(--p));
		transform: translate(-50%, -50%);
		border-radius: 999px;
		background: rgb(4 6 2 / 0.52);
		backdrop-filter: blur(7px) saturate(0.75);
		-webkit-backdrop-filter: blur(7px) saturate(0.75);
		-webkit-mask-image: radial-gradient(closest-side, #000 52%, transparent 100%);
		mask-image: radial-gradient(closest-side, #000 52%, transparent 100%);
		opacity: calc(0.25 + 0.75 * var(--p));
	}

	/* Drawn pointing right; the other direction is the same drawing mirrored
	   about the anchor, which is why `back` moves the box to the anchor's left
	   and flips it rather than re-deriving every number with the sign changed. */
	.marks {
		position: absolute;
		top: 50%;
		left: 0;
		transform: translateY(-50%);
		overflow: visible;
	}
	.swipe.back .marks {
		left: auto;
		right: 0;
		transform: translateY(-50%) scaleX(-1);
	}

	.mark {
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: var(--w);
		opacity: var(--a);
		/* A crest travelling outward, not five arrows breathing together. The
		   keyframes sit low for most of the cycle and spike briefly, because a
		   plain ease leaves everything half-lit at once and reads as a glow
		   rather than as motion — and the stagger is what makes the bright spot
		   move away from the hand instead of pulsing in place.

		   All the delays are negative so every mark is already mid-cycle on the
		   first frame; a positive delay would hold the run dark until its turn
		   came round, which on a gesture this short is most of it. */
		animation: crest 1480ms linear infinite;
		animation-delay: calc((var(--i) - 5) * 223ms);
	}
	@keyframes crest {
		0%,
		68% {
			opacity: calc(var(--a) * 0.72);
			stroke-width: calc(var(--w) * 0.86);
		}
		84% {
			opacity: calc(var(--a) * 1.5);
			stroke-width: calc(var(--w) * 1.18);
		}
		100% {
			opacity: calc(var(--a) * 0.72);
			stroke-width: calc(var(--w) * 0.86);
		}
	}

	/* Far enough to commit: the run stops pulsing and goes solid, so the release
	   point is something you see rather than something you judge. */
	.swipe.ready .mark {
		animation: none;
		opacity: 1;
		stroke-width: calc(var(--w) * 1.15);
	}

	@media (prefers-reduced-motion: reduce) {
		.mark {
			animation: none;
		}
	}

	/* On its own plate, because it has to stay readable over whatever the page
	   happens to have under it — a text shadow was not close to enough against a
	   column of figures. `--lx` is where the anchor decided it fits: ahead of the
	   run normally, tucked behind it when the edge is too close. */
	.name {
		position: absolute;
		top: 0;
		left: var(--lx);
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 6px 10px;
		border: var(--border-width) solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: var(--radius-2);
		background: color-mix(in srgb, var(--surface-sunken) 88%, transparent);
		box-shadow: var(--shadow-2);
		color: var(--text);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		white-space: nowrap;
		opacity: calc(0.45 + 0.55 * var(--p));
	}
	.swipe.ready .name {
		border-color: var(--accent);
	}

	/* `:global` because the glyph arrives by `{@html}` */
	.name :global(svg) {
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
