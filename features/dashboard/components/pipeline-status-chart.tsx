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

import type { DashboardMetrics } from "../metrics";

import { ChartCard } from "./chart-card";

export function PipelineStatusChart({ data }: { data: DashboardMetrics["pipelineByStatus"] }) {
  return (
    <ChartCard title="Pipeline por estado">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D9E2EC" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            angle={-20}
            textAnchor="end"
            height={50}
            stroke="#64748b"
          />
          <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
          <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#D9E2EC" }} />
          <Bar dataKey="count" name="Proyectos" fill="#005EB8" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
