"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, MapPin, NotebookPen, Trash2, UserRound, X } from "lucide-react";
import { EVENT_COLORS, type ScheduleEvent } from "@/lib/planner-types";

const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

type Props = {
  event: ScheduleEvent | null;
  initialDay: number;
  initialStart: string;
  initialDate?: string;
  monthly?: boolean;
  existingEvents?: ScheduleEvent[];
  onClose: () => void;
  onSave: (event: ScheduleEvent) => void;
  onDelete: (id: string) => void;
};

export function EventDialog({ event, initialDay, initialStart, initialDate, monthly = false, existingEvents, onClose, onSave, onDelete }: Props) {
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<ScheduleEvent>(() => event ?? {
    id: crypto.randomUUID(), title: "", day: initialDay, date: initialDate, start: initialStart,
    end: addMinutes(initialStart, 60), color: EVENT_COLORS[0].value, location: "", teacher: "", notes: "",
  });

  const conflict = useMemo(() => {
    if (!existingEvents || !draft.start || !draft.end || draft.end <= draft.start) return null;
    return existingEvents.find((other) => {
      if (other.id === draft.id) return false;
      if (monthly) {
        if (other.date && draft.date && other.date !== draft.date) return false;
      } else {
        if (other.day !== draft.day) return false;
      }
      return other.start < draft.end && other.end > draft.start;
    });
  }, [existingEvents, draft.id, draft.day, draft.date, draft.start, draft.end, monthly]);

  useEffect(() => {
    const onKeyDown = (key: KeyboardEvent) => { if (key.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const change = (patch: Partial<ScheduleEvent>) => {
    setError("");
    setDraft((current) => ({ ...current, ...patch }));
  };

  return (
    <div className="modal-backdrop" onMouseDown={(mouse) => { if (mouse.target === mouse.currentTarget) onClose(); }}>
      <form className="event-dialog" onSubmit={(submit) => {
        submit.preventDefault();
        if (!draft.title.trim()) return;
        if (draft.end <= draft.start) {
          setError("L’heure de fin doit être postérieure à l’heure de début.");
          return;
        }
        if (monthly && !draft.date) {
          setError("Veuillez sélectionner une date.");
          return;
        }
        onSave({ ...draft, title: draft.title.trim() });
      }}>
        <div className="event-dialog-top"><span className="event-dialog-icon"><Clock3 size={17} /></span><span className="modal-eyebrow">UN PETIT CRÉNEAU POUR TOI</span><button type="button" className="modal-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div>
        <h2>{event ? "Modifier le créneau" : "Ajouter un créneau"}</h2>
        <p className="modal-intro">Tout commence par un titre. Le reste peut attendre.</p>
        {error && <div className="event-error-badge" style={{ color: "#c53030", background: "#fff5f5", padding: "8px 12px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "12px", border: "1px solid #fed7d7" }}>{error}</div>}
        <label className="field-label">Titre du cours ou de l’activité
          <input className="text-input event-title-input" autoFocus required maxLength={80} value={draft.title} onChange={(input) => change({ title: input.target.value })} placeholder="Ex. Design d’interaction" />
        </label>
        <div className="event-two-fields">
          <label className="field-label">{monthly ? "Date" : "Jour"}
            {monthly ? <input className="text-input" type="date" required value={draft.date ?? initialDate ?? ""} onChange={(input) => {
              const value = input.target.value;
              if (!value) {
                change({ date: "" });
                return;
              }
              const d = new Date(`${value}T12:00:00`);
              if (isNaN(d.getTime())) return;
              const weekday = d.getDay();
              change({ date: value, day: weekday === 0 ? 6 : weekday - 1 });
            }} /> : <select className="text-input" value={draft.day} onChange={(input) => change({ day: Number(input.target.value) })}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select>}
          </label>
          <label className="field-label">Salle / lieu
            <span className="input-with-icon"><MapPin size={15} /><input className="text-input" maxLength={70} value={draft.location ?? ""} onChange={(input) => change({ location: input.target.value })} placeholder="Ex. Bât. A · 204" /></span>
          </label>
        </div>
        <div className="event-two-fields time-field-row">
          <label className="field-label">Début
            <input className="text-input" type="time" step={900} value={draft.start} onChange={(input) => change({ start: input.target.value })} />
          </label>
          <label className="field-label">Fin
            <input className="text-input" type="time" step={900} value={draft.end} onChange={(input) => change({ end: input.target.value })} />
          </label>
        </div>
        {conflict && (
          <div
            className="event-conflict-warning"
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 11px",
              marginTop: "8px",
              borderRadius: "7px",
              background: "#fff9eb",
              border: "1px solid #f9e2af",
              color: "#855a10",
              fontSize: "0.8125rem",
            }}
          >
            <span>⚠️</span>
            <span>
              Chevauche <strong>{conflict.title || "un créneau"}</strong> ({conflict.start}–{conflict.end})
            </span>
          </div>
        )}
        <label className="field-label teacher-field">Enseignant·e <span className="optional-label">OPTIONNEL</span>
          <span className="input-with-icon"><UserRound size={15} /><input className="text-input" maxLength={70} value={draft.teacher ?? ""} onChange={(input) => change({ teacher: input.target.value })} placeholder="Nom de l’enseignant·e" /></span>
        </label>
        <div className="field-label color-field-label">Une couleur pour s’y retrouver
          <div className="color-palette" role="radiogroup" aria-label="Couleur du créneau">{EVENT_COLORS.map((color) => <button type="button" role="radio" aria-checked={draft.color === color.value} aria-label={color.name} title={color.name} key={color.value} className={`color-swatch ${draft.color === color.value ? "swatch-selected" : ""}`} style={{ backgroundColor: color.value }} onClick={() => change({ color: color.value })} />)}</div>
        </div>
        <label className="field-label notes-field"><span><NotebookPen size={14} /> Notes <span className="optional-label">OPTIONNEL</span></span>
          <textarea className="text-input" rows={2} maxLength={300} value={draft.notes ?? ""} onChange={(input) => change({ notes: input.target.value })} placeholder="Un détail à garder en tête…" />
        </label>
        <div className="dialog-actions event-dialog-actions">
          {event && <button type="button" className="icon-danger-button" aria-label="Supprimer le créneau" title="Supprimer" onClick={() => onDelete(event.id)}><Trash2 size={17} /></button>}
          <button type="button" className="button-quiet" onClick={onClose}>Annuler</button>
          <button type="submit" className="button-primary">{event ? "Enregistrer" : "Ajouter au planning"}</button>
        </div>
      </form>
    </div>
  );
}

function addMinutes(time: string, minutes: number) {
  if (!time || !time.includes(":")) return "10:00";
  const [hours, mins] = time.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, (hours || 0) * 60 + (mins || 0) + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
