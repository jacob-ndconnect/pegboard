import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "../theme-init.ts"
import "../index.css"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { Popup } from "./Popup"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <Popup />
    </ThemeProvider>
  </StrictMode>
)
