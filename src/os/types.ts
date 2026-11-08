export type AppId =
  | 'explorer'
  | 'browser'
  | 'terminal'
  | 'settings'
  | 'notepad'
  | 'game'
  | 'appstore'
  | 'sysmon'
  | 'calendar'
  | 'synth'
  | 'calculator'
  | 'taskmanager'
  | 'weather'
  | 'clock'
  | 'ai'
  | 'studio'
  | 'retrocade'
  | 'paint'
  | 'pomodoro'
  | 'unitconverter'
  | 'colorpicker'
  | 'passgen'
  | 'qrcode'
  | 'jsonformat'
  | 'regex'
  | 'markdown'
  | 'kanban'
  | 'habit'
  | 'expense'
  | 'bmi'
  | 'worldclock'
  | 'morse'
  | 'base64'
  | 'diff'
  | 'wordcount'
  | 'flashcards'
  | 'whiteboard'
  | 'drumpad'
  | 'tuner'
  | 'minesweeper'
  | 'tictactoe'
  | 'memory'
  | 'typing'
  | 'sudoku'
  | 'periodic'
  | 'dictionary'
  | 'entertainment'
  | 'sysinfo';

// Custom installed apps use a string ID prefixed with 'custom:'
export type WindowAppId = AppId | string;

export interface WindowState {
  id: string;
  appId: WindowAppId;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  closed?: boolean;
  desktopId?: string;
  prevRect?: { x: number; y: number; width: number; height: number };
  payload?: unknown;
}

export interface VirtualDesktop {
  id: string;
  name: string;
}

export interface TaskbarApp {
  appId: AppId;
  label: string;
  icon: string;
}

export const TASKBAR_APPS: TaskbarApp[] = [
  { appId: 'browser', label: 'Browser', icon: 'Globe' },
  { appId: 'entertainment', label: 'Entertainment', icon: 'Tv' },
  { appId: 'synth', label: 'Music', icon: 'Music' },
  { appId: 'notepad', label: 'Editor', icon: 'FileText' },
  { appId: 'terminal', label: 'Terminal', icon: 'SquareTerminal' },
  { appId: 'explorer', label: 'Files', icon: 'FolderOpen' },
  { appId: 'calculator', label: 'Calculator', icon: 'Calculator' },
  { appId: 'settings', label: 'Settings', icon: 'Settings' },
];

export type TaskbarAlign = 'center' | 'left';
export type DesktopIconSize = 'small' | 'medium' | 'large';

export const DESKTOP_ICON_SIZE_PRESETS: Record<
  DesktopIconSize,
  {
    id: DesktopIconSize;
    label: string;
    labelJa: string;
    cellW: number;
    cellH: number;
    boxW: number;
    boxH: number;
    iconPx: number;
    fontClass: string;
  }
> = {
  small: {
    id: 'small',
    label: 'Small',
    labelJa: '小 (コンパクト)',
    cellW: 78,
    cellH: 82,
    boxW: 70,
    boxH: 74,
    iconPx: 28,
    fontClass: 'text-[10px]',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    labelJa: '中 (標準)',
    cellW: 96,
    cellH: 100,
    boxW: 86,
    boxH: 90,
    iconPx: 38,
    fontClass: 'text-[11px]',
  },
  large: {
    id: 'large',
    label: 'Large',
    labelJa: '大 (ワイド)',
    cellW: 118,
    cellH: 122,
    boxW: 108,
    boxH: 112,
    iconPx: 48,
    fontClass: 'text-xs',
  },
};

export type ThemeMode = 'dark' | 'light' | 'system' | 'sunset-sunrise';

export type AccentColor = 'dynamic' | 'cyan' | 'blue' | 'violet' | 'emerald' | 'rose' | 'amber';

export const ACCENT_COLOR_PRESETS: {
  id: AccentColor;
  label: string;
  labelJa: string;
  descJa?: string;
  hex: string;
  rgb: string;
}[] = [
  {
    id: 'dynamic',
    label: 'Dynamic',
    labelJa: '動的 (背景・画像・ダーク/ライト連動)',
    descJa: '背景の色やアップロードした画像にあわせてアクセントカラー、ダーク、ライトかで変動する',
    hex: '#38bdf8',
    rgb: '56, 189, 248',
  },
  { id: 'cyan', label: 'Cyan', labelJa: 'シアン', descJa: '透明感ある標準ネオンシアン', hex: '#06b6d4', rgb: '6, 182, 212' },
  { id: 'blue', label: 'Blue', labelJa: 'ブルー', descJa: '鮮やかで知的なコバルトブルー', hex: '#3b82f6', rgb: '59, 130, 246' },
  { id: 'violet', label: 'Violet', labelJa: 'バイオレット', descJa: '深みのあるアメジストバイオレット', hex: '#8b5cf6', rgb: '139, 92, 246' },
  { id: 'emerald', label: 'Emerald', labelJa: 'エメラルド', descJa: '自然で鮮やかなエメラルドグリーン', hex: '#10b981', rgb: '16, 185, 129' },
  { id: 'rose', label: 'Rose', labelJa: 'ローズ', descJa: '華やかなクリムゾンローズ', hex: '#f43f5e', rgb: '244, 63, 94' },
  { id: 'amber', label: 'Amber', labelJa: 'アンバー', descJa: '温かみのあるゴールデンアンバー', hex: '#f59e0b', rgb: '245, 158, 11' },
];


export type OSLanguage = 'en' | 'ja';

export type ShellMode =
  | 'windows'
  | 'windows11'
  | 'windows10'
  | 'windows8'
  | 'dex'
  | 'chromeos'
  | 'mac'
  | 'ubuntu'
  | 'android'
  | 'ios'
  | 'metro';
export type WindowsTaskbarStyle = 'modern' | 'classic';
export type DesignEngine = 'liquid-glass' | 'frosted-blur' | 'windows-mica' | 'dark-slate' | 'cyberpunk-neon' | 'miuix-glass';
export type LockScreenStyle = 'hyperos3' | 'miuix' | 'windows-hello' | 'cosmic-liquid';
export type NebulaPreset = 'gargantua' | 'ultraviolet' | 'indigo' | 'cyan-quasar' | 'solar-flare';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  icon: string;
  appId?: AppId;
  app?: string;
  time?: string;
  unread?: boolean;
  read?: boolean;
}

export interface SnapZone {
  side: 'left' | 'right' | 'top';
  preview: { x: number; y: number; width: number; height: number };
}

export interface SnapLayout {
  id: string;
  label: string;
  zones: { x: number; y: number; width: number; height: number }[];
}

export interface CalendarTask {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: 'system' | 'work' | 'personal';
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface UserProfile {
  name: string;
  avatar: string;
  password?: string;
  createdAt?: number;
}

// Pre-configured App Store catalog (100% local, offline)
export interface StoreApp {
  id: string;
  name: string;
  description: string;
  category: 'utilities' | 'games';
  icon: string;
  author: string;
  rating: number;
  size: string;
  version: string;
  builtInAppId?: AppId;
  url?: string;
}

export const STORE_CATALOG: StoreApp[] = [
  {
    id: 'calendar',
    name: 'Calendar & Tasks',
    description: 'Interactive agenda grid and task scheduler with local persistence.',
    category: 'utilities',
    icon: 'Calendar',
    author: 'Glassium Core',
    rating: 4.8,
    size: '1.8 MB',
    version: '4.0.0',
    builtInAppId: 'calendar',
  },
  {
    id: 'synth',
    name: 'Monochrome Music & Synced Lyrics',
    description: 'Stream Hi-Fi lossless music and real-time lyrics via Scramjet & Ultraviolet proxy tunnel.',
    category: 'utilities',
    icon: 'Music',
    author: 'Monochrome Audio',
    rating: 5.0,
    size: '3.1 MB',
    version: '4.0.0',
    builtInAppId: 'synth',
  },
  {
    id: 'cosmic-maze',
    name: '3D Cosmic Maze',
    description: 'Navigate a neon metallic sphere through 3D floating labyrinth corridors.',
    category: 'games',
    icon: 'Gamepad2',
    author: 'Cosmic Interactive',
    rating: 4.9,
    size: '3.5 MB',
    version: '3.0.0',
    builtInAppId: 'game',
  },
  {
    id: 'slope-runner',
    name: 'Neon Slope Runner',
    description: 'High-velocity endless 3D physics runner down tilting ramps toward the event horizon.',
    category: 'games',
    icon: 'Zap',
    author: 'Velocity Studios',
    rating: 4.9,
    size: '2.8 MB',
    version: '3.0.0',
    builtInAppId: 'game',
  },
  {
    id: 'markdown-studio',
    name: 'Markdown Pro Studio',
    description: 'Distraction-free markdown workspace with live preview and syntax formatting.',
    category: 'utilities',
    icon: 'PenTool',
    author: 'TextCraft',
    rating: 4.7,
    size: '1.5 MB',
    version: '2.4.1',
    builtInAppId: 'notepad',
  },
  {
    id: 'retro-2048',
    name: '2048 Hologram Edition',
    description: 'Slide and merge radiant liquid tiles to reach the 2048 singularity.',
    category: 'games',
    icon: 'Grid3x3',
    author: 'PuzzleCraft',
    rating: 4.8,
    size: '950 KB',
    version: '2.0.0',
    builtInAppId: 'game',
  },
  {
    id: 'retro-snake',
    name: 'Neon Quantum Snake',
    description: 'Classic snake with cybernetic neon powerups and particle explosions.',
    category: 'games',
    icon: 'Sparkles',
    author: 'RetroByte',
    rating: 4.6,
    size: '800 KB',
    version: '1.9.0',
    builtInAppId: 'game',
  },
  {
    id: 'weather',
    name: 'Cosmic Weather Forecast',
    description: 'Dynamic real-time atmospheric radar, 7-day orbital forecasts, and meteorological telemetry.',
    category: 'utilities',
    icon: 'CloudSun',
    author: 'Orbital Weather Lab',
    rating: 4.9,
    size: '2.4 MB',
    version: '4.1.0',
    builtInAppId: 'weather',
  },
  {
    id: 'clock',
    name: 'Clock, Alarms & Chrono',
    description: 'World clocks across galactic time zones, customizable alarms with audio synthesizers, and precision lap stopwatch.',
    category: 'utilities',
    icon: 'Clock',
    author: 'Liquid Chronometry',
    rating: 4.9,
    size: '1.9 MB',
    version: '4.1.0',
    builtInAppId: 'clock',
  },
  {
    id: 'ai',
    name: 'Liquid Copilot Pro AI',
    description: 'Autonomous AI assistant with Gemini 3.8 Flash, system automation, code generation, and prompt templates.',
    category: 'utilities',
    icon: 'Bot',
    author: 'AI Studio Core',
    rating: 5.0,
    size: '4.8 MB',
    version: '4.7.0',
    builtInAppId: 'ai',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    description: 'Prime Shows, StreameX, FlixHD, Maple TV, YouTube & Shorts multi-source streaming hub.',
    category: 'utilities',
    icon: 'Tv',
    author: 'Glassium Media',
    rating: 5.0,
    size: '3.4 MB',
    version: '5.0.0',
    builtInAppId: 'entertainment',
  },
  { id: 'paint', name: 'Spect Studio', description: 'GlasispectUI digital canvas with brushes, layers, color palette, and PNG export.', category: 'utilities', icon: 'Palette', author: 'Glasispect Creative', rating: 4.9, size: '1.4 MB', version: '5.0 u2', builtInAppId: 'paint' },
  { id: 'pomodoro', name: 'Pomodoro Timer', description: '25/5 focus and break timer for deep productivity.', category: 'utilities', icon: 'Clock', author: 'Glassium Core', rating: 4.9, size: '920 KB', version: '4.7.0', builtInAppId: 'pomodoro' },
  { id: 'unitconverter', name: 'Unit Converter', description: 'Convert length, weight, temperature, and digital storage.', category: 'utilities', icon: 'SlidersHorizontal', author: 'Glassium Tools', rating: 4.8, size: '880 KB', version: '4.7.0', builtInAppId: 'unitconverter' },
  { id: 'colorpicker', name: 'Color Studio', description: 'RGB/HSL mixer, HEX generator, and color palettes.', category: 'utilities', icon: 'Palette', author: 'Glassium Creative', rating: 4.9, size: '1.1 MB', version: '4.7.0', builtInAppId: 'colorpicker' },
  { id: 'passgen', name: 'Password Generator', description: 'Cryptographic password generator with entropy controls.', category: 'utilities', icon: 'Key', author: 'Glassium Security', rating: 4.9, size: '750 KB', version: '4.7.0', builtInAppId: 'passgen' },
  { id: 'qrcode', name: 'QR Matrix Studio', description: 'Generate visual matrix codes for URLs and text.', category: 'utilities', icon: 'Grid3x3', author: 'Glassium Tools', rating: 4.8, size: '990 KB', version: '4.7.0', builtInAppId: 'qrcode' },
  { id: 'jsonformat', name: 'JSON Formatter', description: 'Format, validate, and minify JSON payloads.', category: 'utilities', icon: 'Code2', author: 'Glassium Dev', rating: 4.9, size: '840 KB', version: '4.7.0', builtInAppId: 'jsonformat' },
  { id: 'regex', name: 'Regex Tester', description: 'Test regular expressions with real-time match highlighting.', category: 'utilities', icon: 'Search', author: 'Glassium Dev', rating: 4.8, size: '910 KB', version: '4.7.0', builtInAppId: 'regex' },
  { id: 'markdown', name: 'Markdown Reader', description: 'Side-by-side live Markdown editor and reader.', category: 'utilities', icon: 'FileText', author: 'TextCraft', rating: 4.9, size: '1.2 MB', version: '4.7.0', builtInAppId: 'markdown' },
  { id: 'kanban', name: 'Kanban Board', description: 'Agile task management across Todo, Doing, and Done.', category: 'utilities', icon: 'LayoutGrid', author: 'Glassium Work', rating: 5.0, size: '1.6 MB', version: '4.7.0', builtInAppId: 'kanban' },
  { id: 'habit', name: 'Habit Tracker', description: 'Track daily routines and weekly completion streaks.', category: 'utilities', icon: 'CheckCircle2', author: 'Glassium Life', rating: 4.8, size: '1.1 MB', version: '4.7.0', builtInAppId: 'habit' },
  { id: 'expense', name: 'Expense Ledger', description: 'Personal budget and expense tracker.', category: 'utilities', icon: 'Calculator', author: 'Glassium Finance', rating: 4.9, size: '1.3 MB', version: '4.7.0', builtInAppId: 'expense' },
  { id: 'bmi', name: 'Health & BMI', description: 'Calculate BMI and ideal weight range.', category: 'utilities', icon: 'Activity', author: 'Glassium Health', rating: 4.7, size: '820 KB', version: '4.7.0', builtInAppId: 'bmi' },
  { id: 'worldclock', name: 'World Clock Hub', description: 'Compare global time zones simultaneously.', category: 'utilities', icon: 'Globe', author: 'Liquid Chronometry', rating: 4.9, size: '1.0 MB', version: '4.7.0', builtInAppId: 'worldclock' },
  { id: 'morse', name: 'Morse & Cipher', description: 'Encode/decode Morse code instantly.', category: 'utilities', icon: 'Zap', author: 'Glassium Tools', rating: 4.7, size: '780 KB', version: '4.7.0', builtInAppId: 'morse' },
  { id: 'base64', name: 'Base64 & URL Tool', description: 'UTF-8 Base64 and URL encoder/decoder.', category: 'utilities', icon: 'Code2', author: 'Glassium Dev', rating: 4.8, size: '790 KB', version: '4.7.0', builtInAppId: 'base64' },
  { id: 'diff', name: 'Text Diff Viewer', description: 'Compare two texts line-by-line to spot changes.', category: 'utilities', icon: 'Layers', author: 'Glassium Dev', rating: 4.8, size: '940 KB', version: '4.7.0', builtInAppId: 'diff' },
  { id: 'wordcount', name: 'Word Analyzer', description: 'Count characters, words, lines, and reading time.', category: 'utilities', icon: 'FileText', author: 'TextCraft', rating: 4.9, size: '720 KB', version: '4.7.0', builtInAppId: 'wordcount' },
  { id: 'flashcards', name: 'Flashcards Deck', description: 'Interactive flip cards for studying tech and languages.', category: 'utilities', icon: 'BookOpen', author: 'Glassium Study', rating: 4.9, size: '1.1 MB', version: '4.7.0', builtInAppId: 'flashcards' },
  { id: 'whiteboard', name: 'Idea Board', description: 'Organize brainstorm cards by priority.', category: 'utilities', icon: 'PenTool', author: 'Glassium Work', rating: 4.8, size: '1.2 MB', version: '4.7.0', builtInAppId: 'whiteboard' },
  { id: 'drumpad', name: '808 Drum Pad', description: 'Synthesized 9-pad beat maker with WebAudio.', category: 'utilities', icon: 'Music', author: 'Monochrome Audio', rating: 5.0, size: '1.8 MB', version: '4.7.0', builtInAppId: 'drumpad' },
  { id: 'tuner', name: 'Frequency Synth', description: 'Audio pitch and waveform generator (80Hz - 1200Hz).', category: 'utilities', icon: 'Volume2', author: 'Monochrome Audio', rating: 4.8, size: '960 KB', version: '4.7.0', builtInAppId: 'tuner' },
  { id: 'minesweeper', name: 'Cyber Minesweeper', description: 'Classic logic grid puzzle.', category: 'games', icon: 'Gamepad2', author: 'PuzzleCraft', rating: 4.9, size: '1.1 MB', version: '4.7.0', builtInAppId: 'minesweeper' },
  { id: 'tictactoe', name: 'Tic-Tac-Toe AI', description: 'Play Tic-Tac-Toe on a sleek grid.', category: 'games', icon: 'Grid3x3', author: 'PuzzleCraft', rating: 4.8, size: '740 KB', version: '4.7.0', builtInAppId: 'tictactoe' },
  { id: 'memory', name: 'Memory Match', description: 'Flip and match pairs of icons.', category: 'games', icon: 'Sparkles', author: 'RetroByte', rating: 4.9, size: '950 KB', version: '4.7.0', builtInAppId: 'memory' },
  { id: 'typing', name: 'Typing Trainer', description: 'Test your WPM speed and accuracy with code & phrases.', category: 'games', icon: 'SquareTerminal', author: 'Velocity Studios', rating: 4.9, size: '1.2 MB', version: '4.7.0', builtInAppId: 'typing' },
  { id: 'sudoku', name: 'Mini Sudoku', description: 'Logic number puzzle with instant verification.', category: 'games', icon: 'Grid3x3', author: 'PuzzleCraft', rating: 4.8, size: '890 KB', version: '4.7.0', builtInAppId: 'sudoku' },
  { id: 'periodic', name: 'Periodic Table', description: 'Interactive chemical elements reference.', category: 'utilities', icon: 'Sparkles', author: 'Glassium Science', rating: 5.0, size: '1.5 MB', version: '4.7.0', builtInAppId: 'periodic' },
  { id: 'dictionary', name: 'Tech Lexicon', description: 'Searchable dictionary of software and AI terms.', category: 'utilities', icon: 'BookOpen', author: 'Glassium Study', rating: 4.8, size: '1.3 MB', version: '4.7.0', builtInAppId: 'dictionary' },
  { id: 'sysinfo', name: 'System Diagnostics', description: 'Hardware, display, and browser runtime diagnostics.', category: 'utilities', icon: 'Cpu', author: 'Glassium Core', rating: 4.9, size: '900 KB', version: '4.7.0', builtInAppId: 'sysinfo' },
];

export interface InstalledApp {
  id: string;          // unique install ID
  appId: string;       // window app ID
  name: string;
  icon: string;
  description: string;
  author: string;
  category: 'utilities' | 'games';
  installedAt: number;
  isCustom?: boolean;
  builtInAppId?: AppId;
  url?: string;
}

export interface StoreTheme {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  author: string;
  category: 'retro' | 'modern' | 'minimal' | 'cyber' | 'nature';
  rating: number;
  downloads: string;
  version: string;
  size: string;
  badge: string;
  previewGradient: string;
  accentColor: string;
  config: {
    shellMode: ShellMode;
    designEngine: DesignEngine;
    wallpaper: 'live2d' | 'golden-sparkle' | 'space' | 'aurora' | 'sunset' | 'ocean' | 'forest' | 'cosmic' | 'bloom' | 'shader';
    theme: 'dark' | 'light';
    blurAmount?: number;
    cornerRadius?: number;
    transparency?: number;
    accentColor?: string;
  };
}

export const STORE_THEMES: StoreTheme[] = [
  {
    id: 'win10-fluent',
    name: 'Windows 10 Fluent Dark',
    nameJa: 'Windows 10 フルエント・ダーク',
    description: 'Flat sleek dark taskbar, live tiles matrix Start menu, Cortana search pill, and crisp high-contrast window frames.',
    descriptionJa: 'フラットな黒のタスクバー、ライブタイル搭載スタートメニュー、Cortana検索バー、洗練されたダークテーマ。',
    author: 'Redmond Studios',
    category: 'modern',
    rating: 4.9,
    downloads: '2.1M',
    version: '22H2',
    size: '3.6 MB',
    badge: 'Popular',
    previewGradient: 'from-zinc-950 via-slate-900 to-sky-700',
    accentColor: '#0284c7',
    config: {
      shellMode: 'windows10',
      designEngine: 'dark-slate',
      wallpaper: 'bloom',
      theme: 'dark',
      blurAmount: 12,
      cornerRadius: 4,
      transparency: 18,
      accentColor: '#0284c7',
    },
  },
  {
    id: 'win11-mica',
    name: 'Windows 11 Mica Pro',
    nameJa: 'Windows 11 マイカ・プロ',
    description: 'Centered fluent taskbar, floating rounded Mica start surface, subtle glass refractions, and fluid tactile physics.',
    descriptionJa: 'センター配置のタスクバー、角丸フローティングスタート、マイカガラスの屈折と洗練されたモダンUI。',
    author: 'Liquid Systems',
    category: 'modern',
    rating: 5.0,
    downloads: '3.4M',
    version: '23H2',
    size: '6.1 MB',
    badge: 'Flagship',
    previewGradient: 'from-blue-950 via-indigo-950 to-cyan-800',
    accentColor: '#38bdf8',
    config: {
      shellMode: 'windows',
      designEngine: 'windows-mica',
      wallpaper: 'live2d',
      theme: 'dark',
      blurAmount: 20,
      cornerRadius: 14,
      transparency: 22,
      accentColor: '#38bdf8',
    },
  },
  {
    id: 'win8-metro',
    name: 'Windows 8 Metro Live Tiles',
    nameJa: 'Windows 8 メトロ・ライブタイル',
    description: 'Full-screen animated dynamic tiles, gesture-optimized touch navigation, high-speed app switching, and bold typography.',
    descriptionJa: '全画面で動くアニメーションライブタイル、タッチ操作に特化したジェスチャーUIと大胆なタイポグラフィ。',
    author: 'Metro Interactive',
    category: 'retro',
    rating: 4.7,
    downloads: '750K',
    version: '8.1',
    size: '3.1 MB',
    badge: 'Touch Optimized',
    previewGradient: 'from-teal-950 via-emerald-900 to-cyan-700',
    accentColor: '#06b6d4',
    config: {
      shellMode: 'windows8',
      designEngine: 'dark-slate',
      wallpaper: 'ocean',
      theme: 'dark',
      blurAmount: 8,
      cornerRadius: 2,
      transparency: 10,
      accentColor: '#06b6d4',
    },
  },
  {
    id: 'samsung-dex',
    name: 'Samsung DeX Desktop Pro',
    nameJa: 'Samsung DeX デスクトップ・プロ',
    description: 'Flagship Galaxy multi-window workstation shell with expandable App Drawer, status pill tray, and mobile productivity bar.',
    descriptionJa: 'GalaxyのマルチウィンドウPC体験。アプリドロワー、ステータスピル、モバイルとPCが融合した高生産性バー。',
    author: 'Galaxy Ecosystem',
    category: 'modern',
    rating: 4.8,
    downloads: '1.2M',
    version: 'DeX 5.0',
    size: '4.8 MB',
    badge: 'Productivity',
    previewGradient: 'from-blue-950 via-slate-900 to-indigo-700',
    accentColor: '#3b82f6',
    config: {
      shellMode: 'dex',
      designEngine: 'liquid-glass',
      wallpaper: 'sunset',
      theme: 'dark',
      blurAmount: 16,
      cornerRadius: 12,
      transparency: 25,
      accentColor: '#3b82f6',
    },
  },
  {
    id: 'chromeos-m3',
    name: 'ChromeOS Material You',
    nameJa: 'ChromeOS マテリアル・ユー',
    description: 'Material 3 pill shelf, Everything search button, pastel ambient widgets, quick status tray, and cloud-native speed.',
    descriptionJa: 'Material 3のピルシェルフ、Everythingボタン、パステル調ウィジェットと軽快なクラウドUI。',
    author: 'Chromium Design',
    category: 'minimal',
    rating: 4.7,
    downloads: '890K',
    version: 'M120',
    size: '3.3 MB',
    badge: 'Material 3',
    previewGradient: 'from-violet-950 via-purple-900 to-sky-700',
    accentColor: '#8b5cf6',
    config: {
      shellMode: 'chromeos',
      designEngine: 'frosted-blur',
      wallpaper: 'bloom',
      theme: 'dark',
      blurAmount: 14,
      cornerRadius: 16,
      transparency: 24,
      accentColor: '#8b5cf6',
    },
  },
  {
    id: 'macos-sonoma',
    name: 'macOS Sonoma Liquid Aqua',
    nameJa: 'macOS ソノマ・リキッドアクア',
    description: 'Reflective frosted glass Dock with bounce animations, top system status menu bar, and candy-colored window controls.',
    descriptionJa: '跳ねるフロストガラスDock、トップメニューバー、赤黄緑のキャンディウィンドウボタン。',
    author: 'Cupertino Design Guild',
    category: 'minimal',
    rating: 4.9,
    downloads: '2.8M',
    version: '14.4',
    size: '5.2 MB',
    badge: 'Aqua Glass',
    previewGradient: 'from-pink-950 via-rose-900 to-purple-800',
    accentColor: '#f43f5e',
    config: {
      shellMode: 'mac',
      designEngine: 'liquid-glass',
      wallpaper: 'sunset',
      theme: 'dark',
      blurAmount: 22,
      cornerRadius: 18,
      transparency: 26,
      accentColor: '#f43f5e',
    },
  },
  {
    id: 'cyberpunk-singularity',
    name: 'Cyberpunk 2077 Singularity',
    nameJa: 'サイバーパンク・シンギュラリティ',
    description: 'High-tech neon cyan and toxic green HUD overlays, dark carbon textures, and 3D Raymarching Einstein Ring black hole canvas.',
    descriptionJa: '高輝度ネオンHUD、ダークカーボン質感、アインシュタインリング3Dブラックホールシェーダーが連動。',
    author: 'NightCity Netrunner',
    category: 'cyber',
    rating: 5.0,
    downloads: '1.9M',
    version: '2.077',
    size: '7.5 MB',
    badge: 'Neon 3D',
    previewGradient: 'from-black via-emerald-950 to-cyan-900',
    accentColor: '#10b981',
    config: {
      shellMode: 'windows',
      designEngine: 'cyberpunk-neon',
      wallpaper: 'shader',
      theme: 'dark',
      blurAmount: 16,
      cornerRadius: 4,
      transparency: 30,
      accentColor: '#10b981',
    },
  },
  {
    id: 'sakura-vaporwave',
    name: 'Tokyo Sakura 80s Vaporwave',
    nameJa: '東京 夜桜ヴェイパーウェイヴ',
    description: 'Dreamy pastel magenta and lavender neon gradients, retro wireframes, aesthetic Japanese typography, and lo-fi vibes.',
    descriptionJa: 'マゼンタとラベンダーの夢想的グラデーション、レトロワイヤーフレームとローファイな美学。',
    author: 'Synthwave Society',
    category: 'nature',
    rating: 4.8,
    downloads: '640K',
    version: '1.8.4',
    size: '4.0 MB',
    badge: 'Aesthetic',
    previewGradient: 'from-fuchsia-950 via-purple-900 to-rose-700',
    accentColor: '#ec4899',
    config: {
      shellMode: 'windows10',
      designEngine: 'liquid-glass',
      wallpaper: 'bloom',
      theme: 'dark',
      blurAmount: 20,
      cornerRadius: 12,
      transparency: 24,
      accentColor: '#ec4899',
    },
  },
  {
    id: 'ubuntu-lunar',
    name: 'Ubuntu Linux Cosmic Yaru',
    nameJa: 'Ubuntu Linux コスミック・ヤル',
    description: 'Aubergine and warm orange accents, permanent left application dock launcher, clean status bar, and open-source spirit.',
    descriptionJa: 'オーバージンとオレンジの温かいアクセント、左側の常駐ランチャードック、オープンソースの自由な操作性。',
    author: 'Canonical Community',
    category: 'modern',
    rating: 4.8,
    downloads: '1.1M',
    version: '24.04 LTS',
    size: '3.8 MB',
    badge: 'Linux',
    previewGradient: 'from-amber-950 via-orange-950 to-purple-950',
    accentColor: '#f97316',
    config: {
      shellMode: 'ubuntu',
      designEngine: 'dark-slate',
      wallpaper: 'aurora',
      theme: 'dark',
      blurAmount: 10,
      cornerRadius: 8,
      transparency: 16,
      accentColor: '#ea580c',
    },
  },
  {
    id: 'gargantua-oled',
    name: 'Gargantua Deep Space OLED',
    nameJa: '宇宙ガルガンチュア OLED ピュアブラック',
    description: 'Pure OLED #000000 blacks, high-contrast violet nebula accents, and cinematic 60fps black hole accretion disk.',
    descriptionJa: '完全な漆黒OLEDブラック、高コントラストな紫の星雲、シネマティックな降着円盤3Dシェーダー。',
    author: 'Astrophysics Lab',
    category: 'cyber',
    rating: 5.0,
    downloads: '2.5M',
    version: '3.0.0',
    size: '6.8 MB',
    badge: 'OLED Master',
    previewGradient: 'from-black via-zinc-950 to-violet-950',
    accentColor: '#a855f7',
    config: {
      shellMode: 'windows',
      designEngine: 'liquid-glass',
      wallpaper: 'space',
      theme: 'dark',
      blurAmount: 24,
      cornerRadius: 16,
      transparency: 32,
      accentColor: '#a855f7',
    },
  },
  {
    id: 'hyperos-miuix',
    name: 'HyperOS 3 & MIUIx Flagship',
    nameJa: 'HyperOS 3 & MIUIx フラッグシップ',
    description: 'Next-gen fluid hyper-glass, depth effect lock screen clock, squircle icons, smart control center, and rapid touch response.',
    descriptionJa: '次世代ハイパーガラスUI、立体感ある深度時計ロック画面、スクワークルアイコン、洗練されたコントロールセンター。',
    author: 'Xiaomi Design Lab',
    category: 'modern',
    rating: 5.0,
    downloads: '3.8M',
    version: '3.0.4',
    size: '5.6 MB',
    badge: 'HyperOS 3',
    previewGradient: 'from-zinc-950 via-orange-950 to-amber-700',
    accentColor: '#f97316',
    config: {
      shellMode: 'windows',
      designEngine: 'miuix-glass',
      wallpaper: 'bloom',
      theme: 'dark',
      blurAmount: 22,
      cornerRadius: 18,
      transparency: 28,
      accentColor: '#f97316',
    },
  },
];

// -------------------------------------------------------------------------
// UI Styles (8 Styles: 3 Fun/Meme + 5 Authentic Researched OS Systems)
// -------------------------------------------------------------------------
export type UIStyle =
  | 'the-ai'
  | 'nyan-cat'
  | 'meme'
  | 'miui'
  | 'macos'
  | 'glassium'
  | 'one-ui'
  | 'material3';

export interface UIStyleInfo {
  id: UIStyle;
  name: string; // Simple name
  sub: string;
  category: 'fun' | 'authentic';
  accent: string;
  badge: string;
  previewGradient: string;
  description: string;
}

export const UI_STYLES: UIStyleInfo[] = [
  {
    id: 'glassium',
    name: 'GlasispectUI',
    sub: 'Zero Border Line · GlassiumOS 5 u1',
    category: 'authentic',
    accent: '#06b6d4',
    badge: 'GlassiumOS 5 u1',
    previewGradient: 'linear-gradient(135deg, rgba(6,182,212,0.8), rgba(99,102,241,0.8))',
    description: 'GlassiumOS 5 u1 標準の GlasispectUI。枠線を排したZero Border Lineと液体ガラス屈折サーフェス。',
  },
  {
    id: 'macos',
    name: 'macOS',
    sub: 'Human Interface',
    category: 'authentic',
    accent: '#3b82f6',
    badge: 'Apple HIG',
    previewGradient: 'linear-gradient(135deg, #1e3a8a, #3b82f6, #60a5fa)',
    description: 'Human Interface Guidelines準拠。フロストすりガラス、3色トラフィックライト、洗練されたフォント。',
  },
  {
    id: 'one-ui',
    name: 'One UI',
    sub: 'Reachability Comfort',
    category: 'authentic',
    accent: '#2563eb',
    badge: 'Samsung',
    previewGradient: 'linear-gradient(135deg, #1d4ed8, #0ea5e9, #38bdf8)',
    description: '上下分割の操作エリア配置（Comfort Curve）。親指の届く下部インタラクションと大きな丸みスクワークル。',
  },
  {
    id: 'miui',
    name: 'MIUI',
    sub: 'Alive Aesthetics',
    category: 'authentic',
    accent: '#f97316',
    badge: 'Alive / HyperOS',
    previewGradient: 'linear-gradient(135deg, #ea580c, #f97316, #fb923c)',
    description: '超楕円（n=3 スーパーエリプス）による有機的な丸み。生命感あるリアルタイム光線と流体トランジション。',
  },
  {
    id: 'material3',
    name: 'Material 3',
    sub: 'Material You',
    category: 'authentic',
    accent: '#8b5cf6',
    badge: 'Google M3',
    previewGradient: 'linear-gradient(135deg, #6d28d9, #8b5cf6, #c084fc)',
    description: 'トーン別カラーシステム、完全角丸ピル形状のナビゲーション＆ボタン、柔らかな階層サーフェス。',
  },
  {
    id: 'the-ai',
    name: 'The AI',
    sub: 'Neural Matrix',
    category: 'fun',
    accent: '#10b981',
    badge: 'Cyber Sci-Fi',
    previewGradient: 'linear-gradient(135deg, #022c22, #059669, #34d399)',
    description: 'サイバーネティックAIターミナル。ネオングリーンの走査線、モノスペースプロンプト、AIパルス光。',
  },
  {
    id: 'nyan-cat',
    name: 'Nyan Cat',
    sub: 'Rainbow Pixel',
    category: 'fun',
    accent: '#ec4899',
    badge: 'Arcade Pop',
    previewGradient: 'linear-gradient(135deg, #f43f5e, #fb923c, #facc15, #4ade80, #38bdf8, #a855f7)',
    description: '虹の軌跡と8ビットピクセルスター。ポップタルトの甘いパステルカラーとレトロゲームサウンド。',
  },
  {
    id: 'meme',
    name: 'Meme',
    sub: 'Much OS, Very Fast',
    category: 'fun',
    accent: '#eab308',
    badge: 'Doge Web',
    previewGradient: 'linear-gradient(135deg, #ca8a04, #eab308, #fde047)',
    description: 'Doge・コミック・カオスな楽しさ全開のミームモード。ゴールドのバッジとユーモア溢れるアラート。',
  },
];

// Sleep Screen Customization Types
export type SleepClockStyle = 'depth' | 'analog' | 'minimal' | 'vertical' | 'cyber';
export type SleepBackground = 'aurora' | 'void' | 'matrix' | 'galaxy' | 'retro' | 'wallpaper';
export type ClockPosition = 'center' | 'top' | 'bottom';
