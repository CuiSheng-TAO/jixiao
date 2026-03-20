"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STAR_DESCRIPTIONS: Record<number, string> = {
  5: "取得杰出的成果，所做的工作在世界范围拥有领先性",
  4: "超出期望的成果，所做的工作在行业内具有竞争力",
  3: "符合预期的成果，始终如一地完成工作职责",
  2: "成果不达预期，需要提高",
  1: "成果远低于预期，未达合格标准",
};

interface StarRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const;

export function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md",
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const activeValue = hovered ?? value;
  const iconSize = SIZE_MAP[size];

  return (
    <div className="space-y-1">
      <div
        className="flex gap-1"
        onMouseLeave={() => setHovered(null)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = activeValue != null && n <= activeValue;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(n)}
              onMouseEnter={() => !disabled && setHovered(n)}
              className={cn(
                "rounded-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              )}
            >
              <Star
                className={cn(
                  iconSize,
                  "transition-colors",
                  filled
                    ? "fill-amber-400 text-amber-400"
                    : "fill-transparent text-border"
                )}
              />
            </button>
          );
        })}
      </div>
      {activeValue != null && (
        <p className="text-xs text-muted-foreground">
          {activeValue}星 - {STAR_DESCRIPTIONS[activeValue]}
        </p>
      )}
    </div>
  );
}
