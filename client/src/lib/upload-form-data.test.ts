import { describe, expect, it } from "vitest";

import { buildUploadFormData } from "./upload-form-data";

describe("buildUploadFormData", () => {
	it("includes bucket name, region, destination and images", () => {
		const file = new File(["x"], "a.png", { type: "image/png" });
		const fd = buildUploadFormData({
			bucketName: "b",
			bucketRegion: "ap-southeast-2",
			destination: "dir/",
			images: [file],
		});

		expect(fd.get("bucketName")).toBe("b");
		expect(fd.get("bucketRegion")).toBe("ap-southeast-2");
		expect(fd.get("destination")).toBe("dir/");
		expect((fd.get("images") as File).name).toBe("a.png");
	});
});
