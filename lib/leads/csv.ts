import type { Lead } from "./schema";

const COLUMNS: [header: string, value: (l: Lead) => string][] = [
  ["Received", (l) => l.createdAt],
  ["Status", (l) => l.status],
  ["Name", (l) => l.name],
  ["Email", (l) => l.email],
  ["Type of job", (l) => l.jobType],
  ["Where and when", (l) => l.whereWhen],
  ["Message", (l) => l.message],
  ["Notes", (l) => l.notes],
  ["Source", (l) => l.source],
];

/**
 * One CSV cell. Every lead field was typed by a stranger into the contact form, and a spreadsheet
 * runs anything that starts with = + - @ (or a tab/CR ahead of one) as a formula, so those get a
 * leading apostrophe first. Then the usual quoting.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** With a BOM, so Excel opens it as UTF-8 and names in Devanagari or with accents survive. */
export function leadsToCsv(leads: Lead[]): string {
  const lines = [COLUMNS.map(([h]) => h), ...leads.map((l) => COLUMNS.map(([, v]) => v(l)))];
  return "﻿" + lines.map((cells) => cells.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
