import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { reportError } from '../utils/errorTracker';
import SpecularButton from './SpecularButton';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unexpected UI error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError({
      source: 'react.ErrorBoundary',
      severity: 'error',
      message: error.message || 'React render crash',
      stack: `${error.stack || ''}\nComponentStack:${info.componentStack || ''}`,
      error,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl border border-red-200 max-w-md w-full p-6 shadow-lg text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-display font-bold text-lg text-slate-900">
              Something went wrong in EcoPulse
            </h2>
            <p className="text-xs text-slate-600">
              The error has been automatically logged to EcoPulse Diagnostics so it can be fixed.
            </p>
            <p className="text-[11px] font-mono bg-slate-100 text-slate-700 p-2.5 rounded-xl break-words">
              {this.state.message}
            </p>
            <SpecularButton
              size="md"
              radius={18}
              tint="#ffffff"
              tintOpacity={0.06}
              textColor="#f5f5f5"
              lineColor="#ffffff"
              baseColor="#525252"
              surfaceColor="#059669"
              intensity={1}
              idleIntensity={0.35}
              shineSize={10}
              shineFade={34}
              thickness={1.2}
              glow={1}
              followMouse
              proximity={250}
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4" />
              Reload EcoPulse
            </SpecularButton>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
