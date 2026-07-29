<script>
	/**
	 * A surface with a border. Given an href it becomes a link and picks up the
	 * lift-on-hover — a card that navigates should say so before it is clicked.
	 *
	 * `pad={false}` for cards whose contents manage their own padding (a table,
	 * a full-bleed image), which is otherwise inset by a ring nothing wanted.
	 */
	let { href, pad = true, children, ...rest } = $props();
</script>

{#if href}
	<a class="card link" class:pad {href} {...rest}>{@render children?.()}</a>
{:else}
	<div class="card" class:pad {...rest}>{@render children?.()}</div>
{/if}

<style>
	.card {
		display: block;
		background: var(--surface);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-3);
		box-shadow: var(--shadow-1);
	}

	.pad {
		padding: var(--space-3) var(--space-4);
	}

	.link {
		text-decoration: none;
		transition:
			border-color 140ms ease,
			transform 140ms ease,
			box-shadow 140ms ease;
	}

	.link:hover {
		border-color: var(--border-strong);
		transform: translateY(-1px);
		box-shadow: var(--shadow-2);
	}

	@media (prefers-reduced-motion: reduce) {
		.link:hover {
			transform: none;
		}
	}
</style>
