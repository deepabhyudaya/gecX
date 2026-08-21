import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Play, BookOpen, CheckCircle2, Lock } from "lucide-react";
import MarkCompleteButton from "@/components/MarkCompleteButton";
import { EnrollButton } from "@/components/EnrollButton";

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watch) return watch[1];
  const embed = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];
  return null;
}

export default async function CoursePlayerPage({
  params: { slug },
  searchParams,
}: {
  params: { slug: string };
  searchParams: { lecture?: string };
}) {
  const { userId } = auth();
  if (!userId) return redirect("/sign-in");

  const isNumeric = /^\d+$/.test(slug);
  const course = await prisma.course.findFirst({
    where: isNumeric ? { id: parseInt(slug) } : { slug },
    include: {
      teacher: true,
      sections: {
        include: { lectures: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!course) return notFound();

  const courseId = course.id;
  const courseSlug = course.slug || String(courseId);

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId: userId } },
  });
  const isEnrolled = !!enrollment;

  const completions = await prisma.courseProgress.findMany({
    where: {
      studentId: userId,
      lecture: { section: { courseId } },
    },
    select: { lectureId: true, completed: true },
  });
  const completedSet = new Set(
    completions.filter((c) => c.completed).map((c) => c.lectureId)
  );

  const allLectures = course.sections.flatMap((s) => s.lectures);
  const totalLectures = allLectures.length;
  const completedCount = allLectures.filter((l) => completedSet.has(l.id)).length;
  const progressPct = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

  const activeLectureId = searchParams.lecture
    ? parseInt(searchParams.lecture)
    : allLectures[0]?.id;
  const activeLecture = allLectures.find((l) => l.id === activeLectureId) ?? allLectures[0];
  const activeSection = course.sections.find((s) =>
    s.lectures.some((l) => l.id === activeLecture?.id)
  );

  const currentIndex = allLectures.findIndex((l) => l.id === activeLecture?.id);
  const prevLecture = currentIndex > 0 ? allLectures[currentIndex - 1] : null;
  const nextLecture = currentIndex < totalLectures - 1 ? allLectures[currentIndex + 1] : null;

  const videoId = activeLecture ? getYouTubeId(activeLecture.videoUrl) : null;
  const isCurrentDone = activeLecture ? completedSet.has(activeLecture.id) : false;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-[300px] shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border">
          <Link href="/student/courses/my" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors block mb-2">
            My Courses
          </Link>
          <h2 className="text-[13px] font-bold text-foreground leading-snug">{course.title}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {course.teacher.name} {course.teacher.surname}
          </p>
        </div>

        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
            <span>{completedCount} / {totalLectures} lectures completed</span>
            <span className="font-bold text-foreground">{progressPct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {course.sections.map((sec) => {
            const isActiveSection = sec.id === activeSection?.id;
            const secCompleted = sec.lectures.filter((l) => completedSet.has(l.id)).length;
            return (
              <details key={sec.id} open={isActiveSection} className="border-b border-border/60">
                <summary className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/40 transition-colors select-none list-none">
                  <ChevronRight size={13} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-foreground truncate">{sec.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {secCompleted}/{sec.lectures.length} completed
                    </p>
                  </div>
                </summary>
                <ul className="bg-muted/10">
                  {sec.lectures.map((lec) => {
                    const isActive = lec.id === activeLecture?.id;
                    const isDone = completedSet.has(lec.id);
                    return (
                      <li key={lec.id}>
                        <Link
                          href={`/student/courses/${courseSlug}?lecture=${lec.id}`}
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-[12px] transition-colors ${isActive
                            ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary"
                            : "text-foreground hover:bg-muted/40"
                            }`}
                        >
                          {!isEnrolled ? (
                            <Lock size={12} className="shrink-0 text-muted-foreground/50" />
                          ) : isDone ? (
                            <CheckCircle2 size={12} className="shrink-0 text-green-500" />
                          ) : isActive ? (
                            <Play size={11} className="shrink-0 fill-current" />
                          ) : (
                            <Play size={11} className="shrink-0 text-muted-foreground" />
                          )}
                          <span className={`truncate leading-snug ${isDone ? "line-through opacity-60" : ""}`}>
                            {lec.title}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </nav>

        {progressPct === 100 && (
          <div className="p-3 border-t border-border bg-green-500/10 text-center text-[12px] font-bold text-green-500">
            🎉 Course complete!
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-black flex-shrink-0 relative overflow-hidden" style={{ aspectRatio: "16/9", maxHeight: "62vh" }}>
          {isEnrolled ? (
            videoId ? (
              <iframe
                key={videoId}
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                title={activeLecture?.title ?? "Lecture"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/40">
                <Play size={48} />
                <p className="text-[14px]">
                  {activeLecture ? "Invalid YouTube URL" : "No lectures available"}
                </p>
              </div>
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-6 text-center px-6">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/40 z-0" />
              <div className="relative z-10 space-y-4">
                <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Lock size={32} className="text-primary" />
                </div>
                <h2 className="text-[20px] font-bold text-white tracking-tight">Content Locked</h2>
                <p className="text-[14px] text-white/60 max-w-xs mx-auto">
                  Enroll in this course to gain full access to all lectures and track your progress.
                </p>
                <div className="max-w-[200px] mx-auto pt-2">
                  <EnrollButton courseId={courseId} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-background p-5">
          {activeSection && (
            <p className="text-[12px] text-muted-foreground mb-1">
              {activeSection.title}  Lecture {currentIndex + 1} of {totalLectures}
            </p>
          )}
          <h1 className="text-[20px] font-bold text-foreground">
            {activeLecture?.title ?? "Select a lecture"}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {prevLecture ? (
              <Link href={`/student/courses/${courseSlug}?lecture=${prevLecture.id}`}>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] border border-border text-foreground text-[13px] font-semibold hover:bg-muted transition-all">
                  Previous
                </button>
              </Link>
            ) : (
              <button disabled className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] border border-border text-muted-foreground text-[13px] opacity-40 cursor-not-allowed">
                Previous
              </button>
            )}

            {isEnrolled && activeLecture && (
              <MarkCompleteButton
                lectureId={activeLecture.id}
                courseSlug={courseSlug}
                initialCompleted={isCurrentDone}
              />
            )}

            {nextLecture ? (
              <Link href={`/student/courses/${courseSlug}?lecture=${nextLecture.id}`}>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-all">
                  Next
                </button>
              </Link>
            ) : (
              <button disabled className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] bg-green-600 text-white text-[13px] font-semibold opacity-80 cursor-not-allowed">
                Course Complete! 🎉
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
