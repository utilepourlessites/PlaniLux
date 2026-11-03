"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowLeftRight, CalendarDays, ChevronLeft,
  ChevronRight, Grid3X3, Plus, Printer, SlidersHorizontal,
  Sparkles, ZoomIn, ZoomOut, Check, UserRound, Ellipsis, X,
} from "lucide-react";
import { EventDialog } from "@/components/event-dialog";
import { MonthlyPlanner } from "@/components/monthly-planner";
import { getHourRange, layoutDayEvents, minutesFromTime } from "@/lib/sheet-layout";
import type { PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const baseHourHeight: Record<string, number> = { Normal: 62, Compact: 46, "Ultra-compact": 34 };

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);
}

function getTodayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function createWeek(offset: number) {
  const today = new Date();
  const monday = new Date(today);
  const day = today.getDay();
  monday.setDate(today.getDate() + (day === 0 ? -6 : 1 - day) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return dayNames.map((name, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { name, date, index };
  });
}

export function ScheduleEditor({
  board,
  onBoardChange,
  onBack,
  onOpenStudio,
  onEventSave,
  onEventDelete,
  onToast,
  syncStatus = "saved",
}: {
  board: PlannerBoard;
  onBoardChange: (board: PlannerBoard) => void;
  onBack: () => void;
  onOpenStudio: () => void;
  onEventSave: (event: ScheduleEvent) => void;
  onEventDelete: (id: string) => void;
  onToast: (message: string) => void;
  syncStatus?: "saving" | "saved" | "error" | "idle";
}) {
  const [mode, setMode] = useState<"timeline" | "matrix">("timeline");
  const [matrixViewType, setMatrixViewType] = useState<"days" | "employees">("days");
  const [density, setDensity] = useState<keyof typeof baseHourHeight>("Normal");
  const [zoom, setZoom] = useState(100);
  const [weekOffset, setWeekOffset] = useState(0);
  const [onlyDay, setOnlyDay] = useState(false);
  const [hideWeekend, setHideWeekend] = useState(false);
  const [selectedDay, setSelectedDay] = useState(getTodayIndex);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [addDefaults, setAddDefaults] = useState({ day: 0, start: "09:00" });
  const [prevBoardMeta, setPrevBoardMeta] = useState({ id: board.id, title: board.title });
  const [titleDraft, setTitleDraft] = useState(board.title);

  if (prevBoardMeta.id !== board.id || prevBoardMeta.title !== board.title) {
    setPrevBoardMeta({ id: board.id, title: board.title });
    setTitleDraft(board.title);
  }

  // Plage horaire dynamique
  const { start: hourStart, end: hourEnd } = useMemo(
    () => getHourRange(board.events, 8, 20),
    [board.events]
  );

  // Fuseau horaire
  const tzLabel = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat("fr-FR", { timeZoneName: "short" }).formatToParts(new Date());
      return parts.find((p) => p.type === "timeZoneName")?.value ?? "Heure";
    } catch {
      return "Heure";
    }
  }, []);

  const fullWeek = useMemo(() => createWeek(weekOffset), [weekOffset]);
  const displayedDays = useMemo(
    () => (hideWeekend ? fullWeek.slice(0, 5) : fullWeek),
    [fullWeek, hideWeekend]
  );
  const activeDays = onlyDay ? [fullWeek[selectedDay]] : displayedDays;
  const hourHeight = (baseHourHeight[density] * zoom) / 100;
  const rangeText = `${formatTime(fullWeek[0].date)} – ${formatTime(fullWeek[hideWeekend ? 4 : 6].date)}`;

  // Liste des employés
  const employees = useMemo(() => {
    const set = new Set<string>();
    for (const ev of board.events) {
      if (ev.teacher && ev.teacher.trim()) set.add(ev.teacher.trim());
    }
    const list = Array.from(set).sort();
    return list.length ? list : ["Équipe"];
  }, [board.events]);

  const visibleEvents = board.events.filter(
    (event) =>
      event.day >= 0 &&
      event.day <= 6 &&
      minutesFromTime(event.start) < hourEnd * 60 &&
      minutesFromTime(event.end) > hourStart * 60
  );

  const addEventAt = (day: number, hour: number, defaultTeacher?: string) => {
    const start = `${String(hour).padStart(2, "0")}:00`;
    setAddDefaults({ day, start });
    setEditing({
      id: "",
      title: "",
      day,
      start,
      end: `${String(hour + 1).padStart(2, "0")}:00`,
      color: "#e8e5ff",
      teacher: defaultTeacher ?? "",
    });
  };

  const startNew = () => addEventAt(selectedDay, Math.max(hourStart, 9));

  const saveEvent = (event: ScheduleEvent, extraEvents?: ScheduleEvent[]) => {
    if (event.end <= event.start) {
      onToast("L’heure de fin doit être après celle du début");
      return;
    }
    onEventSave(event);
    if (extraEvents && extraEvents.length) {
      for (const extra of extraEvents) {
        onEventSave(extra);
      }
    }
    setEditing(null);
  };

  const saveTitle = () => {
    const nextTitle = titleDraft.trim() || board.title;
    setTitleDraft(nextTitle);
    if (nextTitle !== board.title) {
      onBoardChange({ ...board, title: nextTitle });
    }
  };

  if (board.kind === "monthly") {
    return (
      <div className="editor-page">
        <div className="editor-heading">
          <div className="editor-heading-left">
            <button className="back-link" onClick={onBack}>
              <ArrowLeft size={15} /> Mes tableaux
            </button>
            <input
              className="editor-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            />
          </div>
          <div className="editor-heading-actions">
            <button className="button-primary" onClick={onOpenStudio}>
              <Printer size={15} /> Studio d’export
            </button>
          </div>
        </div>

        <MonthlyPlanner
          board={board}
          onEventSave={saveEvent}
          onEventDelete={(id: string) => {
            onEventDelete(id);
            setEditing(null);
          }}
          onToast={onToast}
        />
      </div>
    );
  }

  return (
    <div className="editor-page">
      <div className="editor-heading flex items-center justify-between gap-3 flex-wrap">
        <div className="editor-heading-left flex items-center gap-3 min-w-0">
          <button className="back-link" onClick={onBack} title="Retour aux tableaux">
            <ArrowLeft size={15} /> <span className="hidden sm:inline">Mes tableaux</span>
          </button>
          <input
            className="editor-title-input min-w-0"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            title="Cliquez pour renommer"
          />
        </div>

        <div className="editor-heading-actions flex items-center gap-2">
          {/* Menu d'outils mobile */}
          <div className="relative sm:hidden">
            <button
              className="button-quiet icon-button"
              onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
              aria-label="Options d’affichage"
            >
              <Ellipsis size={18} />
            </button>

            {mobileToolsOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-64 p-3 bg-surface rounded-xl shadow-card border border-line">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-line">
                  <strong className="text-xs">Options d&apos;affichage</strong>
                  <button className="icon-button" onClick={() => setMobileToolsOpen(false)}><X size={14} /></button>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block mb-1 font-medium">Vue calendrier :</label>
                    <div className="flex gap-1">
                      <button
                        className={`segmented-chip flex-1 py-1 ${!onlyDay ? "is-selected" : ""}`}
                        onClick={() => { setOnlyDay(false); setMobileToolsOpen(false); }}
                      >
                        Semaine
                      </button>
                      <button
                        className={`segmented-chip flex-1 py-1 ${onlyDay ? "is-selected" : ""}`}
                        onClick={() => { setOnlyDay(true); setMobileToolsOpen(false); }}
                      >
                        Jour
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 font-medium">Jours affichés :</label>
                    <button
                      className={`segmented-chip w-full py-1 ${hideWeekend ? "is-selected" : ""}`}
                      onClick={() => setHideWeekend(!hideWeekend)}
                    >
                      {hideWeekend ? "5 jours (Lun-Ven)" : "7 jours (Toute la semaine)"}
                    </button>
                  </div>

                  <div>
                    <label className="block mb-1 font-medium">Densité horaire :</label>
                    <select
                      className="text-input w-full py-1"
                      value={density}
                      onChange={(e) => setDensity(e.target.value as keyof typeof baseHourHeight)}
                    >
                      <option>Normal</option>
                      <option>Compact</option>
                      <option>Ultra-compact</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button className="button-primary" onClick={onOpenStudio}>
            <Printer size={15} /> <span className="hidden sm:inline">Studio d’export</span>
          </button>
        </div>
      </div>

      <section className="editor-card" aria-label="Éditeur de planning">
        <div className="editor-toolbar flex items-center justify-between gap-3 flex-wrap">
          {/* Navigation semaine / jour */}
          <div className="week-nav flex items-center gap-1.5">
            <button className="icon-button" onClick={() => setWeekOffset((v) => v - 1)} title="Semaine précédente">
              <ChevronLeft size={16} />
            </button>
            <span className="week-label font-medium text-xs sm:text-sm">{rangeText}</span>
            <button className="icon-button" onClick={() => setWeekOffset((v) => v + 1)} title="Semaine suivante">
              <ChevronRight size={16} />
            </button>
            {weekOffset !== 0 && (
              <button className="today-button ml-1" onClick={() => setWeekOffset(0)}>
                Aujourd’hui
              </button>
            )}
          </div>

          {/* Mode Timeline vs Matrice & Vue Employé */}
          <div className="editor-modes flex items-center gap-1">
            <div className="segmented-group flex">
              <button
                type="button"
                className={`segmented-button ${mode === "timeline" ? "is-active" : ""}`}
                onClick={() => setMode("timeline")}
                title="Vue grille temporelle"
              >
                <CalendarDays size={14} /> <span className="hidden sm:inline">Grille</span>
              </button>
              <button
                type="button"
                className={`segmented-button ${mode === "matrix" ? "is-active" : ""}`}
                onClick={() => setMode("matrix")}
                title="Vue matricielle"
              >
                <Grid3X3 size={14} /> <span className="hidden sm:inline">Matrice</span>
              </button>
            </div>

            {mode === "matrix" && (
              <button
                type="button"
                className={`button-quiet text-xs flex items-center gap-1.5 ml-2 ${matrixViewType === "employees" ? "button-highlight font-bold" : ""}`}
                onClick={() => setMatrixViewType(matrixViewType === "days" ? "employees" : "days")}
                title="Basculer entre vue par Jours et vue par Employés"
              >
                <UserRound size={14} />
                <span>{matrixViewType === "employees" ? "Vue Employés (Active)" : "Vue par Employé"}</span>
              </button>
            )}

            {/* Basculement rapide Jour/Semaine sur desktop */}
            <div className="segmented-group hidden sm:flex ml-2">
              <button
                type="button"
                className={`segmented-button ${!onlyDay ? "is-active" : ""}`}
                onClick={() => setOnlyDay(false)}
              >
                Semaine
              </button>
              <button
                type="button"
                className={`segmented-button ${onlyDay ? "is-active" : ""}`}
                onClick={() => setOnlyDay(true)}
              >
                Jour
              </button>
            </div>
          </div>
        </div>

        {/* Sélecteur de jour quand "Jour" est sélectionné */}
        {onlyDay && (
          <div className="day-chips-row flex gap-1 p-2 bg-surface-soft border-b border-line overflow-x-auto">
            {fullWeek.map((day) => (
              <button
                key={day.index}
                type="button"
                className={`segmented-chip ${selectedDay === day.index ? "is-selected" : ""}`}
                onClick={() => setSelectedDay(day.index)}
              >
                {day.name} {formatTime(day.date)}
              </button>
            ))}
          </div>
        )}

        {/* Mode 1 : Timeline (Grille temporelle) avec colonne des heures sticky à gauche */}
        {mode === "timeline" && (
          <div className="editor-grid-wrapper overflow-x-auto relative">
            <div
              className="editor-grid"
              style={{
                gridTemplateColumns: `54px repeat(${activeDays.length}, minmax(130px, 1fr))`,
              }}
            >
              {/* En-tête coin gauche : sticky left-0 z-30 */}
              <div
                className="editor-grid-cell editor-corner-cell sticky left-0 z-30 bg-surface/95 backdrop-blur border-r border-line"
                style={{ height: 44 }}
              >
                <span className="text-[10px] text-muted font-bold">{tzLabel}</span>
              </div>

              {/* En-têtes des jours */}
              {activeDays.map((day) => {
                const isToday = day.index === getTodayIndex() && weekOffset === 0;
                return (
                  <div
                    key={day.name}
                    className={`editor-grid-cell editor-day-head ${isToday ? "is-today" : ""}`}
                    style={{ height: 44 }}
                  >
                    <span className="day-head-name">{day.name}</span>
                    <strong className="day-head-date">{formatTime(day.date)}</strong>
                  </div>
                );
              })}

              {/* Échelle des heures : sticky left-0 z-20 */}
              <div
                className="editor-hour-col sticky left-0 z-20 bg-surface/95 backdrop-blur border-r border-line"
                style={{ height: (hourEnd - hourStart) * hourHeight }}
              >
                {Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i).map((h) => (
                  <div
                    key={h}
                    className="editor-hour-tick"
                    style={{ height: hourHeight }}
                  >
                    <span>{String(h).padStart(2, "0")}h</span>
                  </div>
                ))}
              </div>

              {/* Colonnes des jours */}
              {activeDays.map((day) => {
                const dayEvents = visibleEvents.filter((e) => e.day === day.index);
                const layout = layoutDayEvents(dayEvents);

                return (
                  <div
                    key={day.name}
                    className="editor-day-col relative"
                    style={{ height: (hourEnd - hourStart) * hourHeight }}
                    onDoubleClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const hour = Math.floor(y / hourHeight) + hourStart;
                      addEventAt(day.index, hour);
                    }}
                  >
                    {/* Lignes d'heures */}
                    {Array.from({ length: hourEnd - hourStart }, (_, i) => (
                      <div
                        key={i}
                        className="editor-grid-h-line"
                        style={{ top: i * hourHeight, height: hourHeight }}
                        onClick={() => addEventAt(day.index, hourStart + i)}
                      />
                    ))}

                    {/* Événements placés */}
                    {dayEvents.map((event) => {
                      const placement = layout.get(event.id) ?? { col: 0, totalCols: 1 };
                      const startMin = minutesFromTime(event.start);
                      const endMin = minutesFromTime(event.end);
                      const top = ((startMin - hourStart * 60) / 60) * hourHeight;
                      const height = Math.max(22, ((endMin - startMin) / 60) * hourHeight);
                      const widthPercent = 100 / placement.totalCols;
                      const leftPercent = placement.col * widthPercent;

                      return (
                        <button
                          key={event.id}
                          type="button"
                          className="editor-event-card"
                          style={{
                            top,
                            height,
                            left: `${leftPercent}%`,
                            width: `calc(${widthPercent}% - 2px)`,
                            backgroundColor: event.color,
                            borderColor: event.color,
                            zIndex: 10,
                          }}
                          onClick={() => setEditing(event)}
                        >
                          <div className="editor-event-card-content">
                            <span className="editor-event-time">
                              {event.start} – {event.end}
                            </span>
                            <strong className="editor-event-title">{event.title}</strong>
                            {event.teacher && <small className="editor-event-teacher">👤 {event.teacher}</small>}
                            {event.location && <small className="editor-event-location">📍 {event.location}</small>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode 2 : Vue Matricielle (par Jour ou par Employé) */}
        {mode === "matrix" && (
          <div className="matrix-table-wrap overflow-x-auto">
            {matrixViewType === "employees" ? (
              /* Vue Matrice par Employé */
              <table className="matrix-table w-full">
                <thead>
                  <tr>
                    <th className="matrix-th-time sticky left-0 z-20 bg-surface/95 backdrop-blur border-r border-line">
                      Employé
                    </th>
                    {displayedDays.map((day) => (
                      <th key={day.name} className="matrix-th-day text-center">
                        {day.name} <small>{formatTime(day.date)}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp}>
                      <td className="matrix-td-time sticky left-0 z-10 bg-surface/95 backdrop-blur border-r border-line font-bold">
                        👤 {emp}
                      </td>
                      {displayedDays.map((day) => {
                        const matches = board.events.filter(
                          (ev) =>
                            ev.day === day.index &&
                            (ev.teacher?.trim().toLowerCase() === emp.toLowerCase() ||
                              (!ev.teacher?.trim() && emp === "Équipe"))
                        );
                        return (
                          <td key={day.name} className="matrix-td-cell p-1 align-top">
                            <div className="space-y-1">
                              {matches.map((ev) => (
                                <button
                                  key={ev.id}
                                  type="button"
                                  className="w-full text-left p-1.5 rounded text-xs block"
                                  style={{ backgroundColor: ev.color }}
                                  onClick={() => setEditing(ev)}
                                >
                                  <strong>{ev.title}</strong>
                                  <div className="text-[10px] text-muted">
                                    {ev.start} – {ev.end}
                                  </div>
                                </button>
                              ))}
                              <button
                                type="button"
                                className="matrix-cell-empty-btn w-full p-1 text-center text-muted hover:text-ink text-xs rounded border border-dashed border-line"
                                onClick={() => addEventAt(day.index, 9, emp === "Équipe" ? "" : emp)}
                                title={`Ajouter un créneau pour ${emp}`}
                              >
                                <Plus size={11} className="inline mr-1" /> Ajouter
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* Vue Matrice standard par Jour/Heure */
              <table className="matrix-table w-full">
                <thead>
                  <tr>
                    <th className="matrix-th-time sticky left-0 z-20 bg-surface/95 backdrop-blur border-r border-line">
                      Horaires
                    </th>
                    {activeDays.map((day) => (
                      <th key={day.name} className="matrix-th-day text-center">
                        {day.name} <small>{formatTime(day.date)}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i).map((currentHour) => (
                    <tr key={currentHour}>
                      <td className="matrix-td-time sticky left-0 z-10 bg-surface/95 backdrop-blur border-r border-line font-medium text-xs">
                        {String(currentHour).padStart(2, "0")}:00
                      </td>
                      {activeDays.map((day) => {
                        const matches = board.events.filter((ev) => {
                          if (ev.day !== day.index) return false;
                          const s = minutesFromTime(ev.start);
                          const e = minutesFromTime(ev.end);
                          return s < (currentHour + 1) * 60 && e > currentHour * 60;
                        });

                        return (
                          <td key={day.name} className="matrix-td-cell">
                            <div className="matrix-cell-events">
                              {matches.length === 0 ? (
                                <button
                                  type="button"
                                  className="matrix-cell-empty-btn"
                                  onClick={() => addEventAt(day.index, currentHour)}
                                  aria-label={`Ajouter un créneau ${day.name} à ${currentHour}h`}
                                >
                                  <Plus size={12} />
                                </button>
                              ) : (
                                matches.map((event) => {
                                  const eventStartHour = Math.floor(minutesFromTime(event.start) / 60);
                                  const isStart = eventStartHour === currentHour;
                                  return (
                                    <button
                                      key={event.id}
                                      type="button"
                                      className={`matrix-event-btn ${!isStart ? "matrix-event-continuation" : ""}`}
                                      style={{ background: event.color }}
                                      onClick={() => setEditing(event)}
                                      title={`${event.title} · ${event.start}–${event.end}`}
                                    >
                                      {isStart ? (
                                        <>
                                          <strong>{event.title}</strong>
                                          <small>{event.start}</small>
                                        </>
                                      ) : (
                                        <small className="matrix-cont-label">↓ {event.title}</small>
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="editor-footer flex items-center justify-between gap-3 flex-wrap">
          <div className="editor-legend flex items-center gap-3">
            <span><i className="legend-dot legend-school" /> Cours & créneaux</span>
            <button className="button-quiet text-xs flex items-center gap-1" onClick={startNew}>
              <Plus size={13} /> Nouveau créneau
            </button>
          </div>

          <div className="editor-view-settings hidden sm:flex items-center gap-2">
            <label className="density-select">
              <SlidersHorizontal size={14} />
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value as keyof typeof baseHourHeight)}
                aria-label="Densité d’affichage"
              >
                <option>Normal</option>
                <option>Compact</option>
                <option>Ultra-compact</option>
              </select>
            </label>
            <span className="settings-divider" />
            <button className="zoom-button" aria-label="Dézoomer" onClick={() => setZoom((v) => Math.max(30, v - 10))}>
              <ZoomOut size={15} />
            </button>
            <input
              className="zoom-range"
              aria-label="Zoom"
              type="range"
              min={30}
              max={150}
              step={10}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <button className="zoom-button" aria-label="Zoomer" onClick={() => setZoom((v) => Math.min(150, v + 10))}>
              <ZoomIn size={15} />
            </button>
            <span className="zoom-value">{zoom}%</span>
          </div>
        </div>
      </section>

      {editing && (
        <EventDialog
          event={editing.id ? editing : null}
          initialDay={addDefaults.day}
          initialStart={addDefaults.start}
          boardKind={board.kind}
          existingEvents={board.events}
          onClose={() => setEditing(null)}
          onSave={saveEvent}
          onDelete={(id) => {
            onEventDelete(id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
