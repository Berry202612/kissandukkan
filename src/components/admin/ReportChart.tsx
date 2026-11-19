"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ReportChart({ data }: { data: { key: string; revenue: number; net: number }[] }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-muted">No paid orders in this period.</p>;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" vertical={false} />
          <XAxis dataKey="key" tick={{ fontSize: 11, fill: "#6B7A70" }} tickLine={false} axisLine={{ stroke: "#E4DFD3" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6B7A70" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} width={72} />
          <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} contentStyle={{ borderRadius: 12, border: "1px solid #E4DFD3" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="revenue" name="Revenue" fill="#1E6B3A" radius={[4, 4, 0, 0]} />
          <Bar dataKey="net" name="Net profit" fill="#F4B400" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
