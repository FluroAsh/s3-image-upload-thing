import { useEffect, useState } from "react";

/** True once the element has scrolled into view for the first time, so a row never requests what it has not shown. */
export const useInView = () => {
	const [el, setEl] = useState<Element | null>(null);
	const [seen, setSeen] = useState(false);

	useEffect(() => {
		if (!el || seen) return;
		const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true));
		observer.observe(el);
		return () => observer.disconnect();
	}, [el, seen]);

	return [setEl, seen] as const;
};
