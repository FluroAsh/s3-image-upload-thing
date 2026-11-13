"use client";

import { useState } from "react";

import { TopBar } from "@/components/explorer/top-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExplorerProvider, useExplorer } from "@/lib/providers/explorer-provider";
import { useDeployHooks } from "@/lib/query";

import { DeployHooksTab } from "./deploy-hooks-tab";

const DeployHooksTrigger = () => {
	const { data } = useDeployHooks();

	return (
		<TabsTrigger value="hooks">
			Deploy hooks
			{data && <span className="font-mono text-caption text-fg-2">{data.hooks.length}</span>}
		</TabsTrigger>
	);
};

const Content = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);

	return (
		<main className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
			<div className="mx-auto w-full max-w-[720px]">
				<Tabs defaultValue="hooks">
					<TabsList aria-label="Settings" actionsRef={setActionsSlot}>
						<DeployHooksTrigger />
					</TabsList>
					<TabsContent value="hooks">
						<DeployHooksTab key={`${bucketName}|${bucketRegion}`} actionsSlot={actionsSlot} />
					</TabsContent>
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
