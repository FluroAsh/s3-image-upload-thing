import { Badge } from "@/components/ui/badge";
import type { ApiError } from "@/lib/ofetch";
import { useManifest } from "@/lib/query";
import type { Manifest } from "~/shared/types";

import { formatCount, summariseSizes } from "./utils";

/** Nothing while the manifest loads or when the request failed for another reason. */
export const ManifestBadge = ({ manifest, error }: { manifest?: Manifest; error: ApiError | null }) => {
	const status = (() => {
		if (error?.status === 404) return { tone: "err", label: "No manifest" } as const;
		if (error?.status === 422) return { tone: "err", label: "Unreadable manifest" } as const;
		if (!manifest) return null;

		const { missing, mismatched } = summariseSizes(manifest);
		if (missing) return { tone: "warn", label: `${formatCount(missing, "size", false)} missing` } as const;
		if (mismatched) return { tone: "warn", label: `${mismatched} mismatched` } as const;
		return { tone: "ok", label: "Complete" } as const;
	})();

	return (
		status && (
			<Badge tone={status.tone} className="shrink-0 whitespace-nowrap">
				{status.label}
			</Badge>
		)
	);
};

/** Reads the manifest itself, so mount it where it stays mounted: a badge that appears only on error re-triggers the refetch that unmounts it. */
export const SetBadge = ({ set }: { set: string }) => {
	const { data, error } = useManifest(set);
	return <ManifestBadge manifest={data} error={error} />;
};
