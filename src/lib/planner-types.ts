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
  recurrence?: "weekly" | "none";
  validFrom?: string;
  validTo?: string;
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
  { name: "Rouge", value: "#d9383e" },
  { name: "Corail", value: "#f36d5c" },
  { name: "Fuchsia", value: "#c2185b" },
  { name: "Violet vif", value: "#7548f0" },
  { name: "Bleu vif", value: "#147deb" },
  { name: "Turquoise", value: "#00a6a6" },
  { name: "Vert vif", value: "#20a464" },
  { name: "Jaune soleil", value: "#ffd83d" },
  { name: "Noir", value: "#25242b" },
];

/** Choisit un premier plan noir ou blanc selon le meilleur contraste WCAG. */
export function getReadableTextColor(color: string): "#ffffff" | "#20202a" {
  const raw = color.trim().replace("#", "");
  const hex = raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw;
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#20202a";

  const channels = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.056;
  return whiteContrast > darkContrast ? "#ffffff" : "#20202a";
}

export const BOARD_COLORS = ["#c6b8f5", "#9cd9ca", "#f5bd9c", "#a9c8f4", "#f3d677"];
