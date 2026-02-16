import clsx from "clsx";
import { LucideSearch } from "lucide-react";

import { useExplorer } from "@/lib/providers/explorer-provider";

export const BucketSearch = ({ disabled }: { disabled: boolean }) => {
	const {
		actions: { setBucketSearchTerm },
		state: { bucketSearchTerm },
	} = useExplorer();

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setBucketSearchTerm(e.target.value);
	};

	return (
		<div className="relative">
			<LucideSearch className="size-4 stroke-neutral-300 absolute top-1/2 left-4 bottom-0 transform -translate-y-1/2" />
			<input
				name="bucket-search"
				type="text"
				className={clsx(
					"pl-10 w-full p-2 rounded-md border border-neutral-500 text-neutral-300 bg-neutral-900 transition-colors text-sm",
					"focus:outline-none focus:border-sky-400 placeholder:text-neutral-500",
					"disabled:opacity-50 disabled:cursor-not-allowed",
				)}
				placeholder="Search buckets..."
				onChange={handleChange}
				value={bucketSearchTerm}
				disabled={disabled}
			/>
		</div>
	);
};
