"use client";

import { useEffect, useState } from "react";
import AttendanceChart from "./AttendanceChart";
import { getAttendanceChartData, ChartDataItem } from "@/actions/attendance.actions";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

type TimeRange = "7days" | "30days" | "1year";

const AttendanceChartContainer = () => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("7days");
  const [data, setData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchData = async (range: TimeRange) => {
    setLoading(true);
    try {
      const chartData = await getAttendanceChartData(range);
      setData(chartData);
    } catch (error) {
      console.error("Failed to fetch attendance chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData(selectedRange);
    }
  }, [mounted, selectedRange]);

  const handleTabChange = (range: TimeRange) => {
    setSelectedRange(range);
  };

  const getRangeLabel = () => {
    switch (selectedRange) {
      case "7days":
        return "Last 7 Days";
      case "30days":
        return "Last 30 Days";
      case "1year":
        return "This Year";
      default:
        return "";
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-2xl p-4 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
        <div>
          <h1 className="text-[16px] font-bold">Attendance</h1>
          <p className="text-[11px] text-muted-foreground">{getRangeLabel()}</p>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          {[
            { value: "7days" as TimeRange, label: "7 Days" },
            { value: "30days" as TimeRange, label: "1 Month" },
            { value: "1year" as TimeRange, label: "1 Year" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                ${
                  selectedRange === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : (
          <AttendanceChart data={data} />
        )}
      </div>

      <div className="flex justify-end mt-3">
        <a
          href="/list/attendance"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View Full Records
          <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

export default AttendanceChartContainer;
