// Live availability context for both iNoah twins.
//
// Reuses the same FastAPI endpoints the booking page calls, so availability
// comes from the one place that already merges the availability profile with
// Google Calendar busy time. Note the apex domain 308-redirects to www.
const SCHEDULING_API = "https://www.noahiberman.com";
const SCHEDULING_TZ = "America/Denver";
const CALENDAR_DAYS = 10;
const CALENDAR_MAX_SLOTS = 8;
const CALENDAR_SLOTS_PER_DAY = 2; // spread across days, not 8 in one morning
const CALENDAR_TIMEOUT_MS = 6000;

/** Only spend the round-trip when the question is actually about meeting. */
export const CALENDAR_INTENT =
  /\b(schedul\w*|meet\w*|book\w*|booking|appointment|avail\w*|calendar|free|busy|when can|what time|time slot|slot|call|coffee|chat with you|catch up)\b/i;

interface MeetingType {
  slug: string;
  name: string;
  duration_min: number;
  location_type: string;
  description?: string;
}

const USAGE_GUIDANCE =
  "Use these when asked about meeting, scheduling or availability: quote only times listed above, say they are Mountain Time, and point to the booking link so the guest confirms it themselves. Never invent times, and never claim to have booked anything — you cannot book on someone's behalf.";

const fmtSlot = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: SCHEDULING_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

async function getJson<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALENDAR_TIMEOUT_MS);
  try {
    const res = await fetch(`${SCHEDULING_API}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`Calendar fetch ${path} -> ${res.status}`);
      return null;
    }
    return await res.json() as T;
  } catch (e) {
    console.error(`Calendar fetch ${path} failed:`, e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface CalendarContextOptions {
  /** How the calendar is described to the model ("Noah's calendar" for the public twin). */
  calendarLabel: string;
  /** Public twin only: the quoting rules a stranger-facing answer needs. */
  includeUsageGuidance: boolean;
}

/**
 * Real bookable availability, rendered for the model. Returns "" on any
 * failure so a scheduling outage degrades to iNoah simply not quoting times,
 * rather than breaking the whole answer.
 */
export async function fetchCalendarContext(
  options: CalendarContextOptions,
): Promise<string> {
  const typesPayload = await getJson<{ meeting_types?: MeetingType[] }>(
    "/scheduling/meeting-types",
  );
  const types: MeetingType[] = typesPayload?.meeting_types ?? [];
  if (types.length === 0) return "";

  const today = new Date().toLocaleDateString("en-CA", { timeZone: SCHEDULING_TZ });
  const blocks = await Promise.all(
    types.map(async (t) => {
      const data = await getJson<{ slots?: { start: string }[] }>(
        `/scheduling/slots/${encodeURIComponent(t.slug)}?start_date=${today}&days=${CALENDAR_DAYS}`,
      );
      const slots: { start: string }[] = data?.slots ?? [];
      // Sample across days rather than taking the first N: a full open day
      // yields 8 consecutive morning slots, so "are you free next week?"
      // would only ever surface today.
      const perDay = new Map<string, string[]>();
      for (const s of slots) {
        const day = new Date(s.start).toLocaleDateString("en-CA", { timeZone: SCHEDULING_TZ });
        const bucket = perDay.get(day) ?? [];
        if (bucket.length < CALENDAR_SLOTS_PER_DAY) bucket.push(s.start);
        perDay.set(day, bucket);
      }
      const shown = [...perDay.values()]
        .flat()
        .slice(0, CALENDAR_MAX_SLOTS)
        .map(fmtSlot);
      const url = `${SCHEDULING_API}/book/${t.slug}`;
      const label = `- ${t.name} (${t.duration_min} min, ${t.location_type})`;
      if (shown.length === 0) {
        return `${label} — nothing open in the next ${CALENDAR_DAYS} days. Book: ${url}`;
      }
      return `${label} — next openings: ${shown.join("; ")}. Book: ${url}`;
    }),
  );

  const header = `CURRENT AVAILABILITY (live from ${options.calendarLabel}, times in Mountain Time, generated ${fmtSlot(new Date().toISOString())}):`;
  const body = `${header}\n${blocks.join("\n")}`;
  return options.includeUsageGuidance ? `${body}\n\n${USAGE_GUIDANCE}` : body;
}
