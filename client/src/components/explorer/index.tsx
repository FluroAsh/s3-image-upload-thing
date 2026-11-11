"use client";

import { ExplorerProvider } from "@/lib/providers/explorer-provider";

import { MainContent } from "./layout.main-content";

export const ExplorerLayout = () => {
	return (
		<ExplorerProvider>
			<div id="explorer-container" className="overflow-hidden size-full">
				<MainContent />
			</div>
		</ExplorerProvider>
	);
};
