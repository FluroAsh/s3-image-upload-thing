"use client";

import { Fragment } from "react";

import { LucideArrowLeft, LucideSlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { useActiveFile } from "@/hooks/useActiveFile";
import { useExplorer } from "@/lib/providers/explorer-provider";

import { BucketPicker } from "./bucket-picker";
import { CollectionsTrigger } from "./collections-modal";
import { CollectionsProvider } from "./collections-modal/provider";
import { DeployStatus } from "./deploy-status";
import { UploadTrigger } from "./upload-modal";
import { UploadProvider } from "./upload-modal/provider";

const Breadcrumb = () => {
	const activeFile = useActiveFile();
	const segments = activeFile ? [...activeFile.folder.split("/").filter(Boolean), activeFile.name] : [];

	return (
		<nav aria-label="Selected item" className="flex min-w-0 items-center gap-1.5 font-mono text-secondary">
			<span className="text-fg-2">/</span>
			{segments.map((segment, index) => {
				const path = segments.slice(0, index + 1).join("/");

				return (
					<Fragment key={path}>
						{index > 0 && <span className="text-fg-2">/</span>}
						<span className={index === segments.length - 1 ? "truncate text-fg-2" : "text-fg-1"}>{segment}</span>
					</Fragment>
				);
			})}
		</nav>
	);
};

const SettingsIcon = () => <LucideSlidersHorizontal className="size-4" />;

const useBucketHref = (path: "/dashboard" | "/settings") => {
	const { bucketName, bucketRegion } = useExplorer().state;
	return `${path}?${new URLSearchParams({ bucket: bucketName, region: bucketRegion })}`;
};

const SettingsLink = () => (
	<Link href={useBucketHref("/settings")} className={buttonVariants({ variant: "ghost" })}>
		<SettingsIcon />
		Settings
	</Link>
);

const DashboardLink = () => (
	<Link href={useBucketHref("/dashboard")} className={buttonVariants({ variant: "ghost" })}>
		<LucideArrowLeft className="size-4" />
		Dashboard
	</Link>
);

/** On the settings page Settings is the current page, so it is drawn pressed and is not a link. */
const CurrentSettings = () => (
	<span aria-current="page" className={buttonVariants({ variant: "ghost" })}>
		<SettingsIcon />
		Settings
	</span>
);

export const TopBar = ({ page = "dashboard" }: { page?: "dashboard" | "settings" }) => (
	<header className="flex h-topbar shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-3">
		<div className="flex min-w-0 items-center gap-3">
			<h1 className="text-caption font-medium uppercase tracking-[.06em] text-fg">S3 Explorer</h1>
			<BucketPicker />
			{page === "settings" ? <DashboardLink /> : <Breadcrumb />}
		</div>

		{page === "settings" ? (
			<CurrentSettings />
		) : (
			<nav className="flex items-center gap-2" aria-label="File actions">
				<CollectionsProvider>
					<CollectionsTrigger />
				</CollectionsProvider>
				<DeployStatus />
				<SettingsLink />
				<UploadProvider>
					<UploadTrigger />
				</UploadProvider>
			</nav>
		)}
	</header>
);
