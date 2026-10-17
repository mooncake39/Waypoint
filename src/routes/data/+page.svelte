<script lang="ts">
	let { data } = $props();
	const gb = $derived(data.gradebook);
	const json = (v: unknown) => JSON.stringify(v, null, 2);

	type ClassGrade = { calculatedMark?: string; totalWeightedPercentage?: number };
	const gradeOf = (classData: unknown) =>
		(classData as { classGrades?: ClassGrade[] } | null)?.classGrades?.[0];

	// Classes with a known period first, in period order; unmatched ones keep portal order.
	const sorted = $derived(
		gb.classes.toSorted((a, b) => {
			const pa = parseInt(a.schedule?.period ?? '');
			const pb = parseInt(b.schedule?.period ?? '');
			return (isNaN(pa) ? Infinity : pa) - (isNaN(pb) ? Infinity : pb);
		})
	);
</script>

<p><a href="/grades">← Grades</a> · Raw portal data (debug view)</p>

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

<table border="1" cellpadding="4" style="border-collapse: collapse">
	<thead>
		<tr><th>Period</th><th>Class</th><th>Teacher</th><th>Room</th><th>Email</th><th>Other staff</th><th>Grade</th></tr>
	</thead>
	<tbody>
		{#each sorted as c (c.info.ID)}
			{@const g = gradeOf(c.classData)}
			<tr>
				<td>{c.schedule?.period ?? '—'}</td>
				<td><a href="#class-{c.info.ID}">{c.info.Name.trim()}</a></td>
				<td>{c.info.TeacherName}</td>
				<td>{c.schedule?.room || '—'}</td>
				<td>
					{#if c.schedule?.teacherEmail}
						<a href="mailto:{c.schedule.teacherEmail}">{c.schedule.teacherEmail}</a>
					{:else}—{/if}
				</td>
				<td>
					{#each c.schedule?.additionalStaff ?? [] as s, i (i)}
						{s.name}{s.email ? ` <${s.email}>` : ''}<br />
					{:else}—{/each}
				</td>
				<td>{g ? `${g.calculatedMark ?? ''} ${g.totalWeightedPercentage ?? ''}%` : '—'}</td>
			</tr>
		{/each}
	</tbody>
</table>

<details>
	<summary>Schedule (DXDataGridRequest, {gb.schedule.length} rows)</summary>
	<pre>{json(gb.schedule)}</pre>
</details>

<details>
	<summary>Grading periods</summary>
	<pre>{json(gb.periods)}</pre>
</details>

{#each sorted as c (c.info.ID)}
	<h2 id="class-{c.info.ID}">{c.info.Name.trim()} — {c.info.TeacherName}</h2>
	<p>
		{#if c.schedule}
			Period {c.schedule.period || '?'} · Room {c.schedule.room || '?'}
			{#if c.schedule.teacherEmail}· {c.schedule.teacherEmail}{/if}
		{:else}
			No matching schedule row
		{/if}
	</p>
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
