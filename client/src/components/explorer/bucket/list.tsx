"use client";

import { LucideAlertTriangle, LucideDatabase, LucideLoader2, LucideSearchX } from "lucide-react";
import { useQueryStates } from "nuqs";

import type { ApiError } from "@/lib/ofetch";
import { dashboardSearchParams } from "@/lib/search-params";
import type { Bucket } from "~/shared/types";

import { StateMessage } from "../../ui/state-message";
import { serverErrorMessage } from "../utils";
import { BucketCard } from "./card";

type BucketListProps = {
	buckets: Bucket[];
	bucketName: string | undefined;
	isLoading?: boolean;
	isError?: boolean;
	error?: ApiError | null;
	searchTerm?: string;
};

export const BucketList = ({
	buckets,
	bucketName,
	isLoading = false,
	isError = false,
	error,
	searchTerm = "",
}: BucketListProps) => {
	const [, setParams] = useQueryStates(dashboardSearchParams);

	if (isLoading) return <StateMessage size="sm" tone="info" spin icon={LucideLoader2} title="Loading buckets..." />;
	if (isError) {
		return (
			<StateMessage
				size="sm"
				tone="error"
				icon={LucideAlertTriangle}
				title="Failed to load buckets"
				message={error ? serverErrorMessage(error, "Something went wrong. Try again shortly.") : undefined}
			/>
		);
	}

	if (buckets.length === 0 && !searchTerm) {
		return (
			<StateMessage
				size="sm"
				icon={LucideDatabase}
				title="No buckets found"
				message="Create your first S3 bucket to get started"
			/>
		);
	}
	if (buckets.length === 0 && searchTerm) {
		return (
			<StateMessage
				size="sm"
				icon={LucideSearchX}
				title="No buckets matched your search."
				message="Try adjusting your search terms"
			/>
		);
	}

	const handleBucketClick = (name: string, region: string) => {
		// Nuqs updates (shallow update) query params client-side, avoiding extra server fetches and keeping navigation fast.
		// SSR is used only on initial load; interactivity stays smooth for switching buckets.
		setParams({ bucket: name, region });
	};

	return (
		<div className="flex flex-col gap-2 p-4">
			{buckets.map((bucket) => (
				<BucketCard
					key={`${bucket.Name}-${bucket.BucketRegion}`}
					isActive={bucket.Name === bucketName}
					name={bucket.Name}
					region={bucket.BucketRegion}
					formattedCreationDate={bucket.formattedCreationDate}
					totalSizeHuman={bucket.totalSizeHuman}
					objectCount={bucket.objectCount}
					counted={bucket.counted}
					partial={bucket.partial}
					handleClick={() => handleBucketClick(bucket.Name, bucket.BucketRegion)}
				/>
			))}
		</div>
	);
};
