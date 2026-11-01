import { jsPDF } from "jspdf";
import { Document, HeadingLevel, PageOrientation, Packer, Paragraph, TextRun } from "docx";
import { toPng } from "html-to-image";
import type { PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

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

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function orderedEvents(events: ScheduleEvent[]) {
  return [...events].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
}

function splitColor(color: string): [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1] ?? "e8e5ff";
  return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)];
}

export function downloadPdf(board: PlannerBoard, options: ExportOptions) {
  const isWallpaper = options.format === "phone" || options.format === "desktop";
  const isPortrait = options.format === "phone" || (options.format !== "desktop" && options.orientation === "portrait");
  const doc = new jsPDF({
    orientation: isPortrait ? "portrait" : "landscape",
    unit: "mm",
    format: options.format === "letter" ? "letter" : options.format === "phone" ? [90, 160] : options.format === "desktop" ? [160, 90] : "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = isWallpaper ? 8 : 13;
  const top = options.showTitle ? (isWallpaper ? 22 : 32) : (isWallpaper ? 13 : 18);
  const bottom = pageHeight - margin;
  const gridHeight = bottom - top - (isWallpaper ? 10 : 8);
  const columnCount = isWallpaper && options.format === "phone" ? 1 : 7;
  const gap = isWallpaper && options.format === "phone" ? 4 : 1.4;
  const colWidth = (pageWidth - margin * 2 - gap * (columnCount - 1)) / columnCount;
  const font = options.font === "Serif" ? "times" : options.font === "Mono" ? "courier" : "helvetica";
  doc.setFont(font, "normal");

  if (options.whiteBackground) {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
  }
  if (options.showTitle) {
    doc.setTextColor(36, 40, 53);
    doc.setFont(font, "bold");
    doc.setFontSize(isWallpaper ? 15 : 20);
    doc.text(board.title, margin, isWallpaper ? 13 : 18, { maxWidth: pageWidth - margin * 2 });
    if (options.showDates) {
      doc.setFont(font, "normal");
      doc.setFontSize(isWallpaper ? 6 : 8);
      doc.setTextColor(130, 132, 142);
      const sub = board.kind === "monthly"
        ? "PLANNING MENSUEL · VUE D’ENSEMBLE"
        : (options.format === "phone" ? "TON PLANNING · CETTE SEMAINE" : "SEMAINE · PLANNING PERSONNEL");
      doc.text(sub, margin, isWallpaper ? 18 : 24);
    }
  }
  if (options.showLogo) {
    doc.setFont(font, "bold");
    doc.setFontSize(isWallpaper ? 6 : 8);
    doc.setTextColor(140, 126, 186);
    doc.text("PlaniLux", pageWidth - margin, isWallpaper ? 13 : 18, { align: "right" });
  }

  const eventForDay = (day: number) => orderedEvents(board.events.filter((event) => event.day === day));
  if (board.kind === "monthly") {
    const eventsWithDate = [...board.events].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.start.localeCompare(b.start));
    let curY = top;
    const lineHeight = 6.5;
    doc.setFontSize(8);
    let lastDate = "";
    for (const event of eventsWithDate) {
      if (curY > pageHeight - margin - 10) {
        doc.addPage();
        curY = margin + 10;
      }
      if (event.date && event.date !== lastDate) {
        lastDate = event.date;
        curY += 2;
        doc.setFont(font, "bold");
        doc.setFontSize(8);
        doc.setTextColor(82, 77, 98);
        let dateLabel = event.date;
        try {
          dateLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(event.date + "T00:00:00"));
          dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
        } catch { /* use raw date */ }
        doc.text(dateLabel, margin, curY);
        curY += 4.5;
      }
      const [red, green, blue] = options.whiteBackground ? [248, 247, 252] : splitColor(event.color);
      doc.setFillColor(red, green, blue);
      doc.roundedRect(margin, curY - 3, pageWidth - margin * 2, 5.8, 1, 1, "F");
      doc.setFont(font, "bold");
      doc.setFontSize(7);
      doc.setTextColor(43, 45, 55);
      const timeStr = options.showTimes ? `${event.start}–${event.end}  ` : "";
      doc.text(`${timeStr}${event.title}`, margin + 3, curY + 1, { maxWidth: pageWidth - margin * 2 - 6 });
      curY += lineHeight;
    }
    if (board.events.length === 0) {
      doc.setFont(font, "normal");
      doc.setFontSize(9);
      doc.setTextColor(130, 132, 142);
      doc.text("Aucun créneau planifié ce mois-ci.", margin, curY + 5);
    }
  } else if (columnCount === 1) {
    const perDay = gridHeight / 7;
    for (let day = 0; day < 7; day++) {
      const y = top + day * perDay;
      doc.setFillColor(248, 247, 252);
      doc.roundedRect(margin, y, colWidth, perDay - 1.2, 2, 2, "F");
      doc.setFont(font, "bold");
      doc.setFontSize(7);
      doc.setTextColor(70, 66, 84);
      doc.text(days[day], margin + 3, y + 4);
      const list = eventForDay(day).slice(0, 3);
      const maxName = Math.max(16, colWidth - 24);
      list.forEach((event, index) => {
        const eventY = y + 7 + index * Math.min(7, (perDay - 8) / 3);
        const [red, green, blue] = options.whiteBackground ? [252, 252, 252] : splitColor(event.color);
        doc.setFillColor(red, green, blue);
        doc.roundedRect(margin + 2, eventY - 2.5, colWidth - 4, 5.7, 1.2, 1.2, "F");
        doc.setFont(font, "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(48, 48, 56);
        const time = options.showTimes ? `${event.start}  ` : "";
        doc.text(`${time}${event.title}`, margin + 4, eventY + 1, { maxWidth: maxName });
      });
    }
  } else {
    const hourHeight = gridHeight / 12;
    const dayWidth = colWidth;
    for (let day = 0; day < 7; day++) {
      const x = margin + day * (dayWidth + gap);
      doc.setFillColor(248, 247, 252);
      doc.roundedRect(x, top, dayWidth, gridHeight, 1.5, 1.5, "F");
      doc.setFont(font, "bold");
      doc.setFontSize(isWallpaper ? 5 : 7);
      doc.setTextColor(82, 77, 98);
      doc.text(days[day].slice(0, 3).toUpperCase(), x + dayWidth / 2, top - 2, { align: "center" });
      for (let hour = 1; hour < 12; hour++) {
        doc.setDrawColor(228, 227, 234);
        doc.setLineWidth(0.12);
        doc.line(x, top + hour * hourHeight, x + dayWidth, top + hour * hourHeight);
      }
      for (const event of eventForDay(day)) {
        const startMinutes = Math.max(480, event.start.split(":").map(Number).reduce((h, m) => h * 60 + m, 0));
        const endMinutes = Math.min(1200, event.end.split(":").map(Number).reduce((h, m) => h * 60 + m, 0));
        const eventY = top + ((startMinutes - 480) / 720) * gridHeight + 0.5;
        const eventHeight = Math.max(2.4, ((endMinutes - startMinutes) / 720) * gridHeight - 0.8);
        const [red, green, blue] = options.whiteBackground ? [255, 255, 255] : splitColor(event.color);
        doc.setFillColor(red, green, blue);
        doc.roundedRect(x + 0.8, eventY, dayWidth - 1.6, eventHeight, 1, 1, "F");
        doc.setFont(font, "bold");
        doc.setFontSize(isWallpaper ? 3.4 : 5.3);
        doc.setTextColor(43, 45, 55);
        doc.text(event.title, x + 1.5, eventY + Math.min(2.6, eventHeight - 0.4), { maxWidth: dayWidth - 3 });
        if (options.showTimes && eventHeight > 5) {
          doc.setFont(font, "normal");
          doc.setFontSize(isWallpaper ? 2.8 : 4.3);
          doc.text(`${event.start}–${event.end}`, x + 1.5, eventY + Math.min(5.3, eventHeight - 0.5), { maxWidth: dayWidth - 3 });
        }
      }
    }
  }
  doc.save(`${safeName(board.title)}.pdf`);
}

export async function downloadDocx(board: PlannerBoard, options: ExportOptions) {
  const children: Paragraph[] = [];
  if (options.showTitle) children.push(new Paragraph({ text: board.title, heading: HeadingLevel.TITLE }));
  if (options.showDates) children.push(new Paragraph({ text: `PlaniLux · ${board.kind === "monthly" ? "Planning mensuel" : "Planning de la semaine"}`, spacing: { after: 280 } }));

  if (board.kind === "monthly") {
    const eventsWithDate = [...board.events].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.start.localeCompare(b.start));
    const groupedByDate: Record<string, ScheduleEvent[]> = {};
    for (const event of eventsWithDate) {
      const key = event.date || "Date non définie";
      if (!groupedByDate[key]) groupedByDate[key] = [];
      groupedByDate[key].push(event);
    }
    for (const [dateStr, events] of Object.entries(groupedByDate)) {
      let formattedDate = dateStr;
      if (dateStr !== "Date non définie") {
        try {
          const d = new Date(dateStr + "T00:00:00");
          formattedDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
          formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        } catch {
          formattedDate = dateStr;
        }
      }
      children.push(new Paragraph({ text: formattedDate, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
      for (const event of events) {
        const prefix = options.showTimes ? `${event.start} – ${event.end}   ` : "";
        const details = [event.location, event.teacher].filter(Boolean).join(" · ");
        children.push(new Paragraph({ children: [new TextRun({ text: prefix, bold: options.showTimes }), new TextRun({ text: event.title }), ...(details ? [new TextRun({ text: `   ${details}`, italics: true, color: "777777" })] : [])], bullet: { level: 0 } }));
        if (event.notes) children.push(new Paragraph({ text: event.notes, indent: { left: 360 } }));
      }
    }
  } else {
    for (let day = 0; day < 7; day++) {
      const events = orderedEvents(board.events.filter((event) => event.day === day));
      if (!events.length) continue;
      children.push(new Paragraph({ text: days[day], heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
      for (const event of events) {
        const prefix = options.showTimes ? `${event.start} – ${event.end}   ` : "";
        const details = [event.location, event.teacher].filter(Boolean).join(" · ");
        children.push(new Paragraph({ children: [new TextRun({ text: prefix, bold: options.showTimes }), new TextRun({ text: event.title }), ...(details ? [new TextRun({ text: `   ${details}`, italics: true, color: "777777" })] : [])], bullet: { level: 0 } }));
        if (event.notes) children.push(new Paragraph({ text: event.notes, indent: { left: 360 } }));
      }
    }
  }
  if (children.length === 0 || (children.length <= 2 && board.events.length === 0)) children.push(new Paragraph({ text: "Aucun créneau planifié." }));
  const document = new Document({ sections: [{ properties: { page: { size: { orientation: options.orientation === "portrait" ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE } } }, children }] });
  const blob = await Packer.toBlob(document);
  saveBlob(blob, `${safeName(board.title)}.docx`);
}

export async function downloadPng(node: HTMLElement, board: PlannerBoard) {
  const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 3, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.download = `${safeName(board.title)}-PlaniLux.png`;
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

function safeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "planning";
}
