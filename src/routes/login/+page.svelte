<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { login } from '#lib/api.ts';
	import { loadCredentials, saveCredentials } from '#lib/credentials.ts';
	import { clearGradebookCatalogFromLocalStorage } from '#lib/grades/catalog.ts';
	import { resetGradebookState } from '#lib/grades/catalog.svelte.ts';
	import * as Alert from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { onMount } from 'svelte';

	let { data } = $props();

	let district = $state('');
	let username = $state('');
	let password = $state('');
	let submitting = $state(false);
	let error = $state('');

	onMount(() => {
		const saved = loadCredentials();
		if (saved) {
			district = saved.district;
			username = saved.username;
		}
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		error = '';
		try {
			await login({ district, username, password });

			// A different account must not see the previous account's cached grades.
			const previous = loadCredentials();
			if (previous && (previous.district !== district || previous.username !== username))
				clearGradebookCatalogFromLocalStorage();
			resetGradebookState();

			saveCredentials({ district, username, password });
			await goto('/grades');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Login failed';
		} finally {
			submitting = false;
		}
	}
</script>

<main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-4">
	<h1 class="text-2xl font-semibold tracking-tight">Log in</h1>

	{#if page.url.searchParams.has('expired') && !error}
		<Alert.Root variant="destructive"><Alert.Title>Session expired</Alert.Title></Alert.Root>
	{/if}

	<form onsubmit={submit} class="flex flex-col gap-4">
		<div class="grid gap-2">
			<Label for="district">District</Label>
			<Input id="district" name="district" placeholder={data.defaultDistrict} bind:value={district} />
			<p class="text-muted-foreground text-xs">
				The part before .edupoint.com, or the full portal URL. Blank uses {data.defaultDistrict}.
			</p>
		</div>
		<div class="grid gap-2">
			<Label for="username">Username</Label>
			<Input id="username" name="username" autocomplete="username" bind:value={username} required />
		</div>
		<div class="grid gap-2">
			<Label for="password">Password</Label>
			<Input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				bind:value={password}
				required
			/>
		</div>
		<Button type="submit" disabled={submitting}>{submitting ? 'Logging in…' : 'Log in'}</Button>
	</form>

	{#if error}
		<Alert.Root variant="destructive"><Alert.Title>{error}</Alert.Title></Alert.Root>
	{/if}

	<p class="text-muted-foreground text-xs">
		Your login is saved in this browser so the app can reconnect when the server session expires. Log
		out to remove it.
	</p>
</main>
