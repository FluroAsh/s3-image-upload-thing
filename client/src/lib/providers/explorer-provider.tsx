import { createContext, useContext, useReducer } from "react";

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
			type: "SET_ACTIVE_FILE";
			payload: ActiveFile;
	  };

const initialState: ReducerState = {
	bucketSearchTerm: "",
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
		default:
			return state;
	}
};

export type Actions = {
	setBucketSearchTerm: (searchTerm: string) => void;
	setActiveFile: (file: ActiveFile) => void;
	resetActiveState: () => void;
};

const ExplorerContext = createContext<{ state: State; actions: Actions } | undefined>(undefined);

export const ExplorerProvider = ({ children }: { children: React.ReactNode }) => {
	const [state, dispatch] = useReducer(reducer, initialState);
	const [{ bucket: bucketName, region: bucketRegion }] = useQueryStates(dashboardSearchParams);

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
