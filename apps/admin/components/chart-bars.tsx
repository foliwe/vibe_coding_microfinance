"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import type { BranchPerformanceChartPoint, PortfolioTrendChartPoint } from "../lib/dashboard-data";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./ui/chart";

type ChartBarsDatum = {
  label: string;
  suffix?: string;
  value: number;
};

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const barChartConfig = {
  value: {
    label: "Collections",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const branchChartConfig = {
  savings: {
    label: "Savings",
    color: "var(--chart-1)",
  },
  deposits: {
    label: "Deposits",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const portfolioChartConfig = {
  deposits: {
    label: "Deposits",
    color: "var(--chart-1)",
  },
  loans: {
    label: "Loans",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function ChartBars({ data }: { data: ChartBarsDatum[] }) {
  return (
    <ChartContainer className="h-[260px] w-full" config={barChartConfig}>
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          tickLine={false}
          tickMargin={10}
        />
        <YAxis
          axisLine={false}
          tickFormatter={(value) => compactNumber.format(Number(value))}
          tickLine={false}
          width={40}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => {
                const suffix = String(item.payload?.suffix ?? "");
                return (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {compactNumber.format(Number(value))}
                      {suffix}
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function BranchPerformanceChart({
  data,
}: {
  data: BranchPerformanceChartPoint[];
}) {
  return (
    <ChartContainer className="h-[280px] w-full" config={branchChartConfig}>
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis axisLine={false} dataKey="branch" tickLine={false} tickMargin={10} />
        <YAxis
          axisLine={false}
          tickFormatter={(value) => compactNumber.format(Number(value))}
          tickLine={false}
          width={44}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => compactNumber.format(Number(value))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="savings" fill="var(--color-savings)" radius={[10, 10, 0, 0]} />
        <Bar dataKey="deposits" fill="var(--color-deposits)" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function PortfolioTrendChart({
  data,
}: {
  data: PortfolioTrendChartPoint[];
}) {
  return (
    <ChartContainer className="h-[280px] w-full" config={portfolioChartConfig}>
      <LineChart accessibilityLayer data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis axisLine={false} dataKey="month" tickLine={false} tickMargin={10} />
        <YAxis
          axisLine={false}
          tickFormatter={(value) => compactNumber.format(Number(value))}
          tickLine={false}
          width={44}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => compactNumber.format(Number(value))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="deposits"
          dot={false}
          stroke="var(--color-deposits)"
          strokeWidth={3}
          type="monotone"
        />
        <Line
          dataKey="loans"
          dot={false}
          stroke="var(--color-loans)"
          strokeWidth={3}
          type="monotone"
        />
      </LineChart>
    </ChartContainer>
  );
}
