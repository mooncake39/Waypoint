<script lang="ts">
	import { Toaster } from '#lib/components/ui/sonner/index.ts';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';

	let { children } = $props();
</script>

<ModeWatcher />

<Toaster />

{@render children()}
