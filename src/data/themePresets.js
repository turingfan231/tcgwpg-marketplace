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
  createPreset("ember-signal", "Ember Signal", "Current red-forward storefront with a crisp blue contrast.", "#f03737", "#6d86f0"),
  createPreset("oxide-rose", "Oxide Rose", "Softer collector red with a cool denim accent.", "#d44a55", "#7094f5"),
  createPreset("burgundy-mist", "Burgundy Mist", "A richer wine tone that still feels premium.", "#a33b57", "#88a3f8"),
  createPreset("terracotta-sky", "Terracotta Sky", "Warmer clay red with a lighter blue counterpoint.", "#cf624f", "#78a8f4"),
  createPreset("cherry-noir", "Cherry Noir", "Sharper cherry red with colder app-like highlights.", "#d83f4f", "#7f9eff"),
  createPreset("mulberry-glow", "Mulberry Glow", "Plum-leaning red for a softer boutique feel.", "#a34667", "#8f9ff8"),
  createPreset("brick-signal", "Brick Signal", "A grounded brick primary with techy blue accents.", "#b74f46", "#6f95ee"),
  createPreset("ruby-slate", "Ruby Slate", "Collector ruby with a restrained steel-blue contrast.", "#b93e52", "#8aa2ea"),
  createPreset("cinnamon-ice", "Cinnamon Ice", "Warm and lighter without going orange-heavy.", "#c7674e", "#83b1ea"),
  createPreset("wineberry", "Wineberry", "Deeper premium red paired with cool periwinkle.", "#8f3150", "#95a7ff"),
  createPreset("orchid-flare", "Orchid Flare", "Magenta-red leaning, more playful without neon.", "#aa416b", "#80a8ff"),
  createPreset("clay-indigo", "Clay Indigo", "Muted red-brown with a more classic app accent.", "#b55a4e", "#6f88ee"),
  createPreset("rosewood-cyan", "Rosewood Cyan", "Bold rosewood against a brighter aquatic accent.", "#a44752", "#63b6ee"),
  createPreset("garnet-frost", "Garnet Frost", "Dark collector red with icy blue support.", "#963447", "#8fb8ff"),
  createPreset("coral-circuit", "Coral Circuit", "Livelier but still restrained.", "#de5b5b", "#7090f0"),
  createPreset("scarlet-mist", "Scarlet Mist", "More vivid red with softer periwinkle surfaces.", "#ce4348", "#9baeff"),
  createPreset("plum-coral", "Plum Coral", "Balanced between berry and brick.", "#994461", "#78a1f2"),
  createPreset("copper-night", "Copper Night", "Copper-red primary with dusky royal blue.", "#b35b49", "#7a8de8"),
  createPreset("sangria-cloud", "Sangria Cloud", "Dark sangria paired with pastel blue energy.", "#8c3348", "#9fb2ff"),
  createPreset("ember-ice", "Ember Ice", "Clean red with a lighter, more airy blue.", "#d84949", "#7fb8ff"),
];

export const themePresetMap = Object.fromEntries(
  themePresets.map((preset) => [preset.id, preset]),
);

export function resolveThemePreset(id) {
  return themePresetMap[id] || themePresetMap["ember-signal"] || themePresets[0];
}

export function normalizeCustomTheme(theme = {}) {
  const fallback = resolveThemePreset("ember-signal");
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
