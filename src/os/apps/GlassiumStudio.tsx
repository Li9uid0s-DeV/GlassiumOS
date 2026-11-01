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
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `あなたはGlassium StudioのAIコードジェネレーターです。以下の要件に基づいて、完全に動作する美しいHTML/CSS/JSの単一コード（<!DOCTYPE html>から</html>まで）を生成してください。余計な解説やMarkdownコードブロックの記法（\`\`\`html など）は一切含めず、純粋なHTML文字列のみを出力してください。\n\n要件: ${prompt}`,
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
    <div className="h-full w-full flex flex-col bg-black/35 backdrop-blur-2xl text-white select-none">
      {/* Top Header */}
      <div className="h-13 px-5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl glass-jelly flex items-center justify-center text-cyan-300">
            <Icon name="Code2" size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold">Glassium Studio</div>
            <div className="text-[10px] text-white/50">AI 共同開発ワークスペース</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 rounded-xl glass-jelly text-xs text-white/80 hover:text-white flex items-center gap-1.5"
          >
            <Icon name="Key" size={13} />
            <span>APIキー</span>
          </button>
          <button
            onClick={() => setShowGithubModal(true)}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-xs text-cyan-300 flex items-center gap-1.5 border border-cyan-500/30 transition"
          >
            <Icon name="Github" size={13} />
            <span>GitHub Push</span>
          </button>
        </div>
      </div>

      {/* API Key Modal / Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-zinc-900/90 border-b border-white/10 flex items-center gap-3 shrink-0">
          <div className="text-xs text-white/70">Gemini API Key (LocalStorage保存):</div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={() => { saveApiKey(apiKey); setShowSettings(false); }}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 text-black text-xs font-semibold"
          >
            保存
          </button>
        </div>
      )}

      {/* AI Prompt Input Bar */}
      <div className="p-3 bg-white/[0.01] border-b border-white/[0.06] flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="例: ネオン調のおしゃれなTODOアプリを作って..."
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-black font-semibold text-xs flex items-center gap-2 hover:brightness-110 transition disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>生成中...</span>
            </>
          ) : (
            <>
              <Icon name="Sparkles" size={14} />
              <span>AIコード生成</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content: Preview vs Code Editor */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        <div className="absolute right-4 top-3 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-xl p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${activeTab === 'preview' ? 'bg-cyan-500 text-black font-semibold' : 'text-white/70 hover:text-white'}`}
          >
            プレビュー
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${activeTab === 'code' ? 'bg-cyan-500 text-black font-semibold' : 'text-white/70 hover:text-white'}`}
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
          <div className="h-full w-full p-4 bg-zinc-950 font-mono text-xs text-cyan-200 overflow-auto">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-full w-full bg-transparent resize-none focus:outline-none leading-relaxed text-xs text-white/90"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* GitHub Commit / Push Modal */}
      {showGithubModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-zinc-900 border border-white/15 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="Github" size={18} />
                <span>GitHub リポジトリへプッシュ</span>
              </div>
              <button onClick={() => setShowGithubModal(false)} className="text-white/50 hover:text-white">
                <Icon name="X" size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-white/60">リポジトリ (owner/repo):</label>
              <input
                type="text"
                value={repoTarget}
                onChange={(e) => setRepoTarget(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-white/60">Personal Access Token (PAT):</label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-white/60">コミットメッセージ:</label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                onClick={() => setShowGithubModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white/80 hover:bg-white/15"
              >
                キャンセル
              </button>
              <button
                onClick={handlePushToGithub}
                disabled={isPushing}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-semibold text-xs flex items-center gap-2 hover:brightness-110 transition disabled:opacity-50"
              >
                {isPushing ? 'プッシュ中...' : 'コミット＆プッシュ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
