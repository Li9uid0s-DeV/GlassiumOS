import React, { useEffect, useRef } from 'react';
import { useOS, AuroraColor } from './OSContext';

interface Live2DWallpaperProps {
  auroraColor?: AuroraColor;
  isBright?: boolean;
  lite?: boolean;
  lowPerformance?: boolean;
}

const PALETTES: Record<AuroraColor, { bg: [string, string, string]; waves: string[]; particles: string }> = {
  'cyan-violet': {
    bg: ['#020617', '#0f172a', '#1e1b4b'],
    waves: ['rgba(56, 189, 248, 0.30)', 'rgba(139, 92, 246, 0.26)', 'rgba(236, 72, 153, 0.18)'],
    particles: 'rgba(186, 230, 253, 0.70)',
  },
  'emerald-sky': {
    bg: ['#022c22', '#064e3b', '#0f172a'],
    waves: ['rgba(16, 185, 129, 0.30)', 'rgba(56, 189, 248, 0.25)', 'rgba(52, 211, 153, 0.20)'],
    particles: 'rgba(167, 243, 208, 0.70)',
  },
  'rose-gold': {
    bg: ['#1f1224', '#3b152a', '#27171c'],
    waves: ['rgba(244, 63, 94, 0.28)', 'rgba(251, 146, 60, 0.25)', 'rgba(232, 121, 249, 0.22)'],
    particles: 'rgba(254, 205, 211, 0.70)',
  },
  'ocean-blue': {
    bg: ['#020b18', '#082f49', '#0c4a6e'],
    waves: ['rgba(14, 165, 233, 0.32)', 'rgba(37, 99, 235, 0.26)', 'rgba(6, 182, 212, 0.22)'],
    particles: 'rgba(125, 211, 252, 0.70)',
  },
  'sunset-magenta': {
    bg: ['#180628', '#3b0764', '#4a044e'],
    waves: ['rgba(217, 70, 239, 0.30)', 'rgba(244, 63, 94, 0.25)', 'rgba(245, 158, 11, 0.20)'],
    particles: 'rgba(245, 208, 254, 0.70)',
  },
  'solar-gold': {
    bg: ['#1a1005', '#422006', '#2e1065'],
    waves: ['rgba(250, 204, 21, 0.28)', 'rgba(249, 115, 22, 0.25)', 'rgba(168, 85, 247, 0.20)'],
    particles: 'rgba(254, 240, 138, 0.75)',
  },
  'arctic-ice': {
    bg: ['#081426', '#0f2942', '#164e63'],
    waves: ['rgba(103, 232, 249, 0.32)', 'rgba(165, 243, 252, 0.25)', 'rgba(56, 189, 248, 0.22)'],
    particles: 'rgba(224, 242, 254, 0.80)',
  },
  'sakura-silk': {
    bg: ['#1a0b16', '#331028', '#4a153b'],
    waves: ['rgba(244, 114, 182, 0.32)', 'rgba(251, 113, 133, 0.26)', 'rgba(192, 132, 252, 0.22)'],
    particles: 'rgba(251, 207, 232, 0.85)',
  },
  'cyber-grid': {
    bg: ['#030712', '#090d16', '#1e1b4b'],
    waves: ['rgba(6, 182, 212, 0.28)', 'rgba(99, 102, 241, 0.28)', 'rgba(16, 185, 129, 0.20)'],
    particles: 'rgba(34, 211, 238, 0.80)',
  },
  'starlight-pulse': {
    bg: ['#02040a', '#0a0f24', '#17153b'],
    waves: ['rgba(99, 102, 241, 0.26)', 'rgba(56, 189, 248, 0.24)', 'rgba(168, 85, 247, 0.22)'],
    particles: 'rgba(224, 231, 255, 0.88)',
  },
  // Restored Previous-Version 2D Live Wallpapers
  'classic-aurora-orbs': {
    bg: ['#030712', '#0c1328', '#17153b'],
    waves: ['rgba(56, 189, 248, 0.36)', 'rgba(168, 85, 247, 0.32)', 'rgba(236, 72, 153, 0.26)'],
    particles: 'rgba(224, 242, 254, 0.90)',
  },
  'classic-synthwave-sun': {
    bg: ['#090014', '#2e0854', '#1a032b'],
    waves: ['rgba(244, 63, 94, 0.36)', 'rgba(217, 70, 239, 0.32)', 'rgba(6, 182, 212, 0.30)'],
    particles: 'rgba(251, 113, 133, 0.85)',
  },
  'classic-deep-ocean': {
    bg: ['#010a14', '#04263b', '#073b54'],
    waves: ['rgba(6, 182, 212, 0.34)', 'rgba(14, 165, 233, 0.30)', 'rgba(45, 212, 191, 0.28)'],
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
    waves: ['rgba(56, 189, 248, 0.34)', 'rgba(99, 102, 241, 0.30)', 'rgba(45, 212, 191, 0.25)'],
    particles: 'rgba(186, 230, 253, 0.90)',
  },
  'classic-fireflies-forest': {
    bg: ['#02100d', '#06261f', '#0a362b'],
    waves: ['rgba(52, 211, 153, 0.30)', 'rgba(250, 204, 21, 0.28)', 'rgba(16, 185, 129, 0.24)'],
    particles: 'rgba(253, 224, 71, 0.92)',
  },
  'classic-plasma-nebula': {
    bg: ['#060314', '#160933', '#240b42'],
    waves: ['rgba(217, 70, 239, 0.38)', 'rgba(56, 189, 248, 0.36)', 'rgba(99, 102, 241, 0.34)'],
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

  const activeColor = propAuroraColor ?? ctxAuroraColor ?? 'cyan-violet';
  const isLite = lite || lowPerformance || liteMode;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

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

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX / Math.max(1, width);
      mouseRef.current.y = e.clientY / Math.max(1, height);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const palette = PALETTES[activeColor] || PALETTES['cyan-violet'];
    const particleCount = !auroraParticles
      ? 0
      : isLite
      ? 18
      : activeColor === 'starlight-pulse' || activeColor === 'classic-crystal-net'
      ? 56
      : activeColor === 'classic-galaxy-vortex'
      ? 160
      : 42;

    const particles = Array.from({ length: particleCount }, (_, idx) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.6 + 0.9,
      vx: (Math.random() - 0.5) * 0.42,
      vy:
        activeColor === 'sakura-silk'
          ? Math.random() * 0.42 + 0.15
          : activeColor === 'classic-deep-ocean'
          ? -Math.random() * 0.55 - 0.2
          : -Math.random() * 0.34 - 0.08,
      alpha: Math.random() * 0.65 + 0.25,
      phase: Math.random() * Math.PI * 2,
      orbitDist: (idx / Math.max(1, particleCount)) * Math.min(width, height) * 0.46 + 14,
      orbitAngle: idx * 0.28,
    }));

    // Bokeh Orbs for classic-aurora-orbs & classic-plasma-nebula
    const bokehOrbs = Array.from({ length: 6 }, (_, i) => ({
      x: (width * (i + 1)) / 7,
      y: height * (0.3 + (i % 3) * 0.2),
      r: Math.min(width, height) * (0.24 + (i % 3) * 0.07),
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

    const render = () => {
      t += (isLite ? 0.004 : 0.008) * speedFactor;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

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
        const sunX = width * (0.5 + (mx - 0.5) * 0.06);
        const sunY = horizonY - height * 0.06;
        const sunR = Math.min(width, height) * 0.2;

        // Glowing segmented retro sun
        const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
        sunGrad.addColorStop(0, '#fde047');
        sunGrad.addColorStop(0.5, '#f97316');
        sunGrad.addColorStop(1, '#ec4899');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
        ctx.fill();

        // Horizontal retro scanline cutouts across the lower half of the sun
        ctx.fillStyle = palette.bg[1];
        for (let s = 0; s < 6; s++) {
          const sliceY = sunY + s * (sunR * 0.16);
          const sliceH = 2 + s * 1.6;
          ctx.fillRect(sunX - sunR - 4, sliceY, sunR * 2 + 8, sliceH);
        }

        // Ground plane & perspective synthwave grid
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
        const cx = width * (0.5 + (mx - 0.5) * 0.08);
        const cy = height * (0.5 + (my - 0.5) * 0.08);

        // Galactic core glow
        const coreGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.min(width, height) * 0.38);
        coreGrad.addColorStop(0, 'rgba(224, 231, 255, 0.55)');
        coreGrad.addColorStop(0.35, 'rgba(139, 92, 246, 0.28)');
        coreGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.12)');
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, 0, width, height);

        // Spiral arms
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
          const rayX = width * (0.15 + r * 0.14) + Math.sin(t * 0.7 + r) * 45;
          const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + 90, height * 0.85);
          rayGrad.addColorStop(0, 'rgba(56, 189, 248, 0.20)');
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
      // RESTORED CLASSIC SCENE 5: Classic Aurora Bokeh Orbs & Shooting Stars
      // & RESTORED CLASSIC SCENE 6: Liquid Plasma Orbs
      // =========================================================================
      if (activeColor === 'classic-aurora-orbs' || activeColor === 'classic-plasma-nebula') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        bokehOrbs.forEach((orb, idx) => {
          orb.x += orb.vx * speedFactor + Math.sin(t + idx) * 0.4;
          orb.y += orb.vy * speedFactor + Math.cos(t * 0.8 + idx) * 0.35;
          if (orb.x < -orb.r * 0.5) orb.x = width + orb.r * 0.5;
          if (orb.x > width + orb.r * 0.5) orb.x = -orb.r * 0.5;
          if (orb.y < -orb.r * 0.5) orb.y = height + orb.r * 0.5;
          if (orb.y > height + orb.r * 0.5) orb.y = -orb.r * 0.5;

          const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
          g.addColorStop(0, orb.color);
          g.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
          ctx.fill();
        });

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
      }

      // Perspective horizon grid for cyber-grid
      if (activeColor === 'cyber-grid') {
        ctx.save();
        const horizonY = height * 0.62;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.18)';
        ctx.lineWidth = 1;

        const vpX = width * 0.5;
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

      // Flowing aurora silk ribbons
      ctx.save();
      ctx.globalAlpha = intensityAlpha;
      palette.waves.forEach((waveColor, idx) => {
        ctx.beginPath();
        const baseHeight = height * (0.36 + idx * 0.15);
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseHeight);

        const step = 48;
        for (let x = 0; x <= width + step; x += step) {
          const yOffset =
            Math.sin(x * 0.0022 + t * (1.2 + idx * 0.35) + idx) * (58 + idx * 18) +
            Math.cos(x * 0.0011 - t * (0.8 + idx * 0.2)) * 34;
          ctx.lineTo(x, baseHeight + yOffset);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, baseHeight - 90, 0, height);
        waveGrad.addColorStop(0, waveColor);
        waveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = waveGrad;
        ctx.fill();
      });

      // Ambient glow orb
      const orbX = width * (0.5 + Math.sin(t * 0.5) * 0.25);
      const orbY = height * (0.35 + Math.cos(t * 0.4) * 0.15);
      const orbGrad = ctx.createRadialGradient(orbX, orbY, 10, orbX, orbY, Math.max(width, height) * 0.42);
      orbGrad.addColorStop(0, palette.waves[0]);
      orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = orbGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

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
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
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
            (activeColor === 'sakura-silk' || activeColor === 'classic-fireflies-forest'
              ? Math.sin(t * 2 + p.phase) * 0.35
              : 0);
          p.y += p.vy * speedFactor;
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
      window.removeEventListener('mousemove', handleMouseMove);
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
