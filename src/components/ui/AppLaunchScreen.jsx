import BrandLogo from "../shared/BrandLogo";
import { m } from "../../mobile/design";

export default function AppLaunchScreen({
  compact = false,
  progress = 0.12,
  status = "Starting TCG WPG",
}) {
  const normalizedProgress = Math.max(0.06, Math.min(1, Number(progress) || 0));

  return (
    <main
      className={`flex min-h-screen items-center justify-center px-6 ${compact ? "py-8" : "py-12"}`}
      role="main"
      style={{ background: m.bg }}
    >
      <div
        className="w-full max-w-[430px] rounded-[30px] border px-6 py-8 text-center"
        style={{
          background:
            "radial-gradient(circle at top, rgba(239,68,68,0.08) 0%, transparent 34%), linear-gradient(180deg, rgba(24,24,28,0.98), rgba(16,16,19,0.98))",
          borderColor: m.borderStrong,
          boxShadow: m.shadowFloating,
        }}
      >
        <BrandLogo
          className="mb-5 justify-center gap-4"
          imgClassName="h-16 w-16 rounded-[20px] object-cover shadow-[0_18px_40px_rgba(239,68,68,0.24)] sm:h-[72px] sm:w-[72px] sm:rounded-[24px]"
          subtitle="Winnipeg, MB"
          subtitleClassName="mt-1 text-[11px] font-semibold text-[#8a8a92] sm:text-[12px]"
          titleClassName="text-[26px] font-extrabold tracking-tight text-white sm:text-[30px]"
          withSubtitle
        />
        <div className="mt-5 space-y-2 text-center">
          <p
            className="text-[11px] uppercase tracking-[0.16em]"
            style={{ color: "#f87171", fontWeight: 700 }}
          >
            Loading Marketplace
          </p>
          <p className="text-[14px]" style={{ color: "#e6e6ea", fontWeight: 600 }}>
            {status}
          </p>
          <p className="text-[12px]" style={{ color: m.textSecondary }}>
            Local cards, faster deals
          </p>
        </div>
        <div
          className="mx-auto mt-6 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full"
          style={{ background: m.surfaceStrong }}
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${Math.round(normalizedProgress * 100)}%`,
              background: m.redGradient,
              boxShadow: "0 0 14px rgba(239,68,68,0.28)",
              transition: "width 220ms ease",
            }}
          />
        </div>
        <p className="mt-3 text-[11px]" style={{ color: "#787882", fontWeight: 600 }}>
          {Math.max(6, Math.round(normalizedProgress * 100))}% ready
        </p>
      </div>
    </main>
  );
}
