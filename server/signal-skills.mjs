import { searchGlobalNewsEvidence } from "./evidence.mjs";
import { GonkaError } from "./gonka.mjs";

export const SIGNAL_HISTORY_DAYS = 30;
export const SIGNAL_COVERAGE_DAYS = 7;

function shiftUtcDate(date, amount) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function resolveSignalDate(rawDate, now = new Date()) {
  const maxDate = now.toISOString().slice(0, 10);
  const minDate = shiftUtcDate(maxDate, -(SIGNAL_HISTORY_DAYS - 1));
  const selectedDate = rawDate || maxDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) || Number.isNaN(Date.parse(`${selectedDate}T00:00:00.000Z`))) {
    throw new GonkaError("Choose a valid signal date.", { status: 400, code: "INVALID_SIGNAL_DATE" });
  }
  if (selectedDate < minDate || selectedDate > maxDate) {
    throw new GonkaError(`Signal dates must be between ${minDate} and ${maxDate}.`, { status: 400, code: "SIGNAL_DATE_OUT_OF_RANGE" });
  }
  return {
    selectedDate,
    minDate,
    maxDate,
    timezone: "UTC",
    historyDays: SIGNAL_HISTORY_DAYS,
    coverageStart: shiftUtcDate(selectedDate, -(SIGNAL_COVERAGE_DAYS - 1)),
    coverageEnd: selectedDate,
    coverageDays: SIGNAL_COVERAGE_DAYS,
  };
}

export async function runGlobalPublicScanSkill(topic, calendar, options = {}) {
  const search = options.searchGlobalNewsEvidence || searchGlobalNewsEvidence;
  const sources = await search(topic.queries, calendar.selectedDate, {
    limit: options.limit || 16,
    signal: options.signal,
    fetchImpl: options.fetchImpl,
    startDate: calendar.coverageStart,
    endDateExclusive: shiftUtcDate(calendar.selectedDate, 1),
  });
  return sources.filter((source) => {
    if (!source.publishedAt) return false;
    const published = new Date(source.publishedAt);
    if (Number.isNaN(published.getTime())) return false;
    const publishedDate = published.toISOString().slice(0, 10);
    return publishedDate >= calendar.coverageStart && publishedDate <= calendar.coverageEnd;
  });
}
