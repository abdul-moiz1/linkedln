import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("[main] Starting React application...");

const rootElement = document.getElementById("root");
if (rootElement) {
  console.log("[main] Found root element, rendering App");
  createRoot(rootElement).render(<App />);
} else {
  console.error("[main] Could not find root element with id 'root'");
}
