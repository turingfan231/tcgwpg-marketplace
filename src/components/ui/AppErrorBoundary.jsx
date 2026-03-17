import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App render failed:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f1ea] px-6 py-12">
          <div className="mx-auto max-w-2xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-soft sm:p-10">
            <p className="section-kicker">Something broke</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
              The page hit an unexpected error.
            </h1>
            <p className="mt-4 text-base leading-8 text-steel">
              Refresh the page and try again. If this keeps happening, the latest live
              data shape is probably hitting a client-side rendering issue.
            </p>
            <button
              className="mt-8 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white"
              type="button"
              onClick={this.handleReload}
            >
              Reload site
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
