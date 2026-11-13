"use client";

import { TopBar } from "@/components/explorer/top-bar";
import { Tabs } from "@/components/ui/tabs";
import { ExplorerProvider, useExplorer } from "@/lib/providers/explorer-provider";

import { DeployHooksTab } from "./deploy-hooks-tab";

const Content = () => {
	const { bucketName, bucketRegion } = useExplorer().state;

	return (
		<main className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
			<div className="mx-auto w-full max-w-[720px]">
				<Tabs defaultValue="hooks">
					<DeployHooksTab key={`${bucketName}|${bucketRegion}`} />
				</Tabs>
			</div>
		</main>
	);
};

export const SettingsPage = () => (
	<ExplorerProvider>
		<div className="flex h-screen flex-col overflow-hidden">
			<TopBar page="settings" />
			<Content />
		</div>
	</ExplorerProvider>
);
