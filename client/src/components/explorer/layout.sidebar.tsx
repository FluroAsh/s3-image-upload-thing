"use client";

import { LucideDatabase, LucideSettings } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useBuckets } from "@/lib/query";

import { BucketList } from "./bucket/list";
import { BucketSearch } from "./bucket/search";
import { formatCount } from "./utils";

export const Sidebar = () => {
	const { data: bucketData, isLoading, isError, error } = useBuckets();

	const { bucketSearchTerm, bucketName: activeBucketName } = useExplorer().state;

	const totalCount = bucketData?.totalCount ?? 0;
	const totalObjectCount = formatCount(bucketData?.totalObjectCount ?? 0, undefined, bucketData?.partial ?? false);
	const buckets = bucketData?.buckets ?? [];

	const filteredBuckets = buckets.filter((bucket) =>
		bucket.Name?.toLowerCase().includes(bucketSearchTerm.toLowerCase()),
	);

	return (
		<aside className="min-w-[300px] max-w-[300px] h-full bg-canvas flex flex-col border-r border-line">
			<header className="flex flex-col shrink-0">
				<div className="flex items-center gap-2 p-4">
					<div className="size-8 rounded-lg bg-accent/12 flex items-center justify-center">
						<LucideDatabase className="size-4 stroke-accent" />
					</div>
					<span className="text-fg font-semibold">Buckets</span>
				</div>

				<div className="pb-4 px-4">
					<BucketSearch disabled={isLoading} />
				</div>

				<Separator />
			</header>

			<section className="shrink-0" aria-labelledby="bucket-collection-summary-heading">
				<div className="p-4">
					<h2 id="bucket-collection-summary-heading" className="sr-only">
						Bucket Collection Summary
					</h2>
					<p className="text-body text-fg-1">Total Buckets: {isLoading ? "..." : totalCount}</p>
					<p className="text-body text-fg-1">Total Files: {isLoading ? "..." : totalObjectCount}</p>
				</div>
				<Separator />
			</section>

			<ScrollArea className="flex-1 min-h-0">
				<BucketList
					buckets={filteredBuckets}
					bucketName={activeBucketName}
					isLoading={isLoading}
					isError={isError}
					error={error}
					searchTerm={bucketSearchTerm}
				/>
			</ScrollArea>

			<footer className="p-3 border-t border-line shrink-0">
				<span className="sr-only">Account Settings</span>
				<button
					type="button"
					onClick={() => console.log("Open settings modal")}
					className="w-full justify-start gap-2 text-body hover:bg-accent/12 hover:text-accent transition-colors hover:cursor-pointer rounded-md p-2"
				>
					<LucideSettings className="size-4 inline mr-1.5" />
					Settings
				</button>
			</footer>
		</aside>
	);
};
