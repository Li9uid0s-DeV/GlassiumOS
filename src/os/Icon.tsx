import {
  FolderOpen,
  Globe,
  SquareTerminal,
  Settings,
  FileText,
  Folder,
  File,
  Image as ImageIcon,
  Search,
  Wifi,
  Bluetooth,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Battery,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Power,
  User,
  Pin,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Unlock,
  Home,
  Download,
  HardDrive,
  Monitor,
  Palette,
  Info,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Maximize,
  CornerDownLeft,
  Gamepad2,
  Upload,
  Sparkles,
  Zap,
  AlignCenter,
  AlignLeft,
  Layers,
  Keyboard,
  Store,
  PenTool,
  Grid3x3,
  GitBranch,
  Star,
  Rocket,
  LayoutGrid,
  Check,
  Activity,
  Calendar,
  Music,
  Clock,
  Sliders,
  Cpu,
  ListTodo,
  Radio,
  Eye,
  EyeOff,
  Apple,
  Layout,
  Smartphone,
  Play,
  Pause,
  Shield,
  Compass,
  Flame,
  Terminal,
  Gauge,
  SlidersHorizontal,
  ExternalLink,
  MessageSquare,
  Send,
  HelpCircle,
  Hash,
  Binary,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  Mic2,
  Volume1,
  ShieldCheck,
  Server,
  ListMusic,
  Disc,
  CloudSun,
  CloudRain,
  Cloud,
  Wind,
  Droplets,
  Thermometer,
  Timer,
  Bell,
  Bot,
  AlarmClock,
  Navigation,
  Flashlight,
  Camera,
  Hand,
  Calculator,
  BookOpen,
  List,
  History,
  XCircle,
  BatteryCharging,
  Mic,
  Square,
  AppWindow,
  CheckCircle2,
  RotateCcw,
  MousePointer,
  Tv,
  Film,
  Video,
  Clapperboard,
  Key,
  Code2,
  CloudFog,
  Snowflake,
  CloudLightning,
  CloudDrizzle,
  CloudSnow,
  MapPin,
  Map as MapIcon,
  Umbrella,
  AlertCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { FluentAppIcon, resolveFluentIconType } from './FluentAppIcon';
import {
  GLASISPECT_MATERIALS,
  GlasispectIconStyle,
  GlasispectMaterialId,
  loadGlassium6BetaConfig,
} from './glasispectMaterialEngine';

const map = {
  entertainment: Tv,
  Tv,
  Film,
  Video,
  Clapperboard,
  Key,
  Code2,
  CloudFog,
  Snowflake,
  CloudLightning,
  CloudDrizzle,
  CloudSnow,
  MapPin,
  Map: MapIcon,
  Umbrella,
  AlertCircle,
  CloudSun,
  CloudRain,
  Cloud,
  Wind,
  Droplets,
  Thermometer,
  Timer,
  Bell,
  Bot,
  AlarmClock,
  Navigation,
  Flashlight,
  Camera,
  Hand,
  Calculator,
  BookOpen,
  List,
  History,
  XCircle,
  BatteryCharging,
  Mic,
  Square,
  AppWindow,
  CheckCircle2,
  RotateCcw,
  MousePointer,
  FolderOpen,
  Globe,
  SquareTerminal,
  Settings,
  FileText,
  Folder,
  File,
  ImageIcon,
  Search,
  Wifi,
  Bluetooth,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Battery,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Power,
  User,
  Pin,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Unlock,
  Home,
  Download,
  HardDrive,
  Monitor,
  Palette,
  Info,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Maximize,
  CornerDownLeft,
  Gamepad2,
  Upload,
  Sparkles,
  Zap,
  AlignCenter,
  AlignLeft,
  Layers,
  Keyboard,
  Store,
  PenTool,
  Grid3x3,
  GitBranch,
  Star,
  Rocket,
  LayoutGrid,
  Check,
  Activity,
  Calendar,
  Music,
  Clock,
  Sliders,
  Cpu,
  ListTodo,
  Radio,
  Eye,
  EyeOff,
  Apple,
  Layout,
  Smartphone,
  Play,
  Pause,
  Shield,
  Compass,
  Flame,
  Terminal,
  Gauge,
  SlidersHorizontal,
  ExternalLink,
  MessageSquare,
  Send,
  HelpCircle,
  Hash,
  Binary,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  Mic2,
  Volume1,
  ShieldCheck,
  Server,
  ListMusic,
  Disc,
};

export type IconName = keyof typeof map;

export function Icon({
  name,
  className,
  size = 16,
  onClick,
  fluent = true,
  strokeWidth = 1.65,
  forceIconStyle,
  forceMaterialId,
}: {
  name: string;
  className?: string;
  size?: number;
  onClick?: () => void;
  fluent?: boolean;
  strokeWidth?: number;
  forceIconStyle?: GlasispectIconStyle;
  forceMaterialId?: GlasispectMaterialId;
}) {
  const [betaState, setBetaState] = useState(() => {
    const cfg = loadGlassium6BetaConfig();
    return { iconStyle: cfg.iconStyle, activeMaterial: cfg.activeMaterial };
  });

  useEffect(() => {
    if (forceIconStyle) return;
    const onUpdate = () => {
      const cfg = loadGlassium6BetaConfig();
      setBetaState({ iconStyle: cfg.iconStyle, activeMaterial: cfg.activeMaterial });
    };
    window.addEventListener('glassium6-beta-config-changed', onUpdate);
    return () => window.removeEventListener('glassium6-beta-config-changed', onUpdate);
  }, [forceIconStyle]);

  const effectiveStyle: GlasispectIconStyle = forceIconStyle ?? betaState.iconStyle;
  const effectiveMaterialId: GlasispectMaterialId = forceMaterialId ?? betaState.activeMaterial;
  const fluentType = fluent ? resolveFluentIconType(name) : null;

  if (fluentType) {
    // 1. Conventional Style (従来 - 作り変えずそのまま)
    if (effectiveStyle === 'classic' || size < 18) {
      return <FluentAppIcon name={name} size={size} className={className} onClick={onClick} />;
    }

    // 2. Crystal Style (クリスタルスタイル - 多面体プリズム屈折・宝石ファセットカット)
    if (effectiveStyle === 'crystal') {
      const innerSize = Math.max(12, Math.round(size * 0.72));
      return (
        <span
          onClick={onClick}
          style={{
            width: size,
            height: size,
            borderRadius: Math.max(6, Math.round(size * 0.28)),
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.42) 0%, rgba(56,189,248,0.28) 34%, rgba(168,85,247,0.28) 68%, rgba(244,63,94,0.34) 100%)',
            boxShadow:
              'inset 0 1.5px 2px rgba(255,255,255,0.85), inset 0 -2px 4px rgba(14,165,233,0.45), 0 4px 12px rgba(56,189,248,0.32)',
            border: '1px solid rgba(255,255,255,0.68)',
          }}
          className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden ${className || ''}`}
        >
          {/* Faceted Crystal Polygon Cut Overlay */}
          <svg
            viewBox="0 0 48 48"
            className="pointer-events-none absolute inset-0 w-full h-full opacity-75"
          >
            <polygon points="24,2 44,14 44,34 24,46 4,34 4,14" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" />
            <polygon points="24,2 44,14 24,24 4,14" fill="rgba(255,255,255,0.28)" />
            <polygon points="4,14 24,24 24,46 4,34" fill="rgba(56,189,248,0.18)" />
            <polygon points="44,14 24,24 24,46 44,34" fill="rgba(232,121,249,0.20)" />
            <line x1="24" y1="2" x2="24" y2="46" stroke="rgba(255,255,255,0.45)" strokeWidth="0.9" />
            <line x1="4" y1="14" x2="44" y2="34" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
            <line x1="44" y1="14" x2="4" y2="34" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
          </svg>
          <span className="relative z-10 flex items-center justify-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] brightness-110 saturate-125">
            <FluentAppIcon name={name} size={innerSize} />
          </span>
        </span>
      );
    }

    // 3. Material Style (マテリアルスタイル - Glasispect UI 2: Material 素材別テクスチャ＆光学質感)
    const mat = GLASISPECT_MATERIALS[effectiveMaterialId] || GLASISPECT_MATERIALS.sapphire;
    const [r1, g1, b1] = mat.rgb;
    const [r2, g2, b2] = mat.secondaryRgb;
    const innerSize = Math.max(12, Math.round(size * 0.72));

    const materialOverlayBg = (() => {
      switch (mat.surfacePattern) {
        case 'brushed-metal':
          return `repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0px, rgba(15,23,42,0.28) 2px, rgba(${r2},${g2},${b2},0.25) 4px), linear-gradient(145deg, rgba(${r2},${g2},${b2},0.85), rgba(${r1},${g1},${b1},0.95))`;
        case 'leather-grain':
          return `radial-gradient(circle at 30% 25%, rgba(${r2},${g2},${b2},0.65) 0%, rgba(${r1},${g1},${b1},0.96) 85%)`;
        case 'water-ripples':
          return `repeating-radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35) 0px, rgba(${r2},${g2},${b2},0.25) 5px, rgba(${r1},${g1},${b1},0.85) 10px)`;
        case 'ice-frost':
          return `linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(${r2},${g2},${b2},0.65) 45%, rgba(${r1},${g1},${b1},0.9) 100%)`;
        case 'leaf-veins':
          return `repeating-linear-gradient(45deg, rgba(${r2},${g2},${b2},0.35) 0px, rgba(${r1},${g1},${b1},0.9) 6px)`;
        case 'wood-grain':
          return `repeating-linear-gradient(14deg, rgba(${r1},${g1},${b1},0.95) 0px, rgba(${r2},${g2},${b2},0.55) 4px, rgba(69,26,3,0.95) 9px)`;
        default:
          return `linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(${r2},${g2},${b2},0.65) 40%, rgba(${r1},${g1},${b1},0.92) 100%)`;
      }
    })();

    return (
      <span
        onClick={onClick}
        style={{
          width: size,
          height: size,
          borderRadius: Math.max(6, Math.round(size * 0.26)),
          background: materialOverlayBg,
          boxShadow: `inset 0 1.5px 2px rgba(255,255,255,0.65), inset 0 -2px 4px rgba(0,0,0,0.45), 0 4px 12px rgba(${r1},${g1},${b1},0.42)`,
          border: `1.2px solid rgba(${r2},${g2},${b2},0.75)`,
        }}
        className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden ${className || ''}`}
      >
        <span
          className="pointer-events-none absolute -top-1/3 -left-1/3 w-2/3 h-2/3 rounded-full blur-[3px]"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.65) 0%, transparent 70%)' }}
        />
        <span className="relative z-10 flex items-center justify-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
          <FluentAppIcon name={name} size={innerSize} />
        </span>
      </span>
    );
  }

  const C = (map as Record<string, typeof FolderOpen>)[name] ?? File;
  return <C className={className} size={size} strokeWidth={strokeWidth} onClick={onClick} />;
}
