import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./loadFonts";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
