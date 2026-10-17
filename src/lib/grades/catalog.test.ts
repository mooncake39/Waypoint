import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { LocalStorageKey } from '../storage';
import type { Gradebook } from '../types/Gradebook';
import {
	getGradebookCatalogFromLocalStorage,
	getInitialGradebookCatalog,
	saveGradebookCatalogToLocalStorage
} from './catalog';

const store = new Map<string, string>();
beforeEach(() => {
	store.clear();
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k)
	});
});
afterEach(() => vi.unstubAllGlobals());

const periods = ['Quarter 1', 'Quarter 2', 'Semester 1 Final'].map((name, i) => ({
	_GradePeriod: name,
	_Index: String(i),
	_StartDate: '',
	_EndDate: ''
}));
const gradebook = (index: number) =>
	({ ReportingPeriods: { ReportPeriod: periods }, ReportingPeriod: periods[index], Courses: { Course: [] } }) as unknown as Gradebook;

test('initial catalog files the current period under its index', async () => {
	vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(gradebook(1)))));
	const catalog = await getInitialGradebookCatalog();

	expect(catalog.defaultIndex).toBe(1);
	expect(catalog.recordCache).toHaveLength(3);
	expect(catalog.recordCache[1]?.gradebook.ReportingPeriod._GradePeriod).toBe('Quarter 2');
	expect(catalog.recordCache[0]).toBeUndefined();
	expect(catalog.canonicalReportPeriodEntries?.map((p) => p._GradePeriod)).toEqual([
		'Quarter 1',
		'Quarter 2',
		'Semester 1 Final'
	]);
});

test('catalog round-trips through localStorage as JSON', () => {
	saveGradebookCatalogToLocalStorage({
		recordCache: [undefined, { gradebook: gradebook(1), lastRefresh: 123 }, undefined],
		defaultIndex: 1,
		overrideIndex: 2
	});

	const loaded = getGradebookCatalogFromLocalStorage();
	expect(loaded).toMatchObject({ defaultIndex: 1, overrideIndex: 2 });
	expect(loaded?.recordCache).toEqual([undefined, { gradebook: gradebook(1), lastRefresh: 123 }, undefined]);
	expect(loaded?.canonicalReportPeriodEntries).toHaveLength(3);
});

test('a corrupt cache is discarded instead of throwing', () => {
	store.set(LocalStorageKey.gradebook, '{not json');
	expect(getGradebookCatalogFromLocalStorage()).toBeUndefined();
	expect(store.has(LocalStorageKey.gradebook)).toBe(false);
});
