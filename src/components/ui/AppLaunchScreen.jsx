import BrandLogo from "../shared/BrandLogo";

export default function AppLaunchScreen({ compact = false }) {
  return (
    <div className={`launch-screen ${compact ? "launch-screen-compact" : ""}`}>
      <div className="launch-screen-panel">
        <div className="launch-orb" aria-hidden="true" />
        <BrandLogo imgClassName="h-20 w-auto max-w-[18rem] object-contain sm:h-24 sm:max-w-[21rem]" />
        <div className="space-y-2 text-center">
          <p className="text-sm text-steel">Local cards, faster deals</p>
        </div>
        <div className="launch-meter" aria-hidden="true">
          <span className="launch-meter-bar" />
        </div>
      </div>
    </div>
  );
}
