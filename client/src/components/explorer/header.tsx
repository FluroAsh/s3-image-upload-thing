"use client";

import { LucideCloud } from "lucide-react";

import { CollectionsTrigger } from "./collections-modal";
import { CollectionsProvider } from "./collections-modal/provider";
import { UploadTrigger } from "./upload-modal";
import { UploadProvider } from "./upload-modal/provider";

export const Header = () => {
	return (
		<header className="bg-panel/90 backdrop-blur-sm border-b border-line flex items-center justify-between h-16 p-4">
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-3">
					<div className="size-8 rounded-lg bg-accent/12 flex items-center justify-center">
						<LucideCloud className="size-4 text-accent" />
					</div>
					<div>
						<h1 className="text-lg font-semibold text-fg tracking-tight">S3 Explorer</h1>
						<p className="text-xs text-fg-1 font-medium">Cloud File Management</p>
					</div>
				</div>
			</div>

			<nav className="flex items-center gap-3" aria-label="File actions">
				<CollectionsProvider>
					<CollectionsTrigger />
				</CollectionsProvider>
				<UploadProvider>
					<UploadTrigger />
				</UploadProvider>
			</nav>
		</header>
	);
};
