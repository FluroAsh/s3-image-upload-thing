import * as API from "@shared/types";

import ofetch from "@/lib/ofetch";

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
