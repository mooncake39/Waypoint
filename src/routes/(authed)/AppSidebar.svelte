<script lang="ts">
	// From GradeCompass (MIT, see LICENSE-gradecompass.txt), trimmed to the
	// gradebook: no attendance/documents/mail/student info, feedback, PWA or demo.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { logout } from '#lib/api.ts';
	import { brand } from '#lib/brand.ts';
	import { buttonVariants } from '#lib/components/ui/button/index.ts';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';
	import * as Sidebar from '#lib/components/ui/sidebar/index.ts';
	import { Spinner } from '#lib/components/ui/spinner/index.ts';
	import { clearCredentials, loadCredentials } from '#lib/credentials.ts';
	import { removeCourseType } from '#lib/format.ts';
	import { clearGradebookCatalogFromLocalStorage } from '#lib/grades/catalog.ts';
	import { initializeGradebookCatalog, resetGradebookState } from '#lib/grades/catalog.svelte.ts';
	import { getActiveGradebook } from '#lib/grades/gradebook.ts';
	import CircleUserIcon from '@lucide/svelte/icons/circle-user';
	import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import NotebookTextIcon from '@lucide/svelte/icons/notebook-text';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { mode, toggleMode } from 'mode-watcher';
	import { onMount } from 'svelte';

	const courses = $derived(getActiveGradebook()?.Courses.Course);
	const username = loadCredentials()?.username;

	/** Ends the server session and removes the saved login and cached grades. */
	async function logOut() {
		await logout();
		clearCredentials();
		clearGradebookCatalogFromLocalStorage();
		resetGradebookState();
		await goto('/login');
	}

	onMount(() => {
		initializeGradebookCatalog();
	});
</script>

<Sidebar.Root>
	<Sidebar.Header>
		<Sidebar.MenuItem>
			<div class="m-2 flex flex-row items-center">
				<NotebookTextIcon class="size-6" />
				<span class="ml-2 text-lg font-bold tracking-tight">{brand}</span>
			</div>
		</Sidebar.MenuItem>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton class="h-10 text-base">
					{#snippet child({ props })}
						<a href="/grades" {...props}>
							<NotebookTextIcon /> <span>Grades</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>

				{#if courses}
					<Sidebar.MenuSub>
						{#each courses as course, index (course._CourseID)}
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton
									class="h-8 truncate text-base {page.params.index === index.toString()
										? 'font-bold'
										: ''}"
								>
									{#snippet child({ props })}
										<a href={`/grades/${index.toString()}`} {...props}>
											{removeCourseType(course._CourseName)}
										</a>
									{/snippet}
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
						{/each}
					</Sidebar.MenuSub>
				{:else}
					<Sidebar.MenuSub>
						<div class="flex w-full items-center justify-center p-4">
							<Spinner />
						</div>
					</Sidebar.MenuSub>
				{/if}
			</Sidebar.MenuItem>
		</Sidebar.Menu>

		<Sidebar.MenuItem class="text-muted-foreground mx-2 mt-auto rounded-md border p-3 text-xs">
			Your login is saved in this browser so it can reconnect to your district portal. Grades pass
			through this app's own server and aren't stored there.
		</Sidebar.MenuItem>
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Menu class="gap-2">
			<Sidebar.MenuItem>
				<div class="flex h-10 items-center gap-1 px-2 text-base">
					<CircleUserIcon class="size-4 shrink-0" />
					<span class="truncate">{username ?? 'Student'}</span>

					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="{buttonVariants({ variant: 'ghost', size: 'icon-lg' })} ml-auto"
							aria-label="Account menu"
						>
							<EllipsisVerticalIcon />
						</DropdownMenu.Trigger>

						<DropdownMenu.Content>
							<DropdownMenu.Item onclick={toggleMode} class="h-9">
								<MoonIcon
									class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
								/>
								<SunIcon
									class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
								/>
								{mode.current === 'light' ? 'Dark Mode' : 'Light Mode'}
							</DropdownMenu.Item>

							<DropdownMenu.Item onclick={logOut} class="h-9">
								<LogOutIcon />
								Log Out
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>
