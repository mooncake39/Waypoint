<script lang="ts">
	// Adapted from GradeCompass (MIT, see LICENSE-gradecompass.txt).
	import * as Item from '#lib/components/ui/item/index.ts';
	import { Spinner } from '#lib/components/ui/spinner/index.ts';
	import { fade, fly } from 'svelte/transition';

	let { children = null } = $props();
</script>

<div class="flex justify-center" in:fade out:fly={{ y: '-50%' }}>
	<Item.Root variant="muted" size="sm" class="bg-muted/90 fixed top-6 z-30">
		<Item.Media><Spinner /></Item.Media>

		<Item.Content>
			<Item.Title>
				{#if children}
					{@render children()}
				{:else}
					Loading...
				{/if}
			</Item.Title>
		</Item.Content>
	</Item.Root>
</div>
