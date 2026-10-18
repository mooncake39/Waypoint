<script lang="ts">
	// From GradeCompass (MIT, see LICENSE-gradecompass.txt); now ticks every second.
	import { getRelativeTime } from '#lib/format.ts';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { onMount } from 'svelte';

	interface Props {
		lastRefresh: number;
		canRefresh: boolean;
		refresh: () => unknown;
	}
	let { lastRefresh, canRefresh, refresh }: Props = $props();

	// Re-render the relative time every second, not only when lastRefresh changes;
	// otherwise it stays at "now" and auto-refreshes are invisible.
	let now = $state(Date.now());
	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});
	const label = $derived.by(() => {
		void now;
		return getRelativeTime(new Date(lastRefresh));
	});
</script>

<Badge variant="secondary" class="text-tertiary-foreground mx-auto my-2 p-1 px-3 text-sm">
	<ClockIcon class="h-4 w-4" />
	Last updated {label}
	<button
		class={canRefresh ? 'cursor-pointer underline' : 'cursor-not-allowed'}
		onclick={refresh}
		disabled={!canRefresh}
	>
		Refresh
	</button>
</Badge>
