<script lang="ts">
	// The Waypoint mark: a "W" drawn as a chart line with points at its corners.
	// Same artwork as static/favicon.svg.
	let { class: className = 'size-6', title }: { class?: string; title?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 64 64"
	class={className}
	role={title ? 'img' : undefined}
	aria-hidden={title ? undefined : 'true'}
	aria-label={title}
>
	<rect width="64" height="64" rx="14" fill="#0F172A" />
	<polyline
		points="10,16 21,48 32,28 43,48 54,16"
		fill="none"
		stroke="#F0724E"
		stroke-width="5.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<circle cx="10" cy="16" r="4.5" fill="#F0724E" />
	<circle cx="32" cy="28" r="4.5" fill="#F0724E" />
	<circle cx="54" cy="16" r="4.5" fill="#F0724E" />
</svg>
