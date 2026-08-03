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

export type PageProps = {
	/**
	 * The page does not scroll; something inside it does — a `.datapage`'s rows,
	 * say. Also drops the bottom gutter, since such a page ends on the window's
	 * edge. Give the child that should take the remaining height `flex: 1`.
	 */
	fill?: boolean;
	children?: Snippet;
	[key: string]: unknown;
};
/**
 * The page's gutters and its scrollbar. AppShell hands down a box of a known
 * height and scrolls nothing itself, so this is what an ordinary page puts in
 * it — and page chrome (a `docked` TabBar) goes *beside* this, not inside it.
 */
export declare const Page: Component<PageProps>;

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

export type PageTitleProps = {
	/** Where this page sits — rendered as `SECTION /`. */
	section?: string | null;
	/** The subject. Null renders the section alone, with no `<h1>`. */
	title?: string | null;
	/** The subject's own picture, at 26px. */
	icon?: string | null;
	/** Decorative by default — the heading beside it already names the subject. */
	iconAlt?: string;
	/** Draw the icon as pixel art rather than smoothing it. */
	pixelated?: boolean;
	[key: string]: unknown;
};
/** For AppShell's `crumb` slot. It renders the page's `<h1>` — delete the one
 *  on the page, or the subject is announced twice. */
export declare const PageTitle: Component<PageTitleProps>;

export interface Tab {
	href: string;
	label: string;
	/** Inert markup you own, rendered with `{@html}`; below 900px it is all a
	 *  tab shows. */
	icon?: string;
	/** What `active` is matched against; falls back to `href`. */
	key?: string;
}

export type TabBarProps = {
	/** In tab order. Fewer than two renders nothing, unless `showAlone`. */
	tabs?: Tab[];
	/** `key` (or `href`) of the tab being shown. */
	active?: string;
	/** Accessible name — say what the tabs are sections *of*. */
	label?: string;
	/** Draw the bar even with a single tab. Never draws an empty one. */
	showAlone?: boolean;
	/**
	 * Rendered in AppShell's `subchrome` slot rather than inside the content
	 * column: drops the sticky and the negative margins, and the scroller then
	 * starts below the bar instead of running up alongside it. Preferred.
	 */
	docked?: boolean;
	/** Measured height, for a tab sizing itself against the rest of the window. */
	height?: number;
	/**
	 * Claim previous/next and the number row. Off by default: these are typing
	 * keys, so only turn them on somewhere nobody types.
	 */
	shortcuts?: boolean;
	/**
	 * Physical code for the previous tab, bound by position — the default
	 * `KeyQ` is the key marked "A" on AZERTY and "Q" on QWERTY.
	 */
	prevKey?: string;
	/** Physical code for the next tab; `KeyE` is "E" on both layouts. */
	nextKey?: string;
	/**
	 * Name TabSwipe's mouse gestures beside the key hint — pass whichever the
	 * page actually turned on, since a hint for a gesture that does nothing is
	 * worse than none. Hidden below 900px, along with the rest of the hint.
	 */
	gestures?: 'wheel' | 'middle' | 'both' | null;
	/** Where `shortcuts` sends the reader — `goto`, typically. */
	onnavigate?: ((href: string) => void) | null;
	[key: string]: unknown;
};
/** Sub-bar of tabs. With `docked`, goes in AppShell's `subchrome` slot; without
 *  it, sticky and must be the first thing in AppShell's content column, since
 *  its margins bleed out through that column's padding. */
export declare const TabBar: Component<TabBarProps>;

export type TabSwipeProps = {
	/** The same array TabBar gets. */
	tabs?: Tab[];
	/** `key` (or `href`) of the tab being shown. */
	active?: string;
	/** Where a completed swipe goes. Without it the gesture never arms. */
	onnavigate?: ((href: string) => void) | null;
	/**
	 * SvelteKit's `preloadData`, called as soon as the gesture arms so letting
	 * go lands on a page rather than a spinner. A prop, not an import, so this
	 * entry stays router-free.
	 */
	preload?: ((href: string) => unknown) | null;
	/**
	 * At or above this width the *finger's* swipe is off. Match AppShell's
	 * `wideAt`. The mouse gestures ignore it — they are for those widths.
	 */
	upTo?: number;
	/** Fraction of the window a pull must cross to commit. */
	commitAt?: number;
	/**
	 * Horizontal scroll changes tab once whatever is under the cursor has no
	 * sideways travel left — a trackpad's two fingers, a wheel that tilts, or
	 * `Shift` and any wheel at all. On by default.
	 */
	wheel?: boolean;
	/**
	 * Hold the middle button and move sideways. **Off by default:** it costs the
	 * browser's autoscroll for the whole site. A plain middle click still opens
	 * a link in a new tab — only a drag is swallowed.
	 */
	middle?: boolean;
};
/**
 * Swipe the page sideways between a subject's tabs — TabBar's companion, for
 * narrow screens. Renders nothing but a peek at the destination. Yields to
 * anything with a better claim on a sideways drag: a horizontal scroller with
 * travel left, `touch-action: none`, a `<nav>` or `<dialog>`, `[data-noswipe]`,
 * and everything outside AppShell's `<main>`.
 */
export declare const TabSwipe: Component<TabSwipeProps>;

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
