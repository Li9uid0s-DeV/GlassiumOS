import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WeatherConditionKey } from '../weatherConsensus';
import {
  getRustCore,
  computeTerrainHeightRust,
  isRustWasmActive,
} from '../rustWasmCore';

interface VintageAndroidWeatherSkyProps {
  condition: WeatherConditionKey;
  className?: string;
  enableWiper?: boolean;
  wiperSweepCount?: number;
}

// Reusable module-scope math objects (Zero GC in render loop)
const _dummy = new THREE.Object3D();
const _targetSkyTop = new THREE.Color();
const _targetSkyBottom = new THREE.Color();
const _targetCloudColor = new THREE.Color();
const _targetCloudEmissive = new THREE.Color();
const _targetTerrainColor = new THREE.Color();
const _targetKeyColor = new THREE.Color();

interface ConditionPalette {
  skyTop: number;
  skyBottom: number;
  fogColor: number;
  fogDensity: number;
  cloudColor: number;
  cloudEmissive: number;
  terrainColor: number;
  keyLightColor: number;
  keyLightIntensity: number;
  hemiIntensity: number;
  sunVisible: boolean;
  auroraVisible: boolean;
  precipMode: 'none' | 'rain' | 'storm' | 'snow' | 'cosmic';
}

const CONDITION_PALETTES: Record<WeatherConditionKey, ConditionPalette> = {
  Sunny: {
    skyTop: 0x0ea5e9,
    skyBottom: 0xf59e0b,
    fogColor: 0x38bdf8,
    fogDensity: 0.016,
    cloudColor: 0xffffff,
    cloudEmissive: 0x3b2806,
    terrainColor: 0x1e3a5f,
    keyLightColor: 0xfff3c4,
    keyLightIntensity: 2.8,
    hemiIntensity: 1.35,
    sunVisible: true,
    auroraVisible: false,
    precipMode: 'none',
  },
  Cloudy: {
    skyTop: 0x1e293b,
    skyBottom: 0x475569,
    fogColor: 0x334155,
    fogDensity: 0.028,
    cloudColor: 0x94a3b8,
    cloudEmissive: 0x0f172a,
    terrainColor: 0x1e293b,
    keyLightColor: 0xcbd5e1,
    keyLightIntensity: 1.15,
    hemiIntensity: 0.9,
    sunVisible: false,
    auroraVisible: false,
    precipMode: 'none',
  },
  Rainy: {
    skyTop: 0x091526,
    skyBottom: 0x1e3a5f,
    fogColor: 0x0f243c,
    fogDensity: 0.034,
    cloudColor: 0x475569,
    cloudEmissive: 0x081426,
    terrainColor: 0x0f172a,
    keyLightColor: 0x38bdf8,
    keyLightIntensity: 0.95,
    hemiIntensity: 0.75,
    sunVisible: false,
    auroraVisible: false,
    precipMode: 'rain',
  },
  Thunderstorm: {
    skyTop: 0x050814,
    skyBottom: 0x1e1b4b,
    fogColor: 0x0c1024,
    fogDensity: 0.038,
    cloudColor: 0x312e81,
    cloudEmissive: 0x090d16,
    terrainColor: 0x090d16,
    keyLightColor: 0x818cf8,
    keyLightIntensity: 0.7,
    hemiIntensity: 0.55,
    sunVisible: false,
    auroraVisible: false,
    precipMode: 'storm',
  },
  Snow: {
    skyTop: 0x1e293b,
    skyBottom: 0x7dd3fc,
    fogColor: 0x475569,
    fogDensity: 0.03,
    cloudColor: 0xe2e8f0,
    cloudEmissive: 0x1e293b,
    terrainColor: 0xcbd5e1,
    keyLightColor: 0xe0f2fe,
    keyLightIntensity: 1.65,
    hemiIntensity: 1.25,
    sunVisible: false,
    auroraVisible: false,
    precipMode: 'snow',
  },
  Aurora: {
    skyTop: 0x040711,
    skyBottom: 0x064e3b,
    fogColor: 0x062c28,
    fogDensity: 0.02,
    cloudColor: 0x10b981,
    cloudEmissive: 0x064e3b,
    terrainColor: 0x062e22,
    keyLightColor: 0x34d399,
    keyLightIntensity: 1.6,
    hemiIntensity: 1.0,
    sunVisible: false,
    auroraVisible: true,
    precipMode: 'cosmic',
  },
  'Cosmic Dust': {
    skyTop: 0x060414,
    skyBottom: 0x3b0764,
    fogColor: 0x1e0936,
    fogDensity: 0.018,
    cloudColor: 0xc084fc,
    cloudEmissive: 0x2e1065,
    terrainColor: 0x1e1b4b,
    keyLightColor: 0xe879f9,
    keyLightIntensity: 1.9,
    hemiIntensity: 1.0,
    sunVisible: true,
    auroraVisible: true,
    precipMode: 'cosmic',
  },
};

export const VintageAndroidWeatherSky: React.FC<VintageAndroidWeatherSkyProps> = ({
  condition,
  className = '',
  enableWiper = true,
  wiperSweepCount = 0,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const conditionRef = useRef<WeatherConditionKey>(condition);
  conditionRef.current = condition;

  const [wiperActive, setWiperActive] = useState(false);
  const wasmActive = isRustWasmActive();

  useEffect(() => {
    if (!enableWiper) {
      setWiperActive(false);
      return;
    }
    setWiperActive(true);
    const hideTimer = window.setTimeout(() => setWiperActive(false), 1200);
    if (condition !== 'Rainy' && condition !== 'Thunderstorm') {
      return () => window.clearTimeout(hideTimer);
    }
    const interval = window.setInterval(() => {
      setWiperActive(true);
      window.setTimeout(() => setWiperActive(false), 1200);
    }, 5200);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearInterval(interval);
    };
  }, [enableWiper, wiperSweepCount, condition]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const rustCore = getRustCore();

    // 1. Software WebGL detection per Three.js skill guidelines
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = Math.max(320, container.clientWidth || 800);
    const height = Math.max(240, container.clientHeight || 600);

    const scene = new THREE.Scene();
    const initialPal = CONDITION_PALETTES[conditionRef.current] || CONDITION_PALETTES.Sunny;
    scene.background = new THREE.Color(initialPal.skyTop);
    scene.fog = new THREE.FogExp2(initialPal.fogColor, initialPal.fogDensity);

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 140);
    camera.position.set(0, 2.2, 13.5);
    camera.lookAt(0, 1.0, -6);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // Studio Environment Map (RoomEnvironment + PMREMGenerator)
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      pmremGenerator.dispose();
    } catch {
      return;
    }

    // -----------------------------------------------------------------------
    // 2. LIGHTING RIG (Warm/Cool Key + Hemisphere + Lightning PointLight)
    // -----------------------------------------------------------------------
    const hemiLight = new THREE.HemisphereLight(
      initialPal.skyTop,
      initialPal.terrainColor,
      initialPal.hemiIntensity
    );
    hemiLight.position.set(0, 35, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(
      initialPal.keyLightColor,
      initialPal.keyLightIntensity
    );
    keyLight.position.set(12, 18, 8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 60;
    const d = 18;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-14, 10, -10);
    scene.add(rimLight);

    const lightningLight = new THREE.PointLight(0xa5f3fc, 0, 65, 1.5);
    lightningLight.position.set(0, 11, -6);
    scene.add(lightningLight);

    // -----------------------------------------------------------------------
    // 3. 3D SKY DOME WITH VERTICAL ATMOSPHERIC GRADIENT SHADER
    // -----------------------------------------------------------------------
    const skyGeo = new THREE.SphereGeometry(75, 32, 24);
    const skyUniforms = {
      uTopColor: { value: new THREE.Color(initialPal.skyTop) },
      uBottomColor: { value: new THREE.Color(initialPal.skyBottom) },
      uTime: { value: 0 },
      uAuroraStrength: { value: initialPal.auroraVisible ? 1.0 : 0.0 },
    };
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: skyUniforms,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform float uTime;
        uniform float uAuroraStrength;
        varying vec3 vWorldPos;
        void main() {
          float h = clamp((normalize(vWorldPos).y + 0.15) * 1.15, 0.0, 1.0);
          vec3 col = mix(uBottomColor, uTopColor, pow(h, 0.75));
          if (uAuroraStrength > 0.01) {
            float wave = sin(vWorldPos.x * 0.14 + uTime * 1.2) * cos(vWorldPos.z * 0.12 - uTime * 0.8);
            float ribbon = smoothstep(0.15, 0.55, h) * smoothstep(0.88, 0.45, h);
            vec3 auroraCol = mix(vec3(0.06, 0.92, 0.65), vec3(0.68, 0.28, 0.98), 0.5 + 0.5 * sin(uTime * 0.5 + vWorldPos.x * 0.08));
            col += auroraCol * ribbon * (0.45 + 0.45 * wave) * uAuroraStrength;
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // -----------------------------------------------------------------------
    // 4. 3D SCULPTED TERRAIN HORIZON & COMPOSITE WEATHER OBSERVATORY BEACON
    //    (Powered by Rust/Wasm `computeTerrainHeightRust` heightfield kernel)
    // -----------------------------------------------------------------------
    const terrainGeo = new THREE.PlaneGeometry(64, 42, 56, 36);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i) - 10;
      const vy = computeTerrainHeightRust(vx, vz);
      posAttr.setY(i, vy);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: initialPal.terrainColor,
      roughness: 0.72,
      metalness: 0.18,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.position.set(0, -3.6, -12);
    terrainMesh.receiveShadow = !isSoftwareGl;
    scene.add(terrainMesh);

    // Reflective Water / Atmospheric Basin Plane
    const waterGeo = new THREE.PlaneGeometry(64, 42);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.75,
      clearcoat: 0.9,
      transparent: true,
      opacity: 0.72,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(0, -4.15, -12);
    scene.add(waterMesh);

    // 5-Part Composite 3D Weather Observatory Spire on the right ridge
    const observatoryGroup = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.55,
      metalness: 0.65,
    });
    const accentMetalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.9,
    });
    const beaconGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });

    const obsBase = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.25, 1.4, 8), baseMat);
    obsBase.position.y = 0.7;
    observatoryGroup.add(obsBase);

    const obsTower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.75, 2.2, 8), accentMetalMat);
    obsTower.position.y = 2.5;
    observatoryGroup.add(obsTower);

    const obsRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.08, 12, 24), beaconGlowMat);
    obsRing.rotation.x = Math.PI / 2;
    obsRing.position.y = 3.2;
    observatoryGroup.add(obsRing);

    const obsCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), beaconGlowMat);
    obsCore.position.y = 3.95;
    observatoryGroup.add(obsCore);

    const obsSpire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.3, 8), accentMetalMat);
    obsSpire.position.y = 4.8;
    observatoryGroup.add(obsSpire);

    const ridgeX = 7.5;
    const ridgeZ = -11.5;
    const ridgeY = -3.6 + computeTerrainHeightRust(ridgeX, ridgeZ + 2);
    observatoryGroup.position.set(ridgeX, ridgeY, ridgeZ);
    scene.add(observatoryGroup);

    // -----------------------------------------------------------------------
    // 5. 3D CELESTIAL SUN & CORONA RINGS GROUP
    // -----------------------------------------------------------------------
    const sunGroup = new THREE.Group();
    sunGroup.position.set(8.5, 6.8, -16);

    const sunCoreMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xf59e0b,
      emissiveIntensity: 3.2,
      roughness: 0.1,
    });
    const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2.1, 32, 32), sunCoreMat);
    sunGroup.add(sunSphere);

    const coronaRingMat1 = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const coronaRing1 = new THREE.Mesh(new THREE.RingGeometry(2.45, 3.25, 36), coronaRingMat1);
    sunGroup.add(coronaRing1);

    const coronaRingMat2 = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const coronaRing2 = new THREE.Mesh(new THREE.RingGeometry(3.5, 4.7, 6), coronaRingMat2);
    sunGroup.add(coronaRing2);

    scene.add(sunGroup);

    // -----------------------------------------------------------------------
    // 6. VOLUMETRIC 3D MULTI-PUFF CLOUD CLUSTERS (14 Composite 3D Clouds)
    // -----------------------------------------------------------------------
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: initialPal.cloudColor,
      emissive: initialPal.cloudEmissive,
      emissiveIntensity: 0.35,
      roughness: 0.88,
      metalness: 0.04,
    });

    const puffGeo = new THREE.DodecahedronGeometry(1.0, 2);
    interface CloudClusterData {
      group: THREE.Group;
      baseX: number;
      baseY: number;
      baseZ: number;
      speed: number;
      bobPhase: number;
    }
    const cloudClusters: CloudClusterData[] = [];

    for (let c = 0; c < 14; c++) {
      const cGroup = new THREE.Group();
      const puffCount = 5 + (c % 4);
      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(puffGeo, cloudMaterial);
        const offsetX = (p - puffCount / 2) * 0.95 + Math.sin(c * 3 + p) * 0.3;
        const offsetY = Math.cos(p * 1.4) * 0.38;
        const offsetZ = Math.sin(p * 2.1) * 0.45;
        const scale = 0.75 + Math.sin(p * 0.9 + c) * 0.35;
        puff.position.set(offsetX, offsetY, offsetZ);
        puff.scale.set(scale * 1.25, scale * 0.82, scale);
        puff.castShadow = !isSoftwareGl;
        puff.receiveShadow = !isSoftwareGl;
        cGroup.add(puff);
      }

      const bx = -22 + ((c * 3.7) % 44);
      const by = 3.2 + (c % 4) * 1.35;
      const bz = -5.5 - (c % 5) * 3.2;
      cGroup.position.set(bx, by, bz);
      const overallScale = 0.85 + (c % 3) * 0.28;
      cGroup.scale.setScalar(overallScale);
      scene.add(cGroup);

      cloudClusters.push({
        group: cGroup,
        baseX: bx,
        baseY: by,
        baseZ: bz,
        speed: 0.45 + (c % 5) * 0.18,
        bobPhase: c * 0.85,
      });
    }

    // -----------------------------------------------------------------------
    // 7. 3D INSTANCED PRECIPITATION SYSTEM (Rain Streaks / Snow Crystals / Cosmic Stars)
    //    Updated each frame via Rust/Wasm `rust_step_particle_y`
    // -----------------------------------------------------------------------
    const PARTICLE_COUNT = 320;
    const precipGeo = new THREE.OctahedronGeometry(0.08, 0);
    const precipMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.82,
    });
    const precipInstanced = new THREE.InstancedMesh(precipGeo, precipMat, PARTICLE_COUNT);
    precipInstanced.frustumCulled = false;

    const pX = new Float32Array(PARTICLE_COUNT);
    const pY = new Float32Array(PARTICLE_COUNT);
    const pZ = new Float32Array(PARTICLE_COUNT);
    const pSpeed = new Float32Array(PARTICLE_COUNT);
    const pPhase = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pX[i] = (rustCore.rust_hash_noise_2d(i, 11) - 0.5) * 32;
      pY[i] = (rustCore.rust_hash_noise_2d(i, 29) - 0.2) * 18;
      pZ[i] = -18 + rustCore.rust_hash_noise_2d(i, 47) * 22;
      pSpeed[i] = 1.0 + rustCore.rust_hash_noise_2d(i, 73) * 1.2;
      pPhase[i] = rustCore.rust_hash_noise_2d(i, 97) * Math.PI * 2;
    }

    scene.add(precipInstanced);

    // -----------------------------------------------------------------------
    // 8. 3D LIGHTNING BOLT GEOMETRY FOR THUNDERSTORM
    // -----------------------------------------------------------------------
    const boltPoints: THREE.Vector3[] = [];
    for (let s = 0; s <= 10; s++) {
      boltPoints.push(new THREE.Vector3(0, 9 - s * 1.3, -8));
    }
    const boltGeo = new THREE.BufferGeometry().setFromPoints(boltPoints);
    const boltMat = new THREE.LineBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0,
    });
    const boltLine = new THREE.Line(boltGeo, boltMat);
    scene.add(boltLine);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer parallax state
    let targetCamX = 0;
    let targetCamY = 2.2;
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetCamX = nx * 2.2;
      targetCamY = 2.2 - ny * 0.95;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Resize observer
    const onResize = () => {
      if (!container) return;
      const w = Math.max(320, container.clientWidth || 800);
      const h = Math.max(240, container.clientHeight || 600);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(container);

    // -----------------------------------------------------------------------
    // 9. ANIMATION LOOP (Software-WebGL Paced via afterDraw + Rust/Wasm Kernels)
    // -----------------------------------------------------------------------
    const clock = new THREE.Clock();
    let frameId = 0;
    let lightningTimer = 1.8;
    let lightningIntensity = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      const dt = Math.min(0.1, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      const activeCond = conditionRef.current;
      const pal = CONDITION_PALETTES[activeCond] || CONDITION_PALETTES.Sunny;
      const dampFactor = 1 - Math.exp(-3.5 * dt);

      // Smoothly transition sky, fog, lighting, and material colors
      _targetSkyTop.setHex(pal.skyTop);
      _targetSkyBottom.setHex(pal.skyBottom);
      _targetCloudColor.setHex(pal.cloudColor);
      _targetCloudEmissive.setHex(pal.cloudEmissive);
      _targetTerrainColor.setHex(pal.terrainColor);
      _targetKeyColor.setHex(pal.keyLightColor);

      skyUniforms.uTopColor.value.lerp(_targetSkyTop, dampFactor);
      skyUniforms.uBottomColor.value.lerp(_targetSkyBottom, dampFactor);
      skyUniforms.uTime.value = elapsed;
      skyUniforms.uAuroraStrength.value = rustCore.rust_lerp_damped(
        skyUniforms.uAuroraStrength.value,
        pal.auroraVisible ? 1.0 : 0.0,
        dampFactor
      );

      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(_targetSkyBottom, dampFactor);
        scene.fog.density = rustCore.rust_lerp_damped(
          scene.fog.density,
          pal.fogDensity,
          dampFactor
        );
      }

      cloudMaterial.color.lerp(_targetCloudColor, dampFactor);
      cloudMaterial.emissive.lerp(_targetCloudEmissive, dampFactor);
      terrainMat.color.lerp(_targetTerrainColor, dampFactor);
      keyLight.color.lerp(_targetKeyColor, dampFactor);
      keyLight.intensity = rustCore.rust_lerp_damped(
        keyLight.intensity,
        pal.keyLightIntensity,
        dampFactor
      );
      hemiLight.intensity = rustCore.rust_lerp_damped(
        hemiLight.intensity,
        pal.hemiIntensity,
        dampFactor
      );

      // Camera parallax via Rust/Wasm damping
      camera.position.x = rustCore.rust_lerp_damped(camera.position.x, targetCamX, dampFactor);
      camera.position.y = rustCore.rust_lerp_damped(camera.position.y, targetCamY, dampFactor);
      camera.lookAt(camera.position.x * 0.25, 1.1, -8);

      // Animate 3D Sun & Corona Rings
      const targetSunScale = pal.sunVisible ? 1.0 : 0.001;
      sunGroup.scale.setScalar(
        rustCore.rust_lerp_damped(sunGroup.scale.x, targetSunScale, dampFactor)
      );
      sunGroup.visible = sunGroup.scale.x > 0.02;
      coronaRing1.rotation.z = elapsed * 0.22;
      coronaRing2.rotation.z = -elapsed * 0.15;
      coronaRing1.lookAt(camera.position);
      coronaRing2.lookAt(camera.position);

      // Animate 3D Observatory Spire
      obsCore.rotation.y = elapsed * 1.4;
      obsRing.rotation.z = elapsed * 0.9;

      // Animate 3D Volumetric Clouds
      const windMultiplier =
        pal.precipMode === 'storm' ? 2.4 : pal.precipMode === 'rain' ? 1.6 : 1.0;
      for (let i = 0; i < cloudClusters.length; i++) {
        const cl = cloudClusters[i];
        cl.baseX += cl.speed * windMultiplier * dt;
        if (cl.baseX > 24) cl.baseX = -24;
        cl.group.position.x = cl.baseX;
        cl.group.position.y = cl.baseY + Math.sin(elapsed * 0.9 + cl.bobPhase) * 0.22;
      }

      // Animate 3D Lightning Bolts for Thunderstorm
      if (pal.precipMode === 'storm') {
        lightningTimer -= dt;
        if (lightningTimer <= 0) {
          lightningTimer = 1.6 + Math.random() * 2.8;
          lightningIntensity = 18.0;
          const strikeX = (Math.random() - 0.5) * 16;
          lightningLight.position.set(strikeX, 7.5, -7);
          const pos = boltGeo.attributes.position;
          let curX = strikeX;
          for (let s = 0; s <= 10; s++) {
            pos.setXYZ(s, curX, 9.5 - s * 1.35, -7.5);
            curX += (Math.random() - 0.5) * 1.4;
          }
          pos.needsUpdate = true;
        }
      }
      lightningIntensity = Math.max(0, lightningIntensity - dt * 48);
      lightningLight.intensity = lightningIntensity;
      boltMat.opacity = Math.min(1, lightningIntensity / 10);

      // Animate 3D Precipitation (Rain / Storm / Snow / Cosmic) via Rust/Wasm kernel
      if (pal.precipMode === 'none') {
        precipInstanced.visible = false;
      } else {
        precipInstanced.visible = true;
        const isRain = pal.precipMode === 'rain' || pal.precipMode === 'storm';
        const isSnow = pal.precipMode === 'snow';
        const baseSpeed =
          pal.precipMode === 'storm'
            ? 22.0
            : isRain
            ? 16.5
            : isSnow
            ? 2.8
            : 0.8;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          pY[i] = rustCore.rust_step_particle_y(
            pY[i],
            baseSpeed * pSpeed[i],
            dt,
            -4.2,
            12.5
          );

          const swayX = isSnow
            ? Math.sin(elapsed * 1.6 + pPhase[i]) * 0.85
            : isRain
            ? -0.65
            : Math.cos(elapsed * 0.7 + pPhase[i]) * 1.2;

          _dummy.position.set(pX[i] + swayX, pY[i], pZ[i]);
          if (isRain) {
            _dummy.rotation.set(0, 0, 0.14);
            _dummy.scale.set(0.22, 4.8, 0.22);
          } else if (isSnow) {
            _dummy.rotation.set(elapsed + pPhase[i], elapsed * 0.8, 0);
            _dummy.scale.set(1.15, 1.15, 1.15);
          } else {
            // Cosmic / Aurora floating particles
            _dummy.rotation.set(elapsed * 0.5, pPhase[i], 0);
            _dummy.scale.set(0.85, 0.85, 0.85);
          }
          _dummy.updateMatrix();
          precipInstanced.setMatrixAt(i, _dummy.matrix);
        }
        precipInstanced.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      resizeObs.disconnect();
      skyGeo.dispose();
      skyMat.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      waterGeo.dispose();
      waterMat.dispose();
      puffGeo.dispose();
      cloudMaterial.dispose();
      precipGeo.dispose();
      precipMat.dispose();
      boltGeo.dispose();
      boltMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}
    >
      {/* Dedicated Three.js WebGL Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Rust + Three.js Engine Telemetry Badge */}
      <div className="weather-map-hud absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-slate-950/75 border border-white/15 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5">
        <span>🦀 Rust/Wasm {wasmActive ? 'Active' : 'Ready'}</span>
        <span className="text-white/30">·</span>
        <span>Three.js 3D Sky ({condition})</span>
      </div>

      {/* Windshield Wiper Sweep Effect */}
      {enableWiper && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 origin-bottom w-3 h-[130%] bg-zinc-800 border-x border-zinc-600 shadow-[0_0_24px_rgba(56,189,248,0.45)] transition-all duration-700 ease-in-out ${
              wiperActive ? 'rotate-[72deg] opacity-95' : '-rotate-[72deg] opacity-0'
            }`}
          >
            <div className="absolute top-0 bottom-0 -right-1 w-1.5 bg-cyan-400/60 rounded-r" />
          </div>
        </div>
      )}
    </div>
  );
};
