import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  variant?: 'squircle' | 'raw' | 'glass';
  glow?: boolean;
}

/**
 * GlassiumOS-V4.0 Official Brand Emblem: Abstracted Flat 2D Gradient Mark
 * Deconstructed, asymmetric geometric ribbon flow inspired by Microsoft 365 / Copilot
 * that subtly hints at a "G" vortex without being a literal letterform. Pure flat 2D.
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
      className="shrink-0 transition-transform duration-300"
    >
      <defs>
        {/* Ribbon 1 (Top-Left Diagonal Sweep): Pink -> Magenta -> Amethyst */}
        <linearGradient id={`g-abs-1-${uid}`} x1="188" y1="28" x2="32" y2="164" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="45%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        {/* Ribbon 2 (Bottom Asymmetric Arc): Amethyst -> Indigo -> Royal Blue */}
        <linearGradient id={`g-abs-2-${uid}`} x1="48" y1="168" x2="224" y2="184" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>

        {/* Ribbon 3 (Floating Diagonal Inner Wing): Cobalt -> Cyan -> Bright Aqua */}
        <linearGradient id={`g-abs-3-${uid}`} x1="108" y1="148" x2="228" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="55%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>

      {/* Part 1: Deconstructed Upper-Left Sweeping Blade (Tilted & Tapered) */}
      <path
        d="M178 36C132 20 76 38 46 82C24 114 24 154 42 184C48 194 62 194 68 184C73 176 72 166 68 156C58 134 62 106 80 86C102 62 138 56 166 68C178 73 192 66 194 54C196 44 188 39 178 36Z"
        fill={`url(#g-abs-1-${uid})`}
      />

      {/* Part 2: Detached Lower-Right Flowing Ribbon with Negative-Space Gap */}
      <path
        d="M78 206C114 232 168 228 202 194C222 174 232 146 228 118C226 106 214 100 204 106L182 119C187 138 182 158 168 172C146 194 112 196 88 178C78 170 64 174 62 186C60 194 68 200 78 206Z"
        fill={`url(#g-abs-2-${uid})`}
      />

      {/* Part 3: Stylized Floating Diagonal Wing (Replaces literal horizontal G bar) */}
      <path
        d="M112 142C104 132 108 116 120 110L192 74C206 67 222 74 226 88C230 100 222 114 210 120L138 156C128 161 118 150 112 142Z"
        fill={`url(#g-abs-3-${uid})`}
      />
    </svg>
  );

  if (variant === 'squircle') {
    return (
      <div
        className={`rounded-2xl bg-slate-900/70 p-1.5 flex items-center justify-center ${className}`}
        style={{ width: size * 1.3, height: size * 1.3 }}
      >
        {svgContent}
      </div>
    );
  }

  if (variant === 'glass') {
    return (
      <div
        className={`rounded-xl bg-slate-900/50 p-1 flex items-center justify-center ${className}`}
        style={{ width: size * 1.25, height: size * 1.25 }}
      >
        {svgContent}
      </div>
    );
  }

  return <div className={`inline-flex items-center justify-center ${className}`}>{svgContent}</div>;
}
