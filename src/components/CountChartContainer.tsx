import CountChart from "./CountChart";
import prisma from "@/lib/prisma";

const CountChartContainer = async () => {
  const data = await prisma.student.groupBy({
    by: ["sex"],
    _count: true,
  });

  const boys  = data.find((d) => d.sex === "MALE")?._count  || 0;
  const girls = data.find((d) => d.sex === "FEMALE")?._count || 0;
  const total = boys + girls;

  const boysPercentage  = total > 0 ? Math.round((boys  / total) * 100) : 0;
  const girlsPercentage = total > 0 ? Math.round((girls / total) * 100) : 0;

  return (
    <div className="bg-card text-card-foreground rounded-2xl w-full h-full p-4 flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-[16px] font-bold">Students</h1>

        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <CountChart boys={boys} girls={girls} />
      </div>

      <div className="flex justify-center gap-8 mt-2">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <span className="text-[12px] font-semibold text-foreground">Boys</span>
          </div>
          <span className="text-[22px] font-extrabold text-foreground leading-none">{boys}</span>
          <span className="text-[11px] text-muted-foreground">{boysPercentage}%</span>
        </div>

        <div className="w-px bg-border self-stretch" />

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: "#FF10F0" }} />
            <span className="text-[12px] font-semibold text-foreground">Girls</span>
          </div>
          <span className="text-[22px] font-extrabold text-foreground leading-none">{girls}</span>
          <span className="text-[11px] text-muted-foreground">{girlsPercentage}%</span>
        </div>
      </div>
    </div>
  );
};

export default CountChartContainer;
