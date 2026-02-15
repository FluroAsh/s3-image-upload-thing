import { useQueryClient } from "@tanstack/react-query";
import {
  LucideArrowLeft,
  LucideFolder,
  LucideFolderPlus,
  LucideSearch,
} from "lucide-react";
import { type MutableRefObject, useState } from "react";

import type { TreeNode } from "@shared/types";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree } from "@/lib/query";

import { Folder } from "./folder";

const isFolder = (node: TreeNode) => node.isFolder;

const findCurrentFolders = (
  childMap: Map<string, TreeNode[]>,
  activeNodeId: string,
  searchQuery: string,
) => {
  const folders = (childMap.get(activeNodeId) ?? []).filter(isFolder);

  return searchQuery
    ? folders.filter((node) =>
        node.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : folders;
};

export const FolderSelect = ({
  folderPathRef,
}: {
  folderPathRef: MutableRefObject<string>;
}) => {
  const qc = useQueryClient();
  const { bucketName: activeBucketName } = useExplorer().state;
  const { childMap } = useFileTree(activeBucketName);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [folderStack, setFolderStack] = useState<TreeNode[]>([]);

  const activeFolder = folderStack[folderStack.length - 1] || undefined;
  const activeNodeId = activeFolder?.id ?? ""; // "" is the root parent

  const currentFolders = findCurrentFolders(
    childMap,
    activeNodeId,
    searchQuery,
  );

  const handleBack = () => {
    setFolderStack((prev) => {
      const newStack = prev.slice(0, -1);
      folderPathRef.current = newStack.map((n) => n.name).join("/");
      return newStack;
    });
  };

  const handleFolderSelect = (node: TreeNode) => {
    setFolderStack((prev) => {
      const newStack = [...prev, node];
      folderPathRef.current = newStack.map((n) => n.name).join("/");
      return newStack;
    });
  };

  const handleCreateFolder = () => {
    const newFolderName = prompt("Enter new folder name:");
    if (!newFolderName) return;

    const newFolder: TreeNode = {
      id: activeNodeId
        ? `${activeNodeId}/${newFolderName}`
        : `${newFolderName}/`,
      parentId: activeNodeId,
      name: newFolderName,
      isFolder: true,
      depth: activeFolder ? activeFolder.depth + 1 : 0,
      childCount: 0,
      size: "",
      presignedUrl: "",
    };

    // Optimistically add to the query cache until next refetch
    qc.setQueryData(
      ["fileTree", activeBucketName],
      (oldData: TreeNode[] | undefined) =>
        oldData ? [...oldData, newFolder] : [newFolder],
    );

    setFolderStack((prev) => [...prev, newFolder]);
    folderPathRef.current = [
      ...folderStack.map((n) => n.name),
      newFolderName,
    ].join("/");
  };

  return (
    // Header
    <div className="mb-4">
      <div className="mb-4 flex justify-between items-center">
        <div className="text-neutral-300">
          <span className="font-mono bg-neutral-800 px-2 py-1 rounded text-xs text-white">
            {activeNodeId ? activeNodeId : activeBucketName}
          </span>
        </div>

        <button
          className="flex items-center justify-center bg-neutral-500 text-neutral-100 py-2 px-4 rounded-md"
          onClick={handleCreateFolder}
        >
          <LucideFolderPlus className="size-4" />
          <span className="ml-2 text-sm">New Folder</span>
        </button>
      </div>

      {/* Search/Navigation */}
      <div className="flex gap-x-2 mb-4">
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-[32px] w-full p-2 rounded-md border border-neutral-500 text-neutral-600 focus:outline-none focus:border-neutral-300"
            placeholder="Search folders..."
          />
          <LucideSearch className="absolute top-1/2 left-2 size-4 text-neutral-500 transform -translate-y-1/2" />
        </div>

        <button
          className="flex gap-x-2 items-center bg-neutral-500 text-neutral-100 px-4 py-2 rounded-md"
          onClick={handleBack}
        >
          <LucideArrowLeft className="size-4 mr-2" />
          <span className="text-sm">Back</span>
        </button>
      </div>

      {currentFolders.length > 0 ? (
        <div className="grid grid-cols-5 gap-4 overflow-x-hidden h-[300px] p-4 rounded-md border border-neutral-500">
          {currentFolders.map((folderNode) => (
            <Folder
              key={folderNode.id}
              name={folderNode.name}
              onClick={() => handleFolderSelect(folderNode)}
            />
          ))}
        </div>
      ) : (
        <div className="mb-4">
          <div className="p-4 rounded-md border border-neutral-500 h-[300px] grid place-items-center">
            <div>
              <LucideFolder className="size-12 mx-auto mb-4 stroke-neutral-500" />
              {activeFolder ? (
                <span className="text-neutral-300">
                  Looks like
                  <span className="font-mono bg-neutral-800 px-2 py-1 rounded text-xs text-white mx-2">
                    {activeFolder.name}
                  </span>
                  is empty!
                </span>
              ) : (
                <span className="text-neutral-300">
                  No folders found in {activeBucketName}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
