"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowLeftRight, ArrowRight, CalendarDays, Check, ChevronLeft,
  ChevronRight, Clock3, Grid3X3, LayoutGrid, Plus, Printer, SlidersHorizontal,
  Sparkles, ZoomIn, ZoomOut,
} from "lucide-react";
import { EventDialog } from "@/components/event-dialog";
import { MonthlyPlanner } from "@/components/monthly-planner";
import { layoutDayEvents, minutesFromTime } from "@/lib/sheet-layout";
import type { PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const hourStart = 8;
const hourEnd = 20;
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
  const [selectedDay, setSelectedDay] = useState(getTodayIndex);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [addDefaults, setAddDefaults] = useState({ day: 0, start: "09:00" });
  const [prevBoardMeta, setPrevBoardMeta] = useState({ id: board.id, title: board.title });
  const [titleDraft, setTitleDraft] = useState(board.title);

  if (prevBoardMeta.id !== board.id || prevBoardMeta.title !== board.title) {
    setPrevBoardMeta({ id: board.id, title: board.title });
    setTitleDraft(board.title);
  }

  const week = useMemo(() => createWeek(weekOffset), [weekOffset]);
  const activeDays = onlyDay ? [week[selectedDay]] : week;
  const hourHeight = baseHourHeight[density] * zoom / 100;
  const rangeText = `${formatTime(week[0].date)} – ${formatTime(week[6].date)}`;
  const visibleEvents = board.events.filter((event) => event.day >= 0 && event.day <= 6 && minutesFromTime(event.start) < hourEnd * 60 && minutesFromTime(event.end) > hourStart * 60);
  const sortedEvents = [...visibleEvents].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  const todayCount = visibleEvents.filter((event) => event.day === selectedDay).length;

  const addEventAt = (day: number, hour: number) => {
    const start = `${String(hour).padStart(2, "0")}:00`;
    setAddDefaults({ day, start });
    setEditing({ id: "", title: "", day, start, end: `${String(hour + 1).padStart(2, "0")}:00`, color: "#e8e5ff" });
  };

  const startNew = () => addEventAt(selectedDay, 9);
  const saveEvent = (event: ScheduleEvent) => {
    if (event.end <= event.start) { onToast("L’heure de fin doit être après celle du début"); return; }
    onEventSave(event);
    setEditing(null);
  };

  const setTitle = (title: string) => {
    setTitleDraft(title);
    onBoardChange({ ...board, title: title.trim() || board.title });
  };

  if (board.kind === "monthly") {
    return (
      <div className="editor-page">
        <div className="editor-heading">
          <div className="editor-title-stack">
            <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Mes tableaux</button>
            <div className="editor-title-line"><span className="editor-board-mark" style={{ background: board.color }}><CalendarDays size={17} /></span><input aria-label="Nom du tableau" className="editor-title-input" value={titleDraft} onChange={(input) => setTitleDraft(input.target.value)} onBlur={() => setTitle(titleDraft)} onKeyDown={(key) => { if (key.key === "Enter") key.currentTarget.blur(); }} /><button className="editor-title-check" aria-label="Enregistrer le titre" onClick={() => setTitle(titleDraft)}><Check size={15} /></button></div>
            <p>{board.events.length} note{board.events.length === 1 ? "" : "s"} dans ton mois <span>·</span> synchronisé automatiquement</p>
          </div>
          <div className="editor-heading-actions">
            <span className="autosave-status"><i /> Enregistré</span>
            <button className="button-secondary export-quick" onClick={onOpenStudio} title="Accéder au Studio d’impression et d’export"><Printer size={15} /> Imprimer & Exporter</button>
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
          <div className="editor-title-line"><span className="editor-board-mark" style={{ background: board.color }}><CalendarDays size={17} /></span><input aria-label="Nom du tableau" className="editor-title-input" value={titleDraft} onChange={(input) => setTitleDraft(input.target.value)} onBlur={() => setTitle(titleDraft)} onKeyDown={(key) => { if (key.key === "Enter") key.currentTarget.blur(); }} /><button className="editor-title-check" aria-label="Enregistrer le titre" onClick={() => setTitle(titleDraft)}><Check size={15} /></button></div>
          <p>{board.events.length} créneau{board.events.length === 1 ? "" : "x"} organisé{board.events.length === 1 ? "" : "s"} avec soin <span>·</span> synchronisé automatiquement</p>
        </div>
        <div className="editor-heading-actions">
          <span className="autosave-status"><i /> Enregistré</span>
          <button className="button-secondary export-quick" onClick={onOpenStudio} title="Accéder au Studio d’impression et d’export"><Printer size={15} /> Imprimer & Exporter</button>
          <button className="button-primary editor-add-button" onClick={startNew}><Plus size={16} /> Ajouter un créneau</button>
        </div>
      </div>

      <section className="editor-card">
        <div className="editor-toolbar">
          <div className="week-navigation"><button className="round-control" onClick={() => setWeekOffset((value) => value - 1)} aria-label="Semaine précédente"><ChevronLeft size={17} /></button><button className="week-range-button" onClick={() => setWeekOffset(0)}><CalendarDays size={15} /> {rangeText} {weekOffset === 0 && <span className="this-week-tag">CETTE SEMAINE</span>}</button><button className="round-control" onClick={() => setWeekOffset((value) => value + 1)} aria-label="Semaine suivante"><ChevronRight size={17} /></button></div>
          <div className="editor-tools-right">
            <div className="mode-switch" role="tablist" aria-label="Mode d’affichage"><button role="tab" aria-selected={mode === "timeline"} className={mode === "timeline" ? "mode-active" : ""} onClick={() => setMode("timeline")}><ArrowLeftRight size={15} /> Chronologique</button><button role="tab" aria-selected={mode === "matrix"} className={mode === "matrix" ? "mode-active" : ""} onClick={() => setMode("matrix")}><Grid3X3 size={15} /> Matriciel</button></div>
            <div className="toolbar-separator" />
            <button className={`view-toggle ${onlyDay ? "view-toggle-active" : ""}`} onClick={() => setOnlyDay((value) => !value)}><LayoutGrid size={15} /><span>{onlyDay ? "Jour" : "Semaine"}</span></button>
          </div>
        </div>

        <div className="day-selector-mobile">{week.map((day) => <button key={day.index} className={selectedDay === day.index ? "selected-day" : ""} onClick={() => { setSelectedDay(day.index); setOnlyDay(true); }}><span>{day.name.slice(0, 1)}</span><strong>{day.date.getDate()}</strong></button>)}</div>
        {mode === "timeline" ? <div className="schedule-scroll"><div className="schedule-canvas" style={{ minWidth: onlyDay ? "610px" : "100%" }}>
          <div className="schedule-day-head"><span className="schedule-time-head">GMT+2</span>{activeDays.map((day) => <button key={day.index} className={`schedule-day-cell ${day.index === getTodayIndex() ? "schedule-day-today" : ""}`} onClick={() => { setSelectedDay(day.index); setOnlyDay(true); }}><span>{day.name.slice(0, 3)}</span><strong>{day.date.getDate()}</strong>{day.index === getTodayIndex() && <i />}</button>)}</div>
          <div className="timeline-body" style={{ "--hour-height": `${hourHeight}px`, "--day-count": activeDays.length } as React.CSSProperties}>
            <div className="time-rail">{Array.from({ length: hourEnd - hourStart + 1 }, (_, index) => <span key={index} style={{ height: hourHeight }}>{String(hourStart + index).padStart(2, "0")}<small>:00</small></span>)}</div>
            {activeDays.map((day) => {
              const dayEvents = sortedEvents.filter((event) => event.day === day.index);
              const layoutMap = layoutDayEvents(dayEvents);
              return <div className="timeline-day-column" key={day.index}>
                <div className="hour-lines">{Array.from({ length: hourEnd - hourStart }, (_, index) => <button key={index} className="hour-slot" style={{ height: hourHeight }} aria-label={`Ajouter un créneau ${day.name} à ${hourStart + index} h`} onClick={() => addEventAt(day.index, hourStart + index)}><Plus size={13} /></button>)}</div>
                {dayEvents.map((event) => {
                  const start = Math.max(minutesFromTime(event.start), hourStart * 60);
                  const end = Math.min(minutesFromTime(event.end), hourEnd * 60);
                  const top = ((start - hourStart * 60) / 60) * hourHeight + 3;
                  const height = Math.max(27, ((end - start) / 60) * hourHeight - 5);
                  const info = layoutMap.get(event.id) ?? { col: 0, totalCols: 1 };
                  const widthPct = 100 / info.totalCols;
                  const leftPct = info.col * widthPct;
                  return <button key={event.id} className="timeline-event" style={{
                    top,
                    height,
                    left: `calc(${leftPct}% + 2px)`,
                    width: `calc(${widthPct}% - 4px)`,
                    background: event.color,
                    "--event-accent": event.color
                  } as React.CSSProperties} onClick={() => setEditing(event)} title={`${event.title} · ${event.start}–${event.end}`}>
                    <strong>{event.title}</strong><span>{event.start} – {event.end}</span>{height > 47 && event.location && <small>{event.location}</small>}
                  </button>;
                })}
                {dayEvents.length === 0 && <button className="empty-day-hint" onClick={() => addEventAt(day.index, 9)}><Plus size={13} /> Ajouter</button>}
              </div>;
            })}
          </div>
          <div className="schedule-end-note"><span>20:00</span><div>Tout est prévu, même le temps de souffler <span>♡</span></div></div>
        </div></div> : <div className="matrix-scroll"><table className="schedule-matrix"><thead><tr><th className="matrix-time-head"><SlidersHorizontal size={13} /></th>{activeDays.map((day) => <th key={day.index}>{day.name.slice(0, 3)} <span>{day.date.getDate()}</span></th>)}</tr></thead><tbody>{Array.from({ length: hourEnd - hourStart }, (_, row) => <tr key={row}><th>{String(hourStart + row).padStart(2, "0")}:00</th>{activeDays.map((day) => {
            const matches = sortedEvents.filter((event) => event.day === day.index && minutesFromTime(event.start) < (hourStart + row + 1) * 60 && minutesFromTime(event.end) > (hourStart + row) * 60);
            return <td key={day.index}><button className="matrix-cell" onClick={() => addEventAt(day.index, hourStart + row)} aria-label={`Ajouter ${day.name} ${hourStart + row} heures`}>{matches.map((event) => <span key={event.id} className="matrix-event" style={{ background: event.color }} onClick={(click) => { click.stopPropagation(); setEditing(event); }}><strong>{event.title}</strong><small>{event.start}</small></span>)}</button></td>;
          })}</tr>)}</tbody></table></div>}

        <div className="editor-footer">
          <div className="editor-legend"><span><i className="legend-dot legend-school" /> Cours & activités</span><button onClick={startNew}><Plus size={13} /> Nouveau créneau</button></div>
          <div className="editor-view-settings"><label className="density-select"><SlidersHorizontal size={14} /><select value={density} onChange={(change) => setDensity(change.target.value as keyof typeof baseHourHeight)} aria-label="Densité d’affichage"><option>Normal</option><option>Compact</option><option>Ultra-compact</option></select></label><span className="settings-divider" /><button className="zoom-button" aria-label="Dézoomer" onClick={() => setZoom((value) => Math.max(30, value - 10))}><ZoomOut size={15} /></button><input className="zoom-range" aria-label="Zoom" type="range" min={30} max={150} step={10} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><button className="zoom-button" aria-label="Zoomer" onClick={() => setZoom((value) => Math.min(150, value + 10))}><ZoomIn size={15} /></button><span className="zoom-value">{zoom}%</span></div>
        </div>
      </section>

      <div className="editor-lower-row"><div className="editor-encouragement"><span><Sparkles size={16} /></span><p>Un planning, ce n’est pas une liste de choses à faire.<br /><strong>C’est la place que tu donnes à ta vie.</strong></p><span className="encouragement-heart">✳</span></div><div className="editor-share-note"><CalendarCheck2Icon /><div><strong>Ton planning t’appartient</strong><span>Chaque modification est enregistrée automatiquement.</span></div></div></div>
      {editing && <EventDialog event={editing.id ? editing : null} initialDay={addDefaults.day} initialStart={addDefaults.start} onClose={() => setEditing(null)} onSave={saveEvent} onDelete={(id) => { onEventDelete(id); setEditing(null); }} />}
    </div>
  );
}

function CalendarCheck2Icon() {
  return <span className="sync-icon"><Check size={15} /></span>;
}
