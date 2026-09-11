"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ACTIVITY_TYPE_LABEL } from "@/lib/constants";
import type { ActivityType } from "@/types";
import type { DashboardMetrics } from "../metrics";

import { ChartCard } from "./chart-card";

export function ActivitiesTypeChart({ data }: { data: DashboardMetrics["activitiesByType"] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: ACTIVITY_TYPE_LABEL[d.type as ActivityType] ?? d.type,
  }));

  return (
    <ChartCard title="Actividades por tipo">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 16, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#D9E2EC" />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" allowDecimals={false} />
          <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={110} stroke="#64748b" />
          <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#D9E2EC" }} />
          <Bar dataKey="count" name="Actividades" fill="#005EB8" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
