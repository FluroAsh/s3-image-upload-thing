import { type PointerEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { type Point, usePointerPosition } from "@/hooks/usePointerPosition";
import { cn } from "@/lib/utils";

import { type PreviewShape, placeBesideCursor, previewShapeOf } from "./utils";

const HOVER_DELAY_MS = 150;

const SHAPE_CLASS = {
	square: "size-60",
	landscape: "h-40 w-60",
	portrait: "h-60 w-40",
} as const satisfies Record<PreviewShape, string>;

/** Delays the preview until the cursor has rested on the thumbnail, so nothing is requested while passing over. */
export const useHoverPreview = () => {
	const [at, setAt] = useState<Point>();
	const pointer = useRef<Point>({ x: 0, y: 0 });
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	const close = useCallback(() => {
		clearTimeout(timer.current);
		setAt(undefined);
	}, []);

	useEffect(() => close, [close]);

	const track = (event: PointerEvent) => {
		pointer.current = { x: event.clientX, y: event.clientY };
	};

	return {
		at,
		close,
		handlers: {
			onPointerEnter: (event: PointerEvent) => {
				track(event);
				timer.current = setTimeout(() => setAt(pointer.current), HOVER_DELAY_MS);
			},
			onPointerMove: track,
			onPointerLeave: close,
		},
	};
};

type PreviewBoxProps = {
	/** Shown first, and sets the box's shape from its aspect ratio. */
	thumbSrc: string;
	/** Swapped in over the thumbnail once it has loaded. */
	largeSrc?: string;
	/** Where the cursor was when the preview opened. */
	start: Point;
	/** Called on key press or scroll, or when a drag starts. */
	onClose: () => void;
};

/** Boxed image beside the cursor, whatever its source; it never takes pointer events. */
export const PreviewBox = ({ thumbSrc, largeSrc, start, onClose }: PreviewBoxProps) => {
	const boxRef = useRef<HTMLDivElement>(null);
	const [shape, setShape] = useState<PreviewShape>();
	const [largeLoaded, setLargeLoaded] = useState(false);

	const place = () => {
		const box = boxRef.current;
		if (!box) return;
		const { x, y } = placeBesideCursor(
			cursor.current,
			{ width: box.offsetWidth, height: box.offsetHeight },
			{ width: window.innerWidth, height: window.innerHeight },
		);
		box.style.transform = `translate(${x}px, ${y}px)`;
	};
	const cursor = usePointerPosition(start, place);

	/** Re-places after any render that may have resized the box, such as the shape being set. */
	useLayoutEffect(() => place());

	useEffect(() => {
		window.addEventListener("scroll", onClose, true);
		window.addEventListener("keydown", onClose);
		window.addEventListener("dragstart", onClose);
		return () => {
			window.removeEventListener("scroll", onClose, true);
			window.removeEventListener("keydown", onClose);
			window.removeEventListener("dragstart", onClose);
		};
	}, [onClose]);

	return createPortal(
		<div
			ref={boxRef}
			className={cn(
				"pointer-events-none fixed top-0 left-0 z-50 rounded-md border border-line bg-raised p-1 shadow-xl",
				!shape && "invisible",
			)}
		>
			<div className={cn("relative overflow-hidden rounded-sm", SHAPE_CLASS[shape ?? "square"])}>
				<img
					src={thumbSrc}
					alt=""
					onLoad={(event) =>
						setShape(
							previewShapeOf({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }),
						)
					}
					className="size-full object-cover"
				/>
				{largeSrc && (
					<img
						src={largeSrc}
						alt=""
						onLoad={() => setLargeLoaded(true)}
						className={cn("absolute inset-0 size-full object-cover", !largeLoaded && "opacity-0")}
					/>
				)}
			</div>
		</div>,
		document.body,
	);
};

/** Previews a picked file from its own bytes, so nothing is fetched. */
export const FilePreview = ({ file, start, onClose }: { file: File; start: Point; onClose: () => void }) => {
	const [url, setUrl] = useState<string>();

	useEffect(() => {
		const objectUrl = URL.createObjectURL(file);
		setUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [file]);

	return url ? <PreviewBox thumbSrc={url} start={start} onClose={onClose} /> : null;
};
