import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { performOneTimeCleanZeroResetIfNeeded } from './utils/persistentStorage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isReloading: boolean;
}

/**
 * Repairs ONLY malformed non-business UI/session/index keys that could crash render
 * without ever deleting or altering user inventory, recipes, branches, or daily count records.
 */
function sanitizeKnownCorruptUiKeys() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    // 1. Validate active user session
    const sessionRaw = localStorage.getItem('eth_erp_active_user_session');
    if (sessionRaw) {
      try {
        const parsed = JSON.parse(sessionRaw);
        if (
          parsed !== null &&
          (typeof parsed !== 'object' ||
            Array.isArray(parsed) ||
            typeof parsed.uid !== 'string' ||
            typeof parsed.email !== 'string')
        ) {
          localStorage.removeItem('eth_erp_active_user_session');
        }
      } catch {
        localStorage.removeItem('eth_erp_active_user_session');
      }
    }

    // 2. Validate registered users list
    const usersRaw = localStorage.getItem('eth_erp_registered_app_users_v2');
    if (usersRaw) {
      try {
        const parsed = JSON.parse(usersRaw);
        if (!Array.isArray(parsed)) {
          localStorage.removeItem('eth_erp_registered_app_users_v2');
        }
      } catch {
        localStorage.removeItem('eth_erp_registered_app_users_v2');
      }
    }

    // 3. Validate daily date index caches (BELLO_DAILY_INDEX_*) — never touches BELLO_DAILY_RECORD_*
    const keysToCheck: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('BELLO_DAILY_INDEX_')) {
        keysToCheck.push(k);
      }
    }
    keysToCheck.forEach((k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            localStorage.removeItem(k);
          }
        }
      } catch {
        localStorage.removeItem(k);
      }
    });
  } catch {
    // Never fail startup cleanup
  }
}

sanitizeKnownCorruptUiKeys();

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isReloading: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by RootErrorBoundary:', error, errorInfo);
  }

  private handleReload = async () => {
    this.setState({ isReloading: true });
    try {
      sanitizeKnownCorruptUiKeys();

      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister().catch(() => false)));
      }

      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name).catch(() => false)));
      }
    } catch (e) {
      console.warn('Reload recovery cleanup note:', e);
    } finally {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-lg font-black text-white">
              አፕሊኬሽኑን ዳግም ማስጀመር ይፈልጋሉ?
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              ሲስተሙ ዳታዎን ሳይነካ በደህንነት ዝግጁ ሆኗል። ከታች ያለውን አዝራር በመጫን ገጹን ያድሱት።
            </p>
            {this.state.error && (
              <div className="text-[11px] font-mono text-rose-300/80 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              disabled={this.state.isReloading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-yellow-400 transition-all disabled:opacity-60 cursor-pointer"
            >
              {this.state.isReloading
                ? '⏳ ካሽ በማጽዳትና በማደስ ላይ... (Refreshing...)'
                : '🔄 አፑን እንደገና ጫን (Reload App)'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

async function bootstrap() {
  await performOneTimeCleanZeroResetIfNeeded();
  const rootEl = document.getElementById('root');
  if (rootEl) {
    createRoot(rootEl).render(
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    );
  }
}

bootstrap();
