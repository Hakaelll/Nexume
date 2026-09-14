export function localTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function localTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

// Resolve each midnight in the device timezone; DST days need not be 24 hours.
export function localDayRange(timestamp: number): [Date, Date] {
  const date = new Date(timestamp);
  return [
    new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
  ];
}
