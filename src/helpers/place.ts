/**
 * Viewport-aware placement for floating cards (tooltips, hover pops).
 *
 * Pure geometry — no DOM, no side effects — so it is testable and every
 * floating thing can share one set of rules: pick the first side the card
 * actually fits on, then clamp it into the viewport so it can never hang off an
 * edge (the failure mode on a phone, where a right-anchored pop runs past the
 * left edge).
 */

export type Placement = 'top' | 'bottom' | 'left' | 'right';

export interface PlaceOptions {
	/** The trigger's viewport rect — a DOMRect satisfies this. */
	anchor: {
		top: number;
		right: number;
		bottom: number;
		left: number;
		width: number;
		height: number;
	};
	/** The floating card's size. */
	card: { width: number; height: number };
	viewport: { width: number; height: number };
	/** Preferred side; falls back to the first side the card fits on. */
	placement?: Placement;
	/** Cross-axis alignment against the anchor. */
	align?: 'center' | 'start' | 'end';
	/** Space between anchor and card. */
	gap?: number;
	/** Minimum space between card and viewport edge. */
	pad?: number;
}

export interface Placed {
	x: number;
	y: number;
	side: Placement;
	/**
	 * Offset along the card's edge that points back at the anchor's centre.
	 * It survives the clamp, which the card itself does not.
	 */
	arrow: number;
}

const OPPOSITE: Record<Placement, Placement> = {
	top: 'bottom',
	bottom: 'top',
	left: 'right',
	right: 'left'
};

/** Order to try after the caller's preference and its opposite. */
const FALLBACKS: Placement[] = ['top', 'bottom', 'right', 'left'];

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

export function placeFloating({
	anchor,
	card,
	viewport,
	placement = 'top',
	align = 'center',
	gap = 8,
	pad = 8
}: PlaceOptions): Placed {
	const fits: Record<Placement, boolean> = {
		top: anchor.top - card.height - gap >= pad,
		bottom: anchor.bottom + card.height + gap <= viewport.height - pad,
		left: anchor.left - card.width - gap >= pad,
		right: anchor.right + card.width + gap <= viewport.width - pad
	};
	const side = [placement, OPPOSITE[placement], ...FALLBACKS].find((p) => fits[p]) ?? placement;
	const vertical = side === 'top' || side === 'bottom';

	let x: number;
	let y: number;
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
 */
function alignedStart(
	start: number,
	extent: number,
	size: number,
	align: 'center' | 'start' | 'end'
): number {
	if (align === 'start') return start;
	if (align === 'end') return start + extent - size;
	return start + extent / 2 - size / 2;
}
