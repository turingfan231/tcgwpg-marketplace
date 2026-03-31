function hexToRgb(hex) {
  const normalized = String(hex || "")
    .trim()
    .replace("#", "");

  if (normalized.length !== 6) {
    return "240, 55, 55";
  }

  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `${red}, ${green}, ${blue}`;
}

function normalizeHexColor(value, fallback) {
  const trimmed = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toLowerCase() : fallback;
}

function createPreset(id, name, description, primary, accent) {
  return {
    id,
    name,
    description,
    primary,
    accent,
    primaryRgb: hexToRgb(primary),
    accentRgb: hexToRgb(accent),
  };
}

export const themePresets = [
  createPreset(
    "collector-strip",
    "Collector Strip",
    "Red and white storefront system inspired by a binder tab marker.",
    "#b11d23",
    "#c62828",
  ),
];

export const themePresetMap = Object.fromEntries(
  themePresets.map((preset) => [preset.id, preset]),
);

export function resolveThemePreset(id) {
  return themePresetMap[id] || themePresetMap["collector-strip"] || themePresets[0];
}

export function normalizeCustomTheme(theme = {}) {
  const fallback = resolveThemePreset("collector-strip");
  const primary = normalizeHexColor(theme.primary, fallback.primary);
  const accent = normalizeHexColor(theme.accent, fallback.accent);

  return {
    primary,
    accent,
    primaryRgb: hexToRgb(primary),
    accentRgb: hexToRgb(accent),
  };
}

export function resolveThemeSelection(id, customTheme) {
  if (id === "custom") {
    const normalized = normalizeCustomTheme(customTheme);
    return {
      id: "custom",
      name: "Custom",
      description: "Your own live theme colors.",
      ...normalized,
    };
  }

  return resolveThemePreset(id);
}
