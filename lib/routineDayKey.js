export function getRoutineDayKey(timeZone = "Africa/Lagos", date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const localDate = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
  const routineDate = localDate - (Number(values.hour) < 6 ? 86_400_000 : 0);
  return new Date(routineDate).toISOString().slice(0, 10);
}
