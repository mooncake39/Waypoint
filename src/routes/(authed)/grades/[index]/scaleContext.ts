// Lets components on the class page know the class's non-percent grading scale
// (e.g. 0–4) without passing it through every layer.

import type { ScoreScale } from '#lib/types/Gradebook.ts';
import { getContext, setContext } from 'svelte';

const key = Symbol('score-scale');

/** `get` is a getter so the value stays reactive. */
export const setScoreScaleContext = (get: () => ScoreScale | undefined) => setContext(key, get);

export const getScoreScale = (): ScoreScale | undefined =>
	(getContext(key) as (() => ScoreScale | undefined) | undefined)?.();
