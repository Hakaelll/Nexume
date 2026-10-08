import { useSyncExternalStore } from "react";
import { spanish } from "./translations";
export type Language = "es" | "en";
let currentLanguage: Language = resolveLanguage("system");
const listeners = new Set<() => void>();
export function setLanguage(language: Language) {
  if (currentLanguage === language) return;
  currentLanguage = language;
  listeners.forEach((listener) => listener());
}
export function resolveLanguage(
  value: "es" | "en" | "system",
  system = typeof navigator === "undefined" ? "en" : navigator.language,
): Language {
  return value === "system"
    ? system.toLowerCase().startsWith("es")
      ? "es"
      : "en"
    : value;
}
export function translate(
  key: string,
  language: Language,
  values?: Record<string, string | number>,
) {
  if (language === "en" && !values) return key;
  const matched =
    language === "es" ? prefix.find((p) => key.startsWith(p)) : undefined;
  let text =
    language === "es"
      ? (spanish[key] ??
        (matched
          ? (spanish[matched] ?? matched) + key.slice(matched.length)
          : key))
      : key;
  if (language === "es" && text === key) {
    text = text
      .replace(
        /^(\d+) episodes? fit in (\d+) minutes$/,
        "$1 episodios caben en $2 minutos",
      )
      .replace(
        /^The full movie fits in (\d+) minutes$/,
        "La película completa cabe en $1 minutos",
      )
      .replace(/^Last watched (.+)$/, "Última vez visto: $1")
      .replace(
        /^You marked it (.+)$/,
        (_, priority: string) =>
          "Prioridad: " + (spanish[priority] ?? priority),
      );
  }
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    String(values[name] ?? match),
  );
}
export function t(key: string, values?: Record<string, string | number>) {
  return translate(key, currentLanguage, values);
}
const prefix = [
  "Changes were not saved.",
  "Preferences were not saved.",
  "Could not open your collection.",
];
const subscribeLanguage = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getLanguage = () => currentLanguage;
const getServerLanguage = () => "en" as const;
export function useLanguage() {
  return useSyncExternalStore(
    subscribeLanguage,
    getLanguage,
    getServerLanguage,
  );
}
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(currentLanguage, options).format(
    new Date(date),
  );
}
