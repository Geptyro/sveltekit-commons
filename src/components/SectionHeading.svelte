<script>
	/**
	 * A small-caps mono heading with a rule running to the right margin — the
	 * divider between bands of a page.
	 *
	 * The rule is a ::after that flexes into whatever space is left, so it fits
	 * the column without anyone measuring it, and it stops next to the words
	 * rather than running under them.
	 */
	/* `class` is pulled out of the props and composed with the component's own,
	   never left to `...rest`. A spread sets the attribute wholesale, so
	   `<Card class="block">` used to render `class="block"` — the base class
	   gone, and with it the surface, border and radius. Every consumer that
	   styled a component from outside was silently unstyling it. */

	let { children, class: klass = '', ...rest } = $props();
</script>

<h2 class="section {klass}" {...rest}>{@render children?.()}</h2>

<style>
	.section {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-dim);
		margin: var(--space-7) 0 var(--space-3);
	}

	.section::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}
</style>
