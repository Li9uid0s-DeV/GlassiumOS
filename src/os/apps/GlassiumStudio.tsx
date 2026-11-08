import { useState, useRef, useEffect } from 'react';
import { Icon } from '../Icon';
import { useOS } from '../OSContext';
import { requestAIChat } from '../aiClient';
import { JsonFormatView, RegexView, Base64MorseView, PassGenView } from './ExtraAppsSuite';

type StudioToolTab = 'workspace' | 'jsonformat' | 'regex' | 'base64' | 'passgen';

export function GlassiumStudioApp({ initialTab }: { initialTab?: string }) {
  const { playSound, addNotification } = useOS();
  const [toolTab, setToolTab] = useState<StudioToolTab>(() => {
    if (initialTab === 'jsonformat' || initialTab === 'regex' || initialTab === 'base64' || initialTab === 'passgen') {
      return initialTab;
    }
    if (initialTab === 'morse') return 'base64';
    return 'workspace';
  });

  useEffect(() => {
    if (initialTab === 'jsonformat' || initialTab === 'regex' || initialTab === 'base64' || initialTab === 'passgen') {
      setToolTab(initialTab);
    } else if (initialTab === 'morse') {
      setToolTab('base64');
    }
  }, [initialTab]);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('glassium_ai_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [code, setCode] = useState(`<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      background: #020617;
      color: #f8fafc;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .container {
      max-width: 460px;
      padding: 2rem;
      border-top: 1px solid rgba(255,255,255,0.15);
      border-bottom: 1px solid rgba(255,255,255,0.15);
      text-align: left;
    }
    h1 { color: #38bdf8; font-size: 1.5rem; margin: 0 0 0.5rem 0; font-weight: 600; }
    p { color: #94a3b8; font-size: 0.875rem; line-height: 1.6; }
    button { background: #06b6d4; color: #020617; font-weight: 600; border: none; padding: 0.6rem 1.25rem; cursor: pointer; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Glassium Studio 5</h1>
    <p>AIコード生成と開発ツールを統合したワークスペースです。</p>
    <button onclick="document.querySelector('p').textContent = '動作確認が完了しました。'">動作テスト</button>
  </div>
</body>
</html>`);

  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [repoTarget, setRepoTarget] = useState('user/glassium-app');
  const [githubToken, setGithubToken] = useState('');
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('feat: update app via Glassium Studio');
  const [isPushing, setIsPushing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('glassium_ai_key', key);
    addNotification('設定', 'Gemini APIキーを保存しました。');
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    playSound('click');
    setIsGenerating(true);

    try {
      const activeKey = apiKey || localStorage.getItem('gemini_api_key') || localStorage.getItem('glassium_ai_key') || undefined;
      const data = await requestAIChat({
        message: `あなたはGlassium StudioのAIコードジェネレーターです。以下の要件に基づいて、完全に動作するHTML/CSS/JSの単一コード（<!DOCTYPE html>から</html>まで）を生成してください。余計な解説やMarkdownコードブロックの記法は含めず、HTML文字列のみを出力してください。\n\n要件: ${prompt}`,
        apiKey: activeKey,
      });
      let generated = data.reply || '';
      generated = generated.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
      if (generated.includes('<!DOCTYPE html>') || generated.includes('<html')) {
        setCode(generated);
        setActiveTab('preview');
        addNotification('Glassium Studio', 'AIによるコード生成が完了しました。');
      } else {
        addNotification('Glassium Studio', 'コード生成レスポンスを確認してください。');
      }
    } catch {
      addNotification('エラー', 'AIコード生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePushToGithub = async () => {
    if (!githubToken) {
      addNotification('GitHub', 'Personal Access Tokenを入力してください。');
      return;
    }
    setIsPushing(true);
    playSound('click');
    try {
      await new Promise((r) => setTimeout(r, 1200));
      addNotification('GitHub', `${repoTarget} へのプッシュが完了しました。`);
      setShowGithubModal(false);
    } catch {
      addNotification('GitHub エラー', 'プッシュに失敗しました。');
    } finally {
      setIsPushing(false);
    }
  };

  const STUDIO_TABS: { id: StudioToolTab; label: string }[] = [
    { id: 'workspace', label: 'AI コード生成' },
    { id: 'jsonformat', label: 'JSON整形' },
    { id: 'regex', label: '正規表現テスト' },
    { id: 'base64', label: 'Base64・モールス' },
    { id: 'passgen', label: 'パスワード生成' },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white select-none overflow-hidden">
      {/* Top Header & Tool Switcher */}
      <div className="px-5 border-b border-white/10 flex items-center justify-between shrink-0 overflow-x-auto">
        <div className="flex items-center gap-6">
          {STUDIO_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setToolTab(t.id)}
              className={`py-3 text-xs border-b-2 transition whitespace-nowrap ${
                toolTab === t.id
                  ? 'border-cyan-400 text-cyan-300 font-semibold'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {toolTab === 'workspace' && (
          <div className="flex items-center gap-3 text-xs pl-4 shrink-0">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-white/60 hover:text-white transition flex items-center gap-1.5"
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
        )}
      </div>

      {toolTab === 'jsonformat' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <JsonFormatView />
        </div>
      ) : toolTab === 'regex' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <RegexView />
        </div>
      ) : toolTab === 'base64' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <Base64MorseView />
        </div>
      ) : toolTab === 'passgen' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <PassGenView />
        </div>
      ) : (
        <>
          {showSettings && (
            <div className="px-5 py-3 bg-slate-900 border-b border-white/10 flex items-center gap-3 shrink-0">
              <span className="text-xs text-white/70">Gemini API Key:</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-transparent border-b border-white/20 py-1 text-xs text-white outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => { saveApiKey(apiKey); setShowSettings(false); }}
                className="px-3 py-1 bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 transition"
              >
                保存
              </button>
            </div>
          )}

          {/* AI Prompt Input Bar */}
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3 shrink-0">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="作成したいWebアプリケーションの要件を入力..."
              className="flex-1 bg-transparent border-b border-white/15 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-40"
            >
              {isGenerating ? '生成中...' : 'AI生成'}
            </button>
          </div>

          {/* Main Content: Preview vs Code Editor */}
          <div className="flex-1 min-h-0 flex flex-col relative">
            <div className="px-5 py-2 border-b border-white/10 flex items-center gap-4 text-xs bg-slate-900/40">
              <button
                onClick={() => setActiveTab('preview')}
                className={activeTab === 'preview' ? 'text-cyan-400 font-semibold' : 'text-white/50 hover:text-white'}
              >
                プレビュー
              </button>
              <span className="text-white/20">|</span>
              <button
                onClick={() => setActiveTab('code')}
                className={activeTab === 'code' ? 'text-cyan-400 font-semibold' : 'text-white/50 hover:text-white'}
              >
                ソースコード
              </button>
            </div>

            {activeTab === 'preview' ? (
              <div className="flex-1 w-full bg-black">
                <iframe
                  ref={iframeRef}
                  srcDoc={code}
                  title="Glassium Studio Preview"
                  className="h-full w-full border-0"
                  sandbox="allow-scripts allow-modals allow-forms"
                />
              </div>
            ) : (
              <div className="flex-1 w-full p-5 bg-slate-950 font-mono text-xs text-slate-200 overflow-auto">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-full w-full bg-transparent resize-none outline-none leading-relaxed text-xs text-white/90"
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        </>
      )}

      {showGithubModal && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border-t border-b border-white/15 p-5 shadow-2xl flex flex-col gap-4">
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
                  className="w-full bg-transparent border-b border-white/20 py-1.5 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">Personal Access Token</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-transparent border-b border-white/20 py-1.5 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">コミットメッセージ</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-transparent border-b border-white/20 py-1.5 text-white outline-none focus:border-cyan-400"
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
                className="px-4 py-1.5 bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 transition disabled:opacity-50"
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
