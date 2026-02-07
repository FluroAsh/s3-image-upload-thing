"use client";

import { LucideCloud } from "lucide-react";

import { UploadTrigger } from "./upload-modal";
import { UploadProvider } from "./upload-modal/provider";

export const Header = () => {
  return (
    <header className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-600/50 flex items-center justify-between h-16 p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-sky-500/25 flex items-center justify-center">
            <LucideCloud className="size-4 text-sky-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-50 tracking-tight">
              S3 Explorer
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              Cloud File Management
            </p>
          </div>
        </div>
      </div>

      <nav
        className="flex items-center gap-3"
        role="navigation"
        aria-label="File actions"
      >
        <UploadProvider>
          <UploadTrigger />
        </UploadProvider>
      </nav>
    </header>
  );
};
