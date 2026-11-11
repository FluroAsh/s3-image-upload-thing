import { HardDrive, LucideDatabase, LucideFileText, LucideTimer } from "lucide-react";

import { formatCount, formatSize } from "../utils";

type BucketCardProps = {
	/** Name of the bucket. */
	name: string;
	/** AWS region the bucket lives in. */
	region: string;
	/** Creation date for display. */
	formattedCreationDate: string;
	/** Total size of the bucket's objects for display, e.g. `"1.5 MB"`. */
	totalSizeHuman: string;
	/** Number of objects counted in the bucket. */
	objectCount: number;
	/** `false` when the bucket was never counted, so its size and count read as unknown. */
	counted: boolean;
	/** `true` when the count stopped early, so the size and count are lower bounds. */
	partial: boolean;
	/** Whether this bucket is the one being explored. */
	isActive: boolean;
	/** Selects this bucket. */
	handleClick: () => void;
};

export const BucketCard = ({
	name,
	region,
	formattedCreationDate,
	totalSizeHuman,
	objectCount,
	counted,
	partial,
	isActive,
	handleClick,
}: BucketCardProps) => (
	<button
		type="button"
		className={`group border rounded-lg p-4 cursor-pointer transition-all min-w-0 ${
			isActive ? "bg-accent/12 border-accent/70" : "hover:bg-accent/12 border-line-strong hover:border-accent/50"
		}`}
		onClick={handleClick}
		onKeyDown={(e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleClick();
			}
		}}
	>
		<div className="flex flex-col items-center gap-3">
			<div className="w-full text-center">
				<div title={name} className="flex gap-2 items-center text-base font-semibold truncate text-fg">
					<LucideDatabase className="size-4 shrink-0 text-accent" />
					<h3 className="truncate">{name}</h3>
				</div>

				<div className="flex flex-col gap-2 mt-2 ml-5">
					<span className="text-secondary transition-colors flex items-center">
						<HardDrive className="size-4 inline mr-1" />
						{formatSize(counted ? totalSizeHuman : undefined, partial)}
					</span>

					<span className="text-secondary transition-colors flex items-center">
						<LucideFileText className="size-4 inline mr-1" />
						{formatCount(counted ? objectCount : undefined, "file", partial)}
					</span>

					<span className={`text-secondary transition-colors flex items-center`}>
						<LucideTimer className="size-4 inline mr-1" />
						{formattedCreationDate}
					</span>

					<span className="text-secondary transition-colors rounded-md px-2 py-1 border border-accent/50 bg-accent/12 w-fit text-accent">
						{region}
					</span>
				</div>
			</div>
		</div>
	</button>
);
