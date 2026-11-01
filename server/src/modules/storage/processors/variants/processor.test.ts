import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { dimensionsOf, makeJpeg } from "../../test-helpers";
import { createImageVariants, planVariants } from "./processor";

const sourceImage = async (width: number, height: number, orientation?: number, noisy?: boolean) => {
	const buffer = await makeJpeg({ width, height, orientation, noisy });
	return { fieldName: "images", fileName: "photo.jpg", fileType: "image/jpeg", size: "1 kB", buffer };
};

describe("planVariants", () => {
	it("plans only the placeholder and the full-size variant for a source under the thumbnail", () => {
		expect(planVariants(100)).toEqual(["placeholder", "full"]);
	});

	it("adds only the sizes that fit for a source between two entries of the size table", () => {
		expect(planVariants(600)).toEqual(["placeholder", "thumbnail", "small", "full"]);
	});

	it("plans every variant for a source above the size table", () => {
		expect(planVariants(2000)).toEqual(["placeholder", "thumbnail", "small", "medium", "large", "full"]);
	});

	it.each([
		[120, ["placeholder", "thumbnail", "full"]],
		[400, ["placeholder", "thumbnail", "small", "full"]],
	])("keeps a size whose bound equals the source's longest edge (%ipx)", (edge, planned) => {
		expect(planVariants(edge)).toEqual(planned);
	});

	it("plans only the full-size variant for a source smaller than the placeholder", () => {
		expect(planVariants(10)).toEqual(["full"]);
	});
});

describe("createImageVariants", () => {
	it("produces no two variants with the same bytes for a 600px-wide source", async () => {
		const variations = await createImageVariants(await sourceImage(600, 400));
		const contents = Object.values(variations).map(({ buffer }) => buffer.toString("base64"));

		expect(Object.keys(variations)).toEqual(["placeholder", "thumbnail", "small", "full"]);
		expect(new Set(contents).size).toBe(contents.length);
	});

	it("stores no thumbnail for a source under 120px", async () => {
		const variations = await createImageVariants(await sourceImage(100, 60));

		expect(Object.keys(variations)).toEqual(["placeholder", "full"]);
		expect(variations.full).toMatchObject({ width: 100, height: 60 });
	});

	it("blurs the placeholder but keeps the thumbnail sharp", async () => {
		// Half black, half white: a hard edge survives downscaling, so only the blur can flatten it.
		const pixels = Buffer.alloc(600 * 400 * 3);
		for (let i = 0; i < pixels.length; i += 3) if ((i / 3) % 600 >= 300) pixels.fill(255, i, i + 3);
		const buffer = await sharp(pixels, { raw: { width: 600, height: 400, channels: 3 } })
			.jpeg()
			.toBuffer();
		const { placeholder, thumbnail } = await createImageVariants({
			fieldName: "images",
			fileName: "edge.jpg",
			fileType: "image/jpeg",
			size: "1 kB",
			buffer,
		});
		if (!placeholder || !thumbnail) throw new Error("placeholder or thumbnail not produced");
		const spread = async (image: Buffer) => (await sharp(image).stats()).channels[0].stdev;

		expect(await spread(placeholder.buffer)).toBeLessThan((await spread(thumbnail.buffer)) / 2);
	});

	it("fits every size of a landscape to its width, reporting each one's measured dimensions", async () => {
		const variations = await createImageVariants(await sourceImage(2160, 1440));

		expect(dimensionsOf(variations)).toEqual({
			placeholder: { width: 20, height: 13 },
			thumbnail: { width: 120, height: 80 },
			small: { width: 400, height: 267 },
			medium: { width: 800, height: 533 },
			large: { width: 1440, height: 960 },
			full: { width: 2160, height: 1440 },
		});
	});

	it("fits every size of a portrait to its height, keeping the aspect ratio", async () => {
		const variations = await createImageVariants(await sourceImage(960, 1440));

		expect(dimensionsOf(variations)).toEqual({
			placeholder: { width: 13, height: 20 },
			thumbnail: { width: 80, height: 120 },
			small: { width: 267, height: 400 },
			medium: { width: 533, height: 800 },
			large: { width: 960, height: 1440 },
			full: { width: 960, height: 1440 },
		});
	});

	it.each([
		["landscape", 6000, 4000, { width: 3840, height: 2560 }],
		["portrait", 4000, 6000, { width: 2560, height: 3840 }],
	])("caps the full size of a %s at 3840px on its longest edge", async (_shape, width, height, capped) => {
		const { full } = await createImageVariants(await sourceImage(width, height));

		expect(full).toMatchObject(capped);
	});

	it.each([
		["portrait", 400, 600],
		["landscape", 600, 400],
		["square", 600, 600],
	])("never upscales a %s source to a size above its longest edge", async (_shape, width, height) => {
		const variations = await createImageVariants(await sourceImage(width, height));

		expect(Object.keys(variations)).toEqual(["placeholder", "thumbnail", "small", "full"]);
		expect(Math.max(variations.small?.width ?? 0, variations.small?.height ?? 0)).toBe(400);
	});

	it("measures and fits a portrait photo with an EXIF orientation flag after rotating it", async () => {
		const storedSideways = await sourceImage(600, 300, 6);

		const variations = await createImageVariants(storedSideways);

		expect(Object.keys(variations)).toEqual(["placeholder", "thumbnail", "small", "full"]);
		expect(variations.small).toMatchObject({ width: 200, height: 400 });
		expect(variations.full).toMatchObject({ width: 300, height: 600 });
	});

	it("stores the full-size variant as a rotated WebP even when it is larger than the upload", async () => {
		const upload = await sourceImage(600, 300, 6, true);

		const { full } = await createImageVariants(upload);
		if (!full) throw new Error("no full variant produced");
		const stored = await sharp(full.buffer).metadata();

		expect(full.buffer.length).toBeGreaterThan((upload.buffer as Buffer).length);
		expect(stored.format).toBe("webp");
		expect({ width: stored.width, height: stored.height }).toEqual({ width: full.width, height: full.height });
		expect(full).toMatchObject({ width: 300, height: 600 });
	});
});
