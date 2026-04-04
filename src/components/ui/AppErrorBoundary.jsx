import React from "react";
import { m } from "../../mobile/design";

const RECOVERABLE_CHUNK_ERRORS = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "Loading chunk",
  "ChunkLoadError",
];
const RETRY_STORAGE_KEY = "tcgwpg.chunkErrorRecovered";

function isRecoverableChunkError(error) {
  const message = String(error?.message || "");
  return RECOVERABLE_CHUNK_ERRORS.some((snippet) => message.includes(snippet));
}

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "", recoverable: false };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unknown client-side error.",
      recoverable: isRecoverableChunkError(error),
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App render failed:", error, errorInfo);

    if (
      typeof window !== "undefined" &&
      isRecoverableChunkError(error) &&
      window.sessionStorage.getItem(RETRY_STORAGE_KEY) !== "1"
    ) {
      window.sessionStorage.setItem(RETRY_STORAGE_KEY, "1");
      window.setTimeout(() => {
        window.location.reload();
      }, 120);
    }
  }

  componentDidMount() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(RETRY_STORAGE_KEY);
    }
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(RETRY_STORAGE_KEY);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-12" role="main" style={{ background: m.bg }}>
          <div className="mx-auto max-w-xl rounded-[28px] border p-6 sm:p-8" style={{ background: m.surface, borderColor: m.borderStrong, boxShadow: m.shadowFloating }}>
            <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
              Unexpected client error
            </p>
            <h1 className="mt-3 text-[30px] tracking-tight text-white sm:text-[38px]" style={{ fontWeight: 700, lineHeight: 1.02 }}>
              The page hit an unexpected error.
            </h1>
            <p className="mt-4 text-[13px] sm:text-[14px]" style={{ color: m.textSecondary, lineHeight: 1.65 }}>
              {this.state.recoverable
                ? "We hit a temporary app-load issue. A refresh usually fixes it right away."
                : "Refresh the page and try again. If this keeps happening, the latest live data shape is probably hitting a client-side rendering issue."}
            </p>
            {this.state.errorMessage ? (
              <div className="mt-6 rounded-[18px] border px-4 py-4 text-[12px]" style={{ background: m.surfaceStrong, borderColor: m.border, color: m.textSecondary }}>
                {this.state.errorMessage}
              </div>
            ) : null}
            <button className="mt-8 inline-flex h-[44px] items-center justify-center rounded-[14px] px-5 text-[13px] text-white" style={{ background: m.redGradient, fontWeight: 700, boxShadow: "0 8px 24px rgba(185,28,28,0.26)" }} type="button" onClick={this.handleReload}>
              Reload Site
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
