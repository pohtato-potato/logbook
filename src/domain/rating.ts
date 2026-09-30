/* The 1-7 scale (from the owner): 4 is the true middle. Ratings never use feeling colours. */
export const RATINGS: [number, string][] = [[1, 'Complete garbage'], [2, 'Terrible'], [3, 'Bad'], [4, 'Average'], [5, 'Good, recommended'], [6, 'Exceptional'], [7, 'Masterpiece']];
export const ratingText = (r: number) => `${r} of 7 · ${RATINGS[Math.max(1, Math.min(7, Math.round(r))) - 1][1]}`;
