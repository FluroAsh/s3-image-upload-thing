import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { dimensionsOf, makeJpeg } from "../../test-helpers";
import { createImageVariants, planVariants } from "./processor";

const sourceImage = async (width: number, height: number, orientation?: number, noisy?: boolean) => {
	const buffer = await makeJpeg({ width, height, orientation, noisy });
	return { fieldName: "images", fileName: "photo.jpg", fileType: "image/jpeg", size: "1 kB", buffer };
};

describe("planVariants", () => {
	it("plans only the placeholder and the full-size variant for a source below the size table", () => {
		expect(planVariants(300)).toEqual(["placeholder", "lossless"]);
	});

	it("adds only the sizes that fit for a source between two entries of the size table", () => {
		expect(planVariants(600)).toEqual(["placeholder", "small", "lossless"]);
	});

	it("plans every variant for a source above the size table", () => {
		expect(planVariants(2000)).toEqual(["placeholder", "small", "medium", "large", "lossless"]);
	});

	it("keeps a size whose bound equals the source's longest edge", () => {
		expect(planVariants(400)).toEqual(["placeholder", "small", "lossless"]);
	});

	it("plans only the full-size variant for a source smaller than the placeholder", () => {
		expect(planVariants(10)).toEqual(["lossless"]);
	});
});

describe("createImageVariants", () => {
	it("produces no two variants with the same bytes for a 600px-wide source", async () => {
		const variations = await createImageVariants(await sourceImage(600, 400));
		const contents = Object.values(variations).map(({ buffer }) => buffer.toString("base64"));

		expect(Object.keys(variations)).toEqual(["placeholder", "small", "lossless"]);
		expect(new Set(contents).size).toBe(contents.length);
	});

	it("fits every size of a landscape to its width, reporting each one's measured dimensions", async () => {
		const variations = await createImageVariants(await sourceImage(2160, 1440));

		expect(dimensionsOf(variations)).toEqual({
			placeholder: { width: 20, height: 13 },
			small: { width: 400, height: 267 },
			medium: { width: 800, height: 533 },
			large: { width: 1440, height: 960 },
			lossless: { width: 2160, height: 1440 },
		});
	});

	it("fits every size of a portrait to its height, keeping the aspect ratio", async () => {
		const variations = await createImageVariants(await sourceImage(960, 1440));

		expect(dimensionsOf(variations)).toEqual({
			placeholder: { width: 13, height: 20 },
			small: { width: 267, height: 400 },
			medium: { width: 533, height: 800 },
			large: { width: 960, height: 1440 },
			lossless: { width: 960, height: 1440 },
		});
	});

	it.each([
		["portrait", 400, 600],
		["landscape", 600, 400],
		["square", 600, 600],
	])("never upscales a %s source to a size above its longest edge", async (_shape, width, height) => {
		const variations = await createImageVariants(await sourceImage(width, height));

		expect(Object.keys(variations)).toEqual(["placeholder", "small", "lossless"]);
		expect(Math.max(variations.small?.width ?? 0, variations.small?.height ?? 0)).toBe(400);
	});

	it("measures and fits a portrait photo with an EXIF orientation flag after rotating it", async () => {
		const storedSideways = await sourceImage(600, 300, 6);

		const variations = await createImageVariants(storedSideways);

		expect(Object.keys(variations)).toEqual(["placeholder", "small", "lossless"]);
		expect(variations.small).toMatchObject({ width: 200, height: 400 });
		expect(variations.lossless).toMatchObject({ width: 300, height: 600 });
	});

	it("stores the full-size variant as a rotated WebP even when it is larger than the upload", async () => {
		const upload = await sourceImage(600, 300, 6, true);

		const { lossless } = await createImageVariants(upload);
		if (!lossless) throw new Error("no lossless variant produced");
		const stored = await sharp(lossless.buffer).metadata();

		expect(lossless.buffer.length).toBeGreaterThan((upload.buffer as Buffer).length);
		expect(stored.format).toBe("webp");
		expect({ width: stored.width, height: stored.height }).toEqual({ width: lossless.width, height: lossless.height });
		expect(lossless).toMatchObject({ width: 300, height: 600 });
	});
});
