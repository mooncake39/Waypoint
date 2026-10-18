// Helpers that read one course of the GradeCompass `Gradebook` shape.
// From GradeCompass (MIT, see LICENSE-gradecompass.txt), minus the
// seen-assignments helpers.

import type { Course, ScoreScale } from '../types/Gradebook';
import type { Category } from './assignments';

const getMark = (course: Course) => course.Marks?.Mark[0];

/**
 * The portal's grade for the course: letter and percentage. `letterOnly` is set
 * for classes on a non-percent scale (e.g. 0–4), whose grade shows as a letter.
 */
export function getCourseGrade(course: Course) {
	const mark = getMark(course);
	if (!mark) return;

	return {
		letter: mark._CalculatedScoreString,
		percentage: parseFloat(mark._CalculatedScoreRaw ?? '0'),
		letterOnly: mark._ScoreScale !== undefined
	};
}

/**
 * The letter a percentage earns on a non-percent scale, assuming the portal maps
 * percentages onto it linearly (100% = the scale's max; e.g. 87.5% = 3.5 of 4).
 */
export function letterForPercentage(scale: ScoreScale, percentage: number) {
	if (!Number.isFinite(percentage)) return undefined;
	const value = Math.round((percentage / 100) * scale.max * 100) / 100;
	return (scale.letters.find((l) => value >= l.low) ?? scale.letters.at(-1))?.letter;
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
