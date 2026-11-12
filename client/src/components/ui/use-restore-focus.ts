import { useRef } from "react";

/** Dialogs opened from state have no Radix trigger, so without this focus drops to the body on close. */
export const useRestoreFocus = (open: boolean) => {
	const opener = useRef<Element | null>(null);
	if (open && !opener.current) opener.current = document.activeElement;

	return (event: Event) => {
		const target = opener.current;
		opener.current = null;
		if (target instanceof HTMLElement && target.isConnected) {
			event.preventDefault();
			target.focus();
		}
	};
};
