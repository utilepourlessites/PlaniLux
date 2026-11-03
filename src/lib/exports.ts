import type { PlannerBoard } from "@/lib/planner-types";
import type { Paragraph, Table, TableRow, TableCell } from "docx";
import {
  buildSheetModel,
  safeName,
  splitColor,
  formatDuration,
  computeEmployeesSummary,
  getContrastTextColor,
  type SheetModel,
} from "@/lib/sheet-layout";

export type ExportFormat = "a4" | "letter" | "phone" | "desktop";
export type ExportOptions = {
  format: ExportFormat;
  orientation: "portrait" | "landscape";
  whiteBackground: boolean;
  showTitle: boolean;
  showDates: boolean;
  showTimes: boolean;
  showLogo: boolean;
  font: "Sans" | "Serif" | "Mono";
  autoCrop?: boolean;
  employeeFilter?: string;
  showHoursSummary?: boolean;
  showSignatureLine?: boolean;
};

export const TARGET_WALLPAPER = {
  phone: { w: 1080, h: 1920 },
  desktop: { w: 1920, h: 1080 },
};

function splitTextLines(docInstance: any, text: string, maxW: number): string[] {
  if (typeof docInstance.splitTextToSize === "function") {
    const lines = docInstance.splitTextToSize(text, maxW);
    return Array.isArray(lines) ? lines : [String(lines)];
  }
  return [text];
}

function formatFileName(title: string, format: ExportFormat, orientation: string, ext: string): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const orientStr = format === "phone" ? "9-16" : format === "desktop" ? "16-9" : orientation;
  return `${safeName(title)}-${dateStr}-${format}-${orientStr}.${ext}`;
}

export function generateWhatsAppSummary(board: PlannerBoard, options?: { employeeFilter?: string }): string {
  const model = buildSheetModel(board, {
    autoCrop: true,
    employeeFilter: options?.employeeFilter,
  });

  const lines: string[] = [];
  lines.push(`*📅 ${board.title.toUpperCase()}*`);
  if (model.subtitle) {
    lines.push(`_${model.subtitle}_`);
  }
  if (options?.employeeFilter && options.employeeFilter !== "all") {
    lines.push(`👤 *Filtre :* ${options.employeeFilter === "unassigned" ? "Non assigné" : options.employeeFilter}`);
  }
  lines.push("━━━━━━━━━━━━━━━━━━━━");

  let totalMinutes = 0;
  let totalEvents = 0;

  if (model.month) {
    for (const cell of model.month.cells) {
      if (cell.dayNumber !== null && cell.events.length > 0) {
        lines.push(`\n*${cell.dateString ?? `Jour ${cell.dayNumber}`} :*`);
        for (const ev of cell.events) {
          const startMin = ev.start.split(":").map(Number);
          const endMin = ev.end.split(":").map(Number);
          const diff = Math.max(0, (endMin[0] * 60 + endMin[1]) - (startMin[0] * 60 + startMin[1]));
          totalMinutes += diff;
          totalEvents++;
          const dur = formatDuration(0, diff);
          let item = `• ${ev.start} – ${ev.end} (${dur}) : *${ev.title}*`;
          if (ev.teacher) item += `\n  👤 ${ev.teacher}`;
          if (ev.location) item += `\n  📍 ${ev.location}`;
          lines.push(item);
        }
      }
    }
  } else {
    for (const col of model.columns) {
      if (col.events.length === 0) continue;
      lines.push(`\n*${col.label} ${col.date ? `(${col.date})` : ""} :*`);
      for (const ev of col.events) {
        totalMinutes += Math.max(0, ev.endMinutes - ev.startMinutes);
        totalEvents++;
        let item = `• ${ev.start} – ${ev.end} (${ev.formattedDuration}) : *${ev.title}*`;
        if (ev.teacher) item += `\n  👤 ${ev.teacher}`;
        if (ev.location) item += `\n  📍 ${ev.location}`;
        lines.push(item);
      }
    }
  }

  lines.push("\n━━━━━━━━━━━━━━━━━━━━");
  lines.push(`⏱ *Total :* ${formatDuration(0, totalMinutes)} (${totalEvents} créneau${totalEvents > 1 ? "x" : ""})`);

  if (model.employeesSummary && model.employeesSummary.length > 0) {
    lines.push("\n👥 *Récapitulatif par employé :*");
    for (const emp of model.employeesSummary) {
      lines.push(`• ${emp.name} : ${emp.formattedHours} (${emp.count} créneau${emp.count > 1 ? "x" : ""})`);
    }
  }

  lines.push("\n_Partagé via PlaniLux_");
  return lines.join("\n");
}

export function openWhatsAppShare(board: PlannerBoard, employeeFilter?: string) {
  const text = generateWhatsAppSummary(board, { employeeFilter });
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function shareScheduleNative(
  node: HTMLElement,
  board: PlannerBoard,
  options: ExportOptions
): Promise<boolean> {
  const { toBlob } = await import("html-to-image");

  await document.fonts.ready;

  const target = TARGET_WALLPAPER[options.format as "phone" | "desktop"];
  const pixelRatio = target ? Math.max(1, target.w / (node.offsetWidth || 1)) : 2.5;

  const blob = await toBlob(node, {
    cacheBust: true,
    pixelRatio,
    backgroundColor: "#ffffff",
  });

  if (!blob) throw new Error("Impossible de générer l'image");

  const fileName = formatFileName(board.title, options.format, options.format === "phone" ? "portrait" : "landscape", "png");
  const file = new File([blob], fileName, { type: "image/png" });

  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: board.title,
      text: `Planning ${board.title} partagé avec PlaniLux`,
      files: [file],
    });
    return true;
  }

  // Fallback si partage natif de fichier non supporté
  const link = document.createElement("a");
  link.download = fileName;
  link.href = URL.createObjectURL(blob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  return false;
}

export async function downloadPdf(board: PlannerBoard, options: ExportOptions) {
  const { jsPDF } = await import("jspdf");
  const model = buildSheetModel(board, options);

  const isWallpaper = options.format === "phone" || options.format === "desktop";
  const isPortrait = options.format === "phone" || (options.format !== "desktop" && options.orientation === "portrait");

  const doc = new jsPDF({
    orientation: isPortrait ? "portrait" : "landscape",
    unit: "mm",
    format: options.format === "letter" ? "letter" : options.format === "phone" ? [90, 160] : options.format === "desktop" ? [160, 90] : "a4",
  });

  const anyDoc = doc as any;
  if (typeof anyDoc.setProperties === "function") {
    anyDoc.setProperties({
      title: board.title,
      subject: `PlaniLux - ${model.subtitle}`,
      creator: "PlaniLux Studio",
      author: "PlaniLux",
    });
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = isWallpaper ? 7 : 12;
  const top = options.showTitle ? (isWallpaper ? 20 : 28) : (isWallpaper ? 12 : 16);
  const bottom = pageHeight - margin - (options.showSignatureLine ? 14 : 6);
  const gridHeight = bottom - top;

  const font = options.font === "Serif" ? "times" : options.font === "Mono" ? "courier" : "helvetica";
  doc.setFont(font, "normal");

  // Fond blanc si option éco-encre
  if (options.whiteBackground) {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
  }

  // En-tête : Titre et sous-titre
  if (options.showTitle) {
    doc.setTextColor(36, 40, 53);
    doc.setFont(font, "bold");
    doc.setFontSize(isWallpaper ? 14 : 18);
    const maxTitleW = pageWidth - margin * 2 - (options.showLogo ? 30 : 0);
    const titleLines = splitTextLines(doc, board.title, maxTitleW);
    doc.text(titleLines.slice(0, 2).join("\n"), margin, isWallpaper ? 11 : 16);

    if (options.showDates) {
      doc.setFont(font, "normal");
      doc.setFontSize(isWallpaper ? 6.5 : 8);
      doc.setTextColor(120, 116, 130);
      const subY = isWallpaper ? 16 : 22;
      doc.text(model.subtitle.toUpperCase(), margin, subY);
    }
  }

  if (options.showLogo) {
    doc.setFont(font, "bold");
    doc.setFontSize(isWallpaper ? 7 : 8.5);
    doc.setTextColor(130, 115, 180);
    doc.text("PlaniLux", pageWidth - margin, isWallpaper ? 11 : 16, { align: "right" });
  }

  // Rendu Calendrier Mensuel
  if (model.month) {
    const { weekdays, cells } = model.month;
    const colCount = 7;
    const rowCount = cells.length / 7;
    const gap = 1;
    const colW = (pageWidth - margin * 2 - gap * (colCount - 1)) / colCount;
    const headerH = 6;
    const rowH = (gridHeight - headerH - gap * (rowCount - 1)) / rowCount;

    for (let c = 0; c < colCount; c++) {
      const x = margin + c * (colW + gap);
      doc.setFillColor(246, 244, 250);
      doc.roundedRect(x, top, colW, headerH, 1, 1, "F");
      doc.setFont(font, "bold");
      doc.setFontSize(isWallpaper ? 5.5 : 7.5);
      doc.setTextColor(80, 75, 92);
      doc.text(weekdays[c].slice(0, 3).toUpperCase(), x + colW / 2, top + 4, { align: "center" });
    }

    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        const cell = cells[r * 7 + c];
        const x = margin + c * (colW + gap);
        const y = top + headerH + gap + r * (rowH + gap);

        if (cell.dayNumber === null) {
          doc.setFillColor(252, 251, 254);
          doc.rect(x, y, colW, rowH, "F");
          continue;
        }

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(230, 226, 240);
        doc.roundedRect(x, y, colW, rowH, 1, 1, "FD");

        doc.setFont(font, "bold");
        doc.setFontSize(isWallpaper ? 6 : 8);
        doc.setTextColor(cell.isToday ? 140 : 40, cell.isToday ? 125 : 35, cell.isToday ? 200 : 50);
        doc.text(String(cell.dayNumber), x + 2, y + 4);

        let chipY = y + 6;
        for (const ev of cell.events.slice(0, 2)) {
          if (chipY + 4 > y + rowH) break;
          const [cr, cg, cb] = splitColor(ev.color);
          doc.setFillColor(cr, cg, cb);
          doc.roundedRect(x + 1, chipY, colW - 2, 4, 0.8, 0.8, "F");

          const textColor = getContrastTextColor(ev.color);
          const [tr, tg, tb] = splitColor(textColor);
          doc.setTextColor(tr, tg, tb);
          doc.setFont(font, "bold");
          doc.setFontSize(5.5);
          doc.text(ev.title.slice(0, 14), x + 2, chipY + 3);
          chipY += 4.5;
        }
      }
    }
  } else {
    // Rendu Semaine / Grille
    const { hourStart, hourEnd, hours, columns } = model;
    const hourCount = Math.max(1, hourEnd - hourStart);
    const colCount = columns.length;
    const timeColWidth = isWallpaper ? 9 : 14;
    const gap = 1.2;
    const availableWidth = pageWidth - margin * 2 - timeColWidth - gap * colCount;
    const colWidth = availableWidth / colCount;
    const headerHeight = 7;
    const trackHeight = gridHeight - headerHeight - gap;
    const hourHeight = trackHeight / hourCount;

    // Facteur d'échelle typographique adaptatif
    const scaleFactor = Math.max(1, Math.min(1.8, 14 / hourCount));

    // En-tête des colonnes (jours)
    for (let c = 0; c < colCount; c++) {
      const col = columns[c];
      const x = margin + timeColWidth + gap + c * (colWidth + gap);
      doc.setFillColor(col.isToday ? 236 : 246, col.isToday ? 232 : 244, col.isToday ? 250 : 250);
      doc.roundedRect(x, top, colWidth, headerHeight, 1, 1, "F");

      doc.setFont(font, "bold");
      doc.setFontSize(isWallpaper ? 6.5 : 8);
      doc.setTextColor(col.isToday ? 120 : 70, col.isToday ? 100 : 65, col.isToday ? 190 : 85);
      const dayLabel = `${col.shortLabel}${options.showDates && col.date ? ` ${col.date}` : ""}`;
      doc.text(dayLabel, x + colWidth / 2, top + 4.5, { align: "center" });
    }

    // Échelle des heures
    for (let h = hourStart; h <= hourEnd; h++) {
      const y = top + headerHeight + gap + (h - hourStart) * hourHeight;
      doc.setFont(font, "normal");
      doc.setFontSize(isWallpaper ? 5.5 : 7);
      doc.setTextColor(140, 136, 150);
      doc.text(`${String(h).padStart(2, "0")}h`, margin + timeColWidth - 2, y + 2.5, { align: "right" });

      if (h < hourEnd) {
        doc.setDrawColor(240, 238, 245);
        doc.setLineWidth(0.2);
        doc.line(margin + timeColWidth, y, pageWidth - margin, y);
      }
    }

    // Événements
    for (let c = 0; c < colCount; c++) {
      const col = columns[c];
      const colX = margin + timeColWidth + gap + c * (colWidth + gap);

      for (const ev of col.events) {
        const evWidth = (colWidth - 1) / ev.totalCols;
        const x = colX + ev.col * evWidth + 0.5;
        const boundedStart = Math.max(hourStart * 60, Math.min(hourEnd * 60, ev.startMinutes));
        const boundedEnd = Math.max(hourStart * 60, Math.min(hourEnd * 60, ev.endMinutes));
        const y = top + headerHeight + gap + ((boundedStart - hourStart * 60) / (hourCount * 60)) * trackHeight;
        const h = Math.max(5, ((boundedEnd - boundedStart) / (hourCount * 60)) * trackHeight);

        const [r, g, b] = splitColor(options.whiteBackground ? "#ffffff" : ev.color);
        doc.setFillColor(r, g, b);
        doc.setDrawColor(210, 205, 225);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, evWidth - 1, h, 1.2, 1.2, "FD");

        // Centrage géométrique vertical et horizontal strict
        const centerY = y + h / 2;
        const centerX = x + (evWidth - 1) / 2;
        const maxTextW = evWidth - 3;

        const textColor = getContrastTextColor(options.whiteBackground ? "#ffffff" : ev.color);
        const [tr, tg, tb] = splitColor(textColor);
        doc.setTextColor(tr, tg, tb);

        const titleSize = Math.min(11, Math.max(6.5, 7.5 * scaleFactor));
        const subSize = Math.min(9, Math.max(5.5, 6 * scaleFactor));

        if (h > 12) {
          // Ligne 1 : Horaires + Durée
          if (options.showTimes) {
            doc.setFont(font, "normal");
            doc.setFontSize(subSize);
            const timeStr = `${ev.start} – ${ev.end} (${ev.formattedDuration})`;
            doc.text(timeStr, centerX, centerY - 3, { align: "center" });
          }

          // Ligne 2 : Titre principal
          doc.setFont(font, "bold");
          doc.setFontSize(titleSize);
          const titleLines = splitTextLines(doc, ev.title, maxTextW);
          doc.text(titleLines[0], centerX, options.showTimes ? centerY + 1.5 : centerY, { align: "center" });

          // Ligne 3 : Employé / Intervenant ou Salle
          if (h > 18 && (ev.teacher || ev.location)) {
            doc.setFont(font, "normal");
            doc.setFontSize(subSize);
            const meta = [ev.teacher, ev.location].filter(Boolean).join(" · ");
            const metaLines = splitTextLines(doc, meta, maxTextW);
            doc.text(metaLines[0], centerX, centerY + 5.5, { align: "center" });
          }
        } else {
          // Case courte : titre centré
          doc.setFont(font, "bold");
          doc.setFontSize(subSize);
          doc.text(ev.title.slice(0, 18), centerX, centerY + 1, { align: "center" });
        }
      }
    }
  }

  // Ligne de signature / validation si demandée
  if (options.showSignatureLine) {
    const sigY = pageHeight - margin - 2;
    doc.setFont(font, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 75, 95);
    doc.text("Signature / Validation : ____________________________", margin, sigY);
    doc.text("Date : __________________", pageWidth - margin - 50, sigY);
  }

  const fileName = formatFileName(board.title, options.format, options.orientation, "pdf");
  doc.save(fileName);
}

export async function downloadDocx(board: PlannerBoard, options: ExportOptions) {
  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
    AlignmentType,
    PageOrientation,
    Footer,
    PageNumber,
  } = await import("docx");

  const model = buildSheetModel(board, options);
  const isPortrait = options.format === "phone" || (options.format !== "desktop" && options.orientation === "portrait");
  const fontName = options.font === "Serif" ? "Georgia" : options.font === "Mono" ? "Consolas" : "Arial";

  const children: (Paragraph | Table)[] = [];

  if (options.showTitle) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: board.title, bold: true, size: 36, color: "1A1828" })],
        spacing: { after: 100 },
      })
    );
    if (options.showDates) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: model.subtitle.toUpperCase(), size: 18, color: "777777" })],
          spacing: { after: 200 },
        })
      );
    }
  }

  if (model.month) {
    const headerRow = new TableRow({
      children: model.month.weekdays.map(
        (day) =>
          new TableCell({
            width: { size: 100 / 7, type: WidthType.PERCENTAGE },
            shading: { fill: "F0EEF5" },
            children: [new Paragraph({ children: [new TextRun({ text: day.slice(0, 3).toUpperCase(), bold: true, size: 16 })], alignment: AlignmentType.CENTER })],
          })
      ),
    });

    const rows: TableRow[] = [headerRow];
    const totalWeeks = model.month.cells.length / 7;
    for (let w = 0; w < totalWeeks; w++) {
      const cells: TableCell[] = [];
      for (let d = 0; d < 7; d++) {
        const cell = model.month.cells[w * 7 + d];
        const paras: Paragraph[] = [];
        if (cell.dayNumber !== null) {
          paras.push(new Paragraph({ children: [new TextRun({ text: String(cell.dayNumber), bold: true, size: 18 })] }));
          for (const ev of cell.events.slice(0, 2)) {
            paras.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `• ${ev.title}`, size: 14 }),
                  ...(options.showTimes ? [new TextRun({ text: ` (${ev.start})`, size: 12, color: "666666" })] : []),
                ],
              })
            );
          }
        }
        cells.push(
          new TableCell({
            width: { size: 100 / 7, type: WidthType.PERCENTAGE },
            children: paras.length ? paras : [new Paragraph({})],
          })
        );
      }
      rows.push(new TableRow({ children: cells }));
    }

    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  } else {
    // Mode semaine
    const headerRow = new TableRow({
      children: [
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: "F0EEF5" },
          children: [new Paragraph({ children: [new TextRun({ text: "Horaires", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
        }),
        ...model.columns.map(
          (col) =>
            new TableCell({
              width: { size: 88 / 7, type: WidthType.PERCENTAGE },
              shading: { fill: "F3F1F8" },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: col.label, bold: true, size: 18 }),
                    ...(options.showDates && col.date ? [new TextRun({ text: ` (${col.date})`, size: 16, color: "777777" })] : []),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            })
        ),
      ],
    });

    const rows: TableRow[] = [headerRow];
    const { hourStart, hourEnd } = model;

    for (let h = hourStart; h < hourEnd; h++) {
      const hStartMin = h * 60;
      const hEndMin = (h + 1) * 60;
      const timeLabel = `${String(h).padStart(2, "0")}:00`;

      const dayCells: TableCell[] = [
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: "FAF9FC" },
          children: [new Paragraph({ children: [new TextRun({ text: timeLabel, size: 16, color: "666666" })], alignment: AlignmentType.CENTER })],
        }),
      ];

      for (const col of model.columns) {
        const overlapping = col.events.filter((ev) => ev.startMinutes < hEndMin && ev.endMinutes > hStartMin);

        const paras: Paragraph[] = [];
        for (const ev of overlapping) {
          const detail = [ev.teacher, ev.location].filter(Boolean).join(" · ");
          paras.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${ev.title} `, bold: true, size: 16 }),
                ...(options.showTimes ? [new TextRun({ text: `(${ev.start}–${ev.end} · ${ev.formattedDuration})`, size: 14, color: "777777" })] : []),
                ...(detail ? [new TextRun({ text: ` · ${detail}`, size: 14, italics: true, color: "888888" })] : []),
              ],
              spacing: { after: 40 },
            })
          );
        }

        if (paras.length === 0) {
          paras.push(new Paragraph({}));
        }

        dayCells.push(
          new TableCell({
            width: { size: 88 / 7, type: WidthType.PERCENTAGE },
            children: paras,
          })
        );
      }

      rows.push(new TableRow({ children: dayCells }));
    }

    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  // Tableau récapitulatif des heures par employé si demandé
  if (options.showHoursSummary && model.employeesSummary && model.employeesSummary.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Récapitulatif des heures par employé", bold: true, size: 24 })],
        spacing: { before: 300, after: 120 },
      })
    );

    const summaryHeader = new TableRow({
      children: [
        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, shading: { fill: "EFEBF5" }, children: [new Paragraph({ children: [new TextRun({ text: "Employé / Intervenant", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: "EFEBF5" }, children: [new Paragraph({ children: [new TextRun({ text: "Créneaux", bold: true, size: 16 })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: "EFEBF5" }, children: [new Paragraph({ children: [new TextRun({ text: "Total Heures", bold: true, size: 16 })], alignment: AlignmentType.RIGHT })] }),
      ],
    });

    const summaryRows = [
      summaryHeader,
      ...model.employeesSummary.map(
        (emp) =>
          new TableRow({
            children: [
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: emp.name, size: 16 })] })] }),
              new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: String(emp.count), size: 16 })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: emp.formattedHours, bold: true, size: 16 })], alignment: AlignmentType.RIGHT })] }),
            ],
          })
      ),
    ];

    children.push(new Table({ rows: summaryRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  // Signature / Validation
  if (options.showSignatureLine) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Signature / Validation : ____________________________       Date : __________________", size: 16 }),
        ],
        spacing: { before: 400 },
      })
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: fontName,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: isPortrait ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE,
            },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "PlaniLux · Page ", size: 16, color: "888888" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888" }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = formatFileName(board.title, options.format, options.orientation, "docx");
  saveBlob(blob, fileName);
}

export async function downloadPng(node: HTMLElement, board: PlannerBoard, format: ExportFormat = "a4") {
  const { toPng } = await import("html-to-image");

  await document.fonts.ready;

  const target = TARGET_WALLPAPER[format as "phone" | "desktop"];
  const pixelRatio = target ? Math.max(1, target.w / (node.offsetWidth || 1)) : 2.5;

  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio,
    backgroundColor: "#ffffff",
  });

  const link = document.createElement("a");
  link.download = formatFileName(board.title, format, format === "phone" ? "portrait" : "landscape", "png");
  link.href = dataUrl;
  link.click();
}

export function printSchedule() {
  window.print();
}

function saveBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
