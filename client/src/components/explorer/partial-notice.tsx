import { LucideHourglass } from "lucide-react";

import { StateMessage } from "../ui/state-message";
import { formatCount } from "./utils";

export const PartialNotice = ({ count }: { count: number }) => (
	<StateMessage
		size="inline"
		tone="info"
		icon={LucideHourglass}
		title={`Showing the first ${formatCount(count, "item", false)}`}
		message="The listing took too long, so later folders and files are missing."
	/>
);
