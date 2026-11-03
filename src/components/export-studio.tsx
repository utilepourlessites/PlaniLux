"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, Copy, Download, FileText, Image as ImageIcon,
  MessageSquare, Printer, RefreshCw, SendHorizontal, Share, Sparkles, Type, UserRound,
} from "lucide-react";
import {
  downloadDocx,
  downloadPdf,
  downloadPng,
  generateWhatsAppSummary,
  openWhatsAppShare,
  printSchedule,
  shareScheduleNative,
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
  autoCrop: true,
  employeeFilter: "all",
  showHoursSummary: false,
  showSignatureLine: false,
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

  // Liste des employés uniques
  const employeesList = useMemo(() => {
    const set = new Set<string>();
    for (const ev of board.events) {
      if (ev.teacher && ev.teacher.trim()) {
        set.add(ev.teacher.trim());
      }
    }
    return Array.from(set).sort();
  }, [board.events]);

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

  // Modèle unifié avec auto-crop et filtre d'employé
  const sheetModel = useMemo(() => buildSheetModel(board, options), [board, options]);

  const isWallpaper = options.format === "phone" || options.format === "desktop";

  const runExport = async (formatKey: string, action: () => void | Promise<void>) => {
    setBusy(formatKey);
    const messages: Record<string, { ok: string; ko: string }> = {
      PDF: { ok: "PDF téléchargé avec succès", ko: "Le PDF n’a pas pu être généré" },
      Word: { ok: "Document Word prêt et téléchargé", ko: "Le fichier Word n’a pas pu être généré" },
      PNG: { ok: "Image HD enregistrée", ko: "L’image n’a pas pu être générée" },
      impression: { ok: "Impression lancée", ko: "L’impression n’a pas pu démarrer" },
      partage: { ok: "Partage initié", ko: "Le partage n’a pas pu être lancé" },
    };
    try {
      await action();
      onToast(messages[formatKey]?.ok ?? `${formatKey} prêt`);
    } catch {
      onToast(messages[formatKey]?.ko ?? `Impossible d'effectuer l'opération ${formatKey}.`);
    } finally {
      setBusy("");
    }
  };

  const handleShareNative = async () => {
    if (!previewRef.current) return;
    await runExport("partage", async () => {
      const shared = await shareScheduleNative(previewRef.current!, board, options);
      if (shared) {
        onToast("Planning partagé avec succès");
      } else {
        onToast("Image téléchargée pour le partage");
      }
    });
  };

  const handleCopySummary = async () => {
    try {
      const summary = generateWhatsAppSummary(board, { employeeFilter: options.employeeFilter });
      await navigator.clipboard.writeText(summary);
      onToast("Résumé WhatsApp copié dans le presse-papier !");
    } catch {
      onToast("Impossible de copier dans le presse-papier");
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
              <div className="eyebrow-date"><span className="eyebrow-sparkle">❋</span> STUDIO HAUTE PRÉCISION</div>
              <h1>Studio d’impression & d’export</h1>
            </div>
          </div>
          <p>Un rendu centré, recadré et optimisé pour le papier, mobile et WhatsApp.</p>
        </div>

        <div className="studio-heading-actions">
          <button className="button-quiet" onClick={() => setOptions(defaultOptions)}>
            <RefreshCw size={14} /> Réinitialiser
          </button>
          <button
            className="button-primary"
            disabled={Boolean(busy)}
            onClick={handleShareNative}
            title="Partager directement le fichier sur mobile ou WhatsApp"
          >
            <Share size={15} /> Partager (Mobile / WhatsApp)
          </button>
        </div>
      </div>

      <div className="studio-grid">
        <aside className="studio-panel">
          {/* Section 1 : Format & Support */}
          <div className="panel-section">
            <div className="section-label">1. FORMAT DE SORTIE</div>
            <div className="segmented-grid">
              {(["a4", "letter", "phone", "desktop"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`segmented-chip ${options.format === f ? "is-selected" : ""}`}
                  onClick={() => change({ format: f })}
                >
                  {f === "a4" && "Feuille A4"}
                  {f === "letter" && "Letter (US)"}
                  {f === "phone" && "Téléphone 9:16"}
                  {f === "desktop" && "Écran 16:9"}
                </button>
              ))}
            </div>

            {!isWallpaper && (
              <div className="segmented-grid" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className={`segmented-chip ${options.orientation === "landscape" ? "is-selected" : ""}`}
                  onClick={() => change({ orientation: "landscape" })}
                >
                  Paysage (recommandé)
                </button>
                <button
                  type="button"
                  className={`segmented-chip ${options.orientation === "portrait" ? "is-selected" : ""}`}
                  onClick={() => change({ orientation: "portrait" })}
                >
                  Portrait
                </button>
              </div>
            )}
          </div>

          {/* Section 2 : Filtre Employé & Recadrage Intelligent */}
          <div className="panel-section">
            <div className="section-label">2. EMPLOI DU TEMPS & RECADRAGE</div>

            {employeesList.length > 0 && (
              <label className="studio-field-label" style={{ display: "block", marginBottom: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.8125rem", fontWeight: 600, marginBottom: 4 }}>
                  <UserRound size={14} /> Filtrer par employé / intervenant
                </span>
                <select
                  className="text-input"
                  value={options.employeeFilter ?? "all"}
                  onChange={(e) => change({ employeeFilter: e.target.value })}
                  style={{ width: "100%", padding: "6px 10px", borderRadius: 8 }}
                >
                  <option value="all">Tout le planning (tous les employés)</option>
                  {employeesList.map((emp) => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                  <option value="unassigned">Créneaux sans assignation</option>
                </select>
              </label>
            )}

            <div className="toggle-list">
              <OptionToggle
                label="Ajuster automatiquement aux heures actives (Auto-crop)"
                checked={options.autoCrop ?? true}
                onChange={(next) => change({ autoCrop: next })}
              />
              <OptionToggle
                label="Récapitulatif des heures par employé"
                checked={options.showHoursSummary ?? false}
                onChange={(next) => change({ showHoursSummary: next })}
              />
              <OptionToggle
                label="Ligne de signature / validation en bas"
                checked={options.showSignatureLine ?? false}
                onChange={(next) => change({ showSignatureLine: next })}
              />
            </div>
          </div>

          {/* Section 3 : Style & Typographie */}
          <div className="panel-section">
            <div className="section-label">3. STYLE & LISIBILITÉ</div>
            <div className="segmented-grid" style={{ marginBottom: 10 }}>
              {(["Sans", "Serif", "Mono"] as const).map((font) => (
                <button
                  key={font}
                  type="button"
                  className={`segmented-chip ${options.font === font ? "is-selected" : ""}`}
                  onClick={() => change({ font })}
                >
                  <Type size={12} style={{ display: "inline", marginRight: 4 }} />
                  {font}
                </button>
              ))}
            </div>

            <div className="toggle-list">
              <OptionToggle
                label="Fond blanc pur (économie d’encre)"
                checked={options.whiteBackground}
                onChange={(next) => change({ whiteBackground: next })}
              />
              <OptionToggle
                label="Afficher le titre du planning"
                checked={options.showTitle}
                onChange={(next) => change({ showTitle: next })}
              />
              <OptionToggle
                label="Afficher les dates des jours"
                checked={options.showDates}
                onChange={(next) => change({ showDates: next })}
              />
              <OptionToggle
                label="Afficher les horaires des créneaux"
                checked={options.showTimes}
                onChange={(next) => change({ showTimes: next })}
              />
              <OptionToggle
                label="Signature discrète PlaniLux"
                checked={options.showLogo}
                onChange={(next) => change({ showLogo: next })}
              />
            </div>
          </div>

          {/* Section 4 : Partage WhatsApp & Mobile */}
          <div className="panel-section">
            <div className="section-label">4. PARTAGE WHATSAPP & MOBILE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                className="button-primary"
                style={{ width: "100%", justifyContent: "center", background: "#25D366", borderColor: "#20bd5a", color: "#ffffff" }}
                onClick={() => openWhatsAppShare(board, options.employeeFilter)}
              >
                <MessageSquare size={15} /> Envoyer le résumé sur WhatsApp
              </button>

              <button
                type="button"
                className="button-quiet"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handleCopySummary}
              >
                <Copy size={14} /> Copier le résumé texte formaté
              </button>
            </div>
          </div>
        </aside>

        {/* Zone centrale de prévisualisation */}
        <section className="studio-canvas">
          <div className="preview-toolbar">
            <span>
              Format : <strong>{options.format.toUpperCase()}</strong> · {options.orientation === "landscape" ? "Paysage" : "Portrait"}
              {options.autoCrop && " · Heures actives cadrées"}
              {options.employeeFilter && options.employeeFilter !== "all" && ` · Filtre : ${options.employeeFilter}`}
            </span>
            <span className="preview-ratio">
              {options.format === "phone"
                ? "Format Téléphone · 9:16 HD"
                : options.format === "desktop"
                ? "Format Bureau · 16:9 HD"
                : "Aperçu de la feuille d'impression"}
            </span>
          </div>

          <div className="preview-stage">
            <div className="preview-scale-wrap">
              <SheetView model={sheetModel} options={options} previewRef={previewRef} />
            </div>
            <div className="preview-caption">
              <span>
                <span className="preview-check"><Check size={11} /></span> Centrage géométrique & Auto-contraste WCAG
              </span>
              <span>Modèle unifié · Prêt à exporter</span>
            </div>
          </div>

          <div className="export-actions">
            <div className="export-action-intro">
              <strong>À emporter avec toi</strong>
              <span>
                {isWallpaper
                  ? "Formats d’écran haute définition pour fond d’écran ou messagerie."
                  : "Télécharge, imprime ou partage sur WhatsApp."}
              </span>
            </div>

            <div className="export-action-buttons">
              <button
                className="export-format-button button-highlight"
                disabled={Boolean(busy)}
                onClick={handleShareNative}
              >
                <span><Share size={16} /></span>
                <span>
                  <strong>{busy === "partage" ? "Préparation…" : "Partager (WhatsApp / Mobile)"}</strong>
                  <small>Envoi direct d&apos;image ou PDF via Web Share</small>
                </span>
                <SendHorizontal size={14} className="export-action-arrow" />
              </button>

              {isWallpaper ? (
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
                      <strong>{busy === "PDF" ? "Préparation…" : "PDF Haute Précision"}</strong>
                      <small>Vectoriel avec créneaux centrés</small>
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
                      <strong>{busy === "Word" ? "Préparation…" : "Word .docx"}</strong>
                      <small>Tableau avec heures calculées</small>
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
                      <small>Feuille {options.format.toUpperCase()} {options.orientation}</small>
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
        <span>❋</span> Garde de la place pour les imprévus. C’est souvent là que les belles choses arrivent.
      </div>
    </div>
  );
}
