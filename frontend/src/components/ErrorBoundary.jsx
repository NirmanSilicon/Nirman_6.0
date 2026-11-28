import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Top-level ErrorBoundary catching unexpected runtime render errors cleanly.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("AlarmSense UI ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F8FB] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Dashboard Render Error
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {this.state.error?.message || "An unexpected UI error occurred."}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00A8B5] text-white text-sm font-semibold hover:bg-[#008B96] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reload View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
