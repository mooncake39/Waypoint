import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { saveCredentials } from '../credentials';
import type { Gradebook } from '../types/Gradebook';
import {
	gradebookState,
	refreshInBackground,
	resetGradebookState,
	switchReportPeriod
} from './catalog.svelte';

const periods = ['Quarter 1', 'Quarter 2'].map((name, i) => ({
	_GradePeriod: name,
	_Index: String(i),
	_StartDate: '',
	_EndDate: ''
}));
const gradebook = (index: number, grade = 'A') =>
	({
		ReportingPeriods: { ReportPeriod: periods },
		ReportingPeriod: periods[index],
		Courses: { Course: [{ _CourseName: 'Course One', grade }] }
	}) as unknown as Gradebook;

function respondWith(body: Gradebook, fetchedAt = 5000) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(JSON.stringify(body), { headers: { 'X-Fetched-At': String(fetchedAt) } }))
	);
}

beforeEach(() => {
	const store = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k)
	});
	resetGradebookState();
	gradebookState.gradebookCatalog = {
		recordCache: [{ gradebook: gradebook(0), lastRefresh: 1000 }, undefined],
		defaultIndex: 0,
		canonicalReportPeriodEntries: periods
	};
});
afterEach(() => vi.unstubAllGlobals());

const record = (i = 0) => gradebookState.gradebookCatalog!.recordCache[i]!;

describe('refreshInBackground', () => {
	test('unchanged grades keep the same gradebook object and only move lastRefresh', async () => {
		const before = record().gradebook;
		respondWith(gradebook(0));
		await refreshInBackground();

		expect(record().gradebook).toBe(before);
		expect(record().lastRefresh).toBe(5000);
	});

	test('changed grades replace the gradebook', async () => {
		respondWith(gradebook(0, 'B'));
		await refreshInBackground();

		expect((record().gradebook.Courses.Course[0] as unknown as { grade: string }).grade).toBe('B');
	});

	test('never shows the loading banner', async () => {
		let loadingDuringFetch: number | undefined = -1;
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				loadingDuringFetch = gradebookState.gradebookCatalog!.loadingIndex;
				return new Response(JSON.stringify(gradebook(0)));
			})
		);
		await refreshInBackground();
		expect(loadingDuringFetch).toBeUndefined();
	});

	test('skips while a visible load is running', async () => {
		gradebookState.gradebookCatalog!.loadingIndex = 0;
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		await refreshInBackground();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('a network failure keeps the last data and shows no error', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
		await refreshInBackground();

		expect(record().lastRefresh).toBe(1000);
		expect(gradebookState.loadingError).toBeUndefined();
		expect(gradebookState.sessionExpired).toBeUndefined();
	});

	test('an expired login is surfaced', async () => {
		saveCredentials({ district: 'd', username: 'u' }); // no password: cannot log in again
		vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
		await refreshInBackground();
		expect(gradebookState.sessionExpired).toBe(true);
	});

	test('a result for a period the user switched away from is ignored', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				gradebookState.gradebookCatalog!.overrideIndex = 1; // user switched meanwhile
				return new Response(JSON.stringify(gradebook(0, 'B')), { headers: { 'X-Fetched-At': '5000' } });
			})
		);
		await refreshInBackground();
		expect(record().lastRefresh).toBe(1000);
	});
});

describe('switchReportPeriod and the loading banner', () => {
	/** Fake server that records whether the banner (loadingIndex) was up during each fetch. */
	function trackBanner(index: number) {
		const bannerDuringFetch: (number | undefined)[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				bannerDuringFetch.push(gradebookState.gradebookCatalog!.loadingIndex);
				return new Response(JSON.stringify(gradebook(index, 'B')), { headers: { 'X-Fetched-At': '9000' } });
			})
		);
		return bannerDuringFetch;
	}

	test('a cached period is shown at once; if stale, it refreshes without the banner', async () => {
		gradebookState.gradebookCatalog!.recordCache[1] = { gradebook: gradebook(1), lastRefresh: 0 };
		const banner = trackBanner(1);

		const switching = switchReportPeriod({ overrideIndex: 1 });
		expect(gradebookState.gradebookCatalog!.overrideIndex).toBe(1); // shown before the fetch finishes
		await switching;

		expect(banner).toEqual([undefined]);
		expect(record(1).lastRefresh).toBe(9000);
	});

	test('a fresh cached period is shown without fetching', async () => {
		gradebookState.gradebookCatalog!.recordCache[1] = { gradebook: gradebook(1), lastRefresh: Date.now() };
		const banner = trackBanner(1);
		await switchReportPeriod({ overrideIndex: 1 });

		expect(banner).toEqual([]);
		expect(gradebookState.gradebookCatalog!.overrideIndex).toBe(1);
	});

	test('a period with nothing cached shows the banner while loading', async () => {
		const banner = trackBanner(1);
		await switchReportPeriod({ overrideIndex: 1 });

		expect(banner).toEqual([1]);
		expect(record(1).gradebook.ReportingPeriod._GradePeriod).toBe('Quarter 2');
	});

	test('a manual refresh shows the banner', async () => {
		const banner = trackBanner(0);
		await switchReportPeriod({ forceRefresh: true });
		expect(banner).toEqual([0]);
	});
});
