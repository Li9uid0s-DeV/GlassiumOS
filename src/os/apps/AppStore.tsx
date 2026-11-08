import React, { useState, useMemo, useRef } from 'react';
import { useOS } from '../OSContext';
import { StoreApp, StoreTheme } from '../types';
import { Icon } from '../Icon';
import { DEFAULT_SAMPLE_TSX_CODE } from './GlassiumOfficeSuite';

type StoreNavId =
  | 'home'
  | 'office'
  | 'audio'
  | 'apps'
  | 'games'
  | 'themes'
  | 'tsx'
  | 'custom'
  | 'library';

const CUSTOM_ICONS = [
  'Globe',
  'Gamepad2',
  'Code',
  'Music',
  'Terminal',
  'FileText',
  'Cpu',
  'Cloud',
];

function convertToJsDelivr(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const blobMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i
  );
  if (blobMatch) {
    const [, user, repo, branch, filePath] = blobMatch;
    return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${filePath}`;
  }
  const rawMatch = trimmed.match(
    /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i
  );
  if (rawMatch) {
    const [, user, repo, branch, filePath] = rawMatch;
    return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${filePath}`;
  }
  return trimmed;
}

export function AppStoreApp() {
  const {
    storeCatalog,
    installedApps,
    installApp,
    uninstallApp,
    launchInstalledApp,
    isInstalled,
    storeThemes,
    currentThemeId,
    installTheme,
    uninstallTheme,
    applyThemeConfig,
    isThemeInstalled,
    theme,
    resolvedAccentHex,
    playSound,
  } = useOS();

  const isLight = theme === 'light';
  const [nav, setNav] = useState<StoreNavId>('home');
  const [query, setQuery] = useState('');

  // Download Progress Bar State (id -> 0..100%)
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadStage, setDownloadStage] = useState<Record<string, string>>({});

  // TSX App Upload State
  const [tsxAppName, setTsxAppName] = useState('マイ Glassium アプリ');
  const [tsxAppAuthor, setTsxAppAuthor] = useState('Developer');
  const [tsxAppDesc, setTsxAppDesc] = useState('GlassiumOS 用に作成された .tsx アプリ');
  const [tsxSourceCode, setTsxSourceCode] = useState(DEFAULT_SAMPLE_TSX_CODE);
  const [tsxFileName, setTsxFileName] = useState('CustomApp.tsx');
  const [tsxStatusBanner, setTsxStatusBanner] = useState('');
  const tsxFileInputRef = useRef<HTMLInputElement>(null);

  // Custom Web App Form State
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCategory] = useState<'utilities' | 'games'>('utilities');
  const [customIcon, setCustomIcon] = useState('Globe');
  const [useJsDelivr, setUseJsDelivr] = useState(true);
  const [customSuccess, setCustomSuccess] = useState('');

  // Simulated realistic progressive download bar (0% -> 100%)
  const startDownloadWithProgress = (id: string, onDone: () => void) => {
    if (downloadProgress[id] !== undefined) return;
    playSound('click');
    setDownloadProgress((prev) => ({ ...prev, [id]: 4 }));
    setDownloadStage((prev) => ({ ...prev, [id]: 'パッケージを取得中...' }));

    let current = 4;
    const timer = window.setInterval(() => {
      current += Math.floor(14 + Math.random() * 18);
      if (current >= 100) {
        window.clearInterval(timer);
        setDownloadProgress((prev) => ({ ...prev, [id]: 100 }));
        setDownloadStage((prev) => ({ ...prev, [id]: 'インストール完了' }));
        window.setTimeout(() => {
          onDone();
          setDownloadProgress((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          setDownloadStage((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 260);
      } else {
        setDownloadProgress((prev) => ({ ...prev, [id]: current }));
        setDownloadStage((prev) => ({
          ...prev,
          [id]: current < 70 ? `ダウンロード中 (${current}%)` : `展開・登録中 (${current}%)`,
        }));
      }
    }, 130);
  };

  const handleInstallApp = (app: StoreApp) => {
    startDownloadWithProgress(app.id, () => {
      installApp(app);
    });
  };

  const handleInstallTheme = (t: StoreTheme) => {
    startDownloadWithProgress(t.id, () => {
      installTheme(t.id);
      applyThemeConfig(t.id);
    });
  };

  const handleTsxFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTsxFileName(file.name);
    const cleanTitle = file.name.replace(/\.(tsx|ts|jsx|js)$/i, '');
    if (cleanTitle) setTsxAppName(cleanTitle);

    const reader = new FileReader();
    reader.onload = () => {
      setTsxSourceCode(String(reader.result || ''));
      setTsxStatusBanner(`${file.name} を読み込みました`);
    };
    reader.readAsText(file);
  };

  const handlePublishTsxApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tsxAppName.trim() || !tsxSourceCode.trim()) return;
    const newId = `tsx-${Date.now()}`;
    const newStoreApp: StoreApp = {
      id: newId,
      name: tsxAppName.trim(),
      author: tsxAppAuthor.trim() || 'Developer',
      description: tsxAppDesc.trim() || 'GlassiumOS 用 .tsx アプリケーション',
      category: 'utilities',
      icon: 'tsxrunner',
      rating: 5.0,
      size: `${Math.max(1, Math.round(tsxSourceCode.length / 1024))} KB`,
      version: '5.0 u4',
      tsxSource: tsxSourceCode,
      fileName: tsxFileName,
    };

    startDownloadWithProgress('tsx-upload-btn', () => {
      installApp(newStoreApp);
      launchInstalledApp(newId);
      setTsxStatusBanner(`「${newStoreApp.name}」をインストールして起動しました`);
    });
  };

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) return;
    let url = customUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (useJsDelivr) url = convertToJsDelivr(url);

    startDownloadWithProgress('custom-web-btn', () => {
      installApp({
        id: `custom-${Date.now()}`,
        name: customName.trim(),
        url,
        description: customDesc.trim() || `Web Application (${url})`,
        author: 'Custom Package',
        category: customCategory,
        icon: customIcon,
      });
      setCustomName('');
      setCustomUrl('');
      setCustomDesc('');
      setCustomSuccess('Webアプリを追加しました');
      setTimeout(() => setCustomSuccess(''), 3000);
    });
  };

  const filteredCatalog = useMemo(() => {
    return storeCatalog.filter((app) => {
      if (nav === 'office' && app.category !== 'office') return false;
      if (nav === 'audio' && app.category !== 'audio') return false;
      if (nav === 'games' && app.category !== 'games') return false;
      if (nav === 'apps' && app.category === 'games') return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          app.name.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q) ||
          app.author.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [storeCatalog, nav, query]);

  const officeApps = useMemo(
    () => storeCatalog.filter((a) => a.category === 'office' || a.category === 'audio'),
    [storeCatalog]
  );

  // Render Microsoft Store-style App Card with animated Download Progress Bar
  const renderAppCard = (app: StoreApp) => {
    const installed = isInstalled(app.id);
    const prog = downloadProgress[app.id];
    const isDownloading = prog !== undefined;

    return (
      <div
        key={app.id}
        className={`rounded-2xl p-4 border transition flex flex-col justify-between gap-3 ${
          isLight
            ? 'bg-white border-slate-200/80 shadow-xs hover:shadow-md'
            : 'apple-liquid-glass border-white/12 hover:border-white/25'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white/[0.06] border border-white/10">
            <Icon name={app.builtInAppId || app.icon} size={32} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-bold truncate">{app.name}</h3>
              <span className="text-[10px] font-mono opacity-55 shrink-0">★ {app.rating}</span>
            </div>
            <div className="text-[11px] opacity-55 truncate">{app.author}</div>
            <p className="text-xs opacity-75 line-clamp-2 mt-1 leading-relaxed">
              {app.description}
            </p>
          </div>
        </div>

        {/* Animated Download Progress Bar when installing */}
        {isDownloading ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span style={{ color: resolvedAccentHex }} className="font-bold">
                {downloadStage[app.id] || 'ダウンロード中...'}
              </span>
              <span className="opacity-70">{prog}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${prog}%`,
                  backgroundColor: resolvedAccentHex,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
            <span className="text-[10px] font-mono opacity-50">
              {app.size} · v{app.version}
            </span>
            <div className="flex items-center gap-1.5">
              {installed ? (
                <>
                  <button
                    type="button"
                    onClick={() => launchInstalledApp(app.id)}
                    style={{ backgroundColor: resolvedAccentHex }}
                    className="px-3.5 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs hover:opacity-95 transition"
                  >
                    開く
                  </button>
                  <button
                    type="button"
                    onClick={() => uninstallApp(app.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs opacity-75 hover:opacity-100 transition"
                  >
                    削除
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleInstallApp(app)}
                  style={{ backgroundColor: resolvedAccentHex }}
                  className="px-4 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs hover:opacity-95 transition"
                >
                  入手
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`h-full w-full flex overflow-hidden select-none ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0c0f16] text-white'
      }`}
    >
      {/* ===================================================================
          LEFT RAIL (Microsoft Store Vertical Navigation Rail)
         =================================================================== */}
      <aside
        className={`w-52 border-r flex flex-col justify-between p-2.5 shrink-0 ${
          isLight ? 'bg-white border-slate-200' : 'apple-liquid-glass border-white/10'
        }`}
      >
        <div className="space-y-1">
          <div className="px-3 py-2 flex items-center gap-2.5 mb-2">
            <div
              style={{ backgroundColor: resolvedAccentHex }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow"
            >
              <Icon name="ShoppingBag" size={16} />
            </div>
            <div>
              <div className="text-xs font-extrabold tracking-tight">Glassium Store</div>
              <div className="text-[10px] opacity-50 font-mono">GlassiumOS 5 u4</div>
            </div>
          </div>

          {(
            [
              { id: 'home', label: 'ホーム', icon: 'Home' },
              { id: 'office', label: 'オフィス (Sheet/Stage/Note)', icon: 'glassexcel' },
              { id: 'audio', label: '立体音響 & EQ', icon: 'sonicstudio' },
              { id: 'apps', label: 'すべてのアプリ', icon: 'LayoutGrid' },
              { id: 'games', label: 'ゲーム', icon: 'Gamepad2' },
              { id: 'themes', label: 'テーマ & 外観', icon: 'Palette' },
              { id: 'tsx', label: '.tsx アプリを公開/追加', icon: 'tsxrunner' },
              { id: 'custom', label: 'Webアプリ追加', icon: 'Globe' },
              { id: 'library', label: `ライブラリ (${installedApps.length})`, icon: 'FolderOpen' },
            ] as { id: StoreNavId; label: string; icon: string }[]
          ).map((item) => {
            const active = nav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  playSound('click');
                  setNav(item.id);
                }}
                style={
                  active
                    ? {
                        backgroundColor: `${resolvedAccentHex}24`,
                        borderLeft: `3px solid ${resolvedAccentHex}`,
                      }
                    : undefined
                }
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
                  active ? '' : 'opacity-70 hover:opacity-100 hover:bg-white/[0.06]'
                }`}
              >
                <Icon name={item.icon} size={15} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[10px] opacity-65 space-y-0.5">
          <div className="font-bold">GlassiumOS 5 u4 Store</div>
          <div>.tsx コンポーネント実行対応</div>
        </div>
      </aside>

      {/* ===================================================================
          RIGHT MAIN STAGE (Microsoft Store Header + Content)
         =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Search Bar */}
        <header
          className={`px-6 py-3 border-b flex items-center justify-between gap-4 shrink-0 ${
            isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/10'
          }`}
        >
          <div className="flex items-center gap-2 max-w-md w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-1.5">
            <Icon name="Search" size={14} className="opacity-50" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (nav !== 'apps' && nav !== 'home') setNav('apps');
              }}
              placeholder="アプリ、オフィス、立体音響、テーマを検索..."
              className="w-full bg-transparent text-xs outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-xs opacity-60">
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNav('tsx')}
              style={{ backgroundColor: resolvedAccentHex }}
              className="px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow flex items-center gap-1.5"
            >
              <Icon name="Code" size={14} />
              <span>.tsx アプリをアップロード</span>
            </button>
          </div>
        </header>

        {/* Scrollable Store Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* 1. HOME VIEW (Microsoft Store Hero Banner + Featured Office & Audio Suite + Catalog) */}
          {nav === 'home' && (
            <>
              {/* Hero Banner */}
              <div className="relative rounded-3xl overflow-hidden border border-white/20 bg-gradient-to-r from-indigo-900 via-slate-900 to-cyan-950 p-7 sm:p-8 text-white shadow-2xl">
                <div className="max-w-2xl space-y-3 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/15 text-[11px] font-mono font-bold">
                    <span>NEW IN GLASSIUMOS 5 u4</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                    Glassium Office &amp; Sonic 3D スイート
                  </h1>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                    表計算「Glassium Sheet」、プレゼン「Glassium Stage」、デジタルノート「Glassium Note」、およびOS全体の音を立体音響・10バンドEQで調整する「Glassium Sonic 3D」をApp Storeからプログレスバー付きでダウンロードして利用できます。
                  </p>
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setNav('office')}
                      style={{ backgroundColor: resolvedAccentHex }}
                      className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-lg"
                    >
                      オフィススイートを入手
                    </button>
                    <button
                      type="button"
                      onClick={() => setNav('tsx')}
                      className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold"
                    >
                      自作 .tsx アプリを追加
                    </button>
                  </div>
                </div>
              </div>

              {/* Section: Glassium Office & Sonic 3D */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold">
                      注目: オフィス &amp; 3Dオーディオ (GlassiumOS 5 u4)
                    </h2>
                    <p className="text-xs opacity-60">
                      Excel / PowerPoint / OneNote 互換スイートと OS全体立体音響・EQ（ダウンロード後にデスクトップとスタートメニューへ追加されます）
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {officeApps.map(renderAppCard)}
                </div>
              </section>

              {/* Section: All Apps */}
              <section className="space-y-3">
                <h2 className="text-base sm:text-lg font-extrabold">すべてのアプリ &amp; ゲーム</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCatalog.map(renderAppCard)}
                </div>
              </section>
            </>
          )}

          {/* 2. CATEGORY VIEWS (Office / Audio / Apps / Games) */}
          {(nav === 'office' || nav === 'audio' || nav === 'apps' || nav === 'games') && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">
                  {nav === 'office'
                    ? 'Glassium Office (Sheet / Stage / Note)'
                    : nav === 'audio'
                    ? '立体音響 & イコライザー (Glassium Sonic 3D)'
                    : nav === 'games'
                    ? 'ゲーム'
                    : 'すべてのアプリケーション'}
                </h1>
                <p className="text-xs opacity-60 mt-0.5">
                  「入手」ボタンを押すとプログレスバー付きでダウンロード・インストールされます
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCatalog.map(renderAppCard)}
              </div>
            </section>
          )}

          {/* 3. THEMES VIEW */}
          {nav === 'themes' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">テーマ &amp; 外観プリセット</h1>
                <p className="text-xs opacity-60 mt-0.5">
                  シェルレイアウトと壁紙テーマをダウンロードして適用します
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {storeThemes.map((t) => {
                  const installed = isThemeInstalled(t.id);
                  const isCurrent = currentThemeId === t.id;
                  const prog = downloadProgress[t.id];
                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl p-4 apple-liquid-glass border border-white/12 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-16 h-12 rounded-xl bg-gradient-to-br ${t.previewGradient} border border-white/20 shrink-0`}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{t.name}</div>
                          <div className="text-xs opacity-65 truncate">{t.descriptionJa}</div>
                        </div>
                      </div>

                      {prog !== undefined ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span style={{ color: resolvedAccentHex }}>
                              {downloadStage[t.id] || 'ダウンロード中...'}
                            </span>
                            <span>{prog}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-150"
                              style={{ width: `${prog}%`, backgroundColor: resolvedAccentHex }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                          {installed ? (
                            <>
                              <button
                                type="button"
                                onClick={() => applyThemeConfig(t.id)}
                                style={{ backgroundColor: resolvedAccentHex }}
                                className="px-3.5 py-1.5 rounded-lg text-white text-xs font-bold"
                              >
                                {isCurrent ? '適用中' : '適用'}
                              </button>
                              <button
                                type="button"
                                onClick={() => uninstallTheme(t.id)}
                                className="px-3 py-1.5 rounded-lg bg-white/10 text-xs"
                              >
                                削除
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInstallTheme(t)}
                              style={{ backgroundColor: resolvedAccentHex }}
                              className="px-4 py-1.5 rounded-lg text-white text-xs font-bold"
                            >
                              入手して適用
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. UPLOAD & PUBLISH .TSX APP FOR GLASSIUMOS */}
          {nav === 'tsx' && (
            <section className="max-w-3xl space-y-5">
              <div className="border-b border-white/10 pb-3">
                <h1 className="text-xl font-extrabold">
                  GlassiumOS 用 .tsx アプリのアップロード・登録
                </h1>
                <p className="text-xs opacity-65 mt-1">
                  React / TypeScript (`.tsx`) で作成されたアプリケーションファイルをアップロードするか、コードを貼り付けて GlassiumOS のネイティブアプリとして追加・起動できます。
                </p>
              </div>

              <form onSubmit={handlePublishTsxApp} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">アプリ名</label>
                    <input
                      required
                      value={tsxAppName}
                      onChange={(e) => setTsxAppName(e.target.value)}
                      className="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3 py-2 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">制作者名</label>
                    <input
                      value={tsxAppAuthor}
                      onChange={(e) => setTsxAppAuthor(e.target.value)}
                      className="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3 py-2 text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">アプリの説明</label>
                  <input
                    value={tsxAppDesc}
                    onChange={(e) => setTsxAppDesc(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold">
                    .tsx ファイルを選択 または 下のエディタにコードを入力
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={tsxFileInputRef}
                      type="file"
                      accept=".tsx,.ts,.jsx,.js"
                      onChange={handleTsxFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => tsxFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      ファイルを選択 (.tsx)
                    </button>
                  </div>
                </div>

                <textarea
                  value={tsxSourceCode}
                  onChange={(e) => setTsxSourceCode(e.target.value)}
                  rows={11}
                  spellCheck={false}
                  className="w-full rounded-2xl bg-black/50 border border-white/15 p-4 text-xs font-mono text-emerald-300 outline-none"
                />

                {downloadProgress['tsx-upload-btn'] !== undefined && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span style={{ color: resolvedAccentHex }}>
                        {downloadStage['tsx-upload-btn'] || 'パッケージ登録中...'}
                      </span>
                      <span>{downloadProgress['tsx-upload-btn']}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-150"
                        style={{
                          width: `${downloadProgress['tsx-upload-btn']}%`,
                          backgroundColor: resolvedAccentHex,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-mono text-emerald-400">{tsxStatusBanner}</span>
                  <button
                    type="submit"
                    style={{ backgroundColor: resolvedAccentHex }}
                    className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-lg"
                  >
                    ストアに登録して起動
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* 5. CUSTOM WEB APP VIEW */}
          {nav === 'custom' && (
            <section className="max-w-2xl space-y-4">
              <h1 className="text-xl font-extrabold">Web アプリケーション追加</h1>
              <form onSubmit={handleAddCustomApp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">アプリ名</label>
                  <input
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="例: My Web App"
                    className="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">URL</label>
                  <input
                    required
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3 py-2 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">説明</label>
                  <input
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {CUSTOM_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setCustomIcon(ic)}
                      style={
                        customIcon === ic
                          ? { borderColor: resolvedAccentHex, backgroundColor: `${resolvedAccentHex}25` }
                          : undefined
                      }
                      className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center"
                    >
                      <Icon name={ic} size={18} />
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={useJsDelivr}
                    onChange={(e) => setUseJsDelivr(e.target.checked)}
                  />
                  <span>GitHub URLをjsDelivr CDNへ自動変換する</span>
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400">{customSuccess}</span>
                  <button
                    type="submit"
                    style={{ backgroundColor: resolvedAccentHex }}
                    className="px-5 py-2 rounded-xl text-white text-xs font-bold"
                  >
                    インストール
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* 6. LIBRARY VIEW */}
          {nav === 'library' && (
            <section className="space-y-4">
              <h1 className="text-xl font-extrabold">
                インストール済みライブラリ ({installedApps.length}件)
              </h1>
              {installedApps.length === 0 ? (
                <div className="py-12 text-center text-xs opacity-55">
                  インストール済みのアプリはまだありません
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {installedApps.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-2xl p-4 apple-liquid-glass border border-white/12 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                          <Icon name={app.builtInAppId || app.icon} size={28} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{app.name}</div>
                          <div className="text-[11px] opacity-60 truncate">{app.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => launchInstalledApp(app.id)}
                          style={{ backgroundColor: resolvedAccentHex }}
                          className="px-3.5 py-1.5 rounded-lg text-white text-xs font-bold"
                        >
                          起動
                        </button>
                        <button
                          type="button"
                          onClick={() => uninstallApp(app.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 text-xs"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
