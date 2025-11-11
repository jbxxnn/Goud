'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type ServicePeriod = 'day' | 'week' | 'month' | 'year';

interface ServiceBookingSeries {
  serviceId: string;
  serviceName: string;
  serviceCode: string | null;
  data: number[];
}

interface ServiceBookingTotals {
  serviceId: string;
  serviceName: string;
  serviceCode: string | null;
  count: number;
}

interface ServiceBookingsData {
  period: ServicePeriod;
  labels: string[];
  series: ServiceBookingSeries[];
  totals: ServiceBookingTotals[];
}

interface DashboardActivityChartProps {
  data?: ServiceBookingsData | null;
}

type LegendEntry = {
  dataKey?: string | number;
};

type TooltipDatum = {
  name?: string | number;
  value?: number;
  color?: string;
};

const CHART_COLOR_VARS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const getColor = (index: number) => CHART_COLOR_VARS[index % CHART_COLOR_VARS.length];

const ServiceTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipDatum[];
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const filtered = payload.filter((entry) => (entry?.value ?? 0) > 0);
  if (filtered.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md px-3 py-2 text-xs">
      <p className="font-medium text-foreground">{label}</p>
      <div className="mt-2 space-y-1">
        {filtered.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="inline-flex h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function DashboardActivityChart({ data }: DashboardActivityChartProps) {
  const series = useMemo(() => data?.series ?? [], [data]);
  const labels = useMemo(() => data?.labels ?? [], [data]);
  const totals = useMemo(() => data?.totals ?? [], [data]);

  const defaultVisible = useMemo(() => {
    const initial: Record<string, boolean> = {};
    series.forEach((s) => {
      initial[s.serviceId] = true;
    });
    return initial;
  }, [series]);

  const [visibility, setVisibility] = useState<Record<string, boolean>>(defaultVisible);

  useEffect(() => {
    setVisibility(defaultVisible);
  }, [defaultVisible]);

  const chartData = useMemo(() => {
    return labels.map((label, labelIndex) => {
      const row: Record<string, number | string> = { label };
      series.forEach((service) => {
        row[service.serviceId] = service.data[labelIndex] ?? 0;
      });
      return row;
    });
  }, [labels, series]);

  const hasData = series.length > 0 && chartData.some((row) =>
    series.some((service) => (row[service.serviceId] as number) > 0)
  );

  const handleLegendClick = (payload?: LegendEntry) => {
    if (!payload || typeof payload.dataKey !== 'string') return;
    const key = payload.dataKey;
    setVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const topService = totals[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {data?.period === 'day'
            ? 'Today'
            : data?.period === 'week'
            ? 'This Week'
            : data?.period === 'month'
            ? 'This Month'
            : 'This Year'}
        </span>
        {topService ? (
          <span className="font-medium text-foreground">
            Top service: {topService.serviceCode ? ` ${topService.serviceCode}` : ''} · {topService.count} bookings
          </span>
        ) : (
          <span>Hover bars for details</span>
        )}
      </div>

      <div className="h-[360px] w-full">
        {hasData ? (
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              barSize={20}
              margin={{
                top: 10,
                right: 0,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} horizontal={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                dy={8}
              />
              <YAxis
                width={32}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<ServiceTooltip />} cursor={{ fill: 'none' }} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ paddingTop: 16 }}
                onClick={(entry: unknown) => handleLegendClick(entry as LegendEntry)}
                formatter={(value: string | number, entry: unknown) => {
                  const payload = entry as { dataKey?: string | number; color?: string } | undefined;
                  const key = payload?.dataKey;
                  if (!key) {
                    return value;
                  }
                  const service = series.find((s) => s.serviceId === key);
                  if (!service) {
                    return value;
                  }
                  const isActive = visibility[service.serviceId] ?? true;
                  const label =
                    service.serviceCode && service.serviceCode !== service.serviceName
                      ? `${service.serviceCode}`
                      : '';
                  return (
                    <span className={isActive ? 'font-medium text-foreground text-xs' : 'text-xs text-muted-foreground'}>
                      {label}
                    </span>
                  );
                }}
              />
              {series.map((service, index) => {
                const color = getColor(index);
                return (
                  <Bar
                    key={service.serviceId}
                    dataKey={service.serviceId}
                    stackId="bookings"
                    name={
                      service.serviceCode && service.serviceCode !== service.serviceName
                        ? `${service.serviceCode})`
                        : ''
                    }
                    fill={color}
                    fillOpacity={0.85}
                    stroke={color}
                    radius={[4, 4, 0, 0]}
                    hide={visibility[service.serviceId] === false}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No booking activity to display.
          </div>
        )}
      </div>
    </div>
  );
}


