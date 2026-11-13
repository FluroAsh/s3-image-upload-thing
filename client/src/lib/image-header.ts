export type ImageSize = {
	/** Pixels, after EXIF rotation. */
	width: number;
	/** Pixels, after EXIF rotation. */
	height: number;
};

/** Bytes of a file's start that cover the size in every JPEG seen, after the metadata segments that precede it. */
export const HEADER_BYTES = 512 * 1024;

const ascii = (bytes: Uint8Array, at: number, length: number) =>
	String.fromCharCode(...bytes.subarray(at, at + length));

const jpegSize = (bytes: Uint8Array): ImageSize | undefined => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let swapped = false;
	let at = 2;

	while (at + 9 < bytes.length) {
		if (bytes[at] !== 0xff) {
			at++;
			continue;
		}
		const marker = bytes[at + 1];
		const length = view.getUint16(at + 2);

		if (marker === 0xe1 && ascii(bytes, at + 4, 4) === "Exif") {
			const tiff = at + 10;
			const little = ascii(bytes, tiff, 2) === "II";
			const entries = view.getUint16(view.getUint32(tiff + 4, little) + tiff, little);
			for (let i = 0; i < entries; i++) {
				const entry = view.getUint32(tiff + 4, little) + tiff + 2 + i * 12;
				if (view.getUint16(entry, little) === 0x0112) swapped = view.getUint16(entry + 8, little) >= 5;
			}
		}

		const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
		if (isFrame) {
			const height = view.getUint16(at + 5);
			const width = view.getUint16(at + 7);
			return swapped ? { width: height, height: width } : { width, height };
		}
		at += 2 + length;
	}
};

const webpSize = (bytes: Uint8Array): ImageSize | undefined => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const kind = ascii(bytes, 12, 4);

	if (kind === "VP8 ") return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
	if (kind === "VP8L") {
		const bits = view.getUint32(21, true);
		return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
	}
	if (kind === "VP8X") {
		return {
			width: (view.getUint16(24, true) | (bytes[26] << 16)) + 1,
			height: (view.getUint16(27, true) | (bytes[29] << 16)) + 1,
		};
	}
};

/** Reads pixel size, with EXIF rotation applied, from the start of a JPEG, PNG or WebP file without decoding it; a truncated header reads past the end, so the size is unknown. */
export const readImageSize = (bytes: Uint8Array): ImageSize | undefined => {
	try {
		if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegSize(bytes);
		if (ascii(bytes, 1, 3) === "PNG") {
			const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
			return { width: view.getUint32(16), height: view.getUint32(20) };
		}
		if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return webpSize(bytes);
	} catch {}
};
