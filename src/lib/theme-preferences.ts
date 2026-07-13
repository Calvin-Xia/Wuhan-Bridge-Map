export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "wuhan-bridge-map-theme";
export const THEME_CHANGE_EVENT = "bridge-theme-change";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function resolveTheme(storedTheme: string | null, systemPrefersDark: boolean): ThemeMode {
  if (isThemeMode(storedTheme)) return storedTheme;
  return systemPrefersDark ? "dark" : "light";
}

export function readStoredTheme(
  storage: Pick<Storage, "getItem"> | null | undefined,
): ThemeMode | null {
  try {
    const storedTheme = storage?.getItem(THEME_STORAGE_KEY) ?? null;
    return isThemeMode(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

export function persistTheme(
  storage: Pick<Storage, "setItem"> | null | undefined,
  mode: ThemeMode,
): boolean {
  try {
    storage?.setItem(THEME_STORAGE_KEY, mode);
    return Boolean(storage);
  } catch {
    return false;
  }
}
