import { useEffect, useState } from "react";
import { useApp } from "../app/store";
export function useReducedMotion() {
  const motionMode = useApp((state) => state.data.preferences.motionMode);
  const reducedMotion = useApp((state) => state.data.preferences.reducedMotion);
  const [system, setSystem] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystem(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return motionMode === "full"
    ? false
    : motionMode === "reduced" || reducedMotion || system;
}
