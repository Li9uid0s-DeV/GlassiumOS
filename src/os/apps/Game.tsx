import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Icon } from '../Icon';
import { PuzzleGamesView } from './ExtraAppsSuite';

export type GameMode = 'velocity' | 'maze' | '2048' | 'puzzles' | 'gameboy';

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
  if (gameId.includes('maze')) return 'maze';
  if (gameId.includes('gameboy') || gameId.includes('gb') || gameId.includes('rom')) return 'gameboy';
  return 'velocity';
}

// =============================================================
// 3DMaze Types & Constants (50-Floor Roguelike)
// =============================================================
export type MazeDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'LUNATIC';

export type WeaponRarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Epic'
  | 'Exotic'
  | 'Legendary'
  | 'MYTHIC'
  | 'SECRET'
  | 'ETERNAL'
  | 'OG';

export interface MazeWeapon {
  id: string;
  name: string;
  rarity: WeaponRarity;
  damage: number;
  range: number;
  skillName?: string;
  skillDesc?: string;
  cooldownSec?: number;
}

export type MazeItemId =
  | 'neon_paint'
  | 'potion_s'
  | 'mapping_scroll'
  | 'potion_m'
  | 'safety_shoes'
  | 'potion_full'
  | 'time_clock'
  | 'direction_eye'
  | 'chrono_boost';

export interface MazeItemDef {
  id: MazeItemId;
  name: string;
  desc: string;
  icon: string;
}

export const MAZE_ITEMS: Record<MazeItemId, MazeItemDef> = {
  neon_paint: { id: 'neon_paint', name: 'ネオンペイント', desc: '現在地に光の目印を設置し迷子を防止', icon: '🎨' },
  potion_s: { id: 'potion_s', name: '小回復ポーション', desc: 'HPを35%回復する', icon: '🧪' },
  mapping_scroll: { id: 'mapping_scroll', name: 'マッピング・スクロール', desc: '現在階層の全マップ・階段・罠を可視化', icon: '📜' },
  potion_m: { id: 'potion_m', name: '中回復ポーション', desc: 'HPを65%回復する', icon: '⚗️' },
  safety_shoes: { id: 'safety_shoes', name: 'セーフティ・シューズ', desc: '落とし穴の即死(80%)を1回無効化し+1Fへ変換', icon: '🥾' },
  potion_full: { id: 'potion_full', name: '全回復ポーション', desc: 'HPを100%完全回復する', icon: '💖' },
  time_clock: { id: 'time_clock', name: 'タイム・クロック', desc: '制限時間を+120秒延長する', icon: '⏳' },
  direction_eye: { id: 'direction_eye', name: 'ディレクション・アイ', desc: '階段(出口)の方角と座標をハイライト', icon: '👁️' },
  chrono_boost: { id: 'chrono_boost', name: 'クロノ・ブースト', desc: '30秒間、移動速度と攻撃力が1.6倍に上昇', icon: '⚡' },
};

export type MazeAreaId = 'ground' | 'gracia' | 'void' | 'cyber' | 'core';

export interface MazeAreaTheme {
  id: MazeAreaId;
  name: string;
  jpName: string;
  badge: string;
  floorRange: string;
  fogColorHex: number;
  wallPrimary: string;
  wallSecondary: string;
  floorPrimary: string;
  uiBorder: string;
  uiBg: string;
  uiText: string;
  accentHex: string;
}

export function getAreaThemeForFloor(floor: number): MazeAreaTheme {
  if (floor <= 10) {
    return {
      id: 'ground',
      name: 'Ground',
      jpName: '1-10F 土の迷宮 (Ground)',
      badge: '🟢',
      floorRange: '1F - 10F',
      fogColorHex: 0x091912,
      wallPrimary: '#1e3a2f',
      wallSecondary: '#d97706',
      floorPrimary: '#14261d',
      uiBorder: 'border-emerald-500/40',
      uiBg: 'bg-emerald-950/75',
      uiText: 'text-emerald-300',
      accentHex: '#10b981',
    };
  }
  if (floor <= 20) {
    return {
      id: 'gracia',
      name: 'Gracia',
      jpName: '11-20F 水晶氷窟 (Gracia)',
      badge: '🔵',
      floorRange: '11F - 20F',
      fogColorHex: 0x061a2e,
      wallPrimary: '#0c4a6e',
      wallSecondary: '#67e8f9',
      floorPrimary: '#082f49',
      uiBorder: 'border-cyan-400/40',
      uiBg: 'bg-cyan-950/75',
      uiText: 'text-cyan-200',
      accentHex: '#06b6d4',
    };
  }
  if (floor <= 30) {
    return {
      id: 'void',
      name: 'Void Deep',
      jpName: '21-30F 深淵虚無 (Void Deep)',
      badge: '🟣',
      floorRange: '21F - 30F',
      fogColorHex: 0x05020a,
      wallPrimary: '#1e1035',
      wallSecondary: '#a855f7',
      floorPrimary: '#0d0618',
      uiBorder: 'border-purple-500/40',
      uiBg: 'bg-purple-950/80',
      uiText: 'text-purple-300',
      accentHex: '#a855f7',
    };
  }
  if (floor <= 40) {
    return {
      id: 'cyber',
      name: 'Neon Cyber',
      jpName: '31-40F 電脳回廊 (Neon Cyber)',
      badge: '💗',
      floorRange: '31F - 40F',
      fogColorHex: 0x16051f,
      wallPrimary: '#3b0764',
      wallSecondary: '#f43f5e',
      floorPrimary: '#1f0633',
      uiBorder: 'border-pink-500/45',
      uiBg: 'bg-fuchsia-950/75',
      uiText: 'text-pink-300',
      accentHex: '#ec4899',
    };
  }
  return {
    id: 'core',
    name: 'Inferno Core',
    jpName: '41-50F 灼熱炉心 (Inferno Core)',
    badge: '🔴',
    floorRange: '41F - 50F',
    fogColorHex: 0x1f0604,
    wallPrimary: '#450a0a',
    wallSecondary: '#f97316',
    floorPrimary: '#2a0808',
    uiBorder: 'border-red-500/50',
    uiBg: 'bg-red-950/80',
    uiText: 'text-orange-300',
    accentHex: '#ef4444',
  };
}

export function getFloorTimeLimitSeconds(floor: number): number {
  if (floor <= 5) return 20 * 60;
  if (floor <= 10) return 15 * 60;
  if (floor <= 20) return 12 * 60;
  if (floor <= 40) return 10 * 60;
  if (floor <= 49) return 8 * 60;
  return 15 * 60; // 50F Final Boss
}

const RARITY_COLORS: Record<WeaponRarity, string> = {
  Common: 'text-zinc-300 border-zinc-500/40 bg-zinc-800/60',
  Uncommon: 'text-emerald-300 border-emerald-500/40 bg-emerald-900/40',
  Rare: 'text-sky-300 border-sky-400/50 bg-sky-900/40',
  Epic: 'text-purple-300 border-purple-400/50 bg-purple-900/40',
  Exotic: 'text-pink-300 border-pink-400/50 bg-pink-900/40',
  Legendary: 'text-amber-300 border-amber-400/60 bg-amber-900/50',
  MYTHIC: 'text-red-300 border-red-400/60 bg-red-950/60',
  SECRET: 'text-cyan-200 border-cyan-300/70 bg-cyan-950/70',
  ETERNAL: 'text-fuchsia-200 border-fuchsia-300/80 bg-gradient-to-r from-purple-900/70 to-pink-900/70',
  OG: 'text-yellow-200 border-yellow-300 bg-gradient-to-r from-amber-600/40 via-rose-600/40 to-cyan-600/40',
};

const INITIAL_DAGGER: MazeWeapon = {
  id: 'starter-dagger',
  name: 'クリスタル・ダガー (初期装備)',
  rarity: 'Rare',
  damage: 42,
  range: 2.8,
};

function rollSwordChestWeapon(chestTier: 'wood' | 'silver' | 'gold', floor: number): MazeWeapon {
  const rand = Math.random() * 100;
  let rarity: WeaponRarity = 'Common';
  if (chestTier === 'wood') {
    // Common 80%, Uncommon 10%, Rare 3%, Epic 2%, Exotic 1%, Legendary 0% (normalized 96->100 with Common)
    if (rand < 84) rarity = 'Common';
    else if (rand < 94) rarity = 'Uncommon';
    else if (rand < 97) rarity = 'Rare';
    else if (rand < 99) rarity = 'Epic';
    else rarity = 'Exotic';
  } else if (chestTier === 'silver') {
    if (rand < 35) rarity = 'Common';
    else if (rand < 65) rarity = 'Uncommon';
    else if (rand < 83) rarity = 'Rare';
    else if (rand < 93) rarity = 'Epic';
    else if (rand < 98) rarity = 'Exotic';
    else rarity = 'Legendary';
  } else {
    if (rand < 10) rarity = 'Common';
    else if (rand < 30) rarity = 'Uncommon';
    else if (rand < 60) rarity = 'Rare';
    else if (rand < 82) rarity = 'Epic';
    else if (rand < 94) rarity = 'Exotic';
    else rarity = 'Legendary';
  }

  const multMap: Record<WeaponRarity, number> = {
    Common: 0.7,
    Uncommon: 0.95,
    Rare: 1.25,
    Epic: 1.65,
    Exotic: 2.1,
    Legendary: 2.8,
    MYTHIC: 3.6,
    SECRET: 4.5,
    ETERNAL: 5.8,
    OG: 7.5,
  };
  const nameMap: Record<WeaponRarity, string> = {
    Common: 'アイアン・ブレード',
    Uncommon: 'スチール・セイバー',
    Rare: 'アストラル・レイピア',
    Epic: 'ファントム・カタナ',
    Exotic: 'ネオン・ヴァルキリー剣',
    Legendary: 'ソーラー・エクスカリバー',
    MYTHIC: '深淵災厄剣・ミシック',
    SECRET: '虚空秘匿剣・シークレット',
    ETERNAL: '永劫星霜剣・エターナル',
    OG: '創世神剣・Glasispect OG',
  };

  const dmg = Math.round((28 + floor * 4.5) * multMap[rarity]);
  return {
    id: `wpn-${Date.now()}-${Math.random()}`,
    name: `${nameMap[rarity]} +${floor}`,
    rarity,
    damage: dmg,
    range: rarity === 'Legendary' || rarity === 'Exotic' ? 3.8 : 3.1,
  };
}

function rollBossChestWeapon(floor: number, isMajorOrFinal: boolean): MazeWeapon {
  const rand = Math.random() * 100;
  let rarity: WeaponRarity = 'MYTHIC';
  if (floor === 50 || (isMajorOrFinal && rand > 72)) {
    rarity = 'OG';
  } else if (rand > 45) {
    rarity = 'ETERNAL';
  } else if (rand > 20) {
    rarity = 'SECRET';
  } else {
    rarity = 'MYTHIC';
  }

  if (rarity === 'OG') {
    return {
      id: `boss-og-${floor}`,
      name: `創世神剣・Glasispect OG [F${floor}]`,
      rarity: 'OG',
      damage: Math.round(180 + floor * 12),
      range: 4.8,
      skillName: 'ディメンション・スラッシュ',
      skillDesc: 'フロア内の全敵に超絶ダメージを与え、HP50%回復＆制限時間+45秒',
      cooldownSec: 18,
    };
  }
  if (rarity === 'ETERNAL') {
    return {
      id: `boss-eternal-${floor}`,
      name: `永劫星霜剣・エターナル [F${floor}]`,
      rarity: 'ETERNAL',
      damage: Math.round(135 + floor * 9.5),
      range: 4.2,
      skillName: 'アストラル・ノヴァ',
      skillDesc: '周囲の敵全体に衝撃波ダメージを与え、制限時間+20秒',
      cooldownSec: 15,
    };
  }
  if (rarity === 'SECRET') {
    return {
      id: `boss-secret-${floor}`,
      name: `虚空秘匿剣・シークレット [F${floor}]`,
      rarity: 'SECRET',
      damage: Math.round(105 + floor * 7.5),
      range: 3.9,
    };
  }
  return {
    id: `boss-mythic-${floor}`,
    name: `深淵災厄剣・ミシック [F${floor}]`,
    rarity: 'MYTHIC',
    damage: Math.round(85 + floor * 6),
    range: 3.6,
  };
}

// Create Procedural Canvas Texture for 3DMaze Walls & Floors
function createProceduralAreaTexture(primaryHex: string, secondaryHex: string, isFloor: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = secondaryHex;
  ctx.lineWidth = isFloor ? 2 : 3;
  ctx.globalAlpha = isFloor ? 0.35 : 0.65;

  if (isFloor) {
    ctx.strokeRect(4, 4, 120, 120);
    ctx.beginPath();
    ctx.moveTo(0, 64);
    ctx.lineTo(128, 64);
    ctx.moveTo(64, 0);
    ctx.lineTo(64, 128);
    ctx.stroke();
  } else {
    // Brick / Cyber panel pattern
    for (let y = 0; y < 128; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();
      const offset = (y / 32) % 2 === 0 ? 0 : 32;
      for (let x = offset; x < 128; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 32);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

export function GameApp({ initialTab, payload }: GameAppProps) {
  const effectiveGameId = payload?.gameId || initialTab;
  const [mode, setMode] = useState<GameMode>(() => mapPayloadToMode(effectiveGameId));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const initialMode = mapPayloadToMode(effectiveGameId);
    return Number(localStorage.getItem(`game_high_${initialMode}`) || '0');
  });
  const [speedGauge, setSpeedGauge] = useState(160);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game Boy state
  const [gbRom, setGbRom] = useState<'tetris' | 'space' | 'mario' | 'custom'>('tetris');
  const [customRomName, setCustomRomName] = useState<string>('');

  // =============================================================
  // 3DMaze 50-Floor Roguelike State
  // =============================================================
  const [mazeDifficulty, setMazeDifficulty] = useState<MazeDifficulty>('NORMAL');
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const [mazeFloor, setMazeFloor] = useState(1);
  const [mazeHp, setMazeHp] = useState(120);
  const [mazeMaxHp, setMazeMaxHp] = useState(120);
  const [mazeAtk, setMazeAtk] = useState(18);
  const [mazeLevel, setMazeLevel] = useState(1);
  const [mazeXp, setMazeXp] = useState(0);
  const [mazeXpNext, setMazeXpNext] = useState(100);
  const [equippedWeapon, setEquippedWeapon] = useState<MazeWeapon>(INITIAL_DAGGER);
  const [weaponBag, setWeaponBag] = useState<MazeWeapon[]>([INITIAL_DAGGER]);
  const [itemBag, setItemBag] = useState<Record<MazeItemId, number>>({
    neon_paint: 2,
    potion_s: 2,
    mapping_scroll: 1,
    potion_m: 0,
    safety_shoes: 1,
    potion_full: 0,
    time_clock: 0,
    direction_eye: 1,
    chrono_boost: 0,
  });

  // Floor timer, Torch Fuel (21-30F Void), Chrono Boost, Skill Cooldown
  const [floorTimeLeft, setFloorTimeLeft] = useState(() => getFloorTimeLimitSeconds(1));
  const [totalRunSeconds, setTotalRunSeconds] = useState(0);
  const [torchFuel, setTorchFuel] = useState(100);
  const [chronoBoostSec, setChronoBoostSec] = useState(0);
  const [skillCooldown, setSkillCooldown] = useState(0);
  const [mapRevealed, setMapRevealed] = useState(false);
  const [directionEyeActive, setDirectionEyeActive] = useState(false);

  // Boss & Progression Tracking
  const [defeatedBossFloors, setDefeatedBossFloors] = useState<number[]>([]);
  const [currentFloorBossAlive, setCurrentFloorBossAlive] = useState(false);
  const [currentFloorBossName, setCurrentFloorBossName] = useState<string | null>(null);
  const [currentFloorBossHpPct, setCurrentFloorBossHpPct] = useState(100);

  // Chest Counts & Result / Cause of Death / Roulette / Archive Modals
  const [chestCounts, setChestCounts] = useState({
    wood: 0,
    silver: 0,
    gold: 0,
    boss: 0,
    item: 0,
    xp: 0,
  });
  const [causeOfDeath, setCauseOfDeath] = useState<string | null>(null);
  const [mazeVictory, setMazeVictory] = useState(false);
  const [combatLog, setCombatLog] = useState<string>('1F 土の迷宮へ進入。階段を探して50Fを目指せ！');
  const [rouletteModal, setRouletteModal] = useState<{
    chestTitle: string;
    weapon: MazeWeapon;
  } | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [discoveredWeapons, setDiscoveredWeapons] = useState<string[]>([INITIAL_DAGGER.name]);

  // Minimap state (16x16 grid: 0=empty, 1=wall, 2=stairs, 3=chest, 4=pitfall, 5=warp, 6=magma/glitch, 7=painted)
  const [minimapGrid, setMinimapGrid] = useState<number[][]>([]);
  const [playerGridPos, setPlayerGridPos] = useState<{ r: number; c: number; yaw: number }>({ r: 1, c: 1, yaw: 0 });
  const [stairsGridPos, setStairsGridPos] = useState<{ r: number; c: number }>({ r: 14, c: 14 });

  // Refs for inside the 60fps Three.js loop
  const mazeStateRef = useRef({
    floor: mazeFloor,
    hp: mazeHp,
    maxHp: mazeMaxHp,
    atk: mazeAtk,
    weapon: equippedWeapon,
    torchFuel,
    chronoBoostSec,
    difficulty: mazeDifficulty,
    defeatedBossFloors,
    safetyShoesCount: itemBag.safety_shoes,
  });
  useEffect(() => {
    mazeStateRef.current = {
      floor: mazeFloor,
      hp: mazeHp,
      maxHp: mazeMaxHp,
      atk: mazeAtk,
      weapon: equippedWeapon,
      torchFuel,
      chronoBoostSec,
      difficulty: mazeDifficulty,
      defeatedBossFloors,
      safetyShoesCount: itemBag.safety_shoes,
    };
  }, [mazeFloor, mazeHp, mazeMaxHp, mazeAtk, equippedWeapon, torchFuel, chronoBoostSec, mazeDifficulty, defeatedBossFloors, itemBag.safety_shoes]);

  // Trigger actions inside Three.js maze from React UI buttons
  const mazeActionsRef = useRef<{
    attack: () => void;
    useSkill: () => void;
    paintFloor: () => void;
  }>({
    attack: () => {},
    useSkill: () => {},
    paintFloor: () => {},
  });

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
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
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
        // Ignore autoplay restrictions
      }
    },
    [soundEnabled]
  );

  const setControl = (key: 'left' | 'right' | 'up' | 'down' | 'boost' | 'action', state: boolean) => {
    controlsRef.current[key] = state;
  };

  // Save Daily Challenge Record helper
  const recordDailyChallengeBest = useCallback(
    (reachedFloor: number, seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const formatted = `F${reachedFloor} (${mins}m${secs < 10 ? '0' : ''}${secs}s · ${mazeDifficulty})`;
      try {
        localStorage.setItem('glassium_3dmaze_daily_best', formatted);
      } catch {
        // ignore
      }
    },
    [mazeDifficulty]
  );

  // Trigger Game Over in 3DMaze with specific Cause of Death
  const triggerMazeDeath = useCallback(
    (reason: string) => {
      playSound('crash');
      setCauseOfDeath(reason);
      setGameOver(true);
      if (isDailyChallenge) {
        recordDailyChallengeBest(mazeStateRef.current.floor, totalRunSeconds);
      }
    },
    [playSound, isDailyChallenge, recordDailyChallengeBest, totalRunSeconds]
  );

  // 1-second timer tick for 3DMaze floor time limit, Torch Fuel (21-30F), and cooldowns
  useEffect(() => {
    if (mode !== 'maze' || gameOver || mazeVictory || rouletteModal) return;
    const timer = window.setInterval(() => {
      setTotalRunSeconds((s) => s + 1);
      setChronoBoostSec((s) => Math.max(0, s - 1));
      setSkillCooldown((s) => Math.max(0, s - 1));

      setFloorTimeLeft((prev) => {
        if (prev <= 1) {
          triggerMazeDeath(`${mazeStateRef.current.floor}Fにて制限時間切れにより空間崩壊に巻き込まれた`);
          return 0;
        }
        return prev - 1;
      });

      // Void Area (21-30F) Torch Fuel drain
      if (mazeFloor >= 21 && mazeFloor <= 30) {
        setTorchFuel((prev) => {
          const next = Math.max(0, prev - 2);
          if (next === 0 && Math.random() < 0.35) {
            triggerMazeDeath(`${mazeFloor}F (Void) にて松明の燃料が尽き、即死モンスター「深淵の影」に呑み込まれた`);
          }
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, gameOver, mazeVictory, rouletteModal, mazeFloor, triggerMazeDeath]);

  // Reset floor timer & map state when changing floor
  const advanceToFloor = useCallback(
    (targetFloor: number, logMessage?: string) => {
      // Enforce Boss Lock Rule: cannot skip past an undefeated boss floor (X5F, X0F, 50F)
      const currentF = mazeStateRef.current.floor;
      let clampedTarget = Math.max(1, Math.min(50, targetFloor));

      if (clampedTarget > currentF) {
        for (let f = currentF; f <= clampedTarget; f++) {
          const isBossF = f % 5 === 0;
          if (isBossF && !mazeStateRef.current.defeatedBossFloors.includes(f)) {
            clampedTarget = f;
            break;
          }
        }
      }

      setMazeFloor(clampedTarget);
      setFloorTimeLeft(getFloorTimeLimitSeconds(clampedTarget));
      setMapRevealed(false);
      setDirectionEyeActive(false);
      if (clampedTarget >= 21 && clampedTarget <= 30) {
        setTorchFuel(100);
      }
      if (logMessage) {
        setCombatLog(logMessage);
      } else {
        const theme = getAreaThemeForFloor(clampedTarget);
        setCombatLog(`${clampedTarget}F [${theme.name}] に到達！`);
      }
      if (isDailyChallenge) {
        recordDailyChallengeBest(clampedTarget, totalRunSeconds);
      }
    },
    [isDailyChallenge, recordDailyChallengeBest, totalRunSeconds]
  );

  // Start a fresh 50-Floor 3DMaze run
  const startNewMazeRun = (diff: MazeDifficulty = mazeDifficulty, daily = isDailyChallenge) => {
    setMazeDifficulty(diff);
    setIsDailyChallenge(daily);
    setMazeFloor(1);
    const baseHp = diff === 'EASY' ? 160 : diff === 'NORMAL' ? 120 : diff === 'HARD' ? 100 : 80;
    setMazeHp(baseHp);
    setMazeMaxHp(baseHp);
    setMazeAtk(diff === 'EASY' ? 24 : 18);
    setMazeLevel(1);
    setMazeXp(0);
    setMazeXpNext(100);
    setEquippedWeapon(INITIAL_DAGGER);
    setWeaponBag([INITIAL_DAGGER]);
    setItemBag({
      neon_paint: 2,
      potion_s: 2,
      mapping_scroll: 1,
      potion_m: 1,
      safety_shoes: 1,
      potion_full: 0,
      time_clock: 1,
      direction_eye: 1,
      chrono_boost: 1,
    });
    setChestCounts({ wood: 0, silver: 0, gold: 0, boss: 0, item: 0, xp: 0 });
    setDefeatedBossFloors([]);
    setFloorTimeLeft(getFloorTimeLimitSeconds(1));
    setTotalRunSeconds(0);
    setTorchFuel(100);
    setCauseOfDeath(null);
    setMazeVictory(false);
    setGameOver(false);
    setRouletteModal(null);
    setCombatLog(
      daily
        ? `🏆 デイリーチャレンジ (RTA) 開始！ 初期装備「${INITIAL_DAGGER.name}」で50F制覇を目指せ！`
        : `難易度 ${diff} で1Fへ進入！ 初期装備「${INITIAL_DAGGER.name}」を装備中。`
    );
  };

  // Use an item from the Item Bag
  const handleUseMazeItem = (id: MazeItemId) => {
    if ((itemBag[id] || 0) <= 0) return;
    playSound('score');
    setItemBag((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));

    if (id === 'potion_s') {
      const heal = Math.round(mazeMaxHp * 0.35);
      setMazeHp((h) => Math.min(mazeMaxHp, h + heal));
      setCombatLog(`🧪 小回復ポーションを使用！ HPが ${heal} 回復した。`);
    } else if (id === 'potion_m') {
      const heal = Math.round(mazeMaxHp * 0.65);
      setMazeHp((h) => Math.min(mazeMaxHp, h + heal));
      setCombatLog(`⚗️ 中回復ポーションを使用！ HPが ${heal} 回復した。`);
    } else if (id === 'potion_full') {
      setMazeHp(mazeMaxHp);
      setCombatLog(`💖 全回復ポーションを使用！ HPが完全回復した！`);
    } else if (id === 'mapping_scroll') {
      setMapRevealed(true);
      setCombatLog(`📜 マッピング・スクロールを使用！ 現在階層の構造・階段・罠がすべてミニマップに表示された！`);
    } else if (id === 'time_clock') {
      setFloorTimeLeft((t) => t + 120);
      setCombatLog(`⏳ タイム・クロックを使用！ 制限時間が +120秒 延長された！`);
    } else if (id === 'direction_eye') {
      setDirectionEyeActive(true);
      setCombatLog(`👁️ ディレクション・アイ発動！ 出口階段へのナビゲーション矢印を表示中。`);
    } else if (id === 'chrono_boost') {
      setChronoBoostSec(30);
      setCombatLog(`⚡ クロノ・ブースト発動！ 30秒間、移動速度と攻撃力が1.6倍に上昇！`);
    } else if (id === 'neon_paint') {
      mazeActionsRef.current.paintFloor();
      setCombatLog(`🎨 ネオンペイントで足元の床に発光マーカーをペイントした！`);
    } else if (id === 'safety_shoes') {
      // Safety shoes are passive, restore count and inform user
      setItemBag((prev) => ({ ...prev, safety_shoes: (prev.safety_shoes || 0) + 1 }));
      setCombatLog(`🥾 セーフティ・シューズは所持しているだけで落とし穴の即死を自動無効化します（残り ${itemBag.safety_shoes} 回）。`);
    }
  };

  // =============================================================
  // 1. Slope-style Smooth Downhill Gliding Racer (Velocity 3D)
  //    - Fixed gravity fall-off-edge physics when rolling outside platform
  //    - Shrunk obstacle hitbox for fair near-misses
  //    - Enhanced neon 3D visuals
  // =============================================================
  const initVelocityRacer = (container: HTMLDivElement) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.011);

    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 3.8, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.4);
    dirLight.position.set(10, 22, 12);
    scene.add(dirLight);

    // Neon Cyber Ball
    const ballGeo = new THREE.SphereGeometry(0.68, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x00f2ff,
      metalness: 0.85,
      roughness: 0.12,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, 1, 0);
    scene.add(ball);

    // Wireframe aura around ball
    const wireBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.71, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, wireframe: true, transparent: true, opacity: 0.35 })
    );
    ball.add(wireBall);

    // Downhill Slope Track with Neon Grid
    const trackWidth = 15;
    const segmentLength = 30;
    const trackSegments: THREE.Group[] = [];
    const totalSegments = 18;

    const trackTex = createProceduralAreaTexture('#091326', '#00f2ff', true);
    trackTex.repeat.set(4, 8);
    trackTex.wrapS = THREE.RepeatWrapping;
    trackTex.wrapT = THREE.RepeatWrapping;

    const trackMat = new THREE.MeshStandardMaterial({
      map: trackTex,
      roughness: 0.35,
      metalness: 0.75,
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
    const archMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true, transparent: true, opacity: 0.35 });

    for (let i = 0; i < totalSegments; i++) {
      const segGroup = new THREE.Group();
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(trackWidth, segmentLength), trackMat);
      floor.rotation.x = -Math.PI / 2 - 0.12;
      segGroup.add(floor);

      const leftNeon = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, segmentLength), glowMat);
      leftNeon.position.set(-trackWidth / 2, 0.1, 0);
      segGroup.add(leftNeon);

      const rightNeon = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, segmentLength), glowMat);
      rightNeon.position.set(trackWidth / 2, 0.1, 0);
      segGroup.add(rightNeon);

      if (i % 2 === 0) {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(trackWidth * 0.58, 0.12, 8, 24, Math.PI), archMat);
        arch.position.set(0, 0.5, 0);
        segGroup.add(arch);
      }

      segGroup.position.z = -i * segmentLength;
      segGroup.position.y = -i * 2.5;
      scene.add(segGroup);
      trackSegments.push(segGroup);
    }

    // Obstacles & Gems with tight hitboxes
    interface EntityItem {
      mesh: THREE.Mesh;
      type: 'obstacle' | 'gem';
    }
    const entities: EntityItem[] = [];
    const obsGeo = new THREE.BoxGeometry(1.75, 1.15, 0.95);
    const obsMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    });
    const gemGeo = new THREE.OctahedronGeometry(0.58);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 1.3,
    });
    const lanes = [-5.2, -2.6, 0, 2.6, 5.2];

    const spawnEntity = (zPos: number, yPos: number) => {
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      const isGem = Math.random() > 0.42;
      if (isGem) {
        const m = new THREE.Mesh(gemGeo, gemMat);
        m.position.set(lane, yPos + 1, zPos);
        scene.add(m);
        entities.push({ mesh: m, type: 'gem' });
      } else {
        const m = new THREE.Mesh(obsGeo, obsMat);
        m.position.set(lane, yPos + 0.75, zPos);
        scene.add(m);
        entities.push({ mesh: m, type: 'obstacle' });
      }
    };

    for (let z = -45; z > -360; z -= 25) {
      spawnEntity(z, z * 0.08);
    }

    const keys: Record<string, boolean> = {};
    const onDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    let ballX = 0;
    let ballY = 1.0;
    let ballVelY = 0;
    let isFallingOffEdge = false;
    let currentDistance = 0;
    let slopeSpeed = 1.65;
    let upgradeLevel = 1;

    const animate = () => {
      gameLoopRef.current = requestAnimationFrame(animate);

      const steer = 0.24;
      if (keys['ArrowLeft'] || keys['KeyA'] || controlsRef.current.left) {
        ballX -= steer;
      }
      if (keys['ArrowRight'] || keys['KeyD'] || controlsRef.current.right) {
        ballX += steer;
      }

      // Gravity Fall-off-Edge Check: if ball rolls outside [-trackWidth/2, +trackWidth/2]
      if (Math.abs(ballX) > trackWidth / 2 + 0.35) {
        isFallingOffEdge = true;
      }

      if (isFallingOffEdge) {
        ballVelY -= 0.052; // Gravity acceleration downward into void
        ballY += ballVelY;
        ball.position.y = ballY;
        camera.position.x = ballX * 0.55;
        camera.lookAt(ball.position.x, ball.position.y - 1, ball.position.z - 4);

        if (ballY < -9.5) {
          playSound('crash');
          setGameOver(true);
          cancelAnimationFrame(gameLoopRef.current);
          return;
        }
      } else {
        camera.position.x = ballX * 0.38;
      }

      currentDistance += slopeSpeed;
      const calculatedUpgrade = Math.floor(currentDistance / 600) + 1;
      if (calculatedUpgrade > upgradeLevel) {
        upgradeLevel = calculatedUpgrade;
        slopeSpeed += 0.22;
        playSound('levelup');
      }
      setSpeedGauge(Math.round(slopeSpeed * 100));

      ball.position.x = ballX;
      ball.rotation.x -= slopeSpeed * 0.12;
      ball.rotation.z = -ballX * 0.08;

      trackSegments.forEach((seg) => {
        seg.position.z += slopeSpeed;
        if (seg.position.z > segmentLength * 2) {
          seg.position.z -= totalSegments * segmentLength;
          seg.position.y -= totalSegments * 2.5;
        }
      });

      // Tightened Hitbox Collision Check
      for (let i = entities.length - 1; i >= 0; i--) {
        const ent = entities[i];
        ent.mesh.position.z += slopeSpeed;
        if (ent.type === 'gem') ent.mesh.rotation.y += 0.06;

        const dx = Math.abs(ball.position.x - ent.mesh.position.x);
        const dz = Math.abs(ball.position.z - ent.mesh.position.z);

        if (!isFallingOffEdge) {
          if (ent.type === 'gem' && dx < 1.25 && dz < 1.15) {
            currentDistance += 220;
            updateScore(Math.round(currentDistance));
            playSound('score');
            scene.remove(ent.mesh);
            entities.splice(i, 1);
            continue;
          } else if (ent.type === 'obstacle' && dx < 1.05 && dz < 0.68) {
            // Shrunk obstacle hitbox so near-misses are safe!
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
  // 2. 3DMaze 50-Floor Roguelike Engine
  //    - Three.js with antialias: false + Depth-buffer Post-Processing Fog
  //    - Single active 16x16 floor chunk loaded at a time
  //    - Fixed WASD / Arrow / On-screen controls + wall sliding collision
  // =============================================================
  const initMaze = (container: HTMLDivElement, activeFloor: number) => {
    const areaTheme = getAreaThemeForFloor(activeFloor);
    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(areaTheme.fogColorHex);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 65);

    // Strictly use antialias: false per specification
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    container.appendChild(renderer.domElement);

    // Depth-based Post-Processing Fog Setup (WebGLRenderTarget + DepthTexture)
    const renderTarget = new THREE.WebGLRenderTarget(width, height);
    renderTarget.texture.minFilter = THREE.NearestFilter;
    renderTarget.texture.magFilter = THREE.NearestFilter;
    renderTarget.depthTexture = new THREE.DepthTexture(width, height);
    renderTarget.depthTexture.type = THREE.UnsignedShortType;

    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const fogColorVec = new THREE.Color(areaTheme.fogColorHex);

    const postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: renderTarget.texture },
        tDepth: { value: renderTarget.depthTexture },
        uCameraNear: { value: camera.near },
        uCameraFar: { value: camera.far },
        uFogColor: { value: new THREE.Vector3(fogColorVec.r, fogColorVec.g, fogColorVec.b) },
        uFogDensity: { value: activeFloor >= 21 && activeFloor <= 30 ? 0.085 : 0.052 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        #include <packing>
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform float uCameraNear;
        uniform float uCameraFar;
        uniform vec3 uFogColor;
        uniform float uFogDensity;

        float getLinearDepth(const in vec2 screenPosition) {
          float fragCoordZ = texture2D(tDepth, screenPosition).x;
          float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
          return -viewZ;
        }

        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          float depth = getLinearDepth(vUv);
          float fogFactor = 1.0 - exp(-uFogDensity * depth);
          fogFactor = clamp(fogFactor, 0.0, 1.0);
          vec3 finalColor = mix(texel.rgb, uFogColor, fogFactor);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
    const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
    postScene.add(postQuad);

    // Brightened dungeon lighting + Player Torch PointLight
    const ambientLight = new THREE.AmbientLight(0xffffff, activeFloor >= 21 && activeFloor <= 30 ? 0.45 : 0.85);
    scene.add(ambientLight);

    const torchLight = new THREE.PointLight(0xffedd5, 2.4, 22);
    torchLight.position.set(0, 0.4, 0);
    camera.add(torchLight);
    scene.add(camera);

    // Active 16x16 Floor Chunk Generation
    const gridSize = 16;
    const cellSize = 3.0;
    const halfGrid = (gridSize * cellSize) / 2;

    const wallTex = createProceduralAreaTexture(areaTheme.wallPrimary, areaTheme.wallSecondary, false);
    const floorTex = createProceduralAreaTexture(areaTheme.floorPrimary, areaTheme.wallSecondary, true);
    floorTex.repeat.set(gridSize, gridSize);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;

    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(gridSize * cellSize, gridSize * cellSize),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    scene.add(floorMesh);

    const ceilingMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(gridSize * cellSize, gridSize * cellSize),
      new THREE.MeshStandardMaterial({ color: areaTheme.fogColorHex, roughness: 0.9 })
    );
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = 3.0;
    scene.add(ceilingMesh);

    // Build 16x16 grid map with guaranteed open path around start (1,1) and stairs (14,14)
    const grid: number[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
    const wallBoxes: THREE.Box3[] = [];
    const wallGeo = new THREE.BoxGeometry(cellSize, 3.0, cellSize);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.45, metalness: 0.3 });

    const gridToWorld = (r: number, c: number) => ({
      x: c * cellSize - halfGrid + cellSize / 2,
      z: r * cellSize - halfGrid + cellSize / 2,
    });

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const isBorder = r === 0 || r === gridSize - 1 || c === 0 || c === gridSize - 1;
        const isSafeStart = r <= 2 && c <= 2;
        const isSafeExit = r >= gridSize - 3 && c >= gridSize - 3;
        const isCorridorSpine = r === 1 || c === gridSize - 2 || r === c;
        const isInternalWall =
          !isSafeStart &&
          !isSafeExit &&
          !isCorridorSpine &&
          r % 2 === 0 &&
          c % 2 === 0 &&
          Math.random() > 0.25;

        if (isBorder || isInternalWall) {
          grid[r][c] = 1;
          const wall = new THREE.Mesh(wallGeo, wallMat);
          const { x, z } = gridToWorld(r, c);
          wall.position.set(x, 1.5, z);
          scene.add(wall);
          wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }
      }
    }

    // Place Exit Stairs at (14, 14)
    const stairsR = gridSize - 2;
    const stairsC = gridSize - 2;
    grid[stairsR][stairsC] = 2;
    setStairsGridPos({ r: stairsR, c: stairsC });

    const stairsPos = gridToWorld(stairsR, stairsC);
    const stairsPortal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 2.6, 16),
      new THREE.MeshBasicMaterial({ color: 0x00f2ff, wireframe: true })
    );
    stairsPortal.position.set(stairsPos.x, 1.3, stairsPos.z);
    scene.add(stairsPortal);

    // Interactive Floor Objects: Chests, Traps (Pitfalls, Warps, Glitch Pits, Magma Pools), Fuel Crystals
    interface FloorInteractable {
      id: string;
      r: number;
      c: number;
      mesh: THREE.Mesh;
      kind: 'wood_chest' | 'silver_chest' | 'gold_chest' | 'xp_chest' | 'item_chest' | 'pitfall' | 'warp' | 'glitch_pit' | 'magma' | 'fuel_crystal';
      used: boolean;
    }
    const interactables: FloorInteractable[] = [];

    const pickFreeCell = (): [number, number] => {
      for (let tries = 0; tries < 50; tries++) {
        const r = Math.floor(Math.random() * (gridSize - 2)) + 1;
        const c = Math.floor(Math.random() * (gridSize - 2)) + 1;
        if (grid[r][c] === 0 && !(r <= 2 && c <= 2) && !(r === stairsR && c === stairsC)) {
          return [r, c];
        }
      }
      return [3, 3];
    };

    // Spawn 3 Chests per floor (Sword Chest, Item Chest, XP Chest)
    const chestTypes: FloorInteractable['kind'][] = [
      Math.random() < 0.2 ? 'gold_chest' : Math.random() < 0.5 ? 'silver_chest' : 'wood_chest',
      'item_chest',
      'xp_chest',
    ];
    chestTypes.forEach((ckind, idx) => {
      const [r, c] = pickFreeCell();
      grid[r][c] = 3;
      const pos = gridToWorld(r, c);
      const color =
        ckind === 'gold_chest'
          ? 0xfacc15
          : ckind === 'silver_chest'
          ? 0xe2e8f0
          : ckind === 'wood_chest'
          ? 0xb45309
          : ckind === 'item_chest'
          ? 0x10b981
          : 0x38bdf8;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.75, 0.9),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45 })
      );
      mesh.position.set(pos.x, 0.4, pos.z);
      scene.add(mesh);
      interactables.push({ id: `chest-${idx}`, r, c, mesh, kind: ckind, used: false });
    });

    // Spawn Pitfalls (from 6F+) & Warp Tiles
    if (activeFloor >= 6) {
      for (let i = 0; i < 2; i++) {
        const [r, c] = pickFreeCell();
        grid[r][c] = 4;
        const pos = gridToWorld(r, c);
        const mesh = new THREE.Mesh(
          new THREE.RingGeometry(0.3, 0.85, 16),
          new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(pos.x, 0.05, pos.z);
        scene.add(mesh);
        interactables.push({ id: `pit-${i}`, r, c, mesh, kind: 'pitfall', used: false });
      }
    }

    // Spawn Warp Tile
    {
      const [r, c] = pickFreeCell();
      grid[r][c] = 5;
      const pos = gridToWorld(r, c);
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.9, 20),
        new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(pos.x, 0.06, pos.z);
      scene.add(mesh);
      interactables.push({ id: 'warp-0', r, c, mesh, kind: 'warp', used: false });
    }

    // Area-Specific Mechanics:
    // 21-30F Void: Fuel Crystals
    if (activeFloor >= 21 && activeFloor <= 30) {
      for (let i = 0; i < 3; i++) {
        const [r, c] = pickFreeCell();
        const pos = gridToWorld(r, c);
        const mesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.55),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        mesh.position.set(pos.x, 0.8, pos.z);
        scene.add(mesh);
        interactables.push({ id: `fuel-${i}`, r, c, mesh, kind: 'fuel_crystal', used: false });
      }
    }

    // 31-40F Cyber: Glitch Pits (Fake Hatch / Timer Shuffle)
    if (activeFloor >= 31 && activeFloor <= 40) {
      for (let i = 0; i < 2; i++) {
        const [r, c] = pickFreeCell();
        grid[r][c] = 6;
        const pos = gridToWorld(r, c);
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 1.6),
          new THREE.MeshBasicMaterial({ color: 0xec4899, wireframe: true })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(pos.x, 0.06, pos.z);
        scene.add(mesh);
        interactables.push({ id: `glitch-${i}`, r, c, mesh, kind: 'glitch_pit', used: false });
      }
    }

    // 41-50F Core: Magma Pools (Continuous HP burn)
    if (activeFloor >= 41) {
      for (let i = 0; i < 3; i++) {
        const [r, c] = pickFreeCell();
        grid[r][c] = 6;
        const pos = gridToWorld(r, c);
        const mesh = new THREE.Mesh(
          new THREE.CircleGeometry(1.1, 16),
          new THREE.MeshBasicMaterial({ color: 0xff4500 })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(pos.x, 0.04, pos.z);
        scene.add(mesh);
        interactables.push({ id: `magma-${i}`, r, c, mesh, kind: 'magma', used: false });
      }
    }

    setMinimapGrid(grid.map((row) => [...row]));

    // Spawn Enemies & Bosses (X5F Mid-Boss, X0F Major Boss, 50F Final Boss)
    interface MazeEnemy {
      id: string;
      name: string;
      mesh: THREE.Mesh;
      hp: number;
      maxHp: number;
      atk: number;
      xpValue: number;
      isBoss: boolean;
      specialType: 'normal' | 'shield_ifrit' | 'burning_soul';
      shieldActive: boolean;
      alive: boolean;
    }
    const enemies: MazeEnemy[] = [];

    const diffMult =
      mazeStateRef.current.difficulty === 'EASY'
        ? 0.75
        : mazeStateRef.current.difficulty === 'NORMAL'
        ? 1.0
        : mazeStateRef.current.difficulty === 'HARD'
        ? 1.35
        : 1.75;

    const isBossFloor = activeFloor % 5 === 0;
    const isMajorBoss = activeFloor % 10 === 0;
    const isFinalBoss = activeFloor === 50;

    if (isBossFloor) {
      const bossName = isFinalBoss
        ? '【ラスボス】暴走した熱源システム (Thermal Core System)'
        : isMajorBoss
        ? `【大ボス】${areaTheme.name}・オーバーロード (F${activeFloor})`
        : `【中ボス】${areaTheme.name}・ガーディアン (F${activeFloor})`;
      const bossHp = Math.round((220 + activeFloor * 55) * (isFinalBoss ? 2.2 : isMajorBoss ? 1.5 : 1.1) * diffMult);
      const bossColor = isFinalBoss ? 0xff2200 : isMajorBoss ? 0xf59e0b : 0xa855f7;
      const bossMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.25, 1),
        new THREE.MeshStandardMaterial({ color: bossColor, emissive: bossColor, emissiveIntensity: 0.7, wireframe: false })
      );
      const bPos = gridToWorld(stairsR - 1, stairsC - 1);
      bossMesh.position.set(bPos.x, 1.3, bPos.z);
      scene.add(bossMesh);

      enemies.push({
        id: `boss-${activeFloor}`,
        name: bossName,
        mesh: bossMesh,
        hp: bossHp,
        maxHp: bossHp,
        atk: Math.round((16 + activeFloor * 2.2) * diffMult),
        xpValue: 180 + activeFloor * 25,
        isBoss: true,
        specialType: 'normal',
        shieldActive: false,
        alive: true,
      });
      setCurrentFloorBossAlive(true);
      setCurrentFloorBossName(bossName);
      setCurrentFloorBossHpPct(100);
    } else {
      setCurrentFloorBossAlive(false);
      setCurrentFloorBossName(null);
    }

    // Regular Floor Enemies
    const enemyCount = 4;
    for (let i = 0; i < enemyCount; i++) {
      const [er, ec] = pickFreeCell();
      const ePos = gridToWorld(er, ec);
      let specialType: MazeEnemy['specialType'] = 'normal';
      let eName = `${areaTheme.name} Sentinel`;
      let eColor = 0x38bdf8;

      if (activeFloor >= 41) {
        if (i % 2 === 0) {
          specialType = 'shield_ifrit';
          eName = 'シールド・イフリート';
          eColor = 0xf97316;
        } else {
          specialType = 'burning_soul';
          eName = 'バーニング・ソウル (自爆-60s)';
          eColor = 0xef4444;
        }
      } else if (activeFloor >= 31) {
        eName = 'グリッチ・ファントム';
        eColor = 0xec4899;
      } else if (activeFloor >= 21) {
        eName = 'ヴォイド・ストーカー';
        eColor = 0xa855f7;
      } else if (activeFloor >= 11) {
        eName = 'クリスタル・ウィスプ';
        eColor = 0x06b6d4;
      } else {
        eName = 'アース・ゴーレム';
        eColor = 0x10b981;
      }

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 1.5, 0.95),
        new THREE.MeshStandardMaterial({ color: eColor, emissive: eColor, emissiveIntensity: 0.45 })
      );
      mesh.position.set(ePos.x, 0.8, ePos.z);
      scene.add(mesh);

      const eHp = Math.round((50 + activeFloor * 18) * diffMult);
      enemies.push({
        id: `enemy-${i}`,
        name: eName,
        mesh,
        hp: eHp,
        maxHp: eHp,
        atk: Math.round((9 + activeFloor * 1.6) * diffMult),
        xpValue: 40 + activeFloor * 12,
        isBoss: false,
        specialType,
        shieldActive: false,
        alive: true,
      });
    }

    // Player Position & Fixed WASD / Arrow Movement with Wall Sliding
    const startWorld = gridToWorld(1, 1);
    let posX = startWorld.x;
    let posZ = startWorld.z;
    let yaw = Math.PI; // Facing toward positive Z (into the dungeon)
    let ticks = 0;

    const keys: Record<string, boolean> = {};
    const onDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'KeyF') {
        mazeActionsRef.current.attack();
      }
      if (e.code === 'KeyR') {
        mazeActionsRef.current.useSkill();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    const handleEnemyDefeated = (en: MazeEnemy) => {
      en.alive = false;
      scene.remove(en.mesh);
      playSound('levelup');

      setMazeXp((prevXp) => {
        const nextXp = prevXp + en.xpValue;
        if (nextXp >= mazeXpNext) {
          setMazeLevel((l) => l + 1);
          setMazeMaxHp((h) => h + 25);
          setMazeHp((h) => h + 25);
          setMazeAtk((a) => a + 8);
          return nextXp - mazeXpNext;
        }
        return nextXp;
      });

      if (en.isBoss) {
        setCurrentFloorBossAlive(false);
        setDefeatedBossFloors((prev) => (prev.includes(activeFloor) ? prev : [...prev, activeFloor]));
        setChestCounts((c) => ({ ...c, boss: c.boss + 1 }));

        if (activeFloor === 50) {
          // 50F Final Boss Victory!
          setMazeVictory(true);
          if (isDailyChallenge) {
            recordDailyChallengeBest(50, totalRunSeconds);
          }
          setCombatLog('🎉 50F ラスボス「暴走した熱源システム」を撃破！ GlassiumOS 5 u1 3DMaze 完全制覇！');
          return;
        }

        const bossWpn = rollBossChestWeapon(activeFloor, isMajorBoss);
        setWeaponBag((bag) => [bossWpn, ...bag]);
        setDiscoveredWeapons((d) => (d.includes(bossWpn.name) ? d : [...d, bossWpn.name]));
        setRouletteModal({
          chestTitle: `👑 ボスチェスト獲得 (${en.name})`,
          weapon: bossWpn,
        });
      } else {
        setCombatLog(`⚔️ ${en.name} を撃破！ (+${en.xpValue} XP)`);
      }
    };

    // Register Attack, Active Skill & Neon Paint actions
    mazeActionsRef.current.attack = () => {
      playSound('attack');
      const st = mazeStateRef.current;
      const boostMult = st.chronoBoostSec > 0 ? 1.6 : 1.0;
      const totalDmg = Math.round((st.weapon.damage + st.atk) * boostMult);

      let hitTarget: MazeEnemy | null = null;
      for (const en of enemies) {
        if (!en.alive) continue;
        const dist = camera.position.distanceTo(en.mesh.position);
        if (dist <= st.weapon.range + 1.8) {
          if (en.specialType === 'shield_ifrit' && en.shieldActive) {
            setCombatLog('🛡️ シールド・イフリートが正面ガード中！ 攻撃直後の隙を狙え！');
            return;
          }
          en.hp -= totalDmg;
          hitTarget = en;
          if (en.isBoss) {
            setCurrentFloorBossHpPct(Math.max(0, Math.round((en.hp / en.maxHp) * 100)));
          }
          if (en.hp <= 0) {
            handleEnemyDefeated(en);
          } else {
            setCombatLog(`⚔️ ${en.name} に ${totalDmg} ダメージ！ (残りHP: ${en.hp})`);
          }
          break;
        }
      }
      if (!hitTarget) {
        setCombatLog('💨 空振り！ 敵に近づいて攻撃しよう。');
      }
    };

    mazeActionsRef.current.useSkill = () => {
      const wpn = mazeStateRef.current.weapon;
      if (!wpn.skillName) return;
      if (skillCooldown > 0) {
        setCombatLog(`⏳ スキル「${wpn.skillName}」はクールダウン中です (${skillCooldown}s)`);
        return;
      }
      playSound('boost');
      setSkillCooldown(wpn.cooldownSec || 15);
      const skillDmg = Math.round((wpn.damage + mazeStateRef.current.atk) * 2.4);

      enemies.forEach((en) => {
        if (!en.alive) return;
        en.hp -= skillDmg;
        if (en.isBoss) {
          setCurrentFloorBossHpPct(Math.max(0, Math.round((en.hp / en.maxHp) * 100)));
        }
        if (en.hp <= 0) {
          handleEnemyDefeated(en);
        }
      });

      if (wpn.rarity === 'OG') {
        setMazeHp((h) => Math.min(mazeStateRef.current.maxHp, h + Math.round(mazeStateRef.current.maxHp * 0.5)));
        setFloorTimeLeft((t) => t + 45);
      } else {
        setFloorTimeLeft((t) => t + 20);
      }
      setCombatLog(`✨ 固有スキル「${wpn.skillName}」発動！ フロア全域の敵に ${skillDmg} ダメージ！`);
    };

    mazeActionsRef.current.paintFloor = () => {
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(0.25, 0.65, 16),
        new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(posX, 0.07, posZ);
      scene.add(marker);
    };

    const collidesAt = (testX: number, testZ: number): boolean => {
      const box = new THREE.Box3(
        new THREE.Vector3(testX - 0.42, 0.1, testZ - 0.42),
        new THREE.Vector3(testX + 0.42, 1.8, testZ + 0.42)
      );
      for (const w of wallBoxes) {
        if (box.intersectsBox(w)) return true;
      }
      return false;
    };

    const loop = () => {
      gameLoopRef.current = requestAnimationFrame(loop);
      ticks++;

      const st = mazeStateRef.current;
      const moveSpeed = (st.chronoBoostSec > 0 ? 0.15 : 0.1) * 1.0;
      const rotSpeed = 0.042;

      // Turn Left / Right
      if (keys['ArrowLeft'] || keys['KeyA'] || controlsRef.current.left) yaw += rotSpeed;
      if (keys['ArrowRight'] || keys['KeyD'] || controlsRef.current.right) yaw -= rotSpeed;

      // Forward / Backward (Three.js camera looks along -sin(yaw), -cos(yaw))
      let dx = 0;
      let dz = 0;
      if (keys['ArrowUp'] || keys['KeyW'] || controlsRef.current.up) {
        dx -= Math.sin(yaw) * moveSpeed;
        dz -= Math.cos(yaw) * moveSpeed;
      }
      if (keys['ArrowDown'] || keys['KeyS'] || controlsRef.current.down) {
        dx += Math.sin(yaw) * moveSpeed;
        dz += Math.cos(yaw) * moveSpeed;
      }
      // Strafe Q / E
      if (keys['KeyQ']) {
        dx -= Math.cos(yaw) * moveSpeed;
        dz += Math.sin(yaw) * moveSpeed;
      }
      if (keys['KeyE']) {
        dx += Math.cos(yaw) * moveSpeed;
        dz -= Math.sin(yaw) * moveSpeed;
      }

      if (controlsRef.current.action) {
        controlsRef.current.action = false;
        mazeActionsRef.current.attack();
      }

      // Independent X and Z axis wall sliding so player never gets stuck
      if (dx !== 0 && !collidesAt(posX + dx, posZ)) {
        posX += dx;
      }
      if (dz !== 0 && !collidesAt(posX, posZ + dz)) {
        posZ += dz;
      }

      camera.position.set(posX, 1.15, posZ);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yaw;

      // Update Void Torch Fuel Fog density dynamically
      if (activeFloor >= 21 && activeFloor <= 30) {
        const fuelRatio = Math.max(0.05, st.torchFuel / 100);
        postMaterial.uniforms.uFogDensity.value = 0.045 + (1 - fuelRatio) * 0.18;
        torchLight.distance = 6 + fuelRatio * 18;
      }

      // Convert player world pos to grid cell
      const curC = Math.min(gridSize - 1, Math.max(0, Math.floor((posX + halfGrid) / cellSize)));
      const curR = Math.min(gridSize - 1, Math.max(0, Math.floor((posZ + halfGrid) / cellSize)));
      if (ticks % 6 === 0) {
        setPlayerGridPos({ r: curR, c: curC, yaw });
      }

      // Animate Exit Stairs & Check Floor Advancement
      stairsPortal.rotation.y += 0.03;
      if (curR === stairsR && curC === stairsC) {
        const bossStillAlive = enemies.some((e) => e.isBoss && e.alive);
        if (bossStillAlive) {
          if (ticks % 45 === 0) {
            setCombatLog('🔒 ボスを撃破するまで次の階層への階段は封印されています！');
          }
        } else {
          playSound('levelup');
          advanceToFloor(activeFloor + 1);
          return;
        }
      }

      // Check Interactables (Chests, Pitfalls, Warps, Fuel, Glitch Pits, Magma)
      for (const item of interactables) {
        if (item.used) continue;
        if ( item.kind.includes('chest') || item.kind === 'fuel_crystal') {
          item.mesh.rotation.y += 0.03;
        }
        if (item.r === curR && item.c === curC) {
          if (item.kind === 'magma') {
            if (ticks % 35 === 0) {
              setMazeHp((h) => {
                const next = h - 8;
                if (next <= 0) {
                  triggerMazeDeath(`${activeFloor}F (Core) のマグマ溜まりによる灼熱ダメージで力尽きた`);
                }
                return Math.max(0, next);
              });
              setCombatLog('🔥 マグマ溜まりの上！ 継続ダメージを受けている！');
            }
            continue;
          }

          item.used = true;
          scene.remove(item.mesh);

          if (item.kind === 'wood_chest' || item.kind === 'silver_chest' || item.kind === 'gold_chest') {
            playSound('score');
            const tier = item.kind === 'gold_chest' ? 'gold' : item.kind === 'silver_chest' ? 'silver' : 'wood';
            setChestCounts((c) => ({ ...c, [tier]: c[tier] + 1 }));
            const rolled = rollSwordChestWeapon(tier, activeFloor);
            setWeaponBag((bag) => [rolled, ...bag]);
            setDiscoveredWeapons((d) => (d.includes(rolled.name) ? d : [...d, rolled.name]));
            setRouletteModal({
              chestTitle:
                tier === 'gold' ? '✨ 金の剣チェスト' : tier === 'silver' ? '🥈 銀の剣チェスト' : '📦 木の剣チェスト',
              weapon: rolled,
            });
          } else if (item.kind === 'xp_chest') {
            playSound('levelup');
            setChestCounts((c) => ({ ...c, xp: c.xp + 1 }));
            setMazeLevel((l) => l + 1);
            setMazeMaxHp((h) => h + 20);
            setMazeHp((h) => h + 20);
            setMazeAtk((a) => a + 7);
            setCombatLog('💠 経験値チェストを開封！ レベルアップして最大HP+20 / 攻撃力+7！');
          } else if (item.kind === 'item_chest') {
            playSound('score');
            setChestCounts((c) => ({ ...c, item: c.item + 1 }));
            const itemKeys = Object.keys(MAZE_ITEMS) as MazeItemId[];
            const picked = itemKeys[Math.floor(Math.random() * itemKeys.length)];
            setItemBag((b) => ({ ...b, [picked]: (b[picked] || 0) + 1 }));
            setCombatLog(`🎁 アイテムチェストから「${MAZE_ITEMS[picked].name}」を獲得！`);
          } else if (item.kind === 'fuel_crystal') {
            playSound('score');
            setTorchFuel((f) => Math.min(100, f + 45));
            setCombatLog('🕯️ 燃料クリスタルを回収！ 松明の燃料が +45% 回復した！');
          } else if (item.kind === 'pitfall') {
            // Pitfall: 20% 1-5F Great Skip, 80% Instant Death (unless Safety Shoes held)
            if (Math.random() < 0.2) {
              const skip = Math.floor(Math.random() * 5) + 1;
              playSound('boost');
              advanceToFloor(activeFloor + skip, `🕳️ 落とし穴の大スキップ(20%)成功！ 一気に +${skip}F 進んだ！`);
              return;
            } else if (st.safetyShoesCount > 0) {
              playSound('score');
              setItemBag((b) => ({ ...b, safety_shoes: Math.max(0, (b.safety_shoes || 0) - 1) }));
              advanceToFloor(
                activeFloor + 1,
                '🥾 落とし穴(80%即死)に落下したが、セーフティ・シューズが発動して+1Fへ安全に着地した！'
              );
              return;
            } else {
              triggerMazeDeath(`${activeFloor}Fにて落とし穴(80%即死トラップ)の奈落へ落下した`);
              return;
            }
          } else if (item.kind === 'warp') {
            const delta = Math.random() < 0.5 ? 1 : -1;
            playSound('boost');
            advanceToFloor(
              Math.max(1, activeFloor + delta),
              `🌀 ワープ魔法陣が作動！ ${delta > 0 ? '+1F 前進' : '-1F 後退'}した！`
            );
            return;
          } else if (item.kind === 'glitch_pit') {
            playSound('boost');
            if (Math.random() < 0.5) {
              const newTimer = Math.floor(Math.random() * 150) + 45;
              setFloorTimeLeft(newTimer);
              setCombatLog(`⚡ グリッチ・ピット作動！ 残り制限時間が ${newTimer}秒 にシャッフルされた！`);
            } else {
              const delta = Math.random() < 0.5 ? 2 : -2;
              advanceToFloor(Math.max(1, activeFloor + delta), `⚡ グリッチ・ハッチ作動！ ${delta > 0 ? '+2F' : '-2F'} へ空間転移！`);
              return;
            }
          }
        }
      }

      // Enemy AI & Combat Tick
      enemies.forEach((en) => {
        if (!en.alive) return;
        en.mesh.rotation.y += 0.025;

        // Shield Ifrit toggles frontal shield every 90 ticks
        if (en.specialType === 'shield_ifrit') {
          en.shieldActive = Math.floor(ticks / 90) % 2 === 0;
          (en.mesh.material as THREE.MeshStandardMaterial).wireframe = en.shieldActive;
        }

        const dist = camera.position.distanceTo(en.mesh.position);
        if (dist < 9.5 && dist > 1.35) {
          // Move slightly toward player
          const dirX = (posX - en.mesh.position.x) / dist;
          const dirZ = (posZ - en.mesh.position.z) / dist;
          en.mesh.position.x += dirX * 0.025;
          en.mesh.position.z += dirZ * 0.025;
        }

        if (dist <= 1.7 && ticks % 45 === 0) {
          if (en.specialType === 'burning_soul') {
            // Burning Soul self-destructs and deducts 60s from timer
            en.alive = false;
            scene.remove(en.mesh);
            setFloorTimeLeft((t) => Math.max(5, t - 60));
            setCombatLog('💥 バーニング・ソウルが自爆！ 制限時間が -60秒 削られた！');
            return;
          }

          setMazeHp((h) => {
            const next = h - en.atk;
            if (next <= 0) {
              triggerMazeDeath(`${activeFloor}Fにて「${en.name}」の攻撃により倒れた`);
            }
            return Math.max(0, next);
          });
        }
      });

      // Render Scene to Depth RenderTarget, then Post-Process Fog to Screen
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCamera);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      renderTarget.dispose();
      wallTex.dispose();
      floorTex.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  };

  // 2048 state
  const [grid2048, setGrid2048] = useState<number[][]>(() => createInitial2048Grid());

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

    if (mode === 'velocity' && !gameOver) {
      cleanup = initVelocityRacer(container);
    } else if (mode === 'maze' && !gameOver && !mazeVictory) {
      cleanup = initMaze(container, mazeFloor);
    } else if (mode === '2048') {
      setGrid2048(createInitial2048Grid());
    } else if (mode === 'gameboy') {
      cleanup = initGameBoy(container, gbRom === 'custom' ? customRomName || 'Custom ROM' : gbRom);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [mode, gameOver, mazeVictory, mazeFloor, gbRom, customRomName]);

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
    const onDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
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
            setTimeout(() => {
              en.active = true;
            }, 3000);
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
    { id: 'velocity', label: 'Slope (3D Glider)', icon: 'Flame' },
    { id: 'maze', label: '3DMaze (50F Roguelike)', icon: 'Compass' },
    { id: '2048', label: '2048', icon: 'LayoutGrid' },
    { id: 'puzzles', label: 'パズル・タイピング', icon: 'Grid3x3' },
    { id: 'gameboy', label: 'Game Boy', icon: 'Gamepad2' },
  ];

  const activeAreaTheme = getAreaThemeForFloor(mazeFloor);
  const timerMins = Math.floor(floorTimeLeft / 60);
  const timerSecs = floorTimeLeft % 60;

  return (
    <div className="flex h-full w-full select-none flex-col bg-slate-950 text-white relative touch-none">
      {/* Top Game Switcher Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/85 px-4 text-xs backdrop-blur-md shrink-0 z-20 gap-2 overflow-x-auto">
        <div className="flex items-center gap-4 shrink-0">
          {GAME_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setGameOver(false);
                setMode(t.id);
              }}
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

        <div className="flex items-center gap-3 font-mono text-xs shrink-0">
          {mode === 'velocity' && (
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-white/50">SPEED</span>
              <span className="font-bold text-sky-400">{speedGauge} km/h</span>
            </div>
          )}
          {mode === 'maze' && (
            <div className="flex items-center gap-2.5">
              <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${activeAreaTheme.uiBorder} ${activeAreaTheme.uiBg} ${activeAreaTheme.uiText}`}>
                {activeAreaTheme.badge} {mazeFloor}F / 50F ({activeAreaTheme.name})
              </span>
              <span className={`font-bold ${floorTimeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                ⏱ {timerMins}:{timerSecs < 10 ? '0' : ''}{timerSecs}
              </span>
              <span className="text-emerald-400 font-bold">
                HP {mazeHp}/{mazeMaxHp}
              </span>
            </div>
          )}
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
        {/* =========================================================
            3DMaze 50-Floor Roguelike HUD & Area-Themed UI Overlay
           ========================================================= */}
        {mode === 'maze' && (
          <>
            {/* Top-Left: Area Status, Equipped Weapon, Difficulty & Daily RTA Controls */}
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-xs pointer-events-none">
              <div className={`p-3 rounded-2xl border backdrop-blur-xl pointer-events-auto shadow-xl ${activeAreaTheme.uiBorder} ${activeAreaTheme.uiBg}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-xs font-extrabold ${activeAreaTheme.uiText}`}>
                    {activeAreaTheme.badge} {activeAreaTheme.jpName}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-white/80">
                    LV.{mazeLevel} ({mazeXp}/{mazeXpNext} XP)
                  </span>
                </div>

                {/* Equipped Weapon Badge */}
                <div className={`mt-1.5 px-2.5 py-1.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${RARITY_COLORS[equippedWeapon.rarity]}`}>
                  <div className="truncate">
                    <div className="font-bold truncate">⚔️ {equippedWeapon.name}</div>
                    <div className="text-[10px] opacity-80">
                      [{equippedWeapon.rarity}] 攻撃力: {equippedWeapon.damage + mazeAtk} · 射程: {equippedWeapon.range}m
                    </div>
                  </div>
                </div>

                {/* Eternal / OG Weapon Active Skill Button */}
                {equippedWeapon.skillName && (
                  <button
                    onClick={() => mazeActionsRef.current.useSkill()}
                    className="mt-1.5 w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400 text-black font-extrabold text-[11px] hover:brightness-110 transition shadow-md"
                  >
                    ✨ 固有スキル: {equippedWeapon.skillName} {skillCooldown > 0 ? `(${skillCooldown}s)` : '[Rキー]'}
                  </button>
                )}

                {/* Void Area (21-30F) Torch Fuel Meter */}
                {mazeFloor >= 21 && mazeFloor <= 30 && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-[10px] text-amber-300 mb-1">
                      <span>🕯️ 松明の燃料 (0%で深淵の影が出現)</span>
                      <span className="font-mono font-bold">{torchFuel}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${torchFuel < 25 ? 'bg-rose-500' : 'bg-amber-400'}`}
                        style={{ width: `${torchFuel}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Difficulty, Daily RTA & Archive Bar */}
                <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1">
                  {(['EASY', 'NORMAL', 'HARD', 'LUNATIC'] as MazeDifficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => startNewMazeRun(d, false)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                        mazeDifficulty === d && !isDailyChallenge
                          ? 'bg-white text-black'
                          : 'bg-black/40 text-white/60 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    onClick={() => startNewMazeRun('NORMAL', true)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition ${
                      isDailyChallenge ? 'bg-amber-400 text-black' : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    🏆 Daily RTA
                  </button>
                  <button
                    onClick={() => setShowArchiveModal(true)}
                    className="px-2 py-0.5 rounded text-[9px] bg-white/10 hover:bg-white/20 text-cyan-200 font-semibold"
                  >
                    📖 図鑑
                  </button>
                </div>
              </div>

              {/* Boss HP Bar if on Boss Floor */}
              {currentFloorBossAlive && currentFloorBossName && (
                <div className="p-2.5 rounded-2xl bg-rose-950/85 border border-rose-500/50 backdrop-blur-xl pointer-events-auto">
                  <div className="text-[11px] font-bold text-rose-200 truncate">{currentFloorBossName}</div>
                  <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all" style={{ width: `${currentFloorBossHpPct}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Top-Right: 16x16 Minimap, Direction Eye & Item Bag */}
            <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 pointer-events-none">
              <div className={`p-2.5 rounded-2xl border backdrop-blur-xl pointer-events-auto flex flex-col items-center gap-1.5 ${activeAreaTheme.uiBorder} ${activeAreaTheme.uiBg}`}>
                <div className="flex items-center justify-between w-full text-[10px] text-white/75 font-mono">
                  <span>MAP ({playerGridPos.c},{playerGridPos.r})</span>
                  {directionEyeActive && (
                    <span className="text-amber-300 font-bold">
                      👁️ 出口: ({stairsGridPos.c},{stairsGridPos.r})
                    </span>
                  )}
                </div>

                {/* 16x16 Minimap Grid */}
                <div className="grid grid-cols-16 gap-[1px] bg-black/70 p-1 rounded-lg border border-white/10">
                  {minimapGrid.map((row, rIdx) =>
                    row.map((cell, cIdx) => {
                      const isPlayer = playerGridPos.r === rIdx && playerGridPos.c === cIdx;
                      const dist = Math.abs(playerGridPos.r - rIdx) + Math.abs(playerGridPos.c - cIdx);
                      const visible = mapRevealed || dist <= 4 || (directionEyeActive && cell === 2);

                      let colorClass = 'bg-zinc-900';
                      if (isPlayer) colorClass = 'bg-white';
                      else if (!visible) colorClass = 'bg-black';
                      else if (cell === 1) colorClass = 'bg-zinc-600';
                      else if (cell === 2) colorClass = 'bg-cyan-400';
                      else if (cell === 3) colorClass = 'bg-amber-400';
                      else if (cell === 4) colorClass = 'bg-rose-500';
                      else if (cell === 5) colorClass = 'bg-purple-400';
                      else if (cell === 6) colorClass = 'bg-orange-500';

                      return <div key={`${rIdx}-${cIdx}`} className={`w-1.5 h-1.5 ${colorClass}`} />;
                    })
                  )}
                </div>
              </div>

              {/* 9-Item Bag Quick Bar */}
              <div className={`p-2 rounded-2xl border backdrop-blur-xl pointer-events-auto max-w-xs ${activeAreaTheme.uiBorder} ${activeAreaTheme.uiBg}`}>
                <div className="text-[10px] text-white/60 mb-1 font-semibold">アイテムバッグ (クリックで使用):</div>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(MAZE_ITEMS) as MazeItemId[]).map((id) => {
                    const def = MAZE_ITEMS[id];
                    const count = itemBag[id] || 0;
                    return (
                      <button
                        key={id}
                        onClick={() => handleUseMazeItem(id)}
                        disabled={count <= 0}
                        title={`${def.name}: ${def.desc}`}
                        className={`px-1.5 py-1 rounded-lg text-[10px] flex items-center justify-between gap-1 border transition ${
                          count > 0
                            ? 'bg-black/40 hover:bg-white/15 border-white/15 text-white'
                            : 'bg-black/20 border-transparent text-white/25 cursor-not-allowed'
                        }`}
                      >
                        <span className="truncate">
                          {def.icon} {def.name.slice(0, 4)}
                        </span>
                        <span className="font-mono text-cyan-300 font-bold">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Combat Log & On-Screen Controls (WASD + Attack) */}
            <div className="absolute inset-x-3 bottom-3 z-20 flex items-end justify-between gap-3 pointer-events-none">
              {/* On-Screen Movement D-Pad */}
              <div className="flex items-center gap-1.5 pointer-events-auto bg-black/55 backdrop-blur-xl p-2 rounded-2xl border border-white/15">
                <button
                  onPointerDown={() => setControl('left', true)}
                  onPointerUp={() => setControl('left', false)}
                  onPointerLeave={() => setControl('left', false)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold"
                >
                  ↺左
                </button>
                <div className="flex flex-col gap-1">
                  <button
                    onPointerDown={() => setControl('up', true)}
                    onPointerUp={() => setControl('up', false)}
                    onPointerLeave={() => setControl('up', false)}
                    className="w-10 h-10 rounded-xl bg-cyan-500/30 hover:bg-cyan-500/50 border border-cyan-400/40 flex items-center justify-center text-xs font-bold"
                  >
                    ▲前
                  </button>
                  <button
                    onPointerDown={() => setControl('down', true)}
                    onPointerUp={() => setControl('down', false)}
                    onPointerLeave={() => setControl('down', false)}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold"
                  >
                    ▼後
                  </button>
                </div>
                <button
                  onPointerDown={() => setControl('right', true)}
                  onPointerUp={() => setControl('right', false)}
                  onPointerLeave={() => setControl('right', false)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold"
                >
                  右↻
                </button>
              </div>

              {/* Center Combat Log Banner */}
              <div className="flex-1 max-w-md px-3.5 py-2 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 text-xs text-cyan-100 pointer-events-auto">
                <div className="truncate font-medium">{combatLog}</div>
                <div className="text-[10px] text-white/45 mt-0.5">
                  操作: W/S(前後) · A/D(旋回) · Q/E(平行移動) · Space(攻撃) · R(固有スキル)
                </div>
              </div>

              {/* Attack Button */}
              <button
                onClick={() => mazeActionsRef.current.attack()}
                className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-extrabold text-xs shadow-xl active:scale-95 pointer-events-auto border border-white/20"
              >
                ⚔️ 攻撃 (Space)
              </button>
            </div>

            {/* Sword / Boss Chest Roulette Modal */}
            {rouletteModal && (
              <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-xl flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
                  <div className="text-xs font-mono uppercase tracking-widest text-amber-300">
                    {rouletteModal.chestTitle}
                  </div>
                  <div className={`w-full p-4 rounded-2xl border ${RARITY_COLORS[rouletteModal.weapon.rarity]}`}>
                    <div className="text-xs uppercase font-bold tracking-wider opacity-80">
                      [{rouletteModal.weapon.rarity}]
                    </div>
                    <div className="text-lg font-black mt-1">⚔️ {rouletteModal.weapon.name}</div>
                    <div className="text-xs mt-1">
                      攻撃力: <span className="font-bold">{rouletteModal.weapon.damage}</span> · 射程:{' '}
                      {rouletteModal.weapon.range}m
                    </div>
                    {rouletteModal.weapon.skillName && (
                      <div className="mt-2 pt-2 border-t border-white/15 text-[11px] text-yellow-200">
                        ✨ 固有スキル「{rouletteModal.weapon.skillName}」: {rouletteModal.weapon.skillDesc}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-white/65">
                    現在の装備: {equippedWeapon.name} ([{equippedWeapon.rarity}] 攻撃力 {equippedWeapon.damage})
                  </div>

                  <div className="flex items-center gap-3 w-full">
                    <button
                      onClick={() => {
                        setEquippedWeapon(rouletteModal.weapon);
                        setCombatLog(`⚔️ 新武器「${rouletteModal.weapon.name}」を装備した！`);
                        setRouletteModal(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:brightness-110 transition"
                    >
                      新しい武器を装備する
                    </button>
                    <button
                      onClick={() => {
                        setMazeXp((x) => x + 45);
                        setCombatLog(`現在の武器「${equippedWeapon.name}」を維持し、新武器を経験値(+45 XP)に変換した。`);
                        setRouletteModal(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition"
                    >
                      今の装備を維持 (+45 XP)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Archive / Codex Modal */}
            {showArchiveModal && (
              <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-xl flex items-center justify-center p-6">
                <div className="max-w-lg w-full bg-zinc-900 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85%] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-sm font-bold text-cyan-300">📖 3DMaze アーカイブ・武器図鑑</span>
                    <button onClick={() => setShowArchiveModal(false)} className="text-white/50 hover:text-white">
                      <Icon name="X" size={16} />
                    </button>
                  </div>
                  <div className="overflow-y-auto space-y-3 text-xs">
                    <div>
                      <div className="text-white/50 mb-1">撃破済みボス階層:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((bf) => {
                          const cleared = defeatedBossFloors.includes(bf);
                          return (
                            <span
                              key={bf}
                              className={`px-2 py-1 rounded-lg border font-mono ${
                                cleared
                                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                                  : 'bg-white/5 border-white/10 text-white/30'
                              }`}
                            >
                              {bf}F {cleared ? '✓撃破' : '未撃破'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50 mb-1">所持武器コレクション ({weaponBag.length}種 — クリックで装備切替):</div>
                      <div className="space-y-1.5">
                        {weaponBag.map((w) => (
                          <button
                            key={w.id}
                            onClick={() => {
                              setEquippedWeapon(w);
                              setShowArchiveModal(false);
                            }}
                            className={`w-full p-2 rounded-xl border text-left flex items-center justify-between ${RARITY_COLORS[w.rarity]}`}
                          >
                            <span>
                              ⚔️ {w.name} ({w.rarity})
                            </span>
                            <span className="font-mono">ATK {w.damage}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50 mb-1">発見済み武器履歴 ({discoveredWeapons.length}種):</div>
                      <div className="text-white/70 leading-relaxed">{discoveredWeapons.join(' / ')}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
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
                  <input
                    type="file"
                    accept=".gb,.rom"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setCustomRomName(f.name);
                        setGbRom('custom');
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Touch Controls for Slope Glider */}
        {mode === 'velocity' && (
          <div className="absolute inset-x-6 bottom-6 z-20 flex items-center justify-between pointer-events-none">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setControl('left', true);
              }}
              onPointerUp={() => setControl('left', false)}
              className="w-16 h-16 rounded-2xl glass-jelly flex items-center justify-center text-sky-300 pointer-events-auto"
            >
              <Icon name="ChevronLeft" size={28} />
            </button>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setControl('right', true);
              }}
              onPointerUp={() => setControl('right', false)}
              className="w-16 h-16 rounded-2xl glass-jelly flex items-center justify-center text-sky-300 pointer-events-auto"
            >
              <Icon name="ChevronRight" size={28} />
            </button>
          </div>
        )}

        {/* Game Over / 3DMaze Detailed Result Screen */}
        {(gameOver || mazeVictory) && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/88 p-6 backdrop-blur-2xl">
            {mode === 'maze' ? (
              <div className="max-w-md w-full bg-zinc-900/95 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-3">
                <div className={`text-2xl sm:text-3xl font-black tracking-tight ${mazeVictory ? 'text-amber-300' : 'text-rose-400'}`}>
                  {mazeVictory ? '🏆 50F DUNGEON CLEARED!' : '💀 EXPEDITION FAILED'}
                </div>
                <div className="text-xs text-white/80 font-mono">
                  到達階層: <span className="text-cyan-300 font-bold">{mazeFloor}F / 50F</span> · 難易度: {mazeDifficulty}
                </div>
                {causeOfDeath && !mazeVictory && (
                  <div className="w-full p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                    <div className="text-[10px] uppercase tracking-wider text-rose-400 font-bold mb-0.5">死因 (Cause of Death)</div>
                    <div>{causeOfDeath}</div>
                  </div>
                )}
                <div className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 text-xs grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[10px] text-white/50">木のチェスト</div>
                    <div className="font-mono font-bold text-amber-300">{chestCounts.wood}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/50">銀のチェスト</div>
                    <div className="font-mono font-bold text-slate-200">{chestCounts.silver}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/50">金のチェスト</div>
                    <div className="font-mono font-bold text-yellow-300">{chestCounts.gold}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/50">ボスチェスト</div>
                    <div className="font-mono font-bold text-fuchsia-300">{chestCounts.boss}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/50">アイテム箱</div>
                    <div className="font-mono font-bold text-emerald-300">{chestCounts.item}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/50">経験値箱</div>
                    <div className="font-mono font-bold text-sky-300">{chestCounts.xp}</div>
                  </div>
                </div>
                <div className="text-xs text-white/70">
                  最終装備: <span className="text-white font-semibold">{equippedWeapon.name}</span> ({equippedWeapon.rarity})
                </div>
                <button
                  onClick={() => startNewMazeRun(mazeDifficulty, isDailyChallenge)}
                  className="mt-2 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500 text-black px-6 py-3 font-extrabold text-xs hover:brightness-110 transition"
                >
                  <Icon name="RotateCcw" size={15} /> 1Fから再挑戦する
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
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
