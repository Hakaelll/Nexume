import { useEffect, useState } from "react";
import { useApp } from "../app/store";
export function useReducedMotion() {
  const preferences = useApp((state) => state.data.preferences);
  const [system, setSystem] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystem(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return preferences.motionMode === "full"
    ? false
    : preferences.motionMode === "reduced" ||
        preferences.reducedMotion ||
        system;
}
