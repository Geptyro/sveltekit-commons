<script>
	/**
	 * A pressable pill — a filter, a toggleable facet.
	 *
	 * `pressed` drives `aria-pressed`, so the accent-filled state and the state
	 * a screen reader announces cannot drift apart: there is only one of them.
	 */
	/* `class` is pulled out of the props and composed with the component's own,
	   never left to `...rest`. A spread sets the attribute wholesale, so
	   `<Card class="block">` used to render `class="block"` — the base class
	   gone, and with it the surface, border and radius. Every consumer that
	   styled a component from outside was silently unstyling it. */

	let { pressed = false, children, class: klass = '', ...rest } = $props();
</script>

<button class="chip {klass}" aria-pressed={pressed} {...rest}>{@render children?.()}</button>

<style>
	.chip {
		background: var(--surface);
		color: var(--text-dim);
		border: var(--border-width) solid var(--border-strong);
		border-radius: 99px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 500;
		line-height: 1;
		letter-spacing: 0.03em;
		padding: var(--space-2) var(--space-3);
		cursor: pointer;
		transition:
			background 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}

	.chip:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.chip[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-contrast);
	}
</style>
