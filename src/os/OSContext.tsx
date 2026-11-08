import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import {
  AppId,
  WindowState,
  TaskbarAlign,
  DesktopIconSize,
  DESKTOP_ICON_SIZE_PRESETS,
  ThemeMode,
  AccentColor,
  ACCENT_COLOR_PRESETS,
  ShellMode,
  WindowsTaskbarStyle,
  DesignEngine,
  NebulaPreset,
  LockScreenStyle,
  InstalledApp,
  StoreApp,
  STORE_CATALOG,
  StoreTheme,
  STORE_THEMES,
  CalendarTask,
  UserProfile,
  NotificationItem,
  VirtualDesktop,
  UIStyle,
  SleepClockStyle,
  SleepBackground,
  ClockPosition,
  OSLanguage,
} from './types';
import { VirtualFolder, getInitialFileSystem, VirtualNode } from './fileSystem';
import { WALLPAPERS } from './wallpapers';
import { soundService } from './soundService';

export interface DeskStickyNote {
  id: string;
  text: string;
  color: 'cyan' | 'violet' | 'amber' | 'emerald' | 'rose';
  x: number;
  y: number;
}

export type Wallpaper =
  | 'dynamic-world'
  | 'live2d'
  | 'golden-sparkle'
  | 'space'
  | 'aurora'
  | 'sunset'
  | 'ocean'
  | 'forest'
  | 'cosmic'
  | 'bloom'
  | 'shader';

export type Theme = 'dark' | 'light';
export type AuroraColor =
  | 'golden-sparkle'
  | 'amethyst-cyan-silk'
  | 'abyssal-deep-ocean'
  | 'polar-emerald-aurora'
  | 'neon-cyber-dusk'
  | 'crimson-rose-nebula'
  | 'cyan-violet'
  | 'emerald-sky'
  | 'rose-gold'
  | 'ocean-blue'
  | 'sunset-magenta'
  | 'solar-gold'
  | 'arctic-ice'
  | 'sakura-silk'
  | 'cyber-grid'
  | 'starlight-pulse'
  | 'classic-aurora-orbs'
  | 'classic-synthwave-sun'
  | 'classic-deep-ocean'
  | 'classic-matrix-rain'
  | 'classic-galaxy-vortex'
  | 'classic-crystal-net'
  | 'classic-fireflies-forest'
  | 'classic-plasma-nebula';

export interface CustomWallpaper {
  id: string;
  name: string;
  dataUrl: string;
}

export interface OpenOptions {
  title?: string;
  payload?: unknown;
  width?: number;
  height?: number;
  icon?: string;
}

export interface OSContextValue {
  windows: WindowState[];
  mountedWindows: WindowState[];
  openApp: (appId: AppId, opts?: OpenOptions) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  updateWindowRect: (id: string, rect: Partial<Pick<WindowState, 'x' | 'y' | 'width' | 'height'>>) => void;
  restoreWindow: (id: string) => void;
  getTopWindowId: () => string | null;

  fileSystem: VirtualFolder;
  setFileSystem: React.Dispatch<React.SetStateAction<VirtualFolder>>;
  saveFile: (path: string[], name: string, content: string) => void;
  createFolder: (path: string[], folderName: string) => void;
  deleteNode: (path: string[], nodeName: string) => void;
  openFileNode: (node: VirtualNode) => void;
  recycleFile: (path: string[], nodeName: string) => void;
  emptyRecycleBin: () => void;
  restoreRecycleFile: (nodeName: string) => void;

  wallpaper: Wallpaper;
  setWallpaper: (w: Wallpaper) => void;
  customWallpapers: CustomWallpaper[];
  addCustomWallpaper: (name: string, dataUrl: string) => void;
  selectedCustomId: string | null;
  setSelectedCustomId: (id: string | null) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  accentColor: AccentColor;
  setAccentColor: (c: AccentColor) => void;
  resolvedAccentHex: string;
  resolvedAccentRgb: string;
  language: OSLanguage;
  setLanguage: (lang: OSLanguage) => void;

  // Customization & Shell Engines
  uiStyle: UIStyle;
  setUiStyle: (style: UIStyle) => void;
  shellMode: ShellMode;
  setShellMode: (mode: ShellMode) => void;
  taskbarStyle: WindowsTaskbarStyle;
  setTaskbarStyle: (style: WindowsTaskbarStyle) => void;
  designEngine: DesignEngine;
  setDesignEngine: (engine: DesignEngine) => void;
  nebulaPreset: NebulaPreset;
  setNebulaPreset: (preset: NebulaPreset) => void;
  sleepClockStyle: SleepClockStyle;
  setSleepClockStyle: (style: SleepClockStyle) => void;
  sleepBackground: SleepBackground;
  setSleepBackground: (bg: SleepBackground) => void;
  clockPosition: ClockPosition;
  setClockPosition: (pos: ClockPosition) => void;
  temperature: number;

  // Fine-grain sliders & 3D Liquid Glass Physics
  blurAmount: number;
  setBlurAmount: (v: number) => void;
  cornerRadius: number;
  setCornerRadius: (v: number) => void;
  transparency: number;
  setTransparency: (v: number) => void;
  animSpeed: number;
  setAnimSpeed: (v: number) => void;
  glassCurvature: number;
  setGlassCurvature: (v: number) => void;
  glassSpecular: number;
  setGlassSpecular: (v: number) => void;
  glassWobble: number;
  setGlassWobble: (v: number) => void;
  glassDispersion: number;
  setGlassDispersion: (v: number) => void;
  glassNoise: number;
  setGlassNoise: (v: number) => void;

  // 2D Aurora Live Wallpaper Settings
  auroraColor: AuroraColor;
  setAuroraColor: (c: AuroraColor) => void;
  auroraSpeed: number;
  setAuroraSpeed: (v: number) => void;
  auroraIntensity: number;
  setAuroraIntensity: (v: number) => void;
  auroraParticles: boolean;
  setAuroraParticles: (v: boolean) => void;

  quickSettings: { wifi: boolean; bluetooth: boolean; darkMode: boolean };
  toggleQuick: (key: 'wifi' | 'bluetooth' | 'darkMode') => void;

  // Android & iOS Mobile Quick Controls
  androidQuickSettings: {
    wifi: boolean;
    bluetooth: boolean;
    flashlight: boolean;
    airplane: boolean;
    batterySaver: boolean;
    doNotDisturb: boolean;
  };
  toggleAndroidQuick: (key: 'wifi' | 'bluetooth' | 'flashlight' | 'airplane' | 'batterySaver' | 'doNotDisturb') => void;
  volume: number;
  setVolume: (v: number) => void;
  brightness: number;
  setBrightness: (v: number) => void;

  // Dynamic Island
  dynamicIslandEvent: { title: string; subtitle?: string; icon?: string } | null;
  triggerDynamicIsland: (title: string, subtitle?: string, icon?: string) => void;

  liteMode: boolean;
  setLiteMode: (v: boolean) => void;
  taskbarAlign: TaskbarAlign;
  setTaskbarAlign: (a: TaskbarAlign) => void;
  autoHideTaskbar: boolean;
  setAutoHideTaskbar: (v: boolean) => void;

  startOpen: boolean;
  setStartOpen: (v: boolean) => void;
  toggleStart: () => void;

  // App Store & Installed Apps
  installedApps: InstalledApp[];
  installApp: (app: Partial<StoreApp> & { name: string; icon: string; description: string; author: string; category: 'utilities' | 'games' }) => void;
  uninstallApp: (appId: string) => void;
  launchInstalledApp: (appId: string) => void;
  isInstalled: (appId: string) => boolean;
  storeCatalog: StoreApp[];

  // Themes Catalog & Downloads
  storeThemes: StoreTheme[];
  installedThemeIds: string[];
  currentThemeId: string | null;
  installTheme: (themeId: string) => void;
  uninstallTheme: (themeId: string) => void;
  applyThemeConfig: (themeId: string) => void;
  isThemeInstalled: (themeId: string) => boolean;

  // Calendar & Task Scheduler
  calendarTasks: CalendarTask[];
  addTask: (task: Omit<CalendarTask, 'id'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

  // Lock screen & Security
  locked: boolean;
  lockSystem: () => void;
  unlockSystem: () => void;
  autoLockMinutes: number;
  setAutoLockMinutes: (mins: number) => void;

  // User Profile
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  showWelcome: boolean;
  setWelcome: (v: boolean) => void;

  // Notification Center
  notifications: NotificationItem[];
  addNotification: (n: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  clearNotifications: () => void;
  dismissNotification: (id: string) => void;

  // System Flyouts
  widgetsOpen: boolean;
  toggleWidgets: () => void;
  copilotOpen: boolean;
  toggleCopilot: () => void;
  controlCenterOpen: boolean;
  toggleControlCenter: () => void;
  launchpadOpen: boolean;
  toggleLaunchpad: () => void;

  // Lock Screen Customizer & Touch Mode
  lockScreenStyle: LockScreenStyle;
  setLockScreenStyle: (style: LockScreenStyle) => void;
  touchMode: boolean;
  setTouchMode: (val: boolean | ((prev: boolean) => boolean)) => void;

  // Sound effects & window management
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  snapAllWindows5050: () => void;
  playSound: (type: 'open' | 'click' | 'lock' | 'notify') => void;

  // Virtual Desktops ("デスク機能" / Task View)
  desktops: VirtualDesktop[];
  activeDesktopId: string;
  taskViewOpen: boolean;
  setTaskViewOpen: (v: boolean) => void;
  toggleTaskView: () => void;
  switchDesktop: (id: string) => void;
  createDesktop: () => void;
  removeDesktop: (id: string) => void;
  moveWindowToDesktop: (winId: string, desktopId: string) => void;

  // Grid-Snapped Desktop Icon Positions & Sizing
  desktopIconPositions: Record<string, { x: number; y: number }>;
  updateDesktopIconPosition: (id: string, x: number, y: number) => void;
  resetDesktopIconPositions: (snapToGrid?: boolean) => void;
  desktopIconSize: DesktopIconSize;
  setDesktopIconSize: (size: DesktopIconSize) => void;
  gridSnapEnabled: boolean;
  setGridSnapEnabled: (v: boolean) => void;
  isWallpaperBright: boolean;

  // Desk Sticky Notes ("デスク付箋")
  deskNotes: DeskStickyNote[];
  addDeskNote: () => void;
  updateDeskNote: (id: string, patch: Partial<DeskStickyNote>) => void;
  deleteDeskNote: (id: string) => void;
}

const OSContext = createContext<OSContextValue | null>(null);

const APP_DEFAULTS: Record<AppId, { title: string; icon: string; width: number; height: number }> = {
  explorer: { title: 'Files', icon: 'FolderOpen', width: 800, height: 530 },
  browser: { title: 'Browser', icon: 'Globe', width: 920, height: 600 },
  terminal: { title: 'Terminal', icon: 'SquareTerminal', width: 700, height: 450 },
  settings: { title: 'Settings', icon: 'Settings', width: 780, height: 560 },
  notepad: { title: 'Editor', icon: 'FileText', width: 640, height: 500 },
  game: { title: 'Arcade Games', icon: 'Gamepad2', width: 880, height: 590 },
  appstore: { title: 'App Store', icon: 'Store', width: 850, height: 610 },
  calculator: { title: 'Calculator', icon: 'Calculator', width: 380, height: 540 },
  taskmanager: { title: 'Task Manager', icon: 'Cpu', width: 740, height: 510 },
  sysmon: { title: 'System Monitor', icon: 'Activity', width: 740, height: 520 },
  calendar: { title: 'Calendar', icon: 'Calendar', width: 820, height: 550 },
  synth: { title: 'Music', icon: 'Music', width: 880, height: 580 },
  entertainment: { title: 'Entertainment (動画・アニメ・映画)', icon: 'Tv', width: 940, height: 620 },
  weather: { title: 'Weather', icon: 'CloudSun', width: 840, height: 580 },
  clock: { title: 'Clock', icon: 'Clock', width: 780, height: 540 },
  ai: { title: 'AI Assistant', icon: 'Sparkles', width: 860, height: 600 },
  studio: { title: 'Glassium Studio', icon: 'studio', width: 900, height: 620 },
  retrocade: { title: 'RetroCade', icon: 'Gamepad2', width: 880, height: 600 },
  paint: { title: 'Spect Studio (お絵かき)', icon: 'paint', width: 820, height: 560 },
  pomodoro: { title: 'Pomodoro Timer (集中タイマー)', icon: 'Clock', width: 520, height: 440 },
  unitconverter: { title: 'Unit Converter (単位変換)', icon: 'SlidersHorizontal', width: 620, height: 480 },
  colorpicker: { title: 'Color Studio (カラーピッカー)', icon: 'Palette', width: 560, height: 460 },
  passgen: { title: 'Password Generator (パスワード生成)', icon: 'Key', width: 540, height: 440 },
  qrcode: { title: 'QR Matrix Studio (QRコード作成)', icon: 'Grid3x3', width: 500, height: 480 },
  jsonformat: { title: 'JSON Formatter (JSON整形)', icon: 'Code2', width: 720, height: 500 },
  regex: { title: 'Regex Tester (正規表現テスト)', icon: 'Search', width: 680, height: 480 },
  markdown: { title: 'Markdown Reader (MDビューア)', icon: 'FileText', width: 780, height: 520 },
  kanban: { title: 'Kanban Board (カンバン管理)', icon: 'LayoutGrid', width: 840, height: 540 },
  habit: { title: 'Habit Tracker (習慣トラッカー)', icon: 'CheckCircle2', width: 700, height: 460 },
  expense: { title: 'Expense Ledger (家計簿・収支)', icon: 'Calculator', width: 620, height: 480 },
  bmi: { title: 'Health & BMI (健康・BMI計算)', icon: 'Activity', width: 540, height: 440 },
  worldclock: { title: 'World Clock Hub (世界時計)', icon: 'Globe', width: 580, height: 480 },
  morse: { title: 'Morse & Cipher (モールス変換)', icon: 'Zap', width: 560, height: 420 },
  base64: { title: 'Base64 & URL Tool (エンコーダー)', icon: 'Code2', width: 640, height: 480 },
  diff: { title: 'Text Diff Viewer (差分比較)', icon: 'Layers', width: 760, height: 520 },
  wordcount: { title: 'Word Analyzer (文字数カウント)', icon: 'FileText', width: 660, height: 480 },
  flashcards: { title: 'Flashcards Deck (暗記カード)', icon: 'BookOpen', width: 600, height: 460 },
  whiteboard: { title: 'Idea Board (アイデア付箋)', icon: 'PenTool', width: 740, height: 500 },
  drumpad: { title: '808 Drum Pad (ドラムパッド)', icon: 'Music', width: 520, height: 480 },
  tuner: { title: 'Frequency Synth (周波数ジェネレータ)', icon: 'Volume2', width: 520, height: 440 },
  minesweeper: { title: 'Cyber Minesweeper (マインスイーパー)', icon: 'Gamepad2', width: 480, height: 500 },
  tictactoe: { title: 'Tic-Tac-Toe AI (〇×ゲーム)', icon: 'Grid3x3', width: 460, height: 460 },
  memory: { title: 'Memory Match (神経衰弱)', icon: 'Sparkles', width: 480, height: 480 },
  typing: { title: 'Typing Trainer (タイピング練習)', icon: 'SquareTerminal', width: 680, height: 440 },
  sudoku: { title: 'Mini Sudoku (ナンプレパズル)', icon: 'Grid3x3', width: 480, height: 460 },
  periodic: { title: 'Periodic Table (元素周期表)', icon: 'Sparkles', width: 720, height: 500 },
  dictionary: { title: 'Tech Lexicon (IT・用語辞典)', icon: 'BookOpen', width: 640, height: 480 },
  sysinfo: { title: 'System Diagnostics (システム診断)', icon: 'Cpu', width: 620, height: 480 },
};

const INITIAL_TASKS: CalendarTask[] = [
  { id: 'task-1', title: 'Review GlassiumOS 5 UI Guidelines', date: '2026-08-27', time: '14:00', category: 'system', completed: true, priority: 'high' },
  { id: 'task-2', title: 'Update 2.5D Glass Refraction Presets', date: '2026-08-27', time: '16:30', category: 'work', completed: false, priority: 'medium' },
  { id: 'task-3', title: 'Prepare Release Documentation', date: '2026-08-28', time: '11:00', category: 'personal', completed: false, priority: 'low' },
];

const LS_KEY = 'glassium-os-v5.0-u1-settings';
const LS_APPS_KEY = 'glassium-os-v5.0-u1-installed-apps';
const LS_THEMES_KEY = 'glassium-os-v5.0-u1-installed-themes';
const LS_CURRENT_THEME_KEY = 'glassium-os-v5.0-u1-current-theme';
const LS_TASKS_KEY = 'glassium-os-v5.0-u1-calendar-tasks';
const LS_FS_KEY = 'glassium-os-v5.0-u1-filesystem';
const LS_ICON_POS_KEY = 'glassium-os-v5.0-u2-icon-positions';
const LS_DESK_NOTES_KEY = 'glassium-os-v5.0-u1-desk-notes';
const LS_DESKTOPS_KEY = 'glassium-os-v5.0-u1-desktops';
const LS_WINDOWS_KEY = 'glassium-os-v5.0-u3-windows';

export const DEFAULT_DESKTOP_ICON_ORDER = [
  'browser',
  'notepad',
  'terminal',
  'calculator',
  'explorer',
  'settings',
  'game',
  'synth',
  'entertainment',
  'calendar',
  'weather',
  'clock',
  'ai',
  'studio',
  'paint',
  'retrocade',
  'taskmanager',
  'appstore',
  'recycle',
];

export function computeDefaultIconPositions(
  iconSize: DesktopIconSize = 'medium'
): Record<string, { x: number; y: number }> {
  const preset = DESKTOP_ICON_SIZE_PRESETS[iconSize] ?? DESKTOP_ICON_SIZE_PRESETS.medium;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const maxRows = Math.max(3, Math.floor((vh - 76) / preset.cellH));
  const map: Record<string, { x: number; y: number }> = {};
  DEFAULT_DESKTOP_ICON_ORDER.forEach((id, idx) => {
    const col = Math.floor(idx / maxRows);
    const row = idx % maxRows;
    map[id] = {
      x: 16 + col * preset.cellW,
      y: 16 + row * preset.cellH,
    };
  });
  return map;
}

function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed !== null && parsed !== undefined) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse error
  }
  return fallback;
}

export function OSProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const persistedSettings = loadPersisted<Record<string, any>>(LS_KEY, {});

  const [allWindows, setWindows] = useState<WindowState[]>(() => {
    const saved = loadPersisted<WindowState[]>(LS_WINDOWS_KEY, []);
    if (!Array.isArray(saved)) return [];
    return saved.filter((w) => w && typeof w.id === 'string' && typeof w.appId === 'string');
  });
  const windows = useMemo(() => allWindows.filter((w) => !w.closed), [allWindows]);
  const mountedWindows = allWindows;
  const zCounter = useRef(
    allWindows.reduce((max, w) => Math.max(max, w.zIndex || 60), 60) + 1
  );
  const idCounter = useRef(
    allWindows.reduce((max, w) => {
      const m = /^win-(\d+)$/.exec(w.id);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0) + 1
  );

  // Virtual Desktops ("デスク機能")
  const [desktops, setDesktops] = useState<VirtualDesktop[]>(() => {
    const loaded = loadPersisted<VirtualDesktop[]>(LS_DESKTOPS_KEY, [
      { id: 'desk-1', name: 'デスクトップ 1' },
      { id: 'desk-2', name: 'デスクトップ 2' },
    ]);
    return Array.isArray(loaded) && loaded.length > 0
      ? loaded
      : [
          { id: 'desk-1', name: 'デスクトップ 1' },
          { id: 'desk-2', name: 'デスクトップ 2' },
        ];
  });
  const [activeDesktopId, setActiveDesktopId] = useState<string>('desk-1');
  const [taskViewOpen, setTaskViewOpen] = useState<boolean>(false);

  const [desktopIconSize, setDesktopIconSizeState] = useState<DesktopIconSize>(() => {
    const candidate = persistedSettings.desktopIconSize as DesktopIconSize;
    return candidate && DESKTOP_ICON_SIZE_PRESETS[candidate] ? candidate : 'medium';
  });
  const [gridSnapEnabled, setGridSnapEnabled] = useState<boolean>(
    persistedSettings.gridSnapEnabled ?? true
  );

  // Grid-Snapped Desktop Icon Positions
  const [desktopIconPositions, setDesktopIconPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const rawSize = persistedSettings.desktopIconSize as DesktopIconSize;
    const initialSize = rawSize && DESKTOP_ICON_SIZE_PRESETS[rawSize] ? rawSize : 'medium';
    const preset = DESKTOP_ICON_SIZE_PRESETS[initialSize] ?? DESKTOP_ICON_SIZE_PRESETS.medium;
    const defaults = computeDefaultIconPositions(initialSize);
    const saved = loadPersisted<Record<string, { x: number; y: number }>>(LS_ICON_POS_KEY, {});
    const merged = { ...defaults, ...(saved && typeof saved === 'object' ? saved : {}) };
    // Ensure all initial positions are aligned to grid slots
    const snapped: Record<string, { x: number; y: number }> = {};
    const occupied = new Set<string>();
    Object.entries(merged).forEach(([key, pos]) => {
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;
      let col = Math.max(0, Math.round((pos.x - 16) / preset.cellW));
      let row = Math.max(0, Math.round((pos.y - 16) / preset.cellH));
      while (occupied.has(`${col},${row}`)) {
        row += 1;
        if (row > 6) {
          row = 0;
          col += 1;
        }
      }
      occupied.add(`${col},${row}`);
      snapped[key] = {
        x: 16 + col * preset.cellW,
        y: 16 + row * preset.cellH,
      };
    });
    return snapped;
  });

  // Desk Sticky Notes ("デスク付箋")
  const [deskNotes, setDeskNotes] = useState<DeskStickyNote[]>(() => {
    const loaded = loadPersisted<DeskStickyNote[]>(LS_DESK_NOTES_KEY, []);
    return Array.isArray(loaded) ? loaded : [];
  });

  const [fileSystem, setFileSystem] = useState<VirtualFolder>(() =>
    loadPersisted<VirtualFolder>(LS_FS_KEY, getInitialFileSystem())
  );

  // Default to 'dynamic-world' (u3 Time/Wind/Weather/Season/Event Dynamic Wallpaper) on u3 upgrade
  const [wallpaper, setWallpaper] = useState<Wallpaper>(() => {
    try {
      const u3Migrated = localStorage.getItem('glassium_v5.0_u3_wallpaper_migrated');
      if (!u3Migrated) {
        localStorage.setItem('glassium_v5.0_u3_wallpaper_migrated', 'true');
        return 'dynamic-world';
      }
    } catch {
      // ignore
    }
    return (persistedSettings.wallpaper as Wallpaper) ?? 'dynamic-world';
  });
  const [customWallpapers, setCustomWallpapers] = useState<CustomWallpaper[]>(persistedSettings.customWallpapers ?? []);
  const [selectedCustomId, setSelectedCustomId] = useState<string | null>(persistedSettings.selectedCustomId ?? null);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    (persistedSettings.themeMode as ThemeMode) ?? (persistedSettings.theme as ThemeMode) ?? 'dark'
  );
  const [theme, setThemeState] = useState<Theme>(persistedSettings.theme ?? 'dark');
  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    try {
      const u3AccentMigrated = localStorage.getItem('glassium_v5.0_u3_accent_migrated');
      if (!u3AccentMigrated) {
        localStorage.setItem('glassium_v5.0_u3_accent_migrated', 'true');
        return (persistedSettings.accentColor as AccentColor) ?? 'dynamic';
      }
    } catch {
      // ignore
    }
    return (persistedSettings.accentColor as AccentColor) ?? 'dynamic';
  });
  const [language, setLanguageState] = useState<OSLanguage>(() => {
    return loadPersisted<OSLanguage>('glassium-os-lang-v2', 'ja');
  });
  const setLanguage = useCallback((lang: OSLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('glassium-os-lang-v2', JSON.stringify(lang));
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, []);
  const [customWallpaperBright, setCustomWallpaperBright] = useState<boolean>(false);
  const [customWallpaperRgb, setCustomWallpaperRgb] = useState<[number, number, number] | null>(null);
  const [dynamicWorldTick, setDynamicWorldTick] = useState<number>(0);

  // UI Styles & Shell Modes
  const [uiStyle, setUiStyleState] = useState<UIStyle>(() => {
    return loadPersisted<UIStyle>('glassium-ui-style', (persistedSettings.uiStyle as UIStyle) ?? 'glassium');
  });
  const setUiStyle = useCallback((style: UIStyle) => {
    setUiStyleState(style);
    try {
      localStorage.setItem('glassium-ui-style', style);
    } catch {
      // ignore
    }
    if (style === 'macos') {
      setShellMode('mac');
    } else if (style === 'one-ui') {
      setShellMode('dex');
    } else if (style === 'material3') {
      setShellMode('chromeos');
    }
  }, []);

  const [sleepClockStyle, setSleepClockStyleState] = useState<SleepClockStyle>(() => {
    return loadPersisted<SleepClockStyle>('glassium-sleep-clock', 'depth');
  });
  const setSleepClockStyle = useCallback((style: SleepClockStyle) => {
    setSleepClockStyleState(style);
    try {
      localStorage.setItem('glassium-sleep-clock', style);
    } catch {
      // ignore
    }
  }, []);

  const [sleepBackground, setSleepBackgroundState] = useState<SleepBackground>(() => {
    return loadPersisted<SleepBackground>('glassium-sleep-bg', 'aurora');
  });
  const setSleepBackground = useCallback((bg: SleepBackground) => {
    setSleepBackgroundState(bg);
    try {
      localStorage.setItem('glassium-sleep-bg', bg);
    } catch {
      // ignore
    }
  }, []);

  const [clockPosition, setClockPositionState] = useState<ClockPosition>(() => {
    return loadPersisted<ClockPosition>('glassium-clock-pos', 'center');
  });
  const setClockPosition = useCallback((pos: ClockPosition) => {
    setClockPositionState(pos);
    try {
      localStorage.setItem('glassium-clock-pos', pos);
    } catch {
      // ignore
    }
  }, []);

  const [temperature] = useState<number>(21);

  // Shell & Design Engines — Default to desktop 'windows' shell so all icons & taskbar are immediately accessible
  const [shellMode, setShellMode] = useState<ShellMode>(() => {
    return (persistedSettings.shellMode as ShellMode) ?? 'windows';
  });
  const [taskbarStyle, setTaskbarStyle] = useState<WindowsTaskbarStyle>(persistedSettings.taskbarStyle ?? 'modern');
  const [designEngine, setDesignEngine] = useState<DesignEngine>(persistedSettings.designEngine ?? 'liquid-glass');
  const [nebulaPreset, setNebulaPreset] = useState<NebulaPreset>(persistedSettings.nebulaPreset ?? 'gargantua');

  // Touch Device Detection without forcefully breaking window management
  useEffect(() => {
    const handleTouch = (e: TouchEvent | PointerEvent) => {
      if ('pointerType' in e && e.pointerType !== 'touch') return;
      // Mark touchMode as enabled for touch-friendly UI spacing & controls
      setTouchMode(true);
    };

    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('pointerdown', handleTouch, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('pointerdown', handleTouch);
    };
  }, []);

  // Sliders & 3D Glass Physics
  const [blurAmount, setBlurAmount] = useState<number>(persistedSettings.blurAmount ?? 24);
  const [cornerRadius, setCornerRadius] = useState<number>(persistedSettings.cornerRadius ?? 18);
  const [transparency, setTransparency] = useState<number>(persistedSettings.transparency ?? 78);
  const [animSpeed, setAnimSpeed] = useState<number>(persistedSettings.animSpeed ?? 1.0);
  const [glassCurvature, setGlassCurvature] = useState<number>(persistedSettings.glassCurvature ?? 32);
  const [glassSpecular, setGlassSpecular] = useState<number>(persistedSettings.glassSpecular ?? 75);
  const [glassWobble, setGlassWobble] = useState<number>(persistedSettings.glassWobble ?? 75);
  const [glassDispersion, setGlassDispersion] = useState<number>(persistedSettings.glassDispersion ?? 6);
  const [glassNoise, setGlassNoise] = useState<number>(persistedSettings.glassNoise ?? 18);

  // Aurora Live Wallpaper Controls (Default to 2-versions-ago default 'amethyst-cyan-silk')
  const [auroraColor, setAuroraColor] = useState<AuroraColor>(persistedSettings.auroraColor ?? 'amethyst-cyan-silk');
  const [auroraSpeed, setAuroraSpeed] = useState<number>(persistedSettings.auroraSpeed ?? 1.0);
  const [auroraIntensity, setAuroraIntensity] = useState<number>(persistedSettings.auroraIntensity ?? 78);
  const [auroraParticles, setAuroraParticles] = useState<boolean>(persistedSettings.auroraParticles ?? true);

  const [quickSettings, setQuickSettings] = useState<{ wifi: boolean; bluetooth: boolean; darkMode: boolean }>(
    persistedSettings.quickSettings ?? { wifi: true, bluetooth: false, darkMode: true }
  );
  const [liteMode, setLiteMode] = useState<boolean>(persistedSettings.liteMode ?? false);
  const [taskbarAlign, setTaskbarAlign] = useState<TaskbarAlign>(persistedSettings.taskbarAlign ?? 'center');
  const [autoHideTaskbar, setAutoHideTaskbar] = useState<boolean>(persistedSettings.autoHideTaskbar ?? false);
  const [startOpen, setStartOpen] = useState(false);

  const [installedApps, setInstalledApps] = useState<InstalledApp[]>(() => {
    const loaded = loadPersisted<InstalledApp[]>(LS_APPS_KEY, [
      {
        id: 'calendar',
        appId: 'calendar',
        name: 'Calendar & Tasks',
        icon: 'Calendar',
        description: 'Interactive agenda grid',
        author: 'Glassium Core',
        category: 'utilities',
        installedAt: Date.now(),
        builtInAppId: 'calendar',
      },
      {
        id: 'synth',
        appId: 'synth',
        name: 'Monochrome Music',
        icon: 'Music',
        description: 'Hi-Fi music streaming and synced lyrics',
        author: 'Monochrome Audio',
        category: 'utilities',
        installedAt: Date.now(),
        builtInAppId: 'synth',
      },
    ]);
    return loaded.filter((a) => a.id !== 'sysmon' && a.appId !== 'sysmon');
  });

  const [installedThemeIds, setInstalledThemeIds] = useState<string[]>(() =>
    loadPersisted<string[]>(LS_THEMES_KEY, ['win11-mica', 'vista-aero', 'xp-luna'])
  );
  const [currentThemeId, setCurrentThemeId] = useState<string | null>(() =>
    loadPersisted<string | null>(LS_CURRENT_THEME_KEY, 'win11-mica')
  );

  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>(() =>
    loadPersisted<CalendarTask[]>(LS_TASKS_KEY, INITIAL_TASKS)
  );

  // Dynamic Island state & trigger
  const [dynamicIslandEvent, setDynamicIslandEvent] = useState<{ title: string; subtitle?: string; icon?: string } | null>(null);
  const dynamicIslandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDynamicIsland = useCallback((title: string, subtitle?: string, icon?: string) => {
    setDynamicIslandEvent({ title, subtitle, icon });
    if (dynamicIslandTimer.current) clearTimeout(dynamicIslandTimer.current);
    dynamicIslandTimer.current = setTimeout(() => {
      setDynamicIslandEvent(null);
    }, 4000);
  }, []);

  // Android Quick Settings & Mobile Controls
  const [androidQuickSettings, setAndroidQuickSettings] = useState({
    wifi: true,
    bluetooth: false,
    flashlight: false,
    airplane: false,
    batterySaver: false,
    doNotDisturb: false,
  });
  const [volume, setVolume] = useState<number>(persistedSettings.volume ?? 80);
  const [brightness, setBrightness] = useState<number>(persistedSettings.brightness ?? 95);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(persistedSettings.soundEnabled ?? true);

  const toggleAndroidQuick = useCallback((key: 'wifi' | 'bluetooth' | 'flashlight' | 'airplane' | 'batterySaver' | 'doNotDisturb') => {
    setAndroidQuickSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      triggerDynamicIsland(`${key.toUpperCase()} ${next[key] ? 'Enabled' : 'Disabled'}`, 'Quick Settings', 'SlidersHorizontal');
      return next;
    });
  }, [triggerDynamicIsland]);

  const [locked, setLocked] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(
    typeof persistedSettings.autoLockMinutes === 'number' ? persistedSettings.autoLockMinutes : 5
  );
  const [lockScreenStyle, setLockScreenStyle] = useState<LockScreenStyle>(
    (persistedSettings.lockScreenStyle as LockScreenStyle) ?? 'hyperos3'
  );
  const [touchMode, setTouchMode] = useState<boolean>(persistedSettings.touchMode === true);
  const [user, setUserState] = useState<UserProfile | null>(persistedSettings.user ?? null);
  const [showWelcome, setWelcome] = useState(false);

  // Notifications State & Initial Seed
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => [
    {
      id: 'notif-welcome',
      title: 'GlassiumOS 5 u1',
      message: 'GlassiumOS 5 u1 (GlasispectUI) desktop environment is ready.',
      time: 'Just now',
      app: 'System',
      icon: 'Shield',
      unread: true,
      timestamp: Date.now(),
    },
    {
      id: 'notif-driver',
      title: 'GlasispectUI Compositor',
      message: 'Translucent liquid glass layers and Live2D silk aurora are active.',
      time: '1 min ago',
      app: 'Settings',
      icon: 'Monitor',
      unread: false,
      timestamp: Date.now() - 60000,
    },
  ]);

  const addNotification = useCallback((n: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    const newNotif: NotificationItem = {
      ...n,
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      unread: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // System Flyouts State
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const toggleWidgets = useCallback(() => setWidgetsOpen((v) => !v), []);

  const [copilotOpen, setCopilotOpen] = useState(false);
  const toggleCopilot = useCallback(() => setCopilotOpen((v) => !v), []);

  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const toggleControlCenter = useCallback(() => setControlCenterOpen((v) => !v), []);

  const [launchpadOpen, setLaunchpadOpen] = useState(false);
  const toggleLaunchpad = useCallback(() => setLaunchpadOpen((v) => !v), []);

  const setTheme = useCallback((t: Theme) => {
    setThemeModeState(t);
    setThemeState(t);
    setQuickSettings((q) => ({ ...q, darkMode: t === 'dark' }));
  }, []);

  const setThemeMode = useCallback((m: ThemeMode) => {
    setThemeModeState(m);
    if (m === 'dark' || m === 'light') {
      setThemeState(m);
      setQuickSettings((q) => ({ ...q, darkMode: m === 'dark' }));
    }
  }, []);

  // Sync theme when themeMode is 'system' (OSに合わせる) or 'sunset-sunrise' (日没・日の出に合わせる)
  useEffect(() => {
    if (themeMode === 'dark' || themeMode === 'light') {
      setThemeState(themeMode);
      setQuickSettings((q) => ({ ...q, darkMode: themeMode === 'dark' }));
      return;
    }

    if (themeMode === 'system') {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemPreference = (isDark: boolean) => {
        const resolved: Theme = isDark ? 'dark' : 'light';
        setThemeState(resolved);
        setQuickSettings((q) => ({ ...q, darkMode: isDark }));
      };
      applySystemPreference(mq.matches);
      const handler = (e: MediaQueryListEvent) => applySystemPreference(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }

    if (themeMode === 'sunset-sunrise') {
      const computeSunTheme = () => {
        let hour = new Date().getHours() + new Date().getMinutes() / 60;
        try {
          const raw = localStorage.getItem('glasis_dynamic_world_wallpaper_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.timeOfDay === 'dawn' || parsed?.timeOfDay === 'day') hour = 12;
            else if (parsed?.timeOfDay === 'dusk' || parsed?.timeOfDay === 'night') hour = 21;
          }
        } catch {
          // ignore
        }
        // Sunrise ~06:00 to Sunset ~17:30 -> Light mode; Sunset to Sunrise -> Dark mode
        const isDaylight = hour >= 6.0 && hour < 17.5;
        const resolved: Theme = isDaylight ? 'light' : 'dark';
        setThemeState(resolved);
        setQuickSettings((q) => ({ ...q, darkMode: resolved === 'dark' }));
      };
      computeSunTheme();
      const timer = setInterval(computeSunTheme, 30000);
      const onWorldChange = () => computeSunTheme();
      window.addEventListener('glassium-dynamic-world-change', onWorldChange);
      window.addEventListener('glasis-dynamic-env-changed', onWorldChange);
      return () => {
        clearInterval(timer);
        window.removeEventListener('glassium-dynamic-world-change', onWorldChange);
        window.removeEventListener('glasis-dynamic-env-changed', onWorldChange);
      };
    }
  }, [themeMode]);

  // Listen to dynamic world state updates so Dynamic Accent Color reacts immediately
  useEffect(() => {
    const onWorldUpdate = () => setDynamicWorldTick((t) => t + 1);
    window.addEventListener('glassium-dynamic-world-change', onWorldUpdate);
    window.addEventListener('glasis-dynamic-env-changed', onWorldUpdate);
    return () => {
      window.removeEventListener('glassium-dynamic-world-change', onWorldUpdate);
      window.removeEventListener('glasis-dynamic-env-changed', onWorldUpdate);
    };
  }, []);

  // Automatically sample custom wallpaper luminance and dominant vibrant color
  useEffect(() => {
    const customWp = customWallpapers.find((c) => c.id === selectedCustomId);
    if (!customWp) {
      setCustomWallpaperBright(false);
      setCustomWallpaperRgb(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 24, 24);
        const data = ctx.getImageData(0, 0, 24, 24).data;
        let totalLum = 0;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let weightSum = 0;
        const count = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLum += lum;
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const sat = maxC - minC;
          // Prefer saturated, non-extreme pixels for the extracted accent color
          const midToneFactor = lum > 25 && lum < 235 ? 1.5 : 0.4;
          const w = (sat + 18) * midToneFactor;
          rSum += r * w;
          gSum += g * w;
          bSum += b * w;
          weightSum += w;
        }
        const avgLum = totalLum / count;
        setCustomWallpaperBright(avgLum > 145);
        if (weightSum > 0) {
          setCustomWallpaperRgb([
            Math.round(rSum / weightSum),
            Math.round(gSum / weightSum),
            Math.round(bSum / weightSum),
          ]);
        }
      } catch {
        setCustomWallpaperBright(false);
        setCustomWallpaperRgb(null);
      }
    };
    img.src = customWp.dataUrl;
    return () => {
      cancelled = true;
    };
  }, [customWallpapers, selectedCustomId]);

  const isWallpaperBright = selectedCustomId
    ? customWallpaperBright
    : Boolean(WALLPAPERS[wallpaper]?.isBright);

  // Compute resolved accent color (supports 'dynamic' which adapts to background/uploaded image + Dark/Light mode)
  const { resolvedAccentHex, resolvedAccentRgb } = useMemo(() => {
    void dynamicWorldTick;
    if (accentColor !== 'dynamic') {
      const preset = ACCENT_COLOR_PRESETS.find((p) => p.id === accentColor) ?? ACCENT_COLOR_PRESETS[1];
      return { resolvedAccentHex: preset.hex, resolvedAccentRgb: preset.rgb };
    }

    // 1. Determine base RGB from uploaded custom image OR active wallpaper
    let baseRgb: [number, number, number] = [56, 189, 248];
    if (selectedCustomId && customWallpaperRgb) {
      baseRgb = customWallpaperRgb;
    } else if (wallpaper === 'dynamic-world') {
      const m = new Date().getMonth() + 1;
      let season = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
      let eventMode = 'none';
      let hour = new Date().getHours();
      try {
        const raw = localStorage.getItem('glasis_dynamic_world_wallpaper_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.season && parsed.season !== 'auto') season = parsed.season;
          if (parsed.event && parsed.event !== 'auto') eventMode = parsed.event;
          if (parsed.timeOfDay === 'dawn') hour = 6;
          else if (parsed.timeOfDay === 'day') hour = 12;
          else if (parsed.timeOfDay === 'dusk') hour = 17.5;
          else if (parsed.timeOfDay === 'night') hour = 22;
        }
      } catch {
        // ignore
      }
      if (eventMode === 'halloween') baseRgb = [249, 115, 22];
      else if (eventMode === 'christmas') baseRgb = [16, 185, 129];
      else if (eventMode === 'newyear') baseRgb = [245, 158, 11];
      else if (eventMode === 'tanabata') baseRgb = [56, 189, 248];
      else if (hour >= 16.5 && hour < 19) baseRgb = [244, 114, 62]; // Sunset warm amber-coral
      else if (hour >= 5 && hour < 7) baseRgb = [236, 72, 153]; // Dawn rose-gold
      else if (season === 'spring') baseRgb = [244, 114, 182]; // Sakura pink
      else if (season === 'summer') baseRgb = [14, 165, 233]; // Ocean cyan-blue
      else if (season === 'autumn') baseRgb = [245, 158, 11]; // Autumn maple amber
      else baseRgb = [56, 189, 248]; // Winter crystal sky
    } else if (wallpaper === 'live2d') {
      if (auroraColor === 'golden-sparkle' || auroraColor === 'solar-gold') baseRgb = [245, 158, 11];
      else if (auroraColor === 'crimson-rose-nebula' || auroraColor === 'rose-gold' || auroraColor === 'sakura-silk' || auroraColor === 'sunset-magenta' || auroraColor === 'classic-synthwave-sun') baseRgb = [244, 63, 94];
      else if (auroraColor === 'polar-emerald-aurora' || auroraColor === 'emerald-sky' || auroraColor === 'classic-matrix-rain' || auroraColor === 'classic-fireflies-forest') baseRgb = [16, 185, 129];
      else if (auroraColor === 'amethyst-cyan-silk' || auroraColor === 'neon-cyber-dusk' || auroraColor === 'classic-galaxy-vortex' || auroraColor === 'classic-plasma-nebula') baseRgb = [139, 92, 246];
      else if (auroraColor === 'abyssal-deep-ocean' || auroraColor === 'ocean-blue' || auroraColor === 'classic-deep-ocean') baseRgb = [59, 130, 246];
      else baseRgb = [6, 182, 212];
    } else if (wallpaper === 'golden-sparkle') {
      baseRgb = [245, 158, 11];
    } else if (wallpaper === 'sunset') {
      baseRgb = [244, 63, 94];
    } else if (wallpaper === 'forest' || wallpaper === 'aurora') {
      baseRgb = [16, 185, 129];
    } else if (wallpaper === 'space' || wallpaper === 'cosmic' || wallpaper === 'shader') {
      baseRgb = [139, 92, 246];
    } else if (wallpaper === 'ocean' || wallpaper === 'bloom') {
      baseRgb = [59, 130, 246];
    }

    // 2. Adapt luminance & saturation based on whether Dark or Light mode is active
    let [r, g, b] = baseRgb;
    // Boost chroma slightly so even muted custom images yield an expressive accent
    const avg = (r + g + b) / 3;
    r = Math.round(avg + (r - avg) * 1.35);
    g = Math.round(avg + (g - avg) * 1.35);
    b = Math.round(avg + (b - avg) * 1.35);

    if (theme === 'dark') {
      // Dark mode: ensure bright, luminous neon/pastel pop on dark surfaces
      r = Math.min(255, Math.max(40, Math.round(r * 0.85 + 48)));
      g = Math.min(255, Math.max(40, Math.round(g * 0.85 + 48)));
      b = Math.min(255, Math.max(40, Math.round(b * 0.85 + 48)));
    } else {
      // Light mode: deepen tone for crisp contrast against white/light glass surfaces
      r = Math.min(220, Math.max(12, Math.round(r * 0.78)));
      g = Math.min(220, Math.max(12, Math.round(g * 0.78)));
      b = Math.min(220, Math.max(12, Math.round(b * 0.78)));
    }

    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return {
      resolvedAccentHex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
      resolvedAccentRgb: `${r}, ${g}, ${b}`,
    };
  }, [accentColor, selectedCustomId, customWallpaperRgb, wallpaper, auroraColor, theme, dynamicWorldTick]);

  // Sync CSS variables & data attributes with custom slider, theme, wallpaper tone, and accent color values
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme-mode', themeMode);
    document.documentElement.setAttribute('data-accent', accentColor);
    document.documentElement.setAttribute('data-ui-style', uiStyle);
    document.documentElement.setAttribute('data-shell-mode', shellMode);
    document.documentElement.setAttribute('data-design-engine', designEngine);
    document.documentElement.setAttribute('data-wallpaper-tone', isWallpaperBright ? 'bright' : 'dark');
    document.documentElement.lang = language;
    document.documentElement.style.setProperty('--os-accent', resolvedAccentHex);
    document.documentElement.style.setProperty('--os-accent-rgb', resolvedAccentRgb);
    document.documentElement.style.setProperty('--theme-blur', `${blurAmount}px`);
    document.documentElement.style.setProperty('--theme-opacity', `${(100 - transparency) / 100}`);
    document.documentElement.style.setProperty('--theme-radius', `${cornerRadius}px`);
    document.documentElement.style.setProperty('--glass-curvature', `${glassCurvature}px`);
    document.documentElement.style.setProperty('--glass-specular', `${glassSpecular / 100}`);
    document.documentElement.style.setProperty('--glass-wobble', `${glassWobble / 100}`);
  }, [theme, themeMode, accentColor, resolvedAccentHex, resolvedAccentRgb, language, uiStyle, shellMode, designEngine, isWallpaperBright, blurAmount, transparency, cornerRadius, glassCurvature, glassSpecular, glassWobble]);

  // Persist Settings
  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          uiStyle,
          wallpaper,
          customWallpapers,
          selectedCustomId,
          theme,
          themeMode,
          accentColor,
          language,
          desktopIconSize,
          gridSnapEnabled,
          shellMode,
          taskbarStyle,
          designEngine,
          autoHideTaskbar,
          nebulaPreset,
          blurAmount,
          cornerRadius,
          transparency,
          animSpeed,
          glassCurvature,
          glassSpecular,
          glassWobble,
          glassDispersion,
          glassNoise,
          auroraColor,
          auroraSpeed,
          auroraIntensity,
          auroraParticles,
          quickSettings,
          liteMode,
          taskbarAlign,
          user,
          lockScreenStyle,
          touchMode,
          volume,
          brightness,
          soundEnabled,
          autoLockMinutes,
        })
      );
    } catch {
      // Ignore quota error
    }
  }, [
    uiStyle,
    wallpaper,
    customWallpapers,
    selectedCustomId,
    theme,
    themeMode,
    accentColor,
    language,
    desktopIconSize,
    gridSnapEnabled,
    shellMode,
    taskbarStyle,
    designEngine,
    autoHideTaskbar,
    nebulaPreset,
    blurAmount,
    cornerRadius,
    transparency,
    animSpeed,
    glassCurvature,
    glassSpecular,
    glassWobble,
    glassDispersion,
    glassNoise,
    auroraColor,
    auroraSpeed,
    auroraIntensity,
    auroraParticles,
    quickSettings,
    liteMode,
    taskbarAlign,
    user,
    lockScreenStyle,
    touchMode,
    volume,
    brightness,
    soundEnabled,
    autoLockMinutes,
  ]);

  // Persist Windows State (including closed/minimized windows so progress is retained)
  useEffect(() => {
    try {
      localStorage.setItem(LS_WINDOWS_KEY, JSON.stringify(allWindows));
    } catch {
      // Ignore quota error
    }
  }, [allWindows]);

  // Persist Apps
  useEffect(() => {
    try {
      localStorage.setItem(LS_APPS_KEY, JSON.stringify(installedApps));
    } catch {
      // Ignore quota error
    }
  }, [installedApps]);

  // Persist Themes
  useEffect(() => {
    try {
      localStorage.setItem(LS_THEMES_KEY, JSON.stringify(installedThemeIds));
    } catch {
      // Ignore quota error
    }
  }, [installedThemeIds]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_CURRENT_THEME_KEY, JSON.stringify(currentThemeId));
    } catch {
      // Ignore quota error
    }
  }, [currentThemeId]);

  // Persist Calendar Tasks
  useEffect(() => {
    try {
      localStorage.setItem(LS_TASKS_KEY, JSON.stringify(calendarTasks));
    } catch {
      // Ignore quota error
    }
  }, [calendarTasks]);

  // Persist File System
  useEffect(() => {
    try {
      localStorage.setItem(LS_FS_KEY, JSON.stringify(fileSystem));
    } catch {
      // Ignore quota error
    }
  }, [fileSystem]);

  // Stylish tactile audio feedback using soundService scaled by volume & soundEnabled
  const playSound = useCallback((type: 'open' | 'click' | 'lock' | 'notify') => {
    if (!soundEnabled || volume <= 0) return;
    try {
      if (type === 'click') soundService.playClick();
      else if (type === 'open') soundService.playOpen();
      else if (type === 'lock') soundService.playLock();
      else if (type === 'notify') soundService.playNotify();
    } catch {
      // AudioContext might be blocked until user gesture
    }
  }, [soundEnabled, volume]);

  // Persist Icon Positions, Virtual Desktops & Desk Notes
  useEffect(() => {
    try {
      localStorage.setItem(LS_ICON_POS_KEY, JSON.stringify(desktopIconPositions));
    } catch {
      // Ignore quota error
    }
  }, [desktopIconPositions]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_DESKTOPS_KEY, JSON.stringify(desktops));
    } catch {
      // Ignore quota error
    }
  }, [desktops]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_DESK_NOTES_KEY, JSON.stringify(deskNotes));
    } catch {
      // Ignore quota error
    }
  }, [deskNotes]);

  const setDesktopIconSize = useCallback(
    (newSize: DesktopIconSize) => {
      playSound('click');
      setDesktopIconSizeState((oldSize) => {
        const oldPreset = DESKTOP_ICON_SIZE_PRESETS[oldSize] ?? DESKTOP_ICON_SIZE_PRESETS.medium;
        const newPreset = DESKTOP_ICON_SIZE_PRESETS[newSize] ?? DESKTOP_ICON_SIZE_PRESETS.medium;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        const maxCols = Math.max(2, Math.floor((vw - 24) / newPreset.cellW));
        const maxRows = Math.max(3, Math.floor((vh - 76) / newPreset.cellH));

        setDesktopIconPositions((prev) => {
          const next: Record<string, { x: number; y: number }> = {};
          const occupied = new Set<string>();
          Object.entries(prev).forEach(([key, pos]) => {
            let col = Math.max(0, Math.min(maxCols - 1, Math.round((pos.x - 16) / oldPreset.cellW)));
            let row = Math.max(0, Math.min(maxRows - 1, Math.round((pos.y - 16) / oldPreset.cellH)));
            while (occupied.has(`${col},${row}`)) {
              row += 1;
              if (row >= maxRows) {
                row = 0;
                col += 1;
              }
            }
            occupied.add(`${col},${row}`);
            next[key] = {
              x: 16 + col * newPreset.cellW,
              y: 16 + row * newPreset.cellH,
            };
          });
          return next;
        });
        return newSize;
      });
    },
    [playSound]
  );

  const updateDesktopIconPosition = useCallback(
    (id: string, x: number, y: number) => {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      const preset = DESKTOP_ICON_SIZE_PRESETS[desktopIconSize] ?? DESKTOP_ICON_SIZE_PRESETS.medium;

      if (!gridSnapEnabled) {
        const clampedX = Math.max(8, Math.min(vw - preset.boxW - 8, Math.round(x)));
        const clampedY = Math.max(8, Math.min(vh - preset.boxH - 56, Math.round(y)));
        setDesktopIconPositions((prev) => ({
          ...prev,
          [id]: { x: clampedX, y: clampedY },
        }));
        return;
      }

      const maxCols = Math.max(2, Math.floor((vw - 24) / preset.cellW));
      const maxRows = Math.max(3, Math.floor((vh - 76) / preset.cellH));
      const targetCol = Math.max(0, Math.min(maxCols - 1, Math.round((x - 16) / preset.cellW)));
      const targetRow = Math.max(0, Math.min(maxRows - 1, Math.round((y - 16) / preset.cellH)));
      const snappedX = 16 + targetCol * preset.cellW;
      const snappedY = 16 + targetRow * preset.cellH;

      setDesktopIconPositions((prev) => {
        const prevPos = prev[id];
        const next = { ...prev };

        // Check if another icon already occupies this grid slot
        const collidingEntry = Object.entries(prev).find(([otherId, pos]) => {
          if (otherId === id) return false;
          const cCol = Math.round((pos.x - 16) / preset.cellW);
          const cRow = Math.round((pos.y - 16) / preset.cellH);
          return cCol === targetCol && cRow === targetRow;
        });

        next[id] = { x: snappedX, y: snappedY };

        if (collidingEntry) {
          const [otherId] = collidingEntry;
          if (prevPos) {
            // Swap with previous slot of dragged icon
            const prevCol = Math.max(0, Math.min(maxCols - 1, Math.round((prevPos.x - 16) / preset.cellW)));
            const prevRow = Math.max(0, Math.min(maxRows - 1, Math.round((prevPos.y - 16) / preset.cellH)));
            next[otherId] = {
              x: 16 + prevCol * preset.cellW,
              y: 16 + prevRow * preset.cellH,
            };
          } else {
            // Find first open slot
            const occupied = new Set(
              Object.entries(next)
                .filter(([k]) => k !== otherId)
                .map(([, p]) => `${Math.round((p.x - 16) / preset.cellW)},${Math.round((p.y - 16) / preset.cellH)}`)
            );
            let fCol = 0;
            let fRow = 0;
            while (occupied.has(`${fCol},${fRow}`)) {
              fRow += 1;
              if (fRow >= maxRows) {
                fRow = 0;
                fCol += 1;
              }
            }
            next[otherId] = {
              x: 16 + fCol * preset.cellW,
              y: 16 + fRow * preset.cellH,
            };
          }
        }
        return next;
      });
    },
    [desktopIconSize, gridSnapEnabled]
  );

  const resetDesktopIconPositions = useCallback(
    (snapToGrid?: boolean) => {
      playSound('click');
      const preset = DESKTOP_ICON_SIZE_PRESETS[desktopIconSize] ?? DESKTOP_ICON_SIZE_PRESETS.medium;
      if (snapToGrid) {
        setDesktopIconPositions((prev) => {
          const next: Record<string, { x: number; y: number }> = {};
          const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
          const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
          const maxCols = Math.max(2, Math.floor((vw - 24) / preset.cellW));
          const maxRows = Math.max(3, Math.floor((vh - 76) / preset.cellH));
          const occupied = new Set<string>();
          Object.entries(prev).forEach(([key, pos]) => {
            let col = Math.max(0, Math.min(maxCols - 1, Math.round((pos.x - 16) / preset.cellW)));
            let row = Math.max(0, Math.min(maxRows - 1, Math.round((pos.y - 16) / preset.cellH)));
            while (occupied.has(`${col},${row}`)) {
              row += 1;
              if (row >= maxRows) {
                row = 0;
                col += 1;
              }
            }
            occupied.add(`${col},${row}`);
            next[key] = {
              x: 16 + col * preset.cellW,
              y: 16 + row * preset.cellH,
            };
          });
          return next;
        });
      } else {
        setDesktopIconPositions(computeDefaultIconPositions(desktopIconSize));
      }
    },
    [playSound, desktopIconSize]
  );

  const toggleTaskView = useCallback(() => {
    playSound('click');
    setTaskViewOpen((v) => !v);
  }, [playSound]);

  const switchDesktop = useCallback((id: string) => {
    playSound('click');
    setActiveDesktopId(id);
    setTaskViewOpen(false);
  }, [playSound]);

  const createDesktop = useCallback(() => {
    playSound('open');
    setDesktops((prev) => {
      const nextNum = prev.length + 1;
      const newDesk: VirtualDesktop = {
        id: `desk-${Date.now()}`,
        name: `デスクトップ ${nextNum}`,
      };
      setActiveDesktopId(newDesk.id);
      return [...prev, newDesk];
    });
  }, [playSound]);

  const removeDesktop = useCallback((id: string) => {
    playSound('click');
    setDesktops((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((d) => d.id !== id);
      const fallbackId = remaining[0].id;
      setWindows((ws) =>
        ws.map((w) => (w.desktopId === id ? { ...w, desktopId: fallbackId } : w))
      );
      setActiveDesktopId((curr) => (curr === id ? fallbackId : curr));
      return remaining;
    });
  }, [playSound]);

  const moveWindowToDesktop = useCallback((winId: string, desktopId: string) => {
    playSound('click');
    setWindows((ws) =>
      ws.map((w) => (w.id === winId ? { ...w, desktopId, minimized: false } : w))
    );
  }, [playSound]);

  const addDeskNote = useCallback(() => {
    playSound('open');
    const colors: DeskStickyNote['color'][] = ['cyan', 'violet', 'amber', 'emerald', 'rose'];
    setDeskNotes((prev) => [
      ...prev,
      {
        id: `note-${Date.now()}`,
        text: 'デスクメモをここに入力...',
        color: colors[prev.length % colors.length],
        x: 240 + (prev.length % 5) * 32,
        y: 80 + (prev.length % 5) * 32,
      },
    ]);
  }, [playSound]);

  const updateDeskNote = useCallback((id: string, patch: Partial<DeskStickyNote>) => {
    setDeskNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const deleteDeskNote = useCallback((id: string) => {
    playSound('click');
    setDeskNotes((prev) => prev.filter((n) => n.id !== id));
  }, [playSound]);

  const focusWindow = useCallback((id: string) => {
    zCounter.current += 1;
    const z = zCounter.current;
    setWindows((ws) =>
      ws.map((w) => (w.id === id ? { ...w, zIndex: z, minimized: false } : w))
    );
  }, []);

  const openApp = useCallback(
    (rawAppId: AppId, opts?: OpenOptions) => {
      const appId: AppId = rawAppId === 'sysmon' ? 'taskmanager' : rawAppId;
      playSound('open');
      setTaskViewOpen(false);
      setWindows((ws) => {
        // Reuse existing window (even if closed or minimized) so progress and current screen are preserved!
        const existing = ws.find((w) => w.appId === appId);
        if (existing && (appId !== 'notepad' || !opts?.payload)) {
          zCounter.current += 1;
          const z = zCounter.current;
          return ws.map((w) =>
            w.id === existing.id
              ? {
                  ...w,
                  zIndex: z,
                  minimized: false,
                  closed: false,
                  desktopId: activeDesktopId,
                  ...(opts?.payload !== undefined ? { payload: opts.payload } : {}),
                  ...(opts?.title ? { title: opts.title } : {}),
                }
              : w
          );
        }
        const def = APP_DEFAULTS[appId] ?? {
          title: 'Application',
          icon: 'Sparkles',
          width: 760,
          height: 520,
        };
        idCounter.current += 1;
        const id = `win-${idCounter.current}`;
        zCounter.current += 1;
        const count = ws.filter((w) => !w.closed && (!w.desktopId || w.desktopId === activeDesktopId)).length;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        const width = Math.min(vw - 20, opts?.width ?? def.width);
        const height = Math.min(vh - 70, opts?.height ?? def.height);
        const maxX = Math.max(16, vw - width - 24);
        const maxY = Math.max(16, vh - height - 64);
        const x = Math.max(16, Math.min(maxX, 72 + (count % 8) * 36));
        const y = Math.max(16, Math.min(maxY, 36 + (count % 8) * 30));
        const win: WindowState = {
          id,
          appId,
          title: opts?.title ?? def.title,
          icon: opts?.icon ?? def.icon,
          x,
          y,
          width,
          height,
          zIndex: zCounter.current,
          minimized: false,
          closed: false,
          maximized: false,
          desktopId: activeDesktopId,
          payload: opts?.payload,
        };
        return [...ws, win];
      });
    },
    [activeDesktopId, playSound]
  );

  const launchInstalledApp = useCallback(
    (appId: string) => {
      playSound('open');
      setTaskViewOpen(false);
      const storeItem = STORE_CATALOG.find((s) => s.id === appId);
      if (storeItem?.builtInAppId) {
        openApp(storeItem.builtInAppId, { payload: { gameId: storeItem.id } });
        return;
      }
      const app = installedApps.find((a) => a.appId === appId || a.id === appId);
      if (!app) return;
      if (app.builtInAppId) {
        openApp(app.builtInAppId, { payload: { gameId: app.id } });
        return;
      }
      setWindows((ws) => {
        const existing = ws.find((w) => w.appId === app.appId);
        if (existing) {
          zCounter.current += 1;
          const z = zCounter.current;
          return ws.map((w) =>
            w.id === existing.id
              ? { ...w, zIndex: z, minimized: false, closed: false, desktopId: activeDesktopId }
              : w
          );
        }
        idCounter.current += 1;
        const id = `win-${idCounter.current}`;
        zCounter.current += 1;
        const count = ws.filter((w) => !w.closed && (!w.desktopId || w.desktopId === activeDesktopId)).length;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        const width = Math.min(vw - 20, 840);
        const height = Math.min(vh - 70, 560);
        const maxX = Math.max(16, vw - width - 24);
        const maxY = Math.max(16, vh - height - 64);
        const x = Math.max(16, Math.min(maxX, 76 + (count % 8) * 36));
        const y = Math.max(16, Math.min(maxY, 40 + (count % 8) * 30));
        const win: WindowState = {
          id,
          appId: app.appId,
          title: app.name,
          icon: app.icon,
          x,
          y,
          width,
          height,
          zIndex: zCounter.current,
          minimized: false,
          closed: false,
          maximized: false,
          desktopId: activeDesktopId,
          payload: { appInfo: app, url: app.url, isCustomApp: Boolean(app.url) },
        };
        return [...ws, win];
      });
    },
    [installedApps, activeDesktopId, openApp, playSound]
  );

  const closeWindow = useCallback((id: string) => {
    playSound('click');
    // Keep window in allWindows with closed: true so React component state & user progress are preserved
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, closed: true, minimized: false } : w)));
  }, [playSound]);

  const minimizeWindow = useCallback((id: string) => {
    playSound('click');
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, [playSound]);

  const restoreWindow = useCallback(
    (id: string) => {
      zCounter.current += 1;
      const z = zCounter.current;
      setWindows((ws) =>
        ws.map((w) => (w.id === id ? { ...w, minimized: false, closed: false, zIndex: z } : w))
      );
    },
    []
  );

  const toggleMaximize = useCallback((id: string) => {
    playSound('click');
    zCounter.current += 1;
    const z = zCounter.current;
    setWindows((ws) =>
      ws.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          const fallbackRect = { x: 80, y: 50, width: 820, height: 540 };
          const { x, y, width, height } = w.prevRect ?? fallbackRect;
          return { ...w, maximized: false, zIndex: z, x, y, width, height, prevRect: undefined };
        }
        return {
          ...w,
          maximized: true,
          zIndex: z,
          prevRect: { x: w.x, y: w.y, width: w.width, height: w.height },
        };
      })
    );
  }, [playSound]);

  const updateWindowRect = useCallback(
    (id: string, rect: Partial<Pick<WindowState, 'x' | 'y' | 'width' | 'height'>>) => {
      setWindows((ws) =>
        ws.map((w) => (w.id === id ? { ...w, ...rect } : w))
      );
    },
    []
  );

  const getTopWindowId = useCallback(() => {
    let topId: string | null = null;
    let topZ = -1;
    for (const w of windows) {
      if (!w.minimized && w.zIndex > topZ) {
        topZ = w.zIndex;
        topId = w.id;
      }
    }
    return topId;
  }, [windows]);

  const saveFile = useCallback((path: string[], name: string, content: string) => {
    setFileSystem((fs) => {
      const clone: VirtualFolder = JSON.parse(JSON.stringify(fs));
      let folder = clone;
      for (const seg of path) {
        const next = folder.children.find((c) => c.name === seg && c.kind === 'folder');
        if (!next || next.kind !== 'folder') return fs;
        folder = next;
      }
      const existing = folder.children.find((c) => c.name === name && c.kind === 'file');
      if (existing && existing.kind === 'file') {
        existing.content = content;
      } else {
        folder.children.push({
          id: `file-${Date.now()}`,
          name,
          kind: 'file',
          type: 'text',
          content,
          createdAt: Date.now(),
        });
      }
      return clone;
    });
  }, []);

  const createFolder = useCallback((path: string[], folderName: string) => {
    setFileSystem((fs) => {
      const clone: VirtualFolder = JSON.parse(JSON.stringify(fs));
      let folder = clone;
      for (const seg of path) {
        const next = folder.children.find((c) => c.name === seg && c.kind === 'folder');
        if (!next || next.kind !== 'folder') return fs;
        folder = next;
      }
      if (!folder.children.some((c) => c.name === folderName)) {
        folder.children.push({
          id: `folder-${Date.now()}`,
          name: folderName,
          kind: 'folder',
          children: [],
        });
      }
      return clone;
    });
  }, []);

  const deleteNode = useCallback((path: string[], nodeName: string) => {
    setFileSystem((fs) => {
      const clone: VirtualFolder = JSON.parse(JSON.stringify(fs));
      let folder = clone;
      for (const seg of path) {
        const next = folder.children.find((c) => c.name === seg && c.kind === 'folder');
        if (!next || next.kind !== 'folder') return fs;
        folder = next;
      }
      folder.children = folder.children.filter((c) => c.name !== nodeName);
      return clone;
    });
  }, []);

  const recycleFile = useCallback((path: string[], nodeName: string) => {
    setFileSystem((fs) => {
      const clone: VirtualFolder = JSON.parse(JSON.stringify(fs));
      let folder = clone;
      for (const seg of path) {
        const next = folder.children.find((c) => c.name === seg && c.kind === 'folder');
        if (!next || next.kind !== 'folder') return fs;
        folder = next;
      }
      const targetIdx = folder.children.findIndex((c) => c.name === nodeName);
      if (targetIdx === -1) return fs;
      const [item] = folder.children.splice(targetIdx, 1);

      // Find or create recycle bin folder in root
      let trashFolder = clone.children.find((c) => c.id === 'trash' || c.name.toLowerCase().includes('recycle') || c.name.toLowerCase().includes('trash'));
      if (!trashFolder || trashFolder.kind !== 'folder') {
        trashFolder = { id: 'trash', name: 'Recycle Bin', kind: 'folder', children: [] };
        clone.children.push(trashFolder);
      }
      (trashFolder as VirtualFolder).children.push(item);
      return clone;
    });
    playSound('notify');
  }, [playSound]);

  const emptyRecycleBin = useCallback(() => {
    setFileSystem((fs) => {
      const clone: VirtualFolder = JSON.parse(JSON.stringify(fs));
      const trashFolder = clone.children.find((c) => c.id === 'trash' || c.name.toLowerCase().includes('recycle') || c.name.toLowerCase().includes('trash'));
      if (trashFolder && trashFolder.kind === 'folder') {
        trashFolder.children = [];
      }
      return clone;
    });
    playSound('click');
  }, [playSound]);

  const restoreRecycleFile = useCallback((nodeName: string) => {
    setFileSystem((fs) => {
      const clone: VirtualFolder = JSON.parse(JSON.stringify(fs));
      const trashFolder = clone.children.find((c) => c.id === 'trash' || c.name.toLowerCase().includes('recycle') || c.name.toLowerCase().includes('trash'));
      if (!trashFolder || trashFolder.kind !== 'folder') return fs;
      const targetIdx = trashFolder.children.findIndex((c) => c.name === nodeName);
      if (targetIdx === -1) return fs;
      const [item] = trashFolder.children.splice(targetIdx, 1);

      // Restore into Documents or root
      const docsFolder = clone.children.find((c) => c.id === 'documents' || c.name === 'Documents');
      if (docsFolder && docsFolder.kind === 'folder') {
        docsFolder.children.push(item);
      } else {
        clone.children.push(item);
      }
      return clone;
    });
    playSound('open');
  }, [playSound]);

  const openFileNode = useCallback(
    (node: VirtualNode) => {
      if (node.kind === 'folder') {
        openApp('explorer', { payload: { folderPath: [node.name] } });
        return;
      }
      if (node.type === 'text') {
        openApp('notepad', {
          title: node.name,
          payload: { fileName: node.name, content: node.content },
          width: 640,
          height: 500,
        });
      } else {
        openApp('browser', {
          title: node.name,
          payload: { url: node.content, isImage: true },
        });
      }
    },
    [openApp]
  );

  const toggleQuick = useCallback((key: 'wifi' | 'bluetooth' | 'darkMode') => {
    setQuickSettings((q) => {
      const next = { ...q, [key]: !q[key] };
      if (key === 'darkMode') setThemeState(next.darkMode ? 'dark' : 'light');
      return next;
    });
  }, []);

  const addCustomWallpaper = useCallback((name: string, dataUrl: string) => {
    const id = `custom-${Date.now()}`;
    setCustomWallpapers((list) => [...list, { id, name, dataUrl }]);
    setSelectedCustomId(id);
  }, []);

  const toggleStart = useCallback(() => setStartOpen((v) => !v), []);

  const installApp = useCallback((app: Partial<StoreApp> & { name: string; icon: string; description: string; author: string; category: 'utilities' | 'games' }) => {
    playSound('notify');
    setInstalledApps((list) => {
      const id = app.id || `custom-${Date.now()}`;
      if (list.some((a) => a.id === id)) return list;
      const appId = app.builtInAppId ?? (app.url ? `custom:${id}` : id);
      return [
        ...list,
        {
          id,
          appId,
          name: app.name,
          icon: app.icon,
          description: app.description,
          author: app.author,
          category: app.category,
          installedAt: Date.now(),
          builtInAppId: app.builtInAppId,
          url: app.url,
          isCustom: Boolean(app.url),
        },
      ];
    });
  }, [playSound]);

  const uninstallApp = useCallback((appId: string) => {
    playSound('click');
    setInstalledApps((list) => list.filter((a) => a.id !== appId && a.appId !== appId));
  }, [playSound]);

  const isInstalled = useCallback(
    (appId: string) => installedApps.some((a) => a.id === appId || a.appId === appId),
    [installedApps]
  );

  // Theme Operations
  const isThemeInstalled = useCallback(
    (themeId: string) => installedThemeIds.includes(themeId),
    [installedThemeIds]
  );

  const installTheme = useCallback((themeId: string) => {
    playSound('notify');
    setInstalledThemeIds((prev) => (prev.includes(themeId) ? prev : [...prev, themeId]));
    const target = STORE_THEMES.find((t) => t.id === themeId);
    if (target) {
      addNotification({
        title: 'Theme Downloaded',
        message: `${target.name} has been added to your theme library.`,
        icon: 'Palette',
      });
      triggerDynamicIsland(target.name, 'Theme Downloaded', 'Palette');
    }
  }, [playSound, addNotification, triggerDynamicIsland]);

  const uninstallTheme = useCallback((themeId: string) => {
    playSound('click');
    setInstalledThemeIds((prev) => prev.filter((id) => id !== themeId));
    if (currentThemeId === themeId) {
      setCurrentThemeId(null);
    }
  }, [playSound, currentThemeId]);

  const applyThemeConfig = useCallback((themeId: string) => {
    const target = STORE_THEMES.find((t) => t.id === themeId);
    if (!target) return;
    playSound('open');
    setShellMode(target.config.shellMode);
    setDesignEngine(target.config.designEngine);
    setWallpaper(target.config.wallpaper);
    setTheme(target.config.theme);
    if (target.config.blurAmount !== undefined) setBlurAmount(target.config.blurAmount);
    if (target.config.cornerRadius !== undefined) setCornerRadius(target.config.cornerRadius);
    if (target.config.transparency !== undefined) setTransparency(target.config.transparency);
    setCurrentThemeId(themeId);

    setInstalledThemeIds((prev) => (prev.includes(themeId) ? prev : [...prev, themeId]));

    addNotification({
      title: 'Theme Applied',
      message: `Active theme changed to ${target.name}.`,
      icon: 'Palette',
    });
    triggerDynamicIsland(target.name, 'Theme Activated', 'Check');
  }, [playSound, addNotification, triggerDynamicIsland]);

  // Calendar Task Operations
  const addTask = useCallback((task: Omit<CalendarTask, 'id'>) => {
    const id = `task-${Date.now()}`;
    setCalendarTasks((prev) => [
      { id, ...task },
      ...prev,
    ]);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setCalendarTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setCalendarTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const lockSystem = useCallback(() => {
    playSound('lock');
    setLocked(true);
  }, [playSound]);

  const unlockSystem = useCallback(() => {
    playSound('open');
    setLocked(false);
  }, [playSound]);

  const setUser = useCallback((u: UserProfile | null) => {
    setUserState(u);
    if (u) {
      setWelcome(true);
    }
  }, []);

  // System auto-lock after autoLockMinutes of idle (0 = Off)
  useEffect(() => {
    if (!autoLockMinutes || autoLockMinutes <= 0 || locked) return;
    let timer: number;
    const timeoutMs = autoLockMinutes * 60 * 1000;
    const resetIdle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!locked) {
          lockSystem();
        }
      }, timeoutMs);
    };

    window.addEventListener('mousemove', resetIdle, { passive: true });
    window.addEventListener('pointerdown', resetIdle, { passive: true });
    window.addEventListener('keydown', resetIdle, { passive: true });
    window.addEventListener('wheel', resetIdle, { passive: true });
    window.addEventListener('touchstart', resetIdle, { passive: true });
    resetIdle();

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('pointerdown', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('wheel', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
    };
  }, [locked, autoLockMinutes, lockSystem]);

  // Global Keyboard Shortcuts (e.g. Win+L to lock system)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Super/Alt/Meta + L
      if ((e.metaKey || e.altKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        lockSystem();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lockSystem]);

  const snapAllWindows5050 = useCallback(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight - 48 : 750;
    setWindows((ws) => {
      const visible = ws.filter((w) => !w.minimized && !w.closed);
      if (visible.length === 0) return ws;
      if (visible.length === 1) {
        return ws.map((w) =>
          w.id === visible[0].id ? { ...w, maximized: false, x: 12, y: 12, width: vw - 24, height: vh - 24 } : w
        );
      }
      const halfW = Math.floor((vw - 36) / 2);
      return ws.map((w) => {
        const idx = visible.findIndex((v) => v.id === w.id);
        if (idx === 0) {
          return { ...w, maximized: false, x: 12, y: 12, width: halfW, height: vh - 24 };
        }
        if (idx === 1) {
          return { ...w, maximized: false, x: 24 + halfW, y: 12, width: halfW, height: vh - 24 };
        }
        return w;
      });
    });
  }, []);

  const value: OSContextValue = {
    windows,
    mountedWindows,
    openApp,
    closeWindow,
    focusWindow,
    minimizeWindow,
    toggleMaximize,
    updateWindowRect,
    restoreWindow,
    getTopWindowId,
    fileSystem,
    setFileSystem,
    saveFile,
    createFolder,
    deleteNode,
    openFileNode,
    recycleFile,
    emptyRecycleBin,
    restoreRecycleFile,
    wallpaper,
    setWallpaper,
    customWallpapers,
    addCustomWallpaper,
    selectedCustomId,
    setSelectedCustomId,
    theme,
    setTheme,
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    resolvedAccentHex,
    resolvedAccentRgb,
    language,
    setLanguage,
    uiStyle,
    setUiStyle,
    shellMode,
    setShellMode,
    taskbarStyle,
    setTaskbarStyle,
    designEngine,
    setDesignEngine,
    nebulaPreset,
    setNebulaPreset,
    sleepClockStyle,
    setSleepClockStyle,
    sleepBackground,
    setSleepBackground,
    clockPosition,
    setClockPosition,
    temperature,
    blurAmount,
    setBlurAmount,
    cornerRadius,
    setCornerRadius,
    transparency,
    setTransparency,
    animSpeed,
    setAnimSpeed,
    glassCurvature,
    setGlassCurvature,
    glassSpecular,
    setGlassSpecular,
    glassWobble,
    setGlassWobble,
    glassDispersion,
    setGlassDispersion,
    glassNoise,
    setGlassNoise,
    auroraColor,
    setAuroraColor,
    auroraSpeed,
    setAuroraSpeed,
    auroraIntensity,
    setAuroraIntensity,
    auroraParticles,
    setAuroraParticles,
    quickSettings,
    toggleQuick,
    androidQuickSettings,
    toggleAndroidQuick,
    volume,
    setVolume,
    brightness,
    setBrightness,
    dynamicIslandEvent,
    triggerDynamicIsland,
    liteMode,
    setLiteMode,
    taskbarAlign,
    setTaskbarAlign,
    autoHideTaskbar,
    setAutoHideTaskbar,
    startOpen,
    setStartOpen,
    toggleStart,
    installedApps,
    installApp,
    uninstallApp,
    launchInstalledApp,
    isInstalled,
    storeCatalog: STORE_CATALOG,
    storeThemes: STORE_THEMES,
    installedThemeIds,
    currentThemeId,
    installTheme,
    uninstallTheme,
    applyThemeConfig,
    isThemeInstalled,
    calendarTasks,
    addTask,
    toggleTask,
    deleteTask,
    locked,
    lockSystem,
    unlockSystem,
    autoLockMinutes,
    setAutoLockMinutes,
    user,
    setUser,
    showWelcome,
    setWelcome,
    notifications,
    addNotification,
    clearNotifications,
    dismissNotification,
    widgetsOpen,
    toggleWidgets,
    copilotOpen,
    toggleCopilot,
    controlCenterOpen,
    toggleControlCenter,
    launchpadOpen,
    toggleLaunchpad,
    lockScreenStyle,
    setLockScreenStyle,
    touchMode,
    setTouchMode,
    soundEnabled,
    setSoundEnabled,
    snapAllWindows5050,
    playSound,
    desktops,
    activeDesktopId,
    taskViewOpen,
    setTaskViewOpen,
    toggleTaskView,
    switchDesktop,
    createDesktop,
    removeDesktop,
    moveWindowToDesktop,
    desktopIconPositions,
    updateDesktopIconPosition,
    resetDesktopIconPositions,
    desktopIconSize,
    setDesktopIconSize,
    gridSnapEnabled,
    setGridSnapEnabled,
    isWallpaperBright,
    deskNotes,
    addDeskNote,
    updateDeskNote,
    deleteDeskNote,
  };

  return <OSContext.Provider value={value}>{children}</OSContext.Provider>;
}

export function useOS() {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error('useOS must be used within OSProvider');
  return ctx;
}
