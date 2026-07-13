import {
  isThemeMode,
  persistTheme,
  readStoredTheme,
  resolveTheme,
  THEME_CHANGE_EVENT,
  type ThemeMode,
} from "../lib/theme-preferences";

const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const storage = getStorage();
let hasManualPreference = readStoredTheme(storage) !== null;

applyTheme(resolveTheme(readStoredTheme(storage), systemTheme.matches), false);

toggle?.addEventListener("click", () => {
  const currentTheme = getCurrentTheme();
  applyTheme(currentTheme === "dark" ? "light" : "dark", true);
});

const handleSystemThemeChange = (event: MediaQueryListEvent) => {
  if (hasManualPreference) return;
  applyTheme(event.matches ? "dark" : "light", false);
};

systemTheme.addEventListener?.("change", handleSystemThemeChange);

function applyTheme(mode: ThemeMode, persist: boolean) {
  root.dataset.theme = mode;
  root.style.colorScheme = mode;

  if (persist) {
    persistTheme(storage, mode);
    hasManualPreference = true;
  }

  updateToggle(mode);
  window.dispatchEvent(
    new CustomEvent<{ mode: ThemeMode }>(THEME_CHANGE_EVENT, {
      detail: { mode },
    }),
  );
}

function updateToggle(mode: ThemeMode) {
  if (!toggle) return;

  const isDark = mode === "dark";
  toggle.setAttribute("aria-pressed", String(isDark));
  toggle.setAttribute("aria-label", isDark ? "切换到日间主题" : "切换到暗夜主题");

  const label = toggle.querySelector<HTMLElement>("[data-theme-toggle-label]");
  if (label) label.textContent = isDark ? "日间" : "暗夜";
}

function getCurrentTheme(): ThemeMode {
  return isThemeMode(root.dataset.theme) ? root.dataset.theme : "light";
}

function getStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
