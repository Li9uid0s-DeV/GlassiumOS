import { Wallpaper } from './OSContext';

export const WALLPAPERS: Record<
  Wallpaper,
  { label: string; style: string; preview: string; isBright?: boolean }
> = {
  bing: {
    label: 'Bing 日替わり自然壁紙 (Bing Daily Nature)',
    style: 'linear-gradient(135deg, #0a192f 0%, #1b4965 55%, #0f2027 100%)',
    preview:
      'url("https://www.bing.com/th?id=OHR.BlueHK_JA-JP0477081186_1920x1080.jpg") center/cover no-repeat, linear-gradient(135deg, #0a192f 0%, #1b4965 55%, #0f2027 100%)',
    isBright: false,
  },
  'dynamic-world': {
    label: 'Dynamic World u3 (時間・風・天候・季節・イベント連動)',
    style: 'linear-gradient(135deg, #020617 0%, #0f172a 45%, #0369a1 100%)',
    preview: 'linear-gradient(135deg, #020617 0%, #0ea5e9 48%, #f59e0b 100%)',
    isBright: false,
  },
  'golden-sparkle': {
    label: 'Golden Sparkle',
    style: 'linear-gradient(135deg, #04050a 0%, #151008 42%, #3b2609 75%, #784c12 100%)',
    preview: 'linear-gradient(135deg, #070913 0%, #271a07 40%, #b47818 78%, #fde68a 100%)',
    isBright: false,
  },
  live2d: {
    label: 'Aurora Silk 4.7',
    style: 'linear-gradient(135deg, #050816 0%, #09132c 45%, #071b2f 100%)',
    preview: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 50%, #06b6d4 100%)',
    isBright: false,
  },
  aurora: {
    label: 'Aurora Slate',
    style: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
    preview: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    isBright: false,
  },
  bloom: {
    label: 'Daylight Bloom',
    style: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #fce7f3 100%)',
    preview: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #fce7f3 100%)',
    isBright: true,
  },
  sunset: {
    label: 'Pastel Sky',
    style: 'linear-gradient(135deg, #ffe4e6 0%, #e0f2fe 55%, #f0f9ff 100%)',
    preview: 'linear-gradient(135deg, #fda4af 0%, #bae6fd 100%)',
    isBright: true,
  },
  ocean: {
    label: 'Crystal Aqua (Light)',
    style: 'linear-gradient(135deg, #cffafe 0%, #e0f2fe 50%, #f8fafc 100%)',
    preview: 'linear-gradient(135deg, #67e8f9 0%, #bae6fd 100%)',
    isBright: true,
  },
  forest: {
    label: 'Emerald Forest',
    style: 'linear-gradient(135deg, #0f292f 0%, #134e5e 50%, #2c7744 100%)',
    preview: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    isBright: false,
  },
  cosmic: {
    label: 'Midnight Indigo',
    style: 'linear-gradient(135deg, #090d16 0%, #16213e 50%, #0f3460 100%)',
    preview: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
    isBright: false,
  },
  space: {
    label: 'Deep Space 3D',
    style: 'linear-gradient(135deg, #030014 0%, #0a0420 40%, #0d0530 100%)',
    preview: 'linear-gradient(135deg, #030014 0%, #3b0764 100%)',
    isBright: false,
  },
  shader: {
    label: 'Liquid Silk',
    style: 'linear-gradient(135deg, #0a0a2e 0%, #16213e 100%)',
    preview: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
    isBright: false,
  },
};

export function WallpaperOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="float-orb absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.45), transparent 70%)' }}
      />
      <div
        className="float-orb absolute top-1/3 -right-24 h-[32rem] w-[32rem] rounded-full opacity-35 blur-3xl"
        style={{ animationDelay: '4s', background: 'radial-gradient(circle, rgba(236,72,153,0.4), transparent 70%)' }}
      />
      <div
        className="float-orb absolute -bottom-40 left-1/4 h-[30rem] w-[30rem] rounded-full opacity-35 blur-3xl"
        style={{ animationDelay: '8s', background: 'radial-gradient(circle, rgba(59,130,246,0.4), transparent 70%)' }}
      />
    </div>
  );
}
