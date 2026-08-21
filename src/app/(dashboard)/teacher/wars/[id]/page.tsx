import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import KnowledgeDuelManager from "@/components/student-rivalry/KnowledgeDuelManager";
import SpeedRoundManager from "@/components/student-rivalry/SpeedRoundManager";
import CreativeClashManager from "@/components/student-rivalry/CreativeClashManager";

export default async function TeacherWarRoomPage({ params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return null;

  const bout = await prisma.studentRivalryBout.findUnique({
    where: { id: params.id },
    include: {
      warType: true,
      rivalry: {
        include: {
          studentA: true,
          studentB: true,
        },
      },
    },
  });

  if (!bout) return notFound();
  if (bout.teacherId !== userId) return <div className="p-8">Unauthorized</div>;

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto pb-24">
      <div className="flex items-center gap-4">
        <Link
          href="/teacher/wars"
          className="bg-card border border-border hover:bg-muted p-2 rounded-xl transition-colors"
        >
          ← Back
        </Link>
        <div>
          <h1 className="font-bold text-xl">
            War Room: {bout.rivalry.studentA.name} vs {bout.rivalry.studentB.name}
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mt-1">
            Bout {bout.round} · {bout.warType?.name}
          </p>
        </div>
      </div>

      {bout.warType?.name === "Knowledge Duel" && (
        <KnowledgeDuelManager bout={bout} />
      )}

      {bout.warType?.name === "Speed Round" && (
        <SpeedRoundManager bout={bout} />
      )}

      {bout.warType?.name === "Creative Clash" && (
        <CreativeClashManager bout={bout} />
      )}

      {bout.warType?.name !== "Knowledge Duel" &&
       bout.warType?.name !== "Speed Round" &&
       bout.warType?.name !== "Creative Clash" && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
          <div className="text-4xl mb-4">🚧</div>
          The specialized interface for {bout.warType?.name} is currently under construction.
        </div>
      )}
    </div>
  );
}
