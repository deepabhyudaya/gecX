"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type Props = {
  score: number;
  label?: string;
  subtitle?: string;
};

export default function Performance({
  score,
  label = "Performance",
  subtitle = "Average Score",
}: Props) {

  const data = [
    { name: "Score", value: score, fill: "hsl(var(--foreground))" },
    { name: "Remaining", value: 100 - score, fill: "hsl(var(--muted))" },
  ];

  return (
    <div className="bg-card text-card-foreground p-6 rounded-xl border border-border h-80 relative flex flex-col items-center justify-between shadow-sm">
      <div className="w-full flex items-center justify-between">
        <h2 className="text-lg font-bold">{label}</h2>
      </div>

      <div className="w-full h-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              dataKey="value"
              startAngle={180}
              endAngle={0}
              data={data}
              cx="50%"
              cy="70%"
              innerRadius="70%"
              outerRadius="100%"
              stroke="none"
              cornerRadius={4}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">{score.toFixed(1)}</h1>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
