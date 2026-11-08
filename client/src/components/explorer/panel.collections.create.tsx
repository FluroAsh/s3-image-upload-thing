import { useState } from "react";

import { LucidePlus } from "lucide-react";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCollections, useCreateCollection } from "@/lib/query";
import { holdingSet, setsToMove } from "~/shared/collections";

import { useBucketSets } from "./use-bucket-sets";
import { foldersAbove, serverErrorMessage } from "./utils";

const FIELD_CLASS = "w-full rounded-lg bg-slate-700/60 border border-slate-600 p-2 text-sm text-neutral-100";

export const CreateCollection = () => {
	const { sets } = useBucketSets();
	const { data } = useCollections();
	const create = useCreateCollection();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [picked, setPicked] = useState<Set<string>>(new Set());

	const folders = foldersAbove([...sets.values()].map((folder) => folder.id));

	const toggle = (set: string) =>
		setPicked((prev) => {
			const next = new Set(prev);
			if (!next.delete(set)) next.add(set);
			return next;
		});

	const pickFolder = (folderId: string) =>
		setPicked(
			(prev) => new Set([...prev, ...[...sets].filter(([, f]) => f.id.startsWith(folderId)).map(([set]) => set)]),
		);

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const chosen = [...sets.keys()].filter((set) => picked.has(set));
		const moving = setsToMove(data, chosen, null);
		const list = moving.map(({ set, from }) => `${set} (from "${from.name}")`).join("\n");
		if (moving.length && !window.confirm(`Move these sets out of their collections?\n\n${list}`)) return;

		create.mutate(
			{ name: name.trim(), sets: chosen },
			{
				onSuccess: () => {
					setOpen(false);
					setName("");
					setPicked(new Set());
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-neutral-100 font-medium text-sm rounded-lg">
				<LucidePlus className="size-4" />
				New collection
			</DialogTrigger>

			<DialogContent className="max-w-[560px] w-full bg-slate-900 border-slate-700">
				<DialogTitle className="text-xl font-semibold text-neutral-100">New collection</DialogTitle>
				<form onSubmit={onSubmit} className="space-y-3">
					<input
						aria-label="Name"
						placeholder="Name"
						className={FIELD_CLASS}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<select
						aria-label="Add all sets in folder"
						className={FIELD_CLASS}
						value=""
						onChange={(e) => pickFolder(e.target.value)}
					>
						<option value="">Add all sets in folder…</option>
						{folders.map((folder) => (
							<option key={folder} value={folder}>
								{folder}
							</option>
						))}
					</select>

					<ul className="max-h-64 overflow-y-auto space-y-1">
						{[...sets].map(([set, folder]) => {
							const held = holdingSet(data, set)?.collection;
							return (
								<li key={set}>
									<label className="flex items-center gap-2 text-sm text-neutral-100">
										<input type="checkbox" checked={picked.has(set)} onChange={() => toggle(set)} />
										<span className="truncate">{folder.id}</span>
										{held && <span className="ml-auto text-xs text-amber-400">in {held.name}</span>}
									</label>
								</li>
							);
						})}
					</ul>

					{create.error && (
						<p className="text-sm text-red-500">{serverErrorMessage(create.error, "Could not create.")}</p>
					)}

					<button
						type="submit"
						disabled={!name.trim() || !picked.size || create.isPending}
						className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-neutral-100 text-sm font-medium rounded-lg"
					>
						Create
					</button>
				</form>
			</DialogContent>
		</Dialog>
	);
};
