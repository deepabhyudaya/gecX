import React from "react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function TeacherStorefrontPage({ params }: { params: { username: string } }) {
  const teacher = await prisma.teacher.findUnique({
    where: { username: params.username },
    include: {
      courses: {
        where: { status: "APPROVED" },
        include: {
          sections: { include: { lectures: true } }
        }
      }
    }
  });

  if (!teacher) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="bg-white border-b border-[#ebebeb] pt-24 pb-16 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-[48px] font-semibold text-[#171717] tracking-tight leading-[1.1] mb-4">
            {teacher.name} {teacher.surname}&apos;s Academy
          </h1>
          <p className="text-[20px] text-[#4d4d4d] max-w-2xl mx-auto leading-relaxed">
            Welcome to my curated selection of courses and lessons. Explore the curriculum below and start your learning journey.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-16 px-8">
        <h2 className="text-[32px] font-semibold text-[#171717] tracking-tight mb-8">Available Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teacher.courses.map((course) => (
            <Link key={course.id} href={`/teacher-courses/${params.username}/course/${course.id}`}>
              <div className="group bg-white rounded-[12px] p-6 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px] hover:shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,rgba(0,0,0,0.04)_0px_8px_8px_-8px,#fafafa_0px_0px_0px_1px] transition-shadow cursor-pointer h-full flex flex-col">
                <h3 className="text-[24px] font-semibold text-[#171717] mb-2 group-hover:text-[#0072f5] transition-colors">{course.title}</h3>
                <p className="text-[16px] text-[#4d4d4d] leading-relaxed mb-6 flex-grow">{course.description}</p>
                <div className="flex justify-between items-center border-t border-[#ebebeb] pt-4 mt-auto">
                  <span className="text-[14px] text-[#666666]">{course.sections.length} Sections</span>
                  <span className="text-[14px] font-medium text-[#171717]">View Course &rarr;</span>
                </div>
              </div>
            </Link>
          ))}

          {teacher.courses.length === 0 && (
            <div className="col-span-2 text-center py-16 text-[#4d4d4d] text-[16px]">
              No courses are available at the moment. Please check back later.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
