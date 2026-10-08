import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700-italic.css";
import "@fontsource/inter/900-italic.css";
import "./styles/app.css";
import "./styles/playful.css";
import "./styles/tokens.css";
import "./styles/cinema.css";
import "./styles/workspace.css";
import App from "./app/App";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
