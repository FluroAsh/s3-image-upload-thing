import { LucideAlertTriangle, LucideCheck, LucideLoader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { StateMessage } from "@/components/ui/state-message";
import { useAttachOriginal, useGenerateSizes, useManifest } from "@/lib/query";
import type { Manifest, TreeNode } from "~/shared/types";

import { InspectorSection } from "./inspector";
import { OriginalUpload } from "./original-upload";
import { ManifestBadge } from "./set-badge";
import { Legend, SizeRow } from "./size-row";
import { formatCount, pickPreviewVariant, serverErrorMessage, sizeRank, summariseSizes, variantOf } from "./utils";

const SizeRows = ({
	manifest,
	set,
	imageUrl,
	variants,
}: {
	manifest: Manifest;
	set: string;
	imageUrl?: string;
	variants: TreeNode[];
}) => {
	const { source } = manifest;
	const { statuses, missing } = summariseSizes(manifest);
	const generate = useGenerateSizes(set);
	const attach = useAttachOriginal(set);
	const failure = attach.error
		? { title: "Could not upload original", error: attach.error }
		: generate.error
			? { title: "Could not generate sizes", error: generate.error }
			: null;
	const written = generate.data?.generated ?? [];

	return (
		<InspectorSection
			title="Sizes"
			aside={
				<span className="font-mono text-caption text-fg-2">
					{statuses.length - missing} OF {statuses.length}
				</span>
			}
		>
			<div>
				{statuses.map((status) => (
					<SizeRow
						key={status.name}
						status={status}
						href={status.variant ? pickPreviewVariant(variants, [status.name])?.presignedUrl : undefined}
						generating={generate.isPending && status.state === "missing"}
						written={written.includes(status.name)}
					/>
				))}
			</div>
			<Legend linked={variants.length > 0} />
			<div className="mt-3 flex flex-wrap items-center gap-2">
				{source && missing > 0 && (
					<>
						<Button
							pending={generate.isPending}
							onClick={() => {
								attach.reset();
								generate.mutate();
							}}
						>
							{generate.isPending ? "Generating..." : `Generate ${formatCount(missing, "missing size", false)}`}
						</Button>
						<span className="text-caption text-fg-2">from the kept original</span>
					</>
				)}
				{!source && missing > 0 && (
					<p className="w-full text-caption text-fg-2">
						Missing sizes can&apos;t be generated here. Re-upload the original to fill them.
					</p>
				)}
				{!source && imageUrl && <OriginalUpload attach={attach} imageUrl={imageUrl} onStart={generate.reset} />}
			</div>
			{failure && (
				<StateMessage
					size="inline"
					tone="err"
					icon={LucideAlertTriangle}
					title={failure.title}
					message={serverErrorMessage(failure.error)}
					className="mt-2"
				/>
			)}
			{generate.isSuccess && written.length > 0 && (
				<StateMessage
					size="inline"
					tone="ok"
					icon={LucideCheck}
					title={`Generated ${written.join(", ")}`}
					message="The manifest was refetched."
					className="mt-2"
				/>
			)}
		</InspectorSection>
	);
};

const SKELETON_ROWS = 4;

/** `imageUrl` is the set's image on show; without one there is nothing to compare an original against, so no upload is offered. `variants` are the set's tree files, listed when it has no manifest. */
export const Sizes = ({ set, imageUrl, variants = [] }: { set: string; imageUrl?: string; variants?: TreeNode[] }) => {
	const { data, error, isPending, isFetching, refetch } = useManifest(set);

	if (isPending) {
		return (
			<InspectorSection
				title="Sizes"
				aside={<LucideLoader2 aria-label="Loading" className="size-3 animate-spin text-fg-2" />}
			>
				<div className="space-y-2.5 py-1">
					{Array.from({ length: SKELETON_ROWS }, (_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
						<Skeleton key={i} className="w-full" />
					))}
				</div>
			</InspectorSection>
		);
	}

	if (error?.status === 404 || error?.status === 422) {
		const none = error.status === 404;
		return (
			<InspectorSection title="Sizes" aside={<ManifestBadge error={error} />}>
				<p className="text-secondary text-fg-1">
					{none
						? `This set predates manifests.${variants.length ? ` The ${variants.length} files in the folder are listed below from the tree; sizes can't be checked.` : " Sizes can't be checked."}`
						: "manifest.json in this folder did not parse (422). Re-upload the set to rewrite it."}
				</p>
				{none && variants.length > 0 && (
					<span className="mt-2 flex flex-wrap gap-1">
						{variants
							.map(({ name }) => variantOf(name))
							.sort((a, b) => sizeRank(a) - sizeRank(b))
							.map((name) => (
								<Chip key={name}>{name}</Chip>
							))}
					</span>
				)}
			</InspectorSection>
		);
	}

	if (error) {
		return (
			<InspectorSection title="Sizes">
				<StateMessage
					size="inline"
					tone="err"
					icon={LucideAlertTriangle}
					title="Could not load set info"
					message={serverErrorMessage(error)}
				/>
				<Button variant="ghost" className="mt-1" pending={isFetching} onClick={() => refetch()}>
					Retry
				</Button>
			</InspectorSection>
		);
	}

	return <SizeRows manifest={data} set={set} imageUrl={imageUrl} variants={variants} />;
};
