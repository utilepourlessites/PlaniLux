import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { UUID_REGEX } from "@/lib/board-validation";
import { rowToBoard, type BoardRow } from "@/lib/board-mapper";
import { safeName } from "@/lib/sheet-layout";
import type { ScheduleEvent } from "@/lib/planner-types";

export const dynamic = "force-dynamic";

const BY_DAY_MAP = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

function getSecretKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "planilux-default-salt";
}

export function generateCalendarToken(boardId: string): string {
  return createHmac("sha256", getSecretKey()).update(`cal:${boardId}`).digest("hex").slice(0, 24);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatIcsDate(date: Date, timeStr?: string): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  if (timeStr) {
    const [hh, mm] = timeStr.split(":").map((v) => pad2(parseInt(v, 10) || 0));
    return `${y}${m}${d}T${hh}${mm}00`;
  }
  return `${y}${m}${d}`;
}

function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function cleanIcsText(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildIcsContent(boardTitle: string, events: ScheduleEvent[], isMonthly: boolean): string {
  const monday = getMondayOfCurrentWeek();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlaniLux//Emploi du Temps FR//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${cleanIcsText(boardTitle)} - PlaniLux`,
    "X-WR-TIMEZONE:Europe/Paris",
  ];

  for (const event of events) {
    let dtStart = "";
    let dtEnd = "";
    let rrule = "";

    if (isMonthly && event.date) {
      const [y, m, d] = event.date.split("-").map((v) => parseInt(v, 10));
      const eventDate = new Date(y, (m || 1) - 1, d || 1);
      dtStart = formatIcsDate(eventDate, event.start);
      dtEnd = formatIcsDate(eventDate, event.end);
    } else {
      const dayOffset = typeof event.day === "number" ? event.day : 0;
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + dayOffset);
      dtStart = formatIcsDate(targetDate, event.start);
      dtEnd = formatIcsDate(targetDate, event.end);
      const byDay = BY_DAY_MAP[dayOffset] || "MO";
      rrule = `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`;
    }

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@planilux.local`,
      `DTSTAMP:${formatIcsDate(new Date())}T000000Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
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
    const expectedToken = generateCalendarToken(id);

    // Validation du token de securite pour l'acces distant (Google Agenda, Apple Calendar)
    if (token !== expectedToken) {
      return new NextResponse("Token de calendrier invalide ou manquant.", { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      return new NextResponse("Configuration Supabase manquante", { status: 500 });
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
