export default function AppLaunchScreen({ compact = false }) {
  return (
    <div className={`launch-screen ${compact ? "launch-screen-compact" : ""}`}>
      <div className="launch-screen-panel">
        <div className="launch-orb" aria-hidden="true" />
        <div className="brand-pill">
          <span className="brand-pill-mark">TCG</span>
          <span className="brand-pill-tag">WPG</span>
        </div>
        <div className="space-y-2 text-center">
          <p className="font-display text-2xl font-semibold tracking-[-0.05em] text-ink">
            Marketplace
          </p>
          <p className="text-sm text-steel">Loading your local card market</p>
        </div>
        <div className="launch-meter" aria-hidden="true">
          <span className="launch-meter-bar" />
        </div>
      </div>
    </div>
  );
}
