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
    card: {
        width: number;
        height: number;
    };
    viewport: {
        width: number;
        height: number;
    };
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
export declare function placeFloating({ anchor, card, viewport, placement, align, gap, pad }: PlaceOptions): Placed;
