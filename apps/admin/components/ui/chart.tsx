"use client";


import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ className, children, config, ...props }, ref) => {
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & React.ComponentProps<"div">) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className={cn("grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl", className)}>
      {payload.map((item) => {
        const key = String(item.dataKey ?? "value");
        const itemConfig = config[key];
        return (
          <div className="flex items-center gap-2" key={key}>
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? itemConfig?.color }} />
            <span className="text-muted-foreground">{itemConfig?.label ?? key}</span>
            <span className="ml-auto font-mono font-medium tabular-nums text-foreground">{item.value?.toLocaleString()}</span>
          </div>
        );
      })}
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


const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({ payload }: React.ComponentProps<typeof RechartsPrimitive.Legend>) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 pt-3">
      {payload.map((item) => {
        const key = String(item.dataKey ?? "value");
        const itemConfig = config[key];
        return (
          <div key={key} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: item.color ?? itemConfig?.color }} />
            <span className="text-xs text-muted-foreground">{itemConfig?.label ?? key}</span>
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };

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

