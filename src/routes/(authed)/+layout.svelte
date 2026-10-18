<script lang="ts">
	import { goto } from '$app/navigation';
	import { brand } from '#lib/brand.ts';
	import BoundaryFailure from '#lib/components/BoundaryFailure.svelte';
	import * as Sidebar from '#lib/components/ui/sidebar/index.ts';
	import { Spinner } from '#lib/components/ui/spinner/index.ts';
	import { loadCredentials } from '#lib/credentials.ts';
	import NotebookTextIcon from '@lucide/svelte/icons/notebook-text';
	import AppSidebar from './AppSidebar.svelte';

	let { children } = $props();

	// Without a saved password there is no way to (re)start a server session.
	if (!loadCredentials()?.password) void goto('/login', { replaceState: true });
</script>

<svelte:boundary>
	<Sidebar.Provider>
		<AppSidebar />

		<Sidebar.Inset class="min-w-0">
			<header class="bg-background sticky top-0 z-20 flex shrink-0 items-center p-2 md:hidden">
				<Sidebar.Trigger />
				<a
					href="/grades"
					class="mr-auto ml-1 flex items-center gap-2 text-xl font-semibold tracking-tight whitespace-nowrap"
				>
					<NotebookTextIcon class="size-6" />
					<span>{brand}</span>
				</a>
			</header>

			<div class="flex flex-1 flex-col">
				<svelte:boundary>
					{@render children()}

					{#snippet pending()}
						<div class="flex min-h-screen w-full items-center justify-center">
							<Spinner class="size-8" />
						</div>
					{/snippet}

					{#snippet failed(error, reset)}
						<BoundaryFailure {error} {reset} />
					{/snippet}
				</svelte:boundary>
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>

	{#snippet failed(error, reset)}
		<BoundaryFailure {error} {reset} />
	{/snippet}
</svelte:boundary>
