import { Header } from "./header";
import { BrowserPanel } from "./panel.browser";
import { DetailsPanel } from "./panel.details";

export const MainContent = () => (
	<div className="size-full flex flex-col">
		<Header />

		<div className="flex h-full overflow-hidden">
			<BrowserPanel />
			<DetailsPanel />
		</div>
	</div>
);
