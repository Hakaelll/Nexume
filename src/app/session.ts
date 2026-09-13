import { create } from "zustand";
import { useApp } from "./store";

export interface RecommendContext {
  source: "Watchlist" | "Library";
  genre: string;
  guided: boolean;
  intent: "continue" | "start";
}
// Deliberately separate from persisted collection data and backups.
export const useSession = create<{
  recommend: (RecommendContext & { revision: number }) | null;
}>(() => ({ recommend: null }));
export function openRecommend(context: RecommendContext) {
  useSession.setState({
    recommend: {
      ...context,
      revision: (useSession.getState().recommend?.revision ?? 0) + 1,
    },
  });
  void useApp.getState().prefs({ section: "Recommend" });
}
