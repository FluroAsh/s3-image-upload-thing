export type TreeNode = {
  id: string;
  parentId: string;
  name: string;
  depth: number;
  isFolder: boolean;
  childCount: number;
  size: string;
  presignedUrl: string;
};
