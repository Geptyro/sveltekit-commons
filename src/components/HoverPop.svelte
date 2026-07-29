<script>
	/**
	 * Renders the `trigger` snippet and a card that appears next to it — on
	 * hover/focus with a mouse, on tap with a finger.
	 *
	 * The card is position:fixed and placed by `placeFloating`, so it is
	 * clamped into the viewport instead of running off the edge (a trigger near
	 * the right edge of a phone used to push its pop half off-screen), and it
	 * escapes any clipping ancestor. Contents stay interactive — this is a
	 * menu, not a tooltip — so the pointer may travel from trigger to card
	 * across the gap without it closing.
	 */
	import { placeFloating } from '../place.js';

	/** `disabled`: render the trigger alone (nothing to drop down). */
	let { heading, trigger, children, disabled = false, align = 'end' } = $props();

	let wrap = $state(null);
	let card = $state(null);
	let open = $state(false);
	/** placed only after the first measure, so the card never flashes at 0,0 */
	let placed = $state(false);
	let x = $state(0);
	let y = $state(0);
	let timer;

	function show() {
		clearTimeout(timer);
		if (!disabled) open = true;
	}

	function hide() {
		clearTimeout(timer);
		open = false;
		placed = false;
	}

	/** crossing the gap between trigger and card must not close it */
	function leave() {
		clearTimeout(timer);
		timer = setTimeout(hide, 140);
	}

	$effect(() => {
		if (!open) return;
		const place = () => {
			if (!wrap || !card) return;
			const r = placeFloating({
				anchor: wrap.getBoundingClientRect(),
				card: card.getBoundingClientRect(),
				viewport: {
					width: document.documentElement.clientWidth,
					height: document.documentElement.clientHeight
				},
				placement: 'bottom',
				align
			});
			x = r.x;
			y = r.y;
			placed = true;
		};
		place();
		// a page may scroll inside a container rather than the window, so listen
		// in the capture phase to catch every scrolling ancestor
		window.addEventListener('scroll', place, true);
		window.addEventListener('resize', place);
		return () => {
			window.removeEventListener('scroll', place, true);
			window.removeEventListener('resize', place);
		};
	});

	$effect(() => () => clearTimeout(timer));

	/** touch has no hover: tap the trigger to toggle its pop */
	function tapTrigger(e) {
		if (e.pointerType !== 'touch') return;
		if (open) hide();
		else show();
	}

	/** a tap or click anywhere else dismisses it */
	function tapOutside(e) {
		if (!open) return;
		if (wrap?.contains(e.target) || card?.contains(e.target)) return;
		hide();
	}
</script>

<svelte:window
	onpointerdown={tapOutside}
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) hide();
	}}
/>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="hover-wrap"
	bind:this={wrap}
	onmouseenter={show}
	onmouseleave={leave}
	onfocusin={show}
	onfocusout={leave}
	onpointerdown={tapTrigger}
>
	{@render trigger?.()}
</div>

{#if open && !disabled}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="pop-card"
		class:placed
		bind:this={card}
		style="left: {x}px; top: {y}px"
		onmouseenter={show}
		onmouseleave={leave}
	>
		{#if heading}<div class="pop-head">{heading}</div>{/if}
		{@render children?.()}
	</div>
{/if}

<style>
	.hover-wrap {
		display: flex;
		align-items: center;
	}

	.pop-card {
		position: fixed;
		/* the host's floating layer, above its own chrome — a bare 40 put this
		   under one site's fixed nav rail, which cut a column straight through
		   every top-bar pop. */
		z-index: var(--z-float, 60);
		min-width: 240px;
		/* never wider or taller than the screen it has to fit on */
		max-width: calc(100vw - 16px);
		max-height: calc(100dvh - var(--chrome-h, 0px) - 24px);
		overflow-y: auto;
		background: var(--surface);
		color: var(--text);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-3);
		box-shadow: var(--shadow-2);
		padding: var(--space-2);
		/* hidden until the first measure lands, then faded in */
		opacity: 0;
		transition: opacity 110ms ease;
	}

	.pop-card.placed {
		opacity: 1;
	}

	.pop-head {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-faint);
		padding: var(--space-1) var(--space-2) var(--space-2);
		border-bottom: var(--border-width) solid var(--border);
		margin-bottom: var(--space-1);
	}

	@media (prefers-reduced-motion: reduce) {
		.pop-card {
			transition: none;
		}
	}
</style>
