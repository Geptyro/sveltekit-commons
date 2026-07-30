<script>
	/**
	 * The kind of a changelog entry — feature, fix, whatever the site's schema
	 * calls them — as a pill beside its headline.
	 *
	 * Shaped like Tag but not built on it, for one reason: this chip's tint has
	 * to be derivable from the type alone, so a caller can loop over entries
	 * without carrying a colour map alongside. The default tint is
	 * `var(--change-<type>)`, which a site declares once in its palette:
	 *
	 *     --change-feature: var(--accent);
	 *     --change-fix:     var(--danger);
	 *
	 * The fallback is `--text-dim`, so a type nobody has coloured yet renders as
	 * a neutral chip rather than an invisible one. `tint` overrides for the odd
	 * one-off, mirroring Tag's escape hatch.
	 *
	 * `label` defaults to the type: the vocabulary is already player-facing.
	 */
	let { type, label = null, tint = null, class: klass = '', ...rest } = $props();
</script>

<span
	class="chip {klass}"
	style="--chip-tint: {tint ?? `var(--change-${type}, var(--text-dim))`}"
	{...rest}>{label ?? type}</span
>

<style>
	.chip {
		display: inline-block;
		flex-shrink: 0;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 650;
		letter-spacing: 0.05em;
		line-height: 1.5;
		text-transform: uppercase;
		padding: 0 var(--space-2);
		border-radius: 99px;
		white-space: nowrap;
		color: var(--chip-tint);
		background: color-mix(in srgb, var(--chip-tint) 14%, transparent);
	}
</style>
