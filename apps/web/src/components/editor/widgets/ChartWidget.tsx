import React, { useMemo } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { ChartConfig } from "../../../types/widgets";

interface ChartInnerProps {
  config: ChartConfig;
}

const ChartInner: React.FC<ChartInnerProps> = ({ config }) => {
  const { data: apiData } = useQuery({
    queryKey: ["signage-chart", config.apiUrl],
    queryFn: async () => {
      if (!config.apiUrl) return [];
      const response = await fetch(config.apiUrl);
      return (await response.json()) as { label: string; value: number }[];
    },
    enabled: config.dataSource === "api" && Boolean(config.apiUrl),
    refetchInterval: (config.refreshInterval ?? 30) * 1000,
  });

  const data = config.dataSource === "api" ? apiData ?? [] : config.data;

  const content = useMemo(() => {
    if (config.chartType === "bar") {
      return (
        <BarChart data={data}>
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill={config.colors[0] ?? "#3b82f6"} />
        </BarChart>
      );
    }
    if (config.chartType === "line") {
      return (
        <LineChart data={data}>
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={config.colors[0] ?? "#3b82f6"} />
        </LineChart>
      );
    }
    return (
      <PieChart>
        <Tooltip />
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={config.chartType === "donut" ? 45 : 0}
          outerRadius={80}
        >
          {data.map((entry, index) => (
            <Cell key={`${entry.label}-${index}`} fill={config.colors[index % config.colors.length] ?? "#3b82f6"} />
          ))}
        </Pie>
      </PieChart>
    );
  }, [config.chartType, config.colors, data]);

  return (
    <div className="w-full h-full rounded p-2">
      {config.title && <div className="text-white text-xs mb-1">{config.title}</div>}
      <ResponsiveContainer width="100%" height={config.title ? "90%" : "100%"}>
        {content}
      </ResponsiveContainer>
    </div>
  );
};

interface ChartWidgetProps {
  config: ChartConfig;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ config }) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <ChartInner config={config} />
    </QueryClientProvider>
  );
};

export default ChartWidget;
