import React, { useEffect, useRef } from 'react';
import { useOS, AuroraColor } from './OSContext';

interface Live2DWallpaperProps {
  auroraColor?: AuroraColor;
  isBright?: boolean;
  lite?: boolean;
  lowPerformance?: boolean;
}

const PALETTES: Record<AuroraColor, { bg: [string, string, string]; waves: string[]; particles: string }> = {
  // PS5-Inspired Volumetric Golden Light & Glittering Dust Motes
  'golden-sparkle': {
    bg: ['#03040a', '#120d06', '#2b1c07'],
    waves: [
      'rgba(251, 191, 36, 0.42)',
      'rgba(245, 158, 11, 0.34)',
      'rgba(253, 230, 138, 0.28)',
      'rgba(217, 119, 6, 0.22)',
    ],
    particles: 'rgba(254, 243, 199, 0.95)',
  },
  // Restored 2-Versions-Ago Default Live2D Wallpaper (5 Signature Colors — GlassiumOS 4.7 Aurora Shape)
  'amethyst-cyan-silk': {
    bg: ['#030712', '#0f172a', '#2e1065'],
    waves: ['rgba(56, 189, 248, 0.42)', 'rgba(168, 85, 247, 0.38)', 'rgba(236, 72, 153, 0.28)'],
    particles: 'rgba(186, 230, 253, 0.88)',
  },
  'abyssal-deep-ocean': {
    bg: ['#010916', '#062845', '#0c4a6e'],
    waves: ['rgba(14, 165, 233, 0.42)', 'rgba(6, 182, 212, 0.36)', 'rgba(37, 99, 235, 0.30)'],
    particles: 'rgba(125, 211, 252, 0.88)',
  },
  'polar-emerald-aurora': {
    bg: ['#011f18', '#064e3b', '#0f172a'],
    waves: ['rgba(16, 185, 129, 0.42)', 'rgba(52, 211, 153, 0.36)', 'rgba(56, 189, 248, 0.30)'],
    particles: 'rgba(167, 243, 208, 0.88)',
  },
  'neon-cyber-dusk': {
    bg: ['#090418', '#2e0854', '#4a044e'],
    waves: ['rgba(217, 70, 239, 0.42)', 'rgba(6, 182, 212, 0.36)', 'rgba(244, 63, 94, 0.30)'],
    particles: 'rgba(245, 208, 254, 0.90)',
  },
  'crimson-rose-nebula': {
    bg: ['#1a0612', '#3b0a24', '#27121b'],
    waves: ['rgba(244, 63, 94, 0.42)', 'rgba(251, 113, 133, 0.36)', 'rgba(251, 146, 60, 0.28)'],
    particles: 'rgba(254, 205, 211, 0.88)',
  },
  'cyan-violet': {
    bg: ['#020617', '#0f172a', '#1e1b4b'],
    waves: ['rgba(56, 189, 248, 0.36)', 'rgba(139, 92, 246, 0.32)', 'rgba(236, 72, 153, 0.24)'],
    particles: 'rgba(186, 230, 253, 0.78)',
  },
  'emerald-sky': {
    bg: ['#022c22', '#064e3b', '#0f172a'],
    waves: ['rgba(16, 185, 129, 0.36)', 'rgba(56, 189, 248, 0.30)', 'rgba(52, 211, 153, 0.24)'],
    particles: 'rgba(167, 243, 208, 0.78)',
  },
  'rose-gold': {
    bg: ['#1f1224', '#3b152a', '#27171c'],
    waves: ['rgba(244, 63, 94, 0.34)', 'rgba(251, 146, 60, 0.30)', 'rgba(232, 121, 249, 0.24)'],
    particles: 'rgba(254, 205, 211, 0.78)',
  },
  'ocean-blue': {
    bg: ['#020b18', '#082f49', '#0c4a6e'],
    waves: ['rgba(14, 165, 233, 0.36)', 'rgba(37, 99, 235, 0.30)', 'rgba(6, 182, 212, 0.26)'],
    particles: 'rgba(125, 211, 252, 0.78)',
  },
  'sunset-magenta': {
    bg: ['#180628', '#3b0764', '#4a044e'],
    waves: ['rgba(217, 70, 239, 0.36)', 'rgba(244, 63, 94, 0.30)', 'rgba(245, 158, 11, 0.24)'],
    particles: 'rgba(245, 208, 254, 0.78)',
  },
  'solar-gold': {
    bg: ['#1a1005', '#422006', '#2e1065'],
    waves: ['rgba(250, 204, 21, 0.34)', 'rgba(249, 115, 22, 0.28)', 'rgba(168, 85, 247, 0.22)'],
    particles: 'rgba(254, 240, 138, 0.80)',
  },
  'arctic-ice': {
    bg: ['#081426', '#0f2942', '#164e63'],
    waves: ['rgba(103, 232, 249, 0.36)', 'rgba(165, 243, 252, 0.30)', 'rgba(56, 189, 248, 0.25)'],
    particles: 'rgba(224, 242, 254, 0.85)',
  },
  'sakura-silk': {
    bg: ['#1a0b16', '#331028', '#4a153b'],
    waves: ['rgba(244, 114, 182, 0.36)', 'rgba(251, 113, 133, 0.30)', 'rgba(192, 132, 252, 0.25)'],
    particles: 'rgba(251, 207, 232, 0.88)',
  },
  'cyber-grid': {
    bg: ['#030712', '#090d16', '#1e1b4b'],
    waves: ['rgba(6, 182, 212, 0.34)', 'rgba(99, 102, 241, 0.32)', 'rgba(16, 185, 129, 0.24)'],
    particles: 'rgba(34, 211, 238, 0.82)',
  },
  'starlight-pulse': {
    bg: ['#02040a', '#0a0f24', '#17153b'],
    waves: ['rgba(99, 102, 241, 0.32)', 'rgba(56, 189, 248, 0.28)', 'rgba(168, 85, 247, 0.25)'],
    particles: 'rgba(224, 231, 255, 0.90)',
  },
  // Restored Previous-Version 2D Live Wallpapers
  'classic-aurora-orbs': {
    bg: ['#030712', '#0c1328', '#17153b'],
    waves: ['rgba(56, 189, 248, 0.40)', 'rgba(168, 85, 247, 0.36)', 'rgba(236, 72, 153, 0.30)'],
    particles: 'rgba(224, 242, 254, 0.90)',
  },
  'classic-synthwave-sun': {
    bg: ['#090014', '#2e0854', '#1a032b'],
    waves: ['rgba(244, 63, 94, 0.36)', 'rgba(217, 70, 239, 0.32)', 'rgba(6, 182, 212, 0.30)'],
    particles: 'rgba(251, 113, 133, 0.85)',
  },
  'classic-deep-ocean': {
    bg: ['#010a14', '#04263b', '#073b54'],
    waves: ['rgba(6, 182, 212, 0.36)', 'rgba(14, 165, 233, 0.32)', 'rgba(45, 212, 191, 0.28)'],
    particles: 'rgba(165, 243, 252, 0.85)',
  },
  'classic-matrix-rain': {
    bg: ['#010804', '#02170c', '#032012'],
    waves: ['rgba(16, 185, 129, 0.35)', 'rgba(52, 211, 153, 0.28)', 'rgba(6, 182, 212, 0.22)'],
    particles: 'rgba(110, 231, 183, 0.90)',
  },
  'classic-galaxy-vortex': {
    bg: ['#020208', '#09091f', '#191038'],
    waves: ['rgba(139, 92, 246, 0.34)', 'rgba(56, 189, 248, 0.30)', 'rgba(236, 72, 153, 0.28)'],
    particles: 'rgba(224, 231, 255, 0.90)',
  },
  'classic-crystal-net': {
    bg: ['#030816', '#0b1833', '#152447'],
    waves: ['rgba(56, 189, 248, 0.36)', 'rgba(99, 102, 241, 0.32)', 'rgba(45, 212, 191, 0.28)'],
    particles: 'rgba(186, 230, 253, 0.90)',
  },
  'classic-fireflies-forest': {
    bg: ['#02100d', '#06261f', '#0a362b'],
    waves: ['rgba(52, 211, 153, 0.34)', 'rgba(250, 204, 21, 0.30)', 'rgba(16, 185, 129, 0.26)'],
    particles: 'rgba(253, 224, 71, 0.92)',
  },
  'classic-plasma-nebula': {
    bg: ['#060314', '#160933', '#240b42'],
    waves: ['rgba(217, 70, 239, 0.40)', 'rgba(56, 189, 248, 0.38)', 'rgba(99, 102, 241, 0.36)'],
    particles: 'rgba(245, 208, 254, 0.85)',
  },
};

export const Live2DWallpaper: React.FC<Live2DWallpaperProps> = ({
  auroraColor: propAuroraColor,
  lite = false,
  lowPerformance = false,
}) => {
  const {
    auroraColor: ctxAuroraColor,
    auroraSpeed,
    auroraIntensity,
    auroraParticles,
    liteMode,
  } = useOS();

  const activeColor = propAuroraColor ?? ctxAuroraColor ?? 'amethyst-cyan-silk';
  const isLite = lite || lowPerformance || liteMode;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetMouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handlePointerOrMouseMove = (e: MouseEvent | PointerEvent) => {
      targetMouseRef.current.x = e.clientX / Math.max(1, width);
      targetMouseRef.current.y = e.clientY / Math.max(1, height);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handlePointerOrMouseMove, { passive: true });
    window.addEventListener('pointermove', handlePointerOrMouseMove, { passive: true });

    const palette = PALETTES[activeColor] || PALETTES['amethyst-cyan-silk'];
    const particleCount = !auroraParticles
      ? 0
      : isLite
      ? 24
      : activeColor === 'golden-sparkle'
      ? 110
      : activeColor === 'starlight-pulse' || activeColor === 'classic-crystal-net'
      ? 60
      : activeColor === 'classic-galaxy-vortex'
      ? 160
      : 48;

    const particles = Array.from({ length: particleCount }, (_, idx) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r:
        activeColor === 'golden-sparkle'
          ? idx % 7 === 0
            ? Math.random() * 14 + 8 // Out-of-focus PS5 golden bokeh circles
            : Math.random() * 2.8 + 0.9 // Crisp diamond sparkles & golden dust
          : Math.random() * 2.6 + 0.9,
      vx:
        activeColor === 'golden-sparkle'
          ? Math.random() * 0.65 + 0.18
          : (Math.random() - 0.5) * 0.45,
      vy:
        activeColor === 'golden-sparkle'
          ? -Math.random() * 0.55 - 0.12
          : activeColor === 'sakura-silk'
          ? Math.random() * 0.42 + 0.15
          : activeColor === 'classic-deep-ocean'
          ? -Math.random() * 0.55 - 0.2
          : -Math.random() * 0.34 - 0.08,
      alpha: Math.random() * 0.7 + 0.25,
      phase: Math.random() * Math.PI * 2,
      isDiamond: idx % 3 === 0,
      isBokeh: activeColor === 'golden-sparkle' && idx % 7 === 0,
      orbitDist: (idx / Math.max(1, particleCount)) * Math.min(width, height) * 0.46 + 14,
      orbitAngle: idx * 0.28,
    }));

    // Bokeh Orbs for GlassiumOS 4.7 Aurora & Plasma Nebula
    const bokehOrbs = Array.from({ length: 6 }, (_, i) => ({
      x: (width * (i + 1)) / 7,
      y: height * (0.28 + (i % 3) * 0.2),
      r: Math.min(width, height) * (0.26 + (i % 3) * 0.08),
      vx: (i % 2 === 0 ? 1 : -1) * (0.35 + i * 0.06),
      vy: (i % 2 === 0 ? -1 : 1) * (0.25 + i * 0.05),
      color: palette.waves[i % palette.waves.length],
    }));

    // Meteors / Shooting stars for classic-aurora-orbs
    const meteors = Array.from({ length: 3 }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.4,
      len: 95 + i * 25,
      speed: 6.5 + i * 1.8,
      active: i === 0,
      cooldown: i * 110,
    }));

    // Matrix digital rain columns for classic-matrix-rain
    const matrixCols = Math.max(12, Math.floor(width / 22));
    const matrixDrops = Array.from({ length: matrixCols }, () => Math.random() * -60);
    const matrixGlyphs = '0123456789ABCDEFGLASSIUMΣΩΨλπΔ';

    let t = 0;
    const speedFactor = Math.max(0.2, Math.min(3, auroraSpeed || 1));
    const intensityAlpha = Math.max(0.25, Math.min(1.2, (auroraIntensity || 78) / 80));

    // Helper to draw 4-point PS5 diamond sparkle star
    const drawDiamondStar = (cx: number, cy: number, radius: number, rot: number, color: string) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = color;
      ctx.beginPath();
      const inner = radius * 0.22;
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const nextAngle = angle + Math.PI / 4;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.lineTo(Math.cos(nextAngle) * inner, Math.sin(nextAngle) * inner);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      t += (isLite ? 0.0045 : 0.0085) * speedFactor;

      // Smoothly interpolate mouse position (GlassiumOS 4.7 fluid mouse tracking)
      smoothMouseRef.current.x += (targetMouseRef.current.x - smoothMouseRef.current.x) * 0.075;
      smoothMouseRef.current.y += (targetMouseRef.current.y - smoothMouseRef.current.y) * 0.075;
      const mx = smoothMouseRef.current.x;
      const my = smoothMouseRef.current.y;
      const dx = mx - 0.5;
      const dy = my - 0.5;

      // =========================================================================
      // PS5-INSPIRED SCENE: "Golden Sparkle" (Volumetric Gold Waves & Bokeh Dust)
      // =========================================================================
      if (activeColor === 'golden-sparkle') {
        // 1. Deep Obsidian-to-Champagne-Amber Base Canvas
        const bgGrad = ctx.createLinearGradient(0, height, width, 0);
        bgGrad.addColorStop(0, '#020308');
        bgGrad.addColorStop(0.38, '#0b0907');
        bgGrad.addColorStop(0.72, '#1f1506');
        bgGrad.addColorStop(1, '#362207');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // 2. Volumetric Golden God-Ray Caustic Ribbons (PS5 Home Screen Sweep)
        for (let b = 0; b < 4; b++) {
          ctx.beginPath();
          const startY = height * (0.88 - b * 0.12) + dy * height * (0.16 + b * 0.04);
          const endY = height * (0.12 + b * 0.09) - dy * height * 0.14;
          const ribbonThickness = height * (0.22 - b * 0.03);

          ctx.moveTo(-40, startY);
          const steps = 40;
          for (let s = 0; s <= steps; s++) {
            const u = s / steps;
            const px = u * (width + 80) - 40;
            // Sweeping PS5 S-curve diagonal trajectory + mouse wave modulation
            const archY =
              startY * (1 - u) +
              endY * u +
              Math.sin(u * Math.PI * 1.65 - t * (1.1 + b * 0.25) + dx * 3.2 + b) * (68 + b * 18) +
              Math.cos(u * Math.PI * 2.8 + t * 0.7 - dy * 2.4) * 28;
            ctx.lineTo(px, archY);
          }

          for (let s = steps; s >= 0; s--) {
            const u = s / steps;
            const px = u * (width + 80) - 40;
            const archY =
              startY * (1 - u) +
              endY * u +
              ribbonThickness * (0.55 + 0.45 * Math.sin(u * Math.PI)) +
              Math.sin(u * Math.PI * 1.65 - t * (0.95 + b * 0.2) + dx * 2.6 + b + 0.6) * (76 + b * 14);
            ctx.lineTo(px, archY);
          }
          ctx.closePath();

          const beamGrad = ctx.createLinearGradient(0, height * 0.85, width, height * 0.1);
          beamGrad.addColorStop(0, 'rgba(180, 83, 9, 0.04)');
          beamGrad.addColorStop(0.35, palette.waves[b % palette.waves.length]);
          beamGrad.addColorStop(0.7, 'rgba(253, 230, 138, 0.34)');
          beamGrad.addColorStop(1, 'rgba(254, 243, 199, 0.06)');
          ctx.fillStyle = beamGrad;
          ctx.fill();
        }

        // 3. Interactive Golden Core Halo following cursor & upper-right PS5 flare
        const flareX = width * (0.68 + dx * 0.22);
        const flareY = height * (0.28 + dy * 0.22);
        const flareGrad = ctx.createRadialGradient(
          flareX,
          flareY,
          8,
          flareX,
          flareY,
          Math.max(width, height) * 0.55
        );
        flareGrad.addColorStop(0, 'rgba(254, 243, 199, 0.44)');
        flareGrad.addColorStop(0.28, 'rgba(251, 191, 36, 0.24)');
        flareGrad.addColorStop(0.65, 'rgba(180, 83, 9, 0.08)');
        flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = flareGrad;
        ctx.fillRect(0, 0, width, height);

        // 4. PS5 Golden Bokeh Circles, Rising Gold Dust & 4-Point Diamond Sparkles
        for (const p of particles) {
          p.x += p.vx * speedFactor + dx * 0.85;
          p.y += p.vy * speedFactor + dy * 0.55 + Math.sin(t * 1.8 + p.phase) * 0.22;
          if (p.x > width + 30) p.x = -30;
          if (p.x < -30) p.x = width + 30;
          if (p.y < -30) p.y = height + 30;
          if (p.y > height + 30) p.y = -30;

          const twinkle = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 3.4 + p.phase), 1.8);
          ctx.globalAlpha = p.alpha * twinkle * intensityAlpha;

          if (p.isBokeh) {
            // Soft out-of-focus PS5 golden bokeh disc with subtle specular ring
            const bkGrad = ctx.createRadialGradient(p.x, p.y, p.r * 0.1, p.x, p.y, p.r);
            bkGrad.addColorStop(0, 'rgba(253, 224, 71, 0.16)');
            bkGrad.addColorStop(0.75, 'rgba(251, 191, 36, 0.24)');
            bkGrad.addColorStop(0.92, 'rgba(254, 240, 138, 0.35)');
            bkGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = bkGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.isDiamond) {
            // Crisp glittering 4-point diamond star sparkle
            drawDiamondStar(
              p.x,
              p.y,
              p.r * 2.9,
              t * 0.8 + p.phase,
              twinkle > 0.75 ? '#ffffff' : '#fef08a'
            );
          } else {
            // Shimmering gold dust mote
            const dustGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2);
            dustGrad.addColorStop(0, '#fffbeb');
            dustGrad.addColorStop(0.45, '#fbbf24');
            dustGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
            ctx.fillStyle = dustGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        animationFrameId = window.requestAnimationFrame(render);
        return;
      }

      // =========================================================================
      // RESTORED CLASSIC SCENE 1: Cyber Matrix Digital Rain
      // =========================================================================
      if (activeColor === 'classic-matrix-rain') {
        ctx.fillStyle = 'rgba(1, 10, 6, 0.16)';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.font = 'bold 14px monospace';
        for (let i = 0; i < matrixDrops.length; i++) {
          const char = matrixGlyphs[Math.floor(Math.abs(Math.sin(t * 8 + i)) * matrixGlyphs.length) % matrixGlyphs.length];
          const x = i * 22;
          const y = matrixDrops[i] * 18;

          ctx.fillStyle = i % 5 === 0 ? '#67e8f9' : '#10b981';
          ctx.globalAlpha = intensityAlpha * 0.9;
          ctx.fillText(char, x, y);

          if (y > height && Math.random() > 0.975) {
            matrixDrops[i] = 0;
          }
          matrixDrops[i] += 0.42 * speedFactor;
        }
        ctx.restore();
        animationFrameId = window.requestAnimationFrame(render);
        return;
      }

      // Base sky gradient for all other modes
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, palette.bg[0]);
      bgGrad.addColorStop(0.5, palette.bg[1]);
      bgGrad.addColorStop(1, palette.bg[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // =========================================================================
      // RESTORED CLASSIC SCENE 2: Classic Retrowave Sunset Sun & Neon Grid
      // =========================================================================
      if (activeColor === 'classic-synthwave-sun') {
        ctx.save();
        const horizonY = height * 0.6;
        const sunX = width * (0.5 + dx * 0.1);
        const sunY = horizonY - height * 0.06 + dy * 24;
        const sunR = Math.min(width, height) * 0.2;

        const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
        sunGrad.addColorStop(0, '#fde047');
        sunGrad.addColorStop(0.5, '#f97316');
        sunGrad.addColorStop(1, '#ec4899');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = palette.bg[1];
        for (let s = 0; s < 6; s++) {
          const sliceY = sunY + s * (sunR * 0.16);
          const sliceH = 2 + s * 1.6;
          ctx.fillRect(sunX - sunR - 4, sliceY, sunR * 2 + 8, sliceH);
        }

        ctx.fillStyle = '#090014';
        ctx.fillRect(0, horizonY, width, height - horizonY);

        ctx.strokeStyle = 'rgba(236, 72, 153, 0.45)';
        ctx.lineWidth = 1.3;
        for (let i = -14; i <= 14; i++) {
          ctx.beginPath();
          ctx.moveTo(sunX + i * 22, horizonY);
          ctx.lineTo(sunX + i * 180, height);
          ctx.stroke();
        }

        const gridOffset = (t * 50) % 26;
        for (let y = horizonY; y < height; y += 26) {
          const drawY = y + gridOffset * ((y - horizonY) / (height - horizonY));
          if (drawY < height) {
            ctx.beginPath();
            ctx.moveTo(0, drawY);
            ctx.lineTo(width, drawY);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // =========================================================================
      // RESTORED CLASSIC SCENE 3: Spiral Galaxy Vortex
      // =========================================================================
      if (activeColor === 'classic-galaxy-vortex') {
        ctx.save();
        const cx = width * (0.5 + dx * 0.14);
        const cy = height * (0.5 + dy * 0.14);

        const coreGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.min(width, height) * 0.38);
        coreGrad.addColorStop(0, 'rgba(224, 231, 255, 0.55)');
        coreGrad.addColorStop(0.35, 'rgba(139, 92, 246, 0.28)');
        coreGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.12)');
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, 0, width, height);

        ctx.translate(cx, cy);
        for (const p of particles) {
          const angle = p.orbitAngle + t * (1.1 - p.orbitDist / Math.max(width, height));
          const sx = Math.cos(angle) * p.orbitDist * 1.35;
          const sy = Math.sin(angle) * p.orbitDist * 0.68;
          ctx.fillStyle =
            p.orbitAngle % 2 > 1
              ? 'rgba(56, 189, 248, 0.85)'
              : p.orbitAngle % 3 > 1.5
              ? 'rgba(236, 72, 153, 0.8)'
              : 'rgba(196, 181, 253, 0.85)';
          ctx.beginPath();
          ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        animationFrameId = window.requestAnimationFrame(render);
        return;
      }

      // =========================================================================
      // RESTORED CLASSIC SCENE 4: Bioluminescent Deep Ocean & Sunlight Caustics
      // =========================================================================
      if (activeColor === 'classic-deep-ocean') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let r = 0; r < 6; r++) {
          const rayX = width * (0.15 + r * 0.14) + Math.sin(t * 0.7 + r) * 45 + dx * 60;
          const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + 90, height * 0.85);
          rayGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
          rayGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
          ctx.fillStyle = rayGrad;
          ctx.beginPath();
          ctx.moveTo(rayX - 35, 0);
          ctx.lineTo(rayX + 35, 0);
          ctx.lineTo(rayX + 140, height * 0.85);
          ctx.lineTo(rayX - 70, height * 0.85);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // =========================================================================
      // GLASSIUMOS 4.7 SIGNATURE AURORA SHAPE & MOUSE-REACTIVE SILK CURTAINS
      // =========================================================================
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = intensityAlpha;

      // 1. Mouse-Reactive Floating Bokeh Orbs (GlassiumOS 4.7 Depth Orbs)
      bokehOrbs.forEach((orb, idx) => {
        orb.x += orb.vx * speedFactor + Math.sin(t + idx) * 0.4;
        orb.y += orb.vy * speedFactor + Math.cos(t * 0.8 + idx) * 0.35;
        if (orb.x < -orb.r * 0.5) orb.x = width + orb.r * 0.5;
        if (orb.x > width + orb.r * 0.5) orb.x = -orb.r * 0.5;
        if (orb.y < -orb.r * 0.5) orb.y = height + orb.r * 0.5;
        if (orb.y > height + orb.r * 0.5) orb.y = -orb.r * 0.5;

        const parallaxX = orb.x + dx * (65 + idx * 18);
        const parallaxY = orb.y + dy * (55 + idx * 14);

        const g = ctx.createRadialGradient(parallaxX, parallaxY, 0, parallaxX, parallaxY, orb.r);
        g.addColorStop(0, orb.color);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(parallaxX, parallaxY, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. GlassiumOS 4.7 S-Curve Aurora Ribbons with Mouse-Driven Wave Crest & Tilt
      palette.waves.forEach((waveColor, idx) => {
        ctx.beginPath();
        const step = 32;
        const ribbonSpread = height * (0.24 + idx * 0.055);
        const mouseTilt = dx * height * (0.22 - idx * 0.04);
        const mouseLift = dy * height * (0.24 + idx * 0.05);
        const mousePhase = dx * 2.8;

        // Top edge of the sweeping 4.7 S-curve aurora curtain
        for (let x = -step; x <= width + step; x += step) {
          const u = x / Math.max(1, width);
          // GlassiumOS 4.7 iconic sweeping S-arch from upper-left to mid-right
          const sCurveBase =
            height * (0.28 + idx * 0.11) +
            Math.sin((u - 0.15) * Math.PI * 1.35) * (height * 0.14) +
            (u - 0.5) * mouseTilt +
            mouseLift;

          // Influence stronger near cursor X position
          const cursorDistX = Math.abs(u - mx);
          const cursorPull = Math.exp(-cursorDistX * cursorDistX * 8) * (dy * 115);

          const waveY =
            sCurveBase +
            cursorPull +
            Math.sin(x * 0.0026 + t * (1.35 + idx * 0.32) + idx * 1.2 + mousePhase) * (64 + idx * 16) +
            Math.cos(x * 0.0014 - t * (0.9 + idx * 0.22) - mousePhase * 0.6) * 38;

          if (x === -step) {
            ctx.moveTo(x, waveY);
          } else {
            ctx.lineTo(x, waveY);
          }
        }

        // Bottom veil of the aurora curtain (creates floating 4.7 aurora band rather than flat bottom fill)
        for (let x = width + step; x >= -step; x -= step) {
          const u = x / Math.max(1, width);
          const sCurveBase =
            height * (0.28 + idx * 0.11) +
            ribbonSpread +
            Math.sin((u - 0.15) * Math.PI * 1.35) * (height * 0.14) +
            (u - 0.5) * mouseTilt +
            mouseLift;

          const cursorDistX = Math.abs(u - mx);
          const cursorPull = Math.exp(-cursorDistX * cursorDistX * 8) * (dy * 85);

          const lowerY =
            sCurveBase +
            cursorPull +
            Math.sin(x * 0.0021 + t * (1.1 + idx * 0.25) + idx + 0.8 + mousePhase * 0.8) * (52 + idx * 14) +
            Math.cos(x * 0.0018 + t * 0.7) * 28;

          ctx.lineTo(x, lowerY);
        }
        ctx.closePath();

        const bandTop = height * (0.14 + idx * 0.1) + mouseLift;
        const bandBottom = bandTop + ribbonSpread + 150;
        const waveGrad = ctx.createLinearGradient(
          width * (0.2 + dx * 0.2),
          bandTop,
          width * (0.8 - dx * 0.2),
          bandBottom
        );
        waveGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
        waveGrad.addColorStop(0.28, waveColor);
        waveGrad.addColorStop(0.68, palette.waves[(idx + 1) % palette.waves.length]);
        waveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = waveGrad;
        ctx.fill();
      });

      // 3. Interactive Cursor Aurora Halo (Follows Mouse Smoothly)
      const cursorOrbX = width * mx;
      const cursorOrbY = height * my;
      const cursorGrad = ctx.createRadialGradient(
        cursorOrbX,
        cursorOrbY,
        8,
        cursorOrbX,
        cursorOrbY,
        Math.max(width, height) * 0.36
      );
      cursorGrad.addColorStop(0, palette.waves[0]);
      cursorGrad.addColorStop(0.45, palette.waves[1] || palette.waves[0]);
      cursorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cursorGrad;
      ctx.fillRect(0, 0, width, height);

      // Shooting stars / meteors for classic-aurora-orbs
      if (activeColor === 'classic-aurora-orbs' && !isLite) {
        meteors.forEach((m) => {
          if (!m.active) {
            m.cooldown -= 1;
            if (m.cooldown <= 0) {
              m.active = true;
              m.x = Math.random() * width * 0.8 + width * 0.1;
              m.y = Math.random() * height * 0.25;
            }
          } else {
            m.x -= m.speed * speedFactor;
            m.y += m.speed * 0.55 * speedFactor;
            const tailGrad = ctx.createLinearGradient(m.x, m.y, m.x + m.len, m.y - m.len * 0.55);
            tailGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            tailGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.5)');
            tailGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
            ctx.strokeStyle = tailGrad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x + m.len, m.y - m.len * 0.55);
            ctx.stroke();

            if (m.x < -150 || m.y > height + 150) {
              m.active = false;
              m.cooldown = Math.random() * 140 + 60;
            }
          }
        });
      }
      ctx.restore();

      // Perspective horizon grid for cyber-grid
      if (activeColor === 'cyber-grid') {
        ctx.save();
        const horizonY = height * 0.62;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.18)';
        ctx.lineWidth = 1;

        const vpX = width * (0.5 + dx * 0.12);
        for (let i = -12; i <= 12; i++) {
          ctx.beginPath();
          ctx.moveTo(vpX + i * 24, horizonY);
          ctx.lineTo(vpX + i * 160, height);
          ctx.stroke();
        }

        const offset = (t * 45) % 28;
        for (let y = horizonY; y < height; y += 28) {
          const drawY = y + offset * ((y - horizonY) / (height - horizonY));
          if (drawY < height) {
            ctx.beginPath();
            ctx.moveTo(0, drawY);
            ctx.lineTo(width, drawY);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Constellation / Crystal neural network lines for starlight-pulse & classic-crystal-net
      if (
        (activeColor === 'starlight-pulse' || activeColor === 'classic-crystal-net') &&
        !isLite &&
        particles.length > 0
      ) {
        ctx.save();
        ctx.strokeStyle =
          activeColor === 'classic-crystal-net'
            ? 'rgba(56, 189, 248, 0.24)'
            : 'rgba(165, 180, 252, 0.15)';
        ctx.lineWidth = activeColor === 'classic-crystal-net' ? 1.1 : 0.8;
        const maxDist = activeColor === 'classic-crystal-net' ? 155 : 130;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const pdx = particles[i].x - particles[j].x;
            const pdy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (dist < maxDist) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // Floating luminous particles / sakura petals / ocean bubbles / forest fireflies
      if (particles.length > 0) {
        ctx.fillStyle = palette.particles;
        for (const p of particles) {
          p.x +=
            p.vx +
            dx * 0.45 +
            (activeColor === 'sakura-silk' || activeColor === 'classic-fireflies-forest'
              ? Math.sin(t * 2 + p.phase) * 0.35
              : 0);
          p.y += p.vy * speedFactor + dy * 0.3;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          const twinkle = 0.5 + 0.5 * Math.sin(t * 3 + p.phase);
          ctx.globalAlpha = p.alpha * twinkle * intensityAlpha;
          ctx.beginPath();
          if (activeColor === 'sakura-silk') {
            ctx.ellipse(p.x, p.y, p.r * 1.6, p.r * 0.9, t + p.phase, 0, Math.PI * 2);
            ctx.fill();
          } else if (activeColor === 'classic-deep-ocean') {
            ctx.strokeStyle = palette.particles;
            ctx.lineWidth = 1.2;
            ctx.arc(p.x, p.y, p.r * 1.7, 0, Math.PI * 2);
            ctx.stroke();
          } else if (activeColor === 'classic-fireflies-forest') {
            const ffGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4.2);
            ffGrad.addColorStop(0, 'rgba(253, 224, 71, 0.95)');
            ffGrad.addColorStop(0.4, 'rgba(52, 211, 153, 0.45)');
            ffGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = ffGrad;
            ctx.arc(p.x, p.y, p.r * 4.2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerOrMouseMove);
      window.removeEventListener('pointermove', handlePointerOrMouseMove);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [activeColor, auroraSpeed, auroraIntensity, auroraParticles, isLite]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover"
    />
  );
};
export default Live2DWallpaper;
