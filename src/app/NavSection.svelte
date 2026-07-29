<script>
	/**
	 * A heading over a group of nav rows.
	 *
	 * It keeps its text in the rail rather than hiding with the labels — a
	 * three-character heading still fits, and without it the second group of
	 * icons has nothing to say what it is.
	 */
	let { children, ...rest } = $props();
</script>

<div class="section" {...rest}>{@render children?.()}</div>

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
