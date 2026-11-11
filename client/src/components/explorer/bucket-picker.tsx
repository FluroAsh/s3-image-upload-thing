"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LucideCheck, LucideChevronDown, LucideDatabase } from "lucide-react";
import { useQueryStates } from "nuqs";

import { Button } from "@/components/ui/button";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useBuckets } from "@/lib/query";
import { dashboardSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import type { Bucket } from "~/shared/types";

import { formatCount, formatSize } from "./utils";

const CREATED_FORMAT = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });

const bucketDetails = (bucket: Bucket) =>
	[
		bucket.BucketRegion,
		bucket.counted ? formatCount(bucket.objectCount, "file", bucket.partial) : "not counted",
		bucket.counted ? formatSize(bucket.totalSizeHuman, bucket.partial) : undefined,
		bucket.CreationDate && `created ${CREATED_FORMAT.format(new Date(bucket.CreationDate))}`,
	]
		.filter(Boolean)
		.join(" · ");

export const BucketPicker = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const [, setParams] = useQueryStates(dashboardSearchParams);
	const { data } = useBuckets();
	const buckets = data?.buckets ?? [];

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<Button aria-label="Choose bucket" className="gap-2 data-[state=open]:border-accent">
					<LucideDatabase className="size-3.5 text-fg-1" />
					<span className="font-mono">{bucketName}</span>
					<span className="font-mono text-fg-2">{bucketRegion}</span>
					<LucideChevronDown className="size-3.5 text-fg-2" />
				</Button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="start"
					sideOffset={4}
					className="z-50 w-[420px] max-w-[calc(100vw-16px)] overflow-hidden rounded-lg border border-line-strong bg-panel text-fg shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
				>
					<div className="max-h-[60vh] overflow-y-auto p-1">
						{buckets.map((bucket) => {
							const isActive = bucket.Name === bucketName && bucket.BucketRegion === bucketRegion;

							return (
								<DropdownMenu.Item
									key={`${bucket.Name}-${bucket.BucketRegion}`}
									onSelect={() => setParams({ bucket: bucket.Name, region: bucket.BucketRegion })}
									className={cn(
										"flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 outline-none transition-colors duration-100 data-[highlighted]:bg-pressed",
										isActive && "bg-raised",
									)}
								>
									<div className="min-w-0 flex-1">
										<div className="truncate font-mono text-body text-fg">{bucket.Name}</div>
										<div className="truncate font-mono text-caption text-fg-2">{bucketDetails(bucket)}</div>
									</div>
									{isActive && <LucideCheck aria-label="Active bucket" className="size-3.5 shrink-0 text-accent" />}
								</DropdownMenu.Item>
							);
						})}
					</div>
					<p className="border-t border-line px-3 py-2 text-caption text-fg-2">
						{buckets.length} {buckets.length === 1 ? "bucket" : "buckets"} in this account
						{buckets.some((bucket) => bucket.partial) && " · counts are lower bounds when the listing stopped early"}
					</p>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
};
