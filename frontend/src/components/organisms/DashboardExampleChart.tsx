"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { SnapshotFeed } from "@/types/snapshot";

export function DashboardExampleChart({ feed }: { feed?: SnapshotFeed }) {
  if (!feed) return <div>No data</div>;

  const data = feed.rows.map((row) => ({
    x: row[0] as string | number,
    y: row[1] as number
  }));

  return (
    <div style={{ background: "#ffffff", padding: 16, borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)", height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
          <XAxis dataKey="x" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            formatter={(value: number) => Number(value).toLocaleString()}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
              fontSize: 12
            }}
          />
          <Line type="monotone" dataKey="y" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
