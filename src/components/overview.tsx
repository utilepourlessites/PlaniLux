"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight, ArrowUpRight, CalendarCheck2, CalendarDays, Check, ChevronRight,
  Clock3, Plus, Sparkles, Star, Zap,
} from "lucide-react";
import { BOARD_KIND_LABELS, type PlannerBoard } from "@/lib/planner-types";
import type { PlannerView } from "@/components/planner-sidebar";

const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const shortTimes = ["08", "10", "12", "14", "16", "18"];

function parseMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function MiniWeek({ board, onOpen }: { board: PlannerBoard; onOpen: () => void }) {
  return (
    <div className="mini-week" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter") onOpen(); }}>
      <div className="mini-time-rail">{shortTimes.map((time) => <span key={time}>{time}h</span>)}</div>
      <div className="mini-week-columns">
        {weekdays.map((day, index) => {
          const dayItems = board.events.filter((item) => item.day === index).slice(0, 3);
          return (
            <div className="mini-day-column" key={day}>
              <div className="mini-day-label">{day}</div>
              <div className="mini-day-track">
                {dayItems.map((item) => {
                  const startMin = parseMinutes(item.start);
                  const endMin = parseMinutes(item.end);
                  const top = Math.max(2, Math.min(85, ((startMin - 480) / 600) * 100));
                  const height = Math.max(12, Math.min(100 - top, ((endMin - startMin) / 600) * 100));
                  return <span key={item.id} className="mini-event" style={{ top: `${top}%`, height: `${height}%`, backgroundColor: item.color }} title={`${item.title} (${item.start}–${item.end})`} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoardTile({ board, onOpen }: { board: PlannerBoard; onOpen: () => void }) {
  const days = ["L", "M", "M", "J", "V"];
  return (
    <button className="overview-board-tile" onClick={onOpen}>
      <div className="tile-preview" style={{ "--tile-accent": board.color } as React.CSSProperties}>
        <span className="tile-preview-mark"><CalendarDays size={15} /></span>
        <div className="tile-preview-lines"><i /><i /><i /></div>
        <div className="tile-preview-days">{days.map((day, index) => <span key={`${day}${index}`}>{day}</span>)}</div>
        <span className="tile-event-dot tile-dot-a" /><span className="tile-event-dot tile-dot-b" /><span className="tile-event-dot tile-dot-c" />
        {board.favorite && <span className="tile-star"><Star size={12} fill="currentColor" /></span>}
      </div>
      <div className="tile-copy"><span className="tile-title">{board.title}</span><span className="tile-subtitle">{BOARD_KIND_LABELS[board.kind]} <span>·</span> {board.events.length} créneau{board.events.length > 1 ? "x" : ""}</span></div>
      <ArrowUpRight size={16} className="tile-arrow" />
    </button>
  );
}

export function Overview({ boards, onCreate, onOpen, onNavigate, userName }: {
  boards: PlannerBoard[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onNavigate: (view: PlannerView) => void;
  userName?: string;
}) {
  const [taskDone, setTaskDone] = useState(false);
  const featured = boards.find((board) => board.favorite) ?? boards[0];
  const eventCount = boards.reduce((total, board) => total + board.events.length, 0);
  const date = new Date();
  const dateText = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(date);
  const displayName = userName?.trim() ? userName.split(" ")[0] : "Camille";

  return (
    <div className="overview-page">
      <div className="page-heading overview-heading">
        <div>
          <div className="eyebrow-date"><span className="live-dot" /> {dateText}</div>
          <h1>Bonjour {displayName} <span className="wave-emoji">☀️</span></h1>
          <p>On fait de la place pour une belle semaine ?</p>
        </div>
        <button className="button-primary desktop-create" onClick={onCreate}><Plus size={17} /> Nouveau tableau</button>
      </div>

      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="banner-overline"><Sparkles size={13} /> TON ESPACE, TON RYTHME</span>
          <h2>Une semaine à ton image.<br /><em>Et un peu plus légère.</em></h2>
          <p>Chaque chose à sa place, et du temps pour toi aussi.</p>
          <button className="banner-link" onClick={() => featured && onOpen(featured.id)}>Voir mon planning <ArrowRight size={15} /></button>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="banner-orbit orbit-one" /><div className="banner-orbit orbit-two" />
          <div className="banner-sun"><Sparkles size={29} strokeWidth={1.5} /></div>
          <div className="floating-note note-top"><span className="note-check"><CalendarCheck2 size={14} /></span><span><strong>Tout est prêt</strong><small>Tu gères 🌷</small></span></div>
          <div className="floating-note note-bottom"><span className="note-clock"><Clock3 size={14} /></span><span><strong>Un peu de temps</strong><small>Rien que pour toi</small></span></div>
          <span className="banner-sparkle sparkle-a">✳</span><span className="banner-sparkle sparkle-b">✦</span><span className="banner-sparkle sparkle-c">·</span>
        </div>
        <div className="banner-grain" />
      </section>

      <div className="overview-stats">
        <article className="stat-card"><span className="stat-icon stat-lilac"><CalendarDays size={17} /></span><div><span>MES TABLEAUX</span><strong>{boards.length.toString().padStart(2, "0")}</strong></div><small className="stat-caption">un espace pour chaque projet</small></article>
        <article className="stat-card"><span className="stat-icon stat-mint"><CalendarCheck2 size={17} /></span><div><span>CRÉNEAUX PLANIFIÉS</span><strong>{eventCount.toString().padStart(2, "0")}</strong></div><small className="stat-caption">à ton rythme, sans pression</small></article>
        <article className="stat-card stat-quote-card"><span className="stat-icon stat-peach"><Zap size={17} /></span><div><span>PETIT RAPPEL</span><strong>Tu avances.</strong></div><small className="stat-caption">et c’est déjà beaucoup ✨</small></article>
      </div>

      <div className="overview-columns">
        <section className="overview-section week-overview-card">
          <div className="section-heading">
            <div><div className="section-eyebrow">TON COUP D’ŒIL</div><h2>Ta semaine, en un regard</h2></div>
            <button className="text-link" onClick={() => featured && onOpen(featured.id)}>Ouvrir le planning <ChevronRight size={15} /></button>
          </div>
          {featured ? (
            <>
              <button className="week-range week-range-btn" onClick={() => onOpen(featured.id)} aria-label={`Ouvrir ${featured.title}`}>
                <span className="range-dot" style={{ background: featured.color }} />
                <span>{featured.title}</span>
                <span className="range-chevron"><ChevronRight size={14} /></span>
              </button>
              <MiniWeek board={featured} onOpen={() => onOpen(featured.id)} />
            </>
          ) : <button className="week-empty" onClick={onCreate}><Plus size={16} /> Créer ton premier planning</button>}
          <div className="week-footer"><span><span className="legend-dot legend-school" /> Cours</span><span><span className="legend-dot legend-personal" /> Temps pour soi</span><button onClick={() => onNavigate("boards")}>Tout voir <ArrowRight size={14} /></button></div>
        </section>

        <section className="overview-section today-card">
          <div className="section-heading today-heading"><div><div className="section-eyebrow">EN DOUCEUR</div><h2>À ne pas oublier</h2></div><span className="today-sparkle"><Sparkles size={17} /></span></div>
          <div className="today-reminder"><span className="reminder-icon"><Clock3 size={16} /></span><div><strong>Respirer, c’est productif.</strong><p>Une pause fait aussi partie du programme.</p></div></div>
          <button
            className={`today-task today-task-btn ${taskDone ? "is-task-done" : ""}`}
            onClick={() => setTaskDone(!taskDone)}
            aria-label="Cocher l'objectif du jour"
          >
            <span className="task-check">{taskDone && <Check size={11} />}</span>
            <div><strong>Garder un moment pour soi</strong><small>{taskDone ? "Fait pour aujourd'hui ! ✨" : "La priorité du jour"}</small></div>
            <span className="task-tag">{taskDone ? "ACCOMPLI" : "ESSENTIEL"}</span>
          </button>
          <div className="today-footer"><span>Ton agenda t’appartient.</span><span className="footer-heart">♡</span></div>
        </section>
      </div>

      <section className="overview-section boards-overview-section">
        <div className="section-heading boards-heading">
          <div><div className="section-eyebrow">TON PETIT UNIVERS</div><h2>Reprendre là où tu en étais</h2></div>
          <button className="text-link" onClick={() => onNavigate("boards")}>Tous mes tableaux <ChevronRight size={15} /></button>
        </div>
        {boards.length ? <div className="overview-board-grid">{boards.slice(0, 3).map((board) => <BoardTile key={board.id} board={board} onOpen={() => onOpen(board.id)} />)}</div> : <button className="create-first-board" onClick={onCreate}><span><Plus size={17} /></span><strong>Créer ton premier tableau</strong><small>Ça ne prend qu’un instant</small></button>}
      </section>
      <div className="overview-note"><span className="note-star">✳</span> Une bonne organisation n’a pas besoin d’être parfaite. Elle a juste besoin de te ressembler.</div>
    </div>
  );
}
