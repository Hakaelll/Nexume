import { createContext, useContext } from "react";

// A retained page can keep its state while suspending work behind a detail view.
export const PageActivity = createContext(true);
export const usePageActive = () => useContext(PageActivity);
