import fileSize from 'file-size'

export const readableSize = (size: number, spec?: 'si' | 'iec' | 'jedec') => fileSize(size).human(spec ?? 'si')
