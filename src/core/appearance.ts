import { useEffect, useLayoutEffect, useState } from "react";
import { useApp } from "../app/store";
import { resolveLanguage, setLanguage } from "./i18n";
export function useAppearance() {
  const preference = useApp((s) => s.data.preferences.language);
  const theme = useApp((s) => s.data.preferences.theme);
  const [systemLanguage, setSystemLanguage] = useState(
    () => navigator.language,
  );
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => setSystemDark(media.matches);
    const updateLanguage = () => setSystemLanguage(navigator.language);
    media.addEventListener("change", updateTheme);
    window.addEventListener("languagechange", updateLanguage);
    return () => {
      media.removeEventListener("change", updateTheme);
      window.removeEventListener("languagechange", updateLanguage);
    };
  }, []);
  const language = resolveLanguage(preference, systemLanguage);
  const resolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;
  useLayoutEffect(() => {
    setLanguage(language);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.lang = language;
  }, [resolvedTheme, language]);
  return { language, theme: resolvedTheme };
}
