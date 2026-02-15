import { createContext, useContext, useReducer } from "react";

import type { TreeNode } from "@shared/types";

export type State = {
  bucketName: string;
  bucketRegion: string;
  bucketSearchTerm: string;
  activeFile: {
    remoteURL: string;
    fileName: string;
    variants?: TreeNode[];
  };
};

export type Action =
  | {
      type: "SET_BUCKET_SEARCH_TERM";
      payload: string;
    }
  | {
      type: "SET_ACTIVE_FILE";
      payload: { remoteURL: string; fileName: string; variants?: TreeNode[] };
    };

const initialState: State = {
  bucketName: "",
  bucketRegion: "",
  bucketSearchTerm: "",
  activeFile: {
    remoteURL: "",
    fileName: "",
    variants: [],
  },
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_BUCKET_SEARCH_TERM":
      return { ...state, bucketSearchTerm: action.payload };
    case "SET_ACTIVE_FILE":
      return { ...state, activeFile: action.payload };
    default:
      return state;
  }
};

const ExplorerContext = createContext<
  { state: State; actions: Actions } | undefined
>(undefined);

export type Actions = {
  setBucketSearchTerm: (searchTerm: string) => void;
  setActiveFile: ({
    remoteURL,
    fileName,
    variants,
  }: {
    remoteURL: string;
    fileName: string;
    variants?: TreeNode[];
  }) => void;
  resetActiveState: () => void;
};

export const ExplorerProvider = ({
  bucketName,
  bucketRegion,
  children,
}: {
  bucketName: string;
  bucketRegion: string;
  children: React.ReactNode;
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions: Actions = {
    setBucketSearchTerm: (searchTerm) =>
      dispatch({
        type: "SET_BUCKET_SEARCH_TERM",
        payload: searchTerm,
      }),
    setActiveFile: ({ remoteURL, fileName, variants }) =>
      dispatch({
        type: "SET_ACTIVE_FILE",
        payload: { remoteURL, fileName, variants: variants ? variants : [] },
      }),
    resetActiveState: () =>
      dispatch({
        type: "SET_ACTIVE_FILE",
        payload: { remoteURL: "", fileName: "", variants: [] },
      }),
  };

  return (
    <ExplorerContext.Provider
      value={{ state: { ...state, bucketName, bucketRegion }, actions }}
    >
      {children}
    </ExplorerContext.Provider>
  );
};

export const useExplorer = () => {
  const context = useContext(ExplorerContext);

  if (!context) {
    throw new Error("useExplorer must be used within an ExplorerProvider");
  }

  return context;
};
