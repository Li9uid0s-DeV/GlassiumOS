import { useId } from 'react';

export type FluentIconType =
  | 'browser'
  | 'notepad'
  | 'terminal'
  | 'calculator'
  | 'explorer'
  | 'settings'
  | 'game'
  | 'synth'
  | 'calendar'
  | 'weather'
  | 'clock'
  | 'ai'
  | 'sysmon'
  | 'taskmanager'
  | 'appstore'
  | 'recycle'
  | 'zap'
  | 'pentool'
  | 'grid3x3'
  | 'gitbranch'
  | 'server'
  | 'image'
  | 'file'
  | 'download'
  | 'upload'
  | 'monitor'
  | 'wifi'
  | 'bluetooth'
  | 'battery'
  | 'sun'
  | 'moon'
  | 'volume'
  | 'volumex'
  | 'search'
  | 'lock'
  | 'unlock'
  | 'user'
  | 'shield'
  | 'palette'
  | 'harddrive'
  | 'sliders'
  | 'bell'
  | 'power'
  | 'smartphone'
  | 'save'
  | 'plus'
  | 'refresh'
  | 'layers'
  | 'appwindow'
  | 'check'
  | 'xcircle'
  | 'sparkles'
  | 'rocket'
  | 'send'
  | 'camera'
  | 'mic'
  | 'flame'
  | 'compass'
  | 'play'
  | 'pause'
  | 'thermometer'
  | 'wind'
  | 'droplets'
  | 'cloud'
  | 'entertainment';

const ICON_MAP: Record<string, FluentIconType> = {
  // Core Apps & Store IDs
  browser: 'browser',
  notepad: 'notepad',
  terminal: 'terminal',
  calculator: 'calculator',
  explorer: 'explorer',
  settings: 'settings',
  game: 'game',
  synth: 'synth',
  entertainment: 'entertainment',
  Tv: 'entertainment',
  Film: 'entertainment',
  Video: 'entertainment',
  Clapperboard: 'entertainment',
  calendar: 'calendar',
  weather: 'weather',
  clock: 'clock',
  ai: 'ai',
  sysmon: 'sysmon',
  taskmanager: 'taskmanager',
  appstore: 'appstore',
  recycle: 'recycle',
  'slope-runner': 'zap',
  'markdown-studio': 'pentool',
  'retro-2048': 'grid3x3',
  'retro-snake': 'game',
  'cosmic-maze': 'game',
  'glassium-studio': 'pentool',
  studio: 'pentool',
  paint: 'palette',
  'spect-studio': 'palette',

  // Lucide icon name mappings
  Globe: 'browser',
  FileText: 'notepad',
  BookOpen: 'notepad',
  SquareTerminal: 'terminal',
  Terminal: 'terminal',
  Code: 'terminal',
  Code2: 'terminal',
  Calculator: 'calculator',
  FolderOpen: 'explorer',
  Folder: 'explorer',
  Settings: 'settings',
  Sliders: 'sliders',
  SlidersHorizontal: 'sliders',
  Gamepad2: 'game',
  Flame: 'flame',
  Music: 'synth',
  Disc: 'synth',
  ListMusic: 'synth',
  Calendar: 'calendar',
  ListTodo: 'calendar',
  CloudSun: 'weather',
  CloudRain: 'weather',
  Cloud: 'cloud',
  Wind: 'wind',
  Droplets: 'droplets',
  Thermometer: 'thermometer',
  Clock: 'clock',
  AlarmClock: 'clock',
  Timer: 'clock',
  History: 'clock',
  FolderPlus: 'explorer',
  FilePlus: 'file',
  FileCheck: 'file',
  PanelLeft: 'monitor',
  Volume: 'volume',
  Trash: 'recycle',
  CheckSquare: 'check',
  Sparkle: 'sparkles',
  Bot: 'ai',
  Sparkles: 'sparkles',
  Star: 'sparkles',
  Activity: 'sysmon',
  Gauge: 'sysmon',
  Cpu: 'taskmanager',
  Store: 'appstore',
  Trash2: 'recycle',
  Zap: 'zap',
  PenTool: 'pentool',
  Grid3x3: 'grid3x3',
  LayoutGrid: 'grid3x3',
  GitBranch: 'gitbranch',
  Rocket: 'rocket',
  Server: 'server',
  HardDrive: 'harddrive',
  ImageIcon: 'image',
  Image: 'image',
  File: 'file',
  Download: 'download',
  Upload: 'upload',
  Monitor: 'monitor',
  Wifi: 'wifi',
  Bluetooth: 'bluetooth',
  Battery: 'battery',
  BatteryCharging: 'battery',
  Sun: 'sun',
  Moon: 'moon',
  Volume2: 'volume',
  Volume1: 'volume',
  VolumeX: 'volumex',
  Search: 'search',
  Lock: 'lock',
  Unlock: 'unlock',
  User: 'user',
  Shield: 'shield',
  ShieldCheck: 'shield',
  Palette: 'palette',
  Bell: 'bell',
  Power: 'power',
  Smartphone: 'smartphone',
  Save: 'save',
  Plus: 'plus',
  PlusSquare: 'plus',
  RefreshCw: 'refresh',
  RotateCw: 'refresh',
  RotateCcw: 'refresh',
  Layers: 'layers',
  AppWindow: 'appwindow',
  Check: 'check',
  CheckCircle2: 'check',
  XCircle: 'xcircle',
  Send: 'send',
  MessageSquare: 'send',
  HelpCircle: 'ai',
  Camera: 'camera',
  Mic: 'mic',
  Mic2: 'mic',
  Compass: 'compass',
  Navigation: 'compass',
  Play: 'play',
  Pause: 'pause',
  Flashlight: 'sun',
  Wrench: 'settings',
  Share2: 'send',
  MonitorUp: 'monitor',
  ScreenShare: 'monitor',
  Clipboard: 'notepad',
  Box: 'sysmon',
  Info: 'ai',
  Home: 'browser',
};

export function resolveFluentIconType(nameOrId: string): FluentIconType | null {
  return ICON_MAP[nameOrId] ?? null;
}

interface FluentAppIconProps {
  name: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export function FluentAppIcon({ name, size = 24, className = '', onClick }: FluentAppIconProps) {
  const uid = useId().replace(/:/g, '');
  const type = resolveFluentIconType(name) ?? 'browser';

  const sh = `fsh-${uid}`;
  const bsh = `fbsh-${uid}`;
  const g1 = `fg1-${uid}`;
  const g2 = `fg2-${uid}`;
  const rim = `frim-${uid}`;
  const glass = `fgl-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none overflow-visible ${className}`}
      onClick={onClick}
    >
      <defs>
        {/* Base 2.5D Drop Shadow */}
        <filter id={sh} x="-25%" y="-25%" width="150%" height="155%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.4" stdDeviation="2.2" floodColor="#020617" floodOpacity="0.45" />
        </filter>
        {/* Floating Foreground Badge Drop Shadow */}
        <filter id={bsh} x="-30%" y="-30%" width="160%" height="165%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="1" dy="3.2" stdDeviation="2.5" floodColor="#020617" floodOpacity="0.55" />
        </filter>
        {/* Specular Highlight Rim */}
        <linearGradient id={rim} x1="8" y1="4" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
        {/* Glass Surface */}
        <linearGradient id={glass} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {/* 1. BROWSER */}
      {type === 'browser' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id={g2} x1="24" y1="24" x2="43" y2="43" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
          <circle cx="23" cy="23" r="18.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <ellipse cx="23" cy="23" rx="18" ry="7.5" transform="rotate(-24 23 23)" stroke={`url(#${glass})`} strokeWidth="2.5" />
          <rect x="24" y="24" width="19" height="19" rx="6" fill={`url(#${g2})`} filter={`url(#${bsh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M29.5 37.5L32.2 31.2L38.5 28.5L35.8 34.8L29.5 37.5Z" fill="#ffffff" />
        </>
      )}

      {/* 2. NOTEPAD / EDITOR */}
      {type === 'notepad' && (
        <>
          <defs>
            <linearGradient id={g1} x1="12" y1="5" x2="42" y2="43" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id={g2} x1="4" y1="13" x2="25" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <rect x="13" y="5" width="29" height="38" rx="5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.1" />
          <rect x="25" y="11" width="12" height="2.5" rx="1.25" fill="#ffffff" fillOpacity="0.9" />
          <rect x="25" y="18" width="12" height="2.5" rx="1.25" fill="#ffffff" fillOpacity="0.8" />
          <rect x="25" y="25" width="12" height="2.5" rx="1.25" fill="#ffffff" fillOpacity="0.7" />
          <rect x="18" y="32" width="19" height="2.5" rx="1.25" fill="#ffffff" fillOpacity="0.65" />
          <rect x="4" y="13" width="21" height="21" rx="6" fill={`url(#${g2})`} filter={`url(#${bsh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M9.5 19.5H19.5M9.5 23.5H17.5M9.5 27.5H14.5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {/* 3. TERMINAL */}
      {type === 'terminal' && (
        <>
          <defs>
            <linearGradient id={g1} x1="8" y1="6" x2="43" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id={g2} x1="4" y1="15" x2="25" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <rect x="9" y="7" width="34" height="34" rx="6.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.1" />
          <circle cx="14" cy="11.5" r="1.6" fill="#38bdf8" />
          <circle cx="19" cy="11.5" r="1.6" fill="#e879f9" />
          <rect x="27" y="21" width="11" height="2.5" rx="1.2" fill="#38bdf8" />
          <rect x="27" y="27" width="8.5" height="2.5" rx="1.2" fill="#94a3b8" />
          <rect x="4" y="15" width="21" height="21" rx="6" fill={`url(#${g2})`} filter={`url(#${bsh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M9.5 21.5L13.8 25.5L9.5 29.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 29.5H19" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* 4. CALCULATOR */}
      {type === 'calculator' && (
        <>
          <defs>
            <linearGradient id={g1} x1="7" y1="4" x2="39" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id={g2} x1="25" y1="25" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <rect x="7" y="4" width="32" height="40" rx="7.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <rect x="11" y="8" width="24" height="9" rx="3" fill="#0284c7" />
          <rect x="11" y="21" width="6" height="6" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x="19.5" y="21" width="6" height="6" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x="11" y="29.5" width="6" height="6" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x="25" y="25" width="19" height="19" rx="6" fill={`url(#${g2})`} filter={`url(#${bsh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M30.5 32H38.5M30.5 37H38.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* 5. EXPLORER / FOLDER */}
      {type === 'explorer' && (
        <>
          <defs>
            <linearGradient id={g1} x1="5" y1="7" x2="43" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id={g2} x1="5" y1="15" x2="43" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <path d="M5 12C5 9.2 7.2 7 10 7H19L23 10.5H38C40.8 10.5 43 12.7 43 15.5V26H5V12Z" fill={`url(#${g1})`} />
          <rect x="9.5" y="10.5" width="29" height="16" rx="3.5" fill="#ffffff" fillOpacity="0.94" filter={`url(#${sh})`} />
          <path d="M5 20C5 17.2 7.2 15 10 15H38C40.8 15 43 17.2 43 20V36C43 39.3 40.3 42 37 42H11C7.7 42 5 39.3 5 36V20Z" fill={`url(#${g2})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
        </>
      )}

      {/* 6. SETTINGS */}
      {type === 'settings' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id={g2} x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <path
            d="M21.2 5.5H26.8L28.1 10.6C29.5 11.1 30.8 11.9 31.9 12.8L36.9 11.3L39.7 16.1L35.9 19.8C36.3 21.1 36.5 22.5 36.5 24C36.5 25.5 36.3 26.9 35.9 28.2L39.7 31.9L36.9 36.7L31.9 35.2C30.8 36.1 29.5 36.9 28.1 37.4L26.8 42.5H21.2L19.9 37.4C18.5 36.9 17.2 36.1 16.1 35.2L11.1 36.7L8.3 31.9L12.1 28.2C11.7 26.9 11.5 25.5 11.5 24C11.5 22.5 11.7 21.1 12.1 19.8L8.3 16.1L11.1 11.3L16.1 12.8C17.2 11.9 18.5 11.1 19.9 10.6L21.2 5.5Z"
            fill={`url(#${g1})`}
            filter={`url(#${sh})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <circle cx="24" cy="24" r="10" fill={`url(#${g2})`} filter={`url(#${bsh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <circle cx="24" cy="24" r="4.2" fill="#0f172a" />
        </>
      )}

      {/* 7. GAME / GAMEPAD */}
      {type === 'game' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="8" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
          </defs>
          <path
            d="M14 14H34C39.5 14 43.5 18.5 42.8 24L41.2 35.5C40.6 39.2 36.8 41.2 33.4 39.4L28.2 36.6C27.2 36.1 26.1 35.8 25 35.8H23C21.9 35.8 20.8 36.1 19.8 36.6L14.6 39.4C11.2 41.2 7.4 39.2 6.8 35.5L5.2 24C4.5 18.5 8.5 14 14 14Z"
            fill={`url(#${g1})`}
            filter={`url(#${sh})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <path d="M15 21V29M11 25H19" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="33" cy="22" r="2.3" fill="#38bdf8" />
          <circle cx="36.5" cy="25.5" r="2.3" fill="#fde047" />
          <circle cx="29.5" cy="25.5" r="2.3" fill="#fb7185" />
          <circle cx="33" cy="29" r="2.3" fill="#34d399" />
        </>
      )}

      {/* 8. SYNTH / MUSIC */}
      {type === 'synth' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="50%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
          <rect x="6" y="7" width="34" height="34" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M18 30V16L29 13.5V27.5" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="15" cy="30" r="3.8" fill="#ffffff" />
          <circle cx="26" cy="27.5" r="3.8" fill="#ffffff" />
        </>
      )}

      {/* 9. CALENDAR */}
      {type === 'calendar' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="40" y2="18" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id={g2} x1="6" y1="16" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          </defs>
          <rect x="6" y="7" width="34" height="34" rx="7" fill={`url(#${g2})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1" />
          <path d="M6 14C6 10.1 9.1 7 13 7H33C36.9 7 40 10.1 40 14V17H6V14Z" fill={`url(#${g1})`} />
          <rect x="14" y="4.5" width="3.2" height="5.5" rx="1.6" fill="#ffffff" />
          <rect x="29" y="4.5" width="3.2" height="5.5" rx="1.6" fill="#ffffff" />
          <path d="M18 28L22 32L30 24" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {/* 10. WEATHER / CLOUDSUN */}
      {type === 'weather' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id={g2} x1="12" y1="16" x2="43" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <circle cx="18" cy="16" r="11" fill={`url(#${g1})`} filter={`url(#${sh})`} />
          <path
            d="M16 39H34.5C39.2 39 43 35.2 43 30.5C43 26.1 39.6 22.5 35.3 22.1C33.8 16.9 29 13 23.3 13C16.4 13 10.8 18.6 10.8 25.5C10.8 25.9 10.8 26.3 10.9 26.7C7.6 27.7 5.2 30.8 5.2 34.4C5.2 37 9.5 39 16 39Z"
            fill={`url(#${g2})`}
            filter={`url(#${bsh})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
        </>
      )}

      {/* 11. CLOCK */}
      {type === 'clock' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          <circle cx="23" cy="23" r="18.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <circle cx="23" cy="23" r="14" fill="#0f172a" fillOpacity="0.75" />
          <path d="M23 13V23L29.5 26.5" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="23" cy="23" r="2.5" fill="#38bdf8" />
        </>
      )}

      {/* 12. AI / BOT */}
      {type === 'ai' && (
        <>
          <defs>
            <linearGradient id={g1} x1="5" y1="7" x2="32" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id={g2} x1="16" y1="12" x2="43" y2="41" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <path d="M15 8C9.5 8 5 12.5 5 18C5 24.5 10.5 30 18 30H26.5C26.5 21 21.5 8 15 8Z" fill={`url(#${g1})`} filter={`url(#${sh})`} />
          <path d="M33 40C38.5 40 43 35.5 43 30C43 23.5 37.5 18 30 18H21.5C21.5 27 26.5 40 33 40Z" fill={`url(#${g2})`} filter={`url(#${bsh})`} />
          <path d="M24 15L26 21.5L33 24L26 26.5L24 33L22 26.5L15 24L22 21.5L24 15Z" fill="#ffffff" />
        </>
      )}

      {/* 13. TASK MANAGER / CPU */}
      {(type === 'taskmanager' || type === 'sysmon') && (
        <>
          <defs>
            <linearGradient id={g1} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="55%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id={g2} x1="15" y1="15" x2="33" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>
          <path d="M16 4V9M24 4V9M32 4V9M16 39V44M24 39V44M32 39V44M4 16H9M4 24H9M4 32H9M39 16H44M39 24H44M39 32H44" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="9" y="9" width="30" height="30" rx="6.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <rect x="15.5" y="15.5" width="17" height="17" rx="4" fill={`url(#${g2})`} filter={`url(#${bsh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
        </>
      )}

      {/* 14. APP STORE */}
      {type === 'appstore' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="12" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
          </defs>
          <path d="M17 14V11C17 7.1 20.1 4 24 4C27.9 4 31 7.1 31 11V14" stroke="#7dd3fc" strokeWidth="3" strokeLinecap="round" />
          <rect x="7" y="13" width="34" height="29" rx="7.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <g filter={`url(#${bsh})`}>
            <rect x="16.5" y="19.5" width="6.5" height="6.5" rx="1.8" fill="#fb7185" />
            <rect x="25" y="19.5" width="6.5" height="6.5" rx="1.8" fill="#34d399" />
            <rect x="16.5" y="28" width="6.5" height="6.5" rx="1.8" fill="#38bdf8" />
            <rect x="25" y="28" width="6.5" height="6.5" rx="1.8" fill="#facc15" />
          </g>
        </>
      )}

      {/* 15. RECYCLE / TRASH */}
      {type === 'recycle' && (
        <>
          <defs>
            <linearGradient id={g1} x1="10" y1="8" x2="38" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <rect x="9" y="7" width="30" height="4.8" rx="2.4" fill="#38bdf8" filter={`url(#${sh})`} />
          <path d="M11.5 13H36.5L34 39.5C33.8 41.5 32.1 43 30.1 43H17.9C15.9 43 14.2 41.5 14 39.5L11.5 13Z" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M19 18L20 37M24 18V37M29 18L28 37" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}

      {/* 16. WIFI */}
      {type === 'wifi' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M12 17C19 11 29 11 36 17M16 22C21 17.5 27 17.5 32 22M20 27C22.5 24.5 25.5 24.5 28 27" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="24" cy="33" r="2.5" fill="#ffffff" />
        </>
      )}

      {/* 17. BLUETOOTH */}
      {type === 'bluetooth' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M18 17L30 27L24 33V13L30 19L18 29" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {/* 18. BATTERY */}
      {type === 'battery' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="12" x2="40" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <rect x="7" y="14" width="31" height="20" rx="5" fill="#1e293b" filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <rect x="10" y="17" width="22" height="14" rx="3" fill={`url(#${g1})`} />
          <path d="M40 20V28" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 17L18 24H23L20 31L26 23H21L23 17" fill="#ffffff" />
        </>
      )}

      {/* 19. SUN */}
      {type === 'sun' && (
        <>
          <defs>
            <linearGradient id={g1} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="10.5" fill={`url(#${g1})`} filter={`url(#${bsh})`} stroke={`url(#${rim})`} strokeWidth="1" />
          <path d="M24 6V10M24 38V42M6 24H10M38 24H42M11.3 11.3L14.1 14.1M33.9 33.9L36.7 36.7M11.3 36.7L14.1 33.9M33.9 14.1L36.7 11.3" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
        </>
      )}

      {/* 20. MOON */}
      {type === 'moon' && (
        <>
          <defs>
            <linearGradient id={g1} x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
          </defs>
          <path
            d="M32 10C24 10 14 17 14 27C14 35 21 40 28 40C33 40 37 37 39 34C32 34 26 28 26 20C26 15 29 11 32 10Z"
            fill={`url(#${g1})`}
            filter={`url(#${sh})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <circle cx="34" cy="14" r="1.5" fill="#fde047" />
          <circle cx="38" cy="21" r="1" fill="#fde047" />
        </>
      )}

      {/* 21. VOLUME */}
      {type === 'volume' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M14 20H18L24 15V33L18 28H14V20Z" fill="#ffffff" />
          <path d="M29 18C31 20 32 22 32 24C32 26 31 28 29 30M33 14C37 17 38 20 38 24C38 28 37 31 33 34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* 22. VOLUMEX */}
      {type === 'volumex' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M14 20H18L24 15V33L18 28H14V20Z" fill="#ffffff" />
          <path d="M29 20L37 28M37 20L29 28" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
        </>
      )}

      {/* 23. SEARCH */}
      {type === 'search' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
          </defs>
          <circle cx="21" cy="21" r="13" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.3" />
          <circle cx="21" cy="21" r="8.5" fill="#0284c7" />
          <path d="M30 30L40 40" stroke="#f8fafc" strokeWidth="4.2" strokeLinecap="round" filter={`url(#${bsh})`} />
        </>
      )}

      {/* 24. LOCK */}
      {type === 'lock' && (
        <>
          <defs>
            <linearGradient id={g1} x1="8" y1="18" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <path d="M16 20V14C16 9.6 19.6 6 24 6C28.4 6 32 9.6 32 14V20" stroke="#e2e8f0" strokeWidth="3.6" strokeLinecap="round" />
          <rect x="9" y="19" width="30" height="23" rx="6" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <circle cx="24" cy="29" r="3" fill="#ffffff" />
          <path d="M24 32V36" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* 25. UNLOCK */}
      {type === 'unlock' && (
        <>
          <defs>
            <linearGradient id={g1} x1="8" y1="18" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <path d="M16 16V14C16 9.6 19.6 6 24 6C28.4 6 32 9.6 32 14V14" stroke="#e2e8f0" strokeWidth="3.6" strokeLinecap="round" />
          <rect x="9" y="19" width="30" height="23" rx="6" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <circle cx="24" cy="29" r="3" fill="#ffffff" />
          <path d="M24 32V36" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* 26. USER */}
      {type === 'user' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="18.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <circle cx="24" cy="18" r="6" fill="#ffffff" />
          <path d="M12 36C12 30 17 26 24 26C31 26 36 30 36 36" fill="#ffffff" />
        </>
      )}

      {/* 27. SHIELD */}
      {type === 'shield' && (
        <>
          <defs>
            <linearGradient id={g1} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>
          <path d="M24 6L39 12V24C39 33 32 39 24 42C16 39 9 33 9 24V12L24 6Z" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M18 24L22 28L30 20" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {/* 28. PALETTE */}
      {type === 'palette' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <path
            d="M24 6C13.5 6 6 13.5 6 24C6 31 10.5 36 17 36H20C21.5 36 22.5 37 22.5 38.5C22.5 39.5 22 40.5 21 41.5C20.5 42 21 43 22 43C33 43 42 34 42 24C42 14 34 6 24 6Z"
            fill={`url(#${g1})`}
            filter={`url(#${sh})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <circle cx="15" cy="18" r="2.8" fill="#fb7185" />
          <circle cx="24" cy="14" r="2.8" fill="#facc15" />
          <circle cx="33" cy="18" r="2.8" fill="#38bdf8" />
          <circle cx="34" cy="27" r="2.8" fill="#34d399" />
        </>
      )}

      {/* 29. MONITOR / DISPLAY */}
      {type === 'monitor' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <rect x="6" y="8" width="36" height="24" rx="5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <rect x="9" y="11" width="30" height="18" rx="2.5" fill="#0f172a" />
          <path d="M24 32V38M16 38H32" stroke="#94a3b8" strokeWidth="2.8" strokeLinecap="round" />
        </>
      )}

      {/* 30. SLIDERS / CONTROLS */}
      {type === 'sliders' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M12 16H36M12 24H36M12 32H36" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="18" cy="16" r="3.2" fill="#ffffff" filter={`url(#${bsh})`} />
          <circle cx="30" cy="24" r="3.2" fill="#ffffff" filter={`url(#${bsh})`} />
          <circle cx="22" cy="32" r="3.2" fill="#ffffff" filter={`url(#${bsh})`} />
        </>
      )}

      {/* 31. BELL */}
      {type === 'bell' && (
        <>
          <defs>
            <linearGradient id={g1} x1="12" y1="6" x2="36" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <path
            d="M24 6C19.5 6 16 9.5 16 14V24L12 28V30H36V28L32 24V14C32 9.5 28.5 6 24 6Z"
            fill={`url(#${g1})`}
            filter={`url(#${sh})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <circle cx="24" cy="36" r="3" fill="#f59e0b" />
          <circle cx="33" cy="11" r="3.5" fill="#f43f5e" filter={`url(#${bsh})`} />
        </>
      )}

      {/* 32. POWER */}
      {type === 'power' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="18.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M24 13V23M16 17C13 20 13 27 17 31C21 35 27 35 31 31C35 27 35 20 32 17" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
        </>
      )}

      {/* 33. SMARTPHONE */}
      {type === 'smartphone' && (
        <>
          <defs>
            <linearGradient id={g1} x1="10" y1="5" x2="38" y2="43" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <rect x="13" y="5" width="22" height="38" rx="5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <rect x="15.5" y="8.5" width="17" height="28" rx="2" fill="#0f172a" />
          <circle cx="24" cy="39" r="1.5" fill="#ffffff" />
        </>
      )}

      {/* 34. SAVE */}
      {type === 'save' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <path d="M8 8C8 6.9 8.9 6 10 6H34L40 12V38C40 39.1 39.1 40 38 40H10C8.9 40 8 39.1 8 38V8Z" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <rect x="14" y="6" width="20" height="11" rx="2" fill="#ffffff" />
          <rect x="14" y="23" width="20" height="15" rx="2" fill="#ffffff" fillOpacity="0.8" />
        </>
      )}

      {/* 35. PLUS */}
      {type === 'plus' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="18.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M24 14V34M14 24H34" stroke="#ffffff" strokeWidth="3.6" strokeLinecap="round" />
        </>
      )}

      {/* 36. REFRESH */}
      {type === 'refresh' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="18.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M33 24C33 29 29 33 24 33C20 33 16.5 30.5 15.5 27M15 24C15 19 19 15 24 15C28 15 31.5 17.5 32.5 21" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path d="M33 16V22H27M15 32V26H21" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {/* 37. CHECK */}
      {type === 'check' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="18.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M15 24L21 30L33 18" stroke="#ffffff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {/* 38. XCIRCLE */}
      {type === 'xcircle' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="18.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M17 17L31 31M31 17L17 31" stroke="#ffffff" strokeWidth="3.6" strokeLinecap="round" />
        </>
      )}

      {/* 39. SPARKLES */}
      {type === 'sparkles' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M24 11L26.5 19.5L35 22L26.5 24.5L24 33L21.5 24.5L13 22L21.5 19.5L24 11Z" fill="#ffffff" />
          <path d="M33 11L34.2 14.8L38 16L34.2 17.2L33 21L31.8 17.2L28 16L31.8 14.8L33 11Z" fill="#fde047" />
        </>
      )}

      {/* 40. ROCKET */}
      {type === 'rocket' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c026d3" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M34 14C34 14 31 11 25 14C19 17 17 23 17 23L25 31C25 31 31 29 34 23C37 17 34 14 34 14Z" fill="#ffffff" />
          <circle cx="26" cy="22" r="2.5" fill="#0284c7" />
          <path d="M17 27L12 30L14 36L20 34L23 29" fill="#fde047" />
        </>
      )}

      {/* 41. SEND / MESSAGE */}
      {type === 'send' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M37 11L19 22L11 18L37 11Z" fill="#ffffff" />
          <path d="M37 11L26 37L19 22L37 11Z" fill="#ffffff" fillOpacity="0.8" />
        </>
      )}

      {/* 42. CAMERA */}
      {type === 'camera' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="10" x2="42" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id={g2} x1="16" y1="16" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <path d="M16 12L19 8H29L32 12H38C40.2 12 42 13.8 42 16V36C42 38.2 40.2 40 38 40H10C7.8 40 6 38.2 6 36V16C6 13.8 7.8 12 10 12H16Z" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <circle cx="24" cy="26" r="8" fill={`url(#${g2})`} filter={`url(#${bsh})`} />
          <circle cx="24" cy="26" r="4" fill="#0f172a" />
        </>
      )}

      {/* 43. MIC */}
      {type === 'mic' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>
          </defs>
          <rect x="18" y="7" width="12" height="20" rx="6" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M12 21C12 27.6 17.4 33 24 33C30.6 33 36 27.6 36 21" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <path d="M24 33V41M18 41H30" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      {/* 44. FLAME */}
      {type === 'flame' && (
        <>
          <defs>
            <linearGradient id={g1} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="40%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <path
            d="M25 6C25 11 21 14 20 18C19 15 19 12 18 10C11 15 8 23 8 28C8 36 15 42 24 42C33 42 40 35 40 26C40 16 31 10 25 6Z"
            fill={`url(#${g1})`}
            filter={`url(#${sh})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <path d="M24 42C29 42 33 37 33 31C33 24 28 20 24 17C21 20 19 24 19 28C19 33 20 37 24 42Z" fill="#fde047" />
        </>
      )}

      {/* 45. COMPASS */}
      {type === 'compass' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="18.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <circle cx="24" cy="24" r="15" fill="#0f172a" />
          <polygon points="24,11 29,24 24,22" fill="#ef4444" />
          <polygon points="24,37 19,24 24,26" fill="#ffffff" />
          <circle cx="24" cy="24" r="2.5" fill="#facc15" />
        </>
      )}

      {/* 46. PLAY / PAUSE */}
      {type === 'play' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="18.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <polygon points="19,15 33,24 19,33" fill="#ffffff" />
        </>
      )}
      {type === 'pause' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="18.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <rect x="17" y="15" width="4.5" height="18" rx="2" fill="#ffffff" />
          <rect x="26.5" y="15" width="4.5" height="18" rx="2" fill="#ffffff" />
        </>
      )}

      {/* 47. UPLOAD */}
      {type === 'upload' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M24 32V16M24 16L17 23M24 16L31 23M13 36H35" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {/* 48. DOWNLOAD */}
      {type === 'download' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M24 14V30M24 30L17 23M24 30L31 23M13 36H35" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {/* 49. ZAP */}
      {type === 'zap' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id={g2} x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M26 7L12 26H23L20 41L36 21H25L26 7Z" fill={`url(#${g2})`} filter={`url(#${bsh})`} stroke="#ffffff" strokeWidth="1" strokeLinejoin="round" />
        </>
      )}

      {/* 50. PENTOOL */}
      {type === 'pentool' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="34" height="34" rx="8.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M34 10L38 14L23 29L15 31L17 23L34 10Z" fill="#ffffff" filter={`url(#${bsh})`} />
        </>
      )}

      {/* 51. GRID3X3 / LAYOUTGRID */}
      {type === 'grid3x3' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <rect x="7" y="7" width="14" height="14" rx="4" fill={`url(#${g1})`} filter={`url(#${sh})`} />
          <rect x="27" y="7" width="14" height="14" rx="4" fill="#06b6d4" filter={`url(#${sh})`} />
          <rect x="7" y="27" width="14" height="14" rx="4" fill="#8b5cf6" filter={`url(#${sh})`} />
          <rect x="27" y="27" width="14" height="14" rx="4" fill="#ec4899" filter={`url(#${sh})`} />
        </>
      )}

      {/* 52. LAYERS */}
      {type === 'layers' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
          </defs>
          <polygon points="24,6 40,15 24,24 8,15" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1" />
          <polygon points="24,16 40,25 24,34 8,25" fill="#60a5fa" filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1" fillOpacity="0.8" />
          <polygon points="24,26 40,35 24,44 8,35" fill="#3b82f6" filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1" fillOpacity="0.9" />
        </>
      )}

      {/* 53. APPWINDOW */}
      {type === 'appwindow' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <rect x="6" y="8" width="36" height="30" rx="6" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M6 16H42" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          <circle cx="11" cy="12" r="1.5" fill="#f43f5e" />
          <circle cx="16" cy="12" r="1.5" fill="#facc15" />
          <circle cx="21" cy="12" r="1.5" fill="#34d399" />
        </>
      )}

      {/* 54. HARDDRIVE / SERVER */}
      {(type === 'harddrive' || type === 'server') && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>
          <rect x="6" y="10" width="36" height="11" rx="3.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.1" />
          <circle cx="36" cy="15.5" r="1.5" fill="#38bdf8" />
          <rect x="6" y="25" width="36" height="11" rx="3.5" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.1" />
          <circle cx="36" cy="30.5" r="1.5" fill="#34d399" />
        </>
      )}

      {/* 55. IMAGE */}
      {type === 'image' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <rect x="6" y="8" width="36" height="30" rx="6" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <circle cx="15" cy="16" r="3.5" fill="#fde047" />
          <path d="M10 33L19 22L26 29L31 24L38 33H10Z" fill="#ffffff" fillOpacity="0.9" />
        </>
      )}

      {/* 56. FILE */}
      {type === 'file' && (
        <>
          <defs>
            <linearGradient id={g1} x1="8" y1="5" x2="40" y2="43" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>
          <path d="M10 7C10 5.9 10.9 5 12 5H28L38 15V41C38 42.1 37.1 43 36 43H12C10.9 43 10 42.1 10 41V7Z" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.1" />
          <polygon points="28,5 38,15 28,15" fill="#64748b" />
          <rect x="15" y="22" width="18" height="2.5" rx="1.25" fill="#3b82f6" />
          <rect x="15" y="28" width="14" height="2.5" rx="1.25" fill="#64748b" />
          <rect x="15" y="34" width="10" height="2.5" rx="1.25" fill="#64748b" />
        </>
      )}

      {/* 57. THERMOMETER */}
      {type === 'thermometer' && (
        <>
          <defs>
            <linearGradient id={g1} x1="16" y1="5" x2="32" y2="43" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
          <rect x="19" y="5" width="10" height="24" rx="5" fill="#334155" filter={`url(#${sh})`} />
          <circle cx="24" cy="34" r="8" fill="#334155" filter={`url(#${sh})`} />
          <rect x="22" y="10" width="4" height="22" rx="2" fill={`url(#${g1})`} />
          <circle cx="24" cy="34" r="5.5" fill={`url(#${g1})`} />
        </>
      )}

      {/* 58. WIND / DROPLETS / CLOUD */}
      {(type === 'wind' || type === 'droplets' || type === 'cloud') && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="12" x2="42" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <path
            d="M16 38H34.5C39.2 38 43 34.2 43 29.5C43 25.1 39.6 21.5 35.3 21.1C33.8 15.9 29 12 23.3 12C16.4 12 10.8 17.6 10.8 24.5C10.8 24.9 10.8 25.3 10.9 25.7C7.6 26.7 5.2 29.8 5.2 33.4C5.2 36 9.5 38 16 38Z"
            fill={`url(#${g1})`}
            filter={`url(#${sh})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
        </>
      )}

      {/* 59. ENTERTAINMENT APP ICON */}
      {type === 'entertainment' && (
        <>
          <defs>
            <linearGradient id={g1} x1="4" y1="8" x2="44" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id={g2} x1="14" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.75" />
            </linearGradient>
          </defs>
          {/* Main 3D Cinema TV Display Body */}
          <rect x="5" y="9" width="38" height="28" rx="8" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          {/* Screen Inner Bezel */}
          <rect x="8" y="12" width="32" height="22" rx="5" fill="#090d16" fillOpacity="0.85" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.8" />
          {/* Glowing Play Gem in Screen Center */}
          <polygon points="21,17 31,23 21,29" fill={`url(#${g2})`} filter={`url(#${sh})`} />
          {/* Cinema Clapperboard / Film Perforations on Top Right */}
          <circle cx="35" cy="16" r="1.8" fill="#f43f5e" />
          <circle cx="35" cy="22" r="1.8" fill="#38bdf8" />
          {/* TV Stand Base */}
          <path d="M19 37 L29 37 L26 41 L22 41 Z" fill="#475569" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="0.5" />
        </>
      )}

      {/* FALLBACK (GITBRANCH, ETC) */}
      {type === 'gitbranch' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${sh})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path d="M15 12V36M15 28C22 28 28 22 28 17" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="15" cy="12" r="3" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="15" cy="36" r="3" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="28" cy="17" r="3" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
