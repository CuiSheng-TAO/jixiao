"use client";

import { Suspense } from "react";
import { usePreview } from "@/hooks/use-preview";
import { AlertTriangle } from "lucide-react";

function PreviewBannerInner() {
  const { preview, previewRoleLabel, exitPreview } = usePreview();

  if (!preview) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-amber-300 bg-amber-50 px-6 py-2.5">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
        <AlertTriangle className="h-4 w-4" />
        <span>
          你正在预览【{previewRoleLabel}】视角 — 此模式下所有操作不会生效
        </span>
      </div>
      <button
        onClick={exitPreview}
        className="rounded-md border border-amber-400 bg-white px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
      >
        退出预览
      </button>
    </div>
  );
}

export function PreviewBanner() {
  return (
    <Suspense>
      <PreviewBannerInner />
    </Suspense>
  );
}
