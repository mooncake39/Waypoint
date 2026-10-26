<script lang="ts">
	import { goto } from '$app/navigation';
	import { loadCredentials } from '#lib/credentials.ts';
	import { isDemo } from '#lib/demo.ts';
	import { onMount } from 'svelte';

	onMount(() =>
		goto(isDemo() || loadCredentials()?.password ? '/grades' : '/login', { replaceState: true })
	);
</script>
