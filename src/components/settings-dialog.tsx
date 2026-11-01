"use client";

import { useRef, useState } from "react";
import {
  Check, Download, LogOut, Minus, Moon, Plus,
  RotateCcw, Settings2, Sparkles, Sun, SunMedium, Type, Upload, UserRound, X,
} from "lucide-react";
import type { PlannerBoard } from "@/lib/planner-types";

type Props = {
  open: boolean;
  onClose: () => void;
  fontScale: number;
  onChangeFontScale: (scale: number) => void;
  brightness?: number;
  onChangeBrightness?: (scale: number) => void;
  dark: boolean;
  onToggleDark: () => void;
  userName: string;
  onChangeUserName: (name: string) => void;
  workspaceName: string;
  onChangeWorkspaceName: (name: string) => void;
  boards: PlannerBoard[];
  onImportBoards: (boards: PlannerBoard[]) => void;
  onResetDefaults: () => void;
  onLogout?: () => void;
  onToast: (message: string) => void;
};

const FONT_PRESETS = [
  { label: "Petite", value: 85, desc: "Affichage compact" },
  { label: "Normale", value: 100, desc: "Taille recommandée" },
  { label: "Grande", value: 115, desc: "Plus lisible et aéré" },
  { label: "Très grande", value: 130, desc: "Confort maximal" },
];

const BRIGHTNESS_PRESETS = [
  { label: "Tamisée", value: 80, desc: "Repos des yeux" },
  { label: "Normale", value: 100, desc: "Luminosité standard" },
  { label: "Claire", value: 115, desc: "Contraste rehaussé" },
  { label: "Éclatante", value: 130, desc: "Plein jour" },
];

export function SettingsDialog({
  open,
  onClose,
  fontScale,
  onChangeFontScale,
  brightness = 100,
  onChangeBrightness,
  dark,
  onToggleDark,
  userName,
  onChangeUserName,
  workspaceName,
  onChangeWorkspaceName,
  boards,
  onImportBoards,
  onResetDefaults,
  onLogout,
  onToast,
}: Props) {
  const [activeTab, setActiveTab] = useState<"appearance" | "profile" | "data">("appearance");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(boards, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `PlaniLux-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      onToast("Sauvegarde téléchargée avec succès");
    } catch {
      onToast("Erreur lors de l'exportation de la sauvegarde");
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].title) {
          onImportBoards(parsed as PlannerBoard[]);
          onToast(`${parsed.length} tableau(x) importé(s)`);
        } else {
          onToast("Format de fichier non reconnu");
        }
      } catch {
        onToast("Fichier JSON invalide");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="modal-scrim" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title-wrap">
            <span className="settings-icon-mark"><Settings2 size={18} /></span>
            <div>
              <h2 id="settings-dialog-title">Paramètres</h2>
              <p>Personnalise ton espace de travail et ton confort visuel.</p>
            </div>
          </div>
          <button className="icon-button modal-close" onClick={onClose} aria-label="Fermer"><X size={17} /></button>
        </div>

        <div className="settings-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "appearance"}
            className={`settings-tab ${activeTab === "appearance" ? "is-active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            <Type size={15} /> Affichage & Écrits
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "profile"}
            className={`settings-tab ${activeTab === "profile" ? "is-active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <UserRound size={15} /> Profil & Espace
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "data"}
            className={`settings-tab ${activeTab === "data" ? "is-active" : ""}`}
            onClick={() => setActiveTab("data")}
          >
            <RotateCcw size={15} /> Données & Sauvegarde
          </button>
        </div>

        <div className="settings-body">
          {activeTab === "appearance" && (
            <div className="settings-section">
              <div className="setting-card">
                <div className="setting-card-head">
                  <div className="setting-card-title">
                    <span className="setting-tag"><Type size={14} /></span>
                    <div>
                      <strong>Taille des écrits</strong>
                      <span>Ajuste la taille de la police et la lisibilité dans toute l’application.</span>
                    </div>
                  </div>
                  <div className="font-stepper">
                    <button
                      className="stepper-btn"
                      onClick={() => onChangeFontScale(Math.max(75, fontScale - 5))}
                      aria-label="Diminuer la taille des écrits"
                      disabled={fontScale <= 75}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-scale-number">{fontScale}%</span>
                    <button
                      className="stepper-btn"
                      onClick={() => onChangeFontScale(Math.min(150, fontScale + 5))}
                      aria-label="Augmenter la taille des écrits"
                      disabled={fontScale >= 150}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="font-presets-row">
                  {FONT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      className={`font-preset-btn ${fontScale === preset.value ? "is-selected" : ""}`}
                      onClick={() => onChangeFontScale(preset.value)}
                    >
                      <strong>{preset.label}</strong>
                      <small>{preset.value}%</small>
                    </button>
                  ))}
                </div>

                <div className="font-preview-box">
                  <div className="font-preview-header">
                    <span>Aperçu en temps réel :</span>
                    <span className="font-preview-tag">09:00 - 10:30 · Cours d’amphi</span>
                  </div>
                  <p className="font-preview-body">
                    « Une organisation claire et bien lisible permet d’avancer l’esprit léger. »
                  </p>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-card-head">
                  <div className="setting-card-title">
                    <span className="setting-tag"><SunMedium size={14} /></span>
                    <div>
                      <strong>Luminosité de l’écran</strong>
                      <span>Ajuste l’intensité lumineuse du logiciel pour un confort visuel sur mesure.</span>
                    </div>
                  </div>
                  <div className="font-stepper">
                    <button
                      className="stepper-btn"
                      onClick={() => onChangeBrightness?.(Math.max(50, brightness - 5))}
                      aria-label="Diminuer la luminosité"
                      disabled={brightness <= 50}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-scale-number">{brightness}%</span>
                    <button
                      className="stepper-btn"
                      onClick={() => onChangeBrightness?.(Math.min(150, brightness + 5))}
                      aria-label="Augmenter la luminosité"
                      disabled={brightness >= 150}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="brightness-slider-row" style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0 10px" }}>
                  <Sun size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="5"
                    value={brightness}
                    onChange={(e) => onChangeBrightness?.(Number(e.target.value))}
                    className="brightness-range"
                    aria-label="Contrôle de luminosité"
                    style={{ flex: 1, accentColor: "var(--violet)" }}
                  />
                  <SunMedium size={16} style={{ opacity: 0.9, flexShrink: 0 }} />
                </div>

                <div className="font-presets-row">
                  {BRIGHTNESS_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      className={`font-preset-btn ${brightness === preset.value ? "is-selected" : ""}`}
                      onClick={() => onChangeBrightness?.(preset.value)}
                    >
                      <strong>{preset.label}</strong>
                      <small>{preset.value}%</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-card-head">
                  <div className="setting-card-title">
                    <span className="setting-tag">{dark ? <Moon size={14} /> : <Sun size={14} />}</span>
                    <div>
                      <strong>Thème visuel</strong>
                      <span>Bascule entre le mode clair lumineux et le mode sombre apaisant.</span>
                    </div>
                  </div>
                  <div className="theme-switch-group">
                    <button
                      className={`theme-pill ${!dark ? "is-active" : ""}`}
                      onClick={() => { if (dark) onToggleDark(); }}
                    >
                      <Sun size={14} /> Clair
                    </button>
                    <button
                      className={`theme-pill ${dark ? "is-active" : ""}`}
                      onClick={() => { if (!dark) onToggleDark(); }}
                    >
                      <Moon size={14} /> Sombre
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="settings-section">
              <div className="setting-card">
                <label className="setting-field">
                  <span>Ton prénom ou pseudo</span>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => onChangeUserName(e.target.value)}
                    placeholder="Camille Moreau"
                    maxLength={35}
                  />
                  <small>Ce nom apparaît dans la salutation d’accueil et sur les cartes.</small>
                </label>
              </div>

              <div className="setting-card">
                <label className="setting-field">
                  <span>Nom de l’espace de travail</span>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => onChangeWorkspaceName(e.target.value)}
                    placeholder="Mon espace"
                    maxLength={35}
                  />
                  <small>Affiché en haut du menu latéral et dans le fil d’Ariane.</small>
                </label>
              </div>

              <div className="setting-card setting-card-logout">
                <div className="data-action-row">
                  <div>
                    <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <LogOut size={15} /> Session & Profil : {userName}
                    </strong>
                    <span>Fermer la session actuelle et revenir à l’écran de connexion PlaniLux.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onLogout) onLogout();
                      else window.location.href = "/login";
                    }}
                    className="button-secondary btn-logout-action"
                    style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, color: "#d9534f" }}
                  >
                    <LogOut size={14} /> Se déconnecter
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="settings-section">
              <div className="setting-card">
                <div className="data-action-row">
                  <div>
                    <strong>Exporter mes tableaux</strong>
                    <span>Télécharge un fichier JSON contenant tous tes plannings et créneaux.</span>
                  </div>
                  <button className="button-secondary" onClick={handleExportBackup}>
                    <Download size={14} /> Exporter la sauvegarde
                  </button>
                </div>
              </div>

              <div className="setting-card">
                <div className="data-action-row">
                  <div>
                    <strong>Importer une sauvegarde</strong>
                    <span>Restaure tes tableaux depuis un fichier JSON précédemment exporté.</span>
                  </div>
                  <button className="button-secondary" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={14} /> Importer un fichier
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={handleImportFile}
                  />
                </div>
              </div>

              <div className="setting-card setting-card-danger">
                <div className="data-action-row">
                  <div>
                    <strong className="text-danger">Réinitialiser les exemples</strong>
                    <span>Restaure les tableaux modèles initiaux (Université, Routines et Semaine).</span>
                  </div>
                  <button
                    className="button-quiet text-danger"
                    onClick={() => {
                      if (window.confirm("Voulez-vous vraiment réinitialiser les tableaux aux exemples de départ ?")) {
                        onResetDefaults();
                        onToast("Tableaux réinitialisés aux exemples d'origine");
                      }
                    }}
                  >
                    <RotateCcw size={14} /> Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <span className="settings-autosave-note">
            <Sparkles size={13} /> Les modifications s’appliquent immédiatement.
          </span>
          <button className="button-primary" onClick={onClose}>
            <Check size={15} /> Terminé
          </button>
        </div>
      </div>
    </div>
  );
}
