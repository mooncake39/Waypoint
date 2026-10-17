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
	import * as Alert from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
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

<main class="mx-auto flex max-w-5xl flex-col gap-4 p-4">
	<div class="flex flex-wrap items-center gap-2">
		{#if catalog}
			<label class="flex items-center gap-2 text-sm">
				Grading period
				<select
					class="border-input bg-background h-9 rounded-md border px-2"
					value={String(activeIndex)}
					disabled={catalog.loadingIndex !== undefined}
					onchange={(e) => switchReportPeriod({ overrideIndex: Number(e.currentTarget.value) })}
				>
					{#each catalog.canonicalReportPeriodEntries ?? [] as p, i (i)}
						<option value={String(i)}>{p._GradePeriod}{i === catalog.defaultIndex ? ' (current)' : ''}</option>
					{/each}
				</select>
			</label>
			<Button
				variant="outline"
				size="sm"
				disabled={catalog.loadingIndex !== undefined}
				onclick={() => switchReportPeriod({ overrideIndex: catalog.overrideIndex, forceRefresh: true })}
			>
				Refresh
			</Button>
		{/if}
		<Button variant="ghost" size="sm" class="ml-auto" onclick={logOut}>Log out</Button>
	</div>

	{#if catalog?.loadingIndex !== undefined || (!catalog && !gradebookState.loadingError)}
		<p class="text-muted-foreground text-sm">
			Loading {catalog?.loadingIndex !== undefined ? getReportPeriodName(catalog.loadingIndex) : 'grades'}…
			{catalog?.receivingData ? '(receiving)' : '(waiting for the portal; this can take 5–15 s)'}
		</p>
	{/if}
	{#if gradebookState.notice}
		<Alert.Root>
			<Alert.Title class="flex items-center justify-between">
				{gradebookState.notice}
				<Button variant="ghost" size="sm" onclick={() => (gradebookState.notice = undefined)}>×</Button>
			</Alert.Title>
		</Alert.Root>
	{/if}
	{#if gradebookState.loadingError}
		<Alert.Root variant="destructive">
			<Alert.Title>Couldn't load grades</Alert.Title>
			<Alert.Description>
				{gradebookState.loadingError instanceof Error
					? gradebookState.loadingError.message
					: String(gradebookState.loadingError)}
			</Alert.Description>
		</Alert.Root>
	{/if}
	{#if record}
		<p class="text-muted-foreground text-xs">Last refreshed {new Date(record.lastRefresh).toLocaleTimeString()}</p>
	{/if}

	{#if gradebook}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Period</Table.Head>
					<Table.Head>Class</Table.Head>
					<Table.Head>Teacher</Table.Head>
					<Table.Head>Room</Table.Head>
					<Table.Head>Grade</Table.Head>
					<Table.Head>Assignments</Table.Head>
					<Table.Head>Self-check</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each gradebook.Courses.Course as course (course._CourseID)}
					{@const grade = getCourseGrade(course)}
					{@const check = checkCourseGrade(course)}
					<Table.Row>
						<Table.Cell>{course._Period || '—'}</Table.Cell>
						<Table.Cell class="font-medium">{course._CourseName}</Table.Cell>
						<Table.Cell>
							{course._Staff}
							{#if course._StaffEMail}
								<br /><a class="text-muted-foreground text-xs underline" href="mailto:{course._StaffEMail}">{course._StaffEMail}</a>
							{/if}
						</Table.Cell>
						<Table.Cell>{course._Room || '—'}</Table.Cell>
						<Table.Cell>{grade ? `${grade.letter} ${grade.percentage}%` : '—'}</Table.Cell>
						<Table.Cell>{course.Marks?.Mark[0]?.Assignments?.Assignment.length ?? 0}</Table.Cell>
						<Table.Cell>
							{#if !check}—{:else if check.matches}✓{:else}≠ calc {check.calculated.toFixed(2)}{/if}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		<details class="text-xs">
			<summary class="cursor-pointer">Gradebook JSON (GradeCompass shape)</summary>
			<pre class="overflow-auto">{JSON.stringify(gradebook, null, 2)}</pre>
		</details>
	{/if}
</main>
