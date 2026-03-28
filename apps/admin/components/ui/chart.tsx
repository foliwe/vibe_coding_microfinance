"use client";

import type { CSSProperties, ReactNode } from "react";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: ReactNode;
}) {
  const style = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [`--color-${key}`, value.color]),
  ) as CSSProperties;

  return (
    <div className={cx("chart-container", className)} style={style}>
      {children}
    </div>
  );
}

export function ChartLegendContent({
  config,
  keys,
}: {
  config: ChartConfig;
  keys: string[];
}) {
  return (
    <ul className="chart-legend" aria-label="Chart legend">
      {keys.map((key) => (
        <li key={key}>
          <span
            className="chart-legend-dot"
            style={{ background: config[key]?.color }}
            aria-hidden="true"
          />
          <span>{config[key]?.label ?? key}</span>
        </li>
      ))}
    </ul>
  );
}

export function ChartTooltipContent({
  label,
  items,
}: {
  label: string;
  items: Array<{ key: string; label: string; color: string; value: string }>;
}) {
  return (
    <div className="chart-tooltip" role="status" aria-live="polite">
      <p className="chart-tooltip-label">{label}</p>
      <div className="chart-tooltip-items">
        {items.map((item) => (
          <div className="chart-tooltip-item" key={item.key}>
            <span className="chart-tooltip-dot" style={{ background: item.color }} aria-hidden="true" />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
