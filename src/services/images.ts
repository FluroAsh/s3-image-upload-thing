import ofetch from '@/lib/ofetch'
import * as API from '@/types/api'

export const postUploadImages = async (formData: FormData) => {
  try {
    const { message } = await ofetch<API.Success>('/image/upload', {
      method: 'POST',
      body: formData
    })

    return message
  } catch (e) {
    throw new Error((e as Error).message)
  }
}
