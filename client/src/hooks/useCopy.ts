import { useEffect, useState } from "react";

const RESULT_MS = 1500;

/** `navigator.clipboard` needs a secure context; the copy-event fallback needs no focus, so it works inside menus' focus traps. */
const writeText = async (text: string) => {
	if (navigator.clipboard) return navigator.clipboard.writeText(text);

	const onCopy = (event: ClipboardEvent) => {
		event.clipboardData?.setData("text/plain", text);
		event.preventDefault();
	};
	document.addEventListener("copy", onCopy);
	const copied = document.execCommand("copy");
	document.removeEventListener("copy", onCopy);
	if (!copied) throw new Error("Copy failed");
};

/** Copies text and reports `copied` or `failed` for a moment, so the control can say so. */
export const useCopy = () => {
	const [result, setResult] = useState<"copied" | "failed" | null>(null);

	useEffect(() => {
		if (!result) return;
		const timer = setTimeout(() => setResult(null), RESULT_MS);
		return () => clearTimeout(timer);
	}, [result]);

	const copy = (text: string) =>
		writeText(text).then(
			() => setResult("copied"),
			() => setResult("failed"),
		);

	return { result, copy };
};
