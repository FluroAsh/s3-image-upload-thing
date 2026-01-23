import { LucideChevronRight, LucideCloud } from "lucide-react";

interface BucketCardProps {
  name: string;
  region: string;
  formattedCreationDate: string;
  isActive: boolean;
  handleClick: () => void;
}

export const BucketCard = ({
  name,
  region,
  formattedCreationDate,
  isActive,
  handleClick,
}: BucketCardProps) => {
  return (
    <div
      onClick={handleClick}
      className={`group border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
        isActive
          ? "bg-sky-900/50 border-sky-400/70 shadow-lg shadow-sky-500/20"
          : "bg-slate-800/90 hover:bg-slate-750 border-slate-600/60 hover:border-sky-400/50 hover:shadow-sky-500/10"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Icon container */}
        <div
          className={`size-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            isActive
              ? "bg-sky-500/30 border border-sky-400/60"
              : "bg-sky-500/20 border border-sky-500/30"
          }`}
        >
          <LucideCloud
            className={`size-5 transition-colors ${
              isActive ? "text-sky-200" : "text-sky-400"
            }`}
          />
        </div>

        {/* Content section */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-base font-semibold truncate transition-colors ${
              isActive
                ? "text-sky-50"
                : "text-neutral-100 group-hover:text-sky-100"
            }`}
          >
            {name}
          </h3>
          <div className="flex items-center gap-4 mt-1">
            <span
              className={`text-xs transition-colors ${
                isActive ? "text-sky-200" : "text-slate-400"
              }`}
            >
              {region}
            </span>
            <span
              className={`text-xs transition-colors ${
                isActive ? "text-sky-300" : "text-slate-500"
              }`}
            >
              {formattedCreationDate}
            </span>
          </div>
        </div>

        {/* Action indicator */}
        <div
          className={`size-4 flex items-center justify-center transition-all ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <LucideChevronRight
            className={`size-4 transition-colors ${
              isActive
                ? "text-sky-300"
                : "text-slate-400 group-hover:text-sky-400"
            }`}
          />
        </div>
      </div>
    </div>
  );
};
