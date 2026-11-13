import { useEffect, useState } from "react";

const RESULT_MS = 1500;

/** `navigator.clipboard` only exists in a secure context, so plain-HTTP pages copy through a selected textarea. */
const writeText = async (text: string) => {
	if (navigator.clipboard) return navigator.clipboard.writeText(text);

	const field = document.createElement("textarea");
	field.value = text;
	field.style.position = "fixed";
	field.style.opacity = "0";
	document.body.append(field);
	field.select();
	const copied = document.execCommand("copy");
	field.remove();
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
