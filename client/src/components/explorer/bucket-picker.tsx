"use client";

import { useCallback, useRef, useState } from "react";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LucideCheck, LucideChevronDown, LucideDatabase } from "lucide-react";
import { useQueryStates } from "nuqs";

import { Button } from "@/components/ui/button";
import { FilterInput } from "@/components/ui/filter-input";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useBuckets } from "@/lib/query";
import { dashboardSearchParams } from "@/lib/search-params";
import type { Bucket } from "~/shared/types";

import { filterNeedle, formatCount, formatSize, matchesFilter } from "./utils";

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
	const [open, setOpen] = useState(false);
	const [filter, setFilter] = useState("");
	const inputRef = useRef<HTMLInputElement | null>(null);
	const firstRowRef = useRef<HTMLDivElement>(null);
	const needle = filterNeedle(filter);
	const visible = needle ? buckets.filter((bucket) => matchesFilter(bucket.Name, needle)) : buckets;

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) setFilter("");
	};

	const selectBucket = (key: string) => {
		const bucket = buckets.find((candidate) => bucketKey(candidate) === key);
		if (bucket) setParams({ bucket: bucket.Name, region: bucket.BucketRegion });
	};

	/** Radix focuses the content after mount, so the filter takes focus a tick later. */
	const focusOnMount = useCallback((input: HTMLInputElement | null) => {
		inputRef.current = input;
		if (input) setTimeout(() => input.focus());
	}, []);

	/** The menu's typeahead and roving focus would swallow typed keys, so only Escape reaches it. */
	const handleFilterKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Escape") return;
		event.stopPropagation();
		if (event.key === "ArrowDown") {
			event.preventDefault();
			firstRowRef.current?.focus();
		} else if (event.key === "Enter" && needle && visible[0]) {
			event.preventDefault();
			selectBucket(bucketKey(visible[0]));
			handleOpenChange(false);
		}
	};

	/** Radix moves focus on pointer move and leave, which would pull typed keys out of the filter. */
	const keepFilterFocus = (event: React.PointerEvent) => {
		if (document.activeElement === inputRef.current) event.preventDefault();
	};

	/** ArrowUp on the first row is the keyboard route back to the filter. */
	const handleRowKeyDown = (event: React.KeyboardEvent, index: number) => {
		if (event.key !== "ArrowUp" || index !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		inputRef.current?.focus();
	};

	return (
		<DropdownMenu.Root open={open} onOpenChange={handleOpenChange}>
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
					<div className="border-b border-line p-1">
						<FilterInput
							ref={focusOnMount}
							aria-label="Filter buckets"
							placeholder="Filter buckets"
							value={filter}
							onChange={(event) => setFilter(event.target.value)}
							onKeyDown={handleFilterKeyDown}
							onClear={() => {
								setFilter("");
								inputRef.current?.focus();
							}}
						/>
					</div>
					<div className="max-h-[60vh] overflow-y-auto p-1">
						{visible.length === 0 && (
							<output className="block px-2 py-1.5 text-caption text-fg-2">No buckets match “{filter.trim()}”</output>
						)}
						<DropdownMenu.RadioGroup value={activeKey} onValueChange={selectBucket}>
							{visible.map((bucket, index) => (
								<DropdownMenu.RadioItem
									key={bucketKey(bucket)}
									ref={index === 0 ? firstRowRef : undefined}
									onPointerMove={keepFilterFocus}
									onPointerLeave={keepFilterFocus}
									onKeyDown={(event) => handleRowKeyDown(event, index)}
									value={bucketKey(bucket)}
									className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 outline-none transition-colors duration-100 hover:bg-pressed data-[highlighted]:bg-pressed data-[state=checked]:bg-raised"
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
						{needle && `${visible.length} of `}
						{formatCount(buckets.length, "bucket", false)}
						{!needle && " in this account"}
						{buckets.some((bucket) => bucket.partial) && " · counts are lower bounds when the listing stopped early"}
					</p>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
};
