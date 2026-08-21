import AnnouncementsNotificationList from "@/components/AnnouncementsNotificationList";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import FormContainer from "@/components/FormContainer";
import ShareProfileButton from "@/components/ShareProfileButton";
import { CometCard } from "@/components/ui/comet-card";
import { DashboardPageLayout } from "@/components/dashboard-page-layout";
import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Parent } from "@prisma/client";
import {
  Mail,
  Phone,
  UserCheck,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const SingleParentPage = async ({
  params: { id },
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId } = auth();
  const user = await currentUser();
  const role = (user?.publicMetadata?.role as string) ?? "";
  const accessCode = searchParams.accessCode;

  const parent = await prisma.parent.findUnique({
    where: { id },
    include: {
      students: {
        include: {
          class: true,
          grade: true,
        }
      },
    },
  });

  if (!parent) {
    return notFound();
  }

  let hasAccess = false;
  if (role === "admin" || userId === parent.id) {
    hasAccess = true;
  } else if (accessCode) {
    const validAccess = await prisma.profileAccess.findFirst({
      where: {
        userId: parent.id,
        userType: "parent",
        code: accessCode,
        expiresAt: { gt: new Date() },
      },
    });
    if (validAccess) hasAccess = true;
  }

  return (
    <DashboardPageLayout
      layoutKey="parent-profile-layout"
      leftContent={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <CometCard className="flex-1" rotateDepth={8} translateDepth={10}>
              <div className="bg-card border border-border rounded-2xl flex gap-5 p-6 h-full">
                <div className="shrink-0">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center ring-2 ring-border overflow-hidden">
                    <span className="text-3xl font-bold text-muted-foreground uppercase">
                      {parent.name[0]}{parent.surname?.[0] || ""}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-3 min-w-0 w-full">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <h1 className="text-xl font-semibold truncate">
                        {parent.name} {parent.surname}
                      </h1>
                      {role === "admin" && (
                        <div className="shrink-0">
                          <FormContainer table="parent" type="update" data={parent} />
                        </div>
                      )}
                    </div>
                    {(role === "admin" || userId === parent.id) && (
                      <div className="shrink-0">
                        <ShareProfileButton userId={parent.id} userType="parent" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">@{parent.username}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Mail size={13} className="text-muted-foreground" />
                      {parent.email || "No Email"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} className="text-muted-foreground" />
                      {parent.phone}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-muted-foreground" />
                      {parent.address}
                    </span>
                  </div>
                </div>
              </div>
            </CometCard>

            <div className="flex-1 grid grid-cols-2 gap-3">
              <CometCard rotateDepth={10} translateDepth={8}>
                <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 h-full">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <UserCheck size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{parent.students.length}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Children Enrolled</p>
                  </div>
                </div>
              </CometCard>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 min-h-[400px]">
            <h2 className="font-semibold mb-4">Children</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parent.students.map((student) => (
                <Link key={student.id} href={`/list/students/${student.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                    <Image
                      src={student.img || "/noAvatar.png"}
                      alt=""
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm truncate">{student.name} {student.surname}</span>
                      <span className="text-xs text-muted-foreground truncate">{student.class.name} • Year {student.grade.level}</span>
                    </div>
                  </div>
                </Link>
              ))}
              {parent.students.length === 0 && (
                <p className="text-sm text-muted-foreground">No children enrolled.</p>
              )}
            </div>
          </div>
        </div>
      }
      rightContent={
        <div className="flex flex-col gap-4">
          <EventCalendarContainer searchParams={searchParams} />
          <AnnouncementsNotificationList />
        </div>
      }
    />
  );
};

export default SingleParentPage;
