import * as path from 'path'

export const getFileType = (fileName: string) => path.parse(fileName).ext
