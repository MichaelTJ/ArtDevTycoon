/**
 * Tailwind classes for score colour bands shared by {@link ScoreBadge} and any surface
 * that displays a 1–10 score.
 */
export function scoreBandClasses(score: number): string {
	if (score <= 3) return 'bg-red-100 text-red-800';
	if (score <= 6) return 'bg-amber-100 text-amber-800';
	if (score <= 8) return 'bg-lime-100 text-lime-800';
	return 'bg-emerald-100 text-emerald-800';
}
