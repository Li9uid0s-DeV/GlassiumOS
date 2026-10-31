import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from '../OSContext';
import { StoreApp, StoreTheme } from '../types';
import { Icon } from '../Icon';

type StoreSection = 'apps' | 'themes' | 'custom' | 'installed';

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
  const blobMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if (blobMatch) {
    const [, user, repo, branch, filePath] = blobMatch;
    return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${filePath}`;
  }
  const rawMatch = trimmed.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i);
  if (rawMatch) {
    const [, user, repo, branch, filePath] = rawMatch;
    return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${filePath}`;
  }
  const treeMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/?(.*)$/i);
  if (treeMatch) {
    const [, user, repo, branch, folderPath] = treeMatch;
    const cleanPath = folderPath ? `${folderPath.replace(/\/$/, '')}/index.html` : 'index.html';
    return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${cleanPath}`;
  }
  const repoMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/i);
  if (repoMatch) {
    const [, user, repo] = repoMatch;
    return `https://cdn.jsdelivr.net/gh/${user}/${repo}@main/index.html`;
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
    playSound,
  } = useOS();

  const isLight = theme === 'light';
  const [section, setSection] = useState<StoreSection>('apps');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'utilities' | 'games'>('all');
  const [query, setQuery] = useState('');
  const [installingId, setInstallingId] = useState<string | null>(null);

  // Custom Web App Form
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCategory, setCustomCategory] = useState<'utilities' | 'games'>('utilities');
  const [customIcon, setCustomIcon] = useState('Globe');
  const [useJsDelivr, setUseJsDelivr] = useState(true);
  const [customSuccess, setCustomSuccess] = useState('');

  const filteredApps = useMemo(() => {
    return storeCatalog.filter((app) => {
      if (categoryFilter !== 'all' && app.category !== categoryFilter) return false;
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
  }, [storeCatalog, categoryFilter, query]);

  const filteredThemes = useMemo(() => {
    return storeThemes.filter((t) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.nameJa.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [storeThemes, query]);

  const handleInstallApp = (app: StoreApp) => {
    setInstallingId(app.id);
    setTimeout(() => {
      installApp(app);
      setInstallingId(null);
    }, 350);
  };

  const handleInstallTheme = (t: StoreTheme) => {
    setInstallingId(t.id);
    setTimeout(() => {
      installTheme(t.id);
      applyThemeConfig(t.id);
      setInstallingId(null);
    }, 350);
  };

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) return;
    let url = customUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (useJsDelivr) url = convertToJsDelivr(url);

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
  };

  const rowClass = `rounded-xl p-3.5 border flex items-center justify-between gap-4 transition-colors duration-150 ${
    isLight
      ? 'bg-white border-slate-200/90 hover:border-slate-300'
      : 'bg-slate-900/55 border-white/10 hover:border-white/20'
  }`;

  const btnPrimary =
    'px-3.5 py-1.5 rounded-lg os-accent-bg text-xs font-semibold transition hover:opacity-90 active:scale-95';

  const btnSecondary = `px-3 py-1.5 rounded-lg border text-xs font-medium transition active:scale-95 ${
    isLight
      ? 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
      : 'bg-white/[0.05] border-white/10 text-white/85 hover:bg-white/10'
  }`;

  return (
    <div
      className={`h-full w-full flex flex-col overflow-hidden select-none transition-colors duration-200 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950/60 text-white'
      }`}
    >
      {/* Top Unified Flat Navigation Header */}
      <div
        className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-white/10'
        }`}
      >
        <div className="flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: 'apps', label: 'アプリケーション', icon: 'LayoutGrid' },
              { id: 'themes', label: 'テーマ & 外観', icon: 'Palette' },
              { id: 'custom', label: 'Webアプリ追加', icon: 'Plus' },
              { id: 'installed', label: `管理 (${installedApps.length})`, icon: 'FolderOpen' },
            ] as const
          ).map((tab) => {
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playSound('click');
                  setSection(tab.id);
                }}
                className={`relative px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition shrink-0 ${
                  active
                    ? isLight
                      ? 'bg-slate-900/8 text-slate-900 font-semibold'
                      : 'bg-white/10 text-white font-semibold'
                    : 'opacity-65 hover:opacity-100'
                }`}
              >
                <Icon name={tab.icon} size={14} className={active ? 'os-accent-text' : ''} />
                <span>{tab.label}</span>
                {active && (
                  <motion.span
                    layoutId="store-tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-0.5 os-accent-bg rounded-full"
                    transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        {(section === 'apps' || section === 'themes') && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 w-full sm:w-56 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-white/10'
            }`}
          >
            <Icon name="Search" size={13} className="opacity-50 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="パッケージを検索..."
              className="w-full bg-transparent text-xs outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="opacity-50 hover:opacity-100">
                <Icon name="X" size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {/* ==============================================================
                1. APPLICATIONS CATALOG (Unified Flat List)
               ============================================================== */}
            {section === 'apps' && (
              <motion.div
                key="store-apps"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-sm font-bold">Applications Catalog</h2>
                    <p className="text-xs opacity-55">
                      標準ユーティリティおよびゲームパッケージ ({filteredApps.length} 件)
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'すべて' },
                        { id: 'utilities', label: 'ユーティリティ' },
                        { id: 'games', label: 'ゲーム' },
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryFilter(cat.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                          categoryFilter === cat.id
                            ? 'os-accent-soft border font-semibold'
                            : isLight
                            ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            : 'bg-white/[0.03] border-white/10 text-white/65 hover:bg-white/[0.08]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredApps.map((app) => {
                    const installed = isInstalled(app.id);
                    const busy = installingId === app.id;
                    return (
                      <motion.div key={app.id} layout className={rowClass}>
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 flex items-center justify-center shrink-0">
                            <Icon name={app.builtInAppId || app.icon} size={32} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold truncate">{app.name}</span>
                              <span className="text-[11px] opacity-45 font-mono">v{app.version}</span>
                            </div>
                            <div className="text-xs opacity-65 truncate mt-0.5">{app.description}</div>
                            <div className="text-[10px] opacity-45 mt-0.5">
                              {app.author} · {app.size}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {installed ? (
                            <>
                              <button
                                type="button"
                                onClick={() => launchInstalledApp(app.id)}
                                className={btnPrimary}
                              >
                                開く
                              </button>
                              <button
                                type="button"
                                onClick={() => uninstallApp(app.id)}
                                className={btnSecondary}
                              >
                                削除
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleInstallApp(app)}
                              className={btnPrimary}
                            >
                              {busy ? '追加中...' : '入手'}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ==============================================================
                2. OS THEMES CATALOG (Unified Flat List)
               ============================================================== */}
            {section === 'themes' && (
              <motion.div
                key="store-themes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="space-y-3"
              >
                <div className="mb-2">
                  <h2 className="text-sm font-bold">System Themes & Presets</h2>
                  <p className="text-xs opacity-55">
                    シェルレイアウト・壁紙・透過度をワンクリックで切り替えます
                  </p>
                </div>

                <div className="space-y-2">
                  {filteredThemes.map((t) => {
                    const installed = isThemeInstalled(t.id);
                    const isCurrent = currentThemeId === t.id;
                    const busy = installingId === t.id;
                    return (
                      <div key={t.id} className={rowClass}>
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-12 h-10 rounded-lg bg-gradient-to-br ${t.previewGradient} border border-white/15 shrink-0`}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold truncate">{t.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-mono os-accent-text">● 適用中</span>
                              )}
                            </div>
                            <div className="text-xs opacity-65 truncate mt-0.5">{t.descriptionJa}</div>
                            <div className="text-[10px] opacity-45 mt-0.5">
                              Shell: {t.config.shellMode.toUpperCase()} · {t.author}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {installed ? (
                            <>
                              <button
                                type="button"
                                onClick={() => applyThemeConfig(t.id)}
                                className={isCurrent ? btnSecondary : btnPrimary}
                              >
                                {isCurrent ? '再適用' : '適用'}
                              </button>
                              <button
                                type="button"
                                onClick={() => uninstallTheme(t.id)}
                                className={btnSecondary}
                              >
                                削除
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleInstallTheme(t)}
                              className={btnPrimary}
                            >
                              {busy ? '適用中...' : '入手して適用'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ==============================================================
                3. CUSTOM WEB APP INSTALLER
               ============================================================== */}
            {section === 'custom' && (
              <motion.div
                key="store-custom"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
              >
                <form
                  onSubmit={handleAddCustomApp}
                  className={`rounded-xl p-5 border space-y-4 ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900/55 border-white/10'
                  }`}
                >
                  <div>
                    <h2 className="text-sm font-bold">Web Application Installer</h2>
                    <p className="text-xs opacity-55 mt-0.5">
                      任意のWebサイトURLまたはGitHubリポジトリをネイティブウィンドウアプリとして追加します。
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 opacity-80">アプリ名</label>
                      <input
                        type="text"
                        required
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="例: Docs Viewer"
                        className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 text-slate-900'
                            : 'bg-slate-950/60 border-white/15 text-white'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1 opacity-80">カテゴリ</label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value as 'utilities' | 'games')}
                        className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 text-slate-900'
                            : 'bg-slate-950/60 border-white/15 text-white'
                        }`}
                      >
                        <option value="utilities">Utilities (ツール)</option>
                        <option value="games">Games (ゲーム)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-80">
                      URL または GitHub リポジトリ URL
                    </label>
                    <input
                      type="text"
                      required
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://example.com または https://github.com/user/repo"
                      className={`w-full rounded-lg border px-3 py-2 text-xs font-mono outline-none ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-slate-950/60 border-white/15 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-80">説明 (任意)</label>
                    <input
                      type="text"
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      placeholder="アプリの簡単な説明"
                      className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-slate-950/60 border-white/15 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 opacity-80">アイコン</label>
                    <div className="flex flex-wrap gap-2">
                      {CUSTOM_ICONS.map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setCustomIcon(ic)}
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center transition ${
                            customIcon === ic
                              ? 'os-accent-soft border'
                              : isLight
                              ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                              : 'bg-white/[0.04] border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Icon name={ic} size={18} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-500/15">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useJsDelivr}
                        onChange={(e) => setUseJsDelivr(e.target.checked)}
                      />
                      <span>GitHub URLをjsDelivr CDNへ自動変換する</span>
                    </label>

                    <div className="flex items-center gap-3">
                      {customSuccess && (
                        <span className="text-xs os-accent-text font-medium">{customSuccess}</span>
                      )}
                      <button type="submit" className={btnPrimary}>
                        インストール
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ==============================================================
                4. INSTALLED PACKAGES
               ============================================================== */}
            {section === 'installed' && (
              <motion.div
                key="store-installed"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="space-y-3"
              >
                <div className="mb-2">
                  <h2 className="text-sm font-bold">Installed Packages</h2>
                  <p className="text-xs opacity-55">
                    ストアから追加されたアプリケーションの管理 ({installedApps.length} 件)
                  </p>
                </div>

                {installedApps.length === 0 ? (
                  <div
                    className={`rounded-xl p-10 border text-center text-xs opacity-55 ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900/55 border-white/10'
                    }`}
                  >
                    インストール済みの追加パッケージはありません
                  </div>
                ) : (
                  <div className="space-y-2">
                    {installedApps.map((app) => (
                      <div key={app.id} className={rowClass}>
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 flex items-center justify-center shrink-0">
                            <Icon name={app.builtInAppId || app.icon} size={30} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{app.name}</div>
                            <div className="text-xs opacity-60 truncate mt-0.5">{app.description}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => launchInstalledApp(app.id)}
                            className={btnPrimary}
                          >
                            起動
                          </button>
                          <button
                            type="button"
                            onClick={() => uninstallApp(app.id)}
                            className={btnSecondary}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
