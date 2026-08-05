export const TRASH_DAYS = 30;

export function daysLeft(deletedAt: string | null) {
	if (!deletedAt) return TRASH_DAYS;
	const elapsed = Date.now() - new Date(deletedAt).getTime();
	return Math.max(0, 30 - Math.floor(elapsed / 86_400_000));
}
