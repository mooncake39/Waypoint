<script lang="ts">
	import { goto } from '$app/navigation';
	import { loadCredentials } from '#lib/credentials.ts';
	import { onMount } from 'svelte';

	onMount(() => goto(loadCredentials()?.password ? '/grades' : '/login', { replaceState: true }));
</script>
