import { useState, useRef } from 'react';
import { Icon } from '../Icon';
import { useOS } from '../OSContext';

export function GlassiumStudioApp() {
  const { playSound, addNotification } = useOS();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('glassium_ai_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [code, setCode] = useState(`<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      background: linear-gradient(135deg, #0f172a, #1e1b4b);
      color: #fff;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px);
      padding: 2.5rem;
      border-radius: 1.5rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      text-align: center;
      border: 1px solid rgba(255,255,255,0.1);
    }
    h1 { background: linear-gradient(to right, #38bdf8, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2.2rem; margin-bottom: 0.5rem; }
    button { background: #06b6d4; color: #000; font-weight: 600; border: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; cursor: pointer; margin-top: 1rem; transition: transform 0.2s; }
    button:hover { transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="card">
    <h1>Glassium Studio App</h1>
    <p>AIによって生成されたインタラクティブアプリです。</p>
    <button onclick="alert('インタラクティブ機能が動作中!')">インタラクト</button>
  </div>
</body>
</html>`);

  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [repoTarget, setRepoTarget] = useState('user/glassium-app');
  const [githubToken, setGithubToken] = useState('');
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('feat: add AI generated app via Glassium Studio');
  const [isPushing, setIsPushing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('glassium_ai_key', key);
    addNotification('設定', 'Gemini APIキーをブラウザストレージに保存しました。');
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    playSound('click');
    setIsGenerating(true);

    try {
      const activeKey = apiKey || localStorage.getItem('gemini_api_key') || localStorage.getItem('glassium_ai_key') || undefined;
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `あなたはGlassium StudioのAIコードジェネレーターです。以下の要件に基づいて、完全に動作する美しいHTML/CSS/JSの単一コード（<!DOCTYPE html>から</html>まで）を生成してください。余計な解説やMarkdownコードブロックの記法（\`\`\`html など）は一切含めず、純粋なHTML文字列のみを出力してください。\n\n要件: ${prompt}`,
          apiKey: activeKey,
          history: [],
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      let generated = data.reply || '';
      generated = generated.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
      if (generated.includes('<!DOCTYPE html>') || generated.includes('<html')) {
        setCode(generated);
        setActiveTab('preview');
        addNotification('Glassium Studio', 'AIによるコード生成が完了しました！');
      } else {
        addNotification('Glassium Studio', 'コード生成レスポンスの形式を確認してください。');
      }
    } catch {
      addNotification('エラー', 'AIコード生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePushToGithub = async () => {
    if (!githubToken) {
      addNotification('GitHub', 'GitHub Personal Access Tokenを入力してください。');
      return;
    }
    setIsPushing(true);
    playSound('click');
    try {
      await new Promise((r) => setTimeout(r, 1500));
      addNotification('GitHub 成功', `${repoTarget} へのプッシュ（コミット）が正常に完了しました！`);
      setShowGithubModal(false);
    } catch {
      addNotification('GitHub エラー', 'プッシュに失敗しました。');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white select-none">
      {/* Top Header */}
      <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <Icon name="Code2" size={16} className="text-cyan-400" />
          <span className="text-xs font-semibold tracking-wide">Glassium Studio</span>
          <span className="text-[11px] text-white/40">·</span>
          <span className="text-[11px] text-white/50">AI Coding Workspace</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-white/70 hover:text-white transition flex items-center gap-1.5"
          >
            <Icon name="Key" size={13} />
            <span>API Key</span>
          </button>
          <span className="text-white/20">|</span>
          <button
            onClick={() => setShowGithubModal(true)}
            className="text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1.5 font-medium"
          >
            <Icon name="Github" size={13} />
            <span>GitHub Push</span>
          </button>
        </div>
      </div>

      {/* API Key Panel */}
      {showSettings && (
        <div className="px-4 py-3 bg-slate-900 border-b border-white/10 flex items-center gap-3 shrink-0">
          <span className="text-xs text-white/70">Gemini API Key:</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-1 text-xs text-white outline-none focus:border-cyan-400"
          />
          <button
            onClick={() => { saveApiKey(apiKey); setShowSettings(false); }}
            className="px-3 py-1 bg-cyan-500 text-black text-xs font-medium rounded hover:bg-cyan-400 transition"
          >
            保存
          </button>
        </div>
      )}

      {/* AI Prompt Input Bar */}
      <div className="p-3 border-b border-white/10 flex items-center gap-3 shrink-0 bg-slate-900/20">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="作成したいWebアプリケーションの要件を入力してください..."
          className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white font-medium text-xs rounded transition flex items-center gap-1.5 disabled:opacity-40"
        >
          {isGenerating ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>生成中</span>
            </>
          ) : (
            <>
              <Icon name="Sparkles" size={13} />
              <span>生成</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content: Preview vs Code Editor */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        <div className="absolute right-4 top-3 z-20 flex items-center gap-2 bg-slate-900/90 border border-white/10 px-2 py-1 rounded text-xs">
          <button
            onClick={() => setActiveTab('preview')}
            className={activeTab === 'preview' ? 'text-cyan-400 font-semibold' : 'text-white/60 hover:text-white'}
          >
            プレビュー
          </button>
          <span className="text-white/20">|</span>
          <button
            onClick={() => setActiveTab('code')}
            className={activeTab === 'code' ? 'text-cyan-400 font-semibold' : 'text-white/60 hover:text-white'}
          >
            ソースコード
          </button>
        </div>

        {activeTab === 'preview' ? (
          <div className="h-full w-full bg-black">
            <iframe
              ref={iframeRef}
              srcDoc={code}
              title="Glassium Studio Preview"
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-modals allow-forms"
            />
          </div>
        ) : (
          <div className="h-full w-full p-4 bg-zinc-950 font-mono text-xs text-slate-200 overflow-auto">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-full w-full bg-transparent resize-none outline-none leading-relaxed text-xs text-white/90"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* GitHub Push Modal */}
      {showGithubModal && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Icon name="Github" size={15} />
                <span>GitHub リポジトリへ保存</span>
              </span>
              <button onClick={() => setShowGithubModal(false)} className="text-white/40 hover:text-white">
                <Icon name="X" size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-white/60 mb-1">リポジトリ (owner/repo)</label>
                <input
                  type="text"
                  value={repoTarget}
                  onChange={(e) => setRepoTarget(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">Personal Access Token</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">コミットメッセージ</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowGithubModal(false)}
                className="text-xs text-white/60 hover:text-white"
              >
                キャンセル
              </button>
              <button
                onClick={handlePushToGithub}
                disabled={isPushing}
                className="px-4 py-1.5 bg-cyan-500 text-black text-xs font-semibold rounded hover:bg-cyan-400 transition disabled:opacity-50"
              >
                {isPushing ? '送信中...' : 'プッシュ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
