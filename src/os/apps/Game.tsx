import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Icon } from '../Icon';
import { PuzzleGamesView } from './ExtraAppsSuite';

export type GameMode = 'velocity' | 'maze' | '2048' | 'snake' | 'breaker' | 'gameboy' | 'puzzles';

interface GameAppProps {
  initialTab?: string;
  payload?: { gameId?: string };
}

function mapPayloadToMode(gameId?: string): GameMode {
  if (!gameId || gameId === 'game') return 'velocity';
  if (['minesweeper', 'tictactoe', 'memory', 'typing', 'sudoku', 'puzzles'].some((k) => gameId.includes(k))) {
    return 'puzzles';
  }
  if (gameId.includes('2048')) return '2048';
  if (gameId.includes('snake')) return 'snake';
  if (gameId.includes('maze')) return 'maze';
  if (gameId.includes('breaker') || gameId.includes('brick')) return 'breaker';
  if (gameId.includes('gameboy') || gameId.includes('gb') || gameId.includes('rom')) return 'gameboy';
  return 'velocity';
}

interface Weapon {
  type: 'gun' | 'spear' | 'sword';
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  name: string;
  damage: number;
  range: number;
}

export function GameApp({ initialTab, payload }: GameAppProps) {
  const effectiveGameId = payload?.gameId || initialTab;
  const [mode, setMode] = useState<GameMode>(() => mapPayloadToMode(effectiveGameId));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const initialMode = mapPayloadToMode(effectiveGameId);
    return Number(localStorage.getItem(`game_high_${initialMode}`) || '0');
  });
  const [speedGauge, setSpeedGauge] = useState(120);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game Boy state
  const [gbRom, setGbRom] = useState<'tetris' | 'space' | 'mario' | 'custom'>('tetris');
  const [customRomName, setCustomRomName] = useState<string>('');

  // FPS RPG Maze state
  const [rpgFloor, setRpgFloor] = useState(1);
  const [rpgHp, setRpgHp] = useState(100);
  const [rpgMaxHp, setRpgMaxHp] = useState(100);
  const [rpgXp, setRpgXp] = useState(0);
  const [rpgXpNext, setRpgXpNext] = useState(100);
  const [rpgCharLevel, setRpgCharLevel] = useState(1);
  const [rpgAtk, setRpgAtk] = useState(20);
  const [equippedWeapon, setEquippedWeapon] = useState<Weapon>({
    type: 'sword',
    rarity: 'Common',
    name: '錆びた剣 (Common Sword)',
    damage: 25,
    range: 2.2,
  });
  const [inventory] = useState<Weapon[]>([
    { type: 'sword', rarity: 'Common', name: '錆びた剣 (Common Sword)', damage: 25, range: 2.2 },
    { type: 'spear', rarity: 'Rare', name: 'スチール槍 (Rare Spear)', damage: 45, range: 3.8 },
    { type: 'gun', rarity: 'Epic', name: 'プラズマ銃 (Epic Gun)', damage: 75, range: 8.0 },
  ]);

  // Sync high score on mode switch
  useEffect(() => {
    setHighScore(Number(localStorage.getItem(`game_high_${mode}`) || '0'));
  }, [mode]);

  const updateScore = useCallback(
    (newScore: number) => {
      setScore(newScore);
      setHighScore((prev) => {
        if (newScore > prev) {
          try {
            localStorage.setItem(`game_high_${mode}`, String(newScore));
          } catch {
            // ignore
          }
          return newScore;
        }
        return prev;
      });
    },
    [mode]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (effectiveGameId) {
      setMode(mapPayloadToMode(effectiveGameId));
    }
  }, [effectiveGameId]);

  const controlsRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
    action: false,
  });

  const playSound = useCallback(
    (type: 'boost' | 'crash' | 'score' | 'hum' | 'attack' | 'levelup') => {
      if (!soundEnabled) return;
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'boost') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(280, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === 'crash' || type === 'attack') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(type === 'attack' ? 320 : 140, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.45);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.45);
          osc.start(now);
          osc.stop(now + 0.45);
        } else if (type === 'score' || type === 'levelup') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.07);
          osc.frequency.setValueAtTime(783.99, now + 0.14);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
        }
      } catch {
        // Ignore audio context autoplay block
      }
    },
    [soundEnabled]
  );

  const setControl = (key: 'left' | 'right' | 'up' | 'down' | 'boost' | 'action', state: boolean) => {
    controlsRef.current[key] = state;
  };

  // =============================================================
  // 1. Slope-style Smooth Downhill Gliding Racer (Velocity 3D)
  // =============================================================
  const initVelocityRacer = (container: HTMLDivElement) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.012);

    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 3.5, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Slope Ball / Glider
    const ballGeo = new THREE.SphereGeometry(0.7, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, 1, 0);
    scene.add(ball);

    // Downhill Slope Track
    const trackWidth = 16;
    const segmentLength = 30;
    const trackSegments: THREE.Group[] = [];
    const totalSegments = 18;

    const trackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });

    for (let i = 0; i < totalSegments; i++) {
      const segGroup = new THREE.Group();
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(trackWidth, segmentLength), trackMat);
      floor.rotation.x = -Math.PI / 2 - 0.12; // Downhill slope angle
      segGroup.add(floor);

      const leftNeon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, segmentLength), glowMat);
      leftNeon.position.set(-trackWidth / 2, 0.1, 0);
      segGroup.add(leftNeon);

      const rightNeon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, segmentLength), glowMat);
      rightNeon.position.set(trackWidth / 2, 0.1, 0);
      segGroup.add(rightNeon);

      segGroup.position.z = -i * segmentLength;
      segGroup.position.y = -i * 2.5; // Slope downward
      scene.add(segGroup);
      trackSegments.push(segGroup);
    }

    // Obstacles & Gems
    interface EntityItem {
      mesh: THREE.Mesh;
      type: 'obstacle' | 'gem';
      box: THREE.Box3;
    }
    const entities: EntityItem[] = [];
    const obsGeo = new THREE.BoxGeometry(2.5, 1.2, 1.2);
    const obsMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.6 });
    const gemGeo = new THREE.OctahedronGeometry(0.6);
    const gemMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 1.2 });
    const lanes = [-5, -2.5, 0, 2.5, 5];

    const spawnEntity = (zPos: number, yPos: number) => {
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      const isGem = Math.random() > 0.4;
      if (isGem) {
        const m = new THREE.Mesh(gemGeo, gemMat);
        m.position.set(lane, yPos + 1, zPos);
        scene.add(m);
        entities.push({ mesh: m, type: 'gem', box: new THREE.Box3() });
      } else {
        const m = new THREE.Mesh(obsGeo, obsMat);
        m.position.set(lane, yPos + 0.8, zPos);
        scene.add(m);
        entities.push({ mesh: m, type: 'obstacle', box: new THREE.Box3() });
      }
    };

    for (let z = -40; z > -350; z -= 25) {
      spawnEntity(z, z * 0.08);
    }

    const keys: Record<string, boolean> = {};
    const onDown = (e: KeyboardEvent) => { keys[e.code] = true; };
    const onUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    let ballX = 0;
    let currentDistance = 0;
    let slopeSpeed = 1.6;
    let upgradeLevel = 1;
    const ballBox = new THREE.Box3();

    const animate = () => {
      gameLoopRef.current = requestAnimationFrame(animate);

      const steer = 0.22;
      if (keys['ArrowLeft'] || keys['KeyA'] || controlsRef.current.left) {
        ballX = Math.max(-trackWidth / 2 + 1, ballX - steer);
      }
      if (keys['ArrowRight'] || keys['KeyD'] || controlsRef.current.right) {
        ballX = Math.min(trackWidth / 2 - 1, ballX + steer);
      }

      // Distance-based progressive upgrade (Slope style)
      currentDistance += slopeSpeed;
      const calculatedUpgrade = Math.floor(currentDistance / 600) + 1;
      if (calculatedUpgrade > upgradeLevel) {
        upgradeLevel = calculatedUpgrade;
        slopeSpeed += 0.25;
        playSound('levelup');
      }
      setSpeedGauge(Math.round(slopeSpeed * 100));

      ball.position.x = ballX;
      ball.rotation.x -= slopeSpeed * 0.1;
      ball.rotation.y += 0.03;

      trackSegments.forEach((seg) => {
        seg.position.z += slopeSpeed;
        if (seg.position.z > segmentLength * 2) {
          seg.position.z -= totalSegments * segmentLength;
          seg.position.y -= totalSegments * 2.5;
        }
      });

      ballBox.setFromObject(ball);

      for (let i = entities.length - 1; i >= 0; i--) {
        const ent = entities[i];
        ent.mesh.position.z += slopeSpeed;
        if (ent.type === 'gem') ent.mesh.rotation.y += 0.05;
        ent.box.setFromObject(ent.mesh);

        if (ballBox.intersectsBox(ent.box)) {
          if (ent.type === 'gem') {
            currentDistance += 200;
            updateScore(Math.round(currentDistance));
            playSound('score');
            scene.remove(ent.mesh);
            entities.splice(i, 1);
            continue;
          } else {
            playSound('crash');
            setGameOver(true);
            cancelAnimationFrame(gameLoopRef.current);
            return;
          }
        }

        if (ent.mesh.position.z > 12) {
          scene.remove(ent.mesh);
          entities.splice(i, 1);
          spawnEntity(-300, -300 * 0.08);
        }
      }

      const finalScore = Math.round(currentDistance);
      setScore(finalScore);
      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem(`game_high_${mode}`, finalScore.toString());
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  };

  // =============================================================
  // 2. FPS RPG Dungeon Crawler Maze Engine (3D Cosmic Maze)
  // =============================================================
  const initMaze = (container: HTMLDivElement) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.08);

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(1.5, 0.8, 1.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x38bdf8, 0.6));
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 15);
    pointLight.position.set(0, 1, 0);
    camera.add(pointLight);
    scene.add(camera);

    const gridSize = 13;
    const cellSize = 3;
    const halfGrid = (gridSize * cellSize) / 2;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(gridSize * cellSize, gridSize * cellSize),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(gridSize * cellSize, gridSize * cellSize),
      new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 2.5;
    scene.add(ceiling);

    const wallGeo = new THREE.BoxGeometry(cellSize, 3, cellSize);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.4 });
    const walls: THREE.Box3[] = [];

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const isBorder = r === 0 || r === gridSize - 1 || c === 0 || c === gridSize - 1;
        const isInternalWall = r % 2 === 0 && c % 2 === 0 && Math.random() > 0.3;
        const isStart = r === 1 && c === 1;

        if ((isBorder || isInternalWall) && !isStart) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          const wx = c * cellSize - halfGrid + cellSize / 2;
          const wz = r * cellSize - halfGrid + cellSize / 2;
          wall.position.set(wx, 1, wz);
          scene.add(wall);
          walls.push(new THREE.Box3().setFromObject(wall));
        }
      }
    }

    interface Enemy {
      mesh: THREE.Mesh;
      hp: number;
      maxHp: number;
      atk: number;
      name: string;
      rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
      xpValue: number;
      alive: boolean;
    }
    const enemies: Enemy[] = [];
    const enemyGeo = new THREE.BoxGeometry(1, 1.6, 1);
    const rarities: ('Common' | 'Rare' | 'Epic' | 'Legendary')[] = ['Common', 'Rare', 'Epic', 'Legendary'];
    const rarityColors = { Common: 0x94a3b8, Rare: 0x38bdf8, Epic: 0xa855f7, Legendary: 0xf59e0b };

    for (let i = 0; i < 6; i++) {
      const rarity = rarities[Math.floor(Math.random() * rarities.length)];
      const mat = new THREE.MeshStandardMaterial({ color: rarityColors[rarity], emissive: rarityColors[rarity], emissiveIntensity: 0.4 });
      const m = new THREE.Mesh(enemyGeo, mat);
      const ex = (Math.floor(Math.random() * (gridSize - 2)) + 1) * cellSize - halfGrid + cellSize / 2;
      const ez = (Math.floor(Math.random() * (gridSize - 2)) + 1) * cellSize - halfGrid + cellSize / 2;
      m.position.set(ex, 0.3, ez);
      scene.add(m);
      enemies.push({
        mesh: m,
        hp: 40 + rpgFloor * 25,
        maxHp: 40 + rpgFloor * 25,
        atk: 10 + rpgFloor * 5,
        name: `${rarity} Monster`,
        rarity,
        xpValue: 35 + rpgFloor * 15,
        alive: true,
      });
    }

    const keys: Record<string, boolean> = {};
    const onDown = (e: KeyboardEvent) => { keys[e.code] = true; };
    const onUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    let posX = 1.5;
    let posZ = 1.5;
    let yaw = 0;
    const moveSpeed = 0.08;
    const rotSpeed = 0.03;

    const attackEnemy = () => {
      playSound('attack');
      let hitAny = false;
      enemies.forEach((en) => {
        if (!en.alive) return;
        const dist = camera.position.distanceTo(en.mesh.position);
        if (dist <= equippedWeapon.range + 1.5) {
          hitAny = true;
          en.hp -= equippedWeapon.damage + rpgAtk;
          if (en.hp <= 0) {
            en.alive = false;
            scene.remove(en.mesh);
            const newXp = rpgXp + en.xpValue;
            setRpgXp(newXp);
            playSound('levelup');
            if (newXp >= rpgXpNext) {
              setRpgCharLevel((l) => l + 1);
              setRpgXp(0);
              setRpgXpNext((n) => Math.round(n * 1.4));
              setRpgMaxHp((h) => h + 25);
              setRpgHp((h) => h + 25);
              setRpgAtk((a) => a + 12);
            }
            if (enemies.every((e) => !e.alive)) {
              setRpgFloor((f) => f + 1);
            }
          }
        }
      });
      if (hitAny) {
        setScore((s) => s + 150);
      }
    };

    const loop = () => {
      gameLoopRef.current = requestAnimationFrame(loop);

      if (keys['ArrowLeft'] || keys['KeyA']) yaw += rotSpeed;
      if (keys['ArrowRight'] || keys['KeyD']) yaw -= rotSpeed;

      let dx = 0;
      let dz = 0;
      if (keys['ArrowUp'] || keys['KeyW'] || controlsRef.current.up) {
        dx += Math.sin(yaw) * moveSpeed;
        dz += Math.cos(yaw) * moveSpeed;
      }
      if (keys['ArrowDown'] || keys['KeyS'] || controlsRef.current.down) {
        dx -= Math.sin(yaw) * moveSpeed;
        dz -= Math.cos(yaw) * moveSpeed;
      }

      if (controlsRef.current.action) {
        controlsRef.current.action = false;
        attackEnemy();
      }

      const nextX = posX + dx;
      const nextZ = posZ + dz;
      const playerBox = new THREE.Box3(
        new THREE.Vector3(nextX - 0.3, 0, nextZ - 0.3),
        new THREE.Vector3(nextX + 0.3, 1.6, nextZ + 0.3)
      );

      let collide = false;
      for (const w of walls) {
        if (playerBox.intersectsBox(w)) {
          collide = true;
          break;
        }
      }

      if (!collide) {
        posX = nextX;
        posZ = nextZ;
      }

      camera.position.set(posX, 0.8, posZ);
      camera.rotation.y = yaw;

      renderer.render(scene, camera);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  };

  // 2048 state
  const [grid2048, setGrid2048] = useState<number[][]>(() => createInitial2048Grid());

  // 2048 logic & mount effect
  const move2048 = useCallback(
    (dir: 'left' | 'right' | 'up' | 'down') => {
      setGrid2048((prev) => {
        const next = prev.map((r) => [...r]);
        let moved = false;
        let gained = 0;

        const slideLine = (line: number[]) => {
          const filtered = line.filter((v) => v !== 0);
          const merged: number[] = [];
          for (let i = 0; i < filtered.length; i++) {
            if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
              const val = filtered[i] * 2;
              merged.push(val);
              gained += val;
              i++;
            } else {
              merged.push(filtered[i]);
            }
          }
          while (merged.length < 4) merged.push(0);
          return merged;
        };

        if (dir === 'left' || dir === 'right') {
          for (let r = 0; r < 4; r++) {
            const row = dir === 'left' ? next[r] : [...next[r]].reverse();
            const newRow = slideLine(row);
            if (dir === 'right') newRow.reverse();
            if (newRow.some((v, idx) => v !== next[r][idx])) moved = true;
            next[r] = newRow;
          }
        } else {
          for (let c = 0; c < 4; c++) {
            const col = [next[0][c], next[1][c], next[2][c], next[3][c]];
            if (dir === 'down') col.reverse();
            const newCol = slideLine(col);
            if (dir === 'down') newCol.reverse();
            for (let r = 0; r < 4; r++) {
              if (next[r][c] !== newCol[r]) moved = true;
              next[r][c] = newCol[r];
            }
          }
        }

        if (moved) {
          addRandomTile2048(next);
          if (gained > 0) {
            setScore((s) => s + gained);
            playSound('score');
          }
        }
        return moved ? next : prev;
      });
    },
    [playSound]
  );

  useEffect(() => {
    if (mode !== '2048') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') move2048('left');
      if (e.key === 'ArrowRight' || e.key === 'd') move2048('right');
      if (e.key === 'ArrowUp' || e.key === 'w') move2048('up');
      if (e.key === 'ArrowDown' || e.key === 's') move2048('down');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, move2048]);

  // Mount active game engine
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let cleanup: (() => void) | undefined;

    setGameOver(false);
    if (mode !== '2048' && mode !== 'gameboy') {
      setScore(0);
    }

    if (mode === 'velocity') {
      cleanup = initVelocityRacer(container);
    } else if (mode === 'maze') {
      cleanup = initMaze(container);
    } else if (mode === 'snake') {
      // snake
    } else if (mode === 'breaker') {
      // breaker
    } else if (mode === '2048') {
      setGrid2048(createInitial2048Grid());
    } else if (mode === 'gameboy') {
      cleanup = initGameBoy(container, gbRom === 'custom' ? customRomName || 'Custom ROM' : gbRom);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [mode, gameOver, gbRom, customRomName]);

  const initGameBoy = (container: HTMLDivElement, rom: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 144;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.imageRendering = 'pixelated';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    let px = 80;
    const py = 120;
    let scoreVal = 0;
    let ticks = 0;
    const bullets: { x: number; y: number }[] = [];
    const enemies: { x: number; y: number; active: boolean }[] = [];
    for (let i = 0; i < 5; i++) {
      enemies.push({ x: 20 + i * 28, y: 30 + (i % 2) * 15, active: true });
    }

    const keys: Record<string, boolean> = {};
    const onDown = (e: KeyboardEvent) => { keys[e.code] = true; };
    const onUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    const loop = () => {
      gameLoopRef.current = requestAnimationFrame(loop);
      ticks++;

      if (keys['ArrowLeft'] || keys['KeyA'] || controlsRef.current.left) px = Math.max(10, px - 2);
      if (keys['ArrowRight'] || keys['KeyD'] || controlsRef.current.right) px = Math.min(150, px + 2);
      if ((keys['Space'] || keys['KeyJ'] || controlsRef.current.boost) && ticks % 15 === 0) {
        bullets.push({ x: px, y: py - 6 });
        playSound('boost');
      }

      ctx.fillStyle = '#9bbc0f';
      ctx.fillRect(0, 0, 160, 144);

      ctx.fillStyle = '#0f380f';
      ctx.font = '8px monospace';
      ctx.fillText(`ROM:${rom.toUpperCase()} SC:${scoreVal}`, 6, 12);

      ctx.fillStyle = '#0f380f';
      ctx.fillRect(px - 6, py - 4, 12, 6);
      ctx.fillRect(px - 2, py - 8, 4, 4);

      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= 3;
        ctx.fillRect(bullets[i].x - 1, bullets[i].y, 2, 4);
        if (bullets[i].y < 0) bullets.splice(i, 1);
      }

      enemies.forEach((en) => {
        if (!en.active) return;
        en.x += Math.sin(ticks / 20) * 0.6;
        ctx.fillRect(en.x - 6, en.y - 4, 12, 8);

        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          if (Math.abs(b.x - en.x) < 8 && Math.abs(b.y - en.y) < 6) {
            en.active = false;
            bullets.splice(i, 1);
            scoreVal += 100;
            updateScore(scoreVal);
            playSound('score');
            setTimeout(() => { en.active = true; }, 3000);
          }
        }
      });
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  };

  const GAME_TABS: { id: GameMode; label: string; icon: string }[] = [
    { id: 'velocity', label: 'Slope Glider', icon: 'Flame' },
    { id: 'maze', label: 'FPS RPG Maze', icon: 'Compass' },
    { id: '2048', label: '2048', icon: 'LayoutGrid' },
    { id: 'puzzles', label: 'パズル・タイピング', icon: 'Grid3x3' },
    { id: 'gameboy', label: 'Game Boy', icon: 'Gamepad2' },
  ];

  return (
    <div className="flex h-full w-full select-none flex-col bg-slate-950 text-white relative touch-none">
      {/* Top Game Switcher Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 text-xs backdrop-blur-md shrink-0 z-20 gap-2 overflow-x-auto">
        <div className="flex items-center gap-4 shrink-0">
          {GAME_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`flex items-center gap-1.5 border-b-2 py-2.5 font-medium transition-colors ${
                mode === t.id
                  ? 'border-sky-400 text-sky-300 font-semibold'
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              <Icon name={t.icon} size={13} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3.5 font-mono text-xs shrink-0">
          {mode === 'velocity' && (
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-white/50">SPEED</span>
              <span className="font-bold text-sky-400">{speedGauge} km/h</span>
            </div>
          )}
          {mode === 'maze' && (
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-bold">LV.{rpgCharLevel}</span>
              <span className="text-cyan-300 font-bold">F{rpgFloor}</span>
              <span className="text-emerald-400">HP {rpgHp}/{rpgMaxHp}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-white/50">SCORE</span>
            <span className="font-bold text-emerald-400">{score}</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white/80 transition"
            title="サウンド切替"
          >
            <Icon name={soundEnabled ? 'Volume2' : 'VolumeX'} size={14} />
          </button>
        </div>
      </div>

      {/* Main Game Viewport */}
      <div className="relative flex-1 overflow-hidden min-h-0 min-w-0 flex items-center justify-center" ref={containerRef}>
        {/* FPS RPG Maze HUD overlay */}
        {mode === 'maze' && (
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
            <div className="glass-panel p-3 rounded-2xl flex flex-col gap-1 pointer-events-auto">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>⚔️ {equippedWeapon.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">{equippedWeapon.rarity}</span>
              </div>
              <div className="text-[10px] text-white/70">ダメージ: {equippedWeapon.damage + rpgAtk} · 射程: {equippedWeapon.range}m</div>
              <div className="flex gap-1 mt-1">
                {inventory.map((w, idx) => (
                  <button
                    key={idx}
                    onClick={() => setEquippedWeapon(w)}
                    className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition ${equippedWeapon.name === w.name ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white'}`}
                  >
                    {w.type}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-3 rounded-2xl flex flex-col gap-1 pointer-events-auto text-right">
              <div className="text-xs font-bold text-emerald-300">XP: {rpgXp} / {rpgXpNext}</div>
              <div className="text-[10px] text-white/70">W / A / S / D または 矢印キーで移動</div>
              <button
                onClick={() => setControl('action', true)}
                className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs shadow-lg active:scale-95 pointer-events-auto"
              >
                ⚔️ 攻撃する (Action)
              </button>
            </div>
          </div>
        )}

        {/* 2048 3D Liquid Glass UI */}
        {mode === '2048' && (
          <div className="flex flex-col items-center gap-5 p-4 z-10">
            <div className="grid grid-cols-4 gap-3 p-4 rounded-3xl glass-panel border border-white/15 shadow-2xl">
              {grid2048.flat().map((val, idx) => (
                <div
                  key={idx}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-extrabold text-lg sm:text-2xl transition-all ${
                    val === 0
                      ? 'bg-white/[0.03] text-transparent'
                      : val <= 4
                      ? 'glass-jelly text-white'
                      : val <= 32
                      ? 'glass-jelly text-sky-300 ring-1 ring-sky-400/40'
                      : 'glass-jelly text-amber-300 ring-1 ring-amber-400/50'
                  }`}
                >
                  {val || ''}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => move2048('left')} className="px-4 py-2 rounded-xl glass-jelly text-xs">
                ←
              </button>
              <div className="flex flex-col gap-2">
                <button onClick={() => move2048('up')} className="px-4 py-2 rounded-xl glass-jelly text-xs">
                  ↑
                </button>
                <button onClick={() => move2048('down')} className="px-4 py-2 rounded-xl glass-jelly text-xs">
                  ↓
                </button>
              </div>
              <button onClick={() => move2048('right')} className="px-4 py-2 rounded-xl glass-jelly text-xs">
                →
              </button>
              <button
                onClick={() => {
                  setScore(0);
                  setGrid2048(createInitial2048Grid());
                }}
                className="ml-3 px-4 py-2 rounded-xl glass-jelly text-xs text-sky-300 font-semibold"
              >
                リセット
              </button>
            </div>
          </div>
        )}

        {/* Puzzle & Typing Suite */}
        {mode === 'puzzles' && (
          <div className="absolute inset-0 z-20 bg-slate-950 overflow-hidden">
            <PuzzleGamesView
              initialGame={
                effectiveGameId && ['minesweeper', 'tictactoe', 'memory', 'typing', 'sudoku'].includes(effectiveGameId)
                  ? (effectiveGameId as 'minesweeper' | 'tictactoe' | 'memory' | 'typing' | 'sudoku')
                  : undefined
              }
            />
          </div>
        )}

        {/* Game Boy Handheld UI */}
        {mode === 'gameboy' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 p-6 backdrop-blur-2xl">
            <div className="bg-[#8b9bb4] p-6 rounded-[36px] shadow-2xl border-4 border-[#6c7d93] flex flex-col items-center max-w-sm w-full">
              <div className="text-[10px] font-mono tracking-widest text-[#2d3748] mb-1 font-bold">NINTENDO GAME BOY · DMG-01</div>
              <div className="bg-[#9bbc0f] p-3 rounded-2xl border-4 border-[#306230] shadow-inner w-full h-48 relative overflow-hidden flex items-center justify-center">
                <div ref={containerRef} className="w-full h-full relative" />
              </div>
              <div className="w-full flex items-center justify-between mt-6 px-4">
                <div className="relative w-20 h-20">
                  <button onPointerDown={() => setControl('left', true)} onPointerUp={() => setControl('left', false)} className="absolute left-0 top-6 w-6 h-8 bg-[#2d3748] rounded-l text-[10px] text-white flex items-center justify-center">◀</button>
                  <button onPointerDown={() => setControl('right', true)} onPointerUp={() => setControl('right', false)} className="absolute right-0 top-6 w-6 h-8 bg-[#2d3748] rounded-r text-[10px] text-white flex items-center justify-center">▶</button>
                  <button onPointerDown={() => setControl('up', true)} onPointerUp={() => setControl('up', false)} className="absolute left-6 top-0 w-8 h-6 bg-[#2d3748] rounded-t text-[10px] text-white flex items-center justify-center">▲</button>
                  <button onPointerDown={() => setControl('down', true)} onPointerUp={() => setControl('down', false)} className="absolute left-6 bottom-0 w-8 h-6 bg-[#2d3748] rounded-b text-[10px] text-white flex items-center justify-center">▼</button>
                </div>
                <div className="flex items-center gap-3">
                  <button onPointerDown={() => setControl('boost', true)} onPointerUp={() => setControl('boost', false)} className="w-10 h-10 rounded-full bg-[#8b0000] text-white font-bold text-xs shadow-md active:scale-95 flex items-center justify-center">B</button>
                  <button onPointerDown={() => setControl('boost', true)} onPointerUp={() => setControl('boost', false)} className="w-10 h-10 rounded-full bg-[#8b0000] text-white font-bold text-xs shadow-md active:scale-95 flex items-center justify-center">A</button>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 w-full pt-3 border-t border-[#6c7d93]">
                {(['tetris', 'space', 'mario'] as const).map((r) => (
                  <button key={r} onClick={() => setGbRom(r)} className={`px-2.5 py-1 rounded text-xs uppercase font-bold transition ${gbRom === r ? 'bg-[#306230] text-white' : 'bg-[#2d3748] text-white/80'}`}>
                    {r}
                  </button>
                ))}
                <label className="px-2.5 py-1 rounded bg-[#2d3748] text-white text-xs font-bold cursor-pointer hover:bg-[#3d4b60]">
                  <span>📁 ROM Drop</span>
                  <input type="file" accept=".gb,.rom" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setCustomRomName(f.name);
                      setGbRom('custom');
                    }
                  }} />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Touch Controls for Slope Glider */}
        {mode === 'velocity' && (
          <div className="absolute inset-x-6 bottom-6 z-20 flex items-center justify-between pointer-events-none">
            <button
              onPointerDown={(e) => { e.preventDefault(); setControl('left', true); }}
              onPointerUp={() => setControl('left', false)}
              className="w-16 h-16 rounded-2xl glass-jelly flex items-center justify-center text-sky-300 pointer-events-auto"
            >
              <Icon name="ChevronLeft" size={28} />
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); setControl('right', true); }}
              onPointerUp={() => setControl('right', false)}
              className="w-16 h-16 rounded-2xl glass-jelly flex items-center justify-center text-sky-300 pointer-events-auto"
            >
              <Icon name="ChevronRight" size={28} />
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 p-6 backdrop-blur-2xl">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">GAME OVER</div>
            <div className="mt-2 text-sm text-white/80">
              スコア: <span className="font-mono text-sky-300 font-bold">{score}</span>
            </div>
            <button
              onClick={() => setGameOver(false)}
              className="mt-6 flex items-center gap-2 rounded-2xl glass-jelly px-7 py-3 font-semibold text-white text-sm"
            >
              <Icon name="RotateCcw" size={16} /> もう一度プレイ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function addRandomTile2048(grid: number[][]) {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function createInitial2048Grid(): number[][] {
  const g = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  addRandomTile2048(g);
  addRandomTile2048(g);
  return g;
}
