import type { BoardKind, PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

export type Box = {
  col: number;
  totalCols: number;
  topPercent: number;
  heightPercent: number;
};

export type PlacedEvent = ScheduleEvent & Box & {
  startMinutes: number;
  endMinutes: number;
  formattedDuration: string;
  textColor: string;
  secondaryTextColor: string;
  overflowTop?: boolean;
  overflowBottom?: boolean;
};

export type SheetColumn = {
  dayIndex: number;
  label: string;
  shortLabel: string;
  date?: string;
  isToday?: boolean;
  events: PlacedEvent[];
};

export type MonthDayCell = {
  dayNumber: number | null;
  dateString?: string;
  isToday?: boolean;
  isCurrentMonth?: boolean;
  events: ScheduleEvent[];
};

export type MonthSheetModel = {
  monthLabel: string;
  year: number;
  monthIndex: number;
  weekdays: string[];
  cells: MonthDayCell[];
  eventsCount: number;
};

export type EmployeeSummary = {
  name: string;
  count: number;
  totalMinutes: number;
  formattedHours: string;
};

export type SheetModel = {
  title: string;
  subtitle: string;
  kind: BoardKind;
  hourStart: number;
  hourEnd: number;
  hours: number[];
  columns: SheetColumn[];
  month?: MonthSheetModel;
  weekLabel: string;
  totalEvents: number;
  employeesSummary?: EmployeeSummary[];
  activeFilterEmployee?: string;
};

export const DAY_NAMES = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

export function minutesFromTime(time: string): number {
  if (!time) return 0;
  const parts = time.split(":").map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDuration(startMinutes: number, endMinutes: number): string {
  const diff = Math.max(0, endMinutes - startMinutes);
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (minutes === 0) return `${hours}h00`;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

export function splitColor(color: string): [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1] ?? (/^#([0-9a-f]{3})$/i.exec(color)?.[1]
    ? color.replace(/^#/, "").split("").map((c) => c + c).join("")
    : "c6b8f5");
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

export function getLuminance(hex: string): number {
  const [r, g, b] = splitColor(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastTextColor(hexColor: string): string {
  try {
    const lum = getLuminance(hexColor);
    return lum > 0.45 ? "#0f172a" : "#ffffff";
  } catch {
    return "#0f172a";
  }
}

export function getContrastSecondaryColor(hexColor: string): string {
  try {
    const lum = getLuminance(hexColor);
    return lum > 0.45 ? "#334155" : "#e2e8f0";
  } catch {
    return "#334155";
  }
}

export function getHourRange(
  events: ScheduleEvent[],
  minDefault = 8,
  maxDefault = 20,
  autoCropOption: boolean | { autoCrop?: boolean } = false
): { start: number; end: number } {
  const isAutoCrop = typeof autoCropOption === "boolean" ? autoCropOption : Boolean(autoCropOption?.autoCrop);

  if (!events.length) return { start: minDefault, end: maxDefault };

  const starts = events.map((e) => Math.floor(minutesFromTime(e.start) / 60));
  const ends = events.map((e) => Math.ceil(minutesFromTime(e.end) / 60));

  if (isAutoCrop) {
    const validStarts = starts.filter((s) => s >= 0 && s < 24);
    const validEnds = ends.filter((e) => e > 0 && e <= 24);
    if (!validStarts.length || !validEnds.length) {
      return { start: minDefault, end: maxDefault };
    }
    const minStart = Math.min(...validStarts);
    const maxEnd = Math.max(...validEnds);
    const safeStart = Math.max(0, minStart);
    const safeEnd = Math.min(24, Math.max(safeStart + 1, maxEnd));
    return {
      start: safeStart,
      end: safeEnd,
    };
  }

  const calculatedStart = Math.min(minDefault, ...starts.filter((s) => s >= 0));
  const calculatedEnd = Math.max(maxDefault, ...ends.filter((e) => e <= 24));

  return {
    start: Math.max(0, calculatedStart),
    end: Math.min(24, calculatedEnd),
  };
}

export function computeEmployeesSummary(events: ScheduleEvent[]): EmployeeSummary[] {
  const map = new Map<string, { count: number; totalMinutes: number }>();
  for (const event of events) {
    const teacher = (event.teacher ?? "").trim() || "Non assigné";
    const start = minutesFromTime(event.start);
    const end = minutesFromTime(event.end);
    const duration = Math.max(0, end - start);
    const current = map.get(teacher) ?? { count: 0, totalMinutes: 0 };
    map.set(teacher, {
      count: current.count + 1,
      totalMinutes: current.totalMinutes + duration,
    });
  }
  return Array.from(map.entries())
    .map(([name, stat]) => ({
      name,
      count: stat.count,
      totalMinutes: stat.totalMinutes,
      formattedHours: formatDuration(0, stat.totalMinutes),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export function layoutDayEvents(events: ScheduleEvent[]): Map<string, { col: number; totalCols: number }> {
  const sorted = [...events].sort((a, b) => minutesFromTime(a.start) - minutesFromTime(b.start));
  const layout = new Map<string, { col: number; totalCols: number }>();

  const clusters: ScheduleEvent[][] = [];
  let currentCluster: ScheduleEvent[] = [];
  let clusterEnd = -1;

  for (const event of sorted) {
    const start = minutesFromTime(event.start);
    const end = minutesFromTime(event.end);
    if (currentCluster.length === 0 || start < clusterEnd) {
      currentCluster.push(event);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [event];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  for (const cluster of clusters) {
    const colEnds: number[] = [];
    const placements: { id: string; col: number }[] = [];
    for (const event of cluster) {
      const start = minutesFromTime(event.start);
      const end = minutesFromTime(event.end);
      let placed = -1;
      for (let i = 0; i < colEnds.length; i++) {
        if (colEnds[i] <= start) {
          placed = i;
          colEnds[i] = end;
          break;
        }
      }
      if (placed === -1) {
        placed = colEnds.length;
        colEnds.push(end);
      }
      placements.push({ id: event.id, col: placed });
    }
    const totalCols = Math.max(1, colEnds.length);
    for (const p of placements) {
      layout.set(p.id, { col: p.col, totalCols });
    }
  }

  return layout;
}

export function safeName(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "planning"
  );
}

export type SheetModelBuildOptions = {
  showDates?: boolean;
  showTimes?: boolean;
  autoCrop?: boolean;
  employeeFilter?: string;
  showHoursSummary?: boolean;
  showSignatureLine?: boolean;
  [key: string]: unknown;
};

export function buildSheetModel(
  board: PlannerBoard,
  options?: SheetModelBuildOptions,
  referenceDate?: Date
): SheetModel {
  const ref = referenceDate ?? new Date(board.updatedAt || board.createdAt || "2026-01-01T00:00:00.000Z");
  const today = new Date();
  const dayOfWeek = (ref.getDay() + 6) % 7;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - dayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekDateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  const weekLabel = `Semaine du ${weekDateFormatter.format(monday)} au ${weekDateFormatter.format(sunday)}`;

  // Filtrage par employé / intervenant si actif
  const empFilter = options?.employeeFilter;
  let relevantEvents = board.events;
  if (empFilter && empFilter !== "all") {
    relevantEvents = empFilter === "unassigned"
      ? board.events.filter((e) => !e.teacher || !e.teacher.trim())
      : board.events.filter((e) => e.teacher?.trim().toLowerCase() === empFilter.toLowerCase());
  }

  const employeesSummary = computeEmployeesSummary(relevantEvents);

  if (board.kind === "monthly") {
    const year = ref.getFullYear();
    const monthIndex = ref.getMonth();
    const monthLabelFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
    const formattedMonth = monthLabelFormatter.format(ref);
    const monthLabel = formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);

    const dayCount = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayIndex = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const totalCells = Math.ceil((firstDayIndex + dayCount) / 7) * 7;

    const monthEvents = relevantEvents.filter((event) =>
      event.date?.startsWith(`${year}-${String(monthIndex + 1).padStart(2, "0")}-`)
    );

    const cells: MonthDayCell[] = Array.from({ length: totalCells }, (_, index) => {
      const dayNum = index - firstDayIndex + 1;
      if (dayNum > 0 && dayNum <= dayCount) {
        const dateString = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
        const dayEvents = monthEvents
          .filter((e) => e.date === dateString)
          .sort((a, b) => a.start.localeCompare(b.start));
        const isToday =
          today.getFullYear() === year &&
          today.getMonth() === monthIndex &&
          today.getDate() === dayNum;
        return {
          dayNumber: dayNum,
          dateString,
          isToday,
          isCurrentMonth: true,
          events: dayEvents,
        };
      }
      return { dayNumber: null, events: [] };
    });

    return {
      title: board.title,
      subtitle: `${monthLabel} · Planning mensuel`,
      kind: board.kind,
      hourStart: 8,
      hourEnd: 20,
      hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      columns: [],
      month: {
        monthLabel,
        year,
        monthIndex,
        weekdays: DAY_NAMES,
        cells,
        eventsCount: monthEvents.length,
      },
      weekLabel,
      totalEvents: monthEvents.length,
      employeesSummary,
      activeFilterEmployee: empFilter,
    };
  }

  // Disposition hebdomadaire / école / quotidien / libre
  // L'option autoCrop ajuste dynamiquement aux heures actives
  const shouldAutoCrop = options?.autoCrop ?? true;
  const { start: hourStart, end: hourEnd } = getHourRange(relevantEvents, 8, 20, shouldAutoCrop);
  const totalMinutes = Math.max(60, (hourEnd - hourStart) * 60);
  const hours = Array.from({ length: Math.max(1, hourEnd - hourStart + 1) }, (_, i) => hourStart + i);

  const columns: SheetColumn[] = DAY_NAMES.map((name, dayIndex) => {
    const colDate = new Date(monday);
    colDate.setDate(monday.getDate() + dayIndex);
    const dateFormatted = String(colDate.getDate()).padStart(2, "0");
    const isToday =
      today.getFullYear() === colDate.getFullYear() &&
      today.getMonth() === colDate.getMonth() &&
      today.getDate() === colDate.getDate();

    const dayEvents = relevantEvents.filter((e) => e.day === dayIndex);
    const layout = layoutDayEvents(dayEvents);

    const placedEvents: PlacedEvent[] = dayEvents.map((event) => {
      const placement = layout.get(event.id) ?? { col: 0, totalCols: 1 };
      const startMin = minutesFromTime(event.start);
      const endMin = minutesFromTime(event.end);

      const boundedStart = Math.max(hourStart * 60, Math.min(hourEnd * 60, startMin));
      const boundedEnd = Math.max(hourStart * 60, Math.min(hourEnd * 60, endMin));

      const topPercent = ((boundedStart - hourStart * 60) / totalMinutes) * 100;
      const heightPercent = Math.max(3.5, ((boundedEnd - boundedStart) / totalMinutes) * 100);

      return {
        ...event,
        col: placement.col,
        totalCols: placement.totalCols,
        topPercent,
        heightPercent,
        startMinutes: startMin,
        endMinutes: endMin,
        formattedDuration: formatDuration(startMin, endMin),
        textColor: getContrastTextColor(event.color),
        secondaryTextColor: getContrastSecondaryColor(event.color),
        overflowTop: startMin < hourStart * 60,
        overflowBottom: endMin > hourEnd * 60,
      };
    });

    return {
      dayIndex,
      label: name,
      shortLabel: name.slice(0, 3).toUpperCase(),
      date: dateFormatted,
      isToday,
      events: placedEvents,
    };
  });

  return {
    title: board.title,
    subtitle: weekLabel,
    kind: board.kind,
    hourStart,
    hourEnd,
    hours,
    columns,
    weekLabel,
    totalEvents: relevantEvents.length,
    employeesSummary,
    activeFilterEmployee: empFilter,
  };
}
