import * as THREE from 'three';

export type QualityPreset = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

// Shader modes: PTGI (Screen-Space Path Tracing GI), STANDARD (Normal PBR Post Shader), CEL (Toon/Cel Shader), CRT (Retro Dungeon Shader), OFF (Direct Render)
export type ShaderMode = 'PTGI' | 'STANDARD' | 'CEL' | 'CRT' | 'OFF';

export const SHADER_MODE_META: Record<
  ShaderMode,
  { label: string; shortLabel: string; desc: string }
> = {
  PTGI: {
    label: 'PTGI (スクリーンパストレーシングGI)',
    shortLabel: 'PTGI',
    desc: 'GLSL多重バウンス間接光・アンビエントオクルージョン・湿潤石材スペキュラ反射',
  },
  STANDARD: {
    label: '標準シェーダー (Normal PBR Shader)',
    shortLabel: '標準Shader',
    desc: '通常GLSLシェーダー：法線レリーフ陰影・松明ブルーム・ACESトーンマッピング',
  },
  CEL: {
    label: 'トゥーン・セルシェーダー (Cel Shader)',
    shortLabel: 'Cel/Toon',
    desc: 'GLSL輪郭線抽出＋階調化シェーディングによるアニメ調ダークファンタジー表現',
  },
  CRT: {
    label: 'レトロ陰影シェーダー (Retro CRT)',
    shortLabel: 'Retro CRT',
    desc: '走査線・色収差・ディザリングを備えたクラシック迷宮シェーダー',
  },
  OFF: {
    label: 'シェーダーOFF (ダイレクト描画)',
    shortLabel: 'OFF',
    desc: 'ポストプロセスシェーダーを無効化し、Three.js標準パイプラインで直接描画',
  },
};

export interface GraphicsSettings {
  preset: QualityPreset;
  shaderMode: ShaderMode;
  screenSpacePathTracing: boolean;
  bloomIntensity: number;
  fov: number;
}

export interface CustomDungeonConfig {
  gridSize: number; // e.g. 20, 24, 28, 32
  enemyMultiplier: number; // 0.5x to 3.0x
  enemyStatMultiplier: number; // alias for compatibility
  enemyCountBonus: number; // 0 to 8
  trapMultiplier: number; // 0.5x to 2.5x
  torchLightMultiplier: number; // 0.5x to 2.0x
  startingRarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'MYTHIC' | 'OG';
  startingRarityIndex: number;
}

export const DEFAULT_CUSTOM_CONFIG: CustomDungeonConfig = {
  gridSize: 24,
  enemyMultiplier: 1.5,
  enemyStatMultiplier: 1.5,
  enemyCountBonus: 3,
  trapMultiplier: 1.4,
  torchLightMultiplier: 1.2,
  startingRarity: 'Rare',
  startingRarityIndex: 2,
};

export const QUALITY_PRESET_CONFIG: Record<
  QualityPreset,
  {
    label: string;
    pixelRatio: number;
    renderScale: number;
    ptSamples: number;
    bloomStrength: number;
    maxActiveTorchLights: number;
    particleMult: number;
    desc: string;
  }
> = {
  LOW: {
    label: 'LOW (軽量)',
    pixelRatio: 0.75,
    renderScale: 0.75,
    ptSamples: 4,
    bloomStrength: 0.3,
    maxActiveTorchLights: 4,
    particleMult: 0.5,
    desc: '低負荷モード・解像度75%・高速描画',
  },
  MEDIUM: {
    label: 'MEDIUM (標準)',
    pixelRatio: 1.0,
    renderScale: 1.0,
    ptSamples: 8,
    bloomStrength: 0.5,
    maxActiveTorchLights: 5,
    particleMult: 0.85,
    desc: '標準バランス・64x64高精細テクスチャ・標準シェーダー',
  },
  HIGH: {
    label: 'HIGH (高画質)',
    pixelRatio: 1.25,
    renderScale: 1.25,
    ptSamples: 14,
    bloomStrength: 0.7,
    maxActiveTorchLights: 6,
    particleMult: 1.2,
    desc: '高精度ライティング・フルGLSLエフェクト・高密度パーティクル',
  },
  ULTRA: {
    label: 'ULTRA (AAA Path Traced)',
    pixelRatio: 1.5,
    renderScale: 1.5,
    ptSamples: 20,
    bloomStrength: 0.9,
    maxActiveTorchLights: 6,
    particleMult: 1.6,
    desc: 'AAA最高品質・20サンプルGLSLスクリーンパストレーシングGI・PBR反射',
  },
};

// =============================================================
// 1. 64x64 Procedural Pixel-PBR Texture Generator (Albedo + Bump)
// =============================================================
export function createProcedural64x64Textures(
  areaId: 'ground' | 'gracia' | 'void' | 'cyber' | 'core',
  surfaceType: 'wall' | 'floor' | 'ceiling'
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 64;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const ctx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Deterministic pseudo-random helper for crisp 64x64 texels
  let seed =
    (areaId.charCodeAt(0) * 131 + surfaceType.charCodeAt(0) * 97 + areaId.length * 31) % 9973;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Rich, visible dungeon stone palettes with distinct mortar and area veins
  const palettes: Record<
    'ground' | 'gracia' | 'void' | 'cyber' | 'core',
    { base: [number, number, number]; dark: [number, number, number]; accent: [number, number, number] }
  > = {
    ground: {
      base: surfaceType === 'floor' ? [42, 64, 50] : [56, 84, 66],
      dark: [16, 26, 20],
      accent: [210, 145, 55],
    },
    gracia: {
      base: surfaceType === 'floor' ? [30, 68, 96] : [42, 90, 125],
      dark: [12, 28, 46],
      accent: [103, 232, 249],
    },
    void: {
      base: surfaceType === 'floor' ? [36, 22, 58] : [52, 32, 82],
      dark: [12, 7, 22],
      accent: [192, 132, 252],
    },
    cyber: {
      base: surfaceType === 'floor' ? [28, 38, 68] : [40, 54, 92],
      dark: [10, 14, 30],
      accent: [244, 114, 182],
    },
    core: {
      base: surfaceType === 'floor' ? [62, 26, 22] : [84, 36, 28],
      dark: [22, 8, 8],
      accent: [255, 110, 30],
    },
  };

  const pal = palettes[areaId];
  const imgData = ctx.createImageData(size, size);
  const bumpData = bCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const noise = (rand() - 0.5) * 24;
      let r = pal.base[0] + noise;
      let g = pal.base[1] + noise;
      let b = pal.base[2] + noise;
      let heightVal = 140 + (rand() - 0.5) * 40;

      if (surfaceType === 'wall') {
        // 64x64 Detailed Masonry / Ashlar Stone Blocks with Mortar & Area Veins
        const rowH = 16;
        const row = Math.floor(y / rowH);
        const offsetX = (row % 2) * 16;
        const localY = y % rowH;
        const localX = (x + offsetX) % 32;

        const isMortar = localY === 0 || localY === rowH - 1 || localX === 0 || localX === 31;
        const isBevelTop = localY === 1 || localX === 1;
        const isBevelBottom = localY === rowH - 2 || localX === 30;

        if (isMortar) {
          r = pal.dark[0];
          g = pal.dark[1];
          b = pal.dark[2];
          heightVal = 25;
        } else if (isBevelTop) {
          r += 24;
          g += 24;
          b += 24;
          heightVal = 220;
        } else if (isBevelBottom) {
          r -= 18;
          g -= 18;
          b -= 18;
          heightVal = 80;
        }

        // Area-specific 64x64 surface details
        if (areaId === 'ground' && ((x * 7 + y * 13) % 29 === 0 || (localY < 4 && rand() < 0.25))) {
          r = 34;
          g = 115 + rand() * 35;
          b = 62;
          heightVal = 180;
        } else if (areaId === 'gracia' && Math.abs(((x - y + 64) % 32) - 16) <= 1 && !isMortar) {
          r = pal.accent[0] * 0.75;
          g = pal.accent[1] * 0.9;
          b = pal.accent[2];
          heightVal = 240;
        } else if (areaId === 'void' && x % 16 === 8 && y % 16 > 4 && y % 16 < 12) {
          r = pal.accent[0] * 0.75;
          g = pal.accent[1] * 0.55;
          b = pal.accent[2] * 0.95;
          heightVal = 45;
        } else if (areaId === 'cyber' && ((x === 16 && y % 8 !== 0) || (y === 32 && x % 8 !== 0))) {
          r = pal.accent[0];
          g = pal.accent[1];
          b = pal.accent[2];
          heightVal = 250;
        } else if (areaId === 'core' && isMortar && (x + y) % 5 === 0) {
          r = 255;
          g = 120;
          b = 25;
          heightVal = 255;
        }
      } else if (surfaceType === 'floor') {
        // 64x64 Interlocking Dungeon Flagstones
        const tileX = x % 32;
        const tileY = y % 32;
        const isGroove = tileX === 0 || tileY === 0 || tileX === 31 || tileY === 31;
        const isInnerDiag = Math.abs(tileX - 16) + Math.abs(tileY - 16) === 10;

        if (isGroove) {
          r = pal.dark[0];
          g = pal.dark[1];
          b = pal.dark[2];
          heightVal = 20;
        } else if (isInnerDiag) {
          r = (r + pal.accent[0] * 0.5) * 0.8;
          g = (g + pal.accent[1] * 0.5) * 0.8;
          b = (b + pal.accent[2] * 0.5) * 0.8;
          heightVal = 200;
        }
      } else {
        // 64x64 Ceiling Coffers
        const isVaultRib = x < 3 || x > 60 || y < 3 || y > 60 || Math.abs(x - 32) < 2 || Math.abs(y - 32) < 2;
        if (isVaultRib) {
          r = pal.dark[0] * 1.6;
          g = pal.dark[1] * 1.6;
          b = pal.dark[2] * 1.6;
          heightVal = 220;
        } else {
          r = pal.dark[0] * 1.1 + noise * 0.4;
          g = pal.dark[1] * 1.1 + noise * 0.4;
          b = pal.dark[2] * 1.1 + noise * 0.4;
          heightVal = 80;
        }
      }

      imgData.data[idx] = Math.max(0, Math.min(255, r));
      imgData.data[idx + 1] = Math.max(0, Math.min(255, g));
      imgData.data[idx + 2] = Math.max(0, Math.min(255, b));
      imgData.data[idx + 3] = 255;

      const hClamped = Math.max(0, Math.min(255, heightVal));
      bumpData.data[idx] = hClamped;
      bumpData.data[idx + 1] = hClamped;
      bumpData.data[idx + 2] = hClamped;
      bumpData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  bCtx.putImageData(bumpData, 0, 0);

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestFilter;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.magFilter = THREE.NearestFilter;
  bumpMap.minFilter = THREE.NearestFilter;
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

// =============================================================
// 2. Multi-Mode GLSL Post-Processing Shader
//    Supports:
//    - Mode 0 (STANDARD): Normal PBR Relief + Bloom + ACES ToneMap
//    - Mode 1 (PTGI): Screen-Space Path Tracing GI + Bounce Light + AO + Glossy Floor Reflections
//    - Mode 2 (CEL): Stylized Cel/Toon Shading + Sobel Edge Outlines
//    - Mode 3 (CRT): Retro Dungeon Dither + Scanlines + Chromatic Shift
// =============================================================
export function shaderModeToInt(mode: ShaderMode): number {
  switch (mode) {
    case 'PTGI':
      return 1.0;
    case 'CEL':
      return 2.0;
    case 'CRT':
      return 3.0;
    case 'STANDARD':
    default:
      return 0.0;
  }
}

export function createScreenSpacePathTracingMaterial(
  tDiffuse: THREE.Texture,
  tDepth: THREE.DepthTexture | null,
  near: number,
  far: number,
  fogColor: THREE.Color,
  fogDensity: number,
  shaderMode: ShaderMode,
  ptSamples: number,
  bloomStrength: number
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: tDiffuse },
      tDepth: { value: tDepth },
      uResolution: { value: new THREE.Vector2(800, 600) },
      uCameraNear: { value: near },
      uCameraFar: { value: far },
      uFogColor: { value: new THREE.Vector3(fogColor.r, fogColor.g, fogColor.b) },
      uFogDensity: { value: fogDensity },
      uTime: { value: 0 },
      uShaderMode: { value: shaderModeToInt(shaderMode) },
      uSamples: { value: Number(ptSamples) },
      uBloomStrength: { value: bloomStrength },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      varying vec2 vUv;
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform vec2 uResolution;
      uniform float uCameraNear;
      uniform float uCameraFar;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uTime;
      uniform float uShaderMode;
      uniform float uSamples;
      uniform float uBloomStrength;

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float getLuma(vec3 c) {
        return dot(c, vec3(0.299, 0.587, 0.114));
      }

      // Safe linear depth reader that falls back gracefully if hardware depth texture is 1.0
      float getSafeDepth(vec2 uv) {
        float rawZ = texture2D(tDepth, clamp(uv, 0.001, 0.999)).x;
        if (rawZ <= 0.0001 || rawZ >= 0.9995) {
          return 8.0;
        }
        float z_n = 2.0 * rawZ - 1.0;
        return (2.0 * uCameraNear * uCameraFar) / max(0.001, (uCameraFar + uCameraNear - z_n * (uCameraFar - uCameraNear)));
      }

      // Reconstruct screen-space surface normal from local relief gradients
      vec3 reconstructReliefNormal(vec2 uv, vec2 texel) {
        float lCenter = getLuma(texture2D(tDiffuse, uv).rgb);
        float lRight  = getLuma(texture2D(tDiffuse, clamp(uv + vec2(texel.x, 0.0), 0.001, 0.999)).rgb);
        float lUp     = getLuma(texture2D(tDiffuse, clamp(uv + vec2(0.0, texel.y), 0.001, 0.999)).rgb);
        return normalize(vec3((lCenter - lRight) * 3.5, (lCenter - lUp) * 3.5, 1.0));
      }

      // ACES Filmic Tone Mapping
      vec3 acesToneMap(vec3 x) {
        const float a = 2.51;
        const float b = 0.03;
        const float c = 2.43;
        const float d = 0.59;
        const float e = 0.14;
        return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
      }

      void main() {
        vec2 texelSize = 1.0 / max(uResolution, vec2(320.0));
        vec4 baseTexel = texture2D(tDiffuse, vUv);
        vec3 color = baseTexel.rgb;
        float depth = getSafeDepth(vUv);
        vec3 normal = reconstructReliefNormal(vUv, texelSize);

        // =============================================================
        // MODE 1: PTGI (GLSL Screen-Space Path Tracing Global Illumination)
        // =============================================================
        if (uShaderMode > 0.5 && uShaderMode < 1.5) {
          vec3 indirectLight = vec3(0.0);
          float occlusion = 0.0;
          vec3 glossySpec = vec3(0.0);

          float goldenAngle = 2.39996323;
          float jitter = hash12(vUv * uResolution + fract(uTime * 7.13)) * 6.2831853;
          float sampleCount = clamp(uSamples, 4.0, 24.0);

          for (int i = 0; i < 24; i++) {
            float fi = float(i);
            if (fi >= sampleCount) break;

            float r = sqrt((fi + 0.5) / sampleCount);
            float theta = (fi + 0.5) * goldenAngle + jitter;
            vec2 dir = vec2(cos(theta), sin(theta));

            float rayRadius = (0.012 + r * 0.085) / clamp(depth * 0.18, 0.5, 3.2);
            vec2 sampleUv = clamp(vUv + dir * rayRadius, 0.002, 0.998);

            vec3 sampleCol = texture2D(tDiffuse, sampleUv).rgb;
            float sampleDepth = getSafeDepth(sampleUv);
            float depthDelta = depth - sampleDepth;

            // Contact Ambient Occlusion in stone mortar & corners
            if (depthDelta > 0.04 && depthDelta < 1.6) {
              occlusion += smoothstep(1.6, 0.06, depthDelta);
            }

            // Path-Traced Indirect Bounce from torch-lit walls & glowing runes
            float sampleLuma = getLuma(sampleCol);
            float bounceWeight = max(0.0, 1.0 - abs(depthDelta) * 0.28);
            indirectLight += sampleCol * max(0.0, sampleLuma - 0.08) * bounceWeight * 2.15;

            // Wet dungeon flagstone screen-space specular reflection on floor
            if (vUv.y < 0.52) {
              vec2 reflUv = clamp(vec2(vUv.x + dir.x * 0.016, vUv.y + abs(dir.y) * 0.075), 0.002, 0.998);
              vec3 reflCol = texture2D(tDiffuse, reflUv).rgb;
              glossySpec += reflCol * pow(max(0.0, getLuma(reflCol)), 1.5);
            }
          }

          float invS = 1.0 / max(1.0, sampleCount);
          occlusion = clamp(1.0 - (occlusion * invS) * 0.55, 0.38, 1.0);
          indirectLight *= invS * 1.55;
          glossySpec *= invS * 0.32;

          // Normal-mapped micro-bevel highlight from warm torch direction
          float bevelLight = clamp(dot(normal, normalize(vec3(0.25, 0.45, 0.85))), 0.65, 1.35);

          color = color * occlusion * bevelLight + indirectLight * (color + vec3(0.22)) + glossySpec;
        }
        // =============================================================
        // MODE 0: STANDARD (Normal PBR Relief & Atmospheric Dungeon Shader)
        // =============================================================
        else if (uShaderMode < 0.5) {
          float bevelLight = clamp(dot(normal, normalize(vec3(0.2, 0.5, 0.85))), 0.72, 1.32);
          // Local 4-tap subtle relief shadow / sharpening
          vec3 n1 = texture2D(tDiffuse, clamp(vUv + vec2(texelSize.x, 0.0), 0.001, 0.999)).rgb;
          vec3 n2 = texture2D(tDiffuse, clamp(vUv - vec2(texelSize.x, 0.0), 0.001, 0.999)).rgb;
          vec3 n3 = texture2D(tDiffuse, clamp(vUv + vec2(0.0, texelSize.y), 0.001, 0.999)).rgb;
          vec3 n4 = texture2D(tDiffuse, clamp(vUv - vec2(0.0, texelSize.y), 0.001, 0.999)).rgb;
          vec3 avgNeighbor = (n1 + n2 + n3 + n4) * 0.25;
          vec3 detailBoost = (color - avgNeighbor) * 0.38;

          color = (color + detailBoost) * bevelLight;
        }
        // =============================================================
        // MODE 2: CEL / TOON SHADER (Quantized Lighting + Edge Outline)
        // =============================================================
        else if (uShaderMode > 1.5 && uShaderMode < 2.5) {
          float luma = getLuma(color);
          float toonBand = floor(luma * 5.0 + 0.5) / 5.0;
          vec3 chroma = color / max(0.02, luma);
          color = chroma * mix(luma, toonBand, 0.75) * 1.15;

          // Sobel-style edge detection from neighbor luminance
          float lR = getLuma(texture2D(tDiffuse, clamp(vUv + vec2(texelSize.x * 1.5, 0.0), 0.001, 0.999)).rgb);
          float lL = getLuma(texture2D(tDiffuse, clamp(vUv - vec2(texelSize.x * 1.5, 0.0), 0.001, 0.999)).rgb);
          float lU = getLuma(texture2D(tDiffuse, clamp(vUv + vec2(0.0, texelSize.y * 1.5), 0.001, 0.999)).rgb);
          float lD = getLuma(texture2D(tDiffuse, clamp(vUv - vec2(0.0, texelSize.y * 1.5), 0.001, 0.999)).rgb);
          float edge = length(vec2(lR - lL, lU - lD));
          float outline = smoothstep(0.18, 0.42, edge);
          color = mix(color, vec3(0.02, 0.03, 0.06), outline * 0.85);
        }
        // =============================================================
        // MODE 3: RETRO CRT / DARK FANTASY DITHER SHADER
        // =============================================================
        else {
          vec2 caOffset = (vUv - 0.5) * 0.0035;
          float rCh = texture2D(tDiffuse, clamp(vUv + caOffset, 0.001, 0.999)).r;
          float gCh = color.g;
          float bCh = texture2D(tDiffuse, clamp(vUv - caOffset, 0.001, 0.999)).b;
          color = vec3(rCh, gCh, bCh);

          // Ordered scanline & subtle dither
          float scanline = 0.92 + 0.08 * sin(vUv.y * uResolution.y * 3.14159);
          float dither = (hash12(floor(vUv * uResolution)) - 0.5) * 0.04;
          color = floor((color * scanline + dither) * 24.0 + 0.5) / 24.0;
        }

        // -------------------------------------------------------------
        // GLSL Emissive Torch & Spell Bloom Pass (All Active Shader Modes)
        // -------------------------------------------------------------
        vec3 bloomSum = vec3(0.0);
        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * texelSize * 3.0;
            vec3 sCol = texture2D(tDiffuse, clamp(vUv + offset, 0.001, 0.999)).rgb;
            float bright = max(max(sCol.r, sCol.g), sCol.b);
            if (bright > 0.48) {
              bloomSum += sCol * (bright - 0.42);
            }
          }
        }
        color += (bloomSum / 25.0) * uBloomStrength * 1.45;

        // Subtle vignette that keeps the center of view crisp and clear
        float distFromCenter = length(vUv - 0.5);
        float vignette = smoothstep(1.05, 0.32, distFromCenter);
        color *= mix(0.58, 1.0, vignette);

        color = acesToneMap(color * 1.25);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

// Custom GLSL Procedural Torch Flame Shader (FBM Fire Turbulence)
export function createGlslTorchFlameMaterial(flameColorHex = 0xff7700, coreColorHex = 0xfff3b0): THREE.ShaderMaterial {
  const c1 = new THREE.Color(flameColorHex);
  const c2 = new THREE.Color(coreColorHex);
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOuterColor: { value: new THREE.Vector3(c1.r, c1.g, c1.b) },
      uCoreColor: { value: new THREE.Vector3(c2.r, c2.g, c2.b) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float sway = sin(uTime * 9.0 + pos.y * 6.0) * 0.06 * uv.y;
        pos.x += sway;
        pos.z += cos(uTime * 7.5 + pos.y * 5.0) * 0.05 * uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uOuterColor;
      uniform vec3 uCoreColor;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.1;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        uv.x = uv.x * 2.0 - 1.0;

        float n = fbm(vec2(uv.x * 3.0, uv.y * 4.5 - uTime * 4.8));
        float shape = (1.0 - uv.y) * 0.85;
        float dist = abs(uv.x + (n - 0.5) * 0.55 * uv.y);

        float alpha = smoothstep(shape, shape * 0.15, dist) * smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.35, uv.y + n * 0.25);
        float coreMask = smoothstep(shape * 0.5, 0.0, dist) * (1.0 - uv.y * 0.7);

        vec3 col = mix(uOuterColor, uCoreColor, clamp(coreMask * 1.4, 0.0, 1.0));
        gl_FragColor = vec4(col * 1.8, alpha);
      }
    `,
  });
}

// Custom GLSL Volumetric Slash & Energy Wave Shader (Non-primitive procedural plasma arc)
export function createGlslSlashArcMaterial(colorHex: number): THREE.ShaderMaterial {
  const c = new THREE.Color(colorHex);
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uColor: { value: new THREE.Vector3(c.r, c.g, c.b) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uProgress;
      uniform vec3 uColor;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(41.1, 289.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        vec2 centered = vUv * 2.0 - 1.0;
        float r = length(centered);
        float angle = atan(centered.y, centered.x);

        // Crescent blade wave mask with turbulent plasma filaments
        float n = noise(vec2(angle * 4.0 + uTime * 12.0, r * 8.0 - uTime * 10.0));
        float n2 = noise(vec2(angle * 9.0 - uTime * 8.0, r * 14.0));

        float ringBand = smoothstep(0.35, 0.72, r) * smoothstep(1.0, 0.76, r + (n - 0.5) * 0.14);
        float arcSweep = smoothstep(-2.4, -0.8, angle) * smoothstep(2.4, 0.8, angle);
        float filament = pow(clamp(n * 0.6 + n2 * 0.55, 0.0, 1.0), 1.5);

        float intensity = ringBand * arcSweep * (0.65 + filament * 1.4) * (1.0 - uProgress);
        vec3 finalCol = mix(uColor, vec3(1.0, 0.98, 0.92), clamp(intensity * 0.85, 0.0, 1.0));

        gl_FragColor = vec4(finalCol * 2.1, clamp(intensity * 1.4, 0.0, 1.0));
      }
    `,
  });
}

// Custom GLSL Runic Shockwave & Spell Circle Shader
export function createGlslRunicShockwaveMaterial(colorHex: number): THREE.ShaderMaterial {
  const c = new THREE.Color(colorHex);
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uColor: { value: new THREE.Vector3(c.r, c.g, c.b) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uProgress;
      uniform vec3 uColor;

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;

        float theta = atan(p.y, p.x);
        float outerRing = smoothstep(0.06, 0.0, abs(r - 0.86));
        float innerRing = smoothstep(0.04, 0.0, abs(r - 0.58));
        float pulseWave = smoothstep(0.12, 0.0, abs(r - fract(uProgress * 1.35)));

        // Procedural geometric star & arcane rune teeth
        float starPattern = smoothstep(0.03, 0.0, abs(r - (0.68 + 0.14 * cos(theta * 8.0 + uTime * 5.0))));
        float runeTicks = step(0.45, sin(theta * 24.0 - uTime * 8.0)) * smoothstep(0.05, 0.0, abs(r - 0.74));

        float energy = (outerRing * 1.3 + innerRing * 0.9 + pulseWave * 1.4 + starPattern * 1.1 + runeTicks * 0.9) * (1.0 - uProgress);
        vec3 col = mix(uColor, vec3(1.0), clamp(energy * 0.55, 0.0, 1.0));
        gl_FragColor = vec4(col * 1.9, clamp(energy, 0.0, 1.0));
      }
    `,
  });
}

// Custom GLSL Dimensional Exit Portal Shader
export function createGlslPortalVortexMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float a = atan(p.y, p.x);

        float spiral = sin(a * 6.0 - r * 14.0 + uTime * 5.5);
        float spiral2 = cos(a * 4.0 + r * 10.0 - uTime * 3.8);
        float verticalBands = sin(vUv.y * 20.0 - uTime * 6.0) * 0.5 + 0.5;

        vec3 cyan = vec3(0.0, 0.95, 1.0);
        vec3 violet = vec3(0.68, 0.32, 1.0);
        vec3 col = mix(cyan, violet, spiral * 0.5 + 0.5) + vec3(0.9) * max(0.0, spiral * spiral2) * verticalBands;

        float alpha = (0.45 + 0.45 * max(spiral, spiral2)) * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
        gl_FragColor = vec4(col * 1.6, alpha);
      }
    `,
  });
}

// =============================================================
// 3. Wall Torch Sconce, Handheld Void Torch & Corridor Traps/Props
// =============================================================
export interface WallTorchInstance {
  group: THREE.Group;
  flameMat: THREE.ShaderMaterial;
  pointLight?: THREE.PointLight;
  light?: THREE.PointLight;
  baseIntensity: number;
  flickerSeed: number;
  phase: number;
}

export function buildWallTorchSconce(
  withPointLight: boolean,
  flameColorHex = 0xff7b00,
  lightMult = 1.0
): WallTorchInstance {
  const group = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.35 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c2d0c, roughness: 0.85 });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xffbb33 });

  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.18), ironMat);
  bracket.position.set(0, 0, -0.05);

  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.03, 0.54, 8), woodMat);
  stick.position.set(0, 0.16, 0.1);
  stick.rotation.x = 0.38;

  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.048, 0.13, 8), ironMat);
  basket.position.set(0, 0.38, 0.19);
  basket.rotation.x = 0.38;

  const coalCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), emberMat);
  coalCore.position.set(0, 0.42, 0.21);

  const flameMat = createGlslTorchFlameMaterial(flameColorHex, 0xfff7cc);
  const flamePlane1 = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.56, 4, 8), flameMat);
  flamePlane1.position.set(0, 0.64, 0.22);
  const flamePlane2 = flamePlane1.clone();
  flamePlane2.rotation.y = Math.PI / 2;

  group.add(bracket, stick, basket, coalCore, flamePlane1, flamePlane2);

  let pointLight: THREE.PointLight | undefined;
  const baseIntensity = 3.2 * lightMult;
  if (withPointLight) {
    pointLight = new THREE.PointLight(flameColorHex, baseIntensity, 14.0, 1.35);
    pointLight.position.set(0, 0.55, 0.35);
    group.add(pointLight);
  }

  const seedVal = Math.random() * Math.PI * 2;
  return {
    group,
    flameMat,
    pointLight,
    light: pointLight,
    baseIntensity,
    flickerSeed: seedVal,
    phase: seedVal,
  };
}

export function buildCorridorSpikeTrap(): { group: THREE.Group; spikesGroup: THREE.Group } {
  const group = new THREE.Group();
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.4 });
  const spikeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x991b1b,
    emissiveIntensity: 0.35,
    metalness: 0.92,
    roughness: 0.18,
  });

  const basePlate = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 1.75), plateMat);
  basePlate.position.y = 0.03;
  group.add(basePlate);

  const spikesGroup = new THREE.Group();
  for (let rx = -1; rx <= 1; rx++) {
    for (let rz = -1; rz <= 1; rz++) {
      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.12, 8),
        new THREE.MeshBasicMaterial({ color: 0x020617 })
      );
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(rx * 0.48, 0.065, rz * 0.48);
      group.add(hole);

      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.85, 6), spikeMat);
      spike.position.set(rx * 0.48, 0.42, rz * 0.48);
      spikesGroup.add(spike);
    }
  }
  spikesGroup.position.y = -0.75;
  group.add(spikesGroup);

  return { group, spikesGroup };
}

export function buildSwingingPendulumTrap(): { group: THREE.Group; pivotGroup: THREE.Group } {
  const group = new THREE.Group();
  const pivotGroup = new THREE.Group();
  pivotGroup.position.y = 2.95;

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.88, roughness: 0.25 });
  const bladeEdgeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xf43f5e,
    emissiveIntensity: 0.55,
    metalness: 0.95,
    roughness: 0.12,
  });

  const mountBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.42), metalMat);
  mountBox.position.y = 2.92;
  group.add(mountBox);

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.85, 8), metalMat);
  rod.position.y = -0.92;

  const hub = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), bladeEdgeMat);
  hub.position.y = -1.82;

  const crescentBlade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 0.07, 16, 1, false, 0, Math.PI),
    bladeEdgeMat
  );
  crescentBlade.rotation.z = Math.PI / 2;
  crescentBlade.rotation.y = Math.PI / 2;
  crescentBlade.position.y = -1.68;

  pivotGroup.add(rod, hub, crescentBlade);
  group.add(pivotGroup);

  return { group, pivotGroup };
}

export function buildDestructibleBarrelOrUrn(isUrn: boolean, accentHex: number): THREE.Group {
  const group = new THREE.Group();
  if (isUrn) {
    const urnMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: accentHex,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.55,
    });
    const bandMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.2,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.22, 0.65, 10), urnMat);
    base.position.y = 0.32;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.28, 10), urnMat);
    neck.position.y = 0.76;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 14), bandMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.9;
    const midBand = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 8, 14), bandMat);
    midBand.rotation.x = Math.PI / 2;
    midBand.position.y = 0.48;
    group.add(base, neck, rim, midBand);
  } else {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c2d0c, roughness: 0.78, metalness: 0.15 });
    const hoopMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.35, 0.86, 12), woodMat);
    body.position.y = 0.43;
    const hoop1 = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.03, 8, 16), hoopMat);
    hoop1.rotation.x = Math.PI / 2;
    hoop1.position.y = 0.22;
    const hoop2 = hoop1.clone();
    hoop2.position.y = 0.66;
    const runeTop = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 8),
      new THREE.MeshBasicMaterial({ color: accentHex })
    );
    runeTop.rotation.x = -Math.PI / 2;
    runeTop.position.y = 0.87;
    group.add(body, hoop1, hoop2, runeTop);
  }
  return group;
}

export function buildAncientCorridorPillar(accentHex: number): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.35 });
  const runeMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.95,
  });

  const plinthBottom = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.35, 0.76), stoneMat);
  plinthBottom.position.y = 0.175;
  const plinthTop = plinthBottom.clone();
  plinthTop.position.y = 2.82;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 2.5, 8), stoneMat);
  shaft.position.y = 1.5;

  const runeBand1 = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 12), runeMat);
  runeBand1.rotation.x = Math.PI / 2;
  runeBand1.position.y = 1.05;
  const runeBand2 = runeBand1.clone();
  runeBand2.position.y = 1.95;

  group.add(plinthBottom, plinthTop, shaft, runeBand1, runeBand2);
  return group;
}
