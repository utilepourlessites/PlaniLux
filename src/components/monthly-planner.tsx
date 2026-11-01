"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import { EventDialog } from "@/components/event-dialog";
import type { PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function toISODate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateForInput(date: Date) {
  return toISODate(date.getFullYear(), date.getMonth(), date.getDate());
}

export function MonthlyPlanner({ board, onEventSave, onEventDelete, onToast }: {
  board: PlannerBoard;
  onEventSave: (event: ScheduleEvent) => void;
  onEventDelete: (id: string) => void;
  onToast: (message: string) => void;
}) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [newDate, setNewDate] = useState("");
  const today = new Date();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(month);
  const addDate = today.getFullYear() === year && today.getMonth() === monthIndex ? dateForInput(today) : toISODate(year, monthIndex, 1);
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const cells = useMemo(() => Array.from({ length: Math.ceil((offset + dayCount) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= dayCount ? day : null;
  }), [offset, dayCount]);
  const monthEvents = board.events.filter((event) => event.date?.startsWith(`${year}-${String(monthIndex + 1).padStart(2, "0")}-`));

  const addForDate = (date: string) => {
    setNewDate(date);
    setEditing({ id: "", title: "", day: new Date(`${date}T12:00:00`).getDay() === 0 ? 6 : new Date(`${date}T12:00:00`).getDay() - 1, date, start: "09:00", end: "10:00", color: "#e8e5ff" });
  };

  return (
    <div className="month-planner-card">
      <div className="month-planner-toolbar">
        <div className="month-heading"><span className="month-heading-icon"><CalendarDays size={17} /></span><div><span className="section-eyebrow">LE TEMPS À TON RYTHME</span><h2>{monthLabel}</h2></div></div>
        <div className="month-navigation"><button className="round-control" aria-label="Mois précédent" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={17} /></button><button className="month-current-button" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Aujourd’hui</button><button className="round-control" aria-label="Mois suivant" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={17} /></button></div>
        <button className="button-primary month-add-button" onClick={() => addForDate(addDate)}><Plus size={15} /> Ajouter une note</button>
      </div>
      <div className="month-calendar" role="grid" aria-label={`Calendrier ${monthLabel}`}>
        <div className="month-weekday-row" role="row">{weekdays.map((day) => <span role="columnheader" key={day}>{day.slice(0, 3)}</span>)}</div>
        <div className="month-day-grid">
          {cells.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} className="month-day-empty" aria-hidden="true" />;
            const date = toISODate(year, monthIndex, day);
            const entries = monthEvents.filter((event) => event.date === date).sort((a, b) => a.start.localeCompare(b.start));
            const isToday = today.getFullYear() === year && today.getMonth() === monthIndex && today.getDate() === day;
            return <div className={`month-day-cell ${isToday ? "month-day-today" : ""}`} role="gridcell" key={date}>
              <button className="month-day-trigger" aria-label={`Ajouter une note le ${day} ${monthLabel}`} onClick={() => addForDate(date)}><span className={isToday ? "month-today-number" : ""}>{day}</span><Plus size={13} /></button>
              <div className="month-day-events">{entries.slice(0, 3).map((event) => <button className="month-event-chip" key={event.id} style={{ background: event.color }} title={`${event.start} · ${event.title}`} onClick={() => { setNewDate(date); setEditing(event); }}><span>{event.start}</span><strong>{event.title}</strong></button>)}{entries.length > 3 && <span className="month-more-events">+ {entries.length - 3} de plus</span>}</div>
            </div>;
          })}
        </div>
      </div>
      <div className="month-planner-footer"><span><i /> {monthEvents.length} rendez-vous ce mois-ci</span><span><Sparkles size={13} /> Prévois aussi du temps pour l’imprévu.</span><div className="month-bottom-arrows"><button aria-label="Mois précédent" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ArrowLeft size={14} /></button><button aria-label="Mois suivant" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ArrowRight size={14} /></button></div></div>
      {editing && <EventDialog event={editing.id ? editing : null} initialDay={editing.day} initialStart={editing.start} initialDate={newDate} monthly onClose={() => setEditing(null)} onSave={(event) => {
        if (!event.date) { onToast("Choisis une date pour ce créneau"); return; }
        if (event.end <= event.start) { onToast("L’heure de fin doit être après celle du début"); return; }
        onEventSave(event);
        setEditing(null);
      }} onDelete={(id) => { onEventDelete(id); setEditing(null); }} />}
    </div>
  );
}
