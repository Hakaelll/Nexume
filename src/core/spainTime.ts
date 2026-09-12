export const SPAIN_TIME_ZONE = "Europe/Madrid";

export function spainTime(timestamp: number) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: SPAIN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);
}

// Resolve both local midnights independently: DST days can be 23 or 25 hours.
export function spainDayRange(timestamp: number): [Date, Date] {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SPAIN_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(timestamp);
  const part = (name: string) =>
    Number(parts.find((p) => p.type === name)!.value);
  const midnight = Date.UTC(part("year"), part("month") - 1, part("day"));
  const resolve = (wallTime: number) => {
    let instant = wallTime;
    for (let i = 0; i < 3; i++) {
      const offset = new Intl.DateTimeFormat("en-US", {
        timeZone: SPAIN_TIME_ZONE,
        timeZoneName: "shortOffset",
      })
        .formatToParts(instant)
        .find((p) => p.type === "timeZoneName")!.value;
      const hours = Number(offset.replace("GMT", ""));
      instant = wallTime - hours * 3600000;
    }
    return new Date(instant);
  };
  return [resolve(midnight), resolve(midnight + 86400000)];
}
