<script>
	/**
	 * A small-caps mono heading with a rule running to the right margin — the
	 * divider between bands of a page.
	 *
	 * The rule is a ::after that flexes into whatever space is left, so it fits
	 * the column without anyone measuring it, and it stops next to the words
	 * rather than running under them.
	 */
	let { children, ...rest } = $props();
</script>

<h2 class="section" {...rest}>{@render children?.()}</h2>

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
