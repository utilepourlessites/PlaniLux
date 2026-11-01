import type { PlannerBoard } from "@/lib/planner-types";
import type { Paragraph, Table, TableRow, TableCell } from "docx";
import {
  buildSheetModel,
  safeName,
  splitColor,
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
  const bottom = pageHeight - margin;
  const gridHeight = bottom - top - 6;

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

  // Rendu Calendrier Mensuel (si board.kind === "monthly")
  if (model.month) {
    const { monthLabel, weekdays, cells } = model.month;
    const colCount = 7;
    const rowCount = cells.length / 7;
    const gap = 1;
    const colW = (pageWidth - margin * 2 - gap * (colCount - 1)) / colCount;
    const headerH = 6;
    const rowH = (gridHeight - headerH - gap * (rowCount - 1)) / rowCount;

    // En-tête des jours de la semaine
    for (let c = 0; c < colCount; c++) {
      const x = margin + c * (colW + gap);
      doc.setFillColor(246, 244, 250);
      doc.roundedRect(x, top, colW, headerH, 1, 1, "F");
      doc.setFont(font, "bold");
      doc.setFontSize(isWallpaper ? 5.5 : 7.5);
      doc.setTextColor(80, 75, 92);
      doc.text(weekdays[c].slice(0, 3).toUpperCase(), x + colW / 2, top + 4, { align: "center" });
    }

    // Cellules du mois
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

        doc.setFillColor(cell.isToday ? 245 : 255, cell.isToday ? 242 : 255, cell.isToday ? 252 : 255);
        doc.setDrawColor(235, 232, 240);
        doc.setLineWidth(0.15);
        doc.rect(x, y, colW, rowH, "FD");

        // Numéro du jour
        doc.setFont(font, "bold");
        doc.setFontSize(isWallpaper ? 5 : 7);
        doc.setTextColor(cell.isToday ? 110 : 80, cell.isToday ? 80 : 75, cell.isToday ? 170 : 90);
        doc.text(String(cell.dayNumber), x + colW - 2, y + 3.5, { align: "right" });

        // Événements dans la cellule
        let eventY = y + 5;
        const maxEvents = rowH > 22 ? 3 : 2;
        const visibleEvents = cell.events.slice(0, maxEvents);
        for (const ev of visibleEvents) {
          const [cr, cg, cb] = options.whiteBackground ? [245, 244, 248] : splitColor(ev.color);
          doc.setFillColor(cr, cg, cb);
          doc.roundedRect(x + 1, eventY, colW - 2, 3.8, 0.5, 0.5, "F");

          doc.setFont(font, "bold");
          doc.setFontSize(isWallpaper ? 4 : 5.5);
          doc.setTextColor(40, 38, 48);
          const timeText = options.showTimes ? `${ev.start} ` : "";
          const fullText = `${timeText}${ev.title}`;
          const truncated = splitTextLines(doc, fullText, colW - 4)[0] || "";
          doc.text(truncated, x + 2, eventY + 2.7);

          eventY += 4.3;
        }

        if (cell.events.length > maxEvents) {
          doc.setFont(font, "normal");
          doc.setFontSize(4.5);
          doc.setTextColor(140, 130, 155);
          doc.text(`+${cell.events.length - maxEvents}`, x + 2, eventY + 2.5);
        }
      }
    }
  } else {
    // Rendu Grille Hebdomadaire
    const timeColWidth = isWallpaper ? 7 : 12;
    const colCount = model.columns.length;
    const gap = 1.2;
    const totalDaysWidth = pageWidth - margin * 2 - timeColWidth - gap * colCount;
    const dayWidth = totalDaysWidth / colCount;

    const { hourStart, hourEnd, hours } = model;
    const totalHours = hourEnd - hourStart;
    const hourStep = gridHeight / totalHours;

    // Colonne horaire à gauche (Point E-2a)
    for (let i = 0; i < hours.length; i++) {
      const h = hours[i];
      const y = top + i * hourStep;
      doc.setFont(font, "normal");
      doc.setFontSize(isWallpaper ? 5 : 6.8);
      doc.setTextColor(130, 126, 140);
      doc.text(`${String(h).padStart(2, "0")}:00`, margin + timeColWidth - 1.5, y + 1.2, { align: "right" });

      if (i < hours.length) {
        doc.setDrawColor(235, 232, 240);
        doc.setLineWidth(0.12);
        doc.line(margin + timeColWidth, y, pageWidth - margin, y);
      }
    }

    // Colonnes des jours
    for (let c = 0; c < colCount; c++) {
      const col = model.columns[c];
      const x = margin + timeColWidth + gap + c * (dayWidth + gap);

      // Fond de colonne
      doc.setFillColor(252, 251, 254);
      doc.roundedRect(x, top, dayWidth, gridHeight, 1, 1, "F");

      // En-tête de jour (Point E-2b)
      doc.setFont(font, "bold");
      doc.setFontSize(isWallpaper ? 5.5 : 7.5);
      doc.setTextColor(70, 65, 80);
      const headLabel = `${col.shortLabel} ${options.showDates && col.date ? col.date : ""}`;
      doc.text(headLabel, x + dayWidth / 2, top - 2.5, { align: "center" });

      // Événements placés avec gestion des chevauchements (Point E-2c)
      for (const event of col.events) {
        const eventTop = top + (event.topPercent / 100) * gridHeight;
        const eventH = Math.max(3.2, (event.heightPercent / 100) * gridHeight);

        const subWidth = (dayWidth - 0.8) / event.totalCols;
        const subLeft = x + 0.4 + event.col * subWidth;

        const [r, g, b] = options.whiteBackground ? [255, 255, 255] : splitColor(event.color);
        doc.setFillColor(r, g, b);
        doc.setDrawColor(180, 175, 195);
        doc.setLineWidth(0.15);
        doc.roundedRect(subLeft, eventTop, subWidth - 0.6, eventH, 0.8, 0.8, "FD");

        // Bande de couleur gauche
        const [br, bg, bb] = splitColor(event.color);
        doc.setFillColor(br, bg, bb);
        doc.rect(subLeft, eventTop, 1, eventH, "F");

        // Texte du cours (Points E-2d, E-2e, E-2f)
        doc.setFont(font, "bold");
        doc.setFontSize(isWallpaper ? 4.5 : Math.max(6.8, Math.min(8.5, subWidth * 0.45)));
        doc.setTextColor(30, 28, 38);

        const textMaxW = subWidth - 2.5;
        const titleLines = splitTextLines(doc, event.title, textMaxW);
        doc.text(titleLines[0] || "", subLeft + 1.8, eventTop + 2.6);

        if (options.showTimes && eventH > 6) {
          doc.setFont(font, "normal");
          doc.setFontSize(isWallpaper ? 3.8 : 5.8);
          doc.setTextColor(85, 80, 95);
          doc.text(`${event.start}–${event.end}`, subLeft + 1.8, eventTop + 5.2);
        }

        if (event.location && eventH > 10) {
          doc.setFont(font, "normal");
          doc.setFontSize(isWallpaper ? 3.5 : 5.2);
          doc.setTextColor(115, 110, 125);
          const locLine = splitTextLines(doc, event.location, textMaxW)[0] || "";
          doc.text(locLine, subLeft + 1.8, eventTop + 7.8);
        }
      }
    }
  }

  // Pied de page
  doc.setFont(font, "normal");
  doc.setFontSize(isWallpaper ? 4.5 : 6.5);
  doc.setTextColor(140, 136, 150);
  doc.text("PlaniLux · Vos journées, composées avec soin.", margin, pageHeight - margin + 3.5);

  const fileName = formatFileName(board.title, options.format, options.orientation, "pdf");
  doc.save(fileName);
}

export async function downloadDocx(board: PlannerBoard, options: ExportOptions) {
  const {
    Document,
    HeadingLevel,
    PageOrientation,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
    AlignmentType,
    BorderStyle,
    Footer,
    PageNumber,
  } = await import("docx");

  const model = buildSheetModel(board, options);
  const isPortrait = options.orientation === "portrait";

  const fontName = options.font === "Serif" ? "Georgia" : options.font === "Mono" ? "Consolas" : "Arial";

  const children: (Paragraph | Table)[] = [];

  // En-tête
  if (options.showTitle) {
    children.push(
      new Paragraph({
        text: board.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    );
  }

  if (options.showDates) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: model.subtitle,
            italics: true,
            color: "666666",
            size: 20,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      })
    );
  }

  if (model.month) {
    // Tableau Word Mensuel (Point E-5g)
    const { weekdays, cells } = model.month;
    const headerRow = new TableRow({
      tableHeader: true,
      children: weekdays.map(
        (day) =>
          new TableCell({
            width: { size: 100 / 7, type: WidthType.PERCENTAGE },
            shading: { fill: "F3F1F8" },
            children: [
              new Paragraph({
                children: [new TextRun({ text: day, bold: true, size: 18 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          })
      ),
    });

    const rows: TableRow[] = [headerRow];
    const rowCount = cells.length / 7;

    for (let r = 0; r < rowCount; r++) {
      const cellCols: TableCell[] = [];
      for (let c = 0; c < 7; c++) {
        const cell = cells[r * 7 + c];
        if (cell.dayNumber === null) {
          cellCols.push(
            new TableCell({
              width: { size: 100 / 7, type: WidthType.PERCENTAGE },
              shading: { fill: "FAF9FC" },
              children: [new Paragraph({})],
            })
          );
        } else {
          const paras: Paragraph[] = [
            new Paragraph({
              children: [new TextRun({ text: String(cell.dayNumber), bold: true, size: 18, color: "555555" })],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 40 },
            }),
          ];

          for (const ev of cell.events) {
            paras.push(
              new Paragraph({
                children: [
                  ...(options.showTimes ? [new TextRun({ text: `${ev.start} `, size: 14, bold: true })] : []),
                  new TextRun({ text: ev.title, size: 15 }),
                ],
                spacing: { after: 30 },
              })
            );
          }

          cellCols.push(
            new TableCell({
              width: { size: 100 / 7, type: WidthType.PERCENTAGE },
              children: paras,
            })
          );
        }
      }
      rows.push(new TableRow({ children: cellCols }));
    }

    children.push(
      new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  } else {
    // Tableau Word Hebdomadaire structuré (Point E-5d)
    const headerRow = new TableRow({
      tableHeader: true,
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

    // Lignes par tranche horaire
    const rows: TableRow[] = [headerRow];
    const { hourStart, hourEnd, hours } = model;

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
          const detail = [ev.location, ev.teacher].filter(Boolean).join(" · ");
          paras.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${ev.title} `, bold: true, size: 16 }),
                ...(options.showTimes ? [new TextRun({ text: `(${ev.start}–${ev.end})`, size: 14, color: "777777" })] : []),
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

    children.push(
      new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
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
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
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
  const pixelRatio = target ? Math.max(1, target.w / (node.offsetWidth || 1)) : 3;

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
