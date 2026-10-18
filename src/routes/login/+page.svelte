<script lang="ts">
	// Layout from GradeCompass's login page (MIT, see LICENSE-gradecompass.txt);
	// logs in through this app's server and saves the login in this browser.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { login } from '#lib/api.ts';
	import { brand } from '#lib/brand.ts';
	import LoadingBanner from '#lib/components/LoadingBanner.svelte';
	import * as Alert from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { loadCredentials, saveCredentials } from '#lib/credentials.ts';
	import { clearGradebookCatalogFromLocalStorage } from '#lib/grades/catalog.ts';
	import { resetGradebookState } from '#lib/grades/catalog.svelte.ts';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import LogInIcon from '@lucide/svelte/icons/log-in';
	import NotebookTextIcon from '@lucide/svelte/icons/notebook-text';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	let { data } = $props();

	let district = $state('');
	let username = $state('');
	let password = $state('');

	let loginError: string | undefined = $state();
	let loggingIn = $state(false);

	const sessionExpired = $derived(page.url.searchParams.has('expired') && !loginError);

	onMount(() => {
		const saved = loadCredentials();
		if (saved?.password) {
			void goto('/grades', { replaceState: true });
			return;
		}
		if (saved) {
			district = saved.district;
			username = saved.username;
		}
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (loggingIn) return;
		loggingIn = true;
		loginError = undefined;

		try {
			await login({ district, username, password });

			// A different account must not see the previous account's cached grades.
			const previous = loadCredentials();
			if (previous && (previous.district !== district || previous.username !== username))
				clearGradebookCatalogFromLocalStorage();
			resetGradebookState();

			saveCredentials({ district, username, password });
			await goto('/grades');
		} catch (error) {
			loginError = error instanceof Error ? error.message : String(error);
		} finally {
			loggingIn = false;
		}
	}
</script>

<svelte:head>
	<title>Log In - {brand}</title>
</svelte:head>

{#if loggingIn}
	<LoadingBanner>Logging you in...</LoadingBanner>
{/if}

{#if loginError || sessionExpired}
	<div in:fly={{ y: -50, duration: 200 }} class="fixed top-0 left-0 z-30 flex w-full justify-center p-4">
		<Alert.Root variant="destructive" class="w-fit">
			<AlertCircleIcon />
			<Alert.Title>{loginError ? "Couldn't log in" : 'Session expired'}</Alert.Title>
			<Alert.Description>{loginError ?? 'Log in again to keep viewing your grades.'}</Alert.Description>
		</Alert.Root>
	</div>
{/if}

<div class="flex min-h-screen flex-col">
	<main class="flex grow items-center justify-center">
		<form onsubmit={submit} class="m-4 flex w-full max-w-md flex-col gap-4">
			<div class="mb-4 flex flex-col items-center gap-2">
				<NotebookTextIcon class="h-8 w-8" />
				<h1 class="text-xl font-bold">Log in to {brand}</h1>
			</div>

			<Field.Group>
				<Field.Field>
					<Field.Label for="district">District</Field.Label>
					<Input
						type="text"
						id="district"
						placeholder={data.defaultDistrict}
						autocomplete="on"
						autocorrect="off"
						bind:value={district}
					/>
					<Field.Description>
						The part before <code>.edupoint.com</code> in your portal's address, or paste the whole
						portal link. Leave blank for {data.defaultDistrict}.
					</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="username">Username</Field.Label>
					<Input id="username" type="text" bind:value={username} autocomplete="username" required />
				</Field.Field>

				<Field.Field>
					<Field.Label for="password">Password</Field.Label>
					<Input
						type="password"
						id="password"
						bind:value={password}
						autocomplete="current-password"
						required
					/>
					<Field.Description>
						Sent to this app's own server to log in to your district portal, and saved in this browser
						so the app can reconnect when its session expires. Log out to remove it.
					</Field.Description>
				</Field.Field>

				<Field.Field orientation="horizontal" class="items-center">
					<Checkbox name="disclaimer" id="disclaimer" required />

					<Field.Label for="disclaimer" class="text-tertiary-foreground text-xs">
						I understand that {brand} is an independent, unofficial tool and is not affiliated with or
						endorsed by Edupoint Educational Systems LLC. Use of my district's portal is subject to
						Edupoint Educational Systems LLC's terms of service, and I am responsible for ensuring my
						use complies with those terms.
					</Field.Label>
				</Field.Field>

				<Field.Field>
					<Button type="submit" class="w-full" variant="card" disabled={loggingIn}>
						<LogInIcon class="h-4 w-4" /> Log in
					</Button>
				</Field.Field>
			</Field.Group>
		</form>
	</main>
</div>
