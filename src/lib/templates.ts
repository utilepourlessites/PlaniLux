import type { BoardKind, PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

const event = (
  id: string,
  title: string,
  day: number,
  start: string,
  end: string,
  color: string,
  location = "",
  teacher = "",
  notes = "",
): ScheduleEvent => ({ id, title, day, start, end, color, location, teacher, notes });

function makeBoard(
  id: string,
  title: string,
  kind: BoardKind,
  color: string,
  events: ScheduleEvent[],
  favorite = false,
): PlannerBoard {
  const now = new Date().toISOString();
  return { id, title, kind, color, events, favorite, isDeleted: false, createdAt: now, updatedAt: now };
}

export function makeDefaultBoards(): PlannerBoard[] {
  return [
    makeBoard("b71a9d20-7b8a-4b82-9120-010000000001", "Semestre de printemps", "school", "#b9a8ed", [
      event("e101", "Design d’interaction", 0, "08:30", "10:00", "#e8e5ff", "Bât. A · 204", "L. Martin"),
      event("e102", "Méthodologie", 0, "10:30", "12:00", "#dcf3e8", "Amphi Lumière", "A. Bernard"),
      event("e103", "Studio de projet", 0, "14:00", "16:30", "#ffeadf", "Studio 3", "M. Laurent"),
      event("e104", "Typographie", 1, "09:00", "11:00", "#e1efff", "Atelier 12", "C. Petit"),
      event("e105", "Culture visuelle", 1, "13:30", "15:00", "#fff3cf", "Bât. C · 108", "S. Moreau"),
      event("e106", "Design d’interaction", 2, "08:30", "10:00", "#e8e5ff", "Bât. A · 204", "L. Martin"),
      event("e107", "Anglais", 2, "10:30", "12:00", "#ffe3ea", "Salle 4", "J. Reed"),
      event("e108", "Studio de projet", 3, "13:00", "16:00", "#ffeadf", "Studio 3", "M. Laurent"),
      event("e109", "Design éditorial", 4, "09:30", "11:00", "#dcf3e8", "Atelier 8", "L. Martin"),
      event("e110", "Conférence créative", 4, "14:00", "15:30", "#e1efff", "Auditorium", "Invité·e"),
    ], true),
    makeBoard("b71a9d20-7b8a-4b82-9120-010000000002", "Ma semaine idéale", "weekly", "#98cfbf", [
      event("e201", "Yoga & café", 0, "07:30", "08:30", "#dcf3e8", "Maison"),
      event("e202", "Bloc créatif", 1, "09:00", "11:30", "#e8e5ff", "Studio"),
      event("e203", "Rendez-vous équipe", 2, "10:00", "11:00", "#e1efff", "Visio"),
      event("e204", "Temps pour soi", 4, "16:00", "17:00", "#ffe3ea", "Dehors"),
    ]),
    makeBoard("b71a9d20-7b8a-4b82-9120-010000000003", "Projet portfolio", "daily", "#f0bf9d", [
      event("e301", "Rechercher l’inspiration", 0, "09:00", "10:30", "#fff3cf", "Bibliothèque"),
      event("e302", "Maquettes · version 02", 0, "11:00", "13:00", "#e8e5ff", "Studio"),
      event("e303", "Pause déjeuner", 0, "13:00", "14:00", "#dcf3e8", "Terrasse"),
      event("e304", "Feedback & retouches", 0, "14:00", "16:30", "#ffeadf", "Studio"),
    ]),
  ];
}

export function makeTemplate(kind: BoardKind, title?: string): PlannerBoard {
  const names: Record<BoardKind, string> = {
    school: "Mon emploi du temps",
    weekly: "Ma nouvelle semaine",
    monthly: "Mon mois",
    daily: "Ma journée",
    blank: "Nouveau tableau",
  };
  const board = makeBoard(crypto.randomUUID(), title || names[kind], kind, "#c6b8f5", []);
  if (kind === "school") {
    board.events = [
      event(crypto.randomUUID(), "Nouveau cours", 0, "09:00", "10:30", "#e8e5ff", "Salle à définir"),
      event(crypto.randomUUID(), "Nouveau cours", 2, "10:00", "11:30", "#dcf3e8", "Salle à définir"),
    ];
  }
  if (kind === "weekly") {
    board.events = [event(crypto.randomUUID(), "Priorité de la semaine", 0, "09:00", "10:00", "#fff3cf")];
  }
  if (kind === "daily") {
    board.events = [event(crypto.randomUUID(), "À faire aujourd’hui", 0, "09:00", "10:00", "#e1efff")];
  }
  if (kind === "monthly") {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const notes: [number, string, string, string, string][] = [
      [2, "Poser mes intentions", "09:00", "09:45", "#e8e5ff"],
      [6, "Rendez-vous important", "10:30", "11:15", "#dcf3e8"],
      [12, "Avancer sur mon projet", "14:00", "15:30", "#ffeadf"],
      [18, "Faire le point du mois", "09:30", "10:15", "#e1efff"],
      [23, "Une journée sans agenda", "11:00", "12:00", "#fff3cf"],
    ];
    board.events = notes.map(([day, title, start, end, color]) => {
      const date = new Date(now.getFullYear(), now.getMonth(), Math.min(day, daysInMonth));
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const weekday = date.getDay() === 0 ? 6 : date.getDay() - 1;
      return { ...event(crypto.randomUUID(), title, weekday, start, end, color), date: dateKey };
    });
  }
  return board;
}
