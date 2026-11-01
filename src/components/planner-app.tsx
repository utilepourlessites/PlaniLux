"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Bell, CalendarDays, Check, ChevronDown, ChevronRight, Command, LogOut,
  Menu, Minus, Moon, Plus, Search, Sparkles, Sun, SunMedium, X,
} from "lucide-react";
import { PlannerSidebar, type PlannerView } from "@/components/planner-sidebar";
import { Overview } from "@/components/overview";
import { BoardLibrary } from "@/components/board-library";
import { ScheduleEditor } from "@/components/schedule-editor";
import { TemplateDialog } from "@/components/template-dialog";
import { ExportStudio } from "@/components/export-studio";
import { SettingsDialog } from "@/components/settings-dialog";
import { HelpDialog } from "@/components/help-dialog";
import { makeDefaultBoards, makeTemplate } from "@/lib/templates";
import { BOARD_KIND_LABELS } from "@/lib/planner-types";
import type { BoardKind, PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

const LOCAL_KEY = "planilux-boards-v1";
const THEME_KEY = "planilux-theme";
const FONT_SCALE_KEY = "planilux-font-scale";
const BRIGHTNESS_KEY = "planilux-brightness";
const USER_NAME_KEY = "planilux-user-name";
const WORKSPACE_NAME_KEY = "planilux-workspace-name";

function readLocalBoards(): PlannerBoard[] {
  try {
    const value = window.localStorage.getItem(LOCAL_KEY);
    return value ? JSON.parse(value) as PlannerBoard[] : [];
  } catch {
    return [];
  }
}

const emptySubscribe = () => () => {};

export function PlannerApp() {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [boards, setBoards] = useState<PlannerBoard[]>(() => {
    if (typeof window !== "undefined") {
      const local = readLocalBoards();
      if (local.length) return local;
      return makeDefaultBoards();
    }
    return [];
  });
  const [view, setView] = useState<PlannerView>("overview");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(THEME_KEY) === "dark";
    }
    return false;
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
  const [userName, setUserName] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(USER_NAME_KEY);
      if (saved) return saved;
    }
    return "Camille Moreau";
  });
  const [workspaceName, setWorkspaceName] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(WORKSPACE_NAME_KEY);
      if (saved) return saved;
    }
    return "Mon espace";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(true);
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

  const handleLogout = useCallback(() => {
    toastMessage("Déconnexion de PlaniLux…");
    window.setTimeout(() => {
      window.location.href = "/login";
    }, 250);
  }, [toastMessage]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY) === "dark";
    document.documentElement.dataset.theme = savedTheme ? "dark" : "light";

    const savedFontScale = Number(window.localStorage.getItem(FONT_SCALE_KEY));
    const fontScaleToApply = savedFontScale && !isNaN(savedFontScale) ? savedFontScale : 100;
    document.documentElement.dataset.fontScale = String(fontScaleToApply);
    document.documentElement.style.setProperty("--font-scale", String(fontScaleToApply / 100));
    document.body.style.zoom = String(fontScaleToApply / 100);

    const savedBrightness = Number(window.localStorage.getItem(BRIGHTNESS_KEY));
    if (savedBrightness && !isNaN(savedBrightness) && savedBrightness >= 50 && savedBrightness <= 150) {
      document.documentElement.style.setProperty("--app-brightness", `${savedBrightness}%`);
    } else {
      document.documentElement.style.setProperty("--app-brightness", "100%");
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    let cancelled = false;
    const local = readLocalBoards();
    fetch("/api/boards", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("offline");
      const remote = await response.json() as PlannerBoard[];
      if (cancelled || !Array.isArray(remote)) return;
      const localById = new Map(local.map((board) => [board.id, board]));
      const remoteIds = new Set(remote.map((board) => board.id));
      const merged = remote.map((board) => {
        const localBoard = localById.get(board.id);
        if (localBoard && new Date(localBoard.updatedAt).getTime() > new Date(board.updatedAt).getTime()) return localBoard;
        return board;
      });
      for (const board of local) if (!remoteIds.has(board.id)) merged.push(board);
      setBoards(merged);
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
    }).catch(() => undefined);

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const clickOutsideNotif = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutsideNotif);
    return () => document.removeEventListener("mousedown", clickOutsideNotif);
  }, [notifOpen]);

  useEffect(() => {
    if (!brightnessOpen) return;
    const clickOutsideBrightness = (event: MouseEvent) => {
      if (brightnessRef.current && !brightnessRef.current.contains(event.target as Node)) {
        setBrightnessOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutsideBrightness);
    return () => document.removeEventListener("mousedown", clickOutsideBrightness);
  }, [brightnessOpen]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const persistLocal = useCallback((next: PlannerBoard[]) => {
    setBoards(next);
    try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch { /* Storage can be unavailable in private mode. */ }
  }, []);

  const commitBoard = useCallback((board: PlannerBoard, isNew = false) => {
    const exists = boards.some((item) => item.id === board.id);
    const next = exists ? boards.map((item) => item.id === board.id ? board : item) : [board, ...boards];
    persistLocal(next);
    const method = isNew || !exists ? "POST" : "PATCH";
    fetch(method === "POST" ? "/api/boards" : `/api/boards/${board.id}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(board),
    }).then(async (response) => {
      if (!response.ok) throw new Error("offline");
      const saved = await response.json() as PlannerBoard;
      if (saved.id) {
        const updated = next.map((item) => item.id === saved.id ? { ...item, ...saved } : item);
        persistLocal(updated);
      }
    }).catch(() => {
      /* Saved locally via persistLocal; sync will resume when backend is connected */
    });
  }, [boards, persistLocal]);

  const createBoard = (kind: BoardKind, title: string) => {
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

  const updateEvent = (updated: ScheduleEvent) => {
    if (!activeBoard) return;
    const found = activeBoard.events.some((event) => event.id === updated.id);
    const events = found
      ? activeBoard.events.map((event) => event.id === updated.id ? updated : event)
      : [...activeBoard.events, updated];
    commitBoard({ ...activeBoard, events, updatedAt: new Date().toISOString() });
  };

  const deleteEvent = (id: string) => {
    if (!activeBoard) return;
    commitBoard({ ...activeBoard, events: activeBoard.events.filter((event) => event.id !== id), updatedAt: new Date().toISOString() });
    toastMessage("Événement supprimé");
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
    const duplicate: PlannerBoard = { ...board, id: crypto.randomUUID(), title: `${board.title} (copie)`, favorite: false, isDeleted: false, createdAt: now, updatedAt: now,
      events: board.events.map((event) => ({ ...event, id: crypto.randomUUID() })) };
    commitBoard(duplicate, true);
    toastMessage("Une copie a été créée");
  };

  const removePermanently = async (board: PlannerBoard) => {
    persistLocal(boards.filter((item) => item.id !== board.id));
    try { await fetch(`/api/boards/${board.id}`, { method: "DELETE" }); } catch { /* Local removal remains in place. */ }
    toastMessage("Tableau supprimé définitivement");
  };

  const toggleFavorite = (board: PlannerBoard) => updateBoard({ ...board, favorite: !board.favorite });
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  };

  const saveUserName = (name: string) => {
    setUserName(name);
    try { window.localStorage.setItem(USER_NAME_KEY, name); } catch {}
  };

  const saveWorkspaceName = (name: string) => {
    setWorkspaceName(name);
    try { window.localStorage.setItem(WORKSPACE_NAME_KEY, name); } catch {}
  };

  const userInitials = userName.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "CM";

  const filteredBoards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");
    return boards.filter((board) => {
      if (view === "trash") return board.isDeleted && (!term || board.title.toLocaleLowerCase("fr").includes(term));
      if (board.isDeleted) return false;
      if (view === "starred" && !board.favorite) return false;
      if (view === "university" && board.kind !== "school") return false;
      if (view === "personal" && board.kind === "school") return false;
      return !term || board.title.toLocaleLowerCase("fr").includes(term) || BOARD_KIND_LABELS[board.kind].toLocaleLowerCase("fr").includes(term);
    });
  }, [boards, search, view]);

  const pageTitle = view === "editor" ? activeBoard?.title ?? "Mon tableau" : view === "studio" ? "Studio d’export" : view === "overview" ? "Vue d’ensemble" : view === "starred" ? "Mes favoris" : view === "trash" ? "Corbeille" : view === "university" ? "Université" : view === "personal" ? "Personnel" : "Mes tableaux";
  const openTemplateDialog = () => setTemplateOpen(true);

  return (
    <div className={`app-frame ${dark ? "theme-dark" : ""}`}>
      <PlannerSidebar
        view={view}
        boards={boards}
        activeId={activeId}
        open={menuOpen}
        onNavigate={(target) => setView(target)}
        onCreate={openTemplateDialog}
        onOpenBoard={openBoard}
        onClose={() => setMenuOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onLogout={handleLogout}
        userName={userName}
        workspaceName={workspaceName}
      />
      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-button" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(true)}><Menu size={19} /></button>
            <div className="breadcrumbs"><span>{workspaceName}</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher..." aria-label="Rechercher un tableau" />
              <kbd><Command size={11} /> K</kbd>
            </label>
            <span className="topbar-divider" />
            <div className="brightness-wrapper" ref={brightnessRef}>
              <button
                className={`icon-button brightness-toggle ${brightness !== 100 ? "has-adjustment" : ""}`}
                onClick={() => setBrightnessOpen(!brightnessOpen)}
                aria-label={`Luminosité : ${brightness}%`}
                title={`Luminosité : ${brightness}% (clique pour ajuster)`}
              >
                <SunMedium size={18} />
              </button>
              {brightnessOpen && (
                <div className="brightness-popover" role="dialog" aria-label="Contrôle de la luminosité">
                  <div className="brightness-popover-header">
                    <div className="brightness-popover-title">
                      <SunMedium size={15} />
                      <strong>Luminosité</strong>
                    </div>
                    <button
                      className="stepper-reset-btn"
                      onClick={() => applyBrightness(100)}
                      title="Réinitialiser à 100%"
                    >
                      {brightness}% (Reset)
                    </button>
                  </div>
                  <div className="brightness-controls-row">
                    <button
                      className="stepper-btn-sm"
                      onClick={() => applyBrightness(brightness - 5)}
                      disabled={brightness <= 50}
                      title="Diminuer la luminosité"
                      aria-label="Diminuer la luminosité"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="5"
                      value={brightness}
                      onChange={(e) => applyBrightness(Number(e.target.value))}
                      className="brightness-range"
                      aria-label="Ajuster la luminosité"
                    />
                    <button
                      className="stepper-btn-sm"
                      onClick={() => applyBrightness(brightness + 5)}
                      disabled={brightness >= 150}
                      title="Augmenter la luminosité"
                      aria-label="Augmenter la luminosité"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="brightness-presets-bar">
                    {[75, 90, 100, 115, 130].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`brightness-chip ${brightness === val ? "is-active" : ""}`}
                        onClick={() => applyBrightness(val)}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={dark ? "Passer au thème clair" : "Passer au thème sombre"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <div className="notif-wrapper" ref={notifRef}>
              <button
                className="icon-button notification-button"
                onClick={() => { setNotifOpen(!notifOpen); setHasUnreadNotifs(false); }}
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <Bell size={18} />
                {hasUnreadNotifs && <i />}
              </button>
              {notifOpen && (
                <div className="notif-popover" role="dialog" aria-label="Notifications">
                  <div className="notif-popover-header">
                    <strong>Notifications & Rappels</strong>
                    <button className="notif-clear-btn" onClick={() => setHasUnreadNotifs(false)}>Tout lu</button>
                  </div>
                  <div className="notif-list">
                    <div className="notif-item">
                      <span className="notif-icon notif-icon-sparkle"><Sparkles size={14} /></span>
                      <div>
                        <strong>Bienvenue sur PlaniLux</strong>
                        <small>Ton espace est prêt, rapide et optimisé.</small>
                      </div>
                    </div>
                    <div className="notif-item">
                      <span className="notif-icon notif-icon-cal"><CalendarDays size={14} /></span>
                      <div>
                        <strong>Rappel de sérénité</strong>
                        <small>Prévois aussi des moments de pause dans ta semaine.</small>
                      </div>
                    </div>
                    <div className="notif-item">
                      <span className="notif-icon notif-icon-check"><Check size={14} /></span>
                      <div>
                        <strong>Sauvegarde locale active</strong>
                        <small>Tes plannings sont conservés sur cet appareil.</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button className="topbar-user topbar-user-btn" onClick={() => setSettingsOpen(true)} title="Paramètres de profil" aria-label="Paramètres de profil">
              <span>{userInitials}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>

        {!isClient ? <div className="app-loading"><span className="loading-orbit" /><p>Un instant, on prépare ton espace…</p></div> : (
          <div className="page-content" key={`${view}-${activeBoard?.id ?? "none"}`}>
            {view === "overview" && (
              <Overview
                boards={boards.filter((board) => !board.isDeleted)}
                onCreate={openTemplateDialog}
                onOpen={openBoard}
                onNavigate={(target) => setView(target)}
                userName={userName}
              />
            )}
            {(view === "boards" || view === "starred" || view === "trash" || view === "university" || view === "personal") && (
              <BoardLibrary view={view} boards={filteredBoards} query={search} onCreate={openTemplateDialog} onOpen={openBoard} onDuplicate={duplicateBoard} onFavorite={toggleFavorite} onArchive={archiveBoard} onRestore={restoreBoard} onDelete={removePermanently} onClearSearch={() => setSearch("")} />
            )}
            {view === "editor" && activeBoard && (
              <ScheduleEditor board={activeBoard} onBoardChange={updateBoard} onBack={() => setView("boards")} onOpenStudio={() => setView("studio")} onEventSave={updateEvent} onEventDelete={deleteEvent} onToast={toastMessage} />
            )}
            {view === "studio" && activeBoard && <ExportStudio board={activeBoard} onBack={() => setView("editor")} onToast={toastMessage} />}
            {view === "studio" && !activeBoard && <section className="empty-state"><span className="empty-icon"><CalendarDays /></span><h2>Choisis un tableau à exporter</h2><p>Ouvre un planning pour retrouver ses options d’impression et de téléchargement.</p><button className="button-primary" onClick={() => setView("boards")}>Voir mes tableaux</button></section>}
          </div>
        )}
      </main>

      {templateOpen && <TemplateDialog onClose={() => setTemplateOpen(false)} onCreate={createBoard} />}
      {settingsOpen && (
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
            persistLocal(imported);
            toastMessage(`${imported.length} tableau(x) importé(s)`);
          }}
          onResetDefaults={() => {
            const defs = makeDefaultBoards();
            persistLocal(defs);
            toastMessage("Tableaux réinitialisés");
          }}
          onLogout={handleLogout}
          onToast={toastMessage}
        />
      )}
      {helpOpen && <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />}
      {toast && <div className="toast-message" role="status"><span><Check size={15} /></span>{toast}<button onClick={() => setToast("")} aria-label="Fermer"><X size={14} /></button></div>}
    </div>
  );
}
