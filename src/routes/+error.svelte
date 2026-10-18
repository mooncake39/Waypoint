<script lang="ts">
	// From GradeCompass (MIT, see LICENSE-gradecompass.txt).
	import { page } from '$app/state';
	import { brand } from '#lib/brand.ts';
	import * as Alert from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
</script>

<svelte:head>
	<title>{page.status} {page.error?.message} - {brand}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
	<Alert.Root variant="destructive" class="w-fit max-w-full min-w-sm gap-y-2">
		<Alert.Title>{page.status} {page.error?.message}</Alert.Title>

		<Alert.Description>
			<Button href="/" variant="outline">Go home</Button>
		</Alert.Description>
	</Alert.Root>
</div>
