interface ChartBarsProps {
  data: Array<{ label: string; value: number; suffix?: string }>;
}

export function ChartBars({ data }: ChartBarsProps) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="chart-bars">
      {data.map((item) => (
        <div className="chart-row" key={item.label}>
          <span>{item.label}</span>
          <div className="chart-track">
            <div
              className="chart-fill"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <strong>
            {item.value}
            {item.suffix ?? ""}
          </strong>
        </div>
      ))}
    </div>
  );
}
