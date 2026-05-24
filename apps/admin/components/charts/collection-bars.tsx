"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import { compactNumber } from "./number-format";

type ChartBarsDatum = {
  label: string;
  suffix?: string;
  value: number;
};

const barChartConfig = {
  value: {
    label: "Collections",
    color: "var(--chart-1)",
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
