<script lang="ts">
	// Adapted from GradeCompass (MIT, see LICENSE-gradecompass.txt).
	import { Toaster } from '#lib/components/ui/sonner/index.ts';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';

	let { children } = $props();
</script>

<ModeWatcher />

<Toaster />

{@render children()}
