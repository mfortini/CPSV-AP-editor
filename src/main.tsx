import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap-italia/dist/css/bootstrap-italia.min.css";
import "./i18n";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
