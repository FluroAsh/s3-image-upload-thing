import ofetch from '@/lib/ofetch'
import * as API from '@/types/api'

export const postUploadImages = async (formData: FormData) => {
  try {
    const response = await ofetch<API.UploadSuccess>('/image/upload', {
      method: 'POST',
      body: formData
    })

    return response
  } catch (e) {
    throw new Error((e as Error).message)
  }
}
