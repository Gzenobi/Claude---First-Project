"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "../metrics";

import { ChartCard } from "./chart-card";

export function ForecastChart({ data }: { data: DashboardMetrics["forecastByMonth"] }) {
  return (
    <ChartCard title="Forecast ponderado por mes">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D9E2EC" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#64748b"
            tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{ borderRadius: 12, borderColor: "#D9E2EC" }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name="Forecast"
            stroke="#003B75"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#005EB8" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
