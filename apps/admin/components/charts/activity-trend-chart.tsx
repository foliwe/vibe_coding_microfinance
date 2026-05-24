"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import type { ActivityTrendChartPoint } from "../../lib/dashboard-data";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import { compactNumber } from "./number-format";

const activityTrendConfig = {
  deposits: {
    label: "Deposits",
    color: "var(--chart-1)",
  },
  withdrawals: {
    label: "Withdrawals",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function ActivityTrendChart({
  data,
}: {
  data: ActivityTrendChartPoint[];
}) {
  return (
    <ChartContainer className="h-[280px] w-full" config={activityTrendConfig}>
      <LineChart accessibilityLayer data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={10} />
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
          dataKey="withdrawals"
          dot={false}
          stroke="var(--color-withdrawals)"
          strokeWidth={3}
          type="monotone"
        />
      </LineChart>
    </ChartContainer>
  );
}
