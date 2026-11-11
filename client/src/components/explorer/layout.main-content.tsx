import { BrowserPanel } from "./panel.browser";
import { DetailsPanel } from "./panel.details";
import { TopBar } from "./top-bar";

export const MainContent = () => (
	<div className="size-full flex flex-col">
		<TopBar />

		<div className="flex h-full overflow-hidden">
			<BrowserPanel />
			<DetailsPanel />
		</div>
	</div>
);
