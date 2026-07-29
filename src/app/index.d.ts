import type { Component, Snippet } from 'svelte';
import type { HTMLAnchorAttributes } from 'svelte/elements';

/**
 * The SvelteKit-only half of the package: these reach for `$app/*`, so they
 * live behind `sveltekit-commons/app` rather than the root entry, which stays
 * usable from any Svelte app (the Electron companion consumes it).
 */

export type AppShellProps = {
	/** localStorage key for the remembered collapse, e.g. `sz:nav-open`. */
	navKey?: string;
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

/** Thin accent bar across the top of AppShell's bar while a page loads. */
export declare const NavProgress: Component<Record<string, never>>;
