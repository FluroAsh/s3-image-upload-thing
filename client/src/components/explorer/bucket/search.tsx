import { LucideSearch } from "lucide-react";

import { Input } from "@/components/ui/input";
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
			<LucideSearch className="size-4 stroke-fg-1 absolute top-1/2 left-4 bottom-0 transform -translate-y-1/2" />
			<Input
				name="bucket-search"
				type="text"
				className="pl-10"
				placeholder="Search buckets..."
				onChange={handleChange}
				value={bucketSearchTerm}
				disabled={disabled}
			/>
		</div>
	);
};
