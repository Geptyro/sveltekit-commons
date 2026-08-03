<script>
	/**
	 * One row of the sidebar: an icon slot, a label, and an optional trailing
	 * badge. Collapsing to the rail leaves the icon and takes the rest.
	 *
	 * The row reads the shell's variables rather than being told which state it
	 * is in, so it is the same markup either way and the transition is CSS's
	 * problem, not a re-render.
	 *
	 * Nothing in here changes shape between the two states — same paddings, same
	 * icon, same height. The label goes because the row gets narrower than it
	 * is and `overflow: hidden` takes the rest, so it slides out behind the icon
	 * instead of being switched off mid-transition. Which is also why the row
	 * keeps its accessible name in the rail, and `title` is now the tooltip it
	 * looks like rather than the only thing naming the link.
	 */
	let {
		href,
		label,
		active = false,
		/** Tighter rows, for a long secondary list. */
		dense = false,
		/** Icon slot — an svg, an img, whatever the site uses. */
		icon,
		/** Right-aligned badge; hidden in the rail along with the label. */
		trailing,
		onclick,
		...rest
	} = $props();
</script>

<a
	{href}
	class="item"
	class:active
	class:dense
	class:has-trailing={Boolean(trailing)}
	title={label}
	{onclick}
	{...rest}
>
	<span class="icon">{@render icon?.()}</span>
	<span class="label">{label}</span>
	{#if trailing}<span class="trailing">{@render trailing()}</span>{/if}
</a>

<style>
	.item {
		display: flex;
		align-items: center;
		/* Always, in both states. The shell's paddings are chosen so that a
		   left-aligned row is already centred once the box is a rail, so there
		   is nothing to flip — and a justification that flips would jump the
		   icon across the row on frame one of the collapse. */
		justify-content: flex-start;
		gap: 9px;
		font-size: var(--text-sm);
		font-weight: 500;
		text-decoration: none;
		color: var(--text);
		padding: var(--nav-pad-y, 7px) var(--nav-pad-x, 10px);
		border-radius: var(--radius-2);
		/* a row never wraps or reflows mid-animation; it just gets cut off */
		overflow: hidden;
		white-space: nowrap;
		transition:
			background 120ms ease,
			color 120ms ease,
			padding 180ms ease;
	}

	/* A long secondary list, told apart by its weight and not by its size.

	   It used to take 2.5px off the row's padding top and bottom, which is what
	   made those rows read as horizontal rectangles in the rail: a pill is as
	   wide as the rail lets it be, so shortening it makes it wider than it is
	   tall — 34×29 against every other row's 34×34. It cannot take the height
	   out of the slot instead either, because the slot is half of the identity
	   that centres the icon on the rail's axis (see AppShell). So a dense row is
	   the same box as any other, and only its type is lighter. */
	.dense {
		font-weight: 450;
	}

	.item:hover {
		background: var(--surface-raised);
	}

	.item.active {
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.icon {
		position: relative;
		display: grid;
		place-items: center;
		width: var(--nav-slot, 22px);
		height: var(--nav-slot, 22px);
		flex-shrink: 0;
		color: var(--text-dim);
		transition:
			width 180ms ease,
			height 180ms ease,
			color 120ms ease;
	}

	.item:hover .icon {
		color: var(--text);
	}

	.item.active .icon {
		color: inherit;
	}

	/* sized here so a site's icon markup does not have to know the scale. A mark
	   only — a picture is not a mark, and takes the whole cell below. */
	.icon :global(svg) {
		width: var(--nav-glyph, 16px);
		height: var(--nav-glyph, 16px);
		transition:
			width 180ms ease,
			height 180ms ease;
	}

	/* A picture is the tile, not a mark drawn on one: --nav-tile is the row's
	   full height, so the portrait bleeds over the padding above and below and
	   fills the pill — in the rail, the whole 34px square, against the 26px it
	   used to be centred in.

	   Square by construction: one length, used for both sides. Centred on the
	   slot rather than inset from it, so it lands on the rail's axis whatever
	   size it is given. Out of flow so it can outgrow the slot without giving
	   its row a different height from every other row.

	   Both lengths are stated, and that is not optional. An out-of-flow
	   *replaced* element with `width: auto` takes its intrinsic size and ignores
	   the offsets meant to stretch it — so cancelling the padding with negative
	   insets, which is the obvious way to write this and works for any ordinary
	   box, hands a 128px portrait its full 128px and lets the row's overflow
	   crop it to a letterbox. */
	.icon :global(img) {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: var(--nav-tile, 34px);
		height: var(--nav-tile, 34px);
		object-fit: cover;
		border-radius: var(--radius-2);
		transition: outline-color 120ms ease;
	}

	/* A picture that fills the pill covers the background the row uses to say
	   it is hovered or active, so the picture carries that itself — a ring just
	   inside its own edge, which reads against a portrait where a colour behind
	   it cannot. Active comes second on purpose: hovering the row you are on
	   keeps the accent rather than dropping back to the quiet ring. */
	.item:hover .icon :global(img) {
		outline: 2px solid var(--border-strong);
		outline-offset: -2px;
	}
	.item.active .icon :global(img) {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}

	/* No --label-display here. The row's own overflow is what removes it in the
	   rail, and a display switch cannot be transitioned — it would take the word
	   out of flow on frame one and leave the box animating around nothing. */
	.label {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Only rows with a badge give the label the slack, or a plain row's text
	   would stop short of the edge for no reason.

	   `auto` and not `1`: a zero basis means the label is the first thing the
	   box takes back as it narrows, so the badge ends up sitting against the
	   icon with no word between them for part of the collapse. From its natural
	   width it holds the badge out past the edge instead, and the two are
	   clipped together. */
	.has-trailing .label {
		flex: auto;
	}

	/* clipped with the label, and for the same reason */
	.trailing {
		display: block;
		font-family: var(--font-mono);
		font-size: 9.5px;
		color: var(--text-faint);
		flex-shrink: 0;
	}

	.item.active .trailing {
		color: color-mix(in srgb, currentColor 75%, transparent);
	}
</style>
