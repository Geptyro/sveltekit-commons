<script>
	/**
	 * "What's new" — the latest release, as a card for a page's side rail.
	 *
	 * Takes a `ChangelogRelease` straight from `sveltekit-commons/changelog` and
	 * shows its headlines only; the bodies are what the full changelog page is
	 * for. Minor entries are filtered here rather than by the caller, because
	 * "minor means the reader would not notice unless told" is the meaning the
	 * convention gives that field, not a decision each site re-makes. A release
	 * that is nothing but minor entries still renders — with a line saying so,
	 * which is more honest than the card vanishing on a week of small fixes.
	 *
	 * The chip and the headline are a two-column grid, so every headline starts
	 * on the same edge whatever the widest chip is called. In a ~290px rail the
	 * head cannot hold title, version and date on one line, so it wraps and the
	 * date is pushed right by `margin-left: auto` rather than being positioned.
	 */
	import ChangeChip from './ChangeChip.svelte';

	let {
		release,
		href = '/changelog',
		title = "What's new",
		linkLabel = 'Full changelog →',
		emptyText = 'Small fixes and tweaks — see the full changelog.',
		class: klass = '',
		...rest
	} = $props();

	const entries = $derived(release ? release.entries.filter((e) => e.impact !== 'minor') : []);
</script>

{#if release}
	<section class="whatsnew {klass}" {...rest}>
		<div class="head">
			<h2>{title} <span class="ver">{release.version}</span></h2>
			{#if release.date}<time class="date" datetime={release.date}>{release.date}</time>{/if}
		</div>

		{#if entries.length}
			<dl class="list">
				{#each entries as e (e.title)}
					<dt><ChangeChip type={e.type} /></dt>
					<dd class:major={e.impact === 'major'}>{e.title}</dd>
				{/each}
			</dl>
		{:else}
			<p class="empty">{emptyText}</p>
		{/if}

		<a class="all" {href}>{linkLabel}</a>
	</section>
{/if}

<style>
	.whatsnew {
		background: var(--surface);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-3);
		box-shadow: var(--shadow-1);
		padding: var(--space-3) var(--space-4);
	}

	.head {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 2px var(--space-3);
	}

	.head h2 {
		margin: 0;
		font-size: var(--text-sm);
		font-weight: 650;
		letter-spacing: -0.01em;
	}

	.ver {
		font-family: var(--font-mono);
		font-weight: 700;
		color: var(--accent);
		margin-left: 3px;
	}

	.date {
		margin-left: auto;
		font-size: var(--text-xs);
		color: var(--text-faint);
	}

	.list {
		display: grid;
		/* the chip column takes the widest chip; every headline starts after it */
		grid-template-columns: max-content minmax(0, 1fr);
		align-items: baseline;
		gap: var(--space-2) var(--space-3);
		margin: var(--space-3) 0 0;
	}

	.list dt {
		display: flex;
	}

	.list dd {
		margin: 0;
		font-size: var(--text-sm);
		line-height: 1.45;
		color: var(--text-dim);
		text-wrap: pretty;
	}

	.list dd.major {
		font-weight: 600;
		color: var(--text);
	}

	.empty {
		margin: var(--space-3) 0 0;
		font-size: var(--text-sm);
		color: var(--text-faint);
	}

	/* the way out of the card sits at its foot, on its own rule — in a narrow
	   rail it cannot share the title's line without pushing it around */
	.all {
		display: block;
		margin-top: var(--space-3);
		padding-top: var(--space-2);
		border-top: var(--border-width) solid var(--border);
		font-size: var(--text-sm);
		color: var(--accent);
		text-decoration: none;
		white-space: nowrap;
	}

	.all:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
