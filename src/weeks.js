// -----------------------------------------------------------------------------
// ISO weeks as the Sentinelles network numbers them: YYYYWW (202643 = week 43
// of ISO year 2026, Monday 19 to Sunday 25 October 2026). Pure calendar
// arithmetic in UTC: no time zone, no clock.
// -----------------------------------------------------------------------------

const DAY = 24 * 3600 * 1000;
const LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

/** The Monday (UTC midnight, ms) of an ISO week YYYYWW. */
export function mondayOf(week) {
  const year = Math.floor(week / 100);
  const number = week % 100;
  // 4 January is always in week 1.
  const jan4 = Date.UTC(year, 0, 4);
  const jan4Day = (new Date(jan4).getUTCDay() + 6) % 7; // 0 = Monday
  return jan4 - jan4Day * DAY + (number - 1) * 7 * DAY;
}

/** "43 (19 – 25 Oct 2026)": the week number and its days. */
export function weekText(week, language) {
  const locale = LOCALES[language] ?? LOCALES.en;
  const monday = new Date(mondayOf(week));
  const sunday = new Date(mondayOf(week) + 6 * DAY);
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' });
  const full = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  let start = day.format(monday);
  if (monday.getUTCFullYear() !== sunday.getUTCFullYear()) {
    start = full.format(monday);
  } else if (monday.getUTCMonth() !== sunday.getUTCMonth()) {
    start = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(monday);
  }
  return `${week % 100} (${start} – ${full.format(sunday)})`;
}
