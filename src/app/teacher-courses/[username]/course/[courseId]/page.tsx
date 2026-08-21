import React from "react";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

async function toggleProgress(formData: FormData) {
  "use server";
  const lectureId = parseInt(formData.get("lectureId") as string);
  const studentId = formData.get("studentId") as string;
  const isCompleted = formData.get("isCompleted") === "true";

  if (isCompleted) {

    await prisma.courseProgress.deleteMany({
      where: { lectureId, studentId }
    });
  } else {

    await prisma.courseProgress.create({
      data: { lectureId, studentId, completed: true }
    });
  }

  revalidatePath("/teacher-courses/[username]/course/[courseId]", "page");
}

export default async function CoursePlayerPage({ params }: { params: { username: string, courseId: string } }) {
  const course = await prisma.course.findUnique({
    where: { id: parseInt(params.courseId) },
    include: {
      teacher: true,
      sections: {
        include: {
          lectures: {
            include: { progress: true }
          }
        }
      }
    }
  });

  if (!course) return notFound();

  const firstLecture = course.sections[0]?.lectures[0];
  const activeVideoUrl = firstLecture?.videoUrl || "https://www.youtube.com/embed/placeholder";

  const studentId = "student1";

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <header className="bg-white border-b border-[#ebebeb] px-8 py-4 flex justify-between items-center shadow-[rgba(0,0,0,0.04)_0px_2px_2px]">
        <div>
          <h1 className="text-[20px] font-semibold text-[#171717] leading-tight">{course.title}</h1>
          <p className="text-[14px] text-[#4d4d4d]">By {course.teacher.name} {course.teacher.surname}</p>
        </div>
        <button className="bg-[#white] shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] text-[#171717] py-1.5 px-4 rounded-[6px] text-[14px] font-medium hover:bg-[#fafafa]">
          Leave Review
        </button>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row max-w-[1600px] w-full mx-auto">
        <div className="flex-1 p-8">
          <div className="w-full aspect-video bg-black rounded-[12px] overflow-hidden shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_8px_8px_-8px]">
            <iframe
              width="100%"
              height="100%"
              src={activeVideoUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          <div className="mt-8">
            <h2 className="text-[24px] font-semibold text-[#171717] tracking-tight mb-2">About this Course</h2>
            <p className="text-[16px] text-[#4d4d4d] leading-relaxed">{course.description}</p>
          </div>
        </div>

        <div className="w-full lg:w-[400px] bg-white border-l border-[#ebebeb] flex flex-col h-full self-stretch">
          <div className="p-6 border-b border-[#ebebeb]">
            <h3 className="text-[18px] font-semibold text-[#171717]">Course Content</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-4">
            {course.sections.map((section) => (
              <div key={section.id} className="mb-4">
                <h4 className="text-[14px] font-semibold text-[#171717] uppercase tracking-wider mb-3">
                  {section.title}
                </h4>
                <div className="flex flex-col gap-2">
                  {section.lectures.map((lecture) => {
                    const isCompleted = lecture.progress.some(p => p.studentId === studentId && p.completed);
                    return (
                      <div key={lecture.id} className="group p-3 rounded-[8px] bg-white shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] hover:shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px] flex items-center justify-between transition-shadow cursor-pointer">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <form action={toggleProgress}>
                            <input type="hidden" name="lectureId" value={lecture.id} />
                            <input type="hidden" name="studentId" value={studentId} />
                            <input type="hidden" name="isCompleted" value={isCompleted ? "true" : "false"} />
                            <button type="submit" className={`w-5 h-5 flex-shrink-0 cursor-pointer rounded-full border border-[#ebebeb] flex items-center justify-center ${isCompleted ? 'bg-[#171717] border-[#171717]' : 'bg-transparent hover:bg-[#fafafa]'}`}>
                              {isCompleted && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </button>
                          </form>
                          <span className={`text-[14px] leading-tight truncate ${isCompleted ? 'text-[#808080]' : 'text-[#171717] font-medium'}`}>
                            {lecture.title}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {course.sections.length === 0 && (
              <p className="text-[14px] text-[#4d4d4d]">Content is being prepared by the instructor.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
