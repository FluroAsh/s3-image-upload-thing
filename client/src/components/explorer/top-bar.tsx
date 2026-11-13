"use client";

import { Fragment } from "react";

import { LucideArrowLeft, LucideSlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { useActiveFile } from "@/hooks/useActiveFile";
import { useBucketHref } from "@/lib/use-bucket-href";

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

const settingsIcon = <LucideSlidersHorizontal className="size-4" />;
const dashboardIcon = <LucideArrowLeft className="size-4" />;

type PageLinkProps = {
	path: "/dashboard" | "/settings";
	icon: React.ReactNode;
	/** The page being shown: drawn pressed and not a link. */
	current?: boolean;
	children: string;
};

const PageLink = ({ path, icon, current = false, children }: PageLinkProps) => {
	const href = useBucketHref(path);
	const className = buttonVariants({ variant: "ghost" });

	return current ? (
		<span aria-current="page" className={className}>
			{icon}
			{children}
		</span>
	) : (
		<Link href={href} className={className}>
			{icon}
			{children}
		</Link>
	);
};

export const TopBar = ({ page = "dashboard" }: { page?: "dashboard" | "settings" }) => (
	<header className="flex h-topbar shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-3">
		<div className="flex min-w-0 items-center gap-3">
			<h1 className="text-caption font-medium uppercase tracking-[.06em] text-fg">S3 Explorer</h1>
			<BucketPicker />
			{page === "settings" ? (
				<nav aria-label="Back">
					<PageLink path="/dashboard" icon={dashboardIcon}>
						Dashboard
					</PageLink>
				</nav>
			) : (
				<Breadcrumb />
			)}
		</div>

		{page === "settings" ? (
			<nav aria-label="Pages">
				<PageLink path="/settings" icon={settingsIcon} current>
					Settings
				</PageLink>
			</nav>
		) : (
			<nav className="flex items-center gap-2" aria-label="File actions">
				<CollectionsProvider>
					<CollectionsTrigger />
				</CollectionsProvider>
				<DeployStatus />
				<PageLink path="/settings" icon={settingsIcon}>
					Settings
				</PageLink>
				<UploadProvider>
					<UploadTrigger />
				</UploadProvider>
			</nav>
		)}
	</header>
);
