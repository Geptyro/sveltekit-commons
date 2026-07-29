<script>
	/**
	 * `trail` is ordered root-first. The last entry is the current page and is
	 * rendered as text with `aria-current` rather than a link — a crumb that
	 * navigates to where you already are is noise to a mouse and a trap to a
	 * screen reader.
	 *
	 * The separators are `::before` content on the list items, so they belong to
	 * the presentation rather than the accessibility tree: a reader announces
	 * "Weapons, link" and not "slash Weapons slash link".
	 */
	let { trail = [], label = 'Breadcrumb', ...rest } = $props();
</script>

{#if trail.length}
	<nav class="crumbs" aria-label={label} {...rest}>
		<ol>
			{#each trail as crumb, i (crumb.href ?? crumb.label)}
				<li>
					{#if crumb.href && i < trail.length - 1}
						<a href={crumb.href}>{crumb.label}</a>
					{:else}
						<span aria-current="page">{crumb.label}</span>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>
{/if}

<style>
	.crumbs {
		font-size: var(--text-xs);
		color: var(--text-faint);
	}

	ol {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		/* long category names must be able to wrap rather than push the page */
		min-width: 0;
	}

	li + li::before {
		content: '/';
		color: var(--border-strong);
	}

	a {
		color: var(--text-dim);
		text-decoration: none;
	}

	a:hover {
		color: var(--accent);
	}

	[aria-current='page'] {
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
