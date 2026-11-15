import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { UUID_REGEX } from "@/lib/board-validation";
import { rowToBoard, type BoardRow } from "@/lib/board-mapper";
import { safeName } from "@/lib/sheet-layout";
import type { ScheduleEvent } from "@/lib/planner-types";

export const dynamic = "force-dynamic";

const BY_DAY_MAP = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

export function getCalendarSigningKey(): string {
  const secret = process.env.CALENDAR_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Clé secrète de calendrier non configurée (CALENDAR_SIGNING_SECRET ou SUPABASE_SERVICE_ROLE_KEY requis).");
  }
  return secret;
}

export function generateCalendarToken(boardId: string): string {
  return createHmac("sha256", getCalendarSigningKey()).update(`cal:${boardId}`).digest("hex").slice(0, 24);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatIcsDateTime(date: Date, timeStr?: string): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  if (timeStr) {
    const [hh, mm] = timeStr.split(":").map((v) => pad2(parseInt(v, 10) || 0));
    return `${y}${m}${d}T${hh}${mm}00`;
  }
  return `${y}${m}${d}`;
}

function formatUtcTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function cleanIcsText(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function getMondayOfWeek(refDate: Date): Date {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getFirstOccurrenceDate(dayOffset: number, validFrom?: string, refDate?: Date): Date {
  if (validFrom && /^\d{4}-\d{2}-\d{2}$/.test(validFrom)) {
    const [y, m, d] = validFrom.split("-").map(Number);
    const startDate = new Date(y, m - 1, d, 0, 0, 0, 0);
    const currentDayOfWeek = (startDate.getDay() + 6) % 7; // Lundi=0..Dimanche=6
    const daysToAdd = (dayOffset - currentDayOfWeek + 7) % 7;
    startDate.setDate(startDate.getDate() + daysToAdd);
    return startDate;
  }
  const monday = getMondayOfWeek(refDate || new Date());
  const target = new Date(monday);
  target.setDate(monday.getDate() + dayOffset);
  return target;
}

export function buildIcsContent(
  boardTitle: string,
  events: ScheduleEvent[],
  isMonthly: boolean,
  options?: { now?: Date }
): string {
  const now = options?.now || new Date();
  const dtStamp = formatUtcTimestamp(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlaniLux//Emploi du Temps FR//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${cleanIcsText(boardTitle)} - PlaniLux`,
    "X-WR-TIMEZONE:Europe/Paris",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Paris",
    "X-LIC-LOCATION:Europe/Paris",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const event of events) {
    let dtStart = "";
    let dtEnd = "";
    let rrule = "";

    if (isMonthly && event.date) {
      const [y, m, d] = event.date.split("-").map((v) => parseInt(v, 10));
      const eventDate = new Date(y, (m || 1) - 1, d || 1);
      dtStart = formatIcsDateTime(eventDate, event.start);
      dtEnd = formatIcsDateTime(eventDate, event.end);

      if (event.recurrence === "weekly") {
        const dayOfWeek = (eventDate.getDay() + 6) % 7;
        const byDay = BY_DAY_MAP[dayOfWeek] || "MO";
        rrule = `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`;
        if (event.validTo) {
          const [vy, vm, vd] = event.validTo.split("-").map(Number);
          const untilDate = new Date(Date.UTC(vy, vm - 1, vd, 23, 59, 59));
          rrule += `;UNTIL=${formatUtcTimestamp(untilDate)}`;
        }
      }
    } else {
      const dayOffset = typeof event.day === "number" ? Math.min(Math.max(0, event.day), 6) : 0;
      const targetDate = getFirstOccurrenceDate(dayOffset, event.validFrom, now);
      dtStart = formatIcsDateTime(targetDate, event.start);
      dtEnd = formatIcsDateTime(targetDate, event.end);

      // Sémantique de récurrence : hebdomadaire par défaut sauf si explicitement "none"
      if (event.recurrence !== "none") {
        const byDay = BY_DAY_MAP[dayOffset] || "MO";
        rrule = `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`;
        if (event.validTo) {
          const [vy, vm, vd] = event.validTo.split("-").map(Number);
          const untilDate = new Date(Date.UTC(vy, vm - 1, vd, 23, 59, 59));
          rrule += `;UNTIL=${formatUtcTimestamp(untilDate)}`;
        }
      }
    }

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@planilux.local`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;TZID=Europe/Paris:${dtStart}`,
      `DTEND;TZID=Europe/Paris:${dtEnd}`,
      ...(rrule ? [rrule] : []),
      `SUMMARY:${cleanIcsText(event.title || "Sans titre")}`,
      `DESCRIPTION:${cleanIcsText(
        [
          event.teacher ? `Intervenant : ${event.teacher}` : "",
          event.location ? `Lieu : ${event.location}` : "",
          event.notes ? `Note : ${event.notes}` : "",
        ]
          .filter(Boolean)
          .join(" | ")
      )}`,
      ...(event.location ? [`LOCATION:${cleanIcsText(event.location)}`] : []),
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return new NextResponse("Identifiant invalide", { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) {
      return new NextResponse("Token de calendrier manquant.", { status: 403 });
    }

    let expectedToken: string;
    try {
      expectedToken = generateCalendarToken(id);
    } catch {
      return new NextResponse("Configuration serveur de sécurité manquante pour le calendrier.", { status: 500 });
    }

    if (token !== expectedToken) {
      return new NextResponse("Token de calendrier invalide.", { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return new NextResponse("Configuration Supabase manquante (SUPABASE_SERVICE_ROLE_KEY requis).", { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabaseAdmin
      .from("planner_boards")
      .select("*")
      .eq("id", id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error || !data) {
      return new NextResponse("Tableau introuvable", { status: 404 });
    }

    const board = rowToBoard(data as BoardRow);
    const icsString = buildIcsContent(board.title, board.events, board.kind === "monthly");
    const filename = `${safeName(board.title)}.ics`;

    return new NextResponse(icsString, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    console.error("Erreur génération ICS:", err);
    return new NextResponse("Erreur interne lors de la génération du flux ICS", { status: 500 });
  }
}
