import ofetch from "@/lib/ofetch";
import type * as API from "~/shared/types";

export const postUploadImages = (formData: FormData) =>
	ofetch<API.UploadResponse>("/storage/upload", {
		method: "POST",
		body: formData,
	});
