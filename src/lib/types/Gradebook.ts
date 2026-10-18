// From GradeCompass (https://github.com/PurelyAnecdotal/gradecompass), MIT License,
// Copyright (c) 2026 The GradeCompass Authors. See LICENSE-gradecompass.txt.
// Changed: _ScoreType widened from the literal 'Raw Score' to string; _StudentName and
// Mark._ScoreScale added.

export interface GradebookResult {
	Gradebook: Gradebook;
}

export interface Gradebook {
	ReportingPeriods: ReportingPeriods;
	ReportingPeriod: ReportPeriod;
	Courses: Courses;
	'_xmlns:xsd': string;
	'_xmlns:xsi': string;

	_Type: string;
	_ErrorMessage: string;
	_HideStandardGraphInd: boolean;
	_HideMarksColumnElementary: boolean;
	_HidePointsColumnElementary: boolean;
	_HidePercentSecondary: boolean;
	_DisplayStandardsData: boolean;
	_GBStandardsTabDefault: boolean;

	/** Added by this app: the student's display name, e.g. "First Last". */
	_StudentName?: string;
}

export interface ReportingPeriods {
	ReportPeriod: ReportPeriod[];
}

export interface ReportPeriod {
	/** ex: 'Semester 2' */
	_GradePeriod: string;
	/** number */
	_Index: string;
	/** date */
	_StartDate: string;
	/** date */
	_EndDate: string;
}

export interface Courses {
	Course: Course[];
}

export interface Course {
	Marks: Marks | null;

	_Period: string;
	/**```ts
	 * `${CourseName} (${CourseID})`
	 * ```*/
	_Title: string;
	_CourseName: string;
	/** number */
	_CourseID: string;
	_Room: string;
	/** Teacher name */
	_Staff: string;
	/** Teacher email */
	_StaffEMail: string;
	/** uuid */
	_StaffGU: string;
	/** class category associated image?
	 * - 'arts'
	 * - 'social'
	 * - 'math'
	 * - 'technical'
	 * - 'science'
	 * - 'language'
	 * - 'health'
	 */
	_ImageType: string;
	/** number */
	_HighlightPercentageCutOffForProgressBar: string;
	_UsesRichContent: boolean;
}

export interface Marks {
	Mark: Mark[];
}

export interface Mark {
	StandardViews: null;
	GradeCalculationSummary: GradeCalculationSummary | null;
	Assignments: Assignments | null;
	AssignmentsSinceLastAccess: Assignments | null;

	_MarkName: string;
	_ShortMarkName: string;
	/** letter grade */
	_CalculatedScoreString: string;
	/** number (decimal) */
	_CalculatedScoreRaw: string;

	/**
	 * Added by this app: present when the class is graded on a non-percent scale
	 * (e.g. Rubric 0–4). The grade is then shown as a letter and a value on that scale.
	 */
	_ScoreScale?: ScoreScale;
}

export interface ScoreScale {
	/** Top of the scale, e.g. 4 */
	max: number;
	/** The portal's grade on this scale, e.g. 3.75 */
	value?: number;
	/** Letter cutoffs on that scale, highest first, e.g. A ≥ 3.5 */
	letters: { letter: string; low: number }[];
}

export interface Assignments {
	Assignment: AssignmentEntity[];
}

export interface AssignmentEntity {
	Resources: Resources | null;
	Standards: null;

	/** number */
	_GradebookID: string;
	/** Assignment title */
	_Measure: string;
	/** Assignment category */
	_Type: string;
	/** date */
	_Date: string;
	/** date */
	_DueDate: string;

	/**Unscaled points earned? More data needed
	 * ```ts
	 * `${number}` |
	 * undefined // not graded
	 * ``` */
	_Score?: string;
	/**
	 * If scaled, displays unscaled points
	 * 
	 * a and b are numbers
	 * ```ts
	 * `${a} out of ${b}` |
	 * 'Not Graded' // not graded
	 * ```*/
	_DisplayScore: string;
	/**
	 * Unscaled points earned (if scaled, otherwise usually matches Point)
	 * ```ts
	 * `${number}` |
	 * undefined // not graded
	 * ```*/
	_ScoreCalValue?: string;

	/** human-readable relative time ex: '4d' */
	_TimeSincePost: string;
	/** number (decimal) */
	_TotalSecondsSincePost: string;

	/**
	 * Unscaled points possible (if scaled, otherwise usually matches PointPossible)
	 * ```ts
	 * `${number}` |
	 * undefined // not graded
	 * ```*/
	_ScoreMaxValue?: string;
	/** ex: 'Raw Score', 'Yes / No' */
	_ScoreType: string;
	/**
	 * If scaled, displays scaled points
	 * 
	 * a and b are numbers
	 * ```ts
	 * `${a} / ${b}` |
	 * `${a} / ` | // extra credit
	 * `${b} Points Possible` // not graded
	 * ```*/
	_Points: string;
	/**
	 * Scaled points earned (if scaled, otherwise usually matches ScoreCalValue)
	 * ```ts 
	 * `${number}` |
	 * '' | // zero with empty point?
	 * undefined // not graded
	 * ```*/
	_Point?: string;
	/**
	 * Scaled points possible (if scaled, otherwise usually matches ScoreMaxValue)
	 * ```ts
	 * `${number}` |
	 * '' | // extra credit
	 * undefined // not graded
	 * ```*/
	_PointPossible?: string;

	/** Teacher comments | ''
	 * 
	 * Starts with '(Not For Grading) ' if assignment is not for grade
	 * 
	 * fast-xml-parser may be removing leading/trailing whitespace */
	_Notes: string;
	/** number */
	_TeacherID: string;
	/** number */
	_StudentID: string;
	/** Assignment description | '' */
	_MeasureDescription: string;

	_HasDropBox: boolean;
	/** date */
	_DropStartDate: string;
	/** date */
	_DropEndDate: string;
}

export interface Resources {
	Resource: Resource[];
}

export interface Resource {
	/** ex: 'URL' */
	_Type: string;
	/** number */
	_ClassID: string;
	/** ex: 'application/vnd.google-apps.file' */
	_FileType?: string;
	/** number */
	_GradebookID: string;
	/** date (extended) */
	_ResourceDate: Date;
	/** same as ResourceName? */
	_ResourceDescription: string;
	/** number */
	_ResourceID: string;
	/** Resoure name (if url, title of page) */
	_ResourceName: string;
	/** number; order in resource list */
	_Sequence: string;
	/** number */
	_TeacherID: string;
	_url: string;
	_ServerFileName: string;
	
}

export interface GradeCalculationSummary {
	AssignmentGradeCalc: AssignmentGradeCalc[];
}

export interface AssignmentGradeCalc {
	/** Grade category */
	_Type: string;
	/** 'number%' */
	_Weight: string;
	/** number (decimal) */
	_Points: string;
	/** number (decimal) */
	_PointsPossible: string;
	/** 'number%' */
	_WeightedPct: string;
	/** letter grade */
	_CalculatedMark: string;
}
