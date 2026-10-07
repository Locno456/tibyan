"use client"
import { useEffect } from "react"
import { applyTheme, parseThemeChoice, THEME_STORAGE_KEY } from "../lib/theme"

export default function ThemeController() {
  useEffect(() => {
    const update = () => {
      let saved: string | null = null
      try { saved = localStorage.getItem(THEME_STORAGE_KEY) } catch { /* optional */ }
      applyTheme(parseThemeChoice(saved))
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    update()
    media.addEventListener("change", update)
    window.addEventListener("storage", update)
    window.addEventListener("tibyan-theme-change", update)
    return () => {
      media.removeEventListener("change", update)
      window.removeEventListener("storage", update)
      window.removeEventListener("tibyan-theme-change", update)
    }
  }, [])
  return null
}
