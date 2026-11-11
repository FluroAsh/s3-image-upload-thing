"use client";

import { useCallback } from "react";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LucideCheck, LucideChevronDown, LucideDatabase } from "lucide-react";
import { useQueryStates } from "nuqs";

import { Button } from "@/components/ui/button";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useBuckets } from "@/lib/query";
import { dashboardSearchParams } from "@/lib/search-params";
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

const bucketKey = (bucket: Pick<Bucket, "Name" | "BucketRegion">) => `${bucket.Name}|${bucket.BucketRegion}`;

export const BucketPicker = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const [, setParams] = useQueryStates(dashboardSearchParams);
	const { data } = useBuckets();
	const buckets = data?.buckets ?? [];
	const activeKey = bucketKey({ Name: bucketName, BucketRegion: bucketRegion });

	const selectBucket = (key: string) => {
		const bucket = buckets.find((candidate) => bucketKey(candidate) === key);
		if (bucket) setParams({ bucket: bucket.Name, region: bucket.BucketRegion });
	};

	/** Radix focuses the first item after mount, so the active bucket takes focus a tick later. */
	const focusOnMount = useCallback((item: HTMLElement | null) => {
		if (item) setTimeout(() => item.focus());
	}, []);

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<Button
					aria-label={`Choose bucket: ${bucketName} ${bucketRegion}`}
					className="gap-2 data-[state=open]:bg-pressed"
				>
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
					className="z-50 w-[560px] max-w-[calc(100vw-16px)] overflow-hidden rounded-lg border border-line-strong bg-panel text-fg shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
				>
					<div className="max-h-[60vh] overflow-y-auto p-1">
						<DropdownMenu.RadioGroup value={activeKey} onValueChange={selectBucket}>
							{buckets.map((bucket) => (
								<DropdownMenu.RadioItem
									key={bucketKey(bucket)}
									ref={bucketKey(bucket) === activeKey ? focusOnMount : undefined}
									value={bucketKey(bucket)}
									className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 outline-none transition-colors duration-100 data-[highlighted]:bg-pressed data-[state=checked]:bg-raised"
								>
									<div className="min-w-0 flex-1">
										<div className="truncate font-mono text-body text-fg">{bucket.Name}</div>
										<div className="truncate font-mono text-caption text-fg-2">{bucketDetails(bucket)}</div>
									</div>
									<DropdownMenu.ItemIndicator>
										<LucideCheck className="size-3.5 shrink-0 text-fg" />
									</DropdownMenu.ItemIndicator>
								</DropdownMenu.RadioItem>
							))}
						</DropdownMenu.RadioGroup>
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
