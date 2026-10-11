import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { makeJpeg } from "../../test-support";
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

	it("keeps a size whose target width equals the source width", () => {
		expect(planVariants(400)).toEqual(["placeholder", "small", "lossless"]);
	});

	it("plans only the full-size variant for a source narrower than the placeholder", () => {
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

	it("reports the measured width and height of every variant it produced", async () => {
		const variations = await createImageVariants(await sourceImage(2000, 1000));
		const dimensions = Object.fromEntries(
			Object.entries(variations).map(([variant, { width, height }]) => [variant, { width, height }]),
		);

		expect(dimensions).toEqual({
			placeholder: { width: 20, height: 10 },
			small: { width: 400, height: 200 },
			medium: { width: 800, height: 400 },
			large: { width: 1440, height: 720 },
			lossless: { width: 2000, height: 1000 },
		});
	});

	it("measures a portrait photo with an EXIF orientation flag by its displayed width", async () => {
		const storedSideways = await sourceImage(600, 300, 6);

		const variations = await createImageVariants(storedSideways);

		expect(Object.keys(variations)).toEqual(["placeholder", "lossless"]);
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
