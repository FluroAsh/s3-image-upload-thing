"use client";

import { Fragment, useCallback, useId, useMemo, useRef, useState } from "react";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LucideCheck, LucideChevronDown, LucideDatabase, LucidePin } from "lucide-react";
import { useQueryStates } from "nuqs";

import { Button } from "@/components/ui/button";
import { FilterInput } from "@/components/ui/filter-input";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useBuckets, useSetPinnedBucket } from "@/lib/query";
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

/** Handled on the pin only, so a click neither selects the row nor closes the menu. */
const stopRowSelect = (event: React.SyntheticEvent) => event.stopPropagation();

/** Enter and Space press the pin natively; arrows hand focus back to the row, since Radix only navigates from rows. */
const handlePinKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
	if (event.key === "Enter" || event.key === " ") return event.stopPropagation();
	if (!event.key.startsWith("Arrow")) return;
	event.preventDefault();
	event.stopPropagation();
	event.currentTarget.closest<HTMLElement>("[role=menuitemradio]")?.focus();
};

const PinToggle = ({ pinned, onToggle }: { pinned: boolean; onToggle: () => void }) => (
	<button
		type="button"
		tabIndex={-1}
		aria-label={pinned ? "Unpin default bucket" : "Pin as default bucket"}
		aria-pressed={pinned}
		title={pinned ? "Unpin" : "Pin as default"}
		onPointerDown={stopRowSelect}
		onPointerUp={stopRowSelect}
		onMouseDown={(event) => event.preventDefault()}
		onKeyDown={handlePinKeyDown}
		onClick={(event) => {
			event.stopPropagation();
			onToggle();
		}}
		className={`flex size-6 shrink-0 items-center justify-center rounded-md outline-none hover:bg-raised focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent ${
			pinned
				? "text-accent"
				: "text-fg-2 opacity-0 group-hover:opacity-100 group-data-[highlighted]:opacity-100 group-data-[match]:opacity-100"
		}`}
	>
		<LucidePin className={`size-3.5 ${pinned ? "fill-current" : ""}`} />
	</button>
);

export const BucketPicker = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const [, setParams] = useQueryStates(dashboardSearchParams);
	const { data } = useBuckets();
	const pinnedBucket = data?.pinnedBucket;
	const setPinned = useSetPinnedBucket();
	const buckets = useMemo(() => {
		const all = data?.buckets ?? [];
		return [...all.filter(({ Name }) => Name === pinnedBucket), ...all.filter(({ Name }) => Name !== pinnedBucket)];
	}, [data?.buckets, pinnedBucket]);
	const activePinned = bucketName === pinnedBucket;
	const activeKey = bucketKey({ Name: bucketName, BucketRegion: bucketRegion });
	const [open, setOpen] = useState(false);
	const [filter, setFilter] = useState("");
	const inputRef = useRef<HTMLInputElement | null>(null);
	const firstRowRef = useRef<HTMLDivElement>(null);
	const needle = filterNeedle(filter);
	const visible = needle ? buckets.filter((bucket) => matchesFilter(bucket.Name, needle)) : buckets;
	const rowId = useId();
	/** Focus stays in the filter, so the highlighted match is tracked here; any edit resets it to the top match. */
	const [matchIndex, setMatchIndex] = useState(0);

	const changeFilter = (text: string) => {
		setFilter(text);
		setMatchIndex(0);
	};

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) changeFilter("");
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
		if (needle && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
			event.preventDefault();
			const index = Math.max(0, Math.min(visible.length - 1, matchIndex + (event.key === "ArrowDown" ? 1 : -1)));
			setMatchIndex(index);
			document.getElementById(`${rowId}-${index}`)?.scrollIntoView({ block: "nearest" });
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			firstRowRef.current?.focus();
		} else if (event.key === "Enter" && needle && visible[matchIndex]) {
			event.preventDefault();
			selectBucket(bucketKey(visible[matchIndex]));
			handleOpenChange(false);
		}
	};

	/** Radix moves focus on pointer move and leave, which would pull typed keys out of the filter. */
	const keepFilterFocus = (event: React.PointerEvent) => {
		if (document.activeElement === inputRef.current) event.preventDefault();
	};

	/** ArrowUp on the first row is the keyboard route back to the filter; ArrowRight reaches the row's pin. */
	const handleRowKeyDown = (event: React.KeyboardEvent, index: number) => {
		if (event.key === "ArrowRight") {
			event.preventDefault();
			event.currentTarget.querySelector("button")?.focus();
			return;
		}
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
					title={activePinned ? "Pinned · opens by default" : undefined}
					className="gap-2 data-[state=open]:bg-pressed"
				>
					{activePinned ? (
						<LucidePin className="size-3.5 fill-current text-accent" />
					) : (
						<LucideDatabase className="size-3.5 text-fg-1" />
					)}
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
							onChange={(event) => changeFilter(event.target.value)}
							onKeyDown={handleFilterKeyDown}
							aria-activedescendant={needle && visible.length ? `${rowId}-${matchIndex}` : undefined}
							onClear={() => {
								changeFilter("");
								inputRef.current?.focus();
							}}
						/>
					</div>
					<div className="max-h-[min(60vh,480px)] overflow-y-auto p-1">
						{visible.length === 0 && (
							<output className="block px-2 py-1.5 text-caption text-fg-2">No buckets match “{filter.trim()}”</output>
						)}
						<DropdownMenu.RadioGroup value={activeKey} onValueChange={selectBucket}>
							{visible.map((bucket, index) => (
								<Fragment key={bucketKey(bucket)}>
									<DropdownMenu.RadioItem
										id={`${rowId}-${index}`}
										data-match={needle && index === matchIndex ? "" : undefined}
										ref={index === 0 ? firstRowRef : undefined}
										onPointerMove={keepFilterFocus}
										onPointerLeave={keepFilterFocus}
										onKeyDown={(event) => handleRowKeyDown(event, index)}
										value={bucketKey(bucket)}
										className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 outline-none transition-colors duration-100 hover:bg-pressed data-[highlighted]:bg-pressed data-[match]:bg-pressed [&[data-state=checked]:not(:hover,[data-highlighted],[data-match])]:bg-raised"
									>
										<div className="min-w-0 flex-1">
											<div className="truncate font-mono text-body text-fg">{bucket.Name}</div>
											<div className="truncate font-mono text-caption text-fg-2">{bucketDetails(bucket)}</div>
										</div>
										<PinToggle
											pinned={bucket.Name === pinnedBucket}
											onToggle={() => setPinned.mutate(bucket.Name === pinnedBucket ? null : bucket.Name)}
										/>
										<span className="size-3.5 shrink-0">
											<DropdownMenu.ItemIndicator>
												<LucideCheck className="size-3.5 text-fg" />
											</DropdownMenu.ItemIndicator>
										</span>
									</DropdownMenu.RadioItem>
									{index === 0 && !needle && bucket.Name === pinnedBucket && visible.length > 1 && (
										<DropdownMenu.Separator className="my-1 h-px bg-line" />
									)}
								</Fragment>
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
