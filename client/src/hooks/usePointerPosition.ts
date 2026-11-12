import { useEffect, useLayoutEffect, useRef } from "react";

export type Point = { x: number; y: number };

/** Tracks the pointer in a ref rather than state, so following the cursor never re-renders. */
export const usePointerPosition = (start: Point, onMove?: (point: Point) => void) => {
	const position = useRef(start);
	const onMoveRef = useRef(onMove);

	useLayoutEffect(() => {
		onMoveRef.current = onMove;
	});

	useEffect(() => {
		const move = (event: PointerEvent) => {
			position.current = { x: event.clientX, y: event.clientY };
			onMoveRef.current?.(position.current);
		};
		window.addEventListener("pointermove", move);
		return () => window.removeEventListener("pointermove", move);
	}, []);

	return position;
};
