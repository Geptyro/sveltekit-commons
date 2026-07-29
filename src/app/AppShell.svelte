<script>
	/**
	 * AppShell for SvelteKit callers: the router-free shell from the root entry,
	 * plus the one thing it cannot do for itself — closing the drawer after a
	 * navigation started by a link inside the page.
	 *
	 * Every prop and snippet goes straight through, so `sveltekit-commons/app`
	 * keeps behaving exactly as it did when the shell lived here.
	 */
	import { afterNavigate } from '$app/navigation';
	import BaseAppShell from '../components/AppShell.svelte';

	let props = $props();

	/* the shell watches the value, not what it means: any change closes */
	let navSeq = $state(0);
	afterNavigate(() => navSeq++);
</script>

<BaseAppShell {...props} closeOn={navSeq} />
