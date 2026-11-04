"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import type { SheetModel } from "@/lib/sheet-layout";
import type { ExportOptions } from "@/lib/exports";

type SheetViewProps = {
  model: SheetModel;
  options: ExportOptions;
  previewRef?: React.RefObject<HTMLDivElement | null>;
};

export function SheetView({ model, options, previewRef }: SheetViewProps) {
  const isPhone = options.format === "phone";
  const isDesktop = options.format === "desktop";
  const isWallpaper = isPhone || isDesktop;

  const ratio = isPhone
    ? "9 / 16"
    : isDesktop
    ? "16 / 9"
    : options.orientation === "portrait"
    ? "0.707 / 1"
    : "1.414 / 1";

  const fontClass = `font-${options.font.toLowerCase()}`;
  const isPureWhite = options.whiteBackground;

  if (model.month) {
    const { monthLabel, weekdays, cells, eventsCount } = model.month;
    return (
      <div
        ref={previewRef}
        className={`export-paper sheet-unified ${fontClass} ${isPureWhite ? "paper-pure-white" : ""} ${isPhone ? "export-paper-phone" : ""}`}
        style={{ aspectRatio: ratio }}
      >
        <div className="export-paper-header">
          <div>
            {options.showTitle && <h2>{model.title}</h2>}
            {options.showDates && <span>{monthLabel.toUpperCase()} · VUE D’ENSEMBLE</span>}
          </div>
          {options.showLogo && (
            <span className="export-logo" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" width={14} height={14} style={{ borderRadius: 3, objectFit: "cover" }} /> PlaniLux
            </span>
          )}
        </div>

        <div className="sheet-month-grid" role="grid" aria-label={`Calendrier ${monthLabel}`}>
          <div className="sheet-month-weekdays">
            {weekdays.map((day) => (
              <span key={day}>{isPhone ? day.slice(0, 1) : day.slice(0, 3).toUpperCase()}</span>
            ))}
          </div>
          <div className="sheet-month-cells">
            {cells.map((cell, idx) => {
              if (cell.dayNumber === null) {
                return <div key={`empty-${idx}`} className="sheet-month-cell empty" />;
              }
              const visible = cell.events.slice(0, isPhone ? 2 : 3);
              const extraCount = cell.events.length - visible.length;
              return (
                <div key={cell.dateString ?? idx} className={`sheet-month-cell ${cell.isToday ? "today" : ""}`}>
                  <div className="sheet-month-cell-header">
                    <span className="sheet-month-day-num">{cell.dayNumber}</span>
                  </div>
                  <div className="sheet-month-cell-events">
                    {visible.map((event) => (
                      <div
                        key={event.id}
                        className="sheet-month-chip"
                        style={{
                          backgroundColor: isPureWhite ? "#f2eff7" : event.color,
                          borderLeftColor: event.color,
                        }}
                      >
                        {options.showTimes && <span className="chip-time">{event.start}</span>}
                        <strong className="chip-title">{event.title}</strong>
                      </div>
                    ))}
                    {extraCount > 0 && (
                      <span className="sheet-month-more">+{extraCount} de plus</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="export-paper-footer">
          <span>{eventsCount} créneau(x) ce mois-ci · Chaque chose à sa place.</span>
          <i>✳</i>
        </div>
      </div>
    );
  }

  // Disposition Hebdomadaire
  const { hourStart, hourEnd, hours, columns } = model;
  const hourStepPercent = 100 / (hourEnd - hourStart);

  return (
    <div
      ref={previewRef}
      className={`export-paper sheet-unified ${fontClass} ${isPureWhite ? "paper-pure-white" : ""} ${isPhone ? "export-paper-phone" : ""}`}
      style={{ aspectRatio: ratio }}
    >
      <div className="export-paper-header">
        <div>
          {options.showTitle && <h2>{model.title}</h2>}
          {options.showDates && <span>{model.subtitle.toUpperCase()}</span>}
        </div>
        {options.showLogo && (
          <span className="export-logo" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" width={14} height={14} style={{ borderRadius: 3, objectFit: "cover" }} /> PlaniLux
          </span>
        )}
      </div>

      <div className={`sheet-week-container ${isPhone ? "is-phone" : ""}`}>
        {/* Colonne des heures */}
        <div className="sheet-hour-scale" aria-hidden="true">
          <div className="sheet-hour-scale-head" />
          <div className="sheet-hour-scale-body">
            {hours.slice(0, -1).map((h) => (
              <div key={h} className="sheet-hour-label">
                <span>{String(h).padStart(2, "0")}h</span>
              </div>
            ))}
          </div>
        </div>

        {/* Colonnes des jours */}
        <div className="sheet-days-grid">
          {columns.map((col) => (
            <div key={col.dayIndex} className="sheet-day-column">
              <div className="sheet-day-head">
                <span className="sheet-day-name">{isPhone ? col.label.slice(0, 3) : col.shortLabel}</span>
                {options.showDates && (
                  <strong className={`sheet-day-date ${col.isToday ? "today" : ""}`}>
                    {col.date}
                  </strong>
                )}
              </div>

              <div className="sheet-day-track">
                {/* Lignes d'heures régulières */}
                {hours.slice(0, -1).map((h, i) => (
                  <div
                    key={h}
                    className="sheet-grid-line"
                    style={{ top: `${i * hourStepPercent}%` }}
                  />
                ))}

                {/* Événements placés */}
                {col.events.length === 0 ? (
                  <div className="sheet-empty-day-note">
                    <span>Libre</span>
                  </div>
                ) : (
                  col.events.map((event) => {
                    const widthPercent = 100 / event.totalCols;
                    const leftPercent = (event.col / event.totalCols) * 100;
                    const bg = isPureWhite ? "#ffffff" : event.color;
                    const border = event.color;

                    return (
                      <div
                        key={event.id}
                        className="sheet-event-card"
                        style={{
                          top: `${event.topPercent}%`,
                          height: `${event.heightPercent}%`,
                          left: `calc(${leftPercent}% + 1px)`,
                          width: `calc(${widthPercent}% - 2px)`,
                          backgroundColor: bg,
                          borderColor: border,
                        }}
                      >
                        <div className="sheet-event-content">
                          {options.showTimes && (
                            <span className="sheet-event-time">
                              {event.start} – {event.end}
                            </span>
                          )}
                          <strong className="sheet-event-title">{event.title}</strong>
                          {event.location && event.heightPercent > 7 && (
                            <small className="sheet-event-location">{event.location}</small>
                          )}
                          {event.teacher && event.heightPercent > 10 && (
                            <small className="sheet-event-teacher">{event.teacher}</small>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="export-paper-footer">
        <span>Chaque chose à sa place. Et du temps pour toi aussi.</span>
        <i>✳</i>
      </div>
    </div>
  );
}
