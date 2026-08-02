<script>
	/**
	 * The page's heading, for AppShell's `crumb` slot: a section crumb, the
	 * subject's own picture, and the `<h1>`.
	 *
	 * ── It is *the* heading, not a copy of one ───────────────────────────
	 *
	 * The point of putting it in the bar is that there is exactly one heading on
	 * screen and it is always in the same place. A page that renders this **and**
	 * its own `<h1>` has two, which is a worse outcome than either arrangement on
	 * its own: a screen reader announces the subject twice, and the page below
	 * starts with a title the eye has already read. Adopting this means deleting
	 * the page's `<h1>`.
	 *
	 * ── The subject comes off `page.data` ────────────────────────────────
	 *
	 * A detail page already loads the thing it is about, so the bar can show that
	 * thing's name and picture without a second lookup or a store to keep in
	 * sync. The mapping from route to subject stays in the site's root layout —
	 * it is the one part of this that cannot be shared, because only the site
	 * knows what its own loaders return.
	 */
	let {
		/** Where this page sits — "Produits", "Weapons". Rendered as `SECTION /`. */
		section = null,
		/** The subject. Null renders the section alone, with no `<h1>`. */
		title = null,
		/** The subject's own picture, at 26px. */
		icon = null,
		/**
		 * Decorative by default, and it usually is: the `<h1>` beside it already
		 * names the subject, so alt text here is the same words twice.
		 */
		iconAlt = '',
		/** Draw the icon as pixel art rather than smoothing it. */
		pixelated = false,
		class: klass = '',
		...rest
	} = $props();
</script>

<div class="page-title {klass}" {...rest}>
	{#if section}<span class="section">{section} /</span>{/if}
	{#if icon}
		<img class="icon" class:pixelated src={icon} alt={iconAlt} width="26" height="26" />
	{/if}
	{#if title}<h1 class="title">{title}</h1>{/if}
</div>

<style>
	/* Its own row rather than three loose children: AppShell's crumb slot is a
	   flex box, but a component always renders through one element, and that
	   element would otherwise be the only flex item. Same gap, so the result is
	   identical to putting the parts in the slot by hand. */
	.page-title {
		display: flex;
		align-items: center;
		gap: 7px;
		min-width: 0;
	}

	.section {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-dim);
		white-space: nowrap;
	}

	/* The subject's own picture, level with the heading rather than on its
	   baseline. Round — and `contain` rather than `cover` is what makes that
	   safe: the picture is a wide transparent gun or a tall bottle, so the circle
	   is the chip it sits in, not a crop through the artwork.
	   `--page-title-cell` is the plate behind it; a site whose art is drawn as a
	   dark silhouette wants something lighter than its sunken surface. */
	.icon {
		width: 26px;
		height: 26px;
		align-self: center;
		flex: none;
		object-fit: contain;
		padding: 2px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--page-title-cell, var(--surface-raised));
	}

	.icon.pixelated {
		image-rendering: pixelated;
	}

	/* an <h1> in the bar: the page's one heading, sized like a crumb */
	.title {
		margin: 0;
		font-size: 15.5px;
		font-weight: 650;
		letter-spacing: -0.01em;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
