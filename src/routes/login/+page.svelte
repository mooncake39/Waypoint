<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { login } from '#lib/api.ts';
	import { loadCredentials, saveCredentials } from '#lib/credentials.ts';
	import { clearGradebookCatalogFromLocalStorage } from '#lib/grades/catalog.ts';
	import { resetGradebookState } from '#lib/grades/catalog.svelte.ts';
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

<h1>Log in</h1>

{#if page.url.searchParams.has('expired') && !error}
	<p style="color: red">Session expired</p>
{/if}

<form onsubmit={submit}>
	<p>
		<label>District (the part before .edupoint.com, or the full portal URL; blank = {data.defaultDistrict})<br />
			<input name="district" placeholder={data.defaultDistrict} bind:value={district} />
		</label>
	</p>
	<p>
		<label>Username<br />
			<input name="username" autocomplete="username" bind:value={username} required />
		</label>
	</p>
	<p>
		<label>Password<br />
			<input name="password" type="password" autocomplete="current-password" bind:value={password} required />
		</label>
	</p>
	<button disabled={submitting}>{submitting ? 'Logging in…' : 'Log in'}</button>
</form>

{#if error}
	<p style="color: red">{error}</p>
{/if}

<p><small>Your login is saved in this browser so the app can reconnect when the server session expires. Log out to remove it.</small></p>
