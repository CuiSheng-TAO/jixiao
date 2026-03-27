"use client";

import type { ReactNode } from "react";

export type CockpitBriefingBlock = {
  title: string;
  content: ReactNode;
};

export type CockpitMetric = {
  title: string;
  value: ReactNode;
  description: string;
};

type CockpitShellProps = {
  title: string;
  description: string;
  guideDescription: string;
  summaryLabel: string;
  summary: string;
  briefingBlocks: CockpitBriefingBlock[];
  metrics: CockpitMetric[];
  main: ReactNode;
  aside?: ReactNode;
};

export function CockpitShell({
  title,
  description,
  guideDescription,
  summaryLabel,
  summary,
  briefingBlocks,
  metrics,
  main,
  aside,
}: CockpitShellProps) {
  return (
    <section className="final-review-cockpit-shell space-y-4 rounded-[var(--radius-3xl)] p-4 md:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.8fr)]">
        <div className="final-review-cockpit-panel rounded-[var(--radius-2xl)] p-5 md:p-6">
          <p className="final-review-cockpit-kicker text-xs font-semibold uppercase tracking-[0.24em]">
            Principles Cockpit
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--cockpit-foreground)]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--cockpit-muted-foreground)]">{description}</p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--cockpit-foreground)]">{guideDescription}</p>
        </div>

        <div className="final-review-cockpit-panel final-review-cockpit-panel-strong rounded-[var(--radius-2xl)] p-5 md:p-6">
          <p className="final-review-cockpit-kicker text-sm font-medium">{summaryLabel}</p>
          <p className="mt-3 text-lg font-semibold leading-8 text-[var(--cockpit-foreground)] md:text-[1.35rem]">{summary}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {briefingBlocks.map((block) => (
          <div key={block.title} className="final-review-cockpit-panel rounded-[var(--radius-2xl)] p-5">
            <p className="text-sm font-semibold text-[var(--cockpit-foreground)]">{block.title}</p>
            <div className="mt-4 text-sm leading-6 text-[var(--cockpit-muted-foreground)]">{block.content}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.title} className="final-review-cockpit-panel rounded-[var(--radius-2xl)] p-5">
            <p className="final-review-cockpit-kicker text-xs font-medium">{metric.title}</p>
            <div className="mt-3 text-2xl font-semibold text-[var(--cockpit-foreground)]">{metric.value}</div>
            <p className="mt-2 text-xs leading-5 text-[var(--cockpit-muted-foreground)]">{metric.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.75fr)]">
        <div className="space-y-4">{main}</div>
        {aside ? <div className="space-y-4">{aside}</div> : null}
      </div>
    </section>
  );
}
