import { createContext, useContext, useReducer, useState } from "react";

import { useQueryStates } from "nuqs";

import { dashboardSearchParams } from "@/lib/search-params";
import type { TreeNode } from "~/shared/types";

type ActiveFile = {
	remoteURL: string;
	fileName: string;
	variants?: TreeNode[];
	/** CDN path of the image set, which collections key on; unset for a single file. */
	setPath?: string;
};

type ReducerState = {
	bucketSearchTerm: string;
	activeFile: ActiveFile;
	/** Folder whose sets needing attention are listed in place of the file tree; `null` shows the tree. */
	attentionFolder: string | null;
};

export type State = ReducerState & {
	bucketName: string;
	bucketRegion: string;
};

export type Action =
	| {
			type: "SET_BUCKET_SEARCH_TERM";
			payload: string;
	  }
	| {
			type: "SET_ATTENTION_FOLDER";
			payload: string | null;
	  }
	| {
			type: "SET_ACTIVE_FILE";
			payload: ActiveFile;
	  };

const initialState: ReducerState = {
	bucketSearchTerm: "",
	attentionFolder: null,
	activeFile: {
		remoteURL: "",
		fileName: "",
		variants: [],
	},
};

const reducer = (state: ReducerState, action: Action): ReducerState => {
	switch (action.type) {
		case "SET_BUCKET_SEARCH_TERM":
			return { ...state, bucketSearchTerm: action.payload };
		case "SET_ACTIVE_FILE":
			return { ...state, activeFile: action.payload };
		case "SET_ATTENTION_FOLDER":
			return { ...state, attentionFolder: action.payload };
		default:
			return state;
	}
};

export type Actions = {
	setBucketSearchTerm: (searchTerm: string) => void;
	setActiveFile: (file: ActiveFile) => void;
	setAttentionFolder: (folder: string | null) => void;
	resetActiveState: () => void;
};

const ExplorerContext = createContext<{ state: State; actions: Actions } | undefined>(undefined);

export const ExplorerProvider = ({ children }: { children: React.ReactNode }) => {
	const [state, dispatch] = useReducer(reducer, initialState);
	const [{ bucket: bucketName, region: bucketRegion }] = useQueryStates(dashboardSearchParams);

	const bucketKey = `${bucketName}/${bucketRegion}`;
	const [shownBucketKey, setShownBucketKey] = useState(bucketKey);
	if (shownBucketKey !== bucketKey) {
		setShownBucketKey(bucketKey);
		dispatch({ type: "SET_ACTIVE_FILE", payload: initialState.activeFile });
		dispatch({ type: "SET_ATTENTION_FOLDER", payload: null });
	}

	const actions: Actions = {
		setBucketSearchTerm: (searchTerm) =>
			dispatch({
				type: "SET_BUCKET_SEARCH_TERM",
				payload: searchTerm,
			}),
		setActiveFile: ({ remoteURL, fileName, variants, setPath }) =>
			dispatch({
				type: "SET_ACTIVE_FILE",
				payload: { remoteURL, fileName, variants: variants ?? [], setPath },
			}),
		setAttentionFolder: (folder) => dispatch({ type: "SET_ATTENTION_FOLDER", payload: folder }),
		resetActiveState: () =>
			dispatch({
				type: "SET_ACTIVE_FILE",
				payload: { remoteURL: "", fileName: "", variants: [] },
			}),
	};

	return (
		<ExplorerContext.Provider value={{ state: { ...state, bucketName, bucketRegion }, actions }}>
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
