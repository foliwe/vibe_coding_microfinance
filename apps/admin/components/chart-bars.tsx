"use client";

import { useMemo, useState } from "react";

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

function currencyCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function BranchPerformanceChart({ data }: { data: BranchPerformanceChartDatum[] }) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const max = Math.max(...data.flatMap((entry) => [entry.savings, entry.deposits]), 1);

  return (
    <ChartContainer config={branchChartConfig}>
      <div className="chart-heading-row">
        <h4 className="chart-heading">Savings vs Deposits by Branch</h4>
        <ChartLegendContent config={branchChartConfig} keys={["savings", "deposits"]} />
      </div>
      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${Math.max(data.length * 84, 420)} 240`} role="img" aria-label="Grouped bar chart of branch savings and deposits">
          {data.map((entry, index) => {
            const x = 48 + index * 84;
            const savingsHeight = (entry.savings / max) * 144;
            const depositsHeight = (entry.deposits / max) * 144;
            const baseY = 190;
            return (
              <g key={entry.branch} onMouseEnter={() => setActiveIndex(index)}>
                <rect
                  x={x}
                  y={baseY - savingsHeight}
                  width={24}
                  height={savingsHeight}
                  rx={8}
                  fill="var(--chart-1)"
                  opacity={activeIndex === index ? 1 : 0.72}
                />
                <rect
                  x={x + 30}
                  y={baseY - depositsHeight}
                  width={24}
                  height={depositsHeight}
                  rx={8}
                  fill="var(--chart-2)"
                  opacity={activeIndex === index ? 1 : 0.72}
                />
                <text x={x + 28} y={212} textAnchor="middle" className="chart-axis-text">
                  {entry.branch.slice(0, 8)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {data[activeIndex] ? (
        <ChartTooltipContent
          label={data[activeIndex].branch}
          items={[
            {
              key: "savings",
              label: branchChartConfig.savings.label,
              color: branchChartConfig.savings.color,
              value: currencyCompact(data[activeIndex].savings),
            },
            {
              key: "deposits",
              label: branchChartConfig.deposits.label,
              color: branchChartConfig.deposits.color,
              value: currencyCompact(data[activeIndex].deposits),
            },
          ]}
        />
      ) : null}
    </ChartContainer>
  );
}

export function PortfolioTrendChart({ data }: { data: PortfolioTrendChartDatum[] }) {
  const [activeIndex, setActiveIndex] = useState<number>(data.length - 1);

  const { depositsPath, loansPath } = useMemo(() => {
    const max = Math.max(...data.flatMap((entry) => [entry.deposits, entry.loans]), 1);
    const width = Math.max((data.length - 1) * 72, 360);
    const height = 200;

    const createPath = (values: number[]) =>
      values
        .map((value, index) => {
          const x = index * (width / Math.max(data.length - 1, 1));
          const y = height - (value / max) * 150 - 20;
          return `${index === 0 ? "M" : "L"}${x} ${y}`;
        })
        .join(" ");

    return {
      depositsPath: createPath(data.map((entry) => entry.deposits)),
      loansPath: createPath(data.map((entry) => entry.loans)),
    };
  }, [data]);

  const chartWidth = Math.max((data.length - 1) * 72, 360);

  return (
    <ChartContainer config={trendChartConfig}>
      <div className="chart-heading-row">
        <h4 className="chart-heading">Deposits and Loans Trend</h4>
        <ChartLegendContent config={trendChartConfig} keys={["deposits", "loans"]} />
      </div>
      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${chartWidth} 220`} role="img" aria-label="Area line chart of deposits and loans over time">
          <path d={`${depositsPath} L ${chartWidth} 200 L 0 200 Z`} fill="var(--chart-2)" opacity="0.16" />
          <path d={`${loansPath} L ${chartWidth} 200 L 0 200 Z`} fill="var(--chart-3)" opacity="0.14" />
          <path d={depositsPath} fill="none" stroke="var(--chart-2)" strokeWidth="3" strokeLinecap="round" />
          <path d={loansPath} fill="none" stroke="var(--chart-3)" strokeWidth="3" strokeLinecap="round" />
          {data.map((entry, index) => {
            const x = index * (chartWidth / Math.max(data.length - 1, 1));
            return (
              <g key={entry.month} onMouseEnter={() => setActiveIndex(index)}>
                <line x1={x} y1={26} x2={x} y2={200} stroke="rgba(115, 93, 65, 0.16)" strokeDasharray="4 4" />
                <text x={x} y={214} textAnchor="middle" className="chart-axis-text">
                  {entry.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {data[activeIndex] ? (
        <ChartTooltipContent
          label={data[activeIndex].month}
          items={[
            {
              key: "deposits",
              label: trendChartConfig.deposits.label,
              color: trendChartConfig.deposits.color,
              value: currencyCompact(data[activeIndex].deposits),
            },
            {
              key: "loans",
              label: trendChartConfig.loans.label,
              color: trendChartConfig.loans.color,
              value: currencyCompact(data[activeIndex].loans),
            },
          ]}
        />
      ) : null}
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
