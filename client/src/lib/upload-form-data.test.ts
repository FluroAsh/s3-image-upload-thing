import { describe, expect, it } from "vitest";

import { buildUploadFormData } from "./upload-form-data";

describe("buildUploadFormData", () => {
	it("includes bucket name, region, destination and images", () => {
		const file = new File(["x"], "a.png", { type: "image/png" });
		const formData = buildUploadFormData({
			bucketName: "b",
			bucketRegion: "ap-southeast-2",
			destination: "dir/",
			images: [file],
		});

		expect(formData.get("bucketName")).toBe("b");
		expect(formData.get("bucketRegion")).toBe("ap-southeast-2");
		expect(formData.get("destination")).toBe("dir/");
		expect((formData.get("images") as File).name).toBe("a.png");
	});
});
