import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from './OSContext';
import { TASKBAR_APPS, AppId } from './types';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  startPos?: { x: number; width: number } | null;
}

interface PinnedEntry {
  uid: string;
  appId: AppId;
  customId?: string;
  label: string;
  icon: string;
  isCustom?: boolean;
}

interface SearchResult {
  uid: string;
  type: 'app' | 'file';
  label: string;
  icon: string;
  appId?: AppId;
  customAppId?: string;
  filePath?: string[];
  fileName?: string;
}

const PINNED: PinnedEntry[] = [
  { uid: 'pin-browser', appId: 'browser', label: 'Browser', icon: 'browser' },
  { uid: 'pin-notepad', appId: 'notepad', label: 'Editor', icon: 'notepad' },
  { uid: 'pin-terminal', appId: 'terminal', label: 'Terminal', icon: 'terminal' },
  { uid: 'pin-explorer', appId: 'explorer', label: 'Files', icon: 'explorer' },
  { uid: 'pin-calculator', appId: 'calculator', label: 'Calculator', icon: 'calculator' },
  { uid: 'pin-settings', appId: 'settings', label: 'Settings', icon: 'settings' },
  { uid: 'pin-game', appId: 'game', label: 'Games', icon: 'game' },
  { uid: 'pin-synth', appId: 'synth', label: 'Music', icon: 'synth' },
  { uid: 'pin-entertainment', appId: 'entertainment', label: 'Entertainment', icon: 'entertainment' },
  { uid: 'pin-calendar', appId: 'calendar', label: 'Calendar', icon: 'calendar' },
  { uid: 'pin-weather', appId: 'weather', label: 'Weather', icon: 'weather' },
  { uid: 'pin-clock', appId: 'clock', label: 'Clock', icon: 'clock' },
  { uid: 'pin-ai', appId: 'ai', label: 'AI Assistant', icon: 'ai' },
  { uid: 'pin-studio', appId: 'studio', label: 'Glassium Studio', icon: 'studio' },
  { uid: 'pin-paint', appId: 'paint', label: 'Spect Studio', icon: 'paint' },
  { uid: 'pin-taskmanager', appId: 'taskmanager', label: 'Task Manager', icon: 'taskmanager' },
  { uid: 'pin-appstore', appId: 'appstore', label: 'App Store', icon: 'appstore' },
  { uid: 'pin-retrocade', appId: 'retrocade', label: 'RetroCade', icon: 'Gamepad2' },
];

const CONSOLIDATED_TOOL_SHORTCUTS: { appId: AppId; label: string; parentLabel: string; icon: string }[] = [
  { appId: 'unitconverter', label: '単位・通貨変換', parentLabel: 'Calculator', icon: 'SlidersHorizontal' },
  { appId: 'bmi', label: 'BMI・健康計算', parentLabel: 'Calculator', icon: 'Activity' },
  { appId: 'expense', label: '収支管理 (家計簿)', parentLabel: 'Calculator', icon: 'Calculator' },
  { appId: 'pomodoro', label: 'ポモドーロタイマー', parentLabel: 'Clock', icon: 'Clock' },
  { appId: 'kanban', label: 'カンバンボード', parentLabel: 'Calendar', icon: 'LayoutGrid' },
  { appId: 'habit', label: '習慣トラッカー', parentLabel: 'Calendar', icon: 'CheckCircle2' },
  { appId: 'whiteboard', label: 'アイデアメモ', parentLabel: 'Calendar', icon: 'PenTool' },
  { appId: 'jsonformat', label: 'JSON整形・正規表現', parentLabel: 'Glassium Studio', icon: 'Code2' },
  { appId: 'passgen', label: 'パスワード生成', parentLabel: 'Glassium Studio', icon: 'Key' },
  { appId: 'wordcount', label: '文字数・テキスト差分', parentLabel: 'Editor', icon: 'FileText' },
  { appId: 'drumpad', label: 'ドラムパッド・周波数', parentLabel: 'Music', icon: 'Volume2' },
  { appId: 'sysinfo', label: 'システム診断', parentLabel: 'Task Manager', icon: 'Cpu' },
];

const RECOMMENDED_ITEMS: {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  appId: AppId;
  payload?: unknown;
}[] = [
  {
    id: 'rec-ai',
    title: 'AI Assistant',
    subtitle: 'いつでも質問・OS操作が可能',
    icon: 'ai',
    appId: 'ai',
  },
  {
    id: 'rec-notes',
    title: 'GlassiumOS_Notes.md',
    subtitle: '最近編集したドキュメント',
    icon: 'notepad',
    appId: 'notepad',
    payload: {
      fileName: 'GlassiumOS_Notes.md',
      content: '# GlassiumOS 5 u4 (GlasispectUI)\n\nMinimal Refractive Glass & Integrated Desktop Environment.\n',
    },
  },
  {
    id: 'rec-game',
    title: '3DMaze (50F Roguelike) & Slope',
    subtitle: '3D ダンジョン RTA ＆ 物理ランナー',
    icon: 'game',
    appId: 'game',
  },
  {
    id: 'rec-music',
    title: 'Monochrome Music',
    subtitle: 'オーディオ & シンセサイザー',
    icon: 'synth',
    appId: 'synth',
  },
  {
    id: 'rec-files',
    title: 'Documents',
    subtitle: 'システム フォルダー',
    icon: 'explorer',
    appId: 'explorer',
    payload: { folderPath: ['Documents'] },
  },
  {
    id: 'rec-settings',
    title: 'Display & Glass UI',
    subtitle: 'システム設定とカスタマイズ',
    icon: 'settings',
    appId: 'settings',
  },
];

function flattenFiles(
  folder: unknown,
  path: string[] = []
): { name: string; path: string[]; type: string }[] {
  const results: { name: string; path: string[]; type: string }[] = [];
  if (!folder || typeof folder !== 'object') return results;
  const children = (folder as { children?: unknown[] }).children;
  if (!Array.isArray(children)) return results;

  for (const rawChild of children) {
    if (!rawChild || typeof rawChild !== 'object') continue;
    const child = rawChild as {
      name?: string;
      kind?: string;
      type?: string;
      children?: unknown[];
    };
    const name = typeof child.name === 'string' ? child.name : '';
    if (!name) continue;
    const childPath = [...path, name];
    if (child.kind === 'file') {
      results.push({ name, path: childPath, type: child.type ?? 'text' });
    } else if (child.kind === 'folder' && Array.isArray(child.children)) {
      results.push(...flattenFiles(child, childPath));
    }
  }
  return results;
}

export function StartMenu({ open, onClose }: Props) {
  const {
    openApp,
    installedApps,
    launchInstalledApp,
    fileSystem,
    user,
    lockSystem,
    shellMode,
    taskbarAlign,
    theme,
  } = useOS();
  const isLight = theme === 'light';

  const [query, setQuery] = useState('');
  const [allProgramsView, setAllProgramsView] = useState(false);
  const [powerMenuOpen, setPowerMenuOpen] = useState(false);

  // Reset internal views whenever Start Menu closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setAllProgramsView(false);
      setPowerMenuOpen(false);
    }
  }, [open]);

  const allPinned = useMemo<PinnedEntry[]>(() => {
    const pinnedIds = new Set<string>(PINNED.map((p) => p.appId));
    const safeInstalled = Array.isArray(installedApps) ? installedApps : [];
    const extraEntries: PinnedEntry[] = [];

    safeInstalled.forEach((a, idx) => {
      if (!a || typeof a !== 'object') return;
      const rawId = String(a.id || a.appId || `custom-${idx}`);
      const rawAppId = String(a.appId || a.id || 'browser');
      const label = String(a.name || rawId);
      const icon = String(a.icon || rawAppId || 'browser');

      // Avoid duplicating standard built-in apps already present in PINNED
      if (pinnedIds.has(rawId) && pinnedIds.has(rawAppId)) {
        return;
      }
      pinnedIds.add(rawId);

      extraEntries.push({
        uid: `inst-${rawId}-${idx}`,
        appId: rawAppId as AppId,
        customId: rawId,
        label,
        icon,
        isCustom: true,
      });
    });

    return [...PINNED, ...extraEntries];
  }, [installedApps]);

  const sortedAllApps = useMemo<PinnedEntry[]>(() => {
    return [...allPinned].sort((a, b) =>
      String(a.label || '').localeCompare(String(b.label || ''))
    );
  }, [allPinned]);

  const searchResults = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const combinedApps: PinnedEntry[] = [
      ...allPinned,
      ...CONSOLIDATED_TOOL_SHORTCUTS.map((t) => ({
        uid: `tool-${t.appId}`,
        appId: t.appId,
        label: `${t.label} (${t.parentLabel})`,
        icon: t.icon,
      })),
      ...TASKBAR_APPS.filter((t) => !allPinned.some((p) => p.appId === t.appId)).map((t) => ({
        uid: `tb-${t.appId}`,
        appId: t.appId,
        label: t.label,
        icon: t.icon,
      })),
    ];

    const appResults: SearchResult[] = combinedApps
      .filter((a) => String(a.label || '').toLowerCase().includes(q))
      .slice(0, 6)
      .map((a) => ({
        uid: `sr-app-${a.uid}`,
        type: 'app' as const,
        label: String(a.label || ''),
        icon: String(a.icon || a.appId || 'browser'),
        appId: a.appId,
        customAppId: a.isCustom ? a.customId || (a.appId as string) : undefined,
      }));

    let fileResults: SearchResult[] = [];
    try {
      const allFiles = flattenFiles(fileSystem);
      fileResults = allFiles
        .filter((f) => String(f.name || '').toLowerCase().includes(q))
        .slice(0, 4)
        .map((f, idx) => ({
          uid: `sr-file-${f.path.join('/')}-${idx}`,
          type: 'file' as const,
          label: f.name,
          icon: 'file',
          filePath: f.path.slice(0, -1),
          fileName: f.name,
        }));
    } catch {
      fileResults = [];
    }

    return [...appResults, ...fileResults];
  }, [query, fileSystem, allPinned]);

  const filtered = useMemo<PinnedEntry[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPinned;
    return allPinned.filter((a) => String(a.label || '').toLowerCase().includes(q));
  }, [query, allPinned]);

  const launch = (entry: PinnedEntry) => {
    if (entry.isCustom) {
      launchInstalledApp(entry.customId || (entry.appId as string));
    } else {
      openApp(entry.appId);
    }
    onClose();
  };

  const launchSearchResult = (result: SearchResult) => {
    if (result.type === 'app') {
      if (result.customAppId) {
        launchInstalledApp(result.customAppId);
      } else if (result.appId) {
        openApp(result.appId);
      }
    } else if (result.type === 'file' && result.fileName) {
      openApp('notepad', {
        title: result.fileName,
        payload: { fileName: result.fileName, content: '' },
      });
    }
    onClose();
  };

  const isXP = shellMode === 'xp';
  const isVista = shellMode === 'vista';
  const isWin10 = shellMode === 'windows10';
  const isDeX = shellMode === 'dex';
  const isChromeOS = shellMode === 'chromeos';

  const userName = user?.name || 'Administrator';
  const userInitial = (userName.trim()[0] || 'A').toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Click-outside Backdrop (Above all windows z-[5100]) */}
          <div
            className="fixed inset-0 z-[5100]"
            onClick={() => {
              setPowerMenuOpen(false);
              onClose();
            }}
          />

          {/* ==============================================================
              1. WINDOWS XP CLASSIC LUNA 2-COLUMN START MENU
             ============================================================== */}
          {isXP && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.15 }}
              className="fixed bottom-10 left-0 z-[5200] w-[min(430px,calc(100vw-16px))] h-[min(500px,calc(100vh-56px))] rounded-t-lg shadow-2xl border-2 border-[#0055ea] overflow-hidden flex flex-col font-sans select-none"
            >
              <div className="h-16 bg-gradient-to-r from-[#0055ea] via-[#1062eb] to-[#3f88f8] px-4 flex items-center gap-3 border-b-2 border-orange-400 shadow-md shrink-0">
                <div className="w-11 h-11 rounded-md bg-white p-0.5 shadow-inner border border-white/60 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-600 rounded flex items-center justify-center text-white">
                    <Icon name="User" size={24} fluent={false} />
                  </div>
                </div>
                <div className="text-white font-bold text-base drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate">
                  {userName}
                </div>
              </div>

              <div className="flex-1 flex min-h-0 bg-white">
                <div className="flex-1 p-2 flex flex-col justify-between bg-white text-black border-r border-[#96b8e8] min-h-0">
                  <div className="space-y-1 overflow-y-auto">
                    <button
                      onClick={() => { openApp('browser'); onClose(); }}
                      className="w-full flex items-center gap-2.5 p-1.5 rounded hover:bg-[#2f71cd] hover:text-white transition text-left group"
                    >
                      <Icon name="browser" size={26} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight">Internet</div>
                        <div className="text-[10px] text-gray-500 group-hover:text-white/80 truncate">Browser</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { openApp('terminal'); onClose(); }}
                      className="w-full flex items-center gap-2.5 p-1.5 rounded hover:bg-[#2f71cd] hover:text-white transition text-left group"
                    >
                      <Icon name="terminal" size={26} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight">Command Prompt</div>
                        <div className="text-[10px] text-gray-500 group-hover:text-white/80 truncate">Terminal</div>
                      </div>
                    </button>

                    <div className="h-px bg-gray-300 my-1" />

                    {[
                      { id: 'synth' as AppId, label: 'Music', desc: 'Hi-Fi Audio' },
                      { id: 'notepad' as AppId, label: 'Editor', desc: 'Text & Markdown' },
                      { id: 'calculator' as AppId, label: 'Calculator', desc: 'Math & Formulas' },
                      { id: 'game' as AppId, label: 'Games', desc: '3D & Arcade' },
                      { id: 'appstore' as AppId, label: 'App Store', desc: 'Software Catalog' },
                    ].map((app) => (
                      <button
                        key={app.id}
                        onClick={() => { openApp(app.id); onClose(); }}
                        className="w-full flex items-center gap-2.5 p-1.5 rounded hover:bg-[#2f71cd] hover:text-white transition text-left group"
                      >
                        <Icon name={app.id} size={22} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight truncate">{app.label}</div>
                          <div className="text-[10px] text-gray-500 group-hover:text-white/80 truncate">{app.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-48 bg-[#d3e5fa] p-2 flex flex-col justify-between text-[#001c54] font-medium text-xs overflow-y-auto">
                  <div className="space-y-1">
                    <button onClick={() => { openApp('explorer'); onClose(); }} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-[#2f71cd] hover:text-white transition text-left font-bold">
                      <Icon name="explorer" size={18} />
                      <span>My Documents</span>
                    </button>
                    <button onClick={() => { openApp('explorer'); onClose(); }} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-[#2f71cd] hover:text-white transition text-left font-bold">
                      <Icon name="image" size={18} />
                      <span>My Pictures</span>
                    </button>
                    <button onClick={() => { openApp('synth'); onClose(); }} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-[#2f71cd] hover:text-white transition text-left font-bold">
                      <Icon name="synth" size={18} />
                      <span>My Music</span>
                    </button>
                    <div className="h-px bg-[#a6c7ec] my-1" />
                    <button onClick={() => { openApp('settings'); onClose(); }} className="w-full flex items-center gap-2 p-1 rounded hover:bg-[#2f71cd] hover:text-white transition text-left">
                      <Icon name="settings" size={16} />
                      <span>Control Panel</span>
                    </button>
                    <button onClick={() => { openApp('taskmanager'); onClose(); }} className="w-full flex items-center gap-2 p-1 rounded hover:bg-[#2f71cd] hover:text-white transition text-left">
                      <Icon name="taskmanager" size={16} />
                      <span>Task Manager</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-12 bg-gradient-to-r from-[#0055ea] via-[#1062eb] to-[#3f88f8] px-3 flex items-center justify-end gap-3 text-white text-xs font-bold border-t border-white/20 shrink-0">
                <button
                  onClick={() => { onClose(); lockSystem(); }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-black/20 transition"
                >
                  <div className="w-5 h-5 rounded bg-rose-600 flex items-center justify-center text-white">
                    <Icon name="Power" size={12} fluent={false} />
                  </div>
                  <span>Turn Off Computer</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ==============================================================
              2. WINDOWS VISTA AERO GLASS START MENU
             ============================================================== */}
          {isVista && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.15 }}
              className="fixed bottom-10 left-2 z-[5200] w-[min(440px,calc(100vw-16px))] h-[min(520px,calc(100vh-56px))] rounded-lg shadow-2xl border border-sky-400/40 bg-slate-950/90 backdrop-blur-2xl overflow-hidden flex flex-col font-sans select-none text-white ring-1 ring-white/20"
            >
              <div className="flex-1 flex min-h-0">
                <div className="flex-1 p-3 flex flex-col justify-between bg-black/40 border-r border-white/10 min-h-0">
                  <div className="space-y-1 overflow-y-auto">
                    {PINNED.slice(0, 8).map((app) => (
                      <button
                        key={app.uid}
                        onClick={() => { openApp(app.appId); onClose(); }}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/15 border border-transparent hover:border-sky-400/30 transition text-left group"
                      >
                        <div className="w-8 h-8 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                          <Icon name={app.appId} size={26} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{app.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 mt-2 border-t border-white/10 shrink-0">
                    <div className="flex items-center gap-2 bg-black/60 border border-sky-400/40 rounded-full px-3 py-1.5">
                      <Icon name="Search" size={14} className="text-sky-400" fluent={false} />
                      <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Start Search"
                        className="bg-transparent text-xs text-white placeholder-white/40 outline-none w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-44 bg-gradient-to-b from-sky-950/40 to-black/60 p-3 flex flex-col justify-between text-xs text-white/80 overflow-y-auto">
                  <div className="space-y-1.5">
                    <button onClick={() => { openApp('explorer'); onClose(); }} className="w-full text-left py-1 hover:text-sky-300 font-semibold truncate">
                      {userName}
                    </button>
                    <button onClick={() => { openApp('explorer'); onClose(); }} className="w-full text-left py-1 hover:text-sky-300">Documents</button>
                    <button onClick={() => { openApp('explorer'); onClose(); }} className="w-full text-left py-1 hover:text-sky-300">Pictures</button>
                    <button onClick={() => { openApp('synth'); onClose(); }} className="w-full text-left py-1 hover:text-sky-300">Music</button>
                    <button onClick={() => { openApp('game'); onClose(); }} className="w-full text-left py-1 hover:text-sky-300">Games</button>
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { openApp('settings'); onClose(); }} className="w-full text-left py-1 hover:text-sky-300">Control Panel</button>
                    <button onClick={() => { openApp('taskmanager'); onClose(); }} className="w-full text-left py-1 hover:text-sky-300">Task Manager</button>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => { onClose(); lockSystem(); }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-white transition"
                      title="Shut Down"
                    >
                      <Icon name="Power" size={14} fluent={false} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==============================================================
              3. WINDOWS 10 HYBRID LIVE TILES START MENU
             ============================================================== */}
          {isWin10 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.15 }}
              className="fixed bottom-10 left-0 z-[5200] w-[min(620px,calc(100vw-16px))] h-[min(500px,calc(100vh-56px))] rounded-none shadow-2xl border border-zinc-700 bg-zinc-950/95 backdrop-blur-2xl flex font-sans select-none text-white"
            >
              <div className="w-12 bg-black/60 border-r border-zinc-800 flex flex-col justify-between items-center py-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setAllProgramsView((v) => !v)}
                  className="p-2 text-white/60 hover:text-white"
                  title="All Apps"
                >
                  <Icon name="LayoutGrid" size={16} fluent={false} />
                </button>
                <div className="flex flex-col items-center gap-3">
                  <button onClick={() => { openApp('explorer'); onClose(); }} className="p-2 text-white/60 hover:text-white" title="Files">
                    <Icon name="explorer" size={20} />
                  </button>
                  <button onClick={() => { openApp('settings'); onClose(); }} className="p-2 text-white/60 hover:text-white" title="Settings">
                    <Icon name="settings" size={20} />
                  </button>
                  <button onClick={() => { onClose(); lockSystem(); }} className="p-2 text-rose-400 hover:text-rose-300" title="Power">
                    <Icon name="Power" size={16} fluent={false} />
                  </button>
                </div>
              </div>

              <div className="w-56 p-3 overflow-y-auto border-r border-zinc-800 space-y-1">
                <div className="text-[11px] font-bold text-cyan-400 px-2 py-1">All Apps</div>
                {PINNED.map((app) => (
                  <button
                    key={app.uid}
                    onClick={() => { openApp(app.appId); onClose(); }}
                    className="w-full flex items-center gap-2.5 p-2 rounded hover:bg-white/10 transition text-left"
                  >
                    <Icon name={app.appId} size={22} />
                    <span className="text-xs truncate">{app.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-black/30">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Productivity & Play</div>
                <div className="grid grid-cols-3 gap-2">
                  {PINNED.slice(0, 9).map((app) => (
                    <button
                      key={app.uid}
                      onClick={() => { openApp(app.appId); onClose(); }}
                      className="h-20 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 p-2.5 flex flex-col justify-between text-left transition group"
                    >
                      <Icon name={app.appId} size={28} className="group-hover:scale-110 transition" />
                      <span className="text-xs font-semibold truncate">{app.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==============================================================
              4. SAMSUNG DEX / CHROMEOS DRAWERS
             ============================================================== */}
          {(isDeX || isChromeOS) && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.18 }}
              className="fixed bottom-14 left-3 z-[5200] w-[min(520px,calc(100vw-24px))] h-[min(480px,calc(100vh-72px))] rounded-2xl shadow-2xl border border-white/15 bg-slate-900/90 backdrop-blur-2xl p-5 flex flex-col select-none text-white"
            >
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3.5 py-2 mb-4 border border-white/10 shrink-0">
                <Icon name="Search" size={14} className="text-cyan-300" fluent={false} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="アプリを検索..."
                  className="bg-transparent text-xs text-white placeholder-white/40 outline-none w-full"
                />
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-4 sm:grid-cols-5 gap-3 overflow-y-auto p-1">
                {filtered.map((app) => (
                  <button
                    key={app.uid}
                    onClick={() => launch(app)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 active:scale-95 transition group"
                  >
                    <div className="w-12 h-12 flex items-center justify-center group-hover:scale-110 transition">
                      <Icon name={app.icon} size={36} />
                    </div>
                    <span className="text-[11px] text-white/90 text-center truncate max-w-full font-medium">
                      {app.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ==============================================================
              5A. GLASSIUMOS 5 START MENU (Borderless Hairline 2-Column UI)
             ============================================================== */}
          {shellMode === 'windows' && (
            <div
              className={`fixed bottom-[48px] z-[5200] pointer-events-none ${
                taskbarAlign === 'left'
                  ? 'left-0 flex justify-start'
                  : 'inset-x-0 flex justify-center'
              }`}
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.16 }}
                onClick={(e) => e.stopPropagation()}
                className={`pointer-events-auto w-full max-w-[660px] max-h-[calc(100vh-64px)] flex flex-col backdrop-blur-2xl border-t border-x select-none ${
                  isLight
                    ? 'bg-white/95 border-slate-300 text-slate-900 shadow-2xl'
                    : 'bg-slate-950/95 border-white/15 text-white shadow-[0_24px_60px_rgba(0,0,0,0.8)]'
                }`}
              >
                {/* Top Hairline Search & AI Bar */}
                <div className={`flex items-center justify-between px-6 py-3.5 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <div className="flex items-center gap-3 flex-1">
                    <Icon name="Search" size={15} className="os-accent-text shrink-0" fluent={false} />
                    <input
                      autoFocus
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          if (query) setQuery('');
                          else onClose();
                        } else if (e.key === 'Enter' && searchResults.length > 0) {
                          launchSearchResult(searchResults[0]);
                        }
                      }}
                      placeholder="アプリケーション、統合ツール、ファイルを検索..."
                      className="flex-1 bg-transparent text-xs outline-none"
                    />
                    {query && (
                      <button type="button" onClick={() => setQuery('')} className="opacity-50 hover:opacity-100">
                        <Icon name="X" size={14} fluent={false} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { openApp('ai'); onClose(); }}
                    className="ml-4 pl-4 border-l border-current/15 text-xs font-medium os-accent-text hover:underline flex items-center gap-1.5 shrink-0"
                  >
                    <Icon name="Sparkles" size={13} fluent={false} />
                    <span>AI Assistant</span>
                  </button>
                </div>

                {/* Body: Search Results or 2-Column Hairline Layout */}
                {query.trim() ? (
                  <div className="p-6 overflow-y-auto max-h-[380px] divide-y divide-current/10">
                    {searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <button
                          key={result.uid}
                          type="button"
                          onClick={() => launchSearchResult(result)}
                          className="w-full flex items-center justify-between py-2.5 px-2 hover:bg-current/5 transition text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon name={result.icon} size={22} />
                            <div className="min-w-0">
                              <div className="text-xs font-medium truncate">{result.label}</div>
                              <div className="text-[10px] opacity-50">
                                {result.type === 'app' ? 'アプリケーション / 統合機能' : `ファイル · ${result.filePath?.join('/') || '/'}`}
                              </div>
                            </div>
                          </div>
                          <Icon name="ChevronRight" size={14} className="opacity-40" fluent={false} />
                        </button>
                      ))
                    ) : (
                      <div className="py-12 text-center text-xs opacity-45">一致する項目がありません</div>
                    )}
                  </div>
                ) : (
                  <div className={`grid grid-cols-1 sm:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x ${isLight ? 'divide-slate-200' : 'divide-white/10'} min-h-[340px] max-h-[400px] overflow-hidden`}>
                    {/* Left 7 Columns: Core Unified Applications */}
                    <div className="sm:col-span-7 p-5 overflow-y-auto flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-medium opacity-50 mb-3 px-1">アプリケーション</div>
                        <div className="grid grid-cols-3 gap-x-2 gap-y-3">
                          {allPinned.slice(0, 15).map((app) => (
                            <button
                              key={app.uid}
                              type="button"
                              onClick={() => launch(app)}
                              className="flex items-center gap-2.5 py-1.5 px-2 hover:bg-current/5 transition text-left group"
                            >
                              <div className="w-7 h-7 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <Icon name={app.icon} size={22} />
                              </div>
                              <span className="text-xs font-medium truncate">{app.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right 5 Columns: Consolidated Multi-Tool Shortcuts */}
                    <div className="sm:col-span-5 p-5 overflow-y-auto">
                      <div className="text-[11px] font-medium opacity-50 mb-2 px-1">統合ツール直接起動</div>
                      <div className={`divide-y ${isLight ? 'divide-slate-200/70' : 'divide-white/[0.07]'}`}>
                        {CONSOLIDATED_TOOL_SHORTCUTS.map((tool) => (
                          <button
                            key={tool.appId}
                            type="button"
                            onClick={() => { openApp(tool.appId); onClose(); }}
                            className="w-full flex items-center justify-between py-2 px-1 hover:bg-current/5 transition text-left group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon name={tool.icon} size={14} className="os-accent-text shrink-0" fluent={false} />
                              <span className="text-xs truncate">{tool.label}</span>
                            </div>
                            <span className="text-[10px] font-mono opacity-45 shrink-0">{tool.parentLabel}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Footer Hairline Bar */}
                <div className={`px-6 py-3 border-t flex items-center justify-between text-xs ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/40'}`}>
                  <button
                    type="button"
                    onClick={() => { openApp('settings'); onClose(); }}
                    className="flex items-center gap-2.5 hover:opacity-80 transition"
                  >
                    <div className="h-6 w-6 rounded-full os-accent-bg flex items-center justify-center text-white text-[11px] font-bold">
                      {userInitial}
                    </div>
                    <span className="font-medium">{userName}</span>
                    <span className="text-[10px] font-mono opacity-45">GlassiumOS 5 u4 · GlasispectUI</span>
                  </button>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => { openApp('game', { payload: { gameId: 'maze' } }); onClose(); }}
                      className="text-[10px] font-mono text-cyan-300 hover:text-cyan-200 transition flex items-center gap-1"
                      title="3DMaze デイリーチャレンジ最高記録"
                    >
                      <Icon name="Compass" size={12} fluent={false} />
                      <span>
                        {(() => {
                          try {
                            const rec = JSON.parse(localStorage.getItem('glassium_3dmaze_daily_best') || 'null');
                            if (rec && rec.floor) return `3DMaze Best: ${rec.floor}F (${rec.timeStr || '--:--'})`;
                          } catch {
                            // ignore
                          }
                          return '3DMaze Daily RTA';
                        })()}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { openApp('settings'); onClose(); }}
                      className="opacity-70 hover:opacity-100 transition flex items-center gap-1"
                    >
                      <Icon name="Settings" size={13} fluent={false} />
                      <span>設定</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { onClose(); lockSystem(); }}
                      className="text-rose-400 hover:text-rose-300 transition flex items-center gap-1"
                    >
                      <Icon name="Power" size={13} fluent={false} />
                      <span>ロック</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* ==============================================================
              5B. AUTHENTIC WINDOWS 11 START MENU (Preserved when shellMode === 'windows11')
             ============================================================== */}
          {shellMode === 'windows11' && (
            <div
              className={`fixed bottom-[56px] z-[5200] pointer-events-none ${
                taskbarAlign === 'left'
                  ? 'left-3 right-3 flex justify-start'
                  : 'inset-x-0 px-3 flex justify-center'
              }`}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                onClick={(e) => e.stopPropagation()}
                className={`pointer-events-auto w-full max-w-[600px] max-h-[calc(100vh-72px)] rounded-xl overflow-hidden flex flex-col backdrop-blur-2xl border select-none transition-colors duration-200 ${
                  isLight
                    ? 'bg-slate-50/50 border-slate-900/12 text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.18)]'
                    : 'bg-slate-900/45 border-white/12 text-white shadow-[0_24px_60px_rgba(0,0,0,0.65)]'
                }`}
              >
                {/* Top Section: Flat Windows 11 Search Box */}
                <div className="px-6 sm:px-7 pt-5 pb-3 shrink-0">
                  <div
                    className={`flex items-center gap-3 h-9 border border-b-2 os-accent-border rounded-lg px-3.5 transition ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950/70 border-white/12 text-white'
                    }`}
                  >
                    <Icon name="Search" size={14} className="os-accent-text shrink-0" fluent={false} />
                    <input
                      autoFocus
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          if (query) setQuery('');
                          else onClose();
                        } else if (e.key === 'Enter' && searchResults.length > 0) {
                          launchSearchResult(searchResults[0]);
                        }
                      }}
                      placeholder="アプリ、設定、ドキュメントを検索"
                      className={`flex-1 bg-transparent text-xs sm:text-sm outline-none ${
                        isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-white/95 placeholder:text-white/40'
                      }`}
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="opacity-50 hover:opacity-100 transition"
                      >
                        <Icon name="X" size={14} fluent={false} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Content Area (Animated Sub-views) */}
                <div className="px-6 sm:px-7 py-2 flex-1 min-h-0 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {query.trim() ? (
                      <motion.div
                        key="search-view"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.14 }}
                        className="space-y-2 py-1"
                      >
                        <div className="text-xs font-semibold opacity-65 px-1">
                          検索結果 ({searchResults.length})
                        </div>
                        {searchResults.length > 0 ? (
                          <div className="space-y-1">
                            {searchResults.map((result) => (
                              <button
                                key={result.uid}
                                type="button"
                                onClick={() => launchSearchResult(result)}
                                className={`w-full flex items-center gap-3.5 p-2 rounded-lg transition text-left group ${
                                  isLight ? 'hover:bg-slate-900/5' : 'hover:bg-white/10'
                                }`}
                              >
                                <div className="h-9 w-9 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                                  <Icon name={result.icon} size={28} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs sm:text-sm font-medium truncate">
                                    {result.label}
                                  </div>
                                  <div className="text-[10px] opacity-50">
                                    {result.type === 'app'
                                      ? 'システム アプリケーション'
                                      : `ファイル · ${result.filePath?.join('/') || '/'}`}
                                  </div>
                                </div>
                                <Icon
                                  name="ChevronRight"
                                  size={14}
                                  className="opacity-35 group-hover:opacity-80 transition"
                                  fluent={false}
                                />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-xs opacity-45">
                            一致するアプリやドキュメントが見つかりませんでした
                          </div>
                        )}
                      </motion.div>
                    ) : allProgramsView ? (
                      <motion.div
                        key="all-apps-view"
                        initial={{ opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -14 }}
                        transition={{ duration: 0.16 }}
                        className="space-y-2 py-1"
                      >
                        <div className="flex items-center justify-between mb-3 px-1">
                          <span className="text-xs font-semibold">すべてのアプリ ({sortedAllApps.length})</span>
                          <button
                            type="button"
                            onClick={() => setAllProgramsView(false)}
                            className={`px-2.5 py-1 rounded-md border text-[11px] flex items-center gap-1 transition ${
                              isLight
                                ? 'bg-slate-900/5 hover:bg-slate-900/10 border-slate-900/10 text-slate-800'
                                : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-white/90'
                            }`}
                          >
                            <Icon name="ChevronLeft" size={12} fluent={false} />
                            <span>戻る</span>
                          </button>
                        </div>

                        <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1">
                          {sortedAllApps.map((app) => (
                            <button
                              key={app.uid}
                              type="button"
                              onClick={() => launch(app)}
                              className={`w-full flex items-center gap-3.5 px-2.5 py-2 rounded-lg transition text-left group ${
                                isLight ? 'hover:bg-slate-900/5' : 'hover:bg-white/10'
                              }`}
                            >
                              <div className="w-8 h-8 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                                <Icon name={app.icon} size={26} />
                              </div>
                              <span className="text-xs font-medium truncate">
                                {app.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="pinned-view"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.16 }}
                      >
                        {/* 1. Pinned Section Header */}
                        <div className="flex items-center justify-between mb-2 px-2">
                          <span className="text-xs font-semibold">ピン留め済み</span>
                          <button
                            type="button"
                            onClick={() => setAllProgramsView(true)}
                            className={`px-2.5 py-1 rounded-md border text-[11px] flex items-center gap-1 transition ${
                              isLight
                                ? 'bg-slate-900/5 hover:bg-slate-900/10 border-slate-900/10 text-slate-800'
                                : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-white/90'
                            }`}
                          >
                            <span>すべてのアプリ</span>
                            <Icon name="ChevronRight" size={12} fluent={false} />
                          </button>
                        </div>

                        {/* Pinned 6-Column Grid */}
                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-x-1 gap-y-1.5 mb-4">
                          {allPinned.slice(0, 18).map((app) => (
                            <button
                              key={app.uid}
                              type="button"
                              onClick={() => launch(app)}
                              className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg active:scale-95 transition group ${
                                isLight ? 'hover:bg-slate-900/5' : 'hover:bg-white/[0.08]'
                              }`}
                            >
                              <div className="h-10 w-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Icon name={app.icon} size={32} />
                              </div>
                              <span className="text-[11px] text-center leading-tight truncate max-w-full font-medium opacity-90">
                                {app.label}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* 2. Recommended (おすすめ) Section Header */}
                        <div className="flex items-center justify-between mb-2 px-2">
                          <span className="text-xs font-semibold">おすすめ</span>
                          <button
                            type="button"
                            onClick={() => setAllProgramsView(true)}
                            className={`px-2.5 py-1 rounded-md border text-[11px] flex items-center gap-1 transition ${
                              isLight
                                ? 'bg-slate-900/5 hover:bg-slate-900/10 border-slate-900/10 text-slate-800'
                                : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-white/90'
                            }`}
                          >
                            <span>さらに表示</span>
                            <Icon name="ChevronRight" size={12} fluent={false} />
                          </button>
                        </div>

                        {/* Recommended 2-Column x 3-Row Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 pb-2">
                          {RECOMMENDED_ITEMS.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                if (item.payload) {
                                  openApp(item.appId, { payload: item.payload });
                                } else {
                                  openApp(item.appId);
                                }
                                onClose();
                              }}
                              className={`flex items-center gap-3 p-2 rounded-lg active:scale-98 transition text-left group ${
                                isLight ? 'hover:bg-slate-900/5' : 'hover:bg-white/[0.08]'
                              }`}
                            >
                              <div className="w-8 h-8 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                                <Icon name={item.icon} size={26} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate">{item.title}</div>
                                <div className="text-[10px] opacity-50 truncate">{item.subtitle}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Footer Bar: User Profile (Left) + Power Menu (Right) */}
                <div
                  className={`relative h-13 py-2.5 px-6 sm:px-8 border-t flex items-center justify-between shrink-0 ${
                    isLight ? 'bg-slate-100/90 border-slate-900/10' : 'bg-slate-950/65 border-white/10'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      openApp('settings');
                      onClose();
                    }}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 -ml-2.5 rounded-lg transition ${
                      isLight ? 'hover:bg-slate-900/5' : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="h-7 w-7 rounded-full os-accent-bg flex items-center justify-center text-white text-xs font-bold">
                      {userInitial}
                    </div>
                    <span className="text-xs font-medium truncate max-w-[180px]">
                      {userName}
                    </span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPowerMenuOpen((v) => !v)}
                      className={`p-2 rounded-lg transition ${
                        powerMenuOpen
                          ? isLight
                            ? 'bg-slate-900/10 text-slate-900'
                            : 'bg-white/15 text-white'
                          : isLight
                          ? 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                      }`}
                      title="電源オプション"
                    >
                      <Icon name="Power" size={16} fluent={false} />
                    </button>

                    <AnimatePresence>
                      {powerMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.14 }}
                          className={`absolute bottom-11 right-0 w-44 rounded-lg backdrop-blur-2xl border shadow-2xl p-1.5 z-50 ${
                            isLight
                              ? 'bg-white/95 border-slate-900/12 text-slate-900'
                              : 'bg-slate-900/95 border-white/15 text-white'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setPowerMenuOpen(false);
                              onClose();
                              lockSystem();
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition text-left ${
                              isLight ? 'hover:bg-slate-900/5' : 'hover:bg-white/10'
                            }`}
                          >
                            <Icon name="Moon" size={14} className="os-accent-text" fluent={false} />
                            <span>スリープ / ロック</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPowerMenuOpen(false);
                              onClose();
                              lockSystem();
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition text-left ${
                              isLight ? 'hover:bg-slate-900/5' : 'hover:bg-white/10'
                            }`}
                          >
                            <Icon name="RotateCcw" size={14} className="text-amber-500" fluent={false} />
                            <span>再起動</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPowerMenuOpen(false);
                              onClose();
                              lockSystem();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-rose-500/15 text-xs text-rose-500 transition text-left"
                          >
                            <Icon name="Power" size={14} className="text-rose-500" fluent={false} />
                            <span>シャットダウン</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
