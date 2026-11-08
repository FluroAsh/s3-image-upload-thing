export const reorderSets = (sets: string[], from: number, to: number) => {
	const next = [...sets];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
};
