import * as sharp from 'sharp'

export type OutputOptions =
  | sharp.OutputOptions
  | sharp.JpegOptions
  | sharp.PngOptions
  | sharp.WebpOptions
  | sharp.AvifOptions
  | sharp.HeifOptions
  | sharp.JxlOptions
  | sharp.GifOptions
  | sharp.Jp2Options
  | sharp.TiffOptions
