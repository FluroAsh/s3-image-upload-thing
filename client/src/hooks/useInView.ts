import { useEffect, useState } from "react";

/** True once the element has scrolled into `root` for the first time, so a row never requests what it has not shown. */
export const useInView = (root: Element | null) => {
	const [el, setEl] = useState<Element | null>(null);
	const [seen, setSeen] = useState(false);

	useEffect(() => {
		if (!el || !root || seen) return;
		const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true), { root });
		observer.observe(el);
		return () => observer.disconnect();
	}, [el, root, seen]);

	return [setEl, seen] as const;
};
