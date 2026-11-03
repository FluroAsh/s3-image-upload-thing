import { describe, expect, it } from "vitest";

import { UPLOAD_FIELD } from "~/shared/constants/upload";

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

		expect(formData.get(UPLOAD_FIELD.BucketName)).toBe("b");
		expect(formData.get(UPLOAD_FIELD.BucketRegion)).toBe("ap-southeast-2");
		expect(formData.get(UPLOAD_FIELD.Destination)).toBe("dir/");
		expect((formData.get(UPLOAD_FIELD.Images) as File).name).toBe("a.png");
	});
});
