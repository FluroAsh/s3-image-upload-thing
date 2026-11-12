/** For work whose end is unknown, such as one upload request that reports nothing until it finishes. */
export const IndeterminateBar = ({ label }: { label: string }) => (
	<div role="progressbar" aria-label={label} className="h-1 overflow-hidden rounded-full bg-raised">
		<div className="h-full w-2/5 animate-indeterminate motion-reduce:animate-none rounded-full bg-accent" />
	</div>
);
