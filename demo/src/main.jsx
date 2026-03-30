import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LLMtoDMNExtractor from "./LLMtoDMNExtractor";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LLMtoDMNExtractor />
  </StrictMode>
);
