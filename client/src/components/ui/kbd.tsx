export const Kbd = ({ children }: { children: React.ReactNode }) => (
	<kbd className="inline-flex h-chip items-center gap-0.5 rounded-sm border border-line-strong bg-raised px-1 font-mono text-caption text-fg-2 [&_svg]:size-3 [&_svg]:shrink-0">
		{children}
	</kbd>
);
