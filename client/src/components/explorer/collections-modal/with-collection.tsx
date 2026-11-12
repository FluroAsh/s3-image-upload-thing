import { useEffect } from "react";

import { LucideAlertTriangle, LucideLoader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogBody, DialogClose } from "@/components/ui/dialog";
import { StateMessage } from "@/components/ui/state-message";
import { useCollections } from "@/lib/query";
import type { Collection } from "~/shared/types";

import { serverErrorMessage } from "../utils";
import { useCollectionsModal } from "./provider";
import { ScreenFooter, ScreenHeader } from "./screen-frame";

/** Resolves a collection by slug for the screens that edit one, showing the loading and failed states itself. */
export const WithCollection = ({
	slug,
	children,
}: {
	slug: string;
	children: (collection: Collection) => React.ReactNode;
}) => {
	const { setScreen } = useCollectionsModal();
	const { data, error, refetch } = useCollections();

	const collection = data?.collections.find((c) => c.slug === slug);

	/** Removing the last photo deletes the collection. */
	useEffect(() => {
		if (data && !collection) setScreen({ screen: "list" });
	}, [data, collection, setScreen]);

	if (collection) return children(collection);

	return (
		<>
			<ScreenHeader title="Collection" onBack={() => setScreen({ screen: "list" })} backLabel="Back to collections" />
			<DialogBody className="min-h-[240px]">
				{error ? (
					<div className="flex flex-col items-center">
						<StateMessage
							tone="err"
							icon={LucideAlertTriangle}
							title="Failed to load collection"
							message={serverErrorMessage(error)}
						/>
						<Button onClick={() => refetch()}>Retry</Button>
					</div>
				) : (
					<StateMessage spin icon={LucideLoader2} title="Loading collection..." />
				)}
			</DialogBody>
			<ScreenFooter>
				<DialogClose asChild>
					<Button>Close</Button>
				</DialogClose>
			</ScreenFooter>
		</>
	);
};
