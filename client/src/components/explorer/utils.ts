// Extracts the string between "_" and "." (ie: "large_filename.jpg" -> "filename")
export const extractFilename = (value: string) => value.match(/_(.+)\./)?.[1];

export const getVariantType = (fileName: string) => {
  const variant = fileName.split("_")[0];
  return variant ? `${variant[0].toUpperCase()}${variant.slice(1)}` : "";
};

// export const replaceFileSegment = (filename: string, value: string) =>
//   filename.replace(/[^/]+$/, value);
