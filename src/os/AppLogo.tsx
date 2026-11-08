import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

/**
 * GlassiumOS 5 Official Emblem
 * Faceted crystal prism motif representing layered refractive glass planes.
 */
export const AppLogo: React.FC<AppLogoProps> = ({ className = '', size = 24, glow = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${glow ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.65)]' : ''}`}
    >
      <defs>
        <linearGradient id="glassium5-facet-top" x1="4" y1="2" x2="24" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="glassium5-facet-left" x1="3" y1="10" x2="14" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="glassium5-facet-right" x1="14" y1="10" x2="25" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="glassium5-core" x1="9" y1="8" x2="19" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* Top crystal crown */}
      <polygon points="14,2 25,9.5 14,14.5 3,9.5" fill="url(#glassium5-facet-top)" />
      {/* Left refractive wing */}
      <polygon points="3,9.5 14,14.5 14,26 4.5,19.5" fill="url(#glassium5-facet-left)" />
      {/* Right refractive wing */}
      <polygon points="25,9.5 23.5,19.5 14,26 14,14.5" fill="url(#glassium5-facet-right)" />
      {/* Inner luminous diamond core */}
      <polygon points="14,6.5 19.5,11.5 14,21.5 8.5,11.5" fill="url(#glassium5-core)" />
      {/* Clean geometric facet hairlines */}
      <line x1="14" y1="2" x2="14" y2="26" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.75" />
      <line x1="3" y1="9.5" x2="25" y2="9.5" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.75" />
    </svg>
  );
};
