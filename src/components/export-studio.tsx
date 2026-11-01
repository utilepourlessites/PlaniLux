"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, Download, FileText, Image as ImageIcon, Printer,
  RefreshCw, Sparkles, Type,
} from "lucide-react";
import {
  downloadDocx,
  downloadPdf,
  downloadPng,
  printSchedule,
  type ExportFormat,
  type ExportOptions,
} from "@/lib/exports";
import { buildSheetModel } from "@/lib/sheet-layout";
import { SheetView } from "@/components/sheet-view";
import type { PlannerBoard } from "@/lib/planner-types";

const defaultOptions: ExportOptions = {
  format: "a4",
  orientation: "landscape",
  whiteBackground: false,
  showTitle: true,
  showDates: true,
  showTimes: true,
  showLogo: true,
  font: "Sans",
};

function OptionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="option-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i />
    </label>
  );
}

export function ExportStudio({ board, onBack, onToast }: { board: PlannerBoard; onBack: () => void; onToast: (message: string) => void }) {
  const [options, setOptions] = useState<ExportOptions>(defaultOptions);
  const [busy, setBusy] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  const change = (patch: Partial<ExportOptions>) => setOptions((current) => ({ ...current, ...patch }));

  // Point I-1 : injection dynamique du format et orientation pour l'impression @page
  useEffect(() => {
    const paper = options.format === "letter" ? "letter" : "A4";
    const el = document.createElement("style");
    el.id = "print-page-size";
    el.textContent = `@page { size: ${paper} ${options.orientation}; margin: 8mm; }`;
    document.head.appendChild(el);
    return () => el.remove();
  }, [options.format, options.orientation]);

  // Point I-1 : hauteur d'impression CSS calculée pour la feuille
  const printHeight = useMemo(() => {
    if (options.format === "letter") {
      return options.orientation === "portrait" ? "248mm" : "191mm";
    }
    return options.orientation === "portrait" ? "281mm" : "194mm";
  }, [options.format, options.orientation]);

  // Modèle unifié (Points E-1, I-2, E-3)
  const sheetModel = useMemo(() => buildSheetModel(board, options), [board, options]);

  const isWallpaper = options.format === "phone" || options.format === "desktop";

  // Point I-4 : Messages de notification différenciés et précis
  const runExport = async (formatKey: string, action: () => void | Promise<void>) => {
    setBusy(formatKey);
    const messages: Record<string, { ok: string; ko: string }> = {
      PDF: { ok: "PDF téléchargé avec succès", ko: "Le PDF n’a pas pu être généré" },
      Word: { ok: "Document Word prêt et téléchargé", ko: "Le fichier Word n’a pas pu être généré" },
      PNG: { ok: "Image HD enregistrée", ko: "L’image n’a pas pu être générée" },
      impression: { ok: "Impression lancée", ko: "L’impression n’a pas pu démarrer" },
    };
    try {
      await action();
      onToast(messages[formatKey]?.ok ?? `${formatKey} prêt`);
    } catch {
      onToast(messages[formatKey]?.ko ?? `Impossible de générer le ${formatKey}.`);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="studio-page" style={{ "--print-height": printHeight } as React.CSSProperties}>
      <div className="studio-heading">
        <div>
          <button className="back-link" onClick={onBack}>
            <ArrowLeft size={15} /> Retour au planning
          </button>
          <div className="studio-title-line">
            <span className="studio-title-icon"><Printer size={18} /></span>
            <div>
              <div className="eyebrow-date"><span className="eyebrow-sparkle">✳</span> LE DERNIER PETIT DÉTAIL</div>
              <h1>Studio d’impression & d’export</h1>
            </div>
          </div>
          <p>Un aperçu fidèle, unifié pour tous vos formats de sortie.</p>
        </div>

        <div className="studio-heading-actions">
          <button className="button-quiet" onClick={() => setOptions(defaultOptions)}>
            <RefreshCw size={14} /> Réinitialiser
          </button>
          {isWallpaper ? (
            <button
              className="button-primary"
              disabled={Boolean(busy)}
              onClick={() =>
                void runExport("PNG", async () => {
                  if (!previewRef.current) throw new Error("Aperçu introuvable");
                  await downloadPng(previewRef.current, board, options.format);
                })
              }
            >
              {busy === "PNG" ? <span className="button-spinner" /> : <ImageIcon size={15} />}
              Télécharger le Fond d’écran HD
            </button>
          ) : (
            <button
              className="button-primary"
              disabled={Boolean(busy)}
              onClick={() => void runExport("PDF", () => downloadPdf(board, options))}
            >
              {busy === "PDF" ? <span className="button-spinner" /> : <Download size={15} />}
              Télécharger le PDF
            </button>
          )}
        </div>
      </div>

      <div className="studio-layout">
        <aside className="studio-options-panel">
          <div className="studio-options-head">
            <span><Type size={16} /></span>
            <div>
              <strong>À ton image</strong>
              <small>Personnalise ton export</small>
            </div>
          </div>

          <section className="option-group">
            <div className="option-group-title">FORMAT DE PAGE <span>01</span></div>
            <div className="format-options">
              {([
                { id: "a4", title: "A4", desc: "210 × 297 mm" },
                { id: "letter", title: "US Letter", desc: "8.5 × 11 in" },
                { id: "phone", title: "Fond téléphone", desc: "Format 9:16 (PNG HD)" },
                { id: "desktop", title: "Fond d’écran PC", desc: "Format 16:9 (PNG HD)" },
              ] as const).map((item) => (
                <button
                  className={`format-option ${options.format === item.id ? "format-option-active" : ""}`}
                  key={item.id}
                  onClick={() =>
                    change({
                      format: item.id,
                      ...(item.id === "phone"
                        ? { orientation: "portrait" as const }
                        : item.id === "desktop"
                        ? { orientation: "landscape" as const }
                        : {}),
                    })
                  }
                >
                  <span className={`format-thumb format-thumb-${item.id}`}><i /><i /><i /></span>
                  <span className="format-option-copy">
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                  </span>
                  <span className="format-option-check">{options.format === item.id && <Check size={13} />}</span>
                </button>
              ))}
            </div>

            {(options.format === "a4" || options.format === "letter") && (
              <div className="orientation-choice">
                <span>Orientation</span>
                <button
                  className={options.orientation === "portrait" ? "orientation-active" : ""}
                  onClick={() => change({ orientation: "portrait" })}
                >
                  Portrait
                </button>
                <button
                  className={options.orientation === "landscape" ? "orientation-active" : ""}
                  onClick={() => change({ orientation: "landscape" })}
                >
                  Paysage
                </button>
              </div>
            )}
          </section>

          <section className="option-group">
            <div className="option-group-title">AFFICHAGE <span>02</span></div>
            <OptionToggle label="Titre du planning" checked={options.showTitle} onChange={(showTitle) => change({ showTitle })} />
            <OptionToggle label="Dates & en-tête" checked={options.showDates} onChange={(showDates) => change({ showDates })} />
            <OptionToggle label="Horaires" checked={options.showTimes} onChange={(showTimes) => change({ showTimes })} />
            <OptionToggle label="Signature PlaniLux" checked={options.showLogo} onChange={(showLogo) => change({ showLogo })} />
            <OptionToggle label="Fond blanc (éco-encre)" checked={options.whiteBackground} onChange={(whiteBackground) => change({ whiteBackground })} />
          </section>

          <section className="option-group font-option-group">
            <div className="option-group-title">TYPOGRAPHIE <span>03</span></div>
            <label className="font-select-wrap">
              <Type size={15} />
              <select value={options.font} onChange={(event) => change({ font: event.target.value as ExportOptions["font"] })}>
                <option>Sans</option>
                <option>Serif</option>
                <option>Mono</option>
              </select>
              <ChevronDown size={14} />
            </label>
          </section>

          <div className="studio-tip">
            <span><Sparkles size={15} /></span>
            <p>
              <strong>Fidélité garantie</strong>
              L’aperçu affiché correspond exactement au document imprimé ou exporté.
            </p>
          </div>
        </aside>

        <section className="studio-preview-panel">
          <div className="preview-panel-heading">
            <div>
              <div className="section-eyebrow">APERÇU DU DOCUMENT</div>
              <h2>{board.title}</h2>
            </div>
            <span className="preview-format-label">
              <span />
              {options.format === "a4"
                ? `A4 · ${options.orientation === "portrait" ? "Portrait" : "Paysage"}`
                : options.format === "letter"
                ? `US Letter · ${options.orientation}`
                : options.format === "phone"
                ? "Écran téléphone · 9:16"
                : "Écran ordinateur · 16:9"}
            </span>
          </div>

          <div className="preview-stage">
            <div className="preview-scale-wrap">
              <SheetView model={sheetModel} options={options} previewRef={previewRef} />
            </div>
            <div className="preview-caption">
              <span>
                <span className="preview-check"><Check size={11} /></span> Aperçu fidèle en temps réel
              </span>
              <span>Modèle unifié · Prêt à exporter</span>
            </div>
          </div>

          <div className="export-actions">
            <div className="export-action-intro">
              <strong>À emporter avec toi</strong>
              <span>
                {isWallpaper
                  ? "Formats d’écran optimisés en PNG haute définition."
                  : "Télécharge, imprime ou change de support."}
              </span>
            </div>

            <div className="export-action-buttons">
              {isWallpaper ? (
                <button
                  className="export-format-button button-highlight"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void runExport("PNG", async () => {
                      if (!previewRef.current) throw new Error("Aperçu introuvable");
                      await downloadPng(previewRef.current, board, options.format);
                    })
                  }
                >
                  <span><ImageIcon size={16} /></span>
                  <span>
                    <strong>{busy === "PNG" ? "Génération…" : "Image Fond d’écran HD"}</strong>
                    <small>PNG {options.format === "phone" ? "1080 × 1920" : "1920 × 1080"}</small>
                  </span>
                  <Download size={14} className="export-action-arrow" />
                </button>
              ) : (
                <>
                  <button
                    className="export-format-button"
                    disabled={Boolean(busy)}
                    onClick={() => void runExport("PDF", () => downloadPdf(board, options))}
                  >
                    <span><FileText size={16} /></span>
                    <span>
                      <strong>{busy === "PDF" ? "Préparation…" : "PDF Vectoriel"}</strong>
                      <small>Haute définition pour impression</small>
                    </span>
                    <Download size={14} className="export-action-arrow" />
                  </button>

                  <button
                    className="export-format-button"
                    disabled={Boolean(busy)}
                    onClick={() => void runExport("Word", () => downloadDocx(board, options))}
                  >
                    <span><FileText size={16} /></span>
                    <span>
                      <strong>{busy === "Word" ? "Préparation…" : "Word"}</strong>
                      <small>.docx avec tableau modifiable</small>
                    </span>
                    <Download size={14} className="export-action-arrow" />
                  </button>

                  <button
                    className="export-format-button"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void runExport("PNG", async () => {
                        if (!previewRef.current) throw new Error("Aperçu introuvable");
                        await downloadPng(previewRef.current, board, options.format);
                      })
                    }
                  >
                    <span><ImageIcon size={16} /></span>
                    <span>
                      <strong>{busy === "PNG" ? "Préparation…" : "Image HD"}</strong>
                      <small>.png haute résolution</small>
                    </span>
                    <Download size={14} className="export-action-arrow" />
                  </button>

                  <button
                    className="export-format-button"
                    disabled={Boolean(busy)}
                    onClick={() => void runExport("impression", () => printSchedule())}
                  >
                    <span><Printer size={16} /></span>
                    <span>
                      <strong>Imprimer</strong>
                      <small>Feuille {options.format.toUpperCase()}</small>
                    </span>
                    <ChevronDown size={14} className="export-action-arrow print-arrow" />
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="studio-bottom-note">
        <span>✳</span> Garde de la place pour les imprévus. C’est souvent là que les belles choses arrivent.
      </div>
    </div>
  );
}
