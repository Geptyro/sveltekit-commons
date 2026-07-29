import type { Component, Snippet } from 'svelte';
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

/**
 * Props are spelled out rather than `Record<string, unknown>` (what uar-shared
 * declared) so that a misspelt prop is a svelte-check error in the consuming
 * site instead of an attribute silently landing on the DOM node.
 */

type WithChildren<T> = T & { children?: Snippet };

export interface Crumb {
	label: string;
	/** Omitted on the last entry, which renders as text. */
	href?: string;
}

export type BreadcrumbsProps = {
	/** Root-first; the last entry is the current page. */
	trail?: Crumb[];
	/** aria-label for the nav landmark. */
	label?: string;
	[key: string]: unknown;
};
export declare const Breadcrumbs: Component<BreadcrumbsProps>;

export type ButtonProps = WithChildren<
	Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'children'> & {
		variant?: 'solid' | 'ghost' | 'danger';
		/** Renders an <a> instead of a <button>. */
		href?: string;
	}
>;
export declare const Button: Component<ButtonProps>;

export type CardProps = WithChildren<
	Omit<HTMLAnchorAttributes, 'children'> & {
		/** Renders a link card, with the lift-on-hover. */
		href?: string;
		/** Inner padding; false for contents that manage their own. */
		pad?: boolean;
	}
>;
export declare const Card: Component<CardProps>;

export type ChipProps = WithChildren<
	Omit<HTMLButtonAttributes, 'children'> & {
		pressed?: boolean;
	}
>;
export declare const Chip: Component<ChipProps>;

export type TagProps = WithChildren<{
	kind?: 'accent' | 'danger' | 'warn' | 'ok';
	/** Any CSS colour, for a label the contract has no name for. Beats `kind`. */
	tint?: string;
	[key: string]: unknown;
}>;
export declare const Tag: Component<TagProps>;

export type ToggleProps = WithChildren<{
	checked?: boolean;
	label?: string;
	[key: string]: unknown;
}>;
export declare const Toggle: Component<ToggleProps>;

export type SectionHeadingProps = WithChildren<{ [key: string]: unknown }>;
export declare const SectionHeading: Component<SectionHeadingProps>;

export type HoverPopProps = {
	heading?: string;
	/** The always-visible anchor. */
	trigger?: Snippet;
	/** The card's contents. Interactive — this is a menu, not a tooltip. */
	children?: Snippet;
	/** Render the trigger alone, with nothing to drop down. */
	disabled?: boolean;
	align?: 'center' | 'start' | 'end';
};
export declare const HoverPop: Component<HoverPopProps>;
