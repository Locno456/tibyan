export type ThemeChoice = "light" | "dark" | "system"
export const THEME_STORAGE_KEY = "tibyan.theme.v1"
export function parseThemeChoice(value: unknown): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system"
}
export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): "light" | "dark" {
  return choice === "system" ? (prefersDark ? "dark" : "light") : choice
}
export function applyTheme(choice: ThemeChoice) {
  if (typeof window === "undefined") return
  document.documentElement.dataset.theme = resolveTheme(choice, window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.dataset.themeChoice = choice
  document.documentElement.style.colorScheme = document.documentElement.dataset.theme
}
export function saveTheme(choice: ThemeChoice) {
  try { localStorage.setItem(THEME_STORAGE_KEY, choice) } catch { /* storage is optional */ }
  applyTheme(choice)
  window.dispatchEvent(new Event("tibyan-theme-change"))
}
