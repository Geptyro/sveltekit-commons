export type Placement = 'top' | 'bottom' | 'left' | 'right';

export interface PlaceOptions {
	/** the trigger's viewport rect — a DOMRect satisfies this */
	anchor: { top: number; right: number; bottom: number; left: number; width: number; height: number };
	card: { width: number; height: number };
	viewport: { width: number; height: number };
	/** preferred side; falls back to the first side the card fits on */
	placement?: Placement;
	/** cross-axis alignment against the anchor */
	align?: 'center' | 'start' | 'end';
	/** space between anchor and card */
	gap?: number;
	/** minimum space between card and viewport edge */
	pad?: number;
}

export interface Placed {
	x: number;
	y: number;
	side: Placement;
	/** offset along the card edge that points back at the anchor's centre */
	arrow: number;
}

export declare function placeFloating(options: PlaceOptions): Placed;
