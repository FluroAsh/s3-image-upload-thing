import type { ReactNode } from "react";

import { SECTION_LABEL } from "@/components/ui/section-label";

const BYTE_UNITS = ["B", "kB", "MB", "GB"];

export const formatBytes = (bytes: number): string => {
	const unit = Math.min(Math.floor(Math.log10(Math.max(bytes, 1)) / 3), BYTE_UNITS.length - 1);
	return `${+(bytes / 1000 ** unit).toFixed(unit ? 1 : 0)} ${BYTE_UNITS[unit]}`;
};

/** A labelled block of the inspector; `aside` sits at the right of the label. */
export const InspectorSection = ({
	title,
	aside,
	children,
}: {
	title: string;
	aside?: ReactNode;
	children: ReactNode;
}) => (
	<section className="border-b border-line px-3 py-3 last:border-b-0">
		<div className="mb-1.5 flex h-chip items-center justify-between">
			<h3 className={SECTION_LABEL}>{title}</h3>
			{aside}
		</div>
		{children}
	</section>
);

/** A key / value row; the value is mono and truncates, with the full text in `title`. */
export const Field = ({ label, children, title }: { label: string; children: ReactNode; title?: string }) => (
	<div className="grid h-row grid-cols-[theme(spacing.label)_1fr] items-center gap-2 text-body">
		<dt className="text-fg-2">{label}</dt>
		<dd className="truncate font-mono text-fg" title={title}>
			{children}
		</dd>
	</div>
);
