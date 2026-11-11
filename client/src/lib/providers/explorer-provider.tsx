import { createContext, useContext, useReducer, useState } from "react";

import { useQueryStates } from "nuqs";

import { dashboardSearchParams } from "@/lib/search-params";

export const SELECTION_KINDS = ["file", "set"] as const;

/** Identity only: the live node, URLs and sizes come from `useActiveFile`, so a refetch or re-sign never leaves a copy stale. */
export type Selection = {
	/** Tree node id: the S3 key of a file, or the folder key (trailing slash) of a set. */
	id: string;
	kind: (typeof SELECTION_KINDS)[number];
};

type ReducerState = {
	bucketSearchTerm: string;
	selection: Selection | null;
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
			type: "SET_SELECTION";
			payload: Selection | null;
	  };

const initialState: ReducerState = {
	bucketSearchTerm: "",
	attentionFolder: null,
	selection: null,
};

const reducer = (state: ReducerState, action: Action): ReducerState => {
	switch (action.type) {
		case "SET_BUCKET_SEARCH_TERM":
			return { ...state, bucketSearchTerm: action.payload };
		case "SET_SELECTION":
			return { ...state, selection: action.payload };
		case "SET_ATTENTION_FOLDER":
			return { ...state, attentionFolder: action.payload };
		default:
			return state;
	}
};

export type Actions = {
	setBucketSearchTerm: (searchTerm: string) => void;
	select: (selection: Selection) => void;
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
		dispatch({ type: "SET_SELECTION", payload: null });
		dispatch({ type: "SET_ATTENTION_FOLDER", payload: null });
	}

	const actions: Actions = {
		setBucketSearchTerm: (searchTerm) =>
			dispatch({
				type: "SET_BUCKET_SEARCH_TERM",
				payload: searchTerm,
			}),
		select: (selection) => dispatch({ type: "SET_SELECTION", payload: selection }),
		setAttentionFolder: (folder) => dispatch({ type: "SET_ATTENTION_FOLDER", payload: folder }),
		resetActiveState: () => dispatch({ type: "SET_SELECTION", payload: null }),
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
