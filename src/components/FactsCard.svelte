<script module>
	/**
	 * One row of the facts list.
	 *
	 * `icon` is a snippet rather than a name because the icon set is the site's
	 * business, not the contract's — UAR draws its own StatIcon sprites, and a
	 * game database that has none should not have to invent them.
	 */
</script>

<script>
	/**
	 * The infobox that sits beside a detail page: portrait, title, a definition
	 * list of the numbers you compare across entities, and an optional footer
	 * link.
	 *
	 * The facts list is a <dl> with floated <dt>s rather than a grid, which is
	 * what lets a long label wrap under itself while its value stays pinned to
	 * the right edge and the row rule still spans the full width. A grid puts
	 * the rule in the wrong place the moment a label wraps.
	 *
	 * `accent` tints the top edge and the chip — pass the entity's rank, class
	 * or faction colour and the card carries it without the contract needing to
	 * know what the colour means.
	 */
	/* `class` is pulled out of the props and composed with the component's own,
	   never left to `...rest`. A spread sets the attribute wholesale, so
	   `<Card class="block">` used to render `class="block"` — the base class
	   gone, and with it the surface, border and radius. Every consumer that
	   styled a component from outside was silently unstyling it. */

	let {
		/** Square image above the title. Omit for entities that have no art. */
		portrait = null,
		portraitAlt = '',
		title,
		/** Small mono caption beside the title — an id, a class, a category. */
		chip = null,
		facts = [],
		/** Footer link, e.g. through to the fuller page for this thing. */
		link = null,
		/** Any CSS colour; tints the top rule and the chip. */
		accent = null,
		/** Row of tags under the title, rendered by the caller. */
		tags = null,
		children,
		class: klass = '',
		...rest
	} = $props();
</script>

<div class="card {klass}" style={accent ? `--fc-accent: ${accent}` : undefined} {...rest}>
	{#if portrait}
		<img class="portrait" src={portrait} alt={portraitAlt} />
	{/if}

	<div class="title">
		<b>{title}</b>
		{#if chip}<span class="chip">{chip}</span>{/if}
	</div>

	{#if tags}
		<div class="tags">{@render tags()}</div>
	{/if}

	{#if facts.length}
		<dl class="facts">
			{#each facts as f (f.label)}
				<dt>{f.label}</dt>
				<dd class:mono={f.mono} class:changed={f.changed}>{f.value}</dd>
			{/each}
		</dl>
	{/if}

	{@render children?.()}

	{#if link}
		<a class="more" href={link.href}>{link.label}</a>
	{/if}
</div>

<style>
	.card {
		background: var(--surface);
		border: var(--border-width) solid var(--border);
		/* the accent reads as a band along the top edge rather than a full
		   border, so several stacked cards do not turn into a colour chart */
		border-top: 2px solid var(--fc-accent, var(--border-strong));
		border-radius: var(--radius-3);
		box-shadow: var(--shadow-1);
		overflow: hidden;
	}

	.portrait {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		object-fit: contain;
		background: var(--surface-sunken);
	}

	.title {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4) var(--space-1);
	}

	.title b {
		font-size: var(--text-base);
		font-weight: 650;
		letter-spacing: -0.01em;
	}

	.chip {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--fc-accent, var(--text-faint));
		letter-spacing: 0.06em;
		text-align: right;
		overflow-wrap: anywhere;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-4) 0;
	}

	.facts {
		margin: var(--space-2) 0 0;
		padding: 0 var(--space-4);
	}

	/* floated dt + block dd: the value stays right-aligned and the row rule runs
	   the full width even when a long label wraps onto a second line */
	.facts dt {
		float: left;
		clear: left;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-faint);
		line-height: 2.1;
	}

	.facts dd {
		margin: 0;
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-size: var(--text-sm);
		font-weight: 550;
		line-height: 2.1;
		border-bottom: var(--border-width) solid var(--border);
	}

	.facts dd:last-of-type {
		border-bottom: none;
	}

	.facts dd.mono {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-dim);
	}

	/* a value the current view changed — an upgrade level, a filter */
	.facts dd.changed {
		color: var(--accent);
	}

	.more {
		display: block;
		text-align: center;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.07em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--text-dim);
		border-top: var(--border-width) solid var(--border);
		padding: var(--space-3) var(--space-4);
		margin-top: var(--space-3);
	}

	.more:hover {
		color: var(--text);
		background: var(--surface-raised);
	}

	/* nothing follows the facts list, so give the card a base */
	.facts:last-child {
		padding-bottom: var(--space-3);
	}
</style>
