<script>
	/**
	 * A small, non-interactive label — a category, a state, a count.
	 *
	 * kind: undefined (neutral) | 'accent' | 'danger' | 'warn' | 'ok'
	 *
	 * `tint` takes any CSS colour and overrides the kind, which is how a site
	 * labels things the contract has no name for: `<Tag tint="var(--mos)">`.
	 * That prop is the reason this component could leave uar-shared at all —
	 * the tag kinds there were `mos`, `hostile` and `item`, three facts about
	 * one StarCraft map baked into a shared primitive.
	 */
	let { kind, tint, children, ...rest } = $props();
</script>

<span
	class="tag {kind ? `t-${kind}` : ''}"
	style={tint ? `--tag-tint: ${tint}` : undefined}
	{...rest}>{@render children?.()}</span
>

<style>
	.tag {
		--tag-tint: var(--text-dim);
		display: inline-block;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 550;
		letter-spacing: 0.04em;
		line-height: 1.5;
		padding: 0 var(--space-2);
		border-radius: 99px;
		white-space: nowrap;
		color: var(--tag-tint);
		/* one rule for every kind: the variants below only move the tint */
		background: color-mix(in srgb, var(--tag-tint) 13%, transparent);
	}

	.t-accent {
		--tag-tint: var(--accent);
	}
	.t-danger {
		--tag-tint: var(--danger);
	}
	.t-warn {
		--tag-tint: var(--warn);
	}
	.t-ok {
		--tag-tint: var(--ok);
	}
</style>
