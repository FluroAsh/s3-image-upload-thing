import { useQueryState } from "nuqs";

import { dashboardSearchParams } from "@/lib/search-params";

import { Header } from "./header";
import { BrowserPanel } from "./panel.browser";
import { CollectionsView } from "./panel.collections";
import { DetailsPanel } from "./panel.details";

export const MainContent = () => {
	const [showCollections] = useQueryState("collections", dashboardSearchParams.collections);

	return (
		<div className="size-full flex flex-col">
			<Header />

			<div className="flex h-full overflow-hidden">
				{showCollections ? (
					<CollectionsView />
				) : (
					<>
						<BrowserPanel />
						<DetailsPanel />
					</>
				)}
			</div>
		</div>
	);
};
