"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

type DataItem = {
  name: string;
  shortName: string;
  dateLabel: string;
  present: number | null;
  absent: number | null;
  leave: number | null;
  isToday: boolean;
};

const CustomTooltip = ({
  active,
  payload,
  label,
  dateLabel,
  isDark,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  dateLabel?: string;
  isDark: boolean;
}) => {
  if (!active || !payload?.length) return null;
  const isLeave = payload.some((p) => p.dataKey === "leave" && p.value);
  return (
    <div
      style={{
        background: isDark ? "#1c1c1c" : "#fff",
        border: `1px solid ${isDark ? "#333" : "#e5e5e5"}`,
        borderRadius: 10,
        padding: "8px 14px",
        fontSize: 12,
        color: isDark ? "#e5e5e5" : "#171717",
        minWidth: 120,
      }}
    >
      <p className="font-bold mb-1">{dateLabel || label}</p>
      {isLeave ? (
        <p style={{ color: "#ef4444" }}>Holiday / Leave</p>
      ) : (
        payload.map((p, i) => {
          if (p.value == null) return null;
          const color =
            p.dataKey === "present"
              ? "#22c55e"
              : p.dataKey === "absent"
                ? "#f97316"
                : "#ef4444";
          return (
            <p key={i} style={{ color }}>
              {p.name}: <strong>{p.value}</strong>
            </p>
          );
        })
      )}
    </div>
  );
};

const CustomTick = ({
  x,
  y,
  payload,
  isDark,
  todayName,
  data,
}: {
  x?: number;
  y?: number;
  payload?: any;
  isDark: boolean;
  todayName: string;
  data?: DataItem[];
}) => {
  const parts = (payload?.value ?? "").split(" ");
  const isToday = payload?.value === todayName;
  const baseColor = isDark ? "#a3a3a3" : "#525252";
  const todayColor = isDark ? "#e5e5e5" : "#171717";

  const dataItem = data?.find((d) => d.name === payload?.value);
  const displayLabel = dataItem?.shortName || parts[0];

  if (dataItem?.shortName === "") {
    return null;
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill={isToday ? todayColor : baseColor}
        fontSize={isToday ? 12 : 11}
        fontWeight={isToday ? 700 : 500}
      >
        {displayLabel}
      </text>
      {parts[1] && !dataItem?.shortName && (
        <text
          x={0}
          y={0}
          dy={27}
          textAnchor="middle"
          fill={isToday ? "#6366f1" : baseColor}
          fontSize={10}
          fontWeight={isToday ? 700 : 400}
        >
          {parts[1]}
        </text>
      )}
      {isToday && (
        <circle cx={0} cy={36} r={2.5} fill="#6366f1" />
      )}
    </g>
  );
};

const AttendanceChart = ({ data }: { data?: DataItem[] }) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  const gridColor = isDark ? "#262626" : "#e5e5e5";
  const yTickColor = isDark ? "#737373" : "#737373";

  const safeData = data || [];

  const todayItem = safeData.find((d) => d.isToday);
  const todayName = todayItem?.name ?? "";

  const dataLength = safeData.length;
  let barSize = 16;
  let tickInterval = 0;
  let xAxisHeight = 52;

  if (dataLength <= 7) {
    barSize = 16;
    tickInterval = 0;
    xAxisHeight = 52;
  } else if (dataLength <= 12) {
    barSize = 24;
    tickInterval = 0;
    xAxisHeight = 40;
  } else if (dataLength <= 30) {
    barSize = 8;
    tickInterval = dataLength > 20 ? 4 : 2;
    xAxisHeight = 40;
  } else {
    barSize = 6;
    tickInterval = 5;
    xAxisHeight = 40;
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={240}>
      <BarChart
        data={safeData}
        barSize={barSize}
        barGap={2}
        margin={{ top: 8, right: 8, left: 60, bottom: xAxisHeight }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          height={xAxisHeight}
          interval={tickInterval}
          tick={(props) => (
            <CustomTick {...props} isDark={isDark} todayName={todayName} data={safeData} />
          )}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: yTickColor, fontSize: 11 }}
          allowDecimals={false}
          width={50}
        />
        <Tooltip
          content={(props) => (
            <CustomTooltip
              active={props.active}
              payload={props.payload}
              label={props.label}
              isDark={isDark}
            />
          )}
          cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
        />
        <Legend
          align="left"
          verticalAlign="top"
          wrapperStyle={{ paddingBottom: "10px", fontSize: 12 }}
          formatter={(value) => (
            <span style={{ color: isDark ? "#a3a3a3" : "#525252", fontSize: 12 }}>
              {value}
            </span>
          )}
        />

        <Bar
          dataKey="present"
          name="Present"
          legendType="circle"
          radius={[5, 5, 0, 0]}
          fill={isDark ? "#86efac" : "#22c55e"}
        />

        <Bar
          dataKey="absent"
          name="Absent"
          legendType="circle"
          radius={[5, 5, 0, 0]}
          fill={isDark ? "#fb923c" : "#f97316"}
        />

        <Bar
          dataKey="leave"
          name="Leave"
          legendType="circle"
          radius={[5, 5, 0, 0]}
          fill="#ef4444"
          opacity={0.7}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AttendanceChart;
