import { useEffect, useState } from "react";

const RESULT_MS = 1500;

/** Copies text and reports `copied` or `failed` for a moment, so the control can say so. */
export const useCopy = () => {
	const [result, setResult] = useState<"copied" | "failed" | null>(null);

	useEffect(() => {
		if (!result) return;
		const timer = setTimeout(() => setResult(null), RESULT_MS);
		return () => clearTimeout(timer);
	}, [result]);

	const copy = (text: string) =>
		navigator.clipboard.writeText(text).then(
			() => setResult("copied"),
			() => setResult("failed"),
		);

	return { result, copy };
};
