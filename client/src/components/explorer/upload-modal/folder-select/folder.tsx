import { LucideFolder } from "lucide-react";

export const Folder = ({ name, onClick }: { name: string; onClick: () => void }) => (
	<div
		className="w-[150px] max-w-full h-[80px] p-2 border border-neutral-500 hover:border-neutral-300 cursor-pointer hover:shadow-lg rounded-md group"
		onClick={onClick}
	>
		<div className="grid place-items-center h-full [&>*]:transition-colors">
			<LucideFolder className="size-6 stroke-neutral-500 group-hover:stroke-neutral-300" />
			<span className="text-xs text-center text-neutral-300 group-hover:text-neutral-100">{name}</span>
		</div>
	</div>
);
