// Helpers that read one course of the GradeCompass `Gradebook` shape.
// From GradeCompass (MIT, see LICENSE-gradecompass.txt), minus the
// seen-assignments helpers.

import type { Course, ScoreScale } from '../types/Gradebook';
import type { Category } from './assignments';

const getMark = (course: Course) => course.Marks?.Mark[0];

/**
 * A percentage on a non-percent scale, assuming the portal maps percentages onto
 * it linearly (100% = the scale's max; e.g. 87.5% = 3.5 of 4). Rounded to 2 places.
 */
export const toScaleValue = (scale: ScoreScale, percentage: number) =>
	Math.round((percentage / 100) * scale.max * 100) / 100;

/** How scale values are shown: 4.0, 3.5, 3.49. */
export const scaleValueFormat = { minimumFractionDigits: 1, maximumFractionDigits: 2 };

const scaleValueFormatter = new Intl.NumberFormat('en-US', scaleValueFormat);

/** A grade on a non-percent scale as text, e.g. "A 4.0". */
export const formatScaleGrade = (letter: string, value: number) =>
	`${letter} ${scaleValueFormatter.format(value)}`;

/** The letter a percentage earns on a non-percent scale. */
export function letterForPercentage(scale: ScoreScale, percentage: number) {
	if (!Number.isFinite(percentage)) return undefined;
	const value = toScaleValue(scale, percentage);
	return (scale.letters.find((l) => value >= l.low) ?? scale.letters.at(-1))?.letter;
}

/**
 * The portal's grade for the course: letter and percentage. For classes on a
 * non-percent scale (e.g. 0–4), `scaleValue` is the grade on that scale and is
 * shown instead of the percentage.
 */
export function getCourseGrade(course: Course) {
	const mark = getMark(course);
	if (!mark) return;

	const percentage = parseFloat(mark._CalculatedScoreRaw ?? '0');
	const scale = mark._ScoreScale;
	return {
		letter: mark._CalculatedScoreString,
		percentage,
		scaleValue: scale ? (scale.value ?? toScaleValue(scale, percentage)) : undefined
	};
}

/** The course's weighted categories, or undefined for a total-points course. */
export const getSynergyCourseAssignmentCategories = (course: Course): Category[] | undefined =>
	getMark(course)?.GradeCalculationSummary?.AssignmentGradeCalc.map((category) => ({
		name: category._Type,
		weightPercentage: parseFloat(category._Weight),
		pointsEarned: parseFloat(category._Points),
		pointsPossible: parseFloat(category._PointsPossible),
		weightedPercentage: parseFloat(category._WeightedPct),
		gradeLetter: category._CalculatedMark
	}));
