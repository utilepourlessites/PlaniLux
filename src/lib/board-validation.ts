import type { BoardKind, ScheduleEvent } from "./planner-types";

export const BOARD_KINDS: readonly BoardKind[] = ["school", "weekly", "monthly", "daily", "blank"];
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MAX_EVENTS = 2000;
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
const COLOR_REGEX = /^#[0-9a-f]{3,8}$/i;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export function isValidDateString(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function parseTimeMinutes(timeStr: string): number | null {
  const match = TIME_REGEX.exec(timeStr);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h * 60 + m;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(source: Record<string, unknown>, key: string, max: number): Result<string | undefined> {
  const value = source[key];
  if (value === undefined || value === null || value === "") return { ok: true, value: undefined };
  if (typeof value !== "string" || value.length > max) return fail(`Champ « ${key} » invalide.`);
  return { ok: true, value };
}

export function validateEvent(input: unknown): Result<ScheduleEvent> {
  if (!isRecord(input)) return fail("Événement invalide.");
  const { id, title, day, start, end, color } = input;
  if (typeof id !== "string" || id.length < 1 || id.length > 64) return fail("Identifiant d'événement invalide.");
  if (typeof title !== "string" || title.length > 200) return fail("Titre d'événement invalide.");
  if (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 400) return fail("Jour d'événement invalide.");

  if (typeof start !== "string") return fail("Heure de début invalide.");
  const startMin = parseTimeMinutes(start);
  if (startMin === null) return fail("Heure de début invalide (format attendu HH:MM entre 00:00 et 23:59).");

  if (typeof end !== "string") return fail("Heure de fin invalide.");
  const endMin = parseTimeMinutes(end);
  if (endMin === null) return fail("Heure de fin invalide (format attendu HH:MM entre 00:00 et 23:59).");

  if (endMin <= startMin) return fail("L'heure de fin doit être strictement postérieure à l'heure de début.");

  if (typeof color !== "string" || color.length < 1 || color.length > 40) return fail("Couleur d'événement invalide.");

  const event: ScheduleEvent = { id, title, day, start, end, color };
  const limits: Array<["date" | "location" | "teacher" | "notes" | "validFrom" | "validTo", number]> = [
    ["date", 32], ["location", 200], ["teacher", 200], ["notes", 2000], ["validFrom", 32], ["validTo", 32],
  ];
  for (const [key, max] of limits) {
    const parsed = optionalString(input, key, max);
    if (!parsed.ok) return parsed;
    if (parsed.value !== undefined) event[key] = parsed.value;
  }

  if (event.date !== undefined && !isValidDateString(event.date)) {
    return fail("Date d'événement invalide (format attendu YYYY-MM-DD).");
  }
  if (event.validFrom !== undefined && !isValidDateString(event.validFrom)) {
    return fail("Date de début de validité invalide (format attendu YYYY-MM-DD).");
  }
  if (event.validTo !== undefined && !isValidDateString(event.validTo)) {
    return fail("Date de fin de validité invalide (format attendu YYYY-MM-DD).");
  }
  if (event.validFrom && event.validTo && event.validFrom > event.validTo) {
    return fail("La date de début de validité doit être antérieure ou égale à la date de fin.");
  }

  if (input.recurrence !== undefined && input.recurrence !== null) {
    if (input.recurrence !== "weekly" && input.recurrence !== "none") return fail("Récurrence invalide.");
    event.recurrence = input.recurrence;
  }
  return { ok: true, value: event };
}

export function validateProfileUpdate(input: unknown): Result<{ displayName?: string; workspaceName?: string }> {
  if (!isRecord(input)) return fail("Données de profil invalides.");
  const result: { displayName?: string; workspaceName?: string } = {};
  if (input.displayName !== undefined) {
    if (typeof input.displayName !== "string" || input.displayName.length > 60) {
      return fail("Le nom d'affichage ne doit pas dépasser 60 caractères.");
    }
    result.displayName = input.displayName.trim();
  }
  if (input.workspaceName !== undefined) {
    if (typeof input.workspaceName !== "string" || input.workspaceName.length > 60) {
      return fail("Le nom de l'espace ne doit pas dépasser 60 caractères.");
    }
    result.workspaceName = input.workspaceName.trim();
  }
  return { ok: true, value: result };
}

export function validateEvents(input: unknown): Result<ScheduleEvent[]> {

  if (!Array.isArray(input)) return fail("La liste d'événements est invalide.");
  if (input.length > MAX_EVENTS) return fail(`Un tableau ne peut pas dépasser ${MAX_EVENTS} événements.`);
  const events: ScheduleEvent[] = [];
  for (const item of input) {
    const parsed = validateEvent(item);
    if (!parsed.ok) return parsed;
    events.push(parsed.value);
  }
  return { ok: true, value: events };
}

export type BoardCreateInput = {
  id?: string;
  title: string;
  kind: BoardKind;
  color: string;
  events: ScheduleEvent[];
  favorite: boolean;
};

export function validateBoardCreate(body: unknown): Result<BoardCreateInput> {
  if (!isRecord(body)) return fail("Requête invalide.");
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 1 || title.length > 100) return fail("Le titre doit contenir de 1 à 100 caractères.");
  if (typeof body.kind !== "string" || !BOARD_KINDS.includes(body.kind as BoardKind)) return fail("Modèle de tableau invalide.");
  const color = body.color === undefined ? "#c6b8f5" : body.color;
  if (typeof color !== "string" || !COLOR_REGEX.test(color)) return fail("Couleur de tableau invalide.");
  const events = validateEvents(body.events === undefined ? [] : body.events);
  if (!events.ok) return events;
  const id = typeof body.id === "string" && UUID_REGEX.test(body.id) ? body.id : undefined;
  return {
    ok: true,
    value: { ...(id ? { id } : {}), title, kind: body.kind as BoardKind, color, events: events.value, favorite: body.favorite === true },
  };
}

export type BoardPatchInput = Partial<{
  title: string; kind: BoardKind; color: string; events: ScheduleEvent[]; favorite: boolean; isDeleted: boolean;
}>;

export function validateBoardPatch(body: unknown): Result<BoardPatchInput> {
  if (!isRecord(body)) return fail("Requête invalide.");
  const patch: BoardPatchInput = {};
  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length < 1 || title.length > 100) return fail("Le titre doit contenir de 1 à 100 caractères.");
    patch.title = title;
  }
  if (body.kind !== undefined) {
    if (typeof body.kind !== "string" || !BOARD_KINDS.includes(body.kind as BoardKind)) return fail("Modèle de tableau invalide.");
    patch.kind = body.kind as BoardKind;
  }
  if (body.color !== undefined) {
    if (typeof body.color !== "string" || !COLOR_REGEX.test(body.color)) return fail("Couleur de tableau invalide.");
    patch.color = body.color;
  }
  if (body.events !== undefined) {
    const events = validateEvents(body.events);
    if (!events.ok) return events;
    patch.events = events.value;
  }
  if (body.favorite !== undefined) {
    if (typeof body.favorite !== "boolean") return fail("Champ « favorite » invalide.");
    patch.favorite = body.favorite;
  }
  if (body.isDeleted !== undefined) {
    if (typeof body.isDeleted !== "boolean") return fail("Champ « isDeleted » invalide.");
    patch.isDeleted = body.isDeleted;
  }
  return { ok: true, value: patch };
}
