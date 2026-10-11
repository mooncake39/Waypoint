<script lang="ts">
	let { data } = $props();
	const gb = $derived(data.gradebook);
	const json = (v: unknown) => JSON.stringify(v, null, 2);
</script>

<form method="POST" action="/logout"><button>Log out</button></form>

<form method="GET">
	<label>Grading period
		<select name="period" value={String(gb.periodIndex)} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
			{#each gb.periods as p, i (p.GU)}
				<option value={String(i)}>{p.Name}{p.defaultFocus ? ' (current)' : ''}</option>
			{/each}
		</select>
	</label>
</form>

<p>Fetched {new Date(gb.fetchedAt).toLocaleTimeString()} · {gb.classes.length} classes</p>

<details>
	<summary>Grading periods</summary>
	<pre>{json(gb.periods)}</pre>
</details>

{#each gb.classes as c (c.info.ID)}
	<h2>{c.info.Name.trim()} — {c.info.TeacherName}</h2>
	<details>
		<summary>Class info (GradebookFocusClassInfo)</summary>
		<pre>{json(c.info)}</pre>
	</details>
	<details>
		<summary>GetClassData</summary>
		<pre>{json(c.classData)}</pre>
	</details>
	<details>
		<summary>LoadWithOptions</summary>
		<pre>{json(c.contentItems)}</pre>
	</details>
{/each}
