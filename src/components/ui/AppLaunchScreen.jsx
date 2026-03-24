export default function AppLaunchScreen({ compact = false }) {
  return (
    <div className={`launch-screen ${compact ? "launch-screen-compact" : ""}`}>
      <div className="launch-screen-panel">
        <div className="launch-orb" aria-hidden="true" />
        <div className="collector-strip-mark" aria-hidden="true">
          <span className="collector-strip-bar">W</span>
          <span className="collector-strip-bar">P</span>
          <span className="collector-strip-bar">G</span>
        </div>
        <div className="space-y-2 text-center">
          <p className="font-display text-2xl font-semibold tracking-[-0.05em] text-ink">WPG Marketplace</p>
          <p className="text-sm text-steel">Local cards, faster deals</p>
        </div>
        <div className="launch-meter" aria-hidden="true">
          <span className="launch-meter-bar" />
        </div>
      </div>
    </div>
  );
}
