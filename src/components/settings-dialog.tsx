"use client";

import { useRef, useState } from "react";
import {
  Check, Download, LogOut, Minus, Moon, Plus, RotateCcw,
  Settings2, Sparkles, Sun, Trash2, Upload, UserRound, X,
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
        version: "2.1",
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
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="dialog-card settings-dialog-card max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Paramètres de l’application"
        style={{ margin: "auto" }}
      >
        {/* En-tête Paramètres */}
        <div className="dialog-header flex items-center justify-between pb-3 border-b border-line">
          <div className="settings-title-group flex items-center gap-3">
            <span className="settings-header-icon p-2 rounded-xl bg-surface-tint text-violet">
              <Settings2 size={20} />
            </span>
            <div>
              <h3 className="text-lg font-bold">Paramètres</h3>
              <p className="text-xs text-muted">Personnalisez votre confort visuel, profil et sécurité.</p>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="settings-content-flow space-y-6 pt-4">
          {/* Section 1 : Profil & Espace */}
          <section className="settings-section rounded-xl p-4 bg-surface-soft border border-line">
            <div className="section-label mb-3 font-semibold text-xs tracking-wider text-muted uppercase flex items-center gap-2">
              <UserRound size={14} className="text-violet" />
              1. Profil & Espace de travail
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="field-label block">
                <span className="text-xs font-medium text-ink-soft mb-1 block">Nom d’affichage</span>
                <input
                  type="text"
                  className="text-input w-full"
                  maxLength={60}
                  value={userName}
                  onChange={(e) => onChangeUserName(e.target.value)}
                  placeholder="Ex. Marie Curie"
                />
              </label>

              <label className="field-label block">
                <span className="text-xs font-medium text-ink-soft mb-1 block">Nom de l’espace</span>
                <input
                  type="text"
                  className="text-input w-full"
                  maxLength={60}
                  value={workspaceName}
                  onChange={(e) => onChangeWorkspaceName(e.target.value)}
                  placeholder="Ex. Mon Espace"
                />
              </label>
            </div>
          </section>

          {/* Section 2 : Apparence */}
          <section className="settings-section rounded-xl p-4 bg-surface-soft border border-line">
            <div className="section-label mb-3 font-semibold text-xs tracking-wider text-muted uppercase flex items-center gap-2">
              <Sun size={14} className="text-violet" />
              2. Apparence & Confort visuel
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Thème Clair / Sombre */}
              <div className="appearance-card p-3 rounded-lg bg-surface border border-line flex items-center justify-between">
                <div>
                  <strong className="block text-sm">Mode d’affichage</strong>
                  <span className="text-xs text-muted">{dark ? "Sombre (repos des yeux)" : "Clair (lumineux)"}</span>
                </div>
                <button
                  type="button"
                  className="button-quiet flex items-center gap-2 text-xs"
                  onClick={onToggleDark}
                  aria-label="Basculer le thème"
                >
                  {dark ? <Moon size={15} className="text-violet" /> : <Sun size={15} className="text-orange" />}
                  <span>{dark ? "Sombre" : "Clair"}</span>
                </button>
              </div>

              {/* Échelle de texte 75% - 150% */}
              <div className="appearance-card p-3 rounded-lg bg-surface border border-line">
                <div className="flex items-center justify-between mb-2">
                  <strong className="text-sm">Échelle du texte</strong>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-violet">{fontScale}%</span>
                    {fontScale !== 100 && (
                      <button
                        type="button"
                        className="stepper-reset-btn text-[10px] px-2 py-0.5 rounded bg-surface-tint text-violet hover:bg-violet hover:text-white"
                        onClick={() => onChangeFontScale(100)}
                        title="Réinitialiser à 100 %"
                      >
                        <RotateCcw size={10} className="inline mr-1" />100%
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="stepper-btn-sm"
                    disabled={fontScale <= 75}
                    onClick={() => onChangeFontScale(Math.max(75, fontScale - 5))}
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    type="range"
                    min={75}
                    max={150}
                    step={5}
                    value={fontScale}
                    onChange={(e) => onChangeFontScale(Number(e.target.value))}
                    className="brightness-range flex-1"
                  />
                  <button
                    type="button"
                    className="stepper-btn-sm"
                    disabled={fontScale >= 150}
                    onClick={() => onChangeFontScale(Math.min(150, fontScale + 5))}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {/* Luminosité 50% - 150% */}
              {onChangeBrightness && (
                <div className="appearance-card p-3 rounded-lg bg-surface border border-line sm:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <strong className="text-sm">Luminosité de l&apos;application</strong>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-violet">{brightness}%</span>
                      {brightness !== 100 && (
                        <button
                          type="button"
                          className="stepper-reset-btn text-[10px] px-2 py-0.5 rounded bg-surface-tint text-violet hover:bg-violet hover:text-white"
                          onClick={() => onChangeBrightness(100)}
                          title="Réinitialiser à 100 %"
                        >
                          <RotateCcw size={10} className="inline mr-1" />100%
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="stepper-btn-sm"
                      disabled={brightness <= 50}
                      onClick={() => onChangeBrightness(Math.max(50, brightness - 5))}
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      step={5}
                      value={brightness}
                      onChange={(e) => onChangeBrightness(Number(e.target.value))}
                      className="brightness-range flex-1"
                    />
                    <button
                      type="button"
                      className="stepper-btn-sm"
                      disabled={brightness >= 150}
                      onClick={() => onChangeBrightness(Math.min(150, brightness + 5))}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 3 : Sauvegarde & Import */}
          <section className="settings-section rounded-xl p-4 bg-surface-soft border border-line">
            <div className="section-label mb-3 font-semibold text-xs tracking-wider text-muted uppercase flex items-center gap-2">
              <Download size={14} className="text-violet" />
              3. Sauvegarde & Import JSON
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-surface border border-line">
                <strong className="block text-sm mb-1">Sauvegarder mes plannings</strong>
                <p className="text-xs text-muted mb-3">Téléchargez un fichier JSON complet de tous vos tableaux.</p>
                <button
                  type="button"
                  className="button-quiet w-full justify-center flex items-center gap-2"
                  onClick={handleExportBackup}
                >
                  <Download size={14} /> Exporter la sauvegarde
                </button>
              </div>

              <div className="p-3 rounded-lg bg-surface border border-line">
                <strong className="block text-sm mb-1">Restaurer des plannings</strong>
                <p className="text-xs text-muted mb-3">Importez des tableaux depuis un fichier JSON PlaniLux.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <button
                  type="button"
                  className="button-quiet w-full justify-center flex items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} /> Importer un fichier JSON
                </button>
              </div>
            </div>

            {pendingImport && (
              <div className="mt-4 p-4 rounded-xl bg-surface border border-line shadow-soft">
                <strong className="block text-sm mb-1">Importer {pendingImport.length} tableau(x) ?</strong>
                <p className="text-xs text-muted mb-3">Ces tableaux seront ajoutés à votre espace.</p>
                <div className="flex gap-2">
                  <button type="button" className="button-primary" onClick={applyMergeImport}>
                    Confirmer l’import
                  </button>
                  <button type="button" className="button-quiet" onClick={() => setPendingImport(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Section 4 : Compte & Sécurité */}
          <section className="settings-section rounded-xl p-4 bg-surface-soft border border-line">
            <div className="section-label mb-3 font-semibold text-xs tracking-wider text-muted uppercase flex items-center gap-2">
              <Trash2 size={14} className="text-red" />
              4. Compte & Sécurité
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-surface border border-line">
                <strong className="block text-sm mb-1">Session active</strong>
                <p className="text-xs text-muted mb-3">Fermer votre session sur cet appareil.</p>
                <button
                  type="button"
                  className="button-quiet text-danger w-full justify-center flex items-center gap-2"
                  onClick={onLogout}
                >
                  <LogOut size={14} /> Se déconnecter
                </button>
              </div>

              <div className="p-3 rounded-lg bg-surface border border-line">
                <strong className="block text-sm mb-1">Zone de danger</strong>
                <p className="text-xs text-muted mb-3">Suppression de données ou du compte.</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="button-quiet text-danger w-full justify-center"
                    onClick={() => setConfirmClearData(true)}
                  >
                    Effacer tous les plannings
                  </button>
                  <button
                    type="button"
                    className="button-quiet text-danger w-full justify-center"
                    onClick={() => { setConfirmDeleteAccount(true); setDeleteInputText(""); }}
                  >
                    Supprimer le compte
                  </button>
                </div>
              </div>
            </div>

            {confirmClearData && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                <strong className="block text-sm text-red-700 dark:text-red-400 mb-1">
                  Confirmer la suppression de tous les tableaux ?
                </strong>
                <p className="text-xs text-red-600 dark:text-red-300 mb-3">
                  Cette action efface définitivement tous vos plannings.
                </p>
                <div className="flex gap-2">
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
              <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                <strong className="block text-sm text-red-700 dark:text-red-400 mb-1">
                  Confirmer la suppression définitive de votre compte ?
                </strong>
                <p className="text-xs text-red-600 dark:text-red-300 mb-2">
                  Tapez <strong>SUPPRIMER</strong> ci-dessous pour confirmer :
                </p>
                <input
                  type="text"
                  value={deleteInputText}
                  onChange={(e) => setDeleteInputText(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="text-input w-full max-w-xs mb-3"
                />
                <div className="flex gap-2">
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
          </section>
        </div>

        {/* Pied de page */}
        <div className="dialog-footer mt-6 pt-3 border-t border-line flex items-center justify-between">
          <span className="text-xs text-muted flex items-center gap-1.5">
            <Check size={13} className="text-green" /> Vos préférences sont synchronisées sur cet appareil.
          </span>
          <button className="button-primary" onClick={onClose}>
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}
