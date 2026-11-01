"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, Download, FileText, Image as ImageIcon, Printer,
  RefreshCw, Sparkles, Type,
} from "lucide-react";
import { downloadDocx, downloadPdf, downloadPng, printSchedule, type ExportFormat, type ExportOptions } from "@/lib/exports";
import type { PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const defaultOptions: ExportOptions = { format: "a4", orientation: "landscape", whiteBackground: false, showTitle: true, showDates: true, showTimes: true, showLogo: true, font: "Sans" };

function EventList({ events, options }: { events: ScheduleEvent[]; options: ExportOptions }) {
  if (!events.length) return <span className="export-empty-line">Un espace pour de nouvelles idées</span>;
  return <div className="export-events-list">{events.slice(0, 4).map((event) => <div key={event.id} className="export-event-line" style={{ borderLeftColor: options.whiteBackground ? "#d6d4dc" : event.color }}><span className="export-event-time">{options.showTimes ? event.start : ""}</span><strong>{event.title}</strong>{event.location && <small>{event.location}</small>}</div>)}</div>;
}

function ExportPreview({ board, options, previewRef }: { board: PlannerBoard; options: ExportOptions; previewRef: React.RefObject<HTMLDivElement | null> }) {
  const ratio = options.format === "phone" ? "9 / 16" : options.format === "desktop" ? "16 / 9" : options.orientation === "portrait" ? "0.707 / 1" : "1.414 / 1";
  const fontClass = `font-${options.font.toLowerCase()}`;
  const phone = options.format === "phone";

  const weekDates = useMemo(() => {
    const ref = new Date(board.updatedAt || board.createdAt || "2026-01-01T00:00:00.000Z");
    const dayOfWeek = (ref.getDay() + 6) % 7;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return String(d.getDate()).padStart(2, "0");
    });
  }, [board.updatedAt, board.createdAt]);

  const eventByDay = useMemo(() => days.map((_, index) => board.events.filter((event) => event.day === index).sort((a, b) => a.start.localeCompare(b.start))), [board.events]);
  return (
    <div className="preview-stage">
      <div className="preview-scale-wrap">
        <div ref={previewRef} className={`export-paper ${fontClass} ${options.whiteBackground ? "paper-pure-white" : ""} ${phone ? "export-paper-phone" : ""}`} style={{ aspectRatio: ratio }}>
          <div className="export-paper-header">
            <div>{options.showTitle && <h2>{board.title}</h2>}{options.showDates && <span>TON RYTHME · TA SEMAINE</span>}</div>
            {options.showLogo && <span className="export-logo"><Sparkles size={12} /> PlaniLux</span>}
          </div>
          <div className={`export-paper-calendar ${phone ? "export-calendar-phone" : ""}`}>
            {days.map((day, index) => <div className="export-paper-day" key={day}>
              <div className="export-paper-day-head"><span>{phone ? day : day.slice(0, 3).toUpperCase()}</span>{options.showDates && <strong>{weekDates[index]}</strong>}</div>
              <div className="export-paper-day-content"><div className="export-paper-hour-lines"><i /><i /><i /><i /></div><EventList events={eventByDay[index]} options={options} /></div>
            </div>)}
          </div>
          <div className="export-paper-footer"><span>Chaque chose à sa place. Et du temps pour toi aussi.</span><i>✳</i></div>
        </div>
      </div>
      <div className="preview-caption"><span><span className="preview-check"><Check size={11} /></span> Aperçu en temps réel</span><span>Échelle 100 % · Prêt à exporter</span></div>
    </div>
  );
}

function OptionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return <label className="option-toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>;
}

export function ExportStudio({ board, onBack, onToast }: { board: PlannerBoard; onBack: () => void; onToast: (message: string) => void }) {
  const [options, setOptions] = useState(defaultOptions);
  const [busy, setBusy] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const change = (patch: Partial<ExportOptions>) => setOptions((current) => ({ ...current, ...patch }));
  const runExport = async (format: string, action: () => void | Promise<void>) => {
    setBusy(format);
    try { await action(); onToast(`${format} prêt à télécharger`); }
    catch { onToast(`Impossible de générer le ${format}. Réessaie dans un instant.`); }
    finally { setBusy(""); }
  };

  return (
    <div className="studio-page">
      <div className="studio-heading">
        <div><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Retour au planning</button><div className="studio-title-line"><span className="studio-title-icon"><Printer size={18} /></span><div><div className="eyebrow-date"><span className="eyebrow-sparkle">✳</span> LE DERNIER PETIT DÉTAIL</div><h1>Studio d’impression</h1></div></div><p>Un aperçu fidèle, pour un planning qui te ressemble.</p></div>
        <div className="studio-heading-actions"><button className="button-quiet" onClick={() => setOptions(defaultOptions)}><RefreshCw size={14} /> Réinitialiser</button><button className="button-primary" disabled={Boolean(busy)} onClick={() => void runExport("PDF", () => downloadPdf(board, options))}>{busy === "PDF" ? <span className="button-spinner" /> : <Download size={15} />} Télécharger le PDF</button></div>
      </div>

      <div className="studio-layout">
        <aside className="studio-options-panel">
          <div className="studio-options-head"><span><Type size={16} /></span><div><strong>À ton image</strong><small>Personnalise ton export</small></div></div>
          <section className="option-group"><div className="option-group-title">FORMAT DE PAGE <span>01</span></div><div className="format-options">
            {([{ id: "a4", title: "A4", desc: "210 × 297 mm" }, { id: "letter", title: "US Letter", desc: "8.5 × 11 in" }, { id: "phone", title: "Fond téléphone", desc: "Format 9:16" }, { id: "desktop", title: "Fond d’écran PC", desc: "Format 16:9" }] as const).map((item) => <button className={`format-option ${options.format === item.id ? "format-option-active" : ""}`} key={item.id} onClick={() => change({ format: item.id, ...(item.id === "phone" ? { orientation: "portrait" as const } : item.id === "desktop" ? { orientation: "landscape" as const } : {}) })}><span className={`format-thumb format-thumb-${item.id}`}><i /><i /><i /></span><span className="format-option-copy"><strong>{item.title}</strong><small>{item.desc}</small></span><span className="format-option-check">{options.format === item.id && <Check size={13} />}</span></button>)}
          </div>{(options.format === "a4" || options.format === "letter") && <div className="orientation-choice"><span>Orientation</span><button className={options.orientation === "portrait" ? "orientation-active" : ""} onClick={() => change({ orientation: "portrait" })}>Portrait</button><button className={options.orientation === "landscape" ? "orientation-active" : ""} onClick={() => change({ orientation: "landscape" })}>Paysage</button></div>}</section>

          <section className="option-group"><div className="option-group-title">AFFICHAGE <span>02</span></div><OptionToggle label="Titre du planning" checked={options.showTitle} onChange={(showTitle) => change({ showTitle })} /><OptionToggle label="Dates & en-tête" checked={options.showDates} onChange={(showDates) => change({ showDates })} /><OptionToggle label="Horaires des cours" checked={options.showTimes} onChange={(showTimes) => change({ showTimes })} /><OptionToggle label="Signature PlaniLux" checked={options.showLogo} onChange={(showLogo) => change({ showLogo })} /><OptionToggle label="Fond blanc (éco-encre)" checked={options.whiteBackground} onChange={(whiteBackground) => change({ whiteBackground })} /></section>

          <section className="option-group font-option-group"><div className="option-group-title">TYPOGRAPHIE <span>03</span></div><label className="font-select-wrap"><Type size={15} /><select value={options.font} onChange={(event) => change({ font: event.target.value as ExportOptions["font"] })}><option>Sans</option><option>Serif</option><option>Mono</option></select><ChevronDown size={14} /></label></section>
          <div className="studio-tip"><span><Sparkles size={15} /></span><p><strong>Petit conseil</strong>Le format paysage laisse plus de place à ta semaine.</p></div>
        </aside>

        <section className="studio-preview-panel"><div className="preview-panel-heading"><div><div className="section-eyebrow">APERÇU DU DOCUMENT</div><h2>{board.title}</h2></div><span className="preview-format-label"><span />{options.format === "a4" ? `A4 · ${options.orientation === "portrait" ? "Portrait" : "Paysage"}` : options.format === "letter" ? `US Letter · ${options.orientation}` : options.format === "phone" ? "Écran téléphone · 9:16" : "Écran ordinateur · 16:9"}</span></div>
          <ExportPreview board={board} options={options} previewRef={previewRef} />
          <div className="export-actions"><div className="export-action-intro"><strong>À emporter avec toi</strong><span>Télécharge, imprime ou change de support.</span></div><div className="export-action-buttons"><button className="export-format-button" disabled={Boolean(busy)} onClick={() => void runExport("Word", () => downloadDocx(board, options))}><span><FileText size={16} /></span><span><strong>{busy === "Word" ? "Préparation…" : "Word"}</strong><small>.docx modifiable</small></span><Download size={14} className="export-action-arrow" /></button><button className="export-format-button" disabled={Boolean(busy)} onClick={() => void runExport("PNG", async () => { if (!previewRef.current) throw new Error("preview missing"); await downloadPng(previewRef.current, board); })}><span><ImageIcon size={16} /></span><span><strong>{busy === "PNG" ? "Préparation…" : "Image HD"}</strong><small>.png haute résolution</small></span><Download size={14} className="export-action-arrow" /></button><button className="export-format-button" disabled={Boolean(busy)} onClick={() => void runExport("impression", () => printSchedule())}><span><Printer size={16} /></span><span><strong>Imprimer</strong><small>Directement depuis ici</small></span><ChevronDown size={14} className="export-action-arrow print-arrow" /></button></div></div>
        </section>
      </div>
      <div className="studio-bottom-note"><span>✳</span> Garde de la place pour les imprévus. C’est souvent là que les belles choses arrivent.</div>
    </div>
  );
}
