import type { Component, Snippet } from 'svelte';
import type { FeedbackLimits } from '../../dist/feedback.js';

/**
 * The SvelteKit-only half of the package: these reach for `$app/*`, so they
 * live behind `sveltekit-commons/app` rather than the root entry, which stays
 * usable from any Svelte app (the Electron companion consumes it).
 */

/**
 * The shell and the two nav components moved to the root entry (see the note
 * in ./index.js) and are re-exported from there. The AppShell named here is
 * the SvelteKit wrapper: same props, with afterNavigate already wired.
 */
export type { AppShellProps, NavItemProps, NavSectionProps } from '../index.d.ts';
export { AppShell, NavItem, NavSection } from '../index.d.ts';

export type FeedbackFormProps = {
	/** The action's `ActionData`: `{ success }`, or `{ error, values }`. */
	form?: {
		success?: boolean;
		error?: string;
		values?: { message?: string; name?: string; contact?: string };
	} | null;
	limits?: FeedbackLimits;
	/** Passed through to the `<form>`; default posts to the current route. */
	action?: string;
	messagePlaceholder?: string;
	namePlaceholder?: string;
	contactPlaceholder?: string;
	sendLabel?: string;
	successTitle?: string;
	/** Where "send another" points. Defaults to the current path. */
	againHref?: string;
	/** Replaces the whole success card. */
	success?: Snippet;
};
export declare const FeedbackForm: Component<FeedbackFormProps>;

/** Thin accent bar across the top of AppShell's bar while a page loads. */
export declare const NavProgress: Component<Record<string, never>>;

/** Uses `$app/state` to read the current query, hence this entry. */
export type PagerProps = {
	page: number;
	pages: number;
	total: number;
	/** Plural noun for the count; the singular drops a trailing s. */
	label?: string;
	/** Query parameter carrying the page number. */
	param?: string;
	[key: string]: unknown;
};
export declare const Pager: Component<PagerProps>;
