

import { ablyPublish } from "./ably-server";

export function getBranchWarChannel(rivalryId: string): string {
  return `war:branch:${rivalryId}`;
}

export function getStudentWarChannel(rivalryId: string): string {
  return `war:student:${rivalryId}`;
}

export type WarEvent =
  | {
      type: "war:score";
      rivalryId: string;
      classAScore?: number;
      classBScore?: number;
      studentAScore?: number;
      studentBScore?: number;
    }
  | {
      type: "war:bout";
      rivalryId: string;
      boutId: string;
      round: number;
      title: string;
      classAPoints?: number;
      classBPoints?: number;
      studentAPoints?: number;
      studentBPoints?: number;
      winnerId?: string | number | null;
      mvpStudentId?: string | null;
    }
  | {
      type: "war:lore";
      rivalryId: string;
      weekNumber: number;
      title: string;
    }
  | {
      type: "war:strike";
      rivalryId: string;
      studentId: string;
      reason: string;
      mutedUntil?: string | null;
    }
  | {
      type: "war:concluded";
      rivalryId: string;
      winnerId: string | number | null;
      isSurrender?: boolean;
    }
  | {
      type: "war:archived";
      rivalryId: string;
      battlefieldServerId: string | null;
    };

export async function publishWarEvent(
  scope: "branch" | "student",
  event: Extract<WarEvent, { rivalryId: string }>
): Promise<boolean> {
  const channel =
    scope === "branch"
      ? getBranchWarChannel(event.rivalryId)
      : getStudentWarChannel(event.rivalryId);

  return ablyPublish(channel, event as any);
}
