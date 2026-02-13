import ofetch from "@/lib/ofetch";
import * as API from "@shared/types";

export const postUploadImages = async (formData: FormData) => {
  try {
    const response = await ofetch<API.UploadSuccess>("/storage/upload", {
      method: "POST",
      body: formData,
    });

    return response;
  } catch (e) {
    throw new Error((e as Error).message);
  }
};
