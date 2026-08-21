import React from "react";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function approveCourse(formData: FormData) {
  "use server";
  const id = parseInt(formData.get("id") as string);

  await prisma.course.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  revalidatePath("/admin/course-approvals");
}

async function rejectCourse(formData: FormData) {
  "use server";
  const id = parseInt(formData.get("id") as string);

  await prisma.course.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  revalidatePath("/admin/course-approvals");
}

export default async function AdminCourseApprovalsPage() {
  const courses = await prisma.course.findMany({
    where: { status: "PENDING" },
    include: {
      teacher: true,
      sections: {
        include: { lectures: true }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 h-full bg-[#fafafa]">
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-center bg-white p-6 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px] rounded-[8px]">
          <div>
            <h1 className="text-[32px] font-semibold text-[#171717] tracking-tight">Course Approvals</h1>
            <p className="text-[16px] text-[#4d4d4d]">Review and approve courses submitted by teachers.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-[8px] p-6 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-[24px] font-semibold text-[#171717] mb-1">{course.title}</h2>
                  <p className="text-[14px] text-[#4d4d4d] mb-4">By: {course.teacher.name} {course.teacher.surname}</p>
                  <p className="text-[16px] text-[#171717] mb-6 max-w-2xl">{course.description}</p>
                </div>

                <div className="flex gap-2">
                  <form action={rejectCourse}>
                    <input type="hidden" name="id" value={course.id} />
                    <button type="submit" className="bg-white text-[#171717] py-1.5 px-4 rounded-[6px] text-[14px] font-medium shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] hover:bg-[#fafafa]">
                      Reject
                    </button>
                  </form>
                  <form action={approveCourse}>
                    <input type="hidden" name="id" value={course.id} />
                    <button type="submit" className="bg-[#171717] text-white py-1.5 px-4 rounded-[6px] text-[14px] font-medium hover:bg-[#4d4d4d]">
                      Approve
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#ebebeb]">
                <h3 className="text-[14px] font-semibold text-[#171717] mb-3 uppercase tracking-wider">Curriculum Preview</h3>
                <div className="flex flex-col gap-2">
                  {course.sections.map((section) => (
                    <div key={section.id} className="pl-4 border-l-2 border-[#ebebeb]">
                      <h4 className="text-[14px] font-medium text-[#171717] mb-1">{section.title}</h4>
                      <ul className="list-disc pl-5">
                        {section.lectures.map((lecture) => (
                          <li key={lecture.id} className="text-[14px] text-[#4d4d4d]">
                            {lecture.title}
                            <span className="text-[#0072f5] ml-2 text-[12px] opacity-80 truncate inline-block max-w-[200px] align-bottom">({lecture.videoUrl})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {course.sections.length === 0 && <p className="text-[14px] text-[#4d4d4d]">No curriculum added yet.</p>}
                </div>
              </div>
            </div>
          ))}

          {courses.length === 0 && (
            <div className="bg-white rounded-[8px] p-8 text-center shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px]">
              <p className="text-[16px] text-[#4d4d4d]">No pending courses to review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
