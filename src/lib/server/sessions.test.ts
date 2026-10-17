import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { RawGradebook } from './portal/gradebook';
import type { PortalClient } from './portal/http';

// Fake portal: period 0 is the current one; an unknown index falls back to it.
async function fakePortal(_client: PortalClient, periodIndex?: number): Promise<RawGradebook> {
	const index = periodIndex !== undefined && periodIndex < 3 ? periodIndex : 0;
	return {
		periods: ['Quarter 1', 'Quarter 2', 'Semester 1 Final'].map((Name, i) => ({
			Name,
			GU: String(i),
			MarkPeriods: [],
			OrgYearGU: '',
			schoolID: 1,
			defaultFocus: i === 0
		})),
		periodIndex: index,
		classes: [],
		schedule: [],
		fetchedAt: Date.now()
	};
}
const fetchGradebook = vi.fn(fakePortal);
vi.mock('./portal/gradebook', () => ({ fetchGradebook }));

const { createSession, getSession, refresh, refreshGradebook } = await import('./sessions');

let session: NonNullable<ReturnType<typeof getSession>>;
beforeEach(() => {
	fetchGradebook.mockClear();
	session = getSession(createSession({} as PortalClient))!;
});
afterEach(() => vi.useRealTimers());

describe('session cache', () => {
	test('caches each grading period separately', async () => {
		await refresh(session, 1);
		await refresh(session, 2);
		await refresh(session, 1);
		await refresh(session, 2);
		expect(fetchGradebook).toHaveBeenCalledTimes(2);
	});

	test('a request for the current period only reuses a current-period result', async () => {
		await refresh(session, 1); // Quarter 2 is not the current period
		await refresh(session);
		expect(fetchGradebook).toHaveBeenCalledTimes(2);

		await refresh(session, 0);
		expect(fetchGradebook).toHaveBeenCalledTimes(2); // period 0 is the cached current one
	});

	test('concurrent requests for the same period share one portal refresh', async () => {
		await Promise.all([refresh(session, 1), refresh(session, 1), refresh(session, 1)]);
		expect(fetchGradebook).toHaveBeenCalledTimes(1);
	});

	test('different periods never refresh at the same time on one session', async () => {
		let running = 0;
		let maxRunning = 0;
		fetchGradebook.mockImplementation(async (client, i) => {
			maxRunning = Math.max(maxRunning, ++running);
			await new Promise((r) => setTimeout(r, 10));
			running--;
			return fakePortal(client, i);
		});
		await Promise.all([refresh(session, 1), refresh(session, 2)]);
		expect(maxRunning).toBe(1);
		expect(fetchGradebook).toHaveBeenCalledTimes(2);
		fetchGradebook.mockImplementation(fakePortal);
	});

	test('entries expire after 30 s', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		await refresh(session, 1);
		vi.setSystemTime(Date.now() + 29_000);
		await refresh(session, 1);
		expect(fetchGradebook).toHaveBeenCalledTimes(1);
		vi.setSystemTime(Date.now() + 2_000);
		await refresh(session, 1);
		expect(fetchGradebook).toHaveBeenCalledTimes(2);
	});

	test('the converted gradebook is built once per fetch and reports the fetch time', async () => {
		const first = await refreshGradebook(session, 2);
		const second = await refreshGradebook(session, 2);
		expect(second.gradebook).toBe(first.gradebook);
		expect(first.gradebook.ReportingPeriod._GradePeriod).toBe('Semester 1 Final');
		expect(first.fetchedAt).toBe((await refresh(session, 2)).raw.fetchedAt);
	});
});
