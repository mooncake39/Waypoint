// Helpers that read one course of the GradeCompass `Gradebook` shape.
// From GradeCompass (MIT, see LICENSE-gradecompass.txt), minus the
// seen-assignments helpers.

import type { Course } from '../types/Gradebook';
import type { Category } from './assignments';

const getMark = (course: Course) => course.Marks?.Mark[0];

/** The portal's grade for the course: letter and percentage. */
export function getCourseGrade(course: Course) {
	const mark = getMark(course);
	if (!mark) return;

	return {
		letter: mark._CalculatedScoreString,
		percentage: parseFloat(mark._CalculatedScoreRaw ?? '0')
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
