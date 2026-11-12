import { createContext, type Dispatch, type SetStateAction, useContext, useState } from "react";

import { useExplorer } from "@/lib/providers/explorer-provider";

export type CollectionsScreen =
	| { screen: "list" }
	| { screen: "create" }
	| { screen: "detail"; slug: string }
	| { screen: "add"; slug: string };

const LIST: CollectionsScreen = { screen: "list" };

type CollectionsContext = {
	screen: CollectionsScreen;
	setScreen: Dispatch<SetStateAction<CollectionsScreen>>;
	resetState: () => void;
};

const Context = createContext<CollectionsContext | null>(null);

export const CollectionsProvider = ({ children }: { children: React.ReactNode }) => {
	const [screen, setScreen] = useState<CollectionsScreen>(LIST);
	const { bucketName, bucketRegion } = useExplorer().state;

	const bucketKey = `${bucketName}/${bucketRegion}`;
	const [shownBucketKey, setShownBucketKey] = useState(bucketKey);
	if (shownBucketKey !== bucketKey) {
		setShownBucketKey(bucketKey);
		setScreen(LIST);
	}

	return (
		<Context.Provider value={{ screen, setScreen, resetState: () => setScreen(LIST) }}>{children}</Context.Provider>
	);
};

export const useCollectionsModal = () => {
	const context = useContext(Context);

	if (!context) {
		throw new Error("useCollectionsModal must be used within a CollectionsProvider");
	}

	return context;
};
