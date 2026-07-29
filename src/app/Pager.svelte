<script>
	/**
	 * Page links that keep the rest of the query string — sorting, filters —
	 * intact, so paging never silently drops the view the reader set up.
	 *
	 * Renders the count alone when everything fits on one page: the total is
	 * useful even when there is nothing to page through.
	 */
	import { page as currentPage } from '$app/state';
	import { pageWindow } from '../helpers/paging.ts';

	let {
		page,
		pages,
		total,
		/** plural noun for the count; the singular is derived by dropping a trailing s */
		label = 'rows',
		param = 'page',
		class: klass = '',
		...rest
	} = $props();

	function href(n) {
		const params = new URLSearchParams(currentPage.url.search);
		// page 1 is the bare URL — a `?page=1` in a shared link is noise
		if (n === 1) params.delete(param);
		else params.set(param, String(n));
		const q = params.toString();
		return q ? `?${q}` : currentPage.url.pathname;
	}
</script>

<nav class="pager {klass}" aria-label="Pagination" {...rest}>
	<span class="count">{total.toLocaleString('en')} {total === 1 ? label.replace(/s$/, '') : label}</span>
	{#if pages > 1}
		<span class="links">
			{#if page > 1}<a class="step" href={href(page - 1)} rel="prev">←</a>{/if}
			<!-- keyed on position: gaps are null and would otherwise collide -->
			{#each pageWindow(page, pages) as n, i (n ?? `gap-${i}`)}
				{#if n === null}
					<span class="gap">…</span>
				{:else if n === page}
					<span class="here" aria-current="page">{n}</span>
				{:else}
					<a href={href(n)}>{n}</a>
				{/if}
			{/each}
			{#if page < pages}<a class="step" href={href(page + 1)} rel="next">→</a>{/if}
		</span>
	{/if}
</nav>

<style>
	.pager {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.count {
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}

	.links {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.links a,
	.here,
	.gap {
		min-width: 26px;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-2);
		text-align: center;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 500;
		line-height: 1;
		text-decoration: none;
		color: var(--text-dim);
	}

	.links a {
		border: var(--border-width) solid var(--border);
	}

	.links a:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.here {
		border: var(--border-width) solid var(--accent);
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.gap {
		border: none;
		min-width: 0;
		padding: var(--space-1) 2px;
	}
</style>
