<script>
	/**
	 * The page itself: the column's gutters, and the scrollbar.
	 *
	 * AppShell hands down a box of a known height and no opinions — no padding,
	 * no overflow. This is what an ordinary page puts in it, and it is the only
	 * thing that scrolls. That split is the point: a scrollbar spans its own
	 * scroller top to bottom, so anything a page wants standing *above* the
	 * scrolling part — a bar of tabs — has to be a sibling of this rather than
	 * something inside it pinned with `position: sticky`. As a sibling it keeps
	 * the full width of the column and the scrollbar starts beneath it.
	 *
	 *     <TabBar docked … />
	 *     <Page>{@render children()}</Page>
	 *
	 * Both are direct children of the shell's `main`, which is a flex column, so
	 * the bar takes its own height and this takes the rest. No wrapper, and
	 * nothing measured: the bar being 36px or 72px changes nothing here.
	 *
	 * `fill` is the other shape — a page whose *inside* scrolls. A full-height
	 * listing (`.datapage`) keeps its toolbar and table head still and scrolls
	 * only its rows, so the page must not scroll as well or there are two
	 * scrollbars for one column. It drops the bottom gutter too, because the
	 * point of such a page is that its last row ends on the window's edge.
	 */
	let {
		/** The page does not scroll; something inside it does. */
		fill = false,
		/** Dropped onto the element, so a caller can add a class or an id. */
		children,
		...rest
	} = $props();
</script>

<div class="page" class:fill {...rest}>{@render children?.()}</div>

<style>
	.page {
		/* the rest of the column, whatever the chrome above it took */
		flex: 1;
		min-width: 0;
		/* a flex item floors at its content without this, and a scroller that
		   cannot be shorter than what it holds never scrolls */
		min-height: 0;
		overflow-y: auto;
		padding: var(--content-pad-top, 26px) var(--content-pad-x, 36px)
			var(--content-pad-bottom, 72px);
		/* The column scrolls one way, and says so.

		   `overflow-y: auto` alone does not mean that: CSS turns the other axis
		   to `auto` along with it, so the browser treats this as a horizontal
		   scroll container too and claims any sideways drag on sight — two
		   pointermoves in, `pointercancel`, and any gesture a page wanted is
		   gone. Nothing here ever pans sideways (`min-width: 0`, and the content
		   wraps), so saying `pan-y` costs nothing and is what lets TabSwipe's
		   swipe survive to the release. `pinch-zoom` stays because a page you
		   cannot zoom is a page some people cannot read.

		   It does not reach into the scrollers inside: an element with its own
		   `overflow-x` is its own scroll container with its own `touch-action`,
		   so a wide table keeps its sideways scroll untouched. */
		touch-action: pan-y pinch-zoom;
	}

	/* The gutters are equal in the padding and unequal on the screen: the
	   scrollbar is laid out inside this box, so the right-hand gap is the
	   padding *plus* the scrollbar while the left is the padding alone. Taking
	   the scrollbar's width back off the right is what makes the two match.

	   `stable` is what keeps that from trading one asymmetry for another. It
	   reserves the gutter whether the page scrolls or not, so the sum holds on a
	   short page as well as a long one; without it a page with nothing to scroll
	   would come out narrow on the right by exactly the width being compensated
	   for, and the text would step sideways as you moved between pages.

	   --scrollbar-w is what the site styled its scrollbars to be. It cannot be
	   read from CSS, and measuring it would mean a first paint at one width and
	   a reflow to another, so it is declared: a site that restyles its
	   scrollbars sets this to match. Firefox sizes `scrollbar-width: thin`
	   itself and may differ from the declared value by a pixel or two.

	   `fill` is excluded — nothing scrolls at this level there, so no gutter is
	   reserved and there is nothing to take back. */
	.page:not(.fill) {
		scrollbar-gutter: stable;
		padding-right: max(0px, calc(var(--content-pad-x, 36px) - var(--scrollbar-w, 10px)));
	}

	/* The column gives under a tab swipe.

	   TabSwipe publishes the attribute and the distance and owns no box of its
	   own; this is the box, so this is where the pull lands. Only the page
	   moves — the docked bar above is chrome and stays where it is, which is
	   what makes the gesture read as pushing the page out from under it.

	   Guarded by the attribute rather than left on with a zero default: a
	   standing `transform` makes this the containing block for every
	   fixed-position descendant, and it should exist only while a gesture
	   does. The `settling` value holds it one moment longer to bring the
	   column home. */
	:global(html[data-tab-swipe]) .page {
		transform: translateX(var(--tab-swipe-x, 0px));
	}
	:global(html[data-tab-swipe='settling']) .page {
		transition: transform 200ms cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	/* Same box, no scrollbar of its own, and a column so a child can claim the
	   remaining height with `flex: 1` and have that mean the window's bottom. */
	.page.fill {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding-bottom: 0;
	}
</style>
