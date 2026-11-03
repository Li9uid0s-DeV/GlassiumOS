import * as THREE from 'three';

export type QualityPreset = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export interface GraphicsSettings {
  preset: QualityPreset;
  screenSpacePathTracing: boolean;
  bloomIntensity: number;
  fov: number;
}

export interface CustomDungeonConfig {
  gridSize: number; // e.g. 24, 28, 32
  enemyStatMultiplier: number; // 0.5x to 3.0x
  enemyCountBonus: number; // 0 to 8
  trapMultiplier: number; // 0.5x to 2.5x
  torchLightMultiplier: number; // 0.5x to 2.0x
  startingRarityIndex: number; // 0 (Common) to 9 (OG)
}

export const DEFAULT_CUSTOM_CONFIG: CustomDungeonConfig = {
  gridSize: 28,
  enemyStatMultiplier: 1.5,
  enemyCountBonus: 3,
  trapMultiplier: 1.4,
  torchLightMultiplier: 1.0,
  startingRarityIndex: 2,
};

export const QUALITY_PRESET_CONFIG: Record<
  QualityPreset,
  {
    label: string;
    pixelRatio: number;
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
    ptSamples: 4,
    bloomStrength: 0.25,
    maxActiveTorchLights: 6,
    particleMult: 0.5,
    desc: '低負荷モード・解像度75%・最小ライト数',
  },
  MEDIUM: {
    label: 'MEDIUM (標準)',
    pixelRatio: 1.0,
    ptSamples: 8,
    bloomStrength: 0.45,
    maxActiveTorchLights: 10,
    particleMult: 0.85,
    desc: '標準バランス・64x64高精細テクスチャ・標準シェーダー',
  },
  HIGH: {
    label: 'HIGH (高画質)',
    pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1.5, 1.5),
    ptSamples: 14,
    bloomStrength: 0.65,
    maxActiveTorchLights: 14,
    particleMult: 1.2,
    desc: '高精度ライティング・フルGLSLエフェクト・高密度パーティクル',
  },
  ULTRA: {
    label: 'ULTRA (AAA Path Traced)',
    pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 2.0, 2.0),
    ptSamples: 24,
    bloomStrength: 0.85,
    maxActiveTorchLights: 18,
    particleMult: 1.6,
    desc: 'AAA最高品質・24サンプルGLSLスクリーンパストレーシングGI・PBR反射',
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

  const palettes: Record<
    'ground' | 'gracia' | 'void' | 'cyber' | 'core',
    { base: [number, number, number]; dark: [number, number, number]; accent: [number, number, number] }
  > = {
    ground: {
      base: surfaceType === 'floor' ? [26, 42, 32] : [36, 58, 44],
      dark: [10, 18, 13],
      accent: [180, 120, 40],
    },
    gracia: {
      base: surfaceType === 'floor' ? [18, 44, 64] : [26, 62, 88],
      dark: [8, 20, 34],
      accent: [103, 232, 249],
    },
    void: {
      base: surfaceType === 'floor' ? [20, 12, 34] : [32, 18, 52],
      dark: [7, 4, 14],
      accent: [168, 85, 247],
    },
    cyber: {
      base: surfaceType === 'floor' ? [16, 22, 42] : [24, 32, 60],
      dark: [6, 9, 20],
      accent: [236, 72, 153],
    },
    core: {
      base: surfaceType === 'floor' ? [38, 16, 14] : [54, 22, 18],
      dark: [14, 5, 5],
      accent: [255, 90, 20],
    },
  };

  const pal = palettes[areaId];
  const imgData = ctx.createImageData(size, size);
  const bumpData = bCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const noise = (rand() - 0.5) * 22;
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
          r += 18;
          g += 18;
          b += 18;
          heightVal = 215;
        } else if (isBevelBottom) {
          r -= 16;
          g -= 16;
          b -= 16;
          heightVal = 85;
        }

        // Area-specific 64x64 surface details
        if (areaId === 'ground' && ((x * 7 + y * 13) % 29 === 0 || (localY < 4 && rand() < 0.25))) {
          // Moss & earthern veins
          r = 22;
          g = 95 + rand() * 35;
          b = 48;
          heightVal = 175;
        } else if (areaId === 'gracia' && Math.abs((x - y + 64) % 32 - 16) <= 1 && !isMortar) {
          // Frost crystal facet streaks
          r = pal.accent[0] * 0.7;
          g = pal.accent[1] * 0.85;
          b = pal.accent[2];
          heightVal = 240;
        } else if (areaId === 'void' && (x % 16 === 8 && y % 16 > 4 && y % 16 < 12)) {
          // Abyssal carved sigils
          r = pal.accent[0] * 0.65;
          g = pal.accent[1] * 0.5;
          b = pal.accent[2] * 0.85;
          heightVal = 40;
        } else if (areaId === 'cyber' && ((x === 16 && y % 8 !== 0) || (y === 32 && x % 8 !== 0))) {
          // Glowing circuit traces
          r = pal.accent[0];
          g = pal.accent[1];
          b = pal.accent[2];
          heightVal = 250;
        } else if (areaId === 'core' && isMortar && (x + y) % 5 === 0) {
          // Glowing magma cracks in mortar
          r = 255;
          g = 110;
          b = 20;
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
          r = (r + pal.accent[0] * 0.45) * 0.75;
          g = (g + pal.accent[1] * 0.45) * 0.75;
          b = (b + pal.accent[2] * 0.45) * 0.75;
          heightVal = 195;
        }
      } else {
        // 64x64 Ceiling Coffers
        const isVaultRib = x < 3 || x > 60 || y < 3 || y > 60 || Math.abs(x - 32) < 2 || Math.abs(y - 32) < 2;
        if (isVaultRib) {
          r = pal.dark[0] * 1.4;
          g = pal.dark[1] * 1.4;
          b = pal.dark[2] * 1.4;
          heightVal = 220;
        } else {
          r = pal.dark[0] * 0.85 + noise * 0.4;
          g = pal.dark[1] * 0.85 + noise * 0.4;
          b = pal.dark[2] * 0.85 + noise * 0.4;
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
// 2. GLSL Shaders (Screen-Space Path Tracing GI, Flame, Slash, Shockwave, Portal)
// =============================================================

export function createScreenSpacePathTracingMaterial(
  tDiffuse: THREE.Texture,
  tDepth: THREE.DepthTexture,
  near: number,
  far: number,
  fogColor: THREE.Color,
  fogDensity: number,
  pathTracingEnabled: boolean,
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
      uPathTracing: { value: pathTracingEnabled ? 1.0 : 0.0 },
      uSamples: { value: ptSamples },
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
      #include <packing>
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
      uniform float uPathTracing;
      uniform int uSamples;
      uniform float uBloomStrength;

      float hash12(vec2 p) {
        vec3 p3  = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      vec2 hash22(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.xx + p3.yz) * p3.zy);
      }

      float getLinearDepth(const in vec2 uv) {
        float fragCoordZ = texture2D(tDepth, clamp(uv, 0.001, 0.999)).x;
        float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
        return -viewZ;
      }

      // Reconstruct screen-space surface normal from depth derivatives
      vec3 reconstructNormal(vec2 uv, float centerDepth) {
        vec2 texel = 1.0 / max(uResolution, vec2(320.0));
        float dRight = getLinearDepth(uv + vec2(texel.x, 0.0)) - centerDepth;
        float dUp    = getLinearDepth(uv + vec2(0.0, texel.y)) - centerDepth;
        return normalize(vec3(-dRight * 12.0, -dUp * 12.0, 1.0));
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
        vec4 baseTexel = texture2D(tDiffuse, vUv);
        float depth = getLinearDepth(vUv);

        vec3 color = baseTexel.rgb;
        vec2 texelSize = 1.0 / max(uResolution, vec2(320.0));

        // -------------------------------------------------------------
        // Screen-Space Path Tracing (SSPT): Indirect Torch Bounce GI,
        // Contact Ambient Occlusion & Glossy Dungeon Stone Reflections
        // -------------------------------------------------------------
        if (uPathTracing > 0.5 && depth < uCameraFar * 0.95) {
          vec3 normal = reconstructNormal(vUv, depth);
          vec3 indirectLight = vec3(0.0);
          float occlusion = 0.0;
          vec3 glossySpec = vec3(0.0);

          float goldenAngle = 2.39996323;
          float jitter = hash12(vUv * uResolution + fract(uTime * 11.7)) * 6.2831853;

          for (int i = 0; i < 24; i++) {
            if (i >= uSamples) break;
            float fi = float(i) + 0.5;
            float r = sqrt(fi / float(uSamples));
            float theta = fi * goldenAngle + jitter;
            vec2 dir = vec2(cos(theta), sin(theta));

            // Ray-march step in screen space scaled by inverse depth
            float rayRadius = (0.015 + r * 0.095) / clamp(depth * 0.22, 0.4, 4.0);
            vec2 sampleUv = vUv + dir * rayRadius;

            if (sampleUv.x > 0.0 && sampleUv.x < 1.0 && sampleUv.y > 0.0 && sampleUv.y < 1.0) {
              float sampleDepth = getLinearDepth(sampleUv);
              vec3 sampleCol = texture2D(tDiffuse, sampleUv).rgb;

              float depthDelta = depth - sampleDepth;
              // Ambient occlusion when neighbor is closer to camera within local stone crease
              if (depthDelta > 0.03 && depthDelta < 1.45) {
                occlusion += smoothstep(1.45, 0.05, depthDelta);
              }

              // Radiosity / Path-Traced Indirect Bounce from bright torch-lit surfaces & emissive runes
              float luma = dot(sampleCol, vec3(0.299, 0.587, 0.114));
              float weight = max(0.0, 1.0 - abs(depthDelta) * 0.35);
              indirectLight += sampleCol * max(0.0, luma - 0.12) * weight * 1.85;

              // Screen-space glossy reflection on lower floor / icy walls
              if (vUv.y < 0.52) {
                vec2 reflectUv = vec2(vUv.x + dir.x * 0.018, clamp(vUv.y + abs(dir.y) * 0.08, 0.01, 0.99));
                vec3 reflCol = texture2D(tDiffuse, reflectUv).rgb;
                glossySpec += reflCol * pow(max(0.0, dot(reflCol, vec3(0.333))), 1.6);
              }
            }
          }

          float invS = 1.0 / float(max(1, uSamples));
          occlusion = clamp(1.0 - (occlusion * invS) * 0.68, 0.22, 1.0);
          indirectLight *= invS * 1.45;
          glossySpec *= invS * 0.28;

          // Combine direct lighting with path-traced indirect bounce & contact shadows
          color = color * occlusion + indirectLight * (color + vec3(0.18)) + glossySpec;
        }

        // -------------------------------------------------------------
        // GLSL Emissive Torch & Spell Bloom Pass
        // -------------------------------------------------------------
        vec3 bloomSum = vec3(0.0);
        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * texelSize * 3.2;
            vec3 sCol = texture2D(tDiffuse, clamp(vUv + offset, 0.001, 0.999)).rgb;
            float bright = max(max(sCol.r, sCol.g), sCol.b);
            if (bright > 0.58) {
              bloomSum += sCol * (bright - 0.52);
            }
          }
        }
        color += (bloomSum / 25.0) * uBloomStrength * 1.35;

        // -------------------------------------------------------------
        // Deep Dungeon Darkness & Distance Fog Falloff
        // -------------------------------------------------------------
        float fogFactor = 1.0 - exp(-uFogDensity * depth);
        fogFactor = clamp(fogFactor, 0.0, 1.0);
        color = mix(color, uFogColor, fogFactor);

        // Subtle atmospheric vignette
        float distFromCenter = length(vUv - 0.5);
        float vignette = smoothstep(0.92, 0.28, distFromCenter);
        color *= mix(0.42, 1.0, vignette);

        color = acesToneMap(color * 1.18);
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
        gl_FragColor = vec4(col * 1.6, alpha);
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
  light?: THREE.PointLight;
  baseIntensity: number;
  phase: number;
}

export function buildWallTorchSconce(
  withPointLight: boolean,
  flameColorHex = 0xff7b00,
  lightMult = 1.0
): WallTorchInstance {
  const group = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.35 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.18), ironMat);
  bracket.position.set(0, 0, -0.05);

  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.028, 0.52, 8), woodMat);
  stick.position.set(0, 0.16, 0.1);
  stick.rotation.x = 0.38;

  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.045, 0.12, 8), ironMat);
  basket.position.set(0, 0.38, 0.19);
  basket.rotation.x = 0.38;

  const coalCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), emberMat);
  coalCore.position.set(0, 0.42, 0.21);

  const flameMat = createGlslTorchFlameMaterial(flameColorHex, 0xfff7cc);
  const flamePlane1 = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.52, 4, 8), flameMat);
  flamePlane1.position.set(0, 0.62, 0.22);
  const flamePlane2 = flamePlane1.clone();
  flamePlane2.rotation.y = Math.PI / 2;

  group.add(bracket, stick, basket, coalCore, flamePlane1, flamePlane2);

  let light: THREE.PointLight | undefined;
  const baseIntensity = 2.65 * lightMult;
  if (withPointLight) {
    light = new THREE.PointLight(flameColorHex, baseIntensity, 10.5, 1.55);
    light.position.set(0, 0.55, 0.32);
    group.add(light);
  }

  return {
    group,
    flameMat,
    light,
    baseIntensity,
    phase: Math.random() * Math.PI * 2,
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

  const crescentBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.07, 16, 1, false, 0, Math.PI), bladeEdgeMat);
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
