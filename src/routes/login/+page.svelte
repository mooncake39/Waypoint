<script lang="ts">
	import { page } from '$app/state';

	let { form } = $props();
	let submitting = $state(false);
</script>

<h1>Log in</h1>

{#if page.url.searchParams.has('expired') && !form}
	<p style="color: red">Session expired</p>
{/if}

<form method="POST" onsubmit={() => (submitting = true)}>
	<p>
		<label>District portal URL<br />
			<input name="district" placeholder="https://xx-district-psv.edupoint.com" value={form?.district ?? ''} required />
		</label>
	</p>
	<p>
		<label>Username<br />
			<input name="username" autocomplete="username" value={form?.username ?? ''} required />
		</label>
	</p>
	<p>
		<label>Password<br />
			<input name="password" type="password" autocomplete="current-password" required />
		</label>
	</p>
	<button disabled={submitting}>{submitting ? 'Logging in…' : 'Log in'}</button>
</form>

{#if form?.error}
	<p style="color: red">{form.error}</p>
{/if}
