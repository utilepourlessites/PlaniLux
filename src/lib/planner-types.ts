export type BoardKind = "school" | "weekly" | "monthly" | "daily" | "blank";

export type ScheduleEvent = {
  id: string;
  title: string;
  day: number;
  date?: string;
  start: string;
  end: string;
  location?: string;
  teacher?: string;
  color: string;
  notes?: string;
};

export type PlannerBoard = {
  id: string;
  title: string;
  kind: BoardKind;
  color: string;
  events: ScheduleEvent[];
  favorite: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export const BOARD_KIND_LABELS: Record<BoardKind, string> = {
  school: "Emploi du temps",
  weekly: "Planificateur hebdo",
  monthly: "Planificateur mensuel",
  daily: "Planning quotidien",
  blank: "Tableau libre",
};

export const EVENT_COLORS = [
  { name: "Lavande", value: "#e8e5ff" },
  { name: "Menthe", value: "#dcf3e8" },
  { name: "Pêche", value: "#ffeadf" },
  { name: "Ciel", value: "#e1efff" },
  { name: "Citron", value: "#fff3cf" },
  { name: "Rose", value: "#ffe3ea" },
  { name: "Perle", value: "#e9edf2" },
];

export const BOARD_COLORS = ["#c6b8f5", "#9cd9ca", "#f5bd9c", "#a9c8f4", "#f3d677"];
