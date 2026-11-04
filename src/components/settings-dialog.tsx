"use client";

import { useRef, useState } from "react";
import {
  Check, Download, LogOut, Minus, Moon, Plus,
  Settings2, Sparkles, Sun, SunMedium, Trash2, Type, Upload, UserRound, X,
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
  onClearData: () => void;
  onDeleteAccount: () => void;
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
  onClearData,
  onDeleteAccount,
  onLogout,
  onToast,
}: Props) {
  const [activeTab, setActiveTab] = useState<"appearance" | "profile" | "data">("appearance");
  const [pendingImport, setPendingImport] = useState<PlannerBoard[] | null>(null);
  const [confirmClearData, setConfirmClearData] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleExportBackup = () => {
    try {
      const payload = {
        app: "PlaniLux",
        version: "2.0",
        exportedAt: new Date().toISOString(),
        boards,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `planilux-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      onToast("Sauvegarde exportée avec succès");
    } catch {
      onToast("Échec de l’export de la sauvegarde");
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        if (text.length > 5 * 1024 * 1024) {
          onToast("Fichier trop volumineux (max 5 Mo)");
          return;
        }
        const data = JSON.parse(text);
        const imported = Array.isArray(data) ? data : (Array.isArray(data?.boards) ? data.boards : null);
        if (!imported || !imported.length) {
          onToast("Aucun tableau valide trouvé dans ce fichier");
          return;
        }
        setPendingImport(imported as PlannerBoard[]);
      } catch {
        onToast("Format JSON invalide");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const applyMergeImport = () => {
    if (!pendingImport) return;
    onImportBoards(pendingImport);
    onToast(`${pendingImport.length} tableau(x) importé(s)`);
    setPendingImport(null);
  };

  return (
    <div
      className="modal-scrim"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
    >
      <div
        className="settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <div className="settings-title-wrap">
            <span className="settings-icon-mark"><Settings2 size={18} /></span>
            <div>
              <h2 id="settings-dialog-title">Paramètres</h2>
              <p>Personnalisez votre confort visuel et votre espace.</p>
            </div>
          </div>
          <button className="icon-button modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        <nav className="settings-tabs" aria-label="Sections des paramètres">
          <button
            type="button"
            className={`settings-tab ${activeTab === "appearance" ? "is-active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            <SunMedium size={15} /> Apparence
          </button>
          <button
            type="button"
            className={`settings-tab ${activeTab === "profile" ? "is-active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <UserRound size={15} /> Profil & Espace
          </button>
          <button
            type="button"
            className={`settings-tab ${activeTab === "data" ? "is-active" : ""}`}
            onClick={() => setActiveTab("data")}
          >
            <Download size={15} /> Données & Sécurité
          </button>
        </nav>

        <div className="settings-body">
          {activeTab === "appearance" && (
            <div className="settings-section">
              <div className="setting-card">
                <div className="setting-card-head">
                  <div className="setting-card-title">
                    <span className="setting-tag"><Type size={15} /></span>
                    <div>
                      <strong>Taille des écrits ({fontScale} %)</strong>
                      <span>Ajustez l’échelle de l’ensemble des textes pour un confort de lecture optimal.</span>
                    </div>
                  </div>
                  <div className="font-stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => onChangeFontScale(Math.max(75, fontScale - 5))}
                      disabled={fontScale <= 75}
                      aria-label="Diminuer la taille"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="font-scale-number">{fontScale} %</span>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => onChangeFontScale(Math.min(150, fontScale + 5))}
                      disabled={fontScale >= 150}
                      aria-label="Augmenter la taille"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div className="font-presets-row">
                  {FONT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      className={`font-preset-btn ${fontScale === preset.value ? "is-selected" : ""}`}
                      onClick={() => onChangeFontScale(preset.value)}
                    >
                      <strong>{preset.label}</strong>
                      <small>{preset.desc}</small>
                    </button>
                  ))}
                </div>
              </div>

              {onChangeBrightness && (
                <div className="setting-card">
                  <div className="setting-card-head">
                    <div className="setting-card-title">
                      <span className="setting-tag"><SunMedium size={15} /></span>
                      <div>
                        <strong>Luminosité de l’espace ({brightness} %)</strong>
                        <span>Atténuez ou rehaussez l’intensité lumineuse pour reposer vos yeux.</span>
                      </div>
                    </div>
                    <div className="font-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => onChangeBrightness(Math.max(50, brightness - 5))}
                        disabled={brightness <= 50}
                        aria-label="Diminuer la luminosité"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="font-scale-number">{brightness} %</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => onChangeBrightness(Math.min(150, brightness + 5))}
                        disabled={brightness >= 150}
                        aria-label="Augmenter la luminosité"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="font-presets-row">
                    {BRIGHTNESS_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        className={`font-preset-btn ${brightness === preset.value ? "is-selected" : ""}`}
                        onClick={() => onChangeBrightness(preset.value)}
                      >
                        <strong>{preset.label}</strong>
                        <small>{preset.desc}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="setting-card">
                <div className="setting-card-head">
                  <div className="setting-card-title">
                    <span className="setting-tag"><Sparkles size={15} /></span>
                    <div>
                      <strong>Mode d’affichage</strong>
                      <span>Basculez entre le thème clair et le thème sombre.</span>
                    </div>
                  </div>
                  <div className="theme-switch-group">
                    <button
                      type="button"
                      className={`theme-pill ${!dark ? "is-active" : ""}`}
                      onClick={() => { if (dark) onToggleDark(); }}
                    >
                      <Sun size={13} /> Clair
                    </button>
                    <button
                      type="button"
                      className={`theme-pill ${dark ? "is-active" : ""}`}
                      onClick={() => { if (!dark) onToggleDark(); }}
                    >
                      <Moon size={13} /> Sombre
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
                  <span>Votre prénom et nom</span>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => onChangeUserName(e.target.value)}
                    placeholder="Votre prénom et nom"
                    maxLength={60}
                  />
                  <small>Ce nom apparaît dans la salutation d’accueil et sur vos tableaux.</small>
                </label>
              </div>

              <div className="setting-card">
                <label className="setting-field">
                  <span>Nom de l’espace de travail</span>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => onChangeWorkspaceName(e.target.value)}
                    placeholder="Nom de votre espace"
                    maxLength={60}
                  />
                  <small>Affiché en haut du menu latéral et dans le fil d’Ariane.</small>
                </label>
              </div>

              <div className="setting-card setting-card-logout">
                <div className="data-action-row">
                  <div>
                    <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <LogOut size={15} /> Session & Compte
                    </strong>
                    <span>Fermer la session actuelle et revenir à l’écran de connexion.</span>
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
                    <span>Télécharge un fichier JSON contenant tous vos plannings et créneaux.</span>
                  </div>
                  <button className="button-secondary" onClick={handleExportBackup}>
                    <Download size={14} /> Exporter la sauvegarde
                  </button>
                </div>
              </div>

              <div className="setting-card">
                <div className="data-action-row">
                  <div>
                    <strong>Importer des tableaux</strong>
                    <span>Restaure des plannings depuis un fichier JSON précédemment exporté.</span>
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
                    <strong className="text-danger">Supprimer tous mes tableaux</strong>
                    <span>Supprime définitivement l’ensemble de vos tableaux et créneaux.</span>
                  </div>
                  <button
                    className="button-quiet text-danger"
                    onClick={() => setConfirmClearData(true)}
                  >
                    <Trash2 size={14} /> Tout effacer
                  </button>
                </div>
              </div>

              <div className="setting-card setting-card-danger" style={{ borderTop: "1px dashed #fed7d7", marginTop: 8 }}>
                <div className="data-action-row">
                  <div>
                    <strong className="text-danger">Supprimer mon compte</strong>
                    <span>Efface définitivement votre profil et toutes vos données sur PlaniLux.</span>
                  </div>
                  <button
                    className="button-quiet text-danger"
                    onClick={() => { setConfirmDeleteAccount(true); setDeleteInputText(""); }}
                  >
                    <Trash2 size={14} /> Supprimer le compte
                  </button>
                </div>
              </div>

              {pendingImport && (
                <div className="dialog-sub-confirm" style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "var(--surface-soft)", border: "1px solid var(--line)" }}>
                  <strong style={{ display: "block", marginBottom: 6 }}>
                    Importer {pendingImport.length} tableau(x)
                  </strong>
                  <p style={{ margin: "0 0 12px", fontSize: "0.8125rem", color: "var(--muted)" }}>
                    Intégrer ces plannings à votre espace personnel :
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="button-primary" onClick={applyMergeImport}>
                      Importer mes tableaux
                    </button>
                    <button type="button" className="button-quiet" onClick={() => setPendingImport(null)}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {confirmClearData && (
                <div className="dialog-sub-confirm" style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "#fff5f5", border: "1px solid #fed7d7" }}>
                  <strong style={{ display: "block", marginBottom: 6, color: "#c53030" }}>
                    Confirmer la suppression de tous les tableaux ?
                  </strong>
                  <p style={{ margin: "0 0 12px", fontSize: "0.8125rem", color: "#9b2c2c" }}>
                    Cette action efface définitivement tous vos plannings de la base de données.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="button-primary"
                      style={{ background: "#c53030", borderColor: "#c53030" }}
                      onClick={() => {
                        setConfirmClearData(false);
                        onClearData();
                      }}
                    >
                      Oui, tout supprimer
                    </button>
                    <button type="button" className="button-quiet" onClick={() => setConfirmClearData(false)}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {confirmDeleteAccount && (
                <div className="dialog-sub-confirm" style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "#fff5f5", border: "1px solid #fed7d7" }}>
                  <strong style={{ display: "block", marginBottom: 6, color: "#c53030" }}>
                    Confirmer la suppression définitive de votre compte ?
                  </strong>
                  <p style={{ margin: "0 0 8px", fontSize: "0.8125rem", color: "#9b2c2c" }}>
                    Tapez <strong>SUPPRIMER</strong> ci-dessous pour confirmer :
                  </p>
                  <input
                    type="text"
                    value={deleteInputText}
                    onChange={(e) => setDeleteInputText(e.target.value)}
                    placeholder="SUPPRIMER"
                    style={{ marginBottom: 12, padding: "6px 10px", borderRadius: 6, border: "1px solid #feb2b2", width: "100%", maxWidth: 220 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      disabled={deleteInputText !== "SUPPRIMER"}
                      className="button-primary"
                      style={{ background: deleteInputText === "SUPPRIMER" ? "#c53030" : "#cbd5e0", borderColor: "transparent" }}
                      onClick={() => {
                        setConfirmDeleteAccount(false);
                        onDeleteAccount();
                      }}
                    >
                      Supprimer définitivement
                    </button>
                    <button type="button" className="button-quiet" onClick={() => setConfirmDeleteAccount(false)}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="settings-footer">
          <span className="settings-autosave-note">
            <Check size={13} /> Les préférences d’affichage sont mémorisées sur cet appareil.
          </span>
          <button type="button" className="button-primary" onClick={onClose}>Terminer</button>
        </div>
      </div>
    </div>
  );
}
