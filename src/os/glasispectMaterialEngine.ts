import { AppId } from './types';

export type GlasispectMaterialId =
  | 'ruby'
  | 'sapphire'
  | 'emerald'
  | 'amethyst'
  | 'diamond'
  | 'amber-gem'
  | 'iron'
  | 'leather'
  | 'water'
  | 'ice'
  | 'leaf'
  | 'wood';

export type SurfacePatternType =
  | 'facets'
  | 'brushed-metal'
  | 'leather-grain'
  | 'water-ripples'
  | 'ice-frost'
  | 'leaf-veins'
  | 'wood-grain'
  | 'amber-glow';

export interface GlasispectMaterialPreset {
  id: GlasispectMaterialId;
  category: 'gemstone' | 'natural';
  nameJa: string;
  nameEn: string;
  subtitleJa: string;
  propertiesJa: string;
  soundDescriptionJa: string;
  colorHex: string;
  rgb: [number, number, number];
  secondaryRgb: [number, number, number];
  refractionIndex: number;
  roughness: number; // 0.05 (sharp crystal) -> 0.85 (matte diffuse)
  scatterLobes: number; // number of diffuse scatter lobes around cursor light
  specularIntensity: number; // 0.2 -> 1.0
  surfacePattern: SurfacePatternType;
}

export const GLASISPECT_MATERIALS: Record<GlasispectMaterialId, GlasispectMaterialPreset> = {
  ruby: {
    id: 'ruby',
    category: 'gemstone',
    nameJa: 'ルビー (紅玉)',
    nameEn: 'Crimson Ruby',
    subtitleJa: '高屈折コランダム結晶・深紅の多面体乱反射',
    propertiesJa: '屈折率 1.77 · 硬度 9.0 · 鋭い紅色の複屈折スパークルと高音クリスタル共鳴',
    soundDescriptionJa: 'クリック: 高音クリスタルベル / ドラッグ: 紅玉の澄んだガラス擦過音',
    colorHex: '#e11d48',
    rgb: [225, 29, 72],
    secondaryRgb: [251, 113, 133],
    refractionIndex: 1.77,
    roughness: 0.12,
    scatterLobes: 6,
    specularIntensity: 0.95,
    surfacePattern: 'facets',
  },
  sapphire: {
    id: 'sapphire',
    category: 'gemstone',
    nameJa: 'サファイア (蒼玉)',
    nameEn: 'Celestial Sapphire',
    subtitleJa: '深蒼コバルト結晶・澄み渡る光学乱反射',
    propertiesJa: '屈折率 1.77 · 硬度 9.0 · 深い青のプリズム散乱と純粋な倍音チャイム',
    soundDescriptionJa: 'クリック: 蒼玉の音叉チャイム / ドラッグ: 結晶面の倍音スライド',
    colorHex: '#2563eb',
    rgb: [37, 99, 235],
    secondaryRgb: [56, 189, 248],
    refractionIndex: 1.77,
    roughness: 0.14,
    scatterLobes: 6,
    specularIntensity: 0.92,
    surfacePattern: 'facets',
  },
  emerald: {
    id: 'emerald',
    category: 'gemstone',
    nameJa: 'エメラルド (翠玉)',
    nameEn: 'Verdant Emerald',
    subtitleJa: 'ベリル結晶・内部インクルージョンによる柔らかい緑光乱反射',
    propertiesJa: '屈折率 1.58 · 硬度 7.8 · 内部庭園(Jardin)構造で光が幾重にも拡散',
    soundDescriptionJa: 'クリック: 翠玉の温かみある結晶マリンバ音 / ドラッグ: 緑柱石の共鳴',
    colorHex: '#10b981',
    rgb: [16, 185, 129],
    secondaryRgb: [110, 231, 183],
    refractionIndex: 1.58,
    roughness: 0.24,
    scatterLobes: 8,
    specularIntensity: 0.84,
    surfacePattern: 'facets',
  },
  amethyst: {
    id: 'amethyst',
    category: 'gemstone',
    nameJa: 'アメジスト (紫水晶)',
    nameEn: 'Royal Amethyst',
    subtitleJa: '六方晶系クォーツ・神秘的な紫光の二色性乱反射',
    propertiesJa: '屈折率 1.54 · 硬度 7.0 · 紫と青紫に変化するピエゾ結晶の揺らぎ',
    soundDescriptionJa: 'クリック: クォーツシンギングボウル共鳴 / ドラッグ: 水晶の微細ハーモニクス',
    colorHex: '#9333ea',
    rgb: [147, 51, 234],
    secondaryRgb: [216, 180, 254],
    refractionIndex: 1.54,
    roughness: 0.18,
    scatterLobes: 7,
    specularIntensity: 0.88,
    surfacePattern: 'facets',
  },
  diamond: {
    id: 'diamond',
    category: 'gemstone',
    nameJa: 'ダイヤモンド (金剛石)',
    nameEn: 'Prismatic Diamond',
    subtitleJa: '最高屈折率 2.42・虹色のファイア分散と強烈なブリリアント乱反射',
    propertiesJa: '屈折率 2.42 · 硬度 10.0 · マウス光源から虹色スペクトルが全方位に乱反射',
    soundDescriptionJa: 'クリック: 超高域ブリリアント・ピン / ドラッグ: プリズムスパークル粒子音',
    colorHex: '#e2e8f0',
    rgb: [226, 232, 240],
    secondaryRgb: [56, 189, 248],
    refractionIndex: 2.42,
    roughness: 0.06,
    scatterLobes: 10,
    specularIntensity: 1.0,
    surfacePattern: 'facets',
  },
  'amber-gem': {
    id: 'amber-gem',
    category: 'gemstone',
    nameJa: 'アンバー (琥珀)',
    nameEn: ' Baltic Amber',
    subtitleJa: '太古の化石樹脂・黄金のサブサーフェス（内部散乱）乱反射',
    propertiesJa: '屈折率 1.54 · 硬度 2.5 · 柔らかく温かい黄金光が内部でとろけるように拡散',
    soundDescriptionJa: 'クリック: 琥珀の柔らかい樹脂タップ / ドラッグ: 静電気を帯びた滑らかな摩擦音',
    colorHex: '#f59e0b',
    rgb: [245, 158, 11],
    secondaryRgb: [253, 224, 71],
    refractionIndex: 1.54,
    roughness: 0.35,
    scatterLobes: 5,
    specularIntensity: 0.76,
    surfacePattern: 'amber-glow',
  },
  iron: {
    id: 'iron',
    category: 'natural',
    nameJa: '鉄・鍛造スチール (Iron)',
    nameEn: 'Forged Iron & Steel',
    subtitleJa: 'ヘアライン金属異方性反射・重厚なインダストリアル乱反射',
    propertiesJa: '金属異方性反射 · 高密度 · マウス光源に対して鋭い金属ハイライト帯が走る',
    soundDescriptionJa: 'クリック: 鍛造アイアンの金属クリック音 / ドラッグ: 鋼鉄の重厚なスライド共鳴',
    colorHex: '#64748b',
    rgb: [100, 116, 139],
    secondaryRgb: [203, 213, 225],
    refractionIndex: 2.5,
    roughness: 0.32,
    scatterLobes: 4,
    specularIntensity: 0.9,
    surfacePattern: 'brushed-metal',
  },
  leather: {
    id: 'leather',
    category: 'natural',
    nameJa: '革・サドルレザー (Leather)',
    nameEn: 'Artisan Leather',
    subtitleJa: 'シボ革の微細凹凸・しっとり落ち着いた広角ディフューズ乱反射',
    propertiesJa: '低グロス・広角拡散 · マウス光源を柔らかく受け止めるマットな天然皮革質感',
    soundDescriptionJa: 'クリック: 革の低く心地よいタップ音 / ドラッグ: レザー表面のリアルな撫で音',
    colorHex: '#92400e',
    rgb: [146, 64, 14],
    secondaryRgb: [217, 119, 6],
    refractionIndex: 1.4,
    roughness: 0.78,
    scatterLobes: 3,
    specularIntensity: 0.42,
    surfacePattern: 'leather-grain',
  },
  water: {
    id: 'water',
    category: 'natural',
    nameJa: '水・アクアリップル (Water)',
    nameEn: 'Liquid Water',
    subtitleJa: '水面コースティクス（集光模様）・マウス移動で波紋が広がる流体乱反射',
    propertiesJa: '屈折率 1.33 · 流体波紋 · マウスが動くたびに水面のゆらぎと光の輪が拡散',
    soundDescriptionJa: 'クリック: 澄んだ水滴ドロップ音 / ドラッグ: 水面をなぞるせせらぎリップル音',
    colorHex: '#0ea5e9',
    rgb: [14, 165, 233],
    secondaryRgb: [103, 232, 249],
    refractionIndex: 1.33,
    roughness: 0.15,
    scatterLobes: 7,
    specularIntensity: 0.88,
    surfacePattern: 'water-ripples',
  },
  ice: {
    id: 'ice',
    category: 'natural',
    nameJa: '氷・グレーシャルアイス (Ice)',
    nameEn: 'Glacial Ice',
    subtitleJa: '氷結晶クラックと霜の乱反射・冷徹に煌めくクリスタルフロスト',
    propertiesJa: '屈折率 1.31 · 氷結晶 · 内部の氷紋クラックに沿って冷たいシアン光が乱反射',
    soundDescriptionJa: 'クリック: 氷が弾けるクリスプ・クラック音 / ドラッグ: 氷上を滑るスケートエッジ音',
    colorHex: '#06b6d4',
    rgb: [6, 182, 212],
    secondaryRgb: [207, 250, 254],
    refractionIndex: 1.31,
    roughness: 0.22,
    scatterLobes: 8,
    specularIntensity: 0.94,
    surfacePattern: 'ice-frost',
  },
  leaf: {
    id: 'leaf',
    category: 'natural',
    nameJa: '葉っぱ・ボタニカル (Leaf)',
    nameEn: 'Botanical Leaf',
    subtitleJa: '葉脈を透過する木漏れ日・瑞々しいクロロフィル有機乱反射',
    propertiesJa: '有機透過散乱 · 葉脈テクスチャ · 光源が当たると若葉の葉脈が明るく透ける',
    soundDescriptionJa: 'クリック: 木の葉が触れ合う爽やかなリーフ音 / ドラッグ: そよ風の葉擦れサラサラ音',
    colorHex: '#22c55e',
    rgb: [34, 197, 94],
    secondaryRgb: [134, 239, 172],
    refractionIndex: 1.42,
    roughness: 0.58,
    scatterLobes: 5,
    specularIntensity: 0.58,
    surfacePattern: 'leaf-veins',
  },
  wood: {
    id: 'wood',
    category: 'natural',
    nameJa: '木・天然銘木 (Wood)',
    nameEn: 'Natural Timber',
    subtitleJa: '木目年輪のサテン反射・温もりある無垢材のディフューズ光沢',
    propertiesJa: 'サテン異方性拡散 · 木目構造 · 光源に応じて年輪の美しい絹目ツヤが浮かぶ',
    soundDescriptionJa: 'クリック: 木琴・ウッドブロックの乾いた温もり音 / ドラッグ: 木肌を滑る摩擦音',
    colorHex: '#b45309',
    rgb: [180, 83, 9],
    secondaryRgb: [251, 191, 36],
    refractionIndex: 1.46,
    roughness: 0.68,
    scatterLobes: 4,
    specularIntensity: 0.5,
    surfacePattern: 'wood-grain',
  },
};

export const GLASISPECT_MATERIAL_LIST: GlasispectMaterialPreset[] = Object.values(GLASISPECT_MATERIALS);

export type TaskbarVariant =
  | 'glassium5-default'
  | 'cloud-fog'
  | 'dock'
  | 'side-dock'
  | 'taskbar'
  | 'sidebar';

export type TaskbarSurfaceStyle = 'glass-ui' | 'glasispect-material';
export type GlasispectIconStyle = 'classic' | 'crystal' | 'material';

export interface Glassium6BetaConfig {
  betaEnabled: boolean; // false by default so GlassiumOS 5 remains default
  uiDesignStyle: TaskbarSurfaceStyle; // 'glass-ui' (従来) | 'glasispect-material' (Glasispect UI 2: Material)
  iconStyle: GlasispectIconStyle; // 'classic' (従来) | 'crystal' (クリスタルスタイル) | 'material' (マテリアルスタイル)
  activeMaterial: GlasispectMaterialId;
  materialSoundEnabled: boolean;
  diffuseLightIntensity: number; // 20 - 100
  taskbarVariant: TaskbarVariant;
  dockSurfaceStyle: TaskbarSurfaceStyle;
  autoHideMode: 'always' | 'mouse-bottom';
  sidePosition: 'left' | 'right';
  pinnedApps: AppId[]; // up to 9 apps
  showAIButton: boolean;
  showNewsButton: boolean;
  showSearchUI: boolean;
  cloudColor: string;
  cloudOpacity: number; // 20 - 95
  cloudGatherSpeed: number; // 0.3 - 2.5 seconds
}

const BETA_CONFIG_STORAGE_KEY = 'glassium_v6_future_beta_config_v1';

export const DEFAULT_GLASSIUM6_BETA_CONFIG: Glassium6BetaConfig = {
  betaEnabled: false,
  uiDesignStyle: 'glass-ui',
  iconStyle: 'classic',
  activeMaterial: 'sapphire',
  materialSoundEnabled: true,
  diffuseLightIntensity: 85,
  taskbarVariant: 'glassium5-default',
  dockSurfaceStyle: 'glasispect-material',
  autoHideMode: 'always',
  sidePosition: 'left',
  pinnedApps: [
    'browser',
    'entertainment',
    'synth',
    'notepad',
    'terminal',
    'explorer',
    'calculator',
    'weather',
    'settings',
  ],
  showAIButton: true,
  showNewsButton: true,
  showSearchUI: true,
  cloudColor: '#38bdf8',
  cloudOpacity: 78,
  cloudGatherSpeed: 0.85,
};

let cachedBetaConfig: Glassium6BetaConfig | null = null;

export function loadGlassium6BetaConfig(): Glassium6BetaConfig {
  if (cachedBetaConfig) return cachedBetaConfig;
  try {
    const raw = localStorage.getItem(BETA_CONFIG_STORAGE_KEY);
    if (!raw) {
      cachedBetaConfig = DEFAULT_GLASSIUM6_BETA_CONFIG;
      return cachedBetaConfig;
    }
    const parsed = JSON.parse(raw) as Partial<Glassium6BetaConfig>;
    const pinned = Array.isArray(parsed.pinnedApps)
      ? (parsed.pinnedApps.slice(0, 9) as AppId[])
      : DEFAULT_GLASSIUM6_BETA_CONFIG.pinnedApps;
    cachedBetaConfig = {
      ...DEFAULT_GLASSIUM6_BETA_CONFIG,
      ...parsed,
      iconStyle:
        parsed.iconStyle === 'crystal' || parsed.iconStyle === 'material'
          ? parsed.iconStyle
          : 'classic',
      pinnedApps: pinned.length > 0 ? pinned : DEFAULT_GLASSIUM6_BETA_CONFIG.pinnedApps,
    };
    return cachedBetaConfig;
  } catch {
    cachedBetaConfig = DEFAULT_GLASSIUM6_BETA_CONFIG;
    return cachedBetaConfig;
  }
}

export function saveGlassium6BetaConfig(next: Glassium6BetaConfig): void {
  const sanitized: Glassium6BetaConfig = {
    ...next,
    iconStyle:
      next.iconStyle === 'crystal' || next.iconStyle === 'material' ? next.iconStyle : 'classic',
    pinnedApps: (next.pinnedApps || []).slice(0, 9),
    cloudOpacity: Math.max(20, Math.min(95, Number(next.cloudOpacity) || 78)),
    cloudGatherSpeed: Math.max(0.25, Math.min(2.5, Number(next.cloudGatherSpeed) || 0.85)),
    diffuseLightIntensity: Math.max(20, Math.min(100, Number(next.diffuseLightIntensity) || 85)),
  };
  cachedBetaConfig = sanitized;
  try {
    localStorage.setItem(BETA_CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent('glassium6-beta-config-changed', { detail: sanitized }));
}

// ============================================================================
// PROCEDURAL MATERIAL ACOUSTIC SYNTHESIZER (WEB AUDIO API)
// Generates authentic material-dependent sound when clicking or dragging
// ============================================================================

class MaterialAcousticSynth {
  private ctx: AudioContext | null = null;
  private lastDragSoundAt = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playClick(materialId: GlasispectMaterialId, masterVol = 0.75) {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = Math.max(0.02, Math.min(1, masterVol)) * 0.14;
    const t = ctx.currentTime;

    try {
      switch (materialId) {
        case 'ruby':
        case 'sapphire':
        case 'diamond': {
          // High-refraction crystalline bell chime
          const baseFreq = materialId === 'diamond' ? 2480 : materialId === 'ruby' ? 1960 : 1680;
          const ratios = [1, 1.5, 2.42];
          ratios.forEach((r, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * r, t);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * r * 0.98, t + 0.18);
            gain.gain.setValueAtTime(vol / (i + 1), t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18 + i * 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.22 + i * 0.04);
          });
          break;
        }

        case 'emerald':
        case 'amethyst': {
          // Singing quartz / beryl harmonic resonance
          const baseFreq = materialId === 'emerald' ? 1180 : 980;
          [1, 1.333, 2.01].forEach((r, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = i === 1 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(baseFreq * r, t);
            gain.gain.setValueAtTime((vol * 0.85) / (i + 1), t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.25);
          });
          break;
        }

        case 'amber-gem': {
          // Warm organic resin tap
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(640, t);
          osc.frequency.exponentialRampToValueAtTime(290, t + 0.065);
          gain.gain.setValueAtTime(vol * 1.1, t);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.075);
          break;
        }

        case 'iron': {
          // Forged steel metallic clink (inharmonic FM-like partials)
          const freqs = [820, 1490, 2630, 3810];
          freqs.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = idx % 2 === 0 ? 'triangle' : 'square';
            osc.frequency.setValueAtTime(f, t);
            osc.frequency.exponentialRampToValueAtTime(f * 0.94, t + 0.09);
            gain.gain.setValueAtTime((vol * 0.6) / (idx + 1), t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.1);
          });
          break;
        }

        case 'leather': {
          // Soft damped saddle leather thud + subtle grain brush
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(165, t);
          osc.frequency.exponentialRampToValueAtTime(52, t + 0.055);
          gain.gain.setValueAtTime(vol * 1.35, t);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.065);
          break;
        }

        case 'water': {
          // Authentic water droplet plop (upward pitch bend sine)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(420, t);
          osc.frequency.exponentialRampToValueAtTime(1180, t + 0.085);
          gain.gain.setValueAtTime(vol * 1.1, t);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.1);
          break;
        }

        case 'ice': {
          // Crisp ice crack + high crystal ping
          const noise = ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(ctx, 0.045);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(3600, t);
          filter.Q.setValueAtTime(4.5, t);
          const nGain = ctx.createGain();
          nGain.gain.setValueAtTime(vol * 0.9, t);
          nGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(ctx.destination);
          noise.start(t);

          const osc = ctx.createOscillator();
          const oGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(2950, t);
          osc.frequency.exponentialRampToValueAtTime(2100, t + 0.08);
          oGain.gain.setValueAtTime(vol * 0.7, t);
          oGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
          osc.connect(oGain);
          oGain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.09);
          break;
        }

        case 'leaf': {
          // Crisp foliage rustle burst
          const noise = ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(ctx, 0.075);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2400, t);
          filter.frequency.exponentialRampToValueAtTime(1500, t + 0.07);
          filter.Q.setValueAtTime(2.2, t);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(vol * 0.95, t);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(t);
          break;
        }

        case 'wood': {
          // Hollow resonant mokugyo / rosewood xylophone tap
          const osc = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(480, t);
          osc.frequency.exponentialRampToValueAtTime(310, t + 0.055);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(960, t);
          osc2.frequency.exponentialRampToValueAtTime(620, t + 0.04);
          gain.gain.setValueAtTime(vol * 1.2, t);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
          osc.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc2.start(t);
          osc.stop(t + 0.07);
          osc2.stop(t + 0.07);
          break;
        }
      }
    } catch {
      // ignore audio context block
    }
  }

  playDrag(materialId: GlasispectMaterialId, speedPx = 12, masterVol = 0.75) {
    const nowMs = performance.now();
    if (nowMs - this.lastDragSoundAt < 55) return;
    this.lastDragSoundAt = nowMs;

    const ctx = this.getContext();
    if (!ctx) return;
    const speedFactor = Math.max(0.4, Math.min(2.0, speedPx / 18));
    const vol = Math.max(0.01, Math.min(1, masterVol)) * 0.055 * speedFactor;
    const t = ctx.currentTime;

    try {
      if (
        materialId === 'leaf' ||
        materialId === 'leather' ||
        materialId === 'wood' ||
        materialId === 'ice'
      ) {
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, 0.05);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        const baseCutoff =
          materialId === 'ice'
            ? 3200
            : materialId === 'leaf'
            ? 2100
            : materialId === 'wood'
            ? 900
            : 550;
        filter.frequency.setValueAtTime(baseCutoff * speedFactor, t);
        filter.Q.setValueAtTime(materialId === 'ice' ? 5.0 : 2.5, t);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.048);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);
      } else if (materialId === 'water') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const startF = 520 + Math.random() * 260;
        osc.frequency.setValueAtTime(startF, t);
        osc.frequency.exponentialRampToValueAtTime(startF * 1.45, t + 0.05);
        gain.gain.setValueAtTime(vol * 0.9, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.06);
      } else {
        // Gemstones & Iron: harmonic crystal / metallic shimmer grain
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = materialId === 'iron' ? 'triangle' : 'sine';
        const base =
          materialId === 'diamond'
            ? 2600
            : materialId === 'ruby'
            ? 1850
            : materialId === 'sapphire'
            ? 1580
            : materialId === 'iron'
            ? 1120
            : 1320;
        osc.frequency.setValueAtTime(base * (0.92 + Math.random() * 0.18) * speedFactor, t);
        gain.gain.setValueAtTime(vol * 0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      }
    } catch {
      // ignore
    }
  }
}

export const materialAcousticSynth = new MaterialAcousticSynth();

/**
 * Generates CSS background & diffuse reflection styles for any surface using Glasispect UI 2: Material
 * given the current cursor position (mouseX, mouseY) and material preset.
 */
export function buildGlasispectSurfaceStyle(
  material: GlasispectMaterialPreset,
  mouseX: number,
  mouseY: number,
  intensityPercent = 85,
  isLight = false
): {
  background: string;
  boxShadow: string;
  borderColor: string;
} {
  const [r1, g1, b1] = material.rgb;
  const [r2, g2, b2] = material.secondaryRgb;
  const k = (intensityPercent / 100) * material.specularIntensity;
  const spreadPx = Math.round(140 + material.roughness * 260);
  const secondaryX = Math.round(mouseX * 0.72 + 120);
  const secondaryY = Math.round(mouseY * 0.68 + 60);

  const patternLayer = (() => {
    switch (material.surfacePattern) {
      case 'facets':
        return `repeating-linear-gradient(135deg, rgba(${r2},${g2},${b2},${(0.09 * k).toFixed(3)}) 0px, rgba(${r1},${g1},${b1},0.02) 14px, rgba(255,255,255,${(0.11 * k).toFixed(3)}) 28px)`;
      case 'brushed-metal':
        return `repeating-linear-gradient(90deg, rgba(255,255,255,${(0.08 * k).toFixed(3)}) 0px, rgba(15,23,42,0.08) 2px, rgba(${r2},${g2},${b2},${(0.07 * k).toFixed(3)}) 5px)`;
      case 'leather-grain':
        return `radial-gradient(circle at 25% 35%, rgba(${r2},${g2},${b2},0.16) 0%, rgba(15,10,6,0.45) 100%)`;
      case 'water-ripples':
        return `repeating-radial-gradient(circle at ${mouseX}px ${mouseY}px, rgba(${r2},${g2},${b2},${(0.16 * k).toFixed(3)}) 0px, rgba(${r1},${g1},${b1},0.03) 18px, rgba(255,255,255,${(0.12 * k).toFixed(3)}) 36px)`;
      case 'ice-frost':
        return `repeating-linear-gradient(60deg, rgba(255,255,255,${(0.14 * k).toFixed(3)}) 0px, rgba(${r2},${g2},${b2},0.04) 9px, rgba(${r1},${g1},${b1},0.12) 18px)`;
      case 'leaf-veins':
        return `repeating-linear-gradient(45deg, rgba(${r2},${g2},${b2},${(0.11 * k).toFixed(3)}) 0px, rgba(${r1},${g1},${b1},0.04) 12px)`;
      case 'wood-grain':
        return `repeating-linear-gradient(12deg, rgba(${r1},${g1},${b1},0.22) 0px, rgba(${r2},${g2},${b2},0.09) 6px, rgba(28,15,6,0.26) 14px)`;
      case 'amber-glow':
      default:
        return `radial-gradient(circle at ${secondaryX}px ${secondaryY}px, rgba(${r2},${g2},${b2},${(0.24 * k).toFixed(3)}) 0%, transparent 70%)`;
    }
  })();

  const baseBg = isLight
    ? `rgba(${Math.round(r1 * 0.25 + 185)}, ${Math.round(g1 * 0.25 + 185)}, ${Math.round(b1 * 0.25 + 190)}, 0.84)`
    : `rgba(${Math.round(r1 * 0.28 + 10)}, ${Math.round(g1 * 0.28 + 14)}, ${Math.round(b1 * 0.28 + 24)}, 0.82)`;

  return {
    background: `
      radial-gradient(${spreadPx}px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,${(0.34 * k).toFixed(3)}) 0%, rgba(${r2},${g2},${b2},${(0.28 * k).toFixed(3)}) 32%, rgba(${r1},${g1},${b1},${(0.12 * k).toFixed(3)}) 64%, transparent 100%),
      radial-gradient(${Math.round(spreadPx * 0.8)}px circle at ${secondaryX}px ${secondaryY}px, rgba(${r2},${g2},${b2},${(0.22 * k).toFixed(3)}) 0%, transparent 75%),
      ${patternLayer},
      ${baseBg}
    `,
    boxShadow: `0 16px 48px rgba(0,0,0,0.48), inset 0 1px 1.5px rgba(255,255,255,${(0.45 * k).toFixed(2)}), 0 0 28px rgba(${r1},${g1},${b1},${(0.26 * k).toFixed(2)})`,
    borderColor: `rgba(${r2}, ${g2}, ${b2}, ${Math.min(0.75, 0.32 + 0.3 * k).toFixed(2)})`,
  };
}
