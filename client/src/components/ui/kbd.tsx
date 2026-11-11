export const Kbd = ({ children }: { children: React.ReactNode }) => (
	<kbd className="inline-flex h-chip items-center rounded-sm border border-line-strong bg-raised px-1 font-mono text-caption text-fg-2">
		{children}
	</kbd>
);
