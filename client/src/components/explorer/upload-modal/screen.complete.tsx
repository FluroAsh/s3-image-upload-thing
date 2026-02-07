import { FileVariant, FileVariants, Variant } from "@/types/api";

import { useUpload } from "./provider";

const Header = ({
  imageCount,
  groupCount,
}: {
  imageCount: number;
  groupCount: number;
}) => {
  return (
    <p className="text-base text-neutral-300 mt-2 mb-4 font-medium">
      Successfully uploaded {imageCount}{" "}
      {imageCount === 1 ? "variant" : "variants"} across {groupCount}{" "}
      {groupCount === 1 ? "image" : "images"}.
    </p>
  );
};

const FileGroup = ({ groups }: { groups: FileVariants[] }) => {
  return groups.map((fileGroup, i) => (
    <div
      key={`group-${i}`}
      className="bg-neutral-800 rounded-lg p-3 border border-neutral-700"
    >
      <h4 className="text-sm font-medium text-neutral-200 mb-2">
        Group {i + 1}
      </h4>

      <div className="space-y-2">
        {fileGroup.map((file, i) => (
          <FileItem key={`variant-${file.fileName}-${i}`} file={file} />
        ))}
      </div>
    </div>
  ));
};

const variantSizeLabel: Record<Variant, string> = {
  placeholder: "plch",
  small: "sm",
  medium: "md",
  large: "lg",
  lossless: "loss",
};

const FileItem = ({ file }: { file: FileVariant }) => {
  return (
    <div className="flex items-center justify-between bg-neutral-700 rounded-md p-2 border border-neutral-600 hover:border-neutral-500 transition-colors">
      <span className="mr-2 bg-blue-900 text-blue-200 text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide pointer-events-none">
        {variantSizeLabel[file.variant]}
      </span>

      <a
        href={file.imageURL}
        target="_blank"
        className="text-blue-400 hover:text-blue-300 text-sm font-medium mr-2 flex-1"
      >
        {file.fileName}
      </a>
      <span className="text-xs text-neutral-300 whitespace-nowrap">
        {file.size}
      </span>
    </div>
  );
};

export const CompleteScreen = () => {
  const { uploadResponse } = useUpload();
  const files = uploadResponse?.files || [];

  // Group files by fileName (each image has multiple variants)
  const groupedFiles = files.reduce(
    (acc, file) => {
      if (!acc[file.fileName]) {
        acc[file.fileName] = [];
      }
      acc[file.fileName].push(file);
      return acc;
    },
    {} as Record<string, FileVariant[]>,
  );

  const groups = Object.values(groupedFiles);
  const groupCount = groups.length;
  const imageCount = files.length;

  return (
    <div>
      <Header imageCount={imageCount} groupCount={groupCount} />
      <div className="max-h-[700px] overflow-y-auto space-y-3 pr-2">
        <FileGroup groups={groups} />
      </div>
    </div>
  );
};
