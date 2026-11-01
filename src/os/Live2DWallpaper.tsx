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
    window.addEventListener('resize', handleResize);

    const palette = PALETTES[activeColor] || PALETTES['cyan-violet'];
    const particleCount = !auroraParticles
      ? 0
      : isLite
      ? 16
      : activeColor === 'starlight-pulse'
      ? 52
      : 38;

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.4 + 0.9,
      vx: (Math.random() - 0.5) * 0.35,
      vy: activeColor === 'sakura-silk' ? Math.random() * 0.4 + 0.15 : -Math.random() * 0.32 - 0.08,
      alpha: Math.random() * 0.65 + 0.25,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const speedFactor = Math.max(0.2, Math.min(3, auroraSpeed || 1));
    const intensityAlpha = Math.max(0.25, Math.min(1.2, (auroraIntensity || 78) / 80));

    const render = () => {
      t += (isLite ? 0.004 : 0.008) * speedFactor;

      // Base sky gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, palette.bg[0]);
      bgGrad.addColorStop(0.5, palette.bg[1]);
      bgGrad.addColorStop(1, palette.bg[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

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

      // Constellation lines for starlight-pulse
      if (activeColor === 'starlight-pulse' && !isLite && particles.length > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(165, 180, 252, 0.15)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 130) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // Floating luminous particles / sakura petals
      if (particles.length > 0) {
        ctx.fillStyle = palette.particles;
        for (const p of particles) {
          p.x += p.vx + (activeColor === 'sakura-silk' ? Math.sin(t + p.phase) * 0.25 : 0);
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
          } else {
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
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
