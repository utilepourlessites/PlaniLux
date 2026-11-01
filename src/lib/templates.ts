import type { BoardKind, PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

function makeBoard(
  id: string,
  title: string,
  kind: BoardKind,
  color: string,
  events: ScheduleEvent[] = [],
  favorite = false,
): PlannerBoard {
  const now = new Date().toISOString();
  return { id, title, kind, color, events, favorite, isDeleted: false, createdAt: now, updatedAt: now };
}

export function makeTemplate(kind: BoardKind, title?: string): PlannerBoard {
  const defaultTitles: Record<BoardKind, string> = {
    school: "Emploi du temps",
    weekly: "Planning hebdomadaire",
    monthly: "Planning mensuel",
    daily: "Planning quotidien",
    blank: "Nouveau tableau",
  };
  return makeBoard(crypto.randomUUID(), title?.trim() || defaultTitles[kind], kind, "#c6b8f5", []);
}
