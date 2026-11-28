import React from 'react';
import { AlertCircle, Database, RefreshCw, ShieldAlert } from 'lucide-react';
import { firebaseRuntimeConfig } from '../../lib/firebase';
import { CollectionSyncState } from '../../types/hospital';

export const LoadingDataState: React.FC<{ label?: string; rows?: number }> = ({
  label = 'Loading live records from Firestore...',
  rows = 5,
}) => (
  <div className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden" role="status" aria-live="polite">
    <div className="px-6 py-4 border-b border-[#EAE5D9] bg-[#FBFBF7] flex items-center justify-between">
      <span className="text-xs font-medium text-[#665860]">{label}</span>
      <span className="text-[11px] text-[#665860] tabular-nums">
        {firebaseRuntimeConfig.projectId}
      </span>
    </div>
    <div className="divide-y divide-[#EAE5D9]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex items-center gap-4">
          <div className="h-3.5 w-28 bg-[#EAE9DC] rounded-xs" />
          <div className="h-3.5 w-44 bg-[#F3F3E7] rounded-xs" />
          <div className="h-3.5 flex-1 bg-[#F3F3E7] rounded-xs" />
          <div className="h-3.5 w-20 bg-[#EAE9DC] rounded-xs" />
        </div>
      ))}
    </div>
  </div>
);

export const PermissionDeniedState: React.FC<{
  collectionPath: string;
  userEmail?: string | null;
  userId?: string | null;
  userRole?: string;
  errorMessage?: string;
  onRetry?: () => void;
}> = ({ collectionPath, userEmail, userId, userRole, errorMessage, onRetry }) => (
  <div
    role="alert"
    className="bg-white border border-[#DDD8CB] rounded-lg p-7 max-w-2xl"
  >
    <div className="flex items-start gap-3.5">
      <ShieldAlert className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
      <div className="space-y-3 min-w-0">
        <div>
          <h2 className="font-serif text-xl text-[#30232A]">
            Access Denied for Collection &ldquo;{collectionPath}&rdquo;
          </h2>
          <p className="mt-1 text-sm text-[#665860] leading-relaxed">
            Firestore security rules on the existing JanmaSaathi database rejected this read request.
            Demo data is not substituted when database access is denied.
          </p>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#EAE5D9] text-xs">
          <div>
            <dt className="text-[#665860]">Firebase Project</dt>
            <dd className="font-medium text-[#30232A] tabular-nums mt-0.5">
              {firebaseRuntimeConfig.projectId}
            </dd>
          </div>
          <div>
            <dt className="text-[#665860]">Named Firestore Database</dt>
            <dd className="font-medium text-[#30232A] tabular-nums mt-0.5 break-all">
              {firebaseRuntimeConfig.databaseId}
            </dd>
          </div>
          <div>
            <dt className="text-[#665860]">Authenticated Account</dt>
            <dd className="font-medium text-[#30232A] mt-0.5 truncate">
              {userEmail || userId || 'Signed-in user'}
            </dd>
          </div>
          <div>
            <dt className="text-[#665860]">Resolved Role</dt>
            <dd className="font-medium text-[#30232A] mt-0.5">{userRole || 'Not set in users/{uid}'}</dd>
          </div>
        </dl>

        {errorMessage && (
          <p className="text-xs text-[#B91C1C] bg-[#FBFBF7] border border-[#EAE5D9] rounded-md px-3 py-2 break-words">
            {errorMessage}
          </p>
        )}

        <p className="text-xs text-[#665860] leading-relaxed">
          To grant access, verify your account&apos;s hospital role in{' '}
          <code className="text-[#30232A]">users/{userId || '<uid>'}</code> and ensure your
          existing <code className="text-[#30232A]">firestore.rules</code> permit hospital reads on{' '}
          <code className="text-[#30232A]">{collectionPath}</code>.
        </p>

        {onRetry && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Firestore Read</span>
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const ConnectionErrorState: React.FC<{
  title?: string;
  message: string;
  collectionPath?: string;
  onRetry?: () => void;
}> = ({ title = 'Firestore Connection Error', message, collectionPath, onRetry }) => (
  <div role="alert" className="bg-white border border-[#DDD8CB] rounded-lg p-7 max-w-2xl">
    <div className="flex items-start gap-3.5">
      <AlertCircle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
      <div className="space-y-3 min-w-0">
        <div>
          <h2 className="font-serif text-xl text-[#30232A]">{title}</h2>
          <p className="mt-1 text-sm text-[#665860] leading-relaxed">{message}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#665860] pt-2 border-t border-[#EAE5D9] tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#890149]" />
            Project: {firebaseRuntimeConfig.projectId || 'Unconfigured'}
          </span>
          <span>Database: {firebaseRuntimeConfig.databaseId || 'Unconfigured'}</span>
          {collectionPath && <span>Path: {collectionPath}</span>}
        </div>

        {onRetry && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const CollectionStateGate: React.FC<{
  syncState: CollectionSyncState;
  userEmail?: string | null;
  userId?: string | null;
  userRole?: string;
  onRetry?: () => void;
  loadingLabel?: string;
  children: React.ReactNode;
}> = ({ syncState, userEmail, userId, userRole, onRetry, loadingLabel, children }) => {
  if (syncState.status === 'idle' || syncState.status === 'loading') {
    return <LoadingDataState label={loadingLabel ?? `Loading ${syncState.path} from Firestore...`} />;
  }
  if (syncState.status === 'permission-denied') {
    return (
      <PermissionDeniedState
        collectionPath={syncState.path}
        userEmail={userEmail}
        userId={userId}
        userRole={userRole}
        errorMessage={syncState.errorMessage}
        onRetry={onRetry}
      />
    );
  }
  if (syncState.status === 'error') {
    return (
      <ConnectionErrorState
        title={`Unable to load "${syncState.path}"`}
        message={syncState.errorMessage || 'A Firestore error occurred while reading this collection.'}
        collectionPath={syncState.path}
        onRetry={onRetry}
      />
    );
  }
  return <>{children}</>;
};

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      console.error('Hospital Dashboard ErrorBoundary:', error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F3F3E7] flex items-center justify-center p-6">
          <ConnectionErrorState
            title="Application Error"
            message={this.state.message}
            onRetry={() => this.setState({ hasError: false, message: '' })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
