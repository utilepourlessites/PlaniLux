"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowLeftRight, CalendarDays, ChevronLeft,
  ChevronRight, Grid3X3, Plus, Printer, Redo2, SlidersHorizontal,
  Sparkles, TriangleAlert, Undo2, ZoomIn, ZoomOut, Check,
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

export function ScheduleEditor({ board, onBoardChange, onBack, onOpenStudio, onEventSave, onEventDelete, onToast, syncStatus = "saved" }: {
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
  const [density, setDensity] = useState<keyof typeof baseHourHeight>("Normal");
  const [zoom, setZoom] = useState(100);
  const [weekOffset, setWeekOffset] = useState(0);
  const [onlyDay, setOnlyDay] = useState(false);
  const [hideWeekend, setHideWeekend] = useState(false);
  const [selectedDay, setSelectedDay] = useState(getTodayIndex);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [addDefaults, setAddDefaults] = useState({ day: 0, start: "09:00" });
  const [prevBoardMeta, setPrevBoardMeta] = useState({ id: board.id, title: board.title });
  const [titleDraft, setTitleDraft] = useState(board.title);

  // Historique Undo / Redo (25 états)
  const [past, setPast] = useState<ScheduleEvent[][]>([]);
  const [future, setFuture] = useState<ScheduleEvent[][]>([]);

  const pushHistory = useCallback((currentEvents: ScheduleEvent[]) => {
    setPast((prev) => [...prev.slice(-25), currentEvents]);
    setFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [board.events, ...prev]);
    onBoardChange({ ...board, events: previous });
    onToast("Action annulée");
  }, [past, board, onBoardChange, onToast]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setPast((prev) => [...prev, board.events]);
    onBoardChange({ ...board, events: next });
    onToast("Action rétablie");
  }, [future, board, onBoardChange, onToast]);

  if (prevBoardMeta.id !== board.id || prevBoardMeta.title !== board.title) {
    setPrevBoardMeta({ id: board.id, title: board.title });
    setTitleDraft(board.title);
  }

  // Détection des chevauchements horaires (Collision Warning)
  const conflictingEventIds = useMemo(() => {
    const conflicts = new Set<string>();
    const events = board.events;
    for (let i = 0; i < events.length; i++) {
      const a = events[i];
      const aStart = minutesFromTime(a.start);
      const aEnd = minutesFromTime(a.end);
      for (let j = i + 1; j < events.length; j++) {
        const b = events[j];
        const sameDay = board.kind === "monthly"
          ? Boolean(a.date && b.date && a.date === b.date)
          : a.day === b.day;
        if (sameDay) {
          const bStart = minutesFromTime(b.start);
          const bEnd = minutesFromTime(b.end);
          if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
            conflicts.add(a.id);
            conflicts.add(b.id);
          }
        }
      }
    }
    return conflicts;
  }, [board.events, board.kind]);

  // Point T-1 : Plage horaire dynamique calculée à partir des événements
  const { start: hourStart, end: hourEnd } = useMemo(
    () => getHourRange(board.events, 8, 20),
    [board.events]
  );

  // Point T-2 : Fuseau horaire dynamique
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

  const visibleEvents = board.events.filter(
    (event) =>
      event.day >= 0 &&
      event.day <= 6 &&
      minutesFromTime(event.start) < hourEnd * 60 &&
      minutesFromTime(event.end) > hourStart * 60
  );
  const sortedEvents = [...visibleEvents].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));

  const addEventAt = (day: number, hour: number) => {
    const start = `${String(hour).padStart(2, "0")}:00`;
    setAddDefaults({ day, start });
    setEditing({ id: "", title: "", day, start, end: `${String(hour + 1).padStart(2, "0")}:00`, color: "#e8e5ff" });
  };

  const startNew = () => addEventAt(selectedDay, Math.max(hourStart, 9));

  const saveEvent = (event: ScheduleEvent) => {
    if (event.end <= event.start) {
      onToast("L’heure de fin doit être après celle du début");
      return;
    }
    pushHistory(board.events);
    onEventSave(event);
    setEditing(null);
  };

  const handleDeleteEvent = (id: string) => {
    pushHistory(board.events);
    onEventDelete(id);
    setEditing(null);
  };

  const saveTitle = () => {
    const nextTitle = titleDraft.trim() || board.title;
    setTitleDraft(nextTitle);
    if (nextTitle !== board.title) {
      onBoardChange({ ...board, title: nextTitle });
    }
  };

  // Raccourcis clavier universels (Ctrl+Z, Ctrl+Y, Ctrl+P, N, Échap)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea" || activeTag === "select";

      // Ctrl+Z ou Cmd+Z : Annuler / Rétablir
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (isInput) return;
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      // Ctrl+Y ou Cmd+Y : Rétablir
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        if (isInput) return;
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+P ou Cmd+P : Ouvrir le Studio
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        onOpenStudio();
        return;
      }

      // N : Nouveau créneau
      if (!isInput && e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey && !e.altKey && !editing) {
        e.preventDefault();
        startNew();
        return;
      }

      // Échap : Fermer la modale
      if (e.key === "Escape" && editing) {
        e.preventDefault();
        setEditing(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, onOpenStudio, editing]);

  if (board.kind === "monthly") {
    return (
      <div className="editor-page">
        <div className="editor-heading">
          <div className="editor-title-stack">
            <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Mes tableaux</button>
            <div className="editor-title-line">
              <span className="editor-board-mark" style={{ background: board.color }}><CalendarDays size={17} /></span>
              <input
                aria-label="Nom du tableau"
                className="editor-title-input"
                value={titleDraft}
                onChange={(input) => setTitleDraft(input.target.value)}
                onBlur={saveTitle}
                onKeyDown={(key) => { if (key.key === "Enter") key.currentTarget.blur(); }}
              />
            </div>
            <p>{board.events.length} note{board.events.length === 1 ? "" : "s"} dans ton mois <span>·</span> synchronisé automatiquement</p>
          </div>
          <div className="editor-heading-actions">
            <button
              type="button"
              className="round-control"
              onClick={handleUndo}
              disabled={past.length === 0}
              title="Annuler (Ctrl+Z)"
              aria-label="Annuler"
              style={{ opacity: past.length === 0 ? 0.35 : 1, cursor: past.length === 0 ? "not-allowed" : "pointer" }}
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              className="round-control"
              onClick={handleRedo}
              disabled={future.length === 0}
              title="Rétablir (Ctrl+Y)"
              aria-label="Rétablir"
              style={{ opacity: future.length === 0 ? 0.35 : 1, cursor: future.length === 0 ? "not-allowed" : "pointer" }}
            >
              <Redo2 size={16} />
            </button>
            <span className={`autosave-status ${syncStatus === "saving" ? "is-saving" : syncStatus === "error" ? "is-error" : ""}`} style={syncStatus === "error" ? { color: "#e53e3e" } : undefined}>
              <i style={syncStatus === "error" ? { background: "#e53e3e" } : syncStatus === "saving" ? { background: "#ecc94b" } : undefined} />
              {syncStatus === "saving" ? "Enregistrement…" : syncStatus === "error" ? "Non synchronisé" : "Enregistré"}
            </span>
            <button className="button-secondary export-quick" onClick={onOpenStudio} title="Accéder au Studio d’impression et d’export (Ctrl+P)">
              <Printer size={15} /> Imprimer & Exporter
            </button>
          </div>
        </div>
        <MonthlyPlanner board={board} onEventSave={saveEvent} onEventDelete={handleDeleteEvent} onToast={onToast} />
      </div>
    );
  }

  return (
    <div className="editor-page">
      <div className="editor-heading">
        <div className="editor-title-stack">
          <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Mes tableaux</button>
          <div className="editor-title-line">
            <span className="editor-board-mark" style={{ background: board.color }}><CalendarDays size={17} /></span>
            <input
              aria-label="Nom du tableau"
              className="editor-title-input"
              value={titleDraft}
              onChange={(input) => setTitleDraft(input.target.value)}
              onBlur={saveTitle}
              onKeyDown={(key) => { if (key.key === "Enter") key.currentTarget.blur(); }}
            />
          </div>
          <p>{board.events.length} créneau{board.events.length === 1 ? "" : "x"} organisé{board.events.length === 1 ? "" : "s"} avec soin <span>·</span> synchronisé automatiquement</p>
        </div>
        <div className="editor-heading-actions">
          <button
            type="button"
            className="round-control"
            onClick={handleUndo}
            disabled={past.length === 0}
            title="Annuler (Ctrl+Z)"
            aria-label="Annuler"
            style={{ opacity: past.length === 0 ? 0.35 : 1, cursor: past.length === 0 ? "not-allowed" : "pointer" }}
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="round-control"
            onClick={handleRedo}
            disabled={future.length === 0}
            title="Rétablir (Ctrl+Y)"
            aria-label="Rétablir"
            style={{ opacity: future.length === 0 ? 0.35 : 1, cursor: future.length === 0 ? "not-allowed" : "pointer" }}
          >
            <Redo2 size={16} />
          </button>

          {conflictingEventIds.size > 0 && (
            <span
              className="conflict-badge"
              title="Créneaux avec chevauchement horaire détecté"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#b45309",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <TriangleAlert size={13} /> {conflictingEventIds.size} conflit{conflictingEventIds.size > 1 ? "s" : ""}
            </span>
          )}

          <span className={`autosave-status ${syncStatus === "saving" ? "is-saving" : syncStatus === "error" ? "is-error" : ""}`} style={syncStatus === "error" ? { color: "#e53e3e" } : undefined}>
            <i style={syncStatus === "error" ? { background: "#e53e3e" } : syncStatus === "saving" ? { background: "#ecc94b" } : undefined} />
            {syncStatus === "saving" ? "Enregistrement…" : syncStatus === "error" ? "Non synchronisé" : "Enregistré"}
          </span>
          <button className="button-secondary export-quick" onClick={onOpenStudio} title="Accéder au Studio d’impression et d’export (Ctrl+P)">
            <Printer size={15} /> Imprimer & Exporter
          </button>
          <button className="button-primary editor-add-button" onClick={startNew} title="Ajouter un créneau (Raccourci: N)">
            <Plus size={16} /> Ajouter un créneau
          </button>
        </div>
      </div>

      <section className="editor-card">
        <div className="editor-toolbar">
          <div className="week-navigation">
            <button className="round-control" onClick={() => setWeekOffset((value) => value - 1)} aria-label="Semaine précédente">
              <ChevronLeft size={17} />
            </button>
            <button className="week-range-button" onClick={() => setWeekOffset(0)}>
              <CalendarDays size={15} /> {rangeText} {weekOffset === 0 && <span className="this-week-tag">CETTE SEMAINE</span>}
            </button>
            <button className="round-control" onClick={() => setWeekOffset((value) => value + 1)} aria-label="Semaine suivante">
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="editor-tools-right">
            {/* T-7a : Option Masquer le week-end */}
            <button
              type="button"
              className={`button-quiet toggle-weekend-btn ${hideWeekend ? "is-active" : ""}`}
              onClick={() => setHideWeekend((prev) => !prev)}
              title={hideWeekend ? "Afficher les 7 jours de la semaine" : "Afficher 5 jours (lundi à vendredi)"}
            >
              {hideWeekend ? "5 jours" : "7 jours"}
            </button>

            <div className="mode-switch" role="tablist" aria-label="Mode d’affichage">
              <button role="tab" aria-selected={mode === "timeline"} className={mode === "timeline" ? "mode-active" : ""} onClick={() => setMode("timeline")}>
                <ArrowLeftRight size={15} /> Chronologique
              </button>
              <button role="tab" aria-selected={mode === "matrix"} className={mode === "matrix" ? "mode-active" : ""} onClick={() => setMode("matrix")}>
                <Grid3X3 size={15} /> Matriciel
              </button>
            </div>

            <div className="toolbar-separator" />

            {/* T-7d : Contrôle segmenté Semaine | Jour */}
            <div className="segmented-control" role="group" aria-label="Portée de la vue">
              <button
                type="button"
                className={`segmented-item ${!onlyDay ? "is-active" : ""}`}
                onClick={() => setOnlyDay(false)}
              >
                Semaine
              </button>
              <button
                type="button"
                className={`segmented-item ${onlyDay ? "is-active" : ""}`}
                onClick={() => setOnlyDay(true)}
              >
                Jour
              </button>
            </div>
          </div>
        </div>

        <div className="day-selector-mobile">
          {fullWeek.map((day) => (
            <button
              key={day.index}
              className={selectedDay === day.index ? "selected-day" : ""}
              onClick={() => { setSelectedDay(day.index); setOnlyDay(true); }}
            >
              <span>{day.name.slice(0, 1)}</span>
              <strong>{day.date.getDate()}</strong>
            </button>
          ))}
        </div>

        {mode === "timeline" ? (
          <div className="schedule-scroll">
            <div className="schedule-canvas" style={{ minWidth: onlyDay ? "610px" : "100%" }}>
              {/* T-4 : En-têtes de jour centrés et verticaux */}
              <div className="schedule-day-head">
                <span className="schedule-time-head">{tzLabel}</span>
                {activeDays.map((day) => {
                  const isToday = day.index === getTodayIndex();
                  return (
                    <button
                      key={day.index}
                      className={`schedule-day-cell ${isToday ? "schedule-day-today" : ""}`}
                      onClick={() => { setSelectedDay(day.index); setOnlyDay(true); }}
                    >
                      <span className="schedule-day-name">{day.name.slice(0, 3)}</span>
                      <strong className="schedule-day-num">{day.date.getDate()}</strong>
                      {isToday && <i className="today-dot" />}
                    </button>
                  );
                })}
              </div>

              <div className="timeline-body" style={{ "--hour-height": `${hourHeight}px`, "--day-count": activeDays.length } as React.CSSProperties}>
                <div className="time-rail">
                  {Array.from({ length: hourEnd - hourStart + 1 }, (_, index) => (
                    <span key={index} style={{ height: hourHeight }}>
                      {String(hourStart + index).padStart(2, "0")}<small>:00</small>
                    </span>
                  ))}
                </div>
                {activeDays.map((day) => {
                  const dayEvents = sortedEvents.filter((event) => event.day === day.index);
                  const layoutMap = layoutDayEvents(dayEvents);
                  return (
                    <div className="timeline-day-column" key={day.index}>
                      <div className="hour-lines">
                        {Array.from({ length: hourEnd - hourStart }, (_, index) => (
                          <button
                            key={index}
                            className="hour-slot"
                            style={{ height: hourHeight }}
                            aria-label={`Ajouter un créneau ${day.name} à ${hourStart + index} h`}
                            onClick={() => addEventAt(day.index, hourStart + index)}
                          >
                            <Plus size={13} />
                          </button>
                        ))}
                      </div>
                      {dayEvents.map((event) => {
                        const start = Math.max(minutesFromTime(event.start), hourStart * 60);
                        const end = Math.min(minutesFromTime(event.end), hourEnd * 60);
                        const top = ((start - hourStart * 60) / 60) * hourHeight + 3;
                        const height = Math.max(27, ((end - start) / 60) * hourHeight - 5);
                        const info = layoutMap.get(event.id) ?? { col: 0, totalCols: 1 };
                        const widthPct = 100 / info.totalCols;
                        const leftPct = info.col * widthPct;
                        const isConflicting = conflictingEventIds.has(event.id);
                        return (
                          <button
                            key={event.id}
                            className={`timeline-event ${isConflicting ? "has-conflict" : ""}`}
                            style={{
                              top,
                              height,
                              left: `calc(${leftPct}% + 2px)`,
                              width: `calc(${widthPct}% - 4px)`,
                              background: event.color,
                              "--event-accent": event.color,
                              outline: isConflicting ? "2px solid #f59e0b" : undefined,
                            } as React.CSSProperties}
                            onClick={() => setEditing(event)}
                            title={`${event.title} · ${event.start}–${event.end}${isConflicting ? " (Attention : chevauchement horaire)" : ""}`}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3, width: "100%" }}>
                              <strong>{event.title}</strong>
                              {isConflicting && <TriangleAlert size={12} color="#b45309" />}
                            </div>
                            <span>{event.start} – {event.end}</span>
                            {height > 47 && event.location && <small>{event.location}</small>}
                          </button>
                        );
                      })}
                      {dayEvents.length === 0 && (
                        <button className="empty-day-hint" onClick={() => addEventAt(day.index, Math.max(hourStart, 9))}>
                          <Plus size={13} /> Ajouter
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* T-1 : Affichage dynamique de la fin de journée */}
              <div className="schedule-end-note">
                <span>{String(hourEnd).padStart(2, "0")}:00</span>
                <div>Tout est prévu, même le temps de souffler <span>♡</span></div>
              </div>
            </div>
          </div>
        ) : (
          /* T-3 : Vue matricielle propre et accessible */
          <div className="matrix-scroll">
            <table className="schedule-matrix">
              <thead>
                <tr>
                  <th className="matrix-time-head"><SlidersHorizontal size={13} /></th>
                  {activeDays.map((day) => (
                    <th key={day.index}>
                      {day.name.slice(0, 3)} <span>{day.date.getDate()}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: hourEnd - hourStart }, (_, row) => {
                  const currentHour = hourStart + row;
                  return (
                    <tr key={row}>
                      <th>{String(currentHour).padStart(2, "0")}:00</th>
                      {activeDays.map((day) => {
                        const dayEvents = sortedEvents.filter((event) => event.day === day.index);
                        const matches = dayEvents.filter((event) => {
                          const s = minutesFromTime(event.start);
                          const e = minutesFromTime(event.end);
                          return s < (currentHour + 1) * 60 && e > currentHour * 60;
                        });
                        return (
                          <td key={day.index}>
                            <div className="matrix-cell">
                              {matches.length === 0 ? (
                                <button
                                  type="button"
                                  className="matrix-cell-empty-btn"
                                  onClick={() => addEventAt(day.index, currentHour)}
                                  aria-label={`Ajouter un créneau ${day.name} à ${currentHour} h`}
                                >
                                  <Plus size={12} />
                                </button>
                              ) : (
                                matches.map((event) => {
                                  const eventStartHour = Math.floor(minutesFromTime(event.start) / 60);
                                  const isStart = eventStartHour === currentHour;
                                  const isConflicting = conflictingEventIds.has(event.id);
                                  return (
                                    <button
                                      key={event.id}
                                      type="button"
                                      className={`matrix-event-btn ${!isStart ? "matrix-event-continuation" : ""} ${isConflicting ? "has-conflict" : ""}`}
                                      style={{
                                        background: event.color,
                                        outline: isConflicting && isStart ? "2px solid #f59e0b" : undefined,
                                      }}
                                      onClick={() => setEditing(event)}
                                      title={`${event.title} · ${event.start}–${event.end}${isConflicting ? " (Attention : chevauchement horaire)" : ""}`}
                                    >
                                      {isStart ? (
                                        <>
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3, width: "100%" }}>
                                            <strong>{event.title}</strong>
                                            {isConflicting && <TriangleAlert size={10} color="#b45309" />}
                                          </div>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="editor-footer">
          <div className="editor-legend">
            <span><i className="legend-dot legend-school" /> Cours & activités</span>
            <button onClick={startNew}><Plus size={13} /> Nouveau créneau</button>
          </div>
          <div className="editor-view-settings">
            <label className="density-select">
              <SlidersHorizontal size={14} />
              <select value={density} onChange={(change) => setDensity(change.target.value as keyof typeof baseHourHeight)} aria-label="Densité d’affichage">
                <option>Normal</option>
                <option>Compact</option>
                <option>Ultra-compact</option>
              </select>
            </label>
            <span className="settings-divider" />
            <button className="zoom-button" aria-label="Dézoomer" onClick={() => setZoom((value) => Math.max(30, value - 10))}>
              <ZoomOut size={15} />
            </button>
            <input className="zoom-range" aria-label="Zoom" type="range" min={30} max={150} step={10} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            <button className="zoom-button" aria-label="Zoomer" onClick={() => setZoom((value) => Math.min(150, value + 10))}>
              <ZoomIn size={15} />
            </button>
            <span className="zoom-value">{zoom}%</span>
          </div>
        </div>
      </section>

      <div className="editor-lower-row">
        <div className="editor-encouragement">
          <span><Sparkles size={16} /></span>
          <p>Un planning, ce n’est pas une liste de choses à faire.<br /><strong>C’est la place que tu donnes à ta vie.</strong></p>
          <span className="encouragement-heart">✳</span>
        </div>
        <div className="editor-share-note">
          <CalendarCheck2Icon />
          <div>
            <strong>Ton planning t’appartient</strong>
            <span>Chaque modification est enregistrée automatiquement.</span>
          </div>
        </div>
      </div>

      {editing && (
        <EventDialog
          event={editing.id ? editing : null}
          initialDay={addDefaults.day}
          initialStart={addDefaults.start}
          existingEvents={board.events}
          onClose={() => setEditing(null)}
          onSave={saveEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
}

function CalendarCheck2Icon() {
  return (
    <span className="sync-icon">
      <Check size={15} />
    </span>
  );
}
