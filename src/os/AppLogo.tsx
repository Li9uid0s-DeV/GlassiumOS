import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  variant?: 'squircle' | 'raw' | 'glass';
  glow?: boolean;
}

/**
 * GlassiumOS 5 Official Emblem
 * Clean geometric 5-plane prism mark with cyan-to-indigo gradient.
 */
export function AppLogo({ size = 32, className = '', variant = 'raw' }: AppLogoProps) {
  const uid = React.useId().replace(/:/g, '');

  const svgContent = (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200"
    >
      <defs>
        <linearGradient id={`gl5-top-${uid}`} x1="36" y1="36" x2="220" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id={`gl5-mid-${uid}`} x1="40" y1="128" x2="216" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id={`gl5-bot-${uid}`} x1="44" y1="196" x2="216" y2="224" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {/* Top horizontal prism bar of "5" / "G" */}
      <path
        d="M56 36H204C212.837 36 220 43.1634 220 52C220 60.8366 212.837 68 204 68H88V108H56V52C56 43.1634 63.1634 36 72 36H56Z"
        fill={`url(#gl5-top-${uid})`}
      />

      {/* Center geometric core plane */}
      <path
        d="M56 112H172C198.51 112 220 133.49 220 160C220 168.837 212.837 176 204 176C195.163 176 188 168.837 188 160C188 151.163 180.837 144 172 144H56V112Z"
        fill={`url(#gl5-mid-${uid})`}
      />

      {/* Bottom harmonic sweep */}
      <path
        d="M56 188H172C180.837 188 188 180.837 188 172H220C220 198.51 198.51 220 172 220H72C63.1634 220 56 212.837 56 204V188Z"
        fill={`url(#gl5-bot-${uid})`}
      />

      {/* Subtle accent node */}
      <circle cx="204" cy="106" r="14" fill="#38bdf8" />
    </svg>
  );

  if (variant === 'squircle') {
    return (
      <div
        className={`rounded-xl bg-slate-900/70 p-1.5 flex items-center justify-center ${className}`}
        style={{ width: size * 1.3, height: size * 1.3 }}
      >
        {svgContent}
      </div>
    );
  }

  if (variant === 'glass') {
    return (
      <div
        className={`rounded-lg bg-slate-900/50 p-1 flex items-center justify-center ${className}`}
        style={{ width: size * 1.25, height: size * 1.25 }}
      >
        {svgContent}
      </div>
    );
  }

  return <div className={`inline-flex items-center justify-center ${className}`}>{svgContent}</div>;
}
