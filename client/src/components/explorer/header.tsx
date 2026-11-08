"use client";

import { LucideCloud, LucideFolderHeart } from "lucide-react";
import { useQueryState } from "nuqs";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { dashboardSearchParams } from "@/lib/search-params";

import { UploadTrigger } from "./upload-modal";
import { UploadProvider } from "./upload-modal/provider";

const CollectionsButton = () => {
	const { bucketName } = useExplorer().state;
	const [, setShowCollections] = useQueryState("collections", dashboardSearchParams.collections);

	return (
		<button
			type="button"
			disabled={!bucketName}
			onClick={() => setShowCollections(true)}
			className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-neutral-100 font-medium text-sm rounded-lg transition-colors duration-200"
		>
			<LucideFolderHeart className="size-4" />
			Collections
		</button>
	);
};

export const Header = () => {
	return (
		<header className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-600/50 flex items-center justify-between h-16 p-4">
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-3">
					<div className="size-8 rounded-lg bg-sky-500/25 flex items-center justify-center">
						<LucideCloud className="size-4 text-sky-400" />
					</div>
					<div>
						<h1 className="text-lg font-semibold text-neutral-50 tracking-tight">S3 Explorer</h1>
						<p className="text-xs text-slate-300 font-medium">Cloud File Management</p>
					</div>
				</div>
			</div>

			<nav className="flex items-center gap-3" aria-label="File actions">
				<CollectionsButton />
				<UploadProvider>
					<UploadTrigger />
				</UploadProvider>
			</nav>
		</header>
	);
};
