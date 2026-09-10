'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const data = [
  { day: 'Aug 25', entries: 2 },
  { day: 'Aug 27', entries: 1 },
  { day: 'Aug 29', entries: 3 },
  { day: 'Sep 1', entries: 2 },
  { day: 'Sep 3', entries: 4 },
  { day: 'Sep 5', entries: 1 },
  { day: 'Sep 7', entries: 3 },
  { day: 'Sep 8', entries: 2 },
  { day: 'Sep 9', entries: 4 },
  { day: 'Sep 10', entries: 2 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-border px-3 py-2 shadow-card-sm text-xs"
      style={{ backgroundColor: 'var(--card)' }}
    >
      <p className="font-medium text-foreground mb-0.5">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} entries written</p>
    </div>
  );
}

export default function PlanCompletionChart() {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={6}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(92,61,46,0.06)' }} />
        <Bar dataKey="entries" radius={[2, 2, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`bar-cell-${index}`}
              fill={entry.entries >= 3 ? 'var(--primary)' : 'var(--muted)'}
              fillOpacity={entry.entries >= 3 ? 0.9 : 0.6}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}