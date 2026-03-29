"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";

export type BranchPerformanceChartDatum = {
  branch: string;
  savings: number;
  deposits: number;
};

export type PortfolioTrendChartDatum = {
  month: string;
  deposits: number;
  loans: number;
};

const branchChartConfig = {
  savings: { label: "Savings", color: "var(--chart-1)" },
  deposits: { label: "Deposits", color: "var(--chart-2)" },
} satisfies ChartConfig;

const trendChartConfig = {
  deposits: { label: "Deposits", color: "var(--chart-2)" },
  loans: { label: "Loans", color: "var(--chart-3)" },
} satisfies ChartConfig;

function isBranchChartKey(value: string): value is keyof typeof branchChartConfig {
  return value in branchChartConfig;
}

function isTrendChartKey(value: string): value is keyof typeof trendChartConfig {
  return value in trendChartConfig;
}

function currencyCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function BranchTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) {
    return null;
  }

  return (
    <ChartTooltipContent
      label={label}
      items={payload
        .filter((item): item is { dataKey: string; value: number } =>
          Boolean(item.dataKey && typeof item.value === "number"),
        )
        .map((item) => ({
          key: item.dataKey,
          label: isBranchChartKey(item.dataKey)
            ? branchChartConfig[item.dataKey].label
            : item.dataKey,
          color: isBranchChartKey(item.dataKey)
            ? branchChartConfig[item.dataKey].color
            : "var(--foreground)",
          value: currencyCompact(item.value),
        }))}
    />
  );
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) {
    return null;
  }

  return (
    <ChartTooltipContent
      label={label}
      items={payload
        .filter((item): item is { dataKey: string; value: number } =>
          Boolean(item.dataKey && typeof item.value === "number"),
        )
        .map((item) => ({
          key: item.dataKey,
          label: isTrendChartKey(item.dataKey)
            ? trendChartConfig[item.dataKey].label
            : item.dataKey,
          color: isTrendChartKey(item.dataKey)
            ? trendChartConfig[item.dataKey].color
            : "var(--foreground)",
          value: currencyCompact(item.value),
        }))}
    />
  );
}

export function BranchPerformanceChart({ data }: { data: BranchPerformanceChartDatum[] }) {
  return (
    <ChartContainer config={branchChartConfig}>
      <div className="chart-heading-row">
        <h4 className="chart-heading">Savings vs Deposits by Branch</h4>
        <ChartLegendContent config={branchChartConfig} keys={["savings", "deposits"]} />
      </div>
      <div className="chart-svg-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(115, 93, 65, 0.2)" />
            <XAxis dataKey="branch" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(value) => currencyCompact(Number(value))}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip cursor={{ fill: "rgba(115, 93, 65, 0.08)" }} content={<BranchTooltip />} />
            <Bar dataKey="savings" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="deposits" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

export function PortfolioTrendChart({ data }: { data: PortfolioTrendChartDatum[] }) {
  const formattedData = useMemo(() => data, [data]);

  return (
    <ChartContainer config={trendChartConfig}>
      <div className="chart-heading-row">
        <h4 className="chart-heading">Deposits and Loans Trend</h4>
        <ChartLegendContent config={trendChartConfig} keys={["deposits", "loans"]} />
      </div>
      <div className="chart-svg-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={formattedData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(115, 93, 65, 0.2)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(value) => currencyCompact(Number(value))}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<TrendTooltip />} />
            <Line
              type="monotone"
              dataKey="deposits"
              stroke="var(--chart-2)"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="loans"
              stroke="var(--chart-3)"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

export function ChartBars({
  data,
}: {
  data: Array<{ label: string; value: number; suffix?: string }>;
}) {
  const max = Math.max(...data.map((entry) => entry.value), 1);
  return (
    <div className="mini-chart-bars" role="img" aria-label="Performance bars">
      {data.map((entry) => (
        <div className="mini-chart-row" key={entry.label}>
          <span>{entry.label}</span>
          <div className="mini-chart-track">
            <div
              className="mini-chart-fill"
              style={{ width: `${(entry.value / max) * 100}%` }}
              aria-hidden="true"
            />
          </div>
          <strong>
            {entry.value}
            {entry.suffix ?? ""}
          </strong>
        </div>
      ))}
    </div>
  );
}
