import React from 'react';

export interface DefaultAvatarOption {
  id: string;
  name: string;
  sub: string;
  svg: React.ReactNode;
}

export const DEFAULT_VECTOR_AVATARS: DefaultAvatarOption[] = [
  {
    id: 'avatar-liquid-crystal',
    name: 'Liquid Crystal',
    sub: '流体クリスタル',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        <defs>
          <linearGradient id="av-lc-g1" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="av-lc-g2" x1="100" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#av-lc-g1)" />
        <polygon points="50,16 80,38 80,68 50,86 20,68 20,38" fill="rgba(15,23,42,0.65)" stroke="#67e8f9" strokeWidth="2" />
        <polygon points="50,16 65,50 50,86 35,50" fill="url(#av-lc-g2)" />
        <line x1="20" y1="38" x2="80" y2="68" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <line x1="20" y1="68" x2="80" y2="38" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'avatar-fluid-orb',
    name: 'Fluid Orb',
    sub: '光学リキッドオーブ',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        <defs>
          <radialGradient id="av-fo-r1" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="40%" stopColor="#0284c7" />
            <stop offset="85%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#av-fo-r1)" />
        <ellipse cx="38" cy="32" rx="20" ry="12" fill="white" fillOpacity="0.55" transform="rotate(-25 38 32)" />
        <circle cx="50" cy="50" r="44" stroke="rgba(125,211,252,0.6)" strokeWidth="2" strokeDasharray="6 4" />
        <ellipse cx="64" cy="66" rx="14" ry="7" fill="white" fillOpacity="0.25" transform="rotate(20 64 66)" />
      </svg>
    ),
  },
  {
    id: 'avatar-cyber-visor',
    name: 'Cyber Visor',
    sub: 'サイバーバイザー',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        <defs>
          <linearGradient id="av-cv-g1" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="av-cv-visor" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#av-cv-g1)" stroke="rgba(168,85,247,0.5)" strokeWidth="2" />
        <path d="M26,34 L74,34 Q82,34 82,42 L82,56 Q82,64 74,64 L26,64 Q18,64 18,56 L18,42 Q18,34 26,34 Z" fill="url(#av-cv-visor)" />
        <line x1="22" y1="49" x2="78" y2="49" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <rect x="30" y="44" width="8" height="3" rx="1" fill="#ffffff" />
        <rect x="42" y="44" width="8" height="3" rx="1" fill="#ffffff" />
        <rect x="54" y="44" width="8" height="3" rx="1" fill="#ffffff" />
        <rect x="66" y="44" width="8" height="3" rx="1" fill="#ffffff" />
      </svg>
    ),
  },
  {
    id: 'avatar-cosmic-nebula',
    name: 'Cosmic Nebula',
    sub: '深宇宙ネビュラ',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        <defs>
          <radialGradient id="av-cn-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="70%" stopColor="#09090b" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#av-cn-bg)" />
        <ellipse cx="50" cy="50" rx="36" ry="12" stroke="#e879f9" strokeWidth="2.5" transform="rotate(-30 50 50)" opacity="0.85" />
        <ellipse cx="50" cy="50" rx="36" ry="12" stroke="#38bdf8" strokeWidth="2.5" transform="rotate(30 50 50)" opacity="0.85" />
        <circle cx="50" cy="50" r="14" fill="#fbbf24" opacity="0.9" filter="drop-shadow(0 0 8px #fbbf24)" />
        <circle cx="50" cy="50" r="6" fill="#ffffff" />
      </svg>
    ),
  },
  {
    id: 'avatar-minimal-user',
    name: 'Minimal Silhouette',
    sub: 'グラスシルエット',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        <defs>
          <linearGradient id="av-mu-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#av-mu-bg)" stroke="#34d399" strokeWidth="1.5" />
        {/* Head */}
        <circle cx="50" cy="38" r="15" fill="#a7f3d0" />
        {/* Body */}
        <path d="M26,76 C26,58 36,54 50,54 C64,54 74,58 74,76 Z" fill="#6ee7b7" />
        <circle cx="50" cy="38" r="18" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'avatar-sound-wave',
    name: 'Sound Wave',
    sub: 'オーディオスペクトラム',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        <defs>
          <linearGradient id="av-sw-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#be185d" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#av-sw-bg)" stroke="#f472b6" strokeWidth="1.5" />
        {/* Bars */}
        <rect x="22" y="42" width="6" height="16" rx="3" fill="#fbcfe8" />
        <rect x="33" y="32" width="6" height="36" rx="3" fill="#f472b6" />
        <rect x="44" y="22" width="6" height="56" rx="3" fill="#ffffff" />
        <rect x="55" y="30" width="6" height="40" rx="3" fill="#f472b6" />
        <rect x="66" y="40" width="6" height="20" rx="3" fill="#fbcfe8" />
      </svg>
    ),
  },
  {
    id: 'avatar-quantum-core',
    name: 'Quantum Core',
    sub: 'クォンタムコア',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        <defs>
          <radialGradient id="av-qc-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="80%" stopColor="#030712" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#av-qc-bg)" stroke="#22d3ee" strokeWidth="2" />
        <polygon points="50,22 74,36 74,64 50,78 26,64 26,36" stroke="#67e8f9" strokeWidth="2" fill="none" />
        <circle cx="50" cy="50" r="9" fill="#22d3ee" />
        <circle cx="50" cy="50" r="4" fill="#ffffff" />
      </svg>
    ),
  },
  {
    id: 'avatar-golden-crest',
    name: 'Golden Crest',
    sub: 'ゴールドクレスト',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        <defs>
          <linearGradient id="av-gc-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#1c1917" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#av-gc-bg)" stroke="#fbbf24" strokeWidth="2" />
        <path d="M50,20 L62,40 L84,44 L68,60 L72,82 L50,70 L28,82 L32,60 L16,44 L38,40 Z" fill="#fde047" stroke="#d97706" strokeWidth="2" />
        <circle cx="50" cy="50" r="8" fill="#ffffff" />
      </svg>
    ),
  },
];

export interface AvatarRendererProps {
  avatar?: string | null;
  size?: number | string;
  className?: string;
  alt?: string;
}

export const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  avatar,
  size = 40,
  className = '',
  alt = 'User Avatar',
}) => {
  const sizeStyle = typeof size === 'number' ? { width: size, height: size } : { width: size, height: size };

  if (!avatar) {
    return (
      <div style={sizeStyle} className={`rounded-full overflow-hidden shrink-0 ${className}`}>
        {DEFAULT_VECTOR_AVATARS[0].svg}
      </div>
    );
  }

  // If user uploaded a custom image (base64 data URL or HTTP URL)
  if (avatar.startsWith('data:image/') || avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/')) {
    return (
      <img
        src={avatar}
        alt={alt}
        style={sizeStyle}
        className={`rounded-full object-cover shrink-0 border border-white/25 shadow-md ${className}`}
      />
    );
  }

  // Check if matching predefined vector avatar ID
  const matched = DEFAULT_VECTOR_AVATARS.find((v) => v.id === avatar);
  if (matched) {
    return (
      <div style={sizeStyle} className={`rounded-full overflow-hidden shrink-0 shadow-md ${className}`}>
        {matched.svg}
      </div>
    );
  }

  // Fallback for legacy emoji or single glyph
  return (
    <div
      style={sizeStyle}
      className={`rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-lg select-none shrink-0 shadow-md ${className}`}
    >
      {avatar}
    </div>
  );
};
