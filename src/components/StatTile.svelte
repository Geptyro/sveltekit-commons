<script>
	/**
	 * A single headline number with its label under it — the row of counters
	 * that sits above a board or a summary.
	 *
	 * Deliberately not a Card: tiles sit shoulder to shoulder in a wrapping row
	 * and want a tighter inset and no hover affordance, since a tile is a
	 * readout rather than a destination.
	 */
	/* `class` is pulled out of the props and composed with the component's own,
	   never left to `...rest`. A spread sets the attribute wholesale, so
	   `<Card class="block">` used to render `class="block"` — the base class
	   gone, and with it the surface, border and radius. Every consumer that
	   styled a component from outside was silently unstyling it. */

	let {
		value,
		label,
		/** Any CSS colour for the value, e.g. a rank or an outcome. */
		tint = null,
		children,
		class: klass = '',
		...rest
	} = $props();
</script>

<div class="tile {klass}" style={tint ? `--tile-tint: ${tint}` : undefined} {...rest}>
	<b>{value}</b>
	<span>{label}</span>
	{@render children?.()}
</div>

<style>
	.tile {
		background: var(--surface);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-3);
		box-shadow: var(--shadow-1);
		padding: var(--space-2) var(--space-4);
		min-width: 6rem;
	}

	b {
		display: block;
		font-size: var(--text-lg);
		font-weight: 650;
		/* tabular figures so a row of tiles does not jitter as numbers change */
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
		color: var(--tile-tint, var(--text));
	}

	span {
		display: block;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-faint);
	}
</style>
