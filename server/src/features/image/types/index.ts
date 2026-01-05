export type ProcessedImage = {
  fieldName: string;
  buffer: ArrayBuffer | Buffer;
  fileName: string;
  fileType: string;
  size: string;
};

export type ImageVariant =
  | "placeholder"
  | "small"
  | "medium"
  | "large"
  | "lossless";

export type ImageVariants = {
  fieldName: string;
  fileName: string;
  fileType: string;
  size: string;
  source: ProcessedImage;
  variations: Record<
    ImageVariant,
    {
      buffer: Buffer;
      size: string;
    }
  >;
};
