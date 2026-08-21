import Announcements from "@/components/Announcements";
import AnnouncementsNotificationList from "@/components/AnnouncementsNotificationList";
import AttendanceChartContainer from "@/components/AttendanceChartContainer";
import CountChartContainer from "@/components/CountChartContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import FinanceChart from "@/components/FinanceChart";
import UserCard from "@/components/UserCard";
import { AiStubCard } from "@/components/AiStubCard";

import { DashboardPageLayout } from "@/components/dashboard-page-layout";

const AdminPage = ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  return (
    <DashboardPageLayout
      layoutKey="admin-dashboard-layout"
      leftContent={
        <div className="flex flex-col gap-8">
          <div className="flex gap-4 justify-between flex-wrap">
            <UserCard type="admin" />
            <UserCard type="teacher" />
            <UserCard type="student" />
            <UserCard type="parent" />
          </div>
          <AiStubCard
            title="AI Campus Insights"
            description="Ask Gemini to summarize attendance trends, flag at-risk students, and surface key campus metrics."
            feature="attendance-summary"
          />

          <div className="flex gap-4 flex-col lg:flex-row">
            <div className="w-full lg:w-1/3 h-[450px]">
              <CountChartContainer />
            </div>
            <div className="w-full lg:w-2/3 h-[450px]">
              <AttendanceChartContainer />
            </div>
          </div>

        </div>
      }
      rightContent={
        <>
          <EventCalendarContainer searchParams={searchParams} />
          <AnnouncementsNotificationList />
        </>
      }
    />
  );
};

export default AdminPage;
