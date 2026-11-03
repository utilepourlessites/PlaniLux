"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  Bell, CalendarDays, Check, ChevronDown, ChevronRight, Command, LogOut,
  Menu, Minus, Moon, Plus, Search, Sparkles, Sun, SunMedium, WifiOff, X,
} from "lucide-react";
import { PlannerSidebar, type PlannerView } from "@/components/planner-sidebar";
import { Overview } from "@/components/overview";
import { BoardLibrary } from "@/components/board-library";
import { ScheduleEditor } from "@/components/schedule-editor";
import { TemplateDialog } from "@/components/template-dialog";
import { ExportStudio } from "@/components/export-studio";
import { SettingsDialog } from "@/components/settings-dialog";
import { HelpDialog } from "@/components/help-dialog";
import { makeTemplate } from "@/lib/templates";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { BOARD_KIND_LABELS } from "@/lib/planner-types";
import type { BoardKind, PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

const THEME_KEY = "planilux-theme";
const FONT_SCALE_KEY = "planilux-font-scale";
const BRIGHTNESS_KEY = "planilux-brightness";
const OFFLINE_QUEUE_KEY = "planilux-offline-queue";
const BOARDS_BACKUP_KEY = "planilux-boards-backup";
const DEFAULT_USER_NAME = "Mon compte";

type OfflineMutation = {
  id: string;
  board: PlannerBoard;
  isNew: boolean;
  queuedAt: string;
};

function getOfflineQueue(): OfflineMutation[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(OFFLINE_QUEUE_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: OfflineMutation[]) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {}
}

const emptySubscribe = () => () => {};

export function PlannerApp() {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [boards, setBoards] = useState<PlannerBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [view, setView] = useState<PlannerView>("overview");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved !== null) {
        return saved === "dark";
      }
    }
    return true;
  });
  const [fontScale, setFontScale] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = Number(window.localStorage.getItem(FONT_SCALE_KEY));
      if (saved && !isNaN(saved)) return saved;
    }
    return 100;
  });
  const [brightness, setBrightness] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = Number(window.localStorage.getItem(BRIGHTNESS_KEY));
      if (saved && !isNaN(saved) && saved >= 50 && saved <= 150) return saved;
    }
    return 100;
  });
  const [brightnessOpen, setBrightnessOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState<string>("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [toast, setToast] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const brightnessRef = useRef<HTMLDivElement>(null);

  const activeBoard = boards.find((board) => board.id === activeId) ?? null;
  const toastMessage = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const applyFontScale = useCallback((scale: number) => {
    setFontScale(scale);
    try { window.localStorage.setItem(FONT_SCALE_KEY, String(scale)); } catch {}
    document.documentElement.dataset.fontScale = String(scale);
    document.documentElement.style.setProperty("--font-scale", String(scale / 100));
    document.body.style.zoom = String(scale / 100);
  }, []);

  const applyBrightness = useCallback((val: number) => {
    const clamped = Math.max(50, Math.min(150, val));
    setBrightness(clamped);
    try {
      window.localStorage.setItem(BRIGHTNESS_KEY, String(clamped));
    } catch {}
    document.documentElement.style.setProperty("--app-brightness", `${clamped}%`);
  }, []);

  const handleLogout = useCallback(async () => {
    toastMessage("Déconnexion en cours…");
    try {
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" });
      }
    } catch {}
    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) await supabase.auth.signOut();
    } catch {}
    try {
      const theme = window.localStorage.getItem(THEME_KEY);
      const font = window.localStorage.getItem(FONT_SCALE_KEY);
      const bright = window.localStorage.getItem(BRIGHTNESS_KEY);
      window.localStorage.clear();
      if (theme) window.localStorage.setItem(THEME_KEY, theme);
      if (font) window.localStorage.setItem(FONT_SCALE_KEY, font);
      if (bright) window.localStorage.setItem(BRIGHTNESS_KEY, bright);
    } catch {}
    window.location.href = "/login";
  }, [toastMessage]);

  const handleClearData = useCallback(async () => {
    try {
      const res = await fetch("/api/boards", { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur de suppression");
      setBoards([]);
      setActiveId(null);
      setView("overview");
      try {
        window.localStorage.removeItem(BOARDS_BACKUP_KEY);
        window.localStorage.removeItem(OFFLINE_QUEUE_KEY);
      } catch {}
      toastMessage("Tous les tableaux ont été supprimés");
    } catch {
      toastMessage("Échec de la suppression");
    }
  }, [toastMessage]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Impossible de supprimer le compte");
      try {
        if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" });
        }
      } catch {}
      try {
        window.localStorage.clear();
      } catch {}
      window.location.href = "/login";
    } catch {
      toastMessage("Impossible de supprimer le compte.");
    }
  }, [toastMessage]);

  // Rejouer la file d'attente hors-ligne quand la connexion revient
  const syncOfflineQueue = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;
    const queue = getOfflineQueue();
    if (!queue.length) return;

    setSyncStatus("saving");
    const remaining: OfflineMutation[] = [];
    for (const item of queue) {
      try {
        const method = item.isNew ? "POST" : "PATCH";
        const url = item.isNew ? "/api/boards" : `/api/boards/${item.board.id}`;
        let res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.board),
        });
        if (!res.ok && item.isNew && res.status === 409) {
          // Si le tableau existe déjà côté distant, basculer en PATCH
          res = await fetch(`/api/boards/${item.board.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.board),
          });
        }
        if (!res.ok && res.status !== 404) {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }
    saveOfflineQueue(remaining);
    if (remaining.length === 0) {
      setSyncStatus("saved");
      toastMessage("Connexion rétablie — Synchronisation terminée !");
    } else {
      setSyncStatus("error");
    }
  }, [toastMessage]);

  useEffect(() => {
    window.addEventListener("online", syncOfflineQueue);
    return () => window.removeEventListener("online", syncOfflineQueue);
  }, [syncOfflineQueue]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.fontScale = String(fontScale);
    document.documentElement.style.setProperty("--font-scale", String(fontScale / 100));
    document.body.style.zoom = String(fontScale / 100);
    document.documentElement.style.setProperty("--app-brightness", `${brightness}%`);
  }, [dark, fontScale, brightness]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (brightnessRef.current && !brightnessRef.current.contains(target)) {
        setBrightnessOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Sauvegarde résiliente avec file d'attente hors-ligne
  const commitBoard = useCallback(async (board: PlannerBoard, isNew = false) => {
    setBoards((prevBoards) => {
      const exists = prevBoards.some((item) => item.id === board.id);
      const next = exists ? prevBoards.map((item) => (item.id === board.id ? board : item)) : [board, ...prevBoards];
      try {
        window.localStorage.setItem(BOARDS_BACKUP_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Gestion hors-ligne préalable
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const queue = getOfflineQueue();
      const updatedQueue = [
        ...queue.filter((q) => q.board.id !== board.id),
        { id: board.id, board, isNew, queuedAt: new Date().toISOString() },
      ];
      saveOfflineQueue(updatedQueue);
      setSyncStatus("error");
      toastMessage("Hors-ligne — Synchronisation en attente");
      return;
    }

    setSyncStatus("saving");
    const exists = boards.some((item) => item.id === board.id);
    const method = isNew || !exists ? "POST" : "PATCH";
    try {
      const response = await fetch(method === "POST" ? "/api/boards" : `/api/boards/${board.id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(board),
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const queue = getOfflineQueue();
        const updatedQueue = [
          ...queue.filter((q) => q.board.id !== board.id),
          { id: board.id, board, isNew, queuedAt: new Date().toISOString() },
        ];
        saveOfflineQueue(updatedQueue);
        setSyncStatus("error");
        toastMessage("Hors-ligne — Synchronisation en attente");
        return;
      }

      const saved = (await response.json()) as PlannerBoard;
      if (saved && saved.id) {
        setBoards((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      }
      setSyncStatus("saved");
    } catch {
      const queue = getOfflineQueue();
      const updatedQueue = [
        ...queue.filter((q) => q.board.id !== board.id),
        { id: board.id, board, isNew, queuedAt: new Date().toISOString() },
      ];
      saveOfflineQueue(updatedQueue);
      setSyncStatus("error");
      toastMessage("Hors-ligne — Synchronisation en attente");
    }
  }, [boards, toastMessage]);

  const createBoard = (kind: BoardKind, title?: string) => {
    const board = makeTemplate(kind, title);
    commitBoard(board, true);
    setActiveId(board.id);
    setView("editor");
    setTemplateOpen(false);
    toastMessage(`${BOARD_KIND_LABELS[kind]} créé`);
  };

  const openBoard = (id: string) => {
    setActiveId(id);
    setView("editor");
  };

  const updateEvent = (updated: ScheduleEvent | ScheduleEvent[]) => {
    if (!activeBoard) return;
    const items = Array.isArray(updated) ? updated : [updated];
    if (items.length === 0) return;

    let currentEvents = [...activeBoard.events];
    for (const item of items) {
      const idx = currentEvents.findIndex((event) => event.id === item.id);
      if (idx >= 0) {
        currentEvents[idx] = item;
      } else {
        currentEvents.push(item);
      }
    }
    commitBoard({ ...activeBoard, events: currentEvents, updatedAt: new Date().toISOString() });
  };

  const deleteEvent = (id: string) => {
    if (!activeBoard) return;
    commitBoard({ ...activeBoard, events: activeBoard.events.filter((event) => event.id !== id), updatedAt: new Date().toISOString() });
    toastMessage("Créneau supprimé");
  };

  const updateBoard = (board: PlannerBoard) => commitBoard({ ...board, updatedAt: new Date().toISOString() });

  const archiveBoard = (board: PlannerBoard) => {
    commitBoard({ ...board, isDeleted: true, updatedAt: new Date().toISOString() });
    if (activeId === board.id) { setActiveId(null); setView("boards"); }
    toastMessage("Déplacé dans la corbeille");
  };

  const restoreBoard = (board: PlannerBoard) => {
    commitBoard({ ...board, isDeleted: false, updatedAt: new Date().toISOString() });
    toastMessage("Tableau restauré");
  };

  const duplicateBoard = (board: PlannerBoard) => {
    const now = new Date().toISOString();
    const duplicate: PlannerBoard = {
      ...board,
      id: crypto.randomUUID(),
      title: `${board.title} (copie)`,
      favorite: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      events: board.events.map((event) => ({ ...event, id: crypto.randomUUID() })),
    };
    commitBoard(duplicate, true);
    toastMessage("Une copie a été créée");
  };

  const removePermanently = async (board: PlannerBoard) => {
    setBoards((prev) => prev.filter((item) => item.id !== board.id));
    try {
      await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
    } catch {}
    toastMessage("Tableau supprimé définitivement");
  };

  const toggleFavorite = (board: PlannerBoard) => updateBoard({ ...board, favorite: !board.favorite });
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  };

  const saveUserName = async (name: string) => {
    setUserName(name);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
    } catch {}
  };

  const saveWorkspaceName = async (name: string) => {
    setWorkspaceName(name);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceName: name }),
      });
    } catch {}
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const [boardsRes, profileRes] = await Promise.all([
          fetch("/api/boards"),
          fetch("/api/profile"),
        ]);

        if (boardsRes.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (boardsRes.ok) {
          const list = (await boardsRes.json()) as PlannerBoard[];
          if (!isCancelled) {
            setBoards(list);
            try {
              window.localStorage.setItem(BOARDS_BACKUP_KEY, JSON.stringify(list));
            } catch {}
          }
        } else {
          // Secours local hors-ligne
          const backup = window.localStorage.getItem(BOARDS_BACKUP_KEY);
          if (backup && !isCancelled) {
            setBoards(JSON.parse(backup));
          }
        }

        if (profileRes.ok) {
          const profile = (await profileRes.json()) as { displayName?: string; workspaceName?: string };
          if (!isCancelled) {
            if (profile.displayName) setUserName(profile.displayName);
            if (profile.workspaceName) setWorkspaceName(profile.workspaceName);
          }
        }

        // Tenter de purger la file d'attente hors-ligne si existante
        void syncOfflineQueue();
      } catch {
        // En cas d'erreur totale réseau
        const backup = window.localStorage.getItem(BOARDS_BACKUP_KEY);
        if (backup && !isCancelled) {
          setBoards(JSON.parse(backup));
          setSyncStatus("error");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [syncOfflineQueue]);

  const viewBoards = useMemo(() => {
    return boards.filter((board) => {
      if (search && !board.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (view === "trash") return !!board.isDeleted;
      if (board.isDeleted) return false;
      if (view === "starred") return !!board.favorite;
      if (view === "university") return board.kind === "school";
      if (view === "personal") return board.kind !== "school";
      return true;
    });
  }, [boards, search, view]);

  const openTemplateDialog = () => setTemplateOpen(true);
  const userInitials = (userName || "MC").trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "MC";

  return (
    <div className="app-frame">
      <PlannerSidebar
        view={view}
        boards={boards}
        activeId={activeId}
        open={menuOpen}
        onNavigate={(nextView) => setView(nextView)}
        onCreate={openTemplateDialog}
        onOpenBoard={openBoard}
        onClose={() => setMenuOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onLogout={handleLogout}
        userName={userName || DEFAULT_USER_NAME}
        workspaceName={workspaceName || "Mon espace"}
      />

      <main className="content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-button" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(true)}>
              <Menu size={18} />
            </button>
            <div className="search-bar">
              <Search size={14} className="search-icon" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher… (Ctrl+K)" aria-label="Rechercher" />
              {search && (
                <button className="search-clear-button" onClick={() => setSearch("")} aria-label="Effacer">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="topbar-right">
            {/* Statut de synchronisation avec indicateur hors-ligne */}
            <div className="sync-indicator" title={syncStatus === "error" ? "Hors-ligne — Synchronisation en attente" : undefined}>
              {syncStatus === "saving" && <span className="sync-badge sync-saving">Enregistrement…</span>}
              {syncStatus === "saved" && <span className="sync-badge sync-saved"><Check size={12} /> Enregistré</span>}
              {syncStatus === "error" && (
                <span className="sync-badge sync-error flex items-center gap-1" style={{ color: "#c53030", background: "rgba(197, 48, 48, 0.1)" }}>
                  <WifiOff size={12} /> Hors-ligne — En attente
                </span>
              )}
            </div>

            <div className="brightness-wrapper" ref={brightnessRef}>
              <button
                className={`icon-button brightness-toggle ${brightness !== 100 ? "has-adjustment" : ""}`}
                aria-label="Ajuster la luminosité"
                title={`Luminosité : ${brightness}%`}
                onClick={() => setBrightnessOpen(!brightnessOpen)}
              >
                <SunMedium size={17} />
              </button>

              {brightnessOpen && (
                <div className="brightness-popover" role="dialog" aria-label="Luminosité">
                  <div className="brightness-popover-header">
                    <span className="brightness-popover-title">
                      <SunMedium size={14} /> Luminosité PlaniLux
                    </span>
                    <button className="stepper-reset-btn" onClick={() => applyBrightness(100)} title="Réinitialiser à 100%">
                      100%
                    </button>
                  </div>

                  <div className="brightness-controls-row">
                    <button className="stepper-btn-sm" disabled={brightness <= 50} onClick={() => applyBrightness(brightness - 10)} aria-label="Diminuer">
                      <Minus size={12} />
                    </button>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      step={5}
                      value={brightness}
                      onChange={(e) => applyBrightness(Number(e.target.value))}
                      className="brightness-range"
                      aria-label="Niveau de luminosité"
                    />
                    <button className="stepper-btn-sm" disabled={brightness >= 150} onClick={() => applyBrightness(brightness + 10)} aria-label="Augmenter">
                      <Plus size={12} />
                    </button>
                  </div>

                  <div className="brightness-presets-bar">
                    {[
                      { label: "Tamis", val: 80 },
                      { label: "100%", val: 100 },
                      { label: "Clair", val: 120 },
                      { label: "Max", val: 140 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        className={`brightness-chip ${brightness === p.val ? "is-active" : ""}`}
                        onClick={() => applyBrightness(p.val)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="icon-button" aria-label="Basculer le thème" onClick={toggleTheme}>
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <div className="notif-wrapper" ref={notifRef}>
              <button className="icon-button notif-toggle" aria-label="Notifications" onClick={() => setNotifOpen(!notifOpen)}>
                <Bell size={17} />
                {hasUnreadNotifs && <span className="notif-unread-dot" />}
              </button>

              {notifOpen && (
                <div className="notif-popover" role="dialog" aria-label="Notifications">
                  <div className="notif-popover-header">
                    <strong>Notifications</strong>
                  </div>
                  <div className="notif-list">
                    <div className="notif-item" style={{ textAlign: "center", padding: "16px", color: "var(--muted)" }}>
                      <span>Aucune notification pour le moment.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <span className="topbar-divider" />

            <button className="topbar-user topbar-user-btn" onClick={() => setSettingsOpen(true)} title="Paramètres de profil" aria-label="Paramètres de profil">
              <span>{userInitials}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>

        {!isClient || loading ? (
          <div className="app-loading">
            <div style={{ width: 64, height: 64, borderRadius: 18, overflow: "hidden", boxShadow: "0 8px 24px rgba(25, 20, 50, 0.18)" }}>
              <Image src="/logo.png" alt="PlaniLux" width={64} height={64} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <p>Chargement de vos plannings…</p>
          </div>
        ) : (
          <div className="page-content">
            {view === "overview" && (
              <Overview
                boards={boards.filter((board) => !board.isDeleted)}
                onCreate={openTemplateDialog}
                onOpen={openBoard}
                onNavigate={(nextView) => setView(nextView)}
                userName={userName}
              />
            )}

            {(view === "boards" || view === "starred" || view === "university" || view === "personal") && (
              <BoardLibrary
                view={view}
                boards={viewBoards}
                query={search}
                onCreate={openTemplateDialog}
                onOpen={openBoard}
                onFavorite={toggleFavorite}
                onArchive={archiveBoard}
                onRestore={restoreBoard}
                onDelete={removePermanently}
                onDuplicate={duplicateBoard}
                onClearSearch={() => setSearch("")}
                userName={userName}
              />
            )}

            {view === "trash" && (
              <BoardLibrary
                view="trash"
                boards={viewBoards}
                query={search}
                onCreate={openTemplateDialog}
                onOpen={openBoard}
                onFavorite={toggleFavorite}
                onArchive={restoreBoard}
                onRestore={restoreBoard}
                onDelete={removePermanently}
                onDuplicate={duplicateBoard}
                onClearSearch={() => setSearch("")}
                userName={userName}
              />
            )}

            {view === "editor" && activeBoard && (
              <ScheduleEditor
                board={activeBoard}
                onBoardChange={updateBoard}
                onBack={() => { setActiveId(null); setView("boards"); }}
                onOpenStudio={() => setView("studio")}
                onEventSave={updateEvent}
                onEventDelete={deleteEvent}
                onToast={toastMessage}
                syncStatus={syncStatus}
              />
            )}

            {view === "studio" && activeBoard && (
              <ExportStudio
                board={activeBoard}
                onBack={() => setView("editor")}
                onToast={toastMessage}
              />
            )}
          </div>
        )}
      </main>

      {templateOpen && (
        <TemplateDialog
          onClose={() => setTemplateOpen(false)}
          onCreate={createBoard}
        />
      )}

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fontScale={fontScale}
        onChangeFontScale={applyFontScale}
        brightness={brightness}
        onChangeBrightness={applyBrightness}
        dark={dark}
        onToggleDark={toggleTheme}
        userName={userName}
        onChangeUserName={saveUserName}
        workspaceName={workspaceName}
        onChangeWorkspaceName={saveWorkspaceName}
        boards={boards}
        onImportBoards={(imported) => {
          for (const item of imported) commitBoard(item, true);
        }}
        onClearData={handleClearData}
        onDeleteAccount={handleDeleteAccount}
        onLogout={handleLogout}
        onToast={toastMessage}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Sparkles size={14} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
