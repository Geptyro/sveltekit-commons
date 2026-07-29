<script>
	/**
	 * One row of the sidebar: an icon slot, a label, and an optional trailing
	 * badge. Collapsing to the rail leaves the icon and takes the rest.
	 *
	 * The row reads the shell's variables rather than being told which state it
	 * is in, so it is the same markup either way and the transition is CSS's
	 * problem, not a re-render.
	 *
	 * `title` is set from the label deliberately: collapsed, the text is gone
	 * from the box and from the accessibility tree with it, so the row would
	 * otherwise be an unlabelled link.
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
		justify-content: var(--nav-justify, flex-start);
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

	.dense {
		padding-top: calc(var(--nav-pad-y, 7px) - 2.5px);
		padding-bottom: calc(var(--nav-pad-y, 7px) - 2.5px);
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

	/* sized here so a site's icon markup does not have to know the scale */
	.icon :global(svg),
	.icon :global(img) {
		width: var(--nav-glyph, 16px);
		height: var(--nav-glyph, 16px);
		transition:
			width 180ms ease,
			height 180ms ease;
	}

	.icon :global(img) {
		width: var(--nav-slot, 22px);
		height: var(--nav-slot, 22px);
		object-fit: cover;
		border-radius: var(--radius-2);
	}

	.label {
		display: var(--label-display, block);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* only rows with a badge give the label the slack, or a plain row's text
	   would stop short of the edge for no reason */
	.has-trailing .label {
		flex: 1;
	}

	.trailing {
		display: var(--label-display, block);
		font-family: var(--font-mono);
		font-size: 9.5px;
		color: var(--text-faint);
		flex-shrink: 0;
	}

	.item.active .trailing {
		color: color-mix(in srgb, currentColor 75%, transparent);
	}
</style>
