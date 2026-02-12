"use client";

import {
  LucideChevronRight,
  LucideFile,
  LucideFolderClosed,
  LucideFolderOpen,
  LucideImages,
} from "lucide-react";

import { useMemo, useState } from "react";

import { getFileIcon } from "@/lib/helpers";
import {
  ExplorerProvider,
  useExplorer,
} from "@/lib/providers/explorer-provider";
import { useFileTree, usePresignedUrls } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { TreeNode } from "@/types/api";
import { type ImageVariant } from "@/types/images";

import { DEPTH_PADDING_MAP } from "./constants";
import { MainContent } from "./layout.main-content";
import { Sidebar } from "./layout.sidebar";
import { extractFilename } from "./utils";

export const ExplorerLayout = ({
  bucketName,
}: {
  bucketName: string | undefined;
}) => {
  // TODO: https://github.com/bvaughn/react-resizable-panels/tree/main

  return (
    <ExplorerProvider bucketName={bucketName ?? ""}>
      <div id="explorer-container" className="flex overflow-hidden size-full">
        <Sidebar />
        <MainContent />
      </div>
    </ExplorerProvider>
  );
};

type RenderTreeNode = TreeNode & {
  isImageCollection?: boolean;
  variants?: TreeNode[];
};

const MIN_IMAGE_COLLECTION_SIZE = 1;

export const FileTree = () => {
  const { bucketName } = useExplorer().state;
  const { childMap } = useFileTree(bucketName);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const newState = { ...prev };
      const prevState = !!prev[id];
      newState[id] = !prevState;
      return newState;
    });
  };

  // TODO: Tidy this up...
  const visibleNodes = useMemo(() => {
    const nodes: RenderTreeNode[] = [];

    const renderChildrenByFolder = (parentId: string) => {
      (childMap.get(parentId) || []).map((node) => {
        if (node.isFolder && node.childCount >= MIN_IMAGE_COLLECTION_SIZE) {
          const children = childMap.get(node.id) ?? [];

          // Folder object name should always be the same as the variant object name (minus variant prefix and .ext)
          const isImageCollection = children.every(
            (child) => extractFilename(child.name) === node.name,
          );

          if (isImageCollection) {
            nodes.push({
              ...node,
              isImageCollection: true,
              variants: children,
            });

            return;
          }
        }

        nodes.push(node); // Root level folder nodes
        if (expanded[node.id]) {
          renderChildrenByFolder(node.id);
        }
      });
    };

    renderChildrenByFolder(""); // "" maps the root nodes, and children
    return nodes;
  }, [childMap, expanded]);

  return (
    <ul>
      {visibleNodes.map((node) => {
        return node.isFolder && node.isImageCollection && node.variants ? (
          <ImageCollection
            key={node.id}
            variants={node.variants}
            node={node}
            previewSize="large"
          />
        ) : (
          <Node
            key={node.id}
            node={node}
            toggleExpanded={toggleExpanded}
            isExpanded={expanded[node.id]}
          />
        );
      })}
    </ul>
  );
};

type ImageVariantProps = {
  node: TreeNode;
  variants: TreeNode[];
  /** Used for setting the desired size for the image preview in the Explorer's "active" panel — by default this is "large". */
  previewSize?: ImageVariant;
};

/**
 * This component will not recursively render children, it is intended to be used immediately, and display a
 * collection of image variants for a given node (thumbnail, medium, large, etc.).
 */
const ImageCollection = ({
  variants,
  node,
  previewSize = "large",
}: ImageVariantProps) => {
  const {
    actions: { setActiveFile },
    state: { bucketName, activeFile },
  } = useExplorer();

  const { data: presignedUrls = {} } = usePresignedUrls(
    variants.map((v) => v.id),
    bucketName,
  );

  // Find the variant node that matches the desired size
  const resizedVariant =
    variants.find((variant) => variant.name.startsWith(previewSize)) ||
    variants[variants.length - 1];

  const remoteURL = presignedUrls[resizedVariant.id];

  return (
    <button
      type="button"
      aria-label={`Open image collection ${node.name}`}
      className={cn(
        "flex w-full items-center text-sm hover:cursor-pointer select-none transition-colors duration-200 rounded-md p-2 mx-1 my-0.5 border-0 bg-transparent",
        remoteURL && activeFile.fileName === node.name
          ? "bg-sky-800/30 text-neutral-100 border border-sky-800/30"
          : "text-neutral-100 hover:bg-slate-700 hover:text-neutral-100",
        DEPTH_PADDING_MAP[node.depth],
      )}
      onClick={() => {
        setActiveFile({
          remoteURL: presignedUrls[resizedVariant.id],
          fileName: node.name,
          variants: variants.map((variant) => ({
            ...variant,
            presignedUrl: presignedUrls[variant.id],
          })),
        });
      }}
    >
      <LucideImages className="size-4 mr-2 text-sky-400 flex-shrink-0" />
      <span className="text-sm truncate">{node.name}</span>
      <div className="ml-auto">
        <span className="text-xs bg-slate-700 text-sky-400 px-2 py-0.5 rounded-full">
          {variants.length}
        </span>
      </div>
    </button>
  );
};

const File = ({ node }: { node: TreeNode }) => {
  const {
    actions: { setActiveFile },
    state: { bucketName, activeFile },
  } = useExplorer();

  const { data: presignedUrls } = usePresignedUrls([node.id], bucketName);
  const remoteURL = presignedUrls?.[node.id] ?? "";

  const generatedRemotePathname = `https://${bucketName}.s3.amazonaws.com/${node.id}`;
  const Icon = getFileIcon(generatedRemotePathname) || LucideFile;

  return (
    <button
      type="button"
      aria-label={`Open file ${node.name}`}
      className={cn(
        "flex w-full items-center text-sm hover:cursor-pointer select-none transition-colors duration-200 rounded-md p-2 mx-1 my-0.5",
        remoteURL && activeFile.fileName === node.name
          ? "bg-sky-600 text-neutral-100 border border-sky-500"
          : "text-neutral-100 hover:bg-slate-700 hover:text-neutral-100",
        DEPTH_PADDING_MAP[node.depth],
      )}
      onClick={() => setActiveFile({ remoteURL, fileName: node.name })}
    >
      <Icon className="size-4 mr-2 stroke-sky-400" />
      <span className="text-sm truncate">{node.name}</span>
      {node.size && (
        <span className="ml-auto text-xs text-slate-400 flex-shrink-0">
          {node.size}
        </span>
      )}
    </button>
  );
};

const Folder = ({
  node,
  isExpanded,
  toggleExpanded,
}: {
  node: TreeNode;
  isExpanded: boolean;
  toggleExpanded: (id: string) => void;
}) => {
  const FolderIcon = isExpanded ? LucideFolderOpen : LucideFolderClosed;

  return (
    <button
      type="button"
      aria-expanded={isExpanded}
      aria-label={`${isExpanded ? "Collapse" : "Expand"} folder ${node.name}`}
      className={cn(
        "flex w-full items-center text-sm hover:cursor-pointer select-none transition-colors duration-200 rounded-md p-2 mx-1 my-0.5 border-0 bg-transparent",
        "text-neutral-100 hover:bg-slate-700 hover:text-neutral-100",
        DEPTH_PADDING_MAP[node.depth],
      )}
      onClick={() => toggleExpanded(node.id)}
    >
      <span className="inline-flex mr-2">
        <LucideChevronRight
          className={`size-4 mr-2 transition duration-75', ${
            isExpanded
              ? "stroke-slate-400 rotate-90"
              : "rotate-0 stroke-sky-400"
          }`}
        />
        <FolderIcon className="size-4 mr-2 stroke-sky-400" />
      </span>
      <span className="text-sm font-medium truncate">{node.name}</span>

      {node.childCount > 0 && (
        <span className="ml-auto text-xs text-slate-400 flex-shrink-0">
          {node.childCount}
        </span>
      )}
    </button>
  );
};

const Node = ({
  node,
  toggleExpanded,
  isExpanded,
}: {
  node: TreeNode;
  toggleExpanded: (id: string) => void;
  isExpanded: boolean;
}) =>
  node.isFolder ? (
    <Folder
      node={node}
      isExpanded={isExpanded}
      toggleExpanded={toggleExpanded}
    />
  ) : (
    <File node={node} />
  );
