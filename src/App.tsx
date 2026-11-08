import React from 'react';
import { OSProvider } from './os/OSContext';
import { Desktop } from './os/Desktop';
import { GlassFilters } from './os/GlassFilters';

interface RootErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  RootErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected runtime error',
    };
  }

  handleResetAndReload = () => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#030712] p-6 text-white select-none">
          <div className="max-w-md bg-white/[0.04] p-8 text-center backdrop-blur-2xl">
            <div className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">
              GlassiumOS 5 u2 · GlasispectUI Recovery
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              システム表示を復元しています
            </h1>
            <p className="text-xs text-white/60 mb-5 leading-relaxed">
              保存されていた古い設定データとの不整合が検出されました。下のボタンを押すと設定キャッシュを初期化して起動します。
            </p>
            <div className="mb-5 bg-black/40 p-2.5 font-mono text-[11px] text-rose-300 text-left break-all">
              {this.state.errorMessage}
            </div>
            <button
              onClick={this.handleResetAndReload}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition"
            >
              キャッシュを初期化して再起動
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <RootErrorBoundary>
      <OSProvider>
        <GlassFilters />
        <div className="h-screen w-screen overflow-hidden">
          <Desktop />
        </div>
      </OSProvider>
    </RootErrorBoundary>
  );
}

export default App;

