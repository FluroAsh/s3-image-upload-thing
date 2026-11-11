/** The name of the set an uploaded file is stored as: the file name without its last extension, keeping a leading dot. */
export const setNameOf = (fileName: string) => fileName.replace(/(?<=.)\.[^.]*$/, "");
