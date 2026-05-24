"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import type { FraudTrendChartPoint } from "../../lib/dashboard-data";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import { compactNumber } from "./number-format";

const fraudTrendConfig = {
  total: {
    label: "Alerts",
    color: "var(--chart-2)",
  },
  high: {
    label: "High risk",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function FraudTrendChart({
  data,
}: {
  data: FraudTrendChartPoint[];
}) {
  return (
    <ChartContainer className="h-[280px] w-full" config={fraudTrendConfig}>
      <LineChart accessibilityLayer data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={10} />
        <YAxis
          axisLine={false}
          tickFormatter={(value) => compactNumber.format(Number(value))}
          tickLine={false}
          width={40}
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
          dataKey="total"
          dot={false}
          stroke="var(--color-total)"
          strokeWidth={3}
          type="monotone"
        />
        <Line
          dataKey="high"
          dot={false}
          stroke="var(--color-high)"
          strokeWidth={3}
          type="monotone"
        />
      </LineChart>
    </ChartContainer>
  );
}
