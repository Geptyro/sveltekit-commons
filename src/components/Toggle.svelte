<script>
	/** Labelled switch. Bind `checked`; label via prop or children. */
	let { checked = $bindable(false), label, children, ...rest } = $props();
</script>

<label class="toggle">
	<input type="checkbox" class="switch" bind:checked {...rest} />
	<span>{#if children}{@render children()}{:else}{label}{/if}</span>
</label>

<style>
	.toggle {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-1) 0;
		font-size: var(--text-sm);
		cursor: pointer;
	}

	/* A real checkbox underneath: the label, keyboard behaviour and the
	   :checked state all come for free, and only the appearance is replaced. */
	.switch {
		appearance: none;
		position: relative;
		width: 34px;
		height: 20px;
		flex-shrink: 0;
		margin: 0;
		border: none;
		border-radius: 99px;
		background: var(--border-strong);
		cursor: pointer;
		transition: background 140ms ease;
	}

	.switch::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--surface);
		box-shadow: var(--shadow-1);
		transition: transform 140ms ease;
	}

	.switch:checked {
		background: var(--accent);
	}

	.switch:checked::after {
		transform: translateX(14px);
	}
</style>
