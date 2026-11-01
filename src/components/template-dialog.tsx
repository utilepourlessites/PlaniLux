"use client";

import { useState } from "react";
import {
  BookOpen, CalendarDays, Check, ChevronRight, Clock3, Grid3X3, LayoutTemplate,
  Sparkles, X,
} from "lucide-react";
import { BOARD_KIND_LABELS, type BoardKind } from "@/lib/planner-types";

const templates: { kind: BoardKind; subtitle: string; icon: typeof CalendarDays; accent: string }[] = [
  { kind: "school", subtitle: "Cours, salles & enseignants", icon: BookOpen, accent: "lilac" },
  { kind: "weekly", subtitle: "Toute ta semaine, en un regard", icon: CalendarDays, accent: "mint" },
  { kind: "monthly", subtitle: "Tes objectifs, mois après mois", icon: LayoutTemplate, accent: "peach" },
  { kind: "daily", subtitle: "Une journée guidée heure par heure", icon: Clock3, accent: "blue" },
  { kind: "blank", subtitle: "Commence avec une page blanche", icon: Grid3X3, accent: "yellow" },
];

export function TemplateDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (kind: BoardKind, title: string) => void }) {
  const [kind, setKind] = useState<BoardKind>("school");
  const [title, setTitle] = useState("Mon emploi du temps");

  const select = (next: BoardKind) => {
    setKind(next);
    const defaults: Record<BoardKind, string> = {
      school: "Mon emploi du temps", weekly: "Ma nouvelle semaine", monthly: "Mon nouveau mois", daily: "Ma journée", blank: "Nouveau tableau",
    };
    setTitle(defaults[next]);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="template-dialog" role="dialog" aria-modal="true" aria-labelledby="template-title">
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        <div className="modal-eyebrow"><span><Sparkles size={14} /></span> À TON IMAGE</div>
        <h2 id="template-title">Par quoi on commence ?</h2>
        <p className="modal-intro">Choisis un modèle et fais de la place pour ce qui compte.</p>
        <div className="template-options">
          {templates.map(({ kind: itemKind, subtitle, icon: Icon, accent }) => (
            <button key={itemKind} className={`template-option ${kind === itemKind ? "template-selected" : ""}`} onClick={() => select(itemKind)}>
              <span className={`template-icon template-icon-${accent}`}><Icon size={19} /></span>
              <span className="template-label"><strong>{BOARD_KIND_LABELS[itemKind]}</strong><small>{subtitle}</small></span>
              <span className="template-check">{kind === itemKind ? <Check size={15} /> : <ChevronRight size={16} />}</span>
            </button>
          ))}
        </div>
        <label className="field-label template-name-label">Nom du tableau
          <input className="text-input" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="Titre du tableau" />
        </label>
        <div className="dialog-actions">
          <button className="button-quiet" onClick={onClose}>Annuler</button>
          <button className="button-primary" onClick={() => onCreate(kind, title.trim() || BOARD_KIND_LABELS[kind])}>Créer mon tableau <ChevronRight size={16} /></button>
        </div>
      </section>
    </div>
  );
}
