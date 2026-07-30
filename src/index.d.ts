import type { Component, Snippet } from 'svelte';
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
import type { PaletteRow, RowGroup } from '../dist/palette.js';
import type { ChangelogRelease } from '../dist/changelog.js';

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

export type AppShellProps = {
	/** localStorage key for the remembered collapse, e.g. `sz:nav-open`. */
	navKey?: string;
	/**
	 * Any change closes an open drawer. SvelteKit apps should use the AppShell
	 * on `sveltekit-commons/app`, which feeds this from afterNavigate; an app
	 * with no router bumps it from its own view state.
	 */
	closeOn?: unknown;
	/** At or above this width the sidebar docks instead of overlaying. */
	wideAt?: number;
	/** Below this the `tools` snippet is asked to render compactly. */
	compactAt?: number;
	/** Accessible name for the sidebar's nav landmark. */
	navLabel?: string;
	/** The mark at the left of the top bar. */
	brand?: Snippet;
	/** The page heading area — the elastic item in the bar. */
	crumb?: Snippet;
	/** Top-right; receives whether the bar is short on room. */
	tools?: Snippet<[boolean]>;
	/** Sidebar body; receives a `close()` to call from a row's onclick. */
	nav?: Snippet<[() => void]>;
	/** Sidebar footer, pinned to the bottom. */
	foot?: Snippet;
	children?: Snippet;
};
export declare const AppShell: Component<AppShellProps>;

export type NavItemProps = Omit<HTMLAnchorAttributes, 'children'> & {
	href: string;
	label: string;
	/**
	 * Defaults to `label` — collapsed to the rail the text is gone from the box
	 * and from the accessibility tree with it, so a row would otherwise be an
	 * unlabelled link. Pass one to say more than the label does.
	 */
	title?: string;
	active?: boolean;
	/** Tighter rows, for a long secondary list. */
	dense?: boolean;
	icon?: Snippet;
	/** Right-aligned badge; hidden in the rail along with the label. */
	trailing?: Snippet;
};
export declare const NavItem: Component<NavItemProps>;

export type NavSectionProps = { children?: Snippet; [key: string]: unknown };
export declare const NavSection: Component<NavSectionProps>;

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

export type ChangeChipProps = {
	/** An entry `type` from the site's changelog schema. */
	type: string;
	/** Defaults to the type itself. */
	label?: string | null;
	/** Any CSS colour; beats the `--change-<type>` lookup. */
	tint?: string | null;
	[key: string]: unknown;
};
export declare const ChangeChip: Component<ChangeChipProps>;

export type WhatsNewProps = {
	/** The latest release; the card renders nothing when this is null. */
	release: ChangelogRelease | null;
	/** Where the footer link goes. */
	href?: string;
	title?: string;
	linkLabel?: string;
	/** Shown when the release holds only `minor` entries. */
	emptyText?: string;
	[key: string]: unknown;
};
export declare const WhatsNew: Component<WhatsNewProps>;

export type ToggleProps = WithChildren<{
	checked?: boolean;
	label?: string;
	[key: string]: unknown;
}>;
export declare const Toggle: Component<ToggleProps>;

export type SectionHeadingProps = WithChildren<{ [key: string]: unknown }>;
export declare const SectionHeading: Component<SectionHeadingProps>;

export interface Fact {
	label: string;
	value: string | number;
	/** Render the value small and mono — ids, source lists, anything not a stat. */
	mono?: boolean;
	/** Tint the value with --accent: a number the current view moved. */
	changed?: boolean;
}

export type FactsCardProps = WithChildren<{
	/** Square image above the title. */
	portrait?: string | null;
	portraitAlt?: string;
	title: string;
	/** Small mono caption beside the title — an id, a class, a category. */
	chip?: string | null;
	facts?: Fact[];
	/** Footer link through to a fuller page for this thing. */
	link?: { href: string; label: string } | null;
	/** Any CSS colour; tints the top rule and the chip. */
	accent?: string | null;
	/** Tag row under the title, rendered by the caller. */
	tags?: Snippet | null;
	[key: string]: unknown;
}>;
export declare const FactsCard: Component<FactsCardProps>;

export type StatTileProps = WithChildren<{
	value: string | number;
	label: string;
	/** Any CSS colour for the value, e.g. a rank or an outcome. */
	tint?: string | null;
	[key: string]: unknown;
}>;
export declare const StatTile: Component<StatTileProps>;

export type SearchChipProps = Omit<HTMLButtonAttributes, 'children' | 'title'> & {
	onopen: () => void;
	/** The magnifier alone — the shape a narrow top bar has room for. */
	compact?: boolean;
	label?: string;
	/** The key named on the chip, beside the platform's modifier. '' hides it. */
	shortcut?: string;
	/** Overrides the tooltip, which otherwise names all three bindings. */
	title?: string;
	/** Replaces the built-in magnifier. */
	icon?: Snippet;
};
export declare const SearchChip: Component<SearchChipProps>;

export type SearchDialogProps = {
	/** Rows to draw, in order. A group with a label gets a seam above it. */
	groups?: RowGroup[];
	/** What the reader has typed. Bindable — this is the site's cue to fetch. */
	query?: string;
	/** The dialog has already closed by the time this runs. */
	onselect?: (row: PaletteRow) => void;
	/** Fired from `open()`, before the dialog shows: reset per-visit state here. */
	onopen?: () => void;
	onclose?: () => void;
	placeholder?: string;
	/** Accessible name for the dialog and its field. */
	label?: string;
	/** Replaces "Nothing matches …". */
	emptyText?: string;
	/** Draw row pictures as pixel art rather than smoothing them. */
	pixelated?: boolean;
	/** Replaces the keyboard hints along the bottom. */
	footer?: Snippet;
};
/** `open()` and `close()` are exported from the instance — `bind:this` to reach them. */
export declare const SearchDialog: Component<
	SearchDialogProps,
	{ open: () => void; close: () => void }
>;

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
