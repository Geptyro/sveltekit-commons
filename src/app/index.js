/**
 * The SvelteKit-only half of the package.
 *
 * These import `$app/*`, so they are on their own entry rather than in the
 * root: the Electron companion consumes the root and must never resolve a
 * SvelteKit virtual module.
 *
 * AppShell, NavItem and NavSection moved to the root entry — the shell needed
 * SvelteKit for a single afterNavigate call, which is now the `closeOn` prop,
 * and the two nav components never needed it at all. They are re-exported here
 * so `sveltekit-commons/app` keeps resolving every name it used to: AppShell
 * from this entry is the wrapper that still wires afterNavigate for you.
 */
export { default as AppShell } from './AppShell.svelte';
export { default as FeedbackForm } from './FeedbackForm.svelte';
export { default as NavProgress } from './NavProgress.svelte';
export { default as Pager } from './Pager.svelte';
export { NavItem, NavSection } from '../index.js';
