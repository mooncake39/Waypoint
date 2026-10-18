import { describe, expect, test } from 'vitest';
import type { Course } from '../types/Gradebook';
import { getCourseGrade, letterForPercentage } from './course';

const scale = {
	max: 4,
	letters: [
		{ letter: 'A', low: 3.5 },
		{ letter: 'B', low: 2.75 },
		{ letter: 'C', low: 2 },
		{ letter: 'D', low: 1.5 },
		{ letter: 'F', low: 0 }
	]
};

describe('letterForPercentage (0–4 scale)', () => {
	test.each([
		[100, 'A'],
		[87.5, 'A'], // 3.5
		[87.25, 'B'], // 3.49
		[68.75, 'B'], // 2.75
		[50, 'C'], // 2.0
		[37.5, 'D'], // 1.5
		[37.25, 'F'], // 1.49
		[0, 'F']
	])('%d%% → %s', (percentage, letter) => {
		expect(letterForPercentage(scale, percentage)).toBe(letter);
	});

	test('no letter for a missing percentage', () => {
		expect(letterForPercentage(scale, NaN)).toBeUndefined();
	});
});

test('getCourseGrade marks non-percent classes as letter-only', () => {
	const course = (scoreScale?: typeof scale) =>
		({
			Marks: { Mark: [{ _CalculatedScoreString: 'A', _CalculatedScoreRaw: '100', _ScoreScale: scoreScale }] }
		}) as unknown as Course;

	expect(getCourseGrade(course(scale))).toEqual({ letter: 'A', percentage: 100, letterOnly: true });
	expect(getCourseGrade(course())).toEqual({ letter: 'A', percentage: 100, letterOnly: false });
});
