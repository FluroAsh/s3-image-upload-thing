import { Chip } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { useManifest } from "@/lib/query";
import { VARIANT_LONGEST_EDGE, type Variant } from "~/shared/constants/image-variants";

import { ManifestBadge } from "./set-badge";
import { summariseSizes } from "./utils";

const SHORT_NAMES: Record<Variant, string> = {
	placeholder: "plch",
	thumbnail: "thumb",
	small: "sm",
	medium: "md",
	large: "lg",
	full: "full",
};

const SKELETON_CHIPS = 3;

const edge = ({ width, height }: { width: number; height: number }) => Math.max(width, height);

/** Reads the manifest itself; a set without a usable one shows its badge instead of chips. */
export const SizeChips = ({ set }: { set: string }) => {
	const { data, error, isPending } = useManifest(set);

	if (isPending) {
		return (
			<span className="flex gap-1" aria-busy>
				{Array.from({ length: SKELETON_CHIPS }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder chips
					<Skeleton key={i} className="h-chip w-12" />
				))}
			</span>
		);
	}

	if (!data) {
		return error && error.status !== 404 && error.status !== 422 ? (
			<span className="text-caption text-err">Could not load sizes</span>
		) : (
			<ManifestBadge error={error} />
		);
	}

	const { source } = data;

	return (
		<span className="flex flex-wrap gap-1">
			{summariseSizes(data).statuses.map(({ name, state, variant, reason }) => (
				<Chip
					key={name}
					tone={state === "missing" || state === "mismatched" ? state : "default"}
					title={state === "missing" ? "missing" : reason}
				>
					{state === "missing"
						? name
						: `${SHORT_NAMES[name]} ${variant ? edge(variant) : VARIANT_LONGEST_EDGE[name]}${state === "mismatched" ? " ≠" : ""}`}
				</Chip>
			))}
			{source ? (
				<Chip>orig {edge(source)}</Chip>
			) : (
				<Chip tone="missing" title="No original kept">
					original
				</Chip>
			)}
		</span>
	);
};
