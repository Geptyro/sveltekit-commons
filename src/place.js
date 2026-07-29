/**
 * Viewport-aware placement for floating cards (tooltips, hover pops).
 *
 * Pure geometry — no DOM, no side effects — so it is testable and both the
 * website's Tooltip and the shared HoverPop can share one set of rules:
 * pick the first side the card actually fits on, then clamp it into the
 * viewport so it can never hang off an edge (the failure mode on a phone,
 * where a right-anchored pop runs past the left edge).
 */

/** @typedef {'top'|'bottom'|'left'|'right'} Placement */

/** @type {Record<Placement, Placement>} */
const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/** Order to try after the caller's preference and its opposite. */
const FALLBACKS = /** @type {Placement[]} */ (['top', 'bottom', 'right', 'left']);

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/**
 * @param {object} o
 * @param {{top:number,right:number,bottom:number,left:number,width:number,height:number}} o.anchor
 *   the trigger's viewport rect (a DOMRect works as-is)
 * @param {{width:number,height:number}} o.card  the floating card's size
 * @param {{width:number,height:number}} o.viewport
 * @param {Placement} [o.placement]  preferred side
 * @param {'center'|'start'|'end'} [o.align]  cross-axis alignment on the anchor
 * @param {number} [o.gap]  space between anchor and card
 * @param {number} [o.pad]  minimum space between card and viewport edge
 * @returns {{x:number,y:number,side:Placement,arrow:number}}
 *   `arrow` is the offset along the card's edge that points back at the
 *   anchor's centre — it survives the clamp, which the card itself does not.
 */
export function placeFloating({
	anchor,
	card,
	viewport,
	placement = 'top',
	align = 'center',
	gap = 8,
	pad = 8
}) {
	/** @type {Record<Placement, boolean>} */
	const fits = {
		top: anchor.top - card.height - gap >= pad,
		bottom: anchor.bottom + card.height + gap <= viewport.height - pad,
		left: anchor.left - card.width - gap >= pad,
		right: anchor.right + card.width + gap <= viewport.width - pad
	};
	const side =
		[placement, OPPOSITE[placement], ...FALLBACKS].find((p) => fits[p]) ?? placement;
	const vertical = side === 'top' || side === 'bottom';

	let x;
	let y;
	if (vertical) {
		x = alignedStart(anchor.left, anchor.width, card.width, align);
		y = side === 'top' ? anchor.top - card.height - gap : anchor.bottom + gap;
	} else {
		x = side === 'left' ? anchor.left - card.width - gap : anchor.right + gap;
		y = alignedStart(anchor.top, anchor.height, card.height, align);
	}

	// clamp into the viewport; a card larger than the viewport pins to `pad`
	x = clamp(x, pad, Math.max(pad, viewport.width - card.width - pad));
	y = clamp(y, pad, Math.max(pad, viewport.height - card.height - pad));

	const along = vertical
		? anchor.left + anchor.width / 2 - x
		: anchor.top + anchor.height / 2 - y;
	const span = vertical ? card.width : card.height;
	const arrow = clamp(along, 10, Math.max(10, span - 10));

	return { x, y, side, arrow };
}

/**
 * Cross-axis start coordinate for a card of `size` against an anchor that
 * starts at `start` and is `extent` long.
 * @param {number} start
 * @param {number} extent
 * @param {number} size
 * @param {'center'|'start'|'end'} align
 */
function alignedStart(start, extent, size, align) {
	if (align === 'start') return start;
	if (align === 'end') return start + extent - size;
	return start + extent / 2 - size / 2;
}
