<script lang="ts">
	// Plain view over the data layer, until the GradeCompass UI is brought over.
	import { goto } from '$app/navigation';
	import { logout } from '#lib/api.ts';
	import { clearCredentials } from '#lib/credentials.ts';
	import { clearGradebookCatalogFromLocalStorage } from '#lib/grades/catalog.ts';
	import {
		getReportPeriodName,
		gradebookState,
		initializeGradebookCatalog,
		resetGradebookState,
		switchReportPeriod
	} from '#lib/grades/catalog.svelte.ts';
	import { checkCourseGrade } from '#lib/grades/check.ts';
	import { getCourseGrade } from '#lib/grades/course.ts';
	import { getActiveGradebook } from '#lib/grades/gradebook.ts';
	import { onMount } from 'svelte';

	const catalog = $derived(gradebookState.gradebookCatalog);
	const activeIndex = $derived(catalog ? (catalog.overrideIndex ?? catalog.defaultIndex) : undefined);
	const gradebook = $derived(getActiveGradebook());
	const record = $derived(activeIndex !== undefined ? catalog?.recordCache[activeIndex] : undefined);

	onMount(() => {
		initializeGradebookCatalog();
	});

	$effect(() => {
		if (gradebookState.sessionExpired) goto('/login?expired=1', { replaceState: true });
	});

	async function logOut() {
		await logout();
		clearCredentials();
		clearGradebookCatalogFromLocalStorage();
		resetGradebookState();
		await goto('/login');
	}
</script>

<button onclick={logOut}>Log out</button>

{#if catalog}
	<p>
		<label>Grading period
			<select
				value={String(activeIndex)}
				disabled={catalog.loadingIndex !== undefined}
				onchange={(e) => switchReportPeriod({ overrideIndex: Number(e.currentTarget.value) })}
			>
				{#each catalog.canonicalReportPeriodEntries ?? [] as p, i (i)}
					<option value={String(i)}>{p._GradePeriod}{i === catalog.defaultIndex ? ' (current)' : ''}</option>
				{/each}
			</select>
		</label>
		<button
			disabled={catalog.loadingIndex !== undefined}
			onclick={() => switchReportPeriod({ overrideIndex: catalog.overrideIndex, forceRefresh: true })}
		>
			Refresh
		</button>
	</p>
{/if}

{#if catalog?.loadingIndex !== undefined || (!catalog && !gradebookState.loadingError)}
	<p>
		Loading {catalog?.loadingIndex !== undefined ? getReportPeriodName(catalog.loadingIndex) : 'grades'}…
		{catalog?.receivingData ? '(receiving)' : '(waiting for the portal; this can take 5–15 s)'}
	</p>
{/if}
{#if gradebookState.notice}
	<p><em>{gradebookState.notice}</em> <button onclick={() => (gradebookState.notice = undefined)}>×</button></p>
{/if}
{#if gradebookState.loadingError}
	<p style="color: red">
		Couldn't load grades: {gradebookState.loadingError instanceof Error ? gradebookState.loadingError.message : String(gradebookState.loadingError)}
	</p>
{/if}
{#if record}
	<p><small>Last refreshed {new Date(record.lastRefresh).toLocaleTimeString()}</small></p>
{/if}

{#if gradebook}
	<table border="1" cellpadding="4" style="border-collapse: collapse">
		<thead>
			<tr><th>Period</th><th>Class</th><th>Teacher</th><th>Room</th><th>Grade</th><th>Assignments</th><th>Self-check</th></tr>
		</thead>
		<tbody>
			{#each gradebook.Courses.Course as course (course._CourseID)}
				{@const grade = getCourseGrade(course)}
				{@const check = checkCourseGrade(course)}
				<tr>
					<td>{course._Period || '—'}</td>
					<td>{course._CourseName}</td>
					<td>
						{course._Staff}
						{#if course._StaffEMail}<br /><a href="mailto:{course._StaffEMail}">{course._StaffEMail}</a>{/if}
					</td>
					<td>{course._Room || '—'}</td>
					<td>{grade ? `${grade.letter} ${grade.percentage}%` : '—'}</td>
					<td>{course.Marks?.Mark[0]?.Assignments?.Assignment.length ?? 0}</td>
					<td>
						{#if !check}—{:else if check.matches}✓{:else}≠ calc {check.calculated.toFixed(2)}{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<details>
		<summary>Gradebook JSON (GradeCompass shape)</summary>
		<pre>{JSON.stringify(gradebook, null, 2)}</pre>
	</details>
{/if}
