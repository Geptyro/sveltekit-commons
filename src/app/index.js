/**
 * The SvelteKit-only half of the package.
 *
 * These import `$app/*`, so they are on their own entry rather than in the
 * root: the Electron companion consumes the root and must never resolve a
 * SvelteKit virtual module.
 */
export { default as AppShell } from './AppShell.svelte';
export { default as NavItem } from './NavItem.svelte';
export { default as NavProgress } from './NavProgress.svelte';
export { default as NavSection } from './NavSection.svelte';
