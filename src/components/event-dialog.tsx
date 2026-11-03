"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Clock3, Copy, MapPin, NotebookPen, RefreshCw,
  Trash2, UserRound, X,
} from "lucide-react";
import { EVENT_COLORS, type BoardKind, type ScheduleEvent } from "@/lib/planner-types";

const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const weekdayShorts = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type Props = {
  event: ScheduleEvent | null;
  initialDay: number;
  initialStart: string;
  initialDate?: string;
  monthly?: boolean;
  boardKind?: BoardKind;
  existingEvents?: ScheduleEvent[];
  onClose: () => void;
  onSave: (event: ScheduleEvent, extraEvents?: ScheduleEvent[]) => void;
  onDelete: (id: string) => void;
};

export function EventDialog({
  event,
  initialDay,
  initialStart,
  initialDate,
  monthly = false,
  boardKind = "school",
  existingEvents,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([initialDay]);

  const [draft, setDraft] = useState<ScheduleEvent>(() => event ?? {
    id: crypto.randomUUID(),
    title: "",
    day: initialDay,
    date: initialDate,
    start: initialStart,
    end: addMinutes(initialStart, 60),
    color: EVENT_COLORS[0].value,
    location: "",
    teacher: "",
    notes: "",
    recurrence: "none",
    validFrom: "",
    validTo: "",
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

  const toggleDaySelection = (dayIdx: number) => {
    if (selectedDays.includes(dayIdx)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== dayIdx));
        if (draft.day === dayIdx) {
          const nextDay = selectedDays.find((d) => d !== dayIdx) ?? 0;
          change({ day: nextDay });
        }
      }
    } else {
      setSelectedDays([...selectedDays, dayIdx].sort((a, b) => a - b));
    }
  };

  const selectWorkDays = () => {
    setSelectedDays([0, 1, 2, 3, 4]);
  };

  const selectAllDays = () => {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const teacherLabel = boardKind === "school" ? "Enseignant·e" : "Employé·e / Intervenant·e";
  const teacherPlaceholder = boardKind === "school" ? "Ex. M. Martin" : "Ex. Jean Dupont";

  const handleSubmit = (submit: React.FormEvent) => {
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

    const primaryEvent: ScheduleEvent = {
      ...draft,
      title: draft.title.trim(),
      day: selectedDays[0] ?? draft.day,
      validFrom: draft.validFrom ? draft.validFrom : undefined,
      validTo: draft.validTo ? draft.validTo : undefined,
      recurrence: draft.recurrence === "weekly" ? "weekly" : "none",
    };

    // Création des créneaux supplémentaires pour les jours multiples sélectionnés
    const extraEvents: ScheduleEvent[] = [];
    if (!monthly && selectedDays.length > 1) {
      for (const d of selectedDays.slice(1)) {
        extraEvents.push({
          ...primaryEvent,
          id: crypto.randomUUID(),
          day: d,
        });
      }
    }

    onSave(primaryEvent, extraEvents);
  };

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm"
      onMouseDown={(mouse) => { if (mouse.target === mouse.currentTarget) onClose(); }}
    >
      <form
        className="event-dialog w-full max-w-lg rounded-2xl bg-surface p-5 shadow-card border border-line max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-b-none max-sm:max-h-[92dvh] max-sm:overflow-y-auto"
        onSubmit={handleSubmit}
      >
        <div className="event-dialog-top flex items-center justify-between pb-2 mb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="event-dialog-icon p-1.5 rounded-lg bg-surface-tint text-violet">
              <Clock3 size={16} />
            </span>
            <span className="modal-eyebrow text-xs font-semibold uppercase tracking-wider text-muted">
              {event ? "Modification" : "Nouveau créneau"}
            </span>
          </div>
          <button type="button" className="modal-close icon-button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <h2 className="text-lg font-bold mb-1">{event ? "Modifier le créneau" : "Ajouter un créneau"}</h2>
        <p className="modal-intro text-xs text-muted mb-4">Précisez les horaires, intervenant et détails.</p>

        {error && (
          <div className="event-error-badge text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-2.5 rounded-lg text-xs mb-3">
            {error}
          </div>
        )}

        {/* Titre */}
        <label className="field-label block mb-3">
          <span className="text-xs font-semibold text-ink-soft block mb-1">Titre de l’activité ou du poste</span>
          <input
            className="text-input event-title-input w-full"
            autoFocus
            required
            maxLength={80}
            value={draft.title}
            onChange={(input) => change({ title: input.target.value })}
            placeholder="Ex. Poste Matin · Tri"
          />
        </label>

        {/* Sélection multi-jours (Duplication rapide) sur semaine */}
        {!monthly && !event && (
          <div className="mb-3 p-3 rounded-xl bg-surface-soft border border-line">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Copy size={13} className="text-violet" /> Jours multiples / Duplication rapide
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="text-[10px] px-2 py-0.5 rounded bg-surface-tint text-violet font-semibold hover:bg-violet hover:text-white transition"
                  onClick={selectWorkDays}
                >
                  Lun–Ven
                </button>
                <button
                  type="button"
                  className="text-[10px] px-2 py-0.5 rounded bg-surface-tint text-violet font-semibold hover:bg-violet hover:text-white transition"
                  onClick={selectAllDays}
                >
                  7j/7
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weekdayShorts.map((sh, idx) => {
                const isSelected = selectedDays.includes(idx);
                return (
                  <button
                    key={sh}
                    type="button"
                    className={`py-1.5 text-xs font-bold rounded-lg border transition ${isSelected ? "bg-violet text-white border-violet" : "bg-surface border-line text-muted hover:border-line-strong"}`}
                    onClick={() => toggleDaySelection(idx)}
                    title={weekdays[idx]}
                  >
                    {sh}
                  </button>
                );
              })}
            </div>
            {selectedDays.length > 1 && (
              <small className="text-[11px] text-violet mt-1.5 block">
                ✓ Le créneau sera appliqué sur {selectedDays.length} jours consécutifs.
              </small>
            )}
          </div>
        )}

        {/* Jour / Date & Lieu */}
        <div className="event-two-fields grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <label className="field-label block">
            <span className="text-xs font-semibold text-ink-soft block mb-1">{monthly ? "Date" : "Jour"}</span>
            {monthly ? (
              <input
                className="text-input w-full"
                type="date"
                required
                value={draft.date ?? initialDate ?? ""}
                onChange={(input) => {
                  const val = input.target.value;
                  if (!val) {
                    change({ date: "" });
                    return;
                  }
                  const d = new Date(`${val}T12:00:00`);
                  if (isNaN(d.getTime())) return;
                  const weekday = d.getDay();
                  change({ date: val, day: weekday === 0 ? 6 : weekday - 1 });
                }}
              />
            ) : (
              <select
                className="text-input w-full"
                value={draft.day}
                onChange={(input) => {
                  const dayVal = Number(input.target.value);
                  change({ day: dayVal });
                  setSelectedDays([dayVal]);
                }}
              >
                {weekdays.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            )}
          </label>

          <label className="field-label block">
            <span className="text-xs font-semibold text-ink-soft block mb-1">Salle / lieu</span>
            <span className="input-with-icon relative block">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="text-input w-full pl-9"
                maxLength={70}
                value={draft.location ?? ""}
                onChange={(input) => change({ location: input.target.value })}
                placeholder="Ex. Dépôt A · Poste 2"
              />
            </span>
          </label>
        </div>

        {/* Heures début / fin */}
        <div className="event-two-fields time-field-row grid grid-cols-2 gap-3 mb-3">
          <label className="field-label block">
            <span className="text-xs font-semibold text-ink-soft block mb-1">Début</span>
            <input
              className="text-input w-full"
              type="time"
              step={900}
              value={draft.start}
              onChange={(input) => change({ start: input.target.value })}
            />
          </label>
          <label className="field-label block">
            <span className="text-xs font-semibold text-ink-soft block mb-1">Fin</span>
            <input
              className="text-input w-full"
              type="time"
              step={900}
              value={draft.end}
              onChange={(input) => change({ end: input.target.value })}
            />
          </label>
        </div>

        {conflict && (
          <div
            className="event-conflict-warning flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs mb-3"
            role="status"
          >
            <span>⚠️</span>
            <span>
              Chevauche <strong>{conflict.title || "un créneau"}</strong> ({conflict.start}–{conflict.end})
            </span>
          </div>
        )}

        {/* Employé / Enseignant (libellé dynamique) */}
        <label className="field-label teacher-field block mb-3">
          <span className="text-xs font-semibold text-ink-soft flex items-center justify-between mb-1">
            <span>{teacherLabel}</span>
            <span className="optional-label text-[10px] text-muted">OPTIONNEL</span>
          </span>
          <span className="input-with-icon relative block">
            <UserRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="text-input w-full pl-9"
              maxLength={70}
              value={draft.teacher ?? ""}
              onChange={(input) => change({ teacher: input.target.value })}
              placeholder={teacherPlaceholder}
            />
          </span>
        </label>

        {/* Palette de couleurs */}
        <div className="field-label color-field-label block mb-3">
          <span className="text-xs font-semibold text-ink-soft block mb-1">Couleur du créneau</span>
          <div className="color-palette flex gap-2 flex-wrap" role="radiogroup" aria-label="Couleur du créneau">
            {EVENT_COLORS.map((color) => (
              <button
                type="button"
                role="radio"
                aria-checked={draft.color === color.value}
                aria-label={color.name}
                title={color.name}
                key={color.value}
                className={`color-swatch w-7 h-7 rounded-lg border-2 transition ${draft.color === color.value ? "ring-2 ring-violet scale-110" : "border-line"}`}
                style={{ backgroundColor: color.value }}
                onClick={() => change({ color: color.value })}
              />
            ))}
          </div>
        </div>

        {/* Toggle options avancées (récurrence, dates) */}
        <div className="mb-3">
          <button
            type="button"
            className="text-xs text-violet font-semibold hover:underline flex items-center gap-1"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <RefreshCw size={13} /> {showAdvanced ? "Masquer les options avancées" : "Afficher récurrence & validité"}
          </button>

          {showAdvanced && (
            <div className="mt-2 p-3 rounded-xl bg-surface-soft border border-line space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-ink-soft block mb-1">Récurrence</span>
                <select
                  className="text-input w-full text-xs"
                  value={draft.recurrence ?? "none"}
                  onChange={(e) => change({ recurrence: e.target.value as "weekly" | "none" })}
                >
                  <option value="none">Aucune (créneau unique)</option>
                  <option value="weekly">Hebdomadaire (toutes les semaines)</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-medium text-ink-soft block mb-1">Valide à partir du</span>
                  <input
                    type="date"
                    className="text-input w-full text-xs"
                    value={draft.validFrom ?? ""}
                    onChange={(e) => change({ validFrom: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink-soft block mb-1">Jusqu&apos;au</span>
                  <input
                    type="date"
                    className="text-input w-full text-xs"
                    value={draft.validTo ?? ""}
                    onChange={(e) => change({ validTo: e.target.value })}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <label className="field-label notes-field block mb-4">
          <span className="text-xs font-semibold text-ink-soft flex items-center justify-between mb-1">
            <span className="flex items-center gap-1"><NotebookPen size={13} /> Notes</span>
            <span className="optional-label text-[10px] text-muted">OPTIONNEL</span>
          </span>
          <textarea
            className="text-input w-full text-xs"
            rows={2}
            maxLength={300}
            value={draft.notes ?? ""}
            onChange={(input) => change({ notes: input.target.value })}
            placeholder="Consignes spécifiques, matériel, détails..."
          />
        </label>

        {/* Actions fixes en bas sur mobile (sticky bottom-0) */}
        <div className="dialog-actions event-dialog-actions sticky bottom-0 bg-surface/95 backdrop-blur pt-3 border-t border-line flex items-center justify-between gap-2">
          {event ? (
            <button
              type="button"
              className="icon-danger-button p-2 rounded-xl text-red hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              aria-label="Supprimer le créneau"
              title="Supprimer"
              onClick={() => onDelete(event.id)}
            >
              <Trash2 size={17} />
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button type="button" className="button-quiet text-xs" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="button-primary text-xs">
              {event ? "Enregistrer" : "Ajouter au planning"}
            </button>
          </div>
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
