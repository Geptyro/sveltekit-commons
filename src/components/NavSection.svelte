<script>
	/**
	 * A heading over a group of nav rows.
	 *
	 * It keeps its text in the rail rather than hiding with the labels — a
	 * three-character heading still fits, and without it the second group of
	 * icons has nothing to say what it is.
	 */
	/* `class` is pulled out of the props and composed with the component's own,
	   never left to `...rest`. A spread sets the attribute wholesale, so
	   `<Card class="block">` used to render `class="block"` — the base class
	   gone, and with it the surface, border and radius. Every consumer that
	   styled a component from outside was silently unstyling it. */

	let { children, class: klass = '', ...rest } = $props();
</script>

<div class="section {klass}" {...rest}>{@render children?.()}</div>

<style>
	.section {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--text-faint);
		text-align: var(--label-align, left);
		padding: calc(var(--nav-pad-y, 7px) * 2 + 4px) var(--nav-pad-x, 10px) 6px;
		transition: padding 180ms ease;
	}
</style>
