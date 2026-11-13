import { describe, expect, it } from "vitest";

import { readImageSize } from "./image-header";

const bytesOf = (...parts: (number[] | string)[]) =>
	Uint8Array.from(parts.flatMap((part) => (typeof part === "string" ? [...part].map((c) => c.charCodeAt(0)) : part)));

const u16 = (n: number) => [n >> 8, n & 0xff];
const u32 = (n: number) => [...u16(n >> 16), ...u16(n & 0xffff)];
const u16le = (n: number) => [n & 0xff, n >> 8];

const exif = (orientation: number) => [
	0xff,
	0xe1,
	...u16(2 + 6 + 8 + 2 + 12 + 4),
	...bytesOf("Exif\0\0"),
	...bytesOf("MM"),
	...u16(42),
	...u32(8),
	...u16(1),
	...u16(0x0112),
	...u16(3),
	...u32(1),
	...u16(orientation),
	0,
	0,
	...u32(0),
];

const jpeg = (width: number, height: number, ...before: number[][]) =>
	bytesOf([0xff, 0xd8], ...before, [0xff, 0xc0, ...u16(11), 8, ...u16(height), ...u16(width), 3, 0, 0, 0]);

describe("readImageSize", () => {
	it("reads a JPEG's size from its frame header", () => {
		expect(readImageSize(jpeg(6000, 4000))).toEqual({ width: 6000, height: 4000 });
	});

	it("skips segments before the frame and swaps the edges for a sideways EXIF orientation", () => {
		expect(readImageSize(jpeg(6000, 4000, exif(6)))).toEqual({ width: 4000, height: 6000 });
		expect(readImageSize(jpeg(6000, 4000, exif(1)))).toEqual({ width: 6000, height: 4000 });
	});

	it("reads a PNG's size from IHDR", () => {
		const png = bytesOf([0x89], "PNG\r\n\x1a\n", u32(13), "IHDR", u32(640), u32(480));
		expect(readImageSize(png)).toEqual({ width: 640, height: 480 });
	});

	it("reads lossy, lossless and extended WebP", () => {
		const lossy = bytesOf("RIFF", u32(0), "WEBPVP8 ", u32(0), [0, 0, 0, 0x9d, 0x01, 0x2a], u16le(800), u16le(600));
		expect(readImageSize(lossy)).toEqual({ width: 800, height: 600 });

		const bits = (799 | (599 << 14)) >>> 0;
		const lossless = bytesOf("RIFF", u32(0), "WEBPVP8L", u32(0), [0x2f], [...u32(bits)].reverse());
		expect(readImageSize(lossless)).toEqual({ width: 800, height: 600 });

		const extended = bytesOf("RIFF", u32(0), "WEBPVP8X", u32(10), [0, 0, 0, 0], [0x1f, 0x03, 0], [0x57, 0x02, 0]);
		expect(readImageSize(extended)).toEqual({ width: 800, height: 600 });
	});

	it("gives up on other or truncated data", () => {
		expect(readImageSize(bytesOf("GIF89a"))).toBeUndefined();
		expect(readImageSize(bytesOf([0xff, 0xd8, 0xff, 0xe1]))).toBeUndefined();
	});
});
