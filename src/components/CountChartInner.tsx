"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const BOYS_COLOR  = "#3b82f6";
const GIRLS_COLOR = "#FF10F0";
const BOYS_DARK   = "#60a5fa";
const GIRLS_DARK  = "#FF10F0";

const CustomTooltip = ({
  active,
  payload,
  isDark,
}: {
  active?: boolean;
  payload?: any[];
  isDark: boolean;
}) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const color = name === "Boys"
    ? (isDark ? BOYS_DARK : BOYS_COLOR)
    : (isDark ? GIRLS_DARK : GIRLS_COLOR);
  return (
    <div
      style={{
        background: isDark ? "#1c1c1c" : "#fff",
        border: `1px solid ${isDark ? "#333" : "#e5e5e5"}`,
        borderRadius: 10,
        padding: "6px 12px",
        fontSize: 12,
        color: isDark ? "#e5e5e5" : "#171717",
      }}
    >
      <span style={{ color, fontWeight: 700 }}>{name}</span>
      {"  "}
      <strong>{value}</strong>
    </div>
  );
};

const CountChart = ({ boys, girls }: { boys: number; girls: number }) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  const boysColor  = isDark ? BOYS_DARK  : BOYS_COLOR;
  const girlsColor = isDark ? GIRLS_DARK : GIRLS_COLOR;

  const data = [
    { name: "Boys",  value: boys  },
    { name: "Girls", value: girls },
  ];

  const total = boys + girls;

  return (
    <div className="relative w-full" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={3}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            <Cell fill={boysColor}  />
            <Cell fill={girlsColor} />
          </Pie>
          <Tooltip
            content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={props.payload}
                isDark={isDark}
              />
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-extrabold text-foreground">{total}</span>
        <span className="text-[11px] text-muted-foreground font-medium">students</span>
      </div>
    </div>
  );
};

export default CountChart;
