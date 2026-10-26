<script lang="ts">
	// Adapted from GradeCompass (MIT, see LICENSE-gradecompass.txt).
	import { fullDateFormatter, getRelativeTime, shortDateFormatter } from '#lib/format.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';

	interface Props {
		date: Date;
	}
	let { date }: Props = $props();
</script>

<Badge
	id="date-{date.getTime()}"
	variant="secondary"
	title="{fullDateFormatter.format(date)} ({getRelativeTime(date)})"
>
	{shortDateFormatter.format(date)}
</Badge>
