"use client";

import { Fragment } from "react";

import { useExplorer } from "@/lib/providers/explorer-provider";

import { BucketPicker } from "./bucket-picker";
import { CollectionsTrigger } from "./collections-modal";
import { CollectionsProvider } from "./collections-modal/provider";
import { UploadTrigger } from "./upload-modal";
import { UploadProvider } from "./upload-modal/provider";

/** A set shows its folder path; a plain file only its name, as the explorer state holds no folder for it. */
const Breadcrumb = () => {
	const { setPath, fileName } = useExplorer().state.activeFile;
	const segments = setPath ? setPath.split("/") : fileName ? [fileName] : [];

	return (
		<nav aria-label="Selected item" className="flex min-w-0 items-center gap-1.5 font-mono text-secondary">
			<span className="text-fg-2">/</span>
			{segments.map((segment, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: segments can repeat and never reorder
				<Fragment key={index}>
					{index > 0 && <span className="text-fg-2">/</span>}
					<span className={index === segments.length - 1 ? "truncate text-fg-2" : "text-fg-1"}>{segment}</span>
				</Fragment>
			))}
		</nav>
	);
};

export const TopBar = () => (
	<header className="flex h-9 shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-3">
		<div className="flex min-w-0 items-center gap-3">
			<h1 className="text-caption font-medium uppercase tracking-[.06em] text-fg">S3 Explorer</h1>
			<BucketPicker />
			<Breadcrumb />
		</div>

		<nav className="flex items-center gap-2" aria-label="File actions">
			<CollectionsProvider>
				<CollectionsTrigger />
			</CollectionsProvider>
			<UploadProvider>
				<UploadTrigger />
			</UploadProvider>
		</nav>
	</header>
);
