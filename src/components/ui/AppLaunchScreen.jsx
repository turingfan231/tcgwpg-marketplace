import BrandLogo from "../shared/BrandLogo";
import { m } from "../../mobile/design";

export default function AppLaunchScreen({ compact = false }) {
  return (
    <main
      className={`flex min-h-screen items-center justify-center px-6 ${compact ? "py-8" : "py-12"}`}
      role="main"
      style={{ background: m.bg }}
    >
      <div
        className="w-full max-w-[430px] rounded-[30px] border px-6 py-8 text-center"
        style={{ background: m.surface, borderColor: m.borderStrong, boxShadow: m.shadowFloating }}
      >
        <div
          className="mx-auto mb-5 h-16 w-16 rounded-[20px]"
          aria-hidden="true"
          style={{ background: m.redGradient, boxShadow: "0 14px 32px rgba(185,28,28,0.28)" }}
        />
        <BrandLogo imgClassName="mx-auto h-14 w-auto max-w-[12rem] object-contain sm:h-16 sm:max-w-[13rem]" />
        <div className="mt-5 space-y-2 text-center">
          <p className="text-[13px]" style={{ color: m.textSecondary }}>
            Local cards, faster deals
          </p>
        </div>
        <div className="mx-auto mt-6 h-1.5 w-28 overflow-hidden rounded-full" style={{ background: m.surfaceStrong }}>
          <span
            className="block h-full w-1/2 rounded-full"
            style={{ background: m.redGradient, boxShadow: "0 0 14px rgba(239,68,68,0.28)" }}
          />
        </div>
      </div>
    </main>
  );
}
