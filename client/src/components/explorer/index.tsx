"use client";

import { ExplorerProvider } from "@/lib/providers/explorer-provider";

import { MainContent } from "./layout.main-content";
import { Sidebar } from "./layout.sidebar";

export const ExplorerLayout = () => {
	return (
		<ExplorerProvider>
			<div id="explorer-container" className="flex overflow-hidden size-full">
				<Sidebar />
				<MainContent />
			</div>
		</ExplorerProvider>
	);
};
