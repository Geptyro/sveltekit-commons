<script>
	/**
	 * variant: 'solid' (accent fill) | 'ghost' (quiet outline) | 'danger'
	 *
	 * Renders an <a> when given an href, so a link that looks like a button
	 * still navigates like a link — middle-click, open-in-new-tab and the
	 * status bar all keep working, which a <button> with an onclick throws
	 * away.
	 */
	let { variant = 'solid', href, children, ...rest } = $props();
</script>

{#if href}
	<a class="btn {variant}" {href} {...rest}>{@render children?.()}</a>
{:else}
	<button class="btn {variant}" {...rest}>{@render children?.()}</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-2);
		background: var(--accent);
		color: var(--accent-contrast);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 650;
		line-height: 1.2;
		text-decoration: none;
		cursor: pointer;
		transition:
			background 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}

	.btn:hover {
		background: var(--accent-dim);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.btn:disabled:hover {
		background: var(--accent);
	}

	.ghost {
		background: transparent;
		border-color: var(--border-strong);
		color: var(--text-dim);
		font-weight: 550;
	}

	.ghost:hover {
		background: transparent;
		border-color: var(--accent);
		color: var(--accent);
	}

	.ghost:disabled:hover {
		background: transparent;
		border-color: var(--border-strong);
		color: var(--text-dim);
	}

	.danger {
		background: var(--danger);
		color: var(--accent-contrast);
	}

	.danger:hover {
		background: color-mix(in srgb, var(--danger) 85%, black);
	}

	.danger:disabled:hover {
		background: var(--danger);
	}
</style>
