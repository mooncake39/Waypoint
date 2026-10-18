import { describe, expect, test } from 'vitest';
import type { Course } from '../types/Gradebook';
import { getCourseGrade, letterForPercentage, toScaleValue } from './course';

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

test('toScaleValue maps percentages onto the scale', () => {
	expect(toScaleValue(scale, 100)).toBe(4);
	expect(toScaleValue(scale, 87.5)).toBe(3.5);
	expect(toScaleValue(scale, 93.75)).toBe(3.75);
});

describe('getCourseGrade', () => {
	const course = (scoreScale?: object, raw = '100') =>
		({
			Marks: { Mark: [{ _CalculatedScoreString: 'A', _CalculatedScoreRaw: raw, _ScoreScale: scoreScale }] }
		}) as unknown as Course;

	test('percent classes have no scale value', () => {
		expect(getCourseGrade(course())).toEqual({ letter: 'A', percentage: 100, scaleValue: undefined });
	});

	test("0–4 classes use the portal's value on the scale", () => {
		expect(getCourseGrade(course({ ...scale, value: 3.8 }, '95'))?.scaleValue).toBe(3.8);
	});

	test('falls back to converting the percentage when the portal value is absent', () => {
		expect(getCourseGrade(course(scale, '87.5'))?.scaleValue).toBe(3.5);
	});
});
