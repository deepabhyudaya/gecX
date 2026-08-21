import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  Mail,
  Phone,
  MapPin,
  Droplet,
  Calendar,
  User,
  BadgeCheck,
  School,
  BookOpen,
  GraduationCap,
  LayoutGrid,
} from "lucide-react";
import { CometCard } from "@/components/ui/comet-card";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import AnnouncementsNotificationList from "@/components/AnnouncementsNotificationList";
import { getUserAvatarUrl } from "@/actions/avatar-shop.actions";
import { getActiveSeason, getStudentSeasonPoints, getStudentSeasonHistory } from "@/actions/season.actions";
import SeasonPointsCard from "@/components/seasons/SeasonPointsCard";
import SeasonHistoryList from "@/components/seasons/SeasonHistoryList";

export const metadata = {
  title: "My Profile | gecX",
  description: "View and manage your gecX profile.",
};

const ProfilePage = async () => {
  const { sessionClaims, userId } = auth();
  let clerkUser = null;
  try {
    clerkUser = await currentUser();
  } catch (e) {
    console.error("ProfilePage currentUser error:", e);
  }
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  let profileData: any = null;
  let calendarType: "teacherId" | "classId" | null = null;
  let calendarId: string | number | null = null;
  let statCards: { icon: any; label: string; value: string | number }[] = [];
  let seasonPoints: any = null;
  let seasonHistory: any[] = [];

  if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: { id: userId! },
      include: {
        _count: { select: { subjects: true, lessons: true, classes: true } },
      },
    });
    if (!teacher) return notFound();
    profileData = teacher;
    calendarType = "teacherId";
    calendarId = teacher.id;
    statCards = [
      { icon: BookOpen, label: "Subjects", value: teacher._count.subjects },
      { icon: GraduationCap, label: "Lessons", value: teacher._count.lessons },
      { icon: LayoutGrid, label: "Branches", value: teacher._count.classes },
    ];
  } else if (role === "student") {
    const [student, activeSeason] = await Promise.all([
      prisma.student.findUnique({
        where: { id: userId! },
        include: {
          class: true,
          grade: true,
          _count: { select: { results: true, attendances: true } },
        },
      }),
      getActiveSeason(),
    ]);
    if (!student) return notFound();
    profileData = student;
    calendarType = "classId";
    calendarId = student.classId;
    statCards = [
      { icon: School, label: "Branch", value: student.class.name },
      { icon: GraduationCap, label: "Year", value: `Year ${student.grade.level}` },
      { icon: BadgeCheck, label: "Results", value: student._count.results },
    ];
    seasonPoints = activeSeason
      ? await getStudentSeasonPoints(userId!, activeSeason.id)
      : null;
    seasonHistory = await getStudentSeasonHistory(userId!, 10);
  } else if (role === "parent") {
    const parent = await prisma.parent.findUnique({
      where: { id: userId! },
      include: { _count: { select: { students: true } } },
    });
    if (!parent) return notFound();
    profileData = parent;
    statCards = [
      { icon: User, label: "Children", value: parent._count.students },
    ];
  } else if (role === "admin") {

    const admin = await prisma.admin.findUnique({ where: { id: userId! } });
    profileData = {
      name: clerkUser?.firstName ?? "Admin",
      surname: clerkUser?.lastName ?? "",
      username: admin?.username ?? clerkUser?.username ?? "admin",
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
      img: clerkUser?.imageUrl,
    };
  }

  const fullName =
    role === "admin" && clerkUser?.fullName
      ? clerkUser.fullName
      : profileData?.name
      ? `${profileData.name} ${profileData.surname || ""}`.trim()
      : clerkUser?.fullName ?? "Unknown";

  const equippedAvatar = await getUserAvatarUrl(userId || "", "academic");
  const avatar = equippedAvatar || profileData?.img || clerkUser?.imageUrl || "/noAvatar.png";

  const infoRows: { icon: any; label: string; value: string }[] = [
    profileData?.email && {
      icon: Mail,
      label: "Email",
      value: profileData.email,
    },
    profileData?.phone && {
      icon: Phone,
      label: "Phone",
      value: profileData.phone,
    },
    profileData?.address && {
      icon: MapPin,
      label: "Address",
      value: profileData.address,
    },
    profileData?.bloodType && {
      icon: Droplet,
      label: "Blood Type",
      value: profileData.bloodType,
    },
    profileData?.birthday && {
      icon: Calendar,
      label: "Birthday",
      value: new Intl.DateTimeFormat("en-GB").format(
        new Date(profileData.birthday)
      ),
    },
    profileData?.sex && {
      icon: User,
      label: "Sex",
      value:
        profileData.sex.charAt(0).toUpperCase() +
        profileData.sex.slice(1).toLowerCase(),
    },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  return (
    <div className="flex-1 p-4 md:p-6 flex flex-col gap-6 xl:flex-row">
      <div className="w-full xl:w-2/3 flex flex-col gap-4">
        <CometCard rotateDepth={6} translateDepth={8}>
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative">
                <Image
                  src={avatar}
                  alt={fullName}
                  width={120}
                  height={120}
                  className="w-28 h-28 rounded-full object-cover ring-2 ring-border"
                />
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
              </div>
              <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 rounded-full bg-muted border border-border">
                {role}
              </span>
            </div>

            <div className="flex flex-col gap-4 min-w-0 flex-1">
              <div>
                <h1 className="text-2xl font-bold leading-tight">{fullName}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  @{profileData?.username}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {infoRows.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Icon size={13} className="text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">
                        {label}
                      </p>
                      <p className="text-sm font-medium truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CometCard>

        {statCards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statCards.map(({ icon: Icon, label, value }) => (
              <CometCard key={label} rotateDepth={10} translateDepth={8}>
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 h-full">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {label}
                    </p>
                  </div>
                </div>
              </CometCard>
            ))}
          </div>
        )}

        {calendarType && calendarId && (
          <div className="bg-card border border-border rounded-xl p-4 h-[760px]">
            <h2 className="font-semibold mb-3">My Schedule</h2>
            <BigCalendarContainer
              type={calendarType}
              id={String(calendarId)}
            />
          </div>
        )}
      </div>

      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        {role === "student" && (
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            <h2 className="font-semibold text-sm">My Season Stats</h2>
            {seasonPoints ? (
              <SeasonPointsCard
                points={seasonPoints.totalPoints}
                warsWon={seasonPoints.warsWon}
                warsLost={seasonPoints.warsLost}
                rank={seasonPoints.rank}
                isConqueror={seasonPoints.isConqueror}
                conquerorRank={seasonPoints.conquerorRank}
              />
            ) : (
              <div className="text-sm text-muted-foreground py-2">
                No active season right now.
              </div>
            )}
            <SeasonHistoryList records={seasonHistory} />
          </div>
        )}
        <AnnouncementsNotificationList />
      </div>
    </div>
  );
};

export default ProfilePage;
