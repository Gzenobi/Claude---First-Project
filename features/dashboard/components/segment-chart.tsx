"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { DashboardMetrics } from "../metrics";

import { ChartCard } from "./chart-card";

const COLORS = ["#005EB8", "#003B75", "#3B9AE1", "#7FB8E8", "#0E4A8A", "#A8CBEE"];

export function SegmentChart({ data }: { data: DashboardMetrics["projectsBySegment"] }) {
  return (
    <ChartCard title="Proyectos por segmento">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="segment"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.segment} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#D9E2EC" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
