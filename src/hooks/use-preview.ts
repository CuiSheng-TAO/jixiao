"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { isPreviewMode, getPreviewRole, getPreviewData, PREVIEW_ROLE_LABELS } from "@/lib/preview";
import type { PreviewRole } from "@/lib/preview";

export function usePreview() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const preview = isPreviewMode(searchParams);
  const previewRole = getPreviewRole(searchParams);
  const previewRoleLabel = previewRole ? PREVIEW_ROLE_LABELS[previewRole] : null;

  const enterPreview = useCallback((role: PreviewRole) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preview", role);
    window.location.href = `${pathname}?${params.toString()}`;
  }, [searchParams, pathname]);

  const exitPreview = useCallback(() => {
    window.location.href = pathname;
  }, [pathname]);

  const getData = useCallback((page: string): Record<string, unknown> => {
    if (!previewRole) return {};
    return getPreviewData(previewRole, page);
  }, [previewRole]);

  return {
    preview,
    previewRole,
    previewRoleLabel,
    enterPreview,
    exitPreview,
    getData,
  };
}
