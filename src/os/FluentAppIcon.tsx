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
  | 'monitor';

const ICON_NAME_TO_FLUENT: Record<string, FluentIconType> = {
  // Core App IDs
  browser: 'browser',
  notepad: 'notepad',
  terminal: 'terminal',
  calculator: 'calculator',
  explorer: 'explorer',
  settings: 'settings',
  game: 'game',
  synth: 'synth',
  calendar: 'calendar',
  weather: 'weather',
  clock: 'clock',
  ai: 'ai',
  sysmon: 'sysmon',
  taskmanager: 'taskmanager',
  appstore: 'appstore',
  recycle: 'recycle',
  // Store & Extra App IDs
  'slope-runner': 'zap',
  'markdown-studio': 'pentool',
  'retro-2048': 'grid3x3',
  'retro-snake': 'game',
  'cosmic-maze': 'game',
  // Icon Names mapped to 2.5D Office/Fluent Icons
  Globe: 'browser',
  Compass: 'browser',
  FileText: 'notepad',
  BookOpen: 'notepad',
  SquareTerminal: 'terminal',
  Terminal: 'terminal',
  Calculator: 'calculator',
  FolderOpen: 'explorer',
  Folder: 'explorer',
  Settings: 'settings',
  Sliders: 'settings',
  Gamepad2: 'game',
  Flame: 'game',
  Music: 'synth',
  Disc: 'synth',
  ListMusic: 'synth',
  Calendar: 'calendar',
  ListTodo: 'calendar',
  CloudSun: 'weather',
  CloudRain: 'weather',
  Clock: 'clock',
  AlarmClock: 'clock',
  Timer: 'clock',
  Bot: 'ai',
  Sparkles: 'ai',
  Activity: 'sysmon',
  Gauge: 'sysmon',
  Cpu: 'taskmanager',
  Store: 'appstore',
  Trash2: 'recycle',
  Zap: 'zap',
  PenTool: 'pentool',
  Grid3x3: 'grid3x3',
  GitBranch: 'gitbranch',
  Rocket: 'gitbranch',
  Server: 'server',
  HardDrive: 'server',
  ImageIcon: 'image',
  Image: 'image',
  File: 'file',
  Download: 'download',
  Monitor: 'monitor',
};

export function resolveFluentIconType(nameOrId: string): FluentIconType | null {
  return ICON_NAME_TO_FLUENT[nameOrId] ?? null;
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

  const shadowId = `fl-sh-${uid}`;
  const badgeShadowId = `fl-bsh-${uid}`;
  const g1 = `fl-g1-${uid}`;
  const g2 = `fl-g2-${uid}`;
  const g3 = `fl-g3-${uid}`;
  const g4 = `fl-g4-${uid}`;
  const glass = `fl-gl-${uid}`;
  const rim = `fl-rim-${uid}`;

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
        {/* 2.5D Base Elevation Drop Shadow */}
        <filter id={shadowId} x="-22%" y="-22%" width="144%" height="150%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#020617" floodOpacity="0.48" />
        </filter>
        {/* 2.5D Floating Foreground Tile Drop Shadow */}
        <filter id={badgeShadowId} x="-28%" y="-28%" width="156%" height="162%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="1" dy="3.2" stdDeviation="2.6" floodColor="#020617" floodOpacity="0.58" />
        </filter>
        {/* 2.5D Frosted Glass Surface Gradient */}
        <linearGradient id={glass} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.62" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
        </linearGradient>
        {/* 2.5D Specular Top Rim Bevel */}
        <linearGradient id={rim} x1="8" y1="4" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.78" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* ============================================================
          1. BROWSER — 2.5D Layered Ocean Globe + Floating Compass Tile
         ============================================================ */}
      {type === 'browser' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id={g2} x1="8" y1="10" x2="40" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="48%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id={g3} x1="22" y1="22" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
          <circle cx="23" cy="23" r="18.5" fill={`url(#${g1})`} filter={`url(#${shadowId})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path
            d="M6.5 21C9 11.5 17.8 5.5 27 7C35 8.3 40.5 15 40 22.5C37 17.5 31 15 24.5 16.5C18 18 14.5 24 17.5 29.5C20 34 26.5 35.2 32 33C28.5 38.5 21.5 41 14.5 38.5C8.5 36.3 5 29 6.5 21Z"
            fill={`url(#${g2})`}
          />
          <ellipse cx="23" cy="23" rx="18" ry="8" transform="rotate(-24 23 23)" stroke={`url(#${glass})`} strokeWidth="2.5" />
          <rect
            x="24"
            y="24"
            width="19"
            height="19"
            rx="6"
            fill={`url(#${g3})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <path d="M29.5 37.5L32.2 31.2L38.5 28.5L35.8 34.8L29.5 37.5Z" fill="#ffffff" />
        </>
      )}

      {/* ============================================================
          2. EDITOR (NOTEPAD) — 2.5D Microsoft Word-Style 3-Tier Sheet + Floating Pen Tile
         ============================================================ */}
      {type === 'notepad' && (
        <>
          <defs>
            <linearGradient id={g1} x1="12" y1="4" x2="42" y2="18" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id={g2} x1="12" y1="16" x2="42" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id={g3} x1="12" y1="28" x2="42" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id={g4} x1="4" y1="13" x2="24" y2="35" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <g filter={`url(#${shadowId})`}>
            <rect x="13" y="5" width="29" height="13" rx="4.5" fill={`url(#${g1})`} />
            <rect x="13" y="16" width="29" height="14" fill={`url(#${g2})`} />
            <rect x="13" y="28" width="29" height="15" rx="4.5" fill={`url(#${g3})`} />
            <rect x="13" y="5" width="29" height="38" rx="4.5" stroke={`url(#${rim})`} strokeWidth="1" />
          </g>
          <rect x="25" y="11" width="12" height="2.4" rx="1.2" fill="rgba(255,255,255,0.92)" />
          <rect x="25" y="18" width="12" height="2.4" rx="1.2" fill="rgba(255,255,255,0.85)" />
          <rect x="25" y="25" width="12" height="2.4" rx="1.2" fill="rgba(255,255,255,0.8)" />
          <rect x="18" y="33" width="19" height="2.4" rx="1.2" fill="rgba(255,255,255,0.75)" />
          <rect
            x="4"
            y="13"
            width="21"
            height="21"
            rx="6"
            fill={`url(#${g4})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <path d="M9.5 19.5H19.5M9.5 23.5H17.5M9.5 27.5H14.5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {/* ============================================================
          3. TERMINAL — 2.5D Layered Console Window + Floating CLI Badge
         ============================================================ */}
      {type === 'terminal' && (
        <>
          <defs>
            <linearGradient id={g1} x1="8" y1="6" x2="43" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id={g2} x1="8" y1="6" x2="43" y2="15" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id={g3} x1="4" y1="15" x2="25" y2="37" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <rect x="9" y="7" width="34" height="34" rx="6.5" fill={`url(#${g1})`} filter={`url(#${shadowId})`} stroke={`url(#${rim})`} strokeWidth="1.1" />
          <path d="M9 13.5C9 9.91015 11.9101 7 15.5 7H36.5C40.0899 7 43 9.91015 43 13.5V15H9V13.5Z" fill={`url(#${g2})`} />
          <circle cx="14" cy="11" r="1.6" fill="#38bdf8" />
          <circle cx="19" cy="11" r="1.6" fill="#e879f9" />
          <rect x="27" y="20.5" width="11" height="2.5" rx="1.25" fill="#38bdf8" fillOpacity="0.9" />
          <rect x="27" y="26.5" width="8.5" height="2.5" rx="1.25" fill="#94a3b8" fillOpacity="0.75" />
          <rect x="21" y="32.5" width="16" height="2.5" rx="1.25" fill="#c084fc" fillOpacity="0.85" />
          <rect
            x="4"
            y="15"
            width="21"
            height="21"
            rx="6"
            fill={`url(#${g3})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <path d="M9.5 21.5L13.8 25.5L9.5 29.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 29.5H19" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* ============================================================
          4. CALCULATOR — 2.5D Multi-Panel Keypad + Floating Orange Equals Tile
         ============================================================ */}
      {type === 'calculator' && (
        <>
          <defs>
            <linearGradient id={g1} x1="7" y1="4" x2="39" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id={g2} x1="11" y1="8" x2="35" y2="18" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id={g3} x1="25" y1="25" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <rect x="7" y="4" width="32" height="40" rx="7.5" fill={`url(#${g1})`} filter={`url(#${shadowId})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <rect x="11" y="8" width="24" height="10" rx="3.5" fill={`url(#${g2})`} />
          <rect x="25" y="11.5" width="7" height="3" rx="1.5" fill="#ffffff" />
          <rect x="11" y="21.5" width="6.5" height="6.5" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x="19.75" y="21.5" width="6.5" height="6.5" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x="28.5" y="21.5" width="6.5" height="6.5" rx="2" fill="rgba(56,189,248,0.5)" />
          <rect x="11" y="30.5" width="6.5" height="6.5" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x="19.75" y="30.5" width="6.5" height="6.5" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect
            x="25"
            y="25"
            width="19"
            height="19"
            rx="6"
            fill={`url(#${g3})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <path d="M30.5 32H38.5M30.5 37H38.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* ============================================================
          5. FILES (EXPLORER) — 2.5D Layered Golden Folder + Frosted Sheet + Blue Clasp
         ============================================================ */}
      {type === 'explorer' && (
        <>
          <defs>
            <linearGradient id={g1} x1="5" y1="7" x2="43" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id={g2} x1="5" y1="15" x2="43" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="48%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id={g3} x1="15" y1="28" x2="33" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <path
            d="M5 12C5 9.23858 7.23858 7 10 7H19.2C20.7 7 22.1 7.7 23 8.9L25.2 11.8C25.6 12.3 26.2 12.6 26.8 12.6H38C40.7614 12.6 43 14.8386 43 17.6V26H5V12Z"
            fill={`url(#${g1})`}
          />
          <rect
            x="9.5"
            y="10.5"
            width="29"
            height="16"
            rx="3.5"
            fill="#ffffff"
            fillOpacity="0.94"
            filter={`url(#${shadowId})`}
          />
          <rect x="14" y="14" width="15" height="2.4" rx="1.2" fill="#38bdf8" />
          <path
            d="M5 20C5 17.2386 7.23858 15 10 15H38C40.7614 15 43 17.2386 43 20V36C43 39.3137 40.3137 42 37 42H11C7.68629 42 5 39.3137 5 36V20Z"
            fill={`url(#${g2})`}
            filter={`url(#${shadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <rect
            x="15"
            y="31"
            width="18"
            height="6.5"
            rx="3.25"
            fill={`url(#${g3})`}
            filter={`url(#${badgeShadowId})`}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1"
          />
        </>
      )}

      {/* ============================================================
          6. SETTINGS — 2.5D Sculpted Titanium Gear + Floating Lustrous Core
         ============================================================ */}
      {type === 'settings' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e2e8f0" />
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
            d="M21.2 4.5H26.8L28.1 9.6C29.5 10.1 30.8 10.9 31.9 11.8L36.9 10.3L39.7 15.1L35.9 18.8C36.3 20.1 36.5 21.5 36.5 23C36.5 24.5 36.3 25.9 35.9 27.2L39.7 30.9L36.9 35.7L31.9 34.2C30.8 35.1 29.5 35.9 28.1 36.4L26.8 41.5H21.2L19.9 36.4C18.5 35.9 17.2 35.1 16.1 34.2L11.1 35.7L8.3 30.9L12.1 27.2C11.7 25.9 11.5 24.5 11.5 23C11.5 21.5 11.7 20.1 12.1 18.8L8.3 15.1L11.1 10.3L16.1 11.8C17.2 10.9 18.5 10.1 19.9 9.6L21.2 4.5Z"
            transform="translate(0 1)"
            fill={`url(#${g1})`}
            filter={`url(#${shadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <circle
            cx="24"
            cy="24"
            r="11"
            fill={`url(#${g2})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.3"
          />
          <circle cx="24" cy="24" r="4.5" fill="#0f172a" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
        </>
      )}

      {/* ============================================================
          7. GAMES — 2.5D Layered Violet Arcade Deck + Floating Gamepad
         ============================================================ */}
      {type === 'game' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="8" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="48%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
            <linearGradient id={g2} x1="12" y1="12" x2="36" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          {/* Back 2.5D Tilted Glass Card */}
          <rect
            x="10"
            y="6"
            width="28"
            height="22"
            rx="6"
            fill={`url(#${g2})`}
            filter={`url(#${shadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1"
          />
          {/* Foreground 2.5D Controller Body */}
          <path
            d="M14 14H34C39.5 14 43.5 18.5 42.8 24L41.2 35.5C40.6 39.2 36.8 41.2 33.4 39.4L28.2 36.6C27.2 36.1 26.1 35.8 25 35.8H23C21.9 35.8 20.8 36.1 19.8 36.6L14.6 39.4C11.2 41.2 7.4 39.2 6.8 35.5L5.2 24C4.5 18.5 8.5 14 14 14Z"
            fill={`url(#${g1})`}
            filter={`url(#${badgeShadowId})`}
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

      {/* ============================================================
          8. MUSIC (SYNTH) — 2.5D Layered Vinyl & Rose-Amethyst Sound Tile
         ============================================================ */}
      {type === 'synth' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="50%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id={g2} x1="20" y1="8" x2="44" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <rect
            x="5"
            y="7"
            width="34"
            height="34"
            rx="9.5"
            fill={`url(#${g1})`}
            filter={`url(#${shadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <circle cx="22" cy="24" r="11.5" stroke="rgba(255,255,255,0.24)" strokeWidth="1.5" />
          {/* Floating 2.5D Equalizer / Note Badge */}
          <rect
            x="24"
            y="22"
            width="19"
            height="19"
            rx="6"
            fill={`url(#${g2})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <path
            d="M17 29.5V16.5L28 14V26.5"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="14.5" cy="30" r="3.6" fill="#ffffff" />
          <path d="M29.5 34V29M33.5 36V27M37.5 33V30" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {/* ============================================================
          9. CALENDAR — 2.5D Outlook-Style Tiered Date Card + Floating Check Tile
         ============================================================ */}
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
            <linearGradient id={g3} x1="24" y1="24" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <rect x="6" y="7" width="34" height="34" rx="7" fill={`url(#${g2})`} filter={`url(#${shadowId})`} stroke={`url(#${rim})`} strokeWidth="1" />
          <path d="M6 14C6 10.134 9.13401 7 13 7H33C36.866 7 40 10.134 40 14V17H6V14Z" fill={`url(#${g1})`} />
          <rect x="14" y="4.5" width="3.2" height="6" rx="1.6" fill="#ffffff" />
          <rect x="29" y="4.5" width="3.2" height="6" rx="1.6" fill="#ffffff" />
          <rect x="11" y="21" width="5" height="4.5" rx="1.5" fill="#64748b" fillOpacity="0.45" />
          <rect x="18.5" y="21" width="5" height="4.5" rx="1.5" fill="#64748b" fillOpacity="0.45" />
          <rect x="26" y="21" width="5" height="4.5" rx="1.5" fill="#3b82f6" />
          <rect x="11" y="28.5" width="5" height="4.5" rx="1.5" fill="#64748b" fillOpacity="0.45" />
          <rect x="18.5" y="28.5" width="5" height="4.5" rx="1.5" fill="#ec4899" />
          <rect
            x="24"
            y="24"
            width="19"
            height="19"
            rx="6"
            fill={`url(#${g3})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <path d="M29.5 33.8L32.5 36.8L38 30.8" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {/* ============================================================
          10. WEATHER — 2.5D Radiant Sun Sphere + Frosted Glass Cloud + Rain Gem
         ============================================================ */}
      {type === 'weather' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id={g2} x1="12" y1="16" x2="43" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <circle cx="17.5" cy="16.5" r="11" fill={`url(#${g1})`} filter={`url(#${shadowId})`} stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
          <path
            d="M16 39H34.5C39.2 39 43 35.2 43 30.5C43 26.1 39.6 22.5 35.3 22.1C33.8 16.9 29 13 23.3 13C16.4 13 10.8 18.6 10.8 25.5C10.8 25.9 10.8 26.3 10.9 26.7C7.6 27.7 5.2 30.8 5.2 34.4C5.2 37 9.5 39 16 39Z"
            fill={`url(#${g2})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
        </>
      )}

      {/* ============================================================
          11. CLOCK — 2.5D Layered Chronometer + Floating Alarm Badge
         ============================================================ */}
      {type === 'clock' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="55%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id={g2} x1="25" y1="25" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          <circle
            cx="23"
            cy="23"
            r="18.5"
            fill={`url(#${g1})`}
            filter={`url(#${shadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <circle cx="23" cy="23" r="14" fill="#0f172a" fillOpacity="0.7" />
          <path d="M23 13.5V23L29.5 26.5" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="23" cy="23" r="2.5" fill="#38bdf8" />
          <rect
            x="26"
            y="26"
            width="17"
            height="17"
            rx="5.5"
            fill={`url(#${g2})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.1"
          />
          <circle cx="34.5" cy="34.5" r="4" stroke="#ffffff" strokeWidth="2" />
        </>
      )}

      {/* ============================================================
          12. AI ASSISTANT — 2.5D Copilot Interlocking Ribbons + Sparkle Core
         ============================================================ */}
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
          <path
            d="M15 8C9.5 8 5 12.5 5 18C5 24.5 10.5 30 18 30H26.5C26.5 21 21.5 8 15 8Z"
            fill={`url(#${g1})`}
            filter={`url(#${shadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1"
          />
          <path
            d="M33 40C38.5 40 43 35.5 43 30C43 23.5 37.5 18 30 18H21.5C21.5 27 26.5 40 33 40Z"
            fill={`url(#${g2})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <path
            d="M24 14.5L26.3 21.7L33.5 24L26.3 26.3L24 33.5L21.7 26.3L14.5 24L21.7 21.7L24 14.5Z"
            fill="#ffffff"
          />
        </>
      )}

      {/* ============================================================
          13. SYSTEM MONITOR — 2.5D Emerald Telemetry Card + Floating Pulse Badge
         ============================================================ */}
      {type === 'sysmon' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>
            <linearGradient id={g2} x1="25" y1="25" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <rect
            x="5"
            y="6"
            width="35"
            height="33"
            rx="8"
            fill={`url(#${g1})`}
            filter={`url(#${shadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <rect x="9" y="10" width="27" height="25" rx="5" fill="#022c22" fillOpacity="0.6" />
          <path
            d="M10.5 23.5H16L19.5 15L24.5 30L28 20.5L31 23.5H34.5"
            stroke="#ffffff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="26"
            y="25"
            width="18"
            height="18"
            rx="5.5"
            fill={`url(#${g2})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.1"
          />
          <path d="M31 37V33M35 37V30M39 37V34" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {/* ============================================================
          14. TASK MANAGER — 2.5D Layered Silicon CPU Package + Floating Core
         ============================================================ */}
      {type === 'taskmanager' && (
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
          <path
            d="M16 4V9M24 4V9M32 4V9M16 39V44M24 39V44M32 39V44M4 16H9M4 24H9M4 32H9M39 16H44M39 24H44M39 32H44"
            stroke="#94a3b8"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <rect
            x="9"
            y="9"
            width="30"
            height="30"
            rx="6.5"
            fill={`url(#${g1})`}
            filter={`url(#${shadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <rect
            x="15.5"
            y="15.5"
            width="17"
            height="17"
            rx="4"
            fill={`url(#${g2})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
        </>
      )}

      {/* ============================================================
          15. APP STORE — 2.5D Frosted Store Bag + Floating 4-Tile Ribbon Badge
         ============================================================ */}
      {type === 'appstore' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="12" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
          </defs>
          <path
            d="M17 14V11C17 7.13401 20.134 4 24 4C27.866 4 31 7.13401 31 11V14"
            stroke="#7dd3fc"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <rect
            x="7"
            y="13"
            width="34"
            height="29"
            rx="7.5"
            fill={`url(#${g1})`}
            filter={`url(#${shadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <g filter={`url(#${badgeShadowId})`}>
            <rect x="16.5" y="19.5" width="6.5" height="6.5" rx="1.8" fill="#fb7185" />
            <rect x="25" y="19.5" width="6.5" height="6.5" rx="1.8" fill="#34d399" />
            <rect x="16.5" y="28" width="6.5" height="6.5" rx="1.8" fill="#38bdf8" />
            <rect x="25" y="28" width="6.5" height="6.5" rx="1.8" fill="#facc15" />
          </g>
        </>
      )}

      {/* ============================================================
          16. TRASH (RECYCLE BIN) — 2.5D Translucent Glass Bin + Recycling Emblem
         ============================================================ */}
      {type === 'recycle' && (
        <>
          <defs>
            <linearGradient id={g1} x1="10" y1="8" x2="38" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.92" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id={g2} x1="8" y1="6" x2="40" y2="12" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <rect x="9" y="7" width="30" height="4.8" rx="2.4" fill={`url(#${g2})`} filter={`url(#${shadowId})`} />
          <path
            d="M11.5 13H36.5L34 39.5C33.8 41.5 32.1 43 30.1 43H17.9C15.9 43 14.2 41.5 14 39.5L11.5 13Z"
            fill={`url(#${g1})`}
            filter={`url(#${shadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
          <path d="M19 18L20 37M24 18V37M29 18L28 37" stroke="#0f172a" strokeOpacity="0.35" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}

      {/* ============================================================
          17. ZAP (SLOPE RUNNER) — 2.5D Neon Velocity Tile + Floating Lightning Bolt
         ============================================================ */}
      {type === 'zap' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id={g2} x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="9" fill={`url(#${g1})`} filter={`url(#${shadowId})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path
            d="M26 7L12 26H23L20 41L36 21H25L26 7Z"
            fill={`url(#${g2})`}
            filter={`url(#${badgeShadowId})`}
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* ============================================================
          18. PENTOOL (MARKDOWN STUDIO) — 2.5D Creative Violet Card + Fountain Nib
         ============================================================ */}
      {type === 'pentool' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
            <linearGradient id={g2} x1="14" y1="14" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="34" height="34" rx="8.5" fill={`url(#${g1})`} filter={`url(#${shadowId})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          <path
            d="M34 10L38 14L23 29L15 31L17 23L34 10Z"
            fill={`url(#${g2})`}
            filter={`url(#${badgeShadowId})`}
            stroke="#ffffff"
            strokeWidth="1.2"
          />
        </>
      )}

      {/* ============================================================
          19. GRID3X3 (2048 HOLOGRAM) — 2.5D Layered Number Matrix Tiles
         ============================================================ */}
      {type === 'grid3x3' && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id={g2} x1="20" y1="20" x2="43" y2="43" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          <g filter={`url(#${shadowId})`}>
            <rect x="6" y="6" width="16" height="16" rx="4.5" fill={`url(#${g1})`} stroke={`url(#${rim})`} strokeWidth="1" />
            <rect x="26" y="6" width="16" height="16" rx="4.5" fill="#06b6d4" stroke={`url(#${rim})`} strokeWidth="1" />
            <rect x="6" y="26" width="16" height="16" rx="4.5" fill="#6366f1" stroke={`url(#${rim})`} strokeWidth="1" />
          </g>
          <rect
            x="24"
            y="24"
            width="19"
            height="19"
            rx="5.5"
            fill={`url(#${g2})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.2"
          />
        </>
      )}

      {/* ============================================================
          20. GITBRANCH / SERVER / IMAGE / FILE / DOWNLOAD / MONITOR
         ============================================================ */}
      {(type === 'gitbranch' || type === 'server' || type === 'image' || type === 'file' || type === 'download' || type === 'monitor') && (
        <>
          <defs>
            <linearGradient id={g1} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id={g2} x1="20" y1="20" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <rect x="7" y="7" width="34" height="34" rx="8.5" fill={`url(#${g1})`} filter={`url(#${shadowId})`} stroke={`url(#${rim})`} strokeWidth="1.2" />
          {type === 'image' ? (
            <>
              <circle cx="17" cy="17" r="3.5" fill="#fde047" />
              <path d="M10 35L19 24L26 31L31 26L38 35H10Z" fill="#ffffff" fillOpacity="0.88" />
            </>
          ) : type === 'download' ? (
            <path d="M24 14V30M24 30L18 24M24 30L30 24M15 35H33" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <rect x="14" y="15" width="20" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.9" />
              <rect x="14" y="22" width="15" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.75" />
              <rect x="14" y="29" width="12" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.6" />
            </>
          )}
          <rect
            x="26"
            y="26"
            width="17"
            height="17"
            rx="5"
            fill={`url(#${g2})`}
            filter={`url(#${badgeShadowId})`}
            stroke={`url(#${rim})`}
            strokeWidth="1.1"
          />
          <circle cx="34.5" cy="34.5" r="3" fill="#ffffff" />
        </>
      )}
    </svg>
  );
}
