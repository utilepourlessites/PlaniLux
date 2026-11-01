"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowLeftRight, CalendarDays, ChevronLeft,
  ChevronRight, Grid3X3, Plus, Printer, SlidersHorizontal,
  Sparkles, ZoomIn, ZoomOut, Check,
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

export function ScheduleEditor({ board, onBoardChange, onBack, onOpenStudio, onEventSave, onEventDelete, onToast }: {
  board: PlannerBoard;
  onBoardChange: (board: PlannerBoard) => void;
  onBack: () => void;
  onOpenStudio: () => void;
  onEventSave: (event: ScheduleEvent) => void;
  onEventDelete: (id: string) => void;
  onToast: (message: string) => void;
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

  if (prevBoardMeta.id !== board.id || prevBoardMeta.title !== board.title) {
    setPrevBoardMeta({ id: board.id, title: board.title });
    setTitleDraft(board.title);
  }

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
    onEventSave(event);
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
            <span className="autosave-status"><i /> Enregistré</span>
            <button className="button-secondary export-quick" onClick={onOpenStudio} title="Accéder au Studio d’impression et d’export">
              <Printer size={15} /> Imprimer & Exporter
            </button>
          </div>
        </div>
        <MonthlyPlanner board={board} onEventSave={onEventSave} onEventDelete={onEventDelete} onToast={onToast} />
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
          <span className="autosave-status"><i /> Enregistré</span>
          <button className="button-secondary export-quick" onClick={onOpenStudio} title="Accéder au Studio d’impression et d’export">
            <Printer size={15} /> Imprimer & Exporter
          </button>
          <button className="button-primary editor-add-button" onClick={startNew}>
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
                        return (
                          <button
                            key={event.id}
                            className="timeline-event"
                            style={{
                              top,
                              height,
                              left: `calc(${leftPct}% + 2px)`,
                              width: `calc(${widthPct}% - 4px)`,
                              background: event.color,
                              "--event-accent": event.color,
                            } as React.CSSProperties}
                            onClick={() => setEditing(event)}
                            title={`${event.title} · ${event.start}–${event.end}`}
                          >
                            <strong>{event.title}</strong>
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
          onDelete={(id) => {
            onEventDelete(id);
            setEditing(null);
          }}
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
