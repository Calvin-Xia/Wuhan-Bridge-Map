import { describe, expect, it } from "vitest";

describe("theme preference resolution", () => {
  it("prefers a valid saved mode over the system preference", async () => {
    const themePreferences = await import("./theme-preferences").catch(() => null);

    expect(themePreferences).not.toBeNull();
    if (!themePreferences) return;

    expect(themePreferences.resolveTheme("light", true)).toBe("light");
    expect(themePreferences.resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the system preference when there is no valid saved mode", async () => {
    const themePreferences = await import("./theme-preferences").catch(() => null);

    expect(themePreferences).not.toBeNull();
    if (!themePreferences) return;

    expect(themePreferences.resolveTheme(null, true)).toBe("dark");
    expect(themePreferences.resolveTheme("unknown", false)).toBe("light");
  });

  it("reads only valid stored modes and fails safely when storage is unavailable", async () => {
    const themePreferences = await import("./theme-preferences").catch(() => null);

    expect(themePreferences).not.toBeNull();
    if (!themePreferences) return;

    expect(themePreferences.readStoredTheme({ getItem: () => "dark" })).toBe("dark");
    expect(themePreferences.readStoredTheme({ getItem: () => "invalid" })).toBeNull();
    expect(
      themePreferences.persistTheme(
        {
          setItem: () => {
            throw new Error("storage blocked");
          },
        },
        "dark",
      ),
    ).toBe(false);
  });
});
