import { LucideFolder } from "lucide-react";

export const Folder = ({ name, onClick }: { name: string; onClick: () => void }) => (
	<button
		type="button"
		className="w-[150px] max-w-full h-[80px] p-2 border border-line-strong hover:border-fg-1 cursor-pointer rounded-md group"
		onClick={onClick}
		onKeyDown={(e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onClick();
			}
		}}
	>
		<div className="grid place-items-center h-full [&>*]:transition-colors">
			<LucideFolder className="size-6 stroke-fg-2 group-hover:stroke-fg-1" />
			<span className="text-secondary text-center text-fg-1 group-hover:text-fg">{name}</span>
		</div>
	</button>
);
