export const m = {
  bg: "#0c0c0e",
  bgElevated: "#111114",
  surface: "rgba(255,255,255,0.025)",
  surfaceStrong: "rgba(255,255,255,0.04)",
  surfaceInteractive: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.05)",
  borderStrong: "rgba(255,255,255,0.08)",
  text: "#e8e8eb",
  textSecondary: "#58585f",
  textTertiary: "#3e3e45",
  textMuted: "#333340",
  danger: "#fca5a5",
  success: "#6ee7b7",
  warning: "#fcd34d",
  blue: "#93c5fd",
  red: "#dc2626",
  redLight: "#ef4444",
  redStrong: "#991b1b",
  redGlow: "rgba(220,38,38,0.18)",
  redGradient: "linear-gradient(135deg, #ef4444, #b91c1c)",
  redGradientSubtle: "linear-gradient(135deg, #dc2626, #991b1b)",
  glassNav: "rgba(10,10,12,0.92)",
  glassPanel: "rgba(18,18,22,0.88)",
  shadowPanel: "0 18px 40px rgba(0,0,0,0.24)",
  shadowFloating: "0 24px 60px rgba(0,0,0,0.34)",
};

export function conditionStyle(condition) {
  const label = String(condition || "").toUpperCase();
  if (label === "MINT" || label === "M") {
    return { bg: "rgba(52,211,153,0.1)", color: m.success, label: "Mint" };
  }
  if (label === "NM") {
    return { bg: "rgba(96,165,250,0.12)", color: m.blue, label: "NM" };
  }
  if (label === "LP") {
    return { bg: "rgba(251,191,36,0.12)", color: m.warning, label: "LP" };
  }
  if (label === "MP") {
    return { bg: "rgba(251,146,60,0.12)", color: "#fdba74", label: "MP" };
  }
  if (label === "HP" || label === "DMG") {
    return { bg: "rgba(248,113,113,0.12)", color: m.danger, label: label === "DMG" ? "DMG" : "HP" };
  }
  return { bg: "rgba(255,255,255,0.05)", color: "#a1a1aa", label: condition || "N/A" };
}

export function gameAccent(game) {
  const value = String(game || "").toLowerCase();
  if (value.includes("pokemon")) {
    return "#ef4444";
  }
  if (value.includes("magic")) {
    return "#8b5cf6";
  }
  if (value.includes("yu")) {
    return "#38bdf8";
  }
  if (value.includes("one piece")) {
    return "#f59e0b";
  }
  if (value.includes("dragon")) {
    return "#fb7185";
  }
  return "#10b981";
}
