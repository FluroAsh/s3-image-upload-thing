import { HardDrive, LucideDatabase, LucideFileText, LucideTimer } from "lucide-react";

interface BucketCardProps {
	name: string;
	region: string;
	formattedCreationDate: string;
	totalSizeHuman: string;
	objectCount: number;
	isActive: boolean;
	handleClick: () => void;
}

export const BucketCard = ({
	name,
	region,
	formattedCreationDate,
	totalSizeHuman,
	objectCount,
	isActive,
	handleClick,
}: BucketCardProps) => (
	<button
		type="button"
		className={`group border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg min-w-0 ${
			isActive
				? "bg-sky-900/50 border-sky-400/70 shadow-lg shadow-sky-500/20"
				: "hover:bg-sky-900/10 border-slate-600/60 hover:border-sky-400/50 hover:shadow-sky-500/10"
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
			{/* Content section */}
			<div className="w-full text-center">
				<div
					title={name}
					className={`flex gap-2 items-center text-base font-semibold truncate transition-colors ${
						isActive ? "text-sky-50" : "text-neutral-100 group-hover:text-sky-100"
					}`}
				>
					<LucideDatabase
						className={`size-4 transition-colors shrink-0 ${isActive ? "text-sky-200" : "text-sky-400"}`}
					/>
					<h3 className="truncate">{name}</h3>
				</div>

				{/* Attributes section */}
				<div className="flex flex-col gap-2 mt-2 ml-5">
					<span className="text-xs transition-colors flex items-center">
						<HardDrive className="size-4 inline mr-1" />
						{totalSizeHuman}
					</span>

					<span className="text-xs transition-colors flex items-center">
						<LucideFileText className="size-4 inline mr-1" />
						{objectCount} files
					</span>

					<span className={`text-xs transition-colors flex items-center`}>
						<LucideTimer className="size-4 inline mr-1" />
						{formattedCreationDate}
					</span>

					<span className="text-xs transition-colors rounded-md px-2 py-1 border border-sky-500/50 bg-sky-500/10 w-fit text-sky-200">
						{region}
					</span>
				</div>
			</div>
		</div>
	</button>
);
