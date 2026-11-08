import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Icon } from '../Icon';
import { PuzzleGamesView } from './ExtraAppsSuite';
import { CloudAndAIGameHub } from './CloudAndAIGameHub';
import {
  QualityPreset,
  ShaderMode,
  SHADER_MODE_META,
  GraphicsSettings,
  CustomDungeonConfig,
  DEFAULT_CUSTOM_CONFIG,
  QUALITY_PRESET_CONFIG,
  createProcedural64x64Textures,
  createScreenSpacePathTracingMaterial,
  createGlslSlashArcMaterial,
  createGlslRunicShockwaveMaterial,
  createGlslPortalVortexMaterial,
  buildWallTorchSconce,
  buildCorridorSpikeTrap,
  buildSwingingPendulumTrap,
  buildDestructibleBarrelOrUrn,
  buildAncientCorridorPillar,
  WallTorchInstance,
} from './glasiaDungeonsEngine';

export type GameMode = 'cloudhub' | 'aistudio' | 'velocity' | 'maze' | '2048' | 'puzzles' | 'gameboy';

interface GameAppProps {
  initialTab?: string;
  payload?: { gameId?: string };
}

function mapPayloadToMode(gameId?: string): GameMode {
  if (!gameId || gameId === 'game') return 'cloudhub';
  if (['cloud', 'github', 'jsdelivr', 'eaglercraft', 'tglsc', 'lumin', 'cloudmoon', 'stash'].some((k) => gameId.includes(k))) {
    return 'cloudhub';
  }
  if (['ai', 'maker', 'studio', 'create'].some((k) => gameId.includes(k))) {
    return 'aistudio';
  }
  if (['minesweeper', 'tictactoe', 'memory', 'typing', 'sudoku', 'puzzles'].some((k) => gameId.includes(k))) {
    return 'puzzles';
  }
  if (gameId.includes('2048')) return '2048';
  if (gameId.includes('maze')) return 'maze';
  if (gameId.includes('gameboy') || gameId.includes('gb') || gameId.includes('rom')) return 'gameboy';
  return 'velocity';
}

// =============================================================
// Glasia Dungeons Types & Constants (50-Floor Procedural Roguelike)
// =============================================================
export type MazeDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'LUNATIC' | 'CUSTOM';

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

export type WeaponCategory = 'sword' | 'gun' | 'spear' | 'axe';

export type MazeAreaId = 'ground' | 'gracia' | 'void' | 'cyber' | 'core';

export interface MazeWeapon {
  id: string;
  name: string;
  category: WeaponCategory;
  element: MazeAreaId;
  variantIndex: 0 | 1 | 2;
  rarity: WeaponRarity;
  damage: number;
  range: number;
  skillName?: string;
  skillDesc?: string;
  cooldownSec?: number;
}

export const WEAPON_CATEGORY_META: Record<
  WeaponCategory,
  { label: string; icon: string; baseRange: number; dmgMult: number; desc: string }
> = {
  sword: { label: '剣 (Sword)', icon: '⚔️', baseRange: 3.1, dmgMult: 1.0, desc: 'バランス型・高速斬撃ウェーブ' },
  gun: { label: '銃 (Gun)', icon: '🔫', baseRange: 7.4, dmgMult: 0.88, desc: '遠距離射撃・高弾速プラズマレーザー' },
  spear: { label: '槍 (Spear)', icon: '🔱', baseRange: 4.6, dmgMult: 1.05, desc: '中距離貫通・直線上の複数敵を同時突き' },
  axe: { label: '斧 (Axe)', icon: '🪓', baseRange: 3.3, dmgMult: 1.32, desc: '重撃粉砕・高威力＆盾ガード貫通(40%)' },
};

export const WEAPON_RARITY_XP_VALUE: Record<WeaponRarity, number> = {
  Common: 45,
  Uncommon: 80,
  Rare: 135,
  Epic: 220,
  Exotic: 340,
  Legendary: 500,
  MYTHIC: 720,
  SECRET: 1000,
  ETERNAL: 1400,
  OG: 2000,
};

// 3 Variants per Rarity for each of the 4 Weapon Categories
const WEAPON_VARIANT_NAMES: Record<WeaponRarity, Record<WeaponCategory, [string, string, string]>> = {
  Common: {
    sword: ['アイアン・ブレード', 'ソルジャー・グラディウス', 'ラスティ・ブロードソード'],
    gun: ['フリント・ピストル', 'アイアン・リボルバー', 'スカウト・ハンドガン'],
    spear: ['アイアン・スピア', 'ガード・パイク', 'ショート・ハルバード'],
    axe: ['アイアン・トマホーク', 'ウッドマン・アックス', 'ヘビー・ハンドアックス'],
  },
  Uncommon: {
    sword: ['スチール・セイバー', 'ナイト・ロングソード', 'エッジ・シミター'],
    gun: ['パルス・カービン', 'デュアル・マグナム', 'タクティカル・ショットガン'],
    spear: ['スチール・ランス', 'ストライク・グレイブ', 'スパイラル・ジャベリン'],
    axe: ['スチール・バトルアックス', 'ウォー・クレセント', 'クラッシャー・バルディッシュ'],
  },
  Rare: {
    sword: ['アストラル・レイピア', 'クリスタル・ファルシオン', 'ルーン・クレイモア'],
    gun: ['フォトン・ライフル', 'アストラル・ブラスター', 'レーザー・スナイパー'],
    spear: ['アストラル・パルチザン', 'クリスタル・トライデント', 'ルーン・インペーラー'],
    axe: ['アストラル・グレートアックス', 'クリスタル・ギロチン', 'ルーン・ウォーハンマー'],
  },
  Epic: {
    sword: ['ファントム・カタナ', 'ナイトメア・ブリンガー', 'シャドウ・デュエルブレード'],
    gun: ['ファントム・レールガン', 'ヴォイド・プラズマ砲', 'サイバー・ガトリング'],
    spear: ['ファントム・ドラグーン槍', 'シャドウ・ロンギヌス', 'ヴォイド・ハルバード'],
    axe: ['ファントム・デストロイヤー', 'ダーク・処刑斧', 'グラビティ・クリーバー'],
  },
  Exotic: {
    sword: ['ネオン・ヴァルキリー剣', 'プリズム・オーロラブレード', 'クォンタム・エッジ'],
    gun: ['ネオン・シンギュラリティ銃', 'プリズム・荷電粒子砲', 'クォンタム・ディスラプター'],
    spear: ['ネオン・ヴァルキリースピア', 'プリズム・スターランス', 'クォンタム・グングニル'],
    axe: ['ネオン・ヴァルキリーアックス', 'プリズム・スターブレイカー', 'クォンタム・タイタン斧'],
  },
  Legendary: {
    sword: ['ソーラー・エクスカリバー', '天叢雲・レジェンド剣', 'アーク・ラグナロク'],
    gun: ['ソーラー・ノヴァキャノン', '天罰・セラフィムライフル', 'アーク・レールキャノン'],
    spear: ['ソーラー・ブリューナク', '天沼矛・レジェンド槍', 'アーク・ロンギヌス'],
    axe: ['ソーラー・アースシェイカー', '天断・レジェンド大斧', 'アーク・リヴァイアサン斧'],
  },
  MYTHIC: {
    sword: ['深淵災厄剣・ミシック壱式', '深淵災厄剣・ミシック弐式', '深淵災厄剣・ミシック参式'],
    gun: ['深淵災厄銃・ミシック壱式', '深淵災厄銃・ミシック弐式', '深淵災厄銃・ミシック参式'],
    spear: ['深淵災厄槍・ミシック壱式', '深淵災厄槍・ミシック弐式', '深淵災厄槍・ミシック参式'],
    axe: ['深淵災厄斧・ミシック壱式', '深淵災厄斧・ミシック弐式', '深淵災厄斧・ミシック参式'],
  },
  SECRET: {
    sword: ['虚空秘匿剣・シークレットα', '虚空秘匿剣・シークレットβ', '虚空秘匿剣・シークレットΩ'],
    gun: ['虚空秘匿銃・シークレットα', '虚空秘匿銃・シークレットβ', '虚空秘匿銃・シークレットΩ'],
    spear: ['虚空秘匿槍・シークレットα', '虚空秘匿槍・シークレットβ', '虚空秘匿槍・シークレットΩ'],
    axe: ['虚空秘匿斧・シークレットα', '虚空秘匿斧・シークレットβ', '虚空秘匿斧・シークレットΩ'],
  },
  ETERNAL: {
    sword: ['永劫星霜剣・エターナル極', '永劫星霜剣・エターナル煌', '永劫星霜剣・エターナル零'],
    gun: ['永劫星霜銃・エターナル極', '永劫星霜銃・エターナル煌', '永劫星霜銃・エターナル零'],
    spear: ['永劫星霜槍・エターナル極', '永劫星霜槍・エターナル煌', '永劫星霜槍・エターナル零'],
    axe: ['永劫星霜斧・エターナル極', '永劫星霜斧・エターナル煌', '永劫星霜斧・エターナル零'],
  },
  OG: {
    sword: ['創世神剣・Glasispect OG-I', '終焉神剣・Glasispect OG-II', '無限神剣・Glasispect OG-III'],
    gun: ['創世神銃・Glasispect OG-I', '終焉神銃・Glasispect OG-II', '無限神銃・Glasispect OG-III'],
    spear: ['創世神槍・Glasispect OG-I', '終焉神槍・Glasispect OG-II', '無限神槍・Glasispect OG-III'],
    axe: ['創世神斧・Glasispect OG-I', '終焉神斧・Glasispect OG-II', '無限神斧・Glasispect OG-III'],
  },
};

export const ELEMENT_PREFIX_META: Record<
  MazeAreaId,
  { prefix: string; colorHex: number; subColorHex: number; bossSkillName: string; bossSkillDesc: string }
> = {
  ground: {
    prefix: '【翠土】',
    colorHex: 0x10b981,
    subColorHex: 0xd97706,
    bossSkillName: 'ガイア・フォートレス',
    bossSkillDesc: 'フロア全域に大地破砕ダメージ＋最大HP+20＆HP35%回復＋制限時間+25秒',
  },
  gracia: {
    prefix: '【蒼氷】',
    colorHex: 0x06b6d4,
    subColorHex: 0x67e8f9,
    bossSkillName: 'アブソリュート・ゼロ',
    bossSkillDesc: 'フロア全域に絶対零度ダメージ＋全敵を8秒間完全氷結停止＋制限時間+25秒',
  },
  void: {
    prefix: '【深淵】',
    colorHex: 0xa855f7,
    subColorHex: 0xe879f9,
    bossSkillName: 'アビス・シンギュラリティ',
    bossSkillDesc: 'フロア全域に虚無重力ダメージ＋松明燃料100%全回復＆HP40%吸収＋制限時間+30秒',
  },
  cyber: {
    prefix: '【電脳】',
    colorHex: 0xec4899,
    subColorHex: 0x00f2ff,
    bossSkillName: 'システム・オーバークロック',
    bossSkillDesc: 'フロア全域に電脳雷撃ダメージ＋25秒間クロノブースト(1.6倍速＆高火力)＋制限時間+30秒',
  },
  core: {
    prefix: '【紅蓮】',
    colorHex: 0xef4444,
    subColorHex: 0xfacc15,
    bossSkillName: 'プロミネンス・メルトダウン',
    bossSkillDesc: 'フロア全域に炉心融解3.0倍ダメージ(盾貫通)＋HP50%回復＋制限時間+45秒',
  },
};

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
  // Supports infinite floors by cycling every 50 floors (1-50, 51-100, 101-150...)
  const cycleFloor = ((Math.max(1, floor) - 1) % 50) + 1;
  const abyssTier = Math.floor((Math.max(1, floor) - 1) / 50) + 1;
  const tierSuffix = abyssTier > 1 ? ` [深淵周回 Tier.${abyssTier}]` : '';

  if (cycleFloor <= 10) {
    return {
      id: 'ground',
      name: 'Ground',
      jpName: `${floor}F 土の迷宮 (Ground)${tierSuffix}`,
      badge: '🟢',
      floorRange: 'Ground Element',
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
  if (cycleFloor <= 20) {
    return {
      id: 'gracia',
      name: 'Gracia',
      jpName: `${floor}F 水晶氷窟 (Gracia)${tierSuffix}`,
      badge: '🔵',
      floorRange: 'Gracia Element',
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
  if (cycleFloor <= 30) {
    return {
      id: 'void',
      name: 'Void Deep',
      jpName: `${floor}F 深淵虚無 (Void Deep)${tierSuffix}`,
      badge: '🟣',
      floorRange: 'Void Element',
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
  if (cycleFloor <= 40) {
    return {
      id: 'cyber',
      name: 'Neon Cyber',
      jpName: `${floor}F 電脳回廊 (Neon Cyber)${tierSuffix}`,
      badge: '💗',
      floorRange: 'Cyber Element',
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
    jpName: `${floor}F 灼熱炉心 (Inferno Core)${tierSuffix}`,
    badge: '🔴',
    floorRange: 'Core Element',
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
  const cycleFloor = ((Math.max(1, floor) - 1) % 50) + 1;
  if (cycleFloor <= 5) return 20 * 60;
  if (cycleFloor <= 10) return 15 * 60;
  if (cycleFloor <= 20) return 12 * 60;
  if (cycleFloor <= 40) return 10 * 60;
  if (cycleFloor <= 49) return 8 * 60;
  return 15 * 60;
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
  name: '【翠土】クリスタル・ダガー (初期装備)',
  category: 'sword',
  element: 'ground',
  variantIndex: 0,
  rarity: 'Rare',
  damage: 42,
  range: 3.1,
};

function rollSwordChestWeapon(chestTier: 'wood' | 'silver' | 'gold', floor: number): MazeWeapon {
  const rand = Math.random() * 100;
  let rarity: WeaponRarity = 'Common';
  if (chestTier === 'wood') {
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

  const categories: WeaponCategory[] = ['sword', 'gun', 'spear', 'axe'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const variantIndex = Math.floor(Math.random() * 3) as 0 | 1 | 2;
  const areaTheme = getAreaThemeForFloor(floor);
  const element = areaTheme.id;
  const elemMeta = ELEMENT_PREFIX_META[element];
  const catMeta = WEAPON_CATEGORY_META[category];

  const multMap: Record<WeaponRarity, number> = {
    Common: 0.75,
    Uncommon: 1.0,
    Rare: 1.3,
    Epic: 1.72,
    Exotic: 2.2,
    Legendary: 2.9,
    MYTHIC: 3.7,
    SECRET: 4.6,
    ETERNAL: 5.9,
    OG: 7.8,
  };

  // 3 Variants per rarity: 0=Speed/Range, 1=Heavy Power, 2=Arcane Balanced
  const variantDmgMult = variantIndex === 1 ? 1.16 : variantIndex === 2 ? 1.08 : 1.0;
  const variantRangeAdd = variantIndex === 0 ? 0.55 : variantIndex === 2 ? 0.3 : 0;

  const baseName = WEAPON_VARIANT_NAMES[rarity][category][variantIndex];
  const dmg = Math.round((28 + floor * 4.8) * multMap[rarity] * catMeta.dmgMult * variantDmgMult);
  const finalRange = Number(
    (catMeta.baseRange + variantRangeAdd + (rarity === 'Legendary' || rarity === 'Exotic' ? 0.5 : 0)).toFixed(1)
  );

  // Exotic & Legendary weapons also carry an elemental active skill
  const hasSkill = rarity === 'Legendary' || rarity === 'Exotic';

  return {
    id: `wpn-${Date.now()}-${Math.random()}`,
    name: `${elemMeta.prefix}${baseName} +${floor}`,
    category,
    element,
    variantIndex,
    rarity,
    damage: dmg,
    range: finalRange,
    skillName: hasSkill ? elemMeta.bossSkillName : undefined,
    skillDesc: hasSkill ? elemMeta.bossSkillDesc : undefined,
    cooldownSec: hasSkill ? 18 : undefined,
  };
}

function rollBossChestWeapon(floor: number, isMajorOrFinal: boolean): MazeWeapon {
  const rand = Math.random() * 100;
  let rarity: WeaponRarity = 'MYTHIC';
  if (floor % 50 === 0 || (isMajorOrFinal && rand > 70)) {
    rarity = 'OG';
  } else if (rand > 45) {
    rarity = 'ETERNAL';
  } else if (rand > 20) {
    rarity = 'SECRET';
  } else {
    rarity = 'MYTHIC';
  }

  const categories: WeaponCategory[] = ['sword', 'gun', 'spear', 'axe'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const variantIndex = Math.floor(Math.random() * 3) as 0 | 1 | 2;
  const areaTheme = getAreaThemeForFloor(floor);
  const element = areaTheme.id;
  const elemMeta = ELEMENT_PREFIX_META[element];
  const catMeta = WEAPON_CATEGORY_META[category];
  const baseName = WEAPON_VARIANT_NAMES[rarity][category][variantIndex];

  const rarityBaseDmg =
    rarity === 'OG'
      ? 185 + floor * 12.5
      : rarity === 'ETERNAL'
      ? 140 + floor * 10
      : rarity === 'SECRET'
      ? 110 + floor * 8
      : 90 + floor * 6.5;

  const variantDmgMult = variantIndex === 1 ? 1.18 : variantIndex === 2 ? 1.09 : 1.0;
  const variantRangeAdd = variantIndex === 0 ? 0.65 : variantIndex === 2 ? 0.35 : 0.15;

  return {
    id: `boss-${rarity.toLowerCase()}-${floor}-${Date.now()}`,
    name: `${elemMeta.prefix}${baseName} [F${floor}]`,
    category,
    element,
    variantIndex,
    rarity,
    damage: Math.round(rarityBaseDmg * catMeta.dmgMult * variantDmgMult),
    range: Number((catMeta.baseRange + 0.8 + variantRangeAdd).toFixed(1)),
    skillName: elemMeta.bossSkillName,
    skillDesc: elemMeta.bossSkillDesc,
    cooldownSec: rarity === 'OG' ? 14 : rarity === 'ETERNAL' ? 16 : 19,
  };
}

export interface LevelUpUpgradeOption {
  id: string;
  title: string;
  desc: string;
  icon: string;
  badgeColor: string;
}

export const LEVEL_UP_UPGRADE_POOL: LevelUpUpgradeOption[] = [
  {
    id: 'atk_up',
    title: '剛力強化 (Power Surge)',
    desc: '基礎攻撃力 +15 ＆ HPを20%回復',
    icon: '⚔️',
    badgeColor: 'border-rose-400/50 bg-rose-950/70 text-rose-200',
  },
  {
    id: 'maxhp_up',
    title: '生命の器 (Vitality Vessel)',
    desc: '最大HP +45 ＆ 現在HP +55 回復',
    icon: '🛡️',
    badgeColor: 'border-emerald-400/50 bg-emerald-950/70 text-emerald-200',
  },
  {
    id: 'wpn_mastery',
    title: '武具習熟 (Weapon Mastery)',
    desc: '装備中の武器攻撃力 +18%強化 ＆ 射程 +0.4m',
    icon: '🎯',
    badgeColor: 'border-amber-400/50 bg-amber-950/70 text-amber-200',
  },
  {
    id: 'swift_stride',
    title: '疾風迅速 (Swift Stride)',
    desc: '移動速度 +12% 恒久UP ＆ クロノブースト +15秒',
    icon: '⚡',
    badgeColor: 'border-cyan-400/50 bg-cyan-950/70 text-cyan-200',
  },
  {
    id: 'time_extend',
    title: '時空拡張 (Chrono Expansion)',
    desc: '現在階層の制限時間 +90秒 ＆ スキルCD即座にリセット',
    icon: '⏳',
    badgeColor: 'border-purple-400/50 bg-purple-950/70 text-purple-200',
  },
  {
    id: 'full_heal',
    title: '完全再生 (Full Restoration)',
    desc: 'HPを100%完全回復 ＆ 最大HP +20',
    icon: '💖',
    badgeColor: 'border-pink-400/50 bg-pink-950/70 text-pink-200',
  },
  {
    id: 'abyss_ward',
    title: '深淵の加護 (Abyssal Ward)',
    desc: '松明燃料100%回復 ＆ セーフティ・シューズ+1個 ＆ 小ポーション+1',
    icon: '🕯️',
    badgeColor: 'border-yellow-400/50 bg-yellow-950/70 text-yellow-200',
  },
  {
    id: 'xp_boost',
    title: '叡智の結晶 (Scholar Blessing)',
    desc: '獲得XPボーナス +25% 恒久UP ＆ 基礎攻撃力 +9',
    icon: '💎',
    badgeColor: 'border-sky-400/50 bg-sky-950/70 text-sky-200',
  },
];

export function GameApp({ initialTab, payload }: GameAppProps) {
  const effectiveGameId = payload?.gameId || initialTab;
  const [mode, setMode] = useState<GameMode>(() => mapPayloadToMode(effectiveGameId));
  const [score, setScore] = useState(0);
  const [, setHighScore] = useState(() => {
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
  // Glasia Dungeons (50-Floor Wide Procedural Roguelike) State
  // =============================================================
  const [mazeScreenState, setMazeScreenState] = useState<'TITLE' | 'PLAYING'>('TITLE');
  const [titleSubModal, setTitleSubModal] = useState<'NONE' | 'DIFFICULTY' | 'CODEX' | 'SETTINGS'>('NONE');
  const [lunaticCleared, setLunaticCleared] = useState<boolean>(() => {
    try {
      return localStorage.getItem('glasia_dungeons_lunatic_cleared') === 'true';
    } catch {
      return false;
    }
  });
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>({
    preset: 'HIGH',
    screenSpacePathTracing: true,
    shaderMode: 'FULL_PT',
    bloomIntensity: 0.9,
    fov: 75,
  });
  const [customConfig, setCustomConfig] = useState<CustomDungeonConfig>(DEFAULT_CUSTOM_CONFIG);

  const [mazeDifficulty, setMazeDifficulty] = useState<MazeDifficulty>('NORMAL');
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const [dailyBestFloor, setDailyBestFloor] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('glasia_daily_best_floor') || '1') || 1;
    } catch {
      return 1;
    }
  });
  const [dailyBestTimeSec, setDailyBestTimeSec] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('glasia_daily_best_time') || '0') || 0;
    } catch {
      return 0;
    }
  });
  const [mazeFloor, setMazeFloor] = useState(1);
  const [mazeRunId, setMazeRunId] = useState(0);
  const [mazeHp, setMazeHp] = useState(120);
  const [mazeMaxHp, setMazeMaxHp] = useState(120);
  const [mazeAtk, setMazeAtk] = useState(18);
  const [mazeMoveSpeedMult, setMazeMoveSpeedMult] = useState(1.0);
  const [mazeXpMult, setMazeXpMult] = useState(1.0);
  const [critChance, setCritChance] = useState(0.15);
  const [weaponRangeBonus, setWeaponRangeBonus] = useState(0);
  const [skillHaste, setSkillHaste] = useState(0);
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

  // Top-of-screen Non-Blocking Roulette State (P key to equip, 10s auto-convert to XP)
  const [topRoulette, setTopRoulette] = useState<{
    chestTitle: string;
    weapon: MazeWeapon;
    spinning: boolean;
    previewName: string;
    previewRarity: WeaponRarity;
    previewCategory: WeaponCategory;
    secondsLeft: number;
  } | null>(null);

  // Level-Up 3-Choice Upgrade Queue & Active Options
  const [pendingLevelUpCount, setPendingLevelUpCount] = useState(0);
  const [levelUpChoices, setLevelUpChoices] = useState<LevelUpUpgradeOption[] | null>(null);

  // Floor timer, Torch Fuel (Void floors), Chrono Boost, Freeze Timer, Skill Cooldown
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

  // Chest Counts & Result / Cause of Death / Archive Modals
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
  const [combatLog, setCombatLog] = useState<string>('1F 土の迷宮へ進入。壁の松明を頼りにランダム配置された階段を探せ！');
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [discoveredWeapons, setDiscoveredWeapons] = useState<string[]>([INITIAL_DAGGER.name]);

  // Minimap state (wide grid: 0=empty, 1=wall, 2=stairs, 3=chest, 4=pitfall, 5=warp, 6=magma/glitch, 7=spike/pendulum)
  const [minimapGrid, setMinimapGrid] = useState<number[][]>([]);
  const [playerGridPos, setPlayerGridPos] = useState<{ r: number; c: number; yaw: number }>({ r: 1, c: 1, yaw: 0 });
  const [stairsGridPos, setStairsGridPos] = useState<{ r: number; c: number }>({ r: 22, c: 22 });

  // Refs for inside the 60fps Three.js loop
  const mazeStateRef = useRef({
    floor: mazeFloor,
    hp: mazeHp,
    maxHp: mazeMaxHp,
    atk: mazeAtk,
    moveSpeedMult: mazeMoveSpeedMult,
    xpMult: mazeXpMult,
    critChance,
    weaponRangeBonus,
    skillHaste,
    weapon: equippedWeapon,
    torchFuel,
    chronoBoostSec,
    difficulty: mazeDifficulty,
    defeatedBossFloors,
    safetyShoesCount: itemBag.safety_shoes,
    graphicsSettings,
    customConfig,
  });
  useEffect(() => {
    mazeStateRef.current = {
      floor: mazeFloor,
      hp: mazeHp,
      maxHp: mazeMaxHp,
      atk: mazeAtk,
      moveSpeedMult: mazeMoveSpeedMult,
      xpMult: mazeXpMult,
      critChance,
      weaponRangeBonus,
      skillHaste,
      weapon: equippedWeapon,
      torchFuel,
      chronoBoostSec,
      difficulty: mazeDifficulty,
      defeatedBossFloors,
      safetyShoesCount: itemBag.safety_shoes,
      graphicsSettings,
      customConfig,
    };
  }, [
    mazeFloor,
    mazeHp,
    mazeMaxHp,
    mazeAtk,
    mazeMoveSpeedMult,
    mazeXpMult,
    critChance,
    weaponRangeBonus,
    skillHaste,
    equippedWeapon,
    torchFuel,
    chronoBoostSec,
    mazeDifficulty,
    defeatedBossFloors,
    itemBag.safety_shoes,
    graphicsSettings,
    customConfig,
  ]);

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

  // Roll 3 distinct Level-Up Upgrade options whenever pendingLevelUpCount > 0 and levelUpChoices is null
  useEffect(() => {
    if (pendingLevelUpCount > 0 && !levelUpChoices) {
      const shuffled = [...LEVEL_UP_UPGRADE_POOL].sort(() => Math.random() - 0.5);
      setLevelUpChoices(shuffled.slice(0, 3));
    }
  }, [pendingLevelUpCount, levelUpChoices]);

  // Centralized XP gain helper: handles multi-level-ups and triggers 3-choice level-up selection
  const gainMazeXp = useCallback(
    (rawAmount: number, reasonText?: string) => {
      const scaledAmount = Math.max(1, Math.round(rawAmount * mazeStateRef.current.xpMult));
      setMazeXp((prevXp) => {
        let total = prevXp + scaledAmount;
        let gainedLevels = 0;
        let req = mazeXpNext;
        while (total >= req) {
          total -= req;
          gainedLevels++;
          req = Math.round(req * 1.18 + 25);
        }
        if (gainedLevels > 0) {
          playSound('levelup');
          setMazeLevel((l) => l + gainedLevels);
          setMazeXpNext(req);
          setMazeMaxHp((h) => h + gainedLevels * 15);
          setMazeHp((h) => h + gainedLevels * 15);
          setMazeAtk((a) => a + gainedLevels * 5);
          setPendingLevelUpCount((c) => c + gainedLevels);
          setCombatLog(
            `🎉 LEVEL UP! (+${gainedLevels}LV) 画面上部の3択アップグレード[1/2/3キー]から強化項目を選択してください！`
          );
        } else if (reasonText) {
          setCombatLog(`${reasonText} (+${scaledAmount} XP)`);
        }
        return total;
      });
    },
    [mazeXpNext, playSound]
  );

  // Apply chosen Level-Up Upgrade from the 3 choices
  const handleSelectLevelUpUpgrade = useCallback(
    (opt: LevelUpUpgradeOption) => {
      playSound('score');
      if (opt.id === 'atk_up') {
        setMazeAtk((a) => a + 15);
        setCritChance((c) => Math.min(0.75, Number((c + 0.04).toFixed(2))));
        setMazeHp((h) => Math.min(mazeStateRef.current.maxHp, h + Math.round(mazeStateRef.current.maxHp * 0.2)));
      } else if (opt.id === 'maxhp_up') {
        setMazeMaxHp((m) => m + 45);
        setMazeHp((h) => Math.min(mazeStateRef.current.maxHp + 45, h + 55));
      } else if (opt.id === 'wpn_mastery') {
        setWeaponRangeBonus((r) => Number((r + 0.35).toFixed(2)));
        setEquippedWeapon((w) => ({
          ...w,
          damage: Math.round(w.damage * 1.18),
          range: Number((w.range + 0.4).toFixed(1)),
        }));
      } else if (opt.id === 'swift_stride') {
        setMazeMoveSpeedMult((m) => Number((m + 0.12).toFixed(2)));
        setChronoBoostSec((s) => s + 15);
      } else if (opt.id === 'time_extend') {
        setFloorTimeLeft((t) => t + 90);
        setSkillHaste((h) => Math.min(0.5, Number((h + 0.08).toFixed(2))));
        setSkillCooldown(0);
      } else if (opt.id === 'full_heal') {
        setMazeMaxHp((m) => m + 20);
        setMazeHp(mazeStateRef.current.maxHp + 20);
      } else if (opt.id === 'abyss_ward') {
        setTorchFuel(100);
        setItemBag((b) => ({
          ...b,
          safety_shoes: (b.safety_shoes || 0) + 1,
          potion_s: (b.potion_s || 0) + 1,
        }));
      } else if (opt.id === 'xp_boost') {
        setMazeXpMult((m) => Number((m + 0.25).toFixed(2)));
        setMazeAtk((a) => a + 9);
      }

      setCombatLog(`✨ レベルアップ強化「${opt.title}」を習得しました！`);
      setLevelUpChoices(null);
      setPendingLevelUpCount((c) => Math.max(0, c - 1));
    },
    [playSound]
  );

  // Trigger Non-Blocking Top Roulette Banner when opening a Weapon or Boss Chest
  const triggerTopWeaponRoulette = useCallback((chestTitle: string, rolledWeapon: MazeWeapon, candidates?: MazeWeapon[]) => {
    setWeaponBag((bag) => [rolledWeapon, ...bag]);
    setDiscoveredWeapons((d) => (d.includes(rolledWeapon.name) ? d : [...d, rolledWeapon.name]));
    const firstCandidate = candidates && candidates.length > 0 ? candidates[0] : rolledWeapon;
    setTopRoulette({
      chestTitle,
      weapon: rolledWeapon,
      spinning: true,
      previewName: firstCandidate.name,
      previewRarity: firstCandidate.rarity,
      previewCategory: firstCandidate.category,
      secondsLeft: 10,
    });
  }, []);

  // Roulette Spin Animation Effect (first 900ms spins through random weapons/rarities, then locks in for 10s countdown)
  useEffect(() => {
    if (!topRoulette || !topRoulette.spinning) return;
    const rarities: WeaponRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Exotic', 'Legendary', 'MYTHIC', 'ETERNAL', 'OG'];
    const categories: WeaponCategory[] = ['sword', 'gun', 'spear', 'axe'];
    let step = 0;
    const spinInterval = window.setInterval(() => {
      step++;
      const r = rarities[step % rarities.length];
      const c = categories[step % categories.length];
      const sampleName = WEAPON_VARIANT_NAMES[r][c][step % 3];
      setTopRoulette((prev) =>
        prev
          ? {
              ...prev,
              previewName: sampleName,
              previewRarity: r,
              previewCategory: c,
            }
          : null
      );
      if (step >= 9) {
        clearInterval(spinInterval);
        setTopRoulette((prev) =>
          prev
            ? {
                ...prev,
                spinning: false,
                previewName: prev.weapon.name,
                previewRarity: prev.weapon.rarity,
                previewCategory: prev.weapon.category,
                secondsLeft: 10,
              }
            : null
        );
      }
    }, 95);
    return () => clearInterval(spinInterval);
  }, [topRoulette?.spinning, topRoulette?.weapon.id]);

  // 1-second countdown for Top Roulette Banner (auto-converts to Rarity XP after 10 seconds if P not pressed)
  useEffect(() => {
    if (!topRoulette || topRoulette.spinning) return;
    const timer = window.setInterval(() => {
      setTopRoulette((prev) => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) {
          const xpVal = WEAPON_RARITY_XP_VALUE[prev.weapon.rarity] || 80;
          setTimeout(() => {
            gainMazeXp(xpVal, `⏱ 10秒経過により「${prev.weapon.name}」[${prev.weapon.rarity}] を経験値へ自動変換`);
          }, 0);
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [topRoulette?.spinning, topRoulette?.weapon.id, gainMazeXp]);

  // Equip weapon from Top Roulette (via P key or button click)
  const equipTopRouletteWeapon = useCallback(() => {
    setTopRoulette((prev) => {
      if (!prev) return null;
      playSound('levelup');
      setEquippedWeapon(prev.weapon);
      const icon = WEAPON_CATEGORY_META[prev.weapon.category].icon;
      setCombatLog(`${icon} 新武器「${prev.weapon.name}」(${prev.weapon.rarity}) を装備した！`);
      return null;
    });
  }, [playSound]);

  // Convert Top Roulette weapon to XP manually
  const convertTopRouletteToXp = useCallback(() => {
    setTopRoulette((prev) => {
      if (!prev) return null;
      const xpVal = WEAPON_RARITY_XP_VALUE[prev.weapon.rarity] || 80;
      setTimeout(() => {
        gainMazeXp(xpVal, `💎 「${prev.weapon.name}」[${prev.weapon.rarity}] を経験値に変換`);
      }, 0);
      return null;
    });
  }, [gainMazeXp]);

  // Global Keyboard shortcuts for P (equip roulette weapon) and 1/2/3 (select level-up upgrade)
  useEffect(() => {
    if (mode !== 'maze' || mazeScreenState !== 'PLAYING') return;
    const onGlobalKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
        if (topRoulette) {
          e.preventDefault();
          equipTopRouletteWeapon();
        }
      } else if (levelUpChoices && levelUpChoices.length === 3) {
        if (e.code === 'Digit1' || e.key === '1') {
          e.preventDefault();
          handleSelectLevelUpUpgrade(levelUpChoices[0]);
        } else if (e.code === 'Digit2' || e.key === '2') {
          e.preventDefault();
          handleSelectLevelUpUpgrade(levelUpChoices[1]);
        } else if (e.code === 'Digit3' || e.key === '3') {
          e.preventDefault();
          handleSelectLevelUpUpgrade(levelUpChoices[2]);
        }
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, [mode, mazeScreenState, topRoulette, levelUpChoices, equipTopRouletteWeapon, handleSelectLevelUpUpgrade]);

  // Save Daily Challenge Record helper
  const recordDailyChallengeBest = useCallback(
    (reachedFloor: number, seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const formatted = `F${reachedFloor} (${mins}m${secs < 10 ? '0' : ''}${secs}s · ${mazeDifficulty})`;
      setDailyBestFloor((prev) => {
        const nextBest = Math.max(prev, reachedFloor);
        try {
          localStorage.setItem('glasia_daily_best_floor', String(nextBest));
        } catch {
          // ignore
        }
        return nextBest;
      });
      setDailyBestTimeSec((prev) => {
        const nextSec = prev === 0 ? seconds : Math.min(prev, seconds);
        try {
          localStorage.setItem('glasia_daily_best_time', String(nextSec));
        } catch {
          // ignore
        }
        return nextSec;
      });
      try {
        localStorage.setItem('glassium_3dmaze_daily_best', formatted);
      } catch {
        // ignore
      }
    },
    [mazeDifficulty]
  );

  // Trigger Game Over in Glasia Dungeons with specific Cause of Death
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

  // 1-second timer tick for Glasia Dungeons floor time limit, Torch Fuel (Void floors), and cooldowns
  useEffect(() => {
    if (mode !== 'maze' || mazeScreenState !== 'PLAYING' || gameOver || mazeVictory) return;
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

      // Void Area (floors 21-30) Handheld Torch Fuel drain
      const cycleFloor = ((mazeFloor - 1) % 50) + 1;
      if (cycleFloor >= 21 && cycleFloor <= 30) {
        setTorchFuel((prev) => {
          const next = Math.max(0, prev - 2);
          if (next === 0 && Math.random() < 0.35) {
            triggerMazeDeath(`${mazeFloor}F (Void) にて手持ち松明の燃料が尽き、即死モンスター「深淵の影」に呑み込まれた`);
          }
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, mazeScreenState, gameOver, mazeVictory, mazeFloor, triggerMazeDeath]);

  // Reset floor timer & map state when changing floor (Up to 50 Floors! Clearing 50F conquers the dungeon & unlocks CUSTOM on LUNATIC)
  const advanceToFloor = useCallback(
    (targetFloor: number, logMessage?: string) => {
      const currentF = mazeStateRef.current.floor;
      let clampedTarget = Math.max(1, targetFloor);

      if (clampedTarget > currentF) {
        for (let f = currentF; f <= Math.min(50, clampedTarget); f++) {
          const isBossF = f % 5 === 0;
          if (isBossF && !mazeStateRef.current.defeatedBossFloors.includes(f)) {
            clampedTarget = f;
            break;
          }
        }
      }

      // If advancing beyond 50F (and 50F boss is defeated), trigger 50F Dungeon Conquest!
      if (clampedTarget > 50 && mazeStateRef.current.defeatedBossFloors.includes(50)) {
        playSound('levelup');
        setMazeVictory(true);
        if (mazeStateRef.current.difficulty === 'LUNATIC') {
          setLunaticCleared(true);
          try {
            localStorage.setItem('glasia_dungeons_lunatic_cleared', 'true');
          } catch {
            // ignore
          }
        }
        if (isDailyChallenge) {
          recordDailyChallengeBest(50, totalRunSeconds);
        }
        return;
      }

      clampedTarget = Math.min(50, clampedTarget);
      setMazeFloor(clampedTarget);
      setFloorTimeLeft(getFloorTimeLimitSeconds(clampedTarget));
      setMapRevealed(false);
      setDirectionEyeActive(false);
      const cycleF = ((clampedTarget - 1) % 50) + 1;
      if (cycleF >= 21 && cycleF <= 30) {
        setTorchFuel(100);
      }
      if (logMessage) {
        setCombatLog(logMessage);
      } else {
        const theme = getAreaThemeForFloor(clampedTarget);
        setCombatLog(
          cycleF >= 21 && cycleF <= 30
            ? `${clampedTarget}F [${theme.name}] へ進入！ 壁の松明が消滅し、左手の手持ち松明が頼りだ！`
            : `${clampedTarget}F / 50F [${theme.name}] へ進入！ 広大な自動生成迷宮とランダム配置の階段を探索せよ！`
        );
      }
      if (isDailyChallenge) {
        recordDailyChallengeBest(clampedTarget, totalRunSeconds);
      }
    },
    [isDailyChallenge, playSound, recordDailyChallengeBest, totalRunSeconds]
  );

  // Start a fresh 50-Floor Glasia Dungeons run
  const startNewMazeRun = (diff: MazeDifficulty = mazeDifficulty, daily = isDailyChallenge) => {
    setMazeDifficulty(diff);
    setIsDailyChallenge(daily);
    setMazeScreenState('PLAYING');
    setTitleSubModal('NONE');
    setMazeFloor(1);
    setMazeRunId((id) => id + 1);
    const baseHp = diff === 'EASY' ? 160 : diff === 'NORMAL' ? 120 : diff === 'HARD' ? 100 : diff === 'LUNATIC' ? 80 : 140;
    setMazeHp(baseHp);
    setMazeMaxHp(baseHp);
    setMazeAtk(diff === 'EASY' ? 24 : 18);
    setMazeMoveSpeedMult(1.0);
    setMazeXpMult(1.0);
    setCritChance(0.15);
    setWeaponRangeBonus(0);
    setSkillHaste(0);
    setMazeLevel(1);
    setMazeXp(0);
    setMazeXpNext(100);

    // If CUSTOM mode with custom starting rarity, generate starting weapon of that rarity
    const raritiesList: WeaponRarity[] = [
      'Common',
      'Uncommon',
      'Rare',
      'Epic',
      'Exotic',
      'Legendary',
      'MYTHIC',
      'SECRET',
      'ETERNAL',
      'OG',
    ];
    const startWpn =
      diff === 'CUSTOM' && customConfig.startingRarityIndex > 0
        ? buildWeaponInstance(
            raritiesList[Math.min(9, customConfig.startingRarityIndex)],
            'sword',
            'ground',
            0,
            1
          )
        : INITIAL_DAGGER;

    setEquippedWeapon(startWpn);
    setWeaponBag([startWpn]);
    setTopRoulette(null);
    setPendingLevelUpCount(0);
    setLevelUpChoices(null);
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
    setCombatLog(
      daily
        ? `🏆 デイリーチャレンジ (RTA) 開始！ 初期装備「${startWpn.name}」で全50階層踏破を目指せ！`
        : `Glasia Dungeons [難易度: ${diff}] 1F/50F へ進入！ 壁の松明を頼りにランダム配置された出口階段を探せ！`
    );
    setTimeout(() => {
      containerRef.current?.focus();
    }, 30);
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
      setItemBag((prev) => ({ ...prev, safety_shoes: (prev.safety_shoes || 0) + 1 }));
      setCombatLog(`🥾 セーフティ・シューズは所持しているだけで落とし穴の即死を自動無効化します（残り ${itemBag.safety_shoes} 回）。`);
    }
  };

  // =============================================================
  // 1. Slope-style Smooth Downhill Gliding Racer (Velocity 3D)
  //    - Fixed Real Vertical Gravity & Ground Surface Contact:
  //      Ball drops from above at start, lands on the sloped ground,
  //      bounces slightly, rolls flush along the track, launches off
  //      jump ramps, and falls into the abyss if steered off the edge!
  // =============================================================
  const initVelocityRacer = (container: HTMLDivElement) => {
    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.009);

    const camera = new THREE.PerspectiveCamera(72, width / height, 0.1, 1000);
    camera.position.set(0, 4.2, 6.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.style.outline = 'none';
    renderer.domElement.tabIndex = 0;
    container.appendChild(renderer.domElement);

    setTimeout(() => {
      renderer.domElement.focus();
    }, 30);

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
    dirLight.position.set(10, 25, 14);
    scene.add(dirLight);

    const ballRadius = 0.68;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x00f2ff,
      metalness: 0.85,
      roughness: 0.12,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    // Start ball in mid-air at y = 4.2 so it physically drops onto the slope under gravity!
    ball.position.set(0, 4.2, 0);
    scene.add(ball);

    const wireBall = new THREE.Mesh(
      new THREE.SphereGeometry(ballRadius + 0.04, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, wireframe: true, transparent: true, opacity: 0.55 })
    );
    ball.add(wireBall);

    // Contact shadow ring on the track directly beneath the ball
    const shadowRing = new THREE.Mesh(
      new THREE.CircleGeometry(ballRadius * 1.15, 24),
      new THREE.MeshBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.35, depthWrite: false })
    );
    const slopeGrade = 0.13; // Downhill slope ratio: y = z * slopeGrade (so at z = 0, track surface y = 0!)
    const slopeAngle = Math.atan(slopeGrade);
    shadowRing.rotation.x = -Math.PI / 2 - slopeAngle;
    shadowRing.position.set(0, 0.03, 0);
    scene.add(shadowRing);

    // Downhill Slope Track with 64x64 Cyber Grid Texture
    const trackWidth = 15;
    const segmentLength = 30;
    const trackSegments: THREE.Group[] = [];
    const totalSegments = 18;

    const { map: trackTex, bumpMap: trackBump } = createProcedural64x64Textures('cyber', 'floor');
    trackTex.repeat.set(6, 12);
    trackBump.repeat.set(6, 12);

    const trackMat = new THREE.MeshStandardMaterial({
      map: trackTex,
      bumpMap: trackBump,
      bumpScale: 0.05,
      roughness: 0.28,
      metalness: 0.78,
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
    const archMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true, transparent: true, opacity: 0.4 });

    for (let i = 0; i < totalSegments; i++) {
      const segGroup = new THREE.Group();
      const segLengthHypot = segmentLength * Math.sqrt(1 + slopeGrade * slopeGrade);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(trackWidth, segLengthHypot), trackMat);
      floor.rotation.x = -Math.PI / 2 - slopeAngle;
      segGroup.add(floor);

      const leftNeon = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, segLengthHypot), glowMat);
      leftNeon.rotation.x = -slopeAngle;
      leftNeon.position.set(-trackWidth / 2, 0.14, 0);
      segGroup.add(leftNeon);

      const rightNeon = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, segLengthHypot), glowMat);
      rightNeon.rotation.x = -slopeAngle;
      rightNeon.position.set(trackWidth / 2, 0.14, 0);
      segGroup.add(rightNeon);

      if (i % 2 === 0) {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(trackWidth * 0.56, 0.12, 8, 24, Math.PI), archMat);
        arch.position.set(0, 0.2, 0);
        segGroup.add(arch);
      }

      const zPos = -i * segmentLength;
      segGroup.position.set(0, zPos * slopeGrade, zPos);
      scene.add(segGroup);
      trackSegments.push(segGroup);
    }

    // Obstacles, Gems & Jump Boost Ramps
    interface EntityItem {
      mesh: THREE.Mesh;
      type: 'obstacle' | 'gem' | 'ramp';
    }
    const entities: EntityItem[] = [];
    const obsGeo = new THREE.BoxGeometry(1.75, 1.2, 0.95);
    const obsMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const gemGeo = new THREE.OctahedronGeometry(0.58);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 1.35,
    });
    const rampGeo = new THREE.BoxGeometry(2.6, 0.35, 2.2);
    const rampMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.9,
    });
    const lanes = [-5.2, -2.6, 0, 2.6, 5.2];

    const spawnEntity = (zPos: number) => {
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      const roll = Math.random();
      const baseSurfaceY = zPos * slopeGrade;
      if (roll < 0.16) {
        const m = new THREE.Mesh(rampGeo, rampMat);
        m.rotation.x = -slopeAngle + 0.28;
        m.position.set(lane, baseSurfaceY + 0.2, zPos);
        scene.add(m);
        entities.push({ mesh: m, type: 'ramp' });
      } else if (roll < 0.58) {
        const m = new THREE.Mesh(gemGeo, gemMat);
        m.position.set(lane, baseSurfaceY + 0.85, zPos);
        scene.add(m);
        entities.push({ mesh: m, type: 'gem' });
      } else {
        const m = new THREE.Mesh(obsGeo, obsMat);
        m.rotation.x = -slopeAngle;
        m.position.set(lane, baseSurfaceY + 0.65, zPos);
        scene.add(m);
        entities.push({ mesh: m, type: 'obstacle' });
      }
    };

    for (let z = -45; z > -360; z -= 24) {
      spawnEntity(z);
    }

    // Multi-channel Steering Input State
    let inputLeft = false;
    let inputRight = false;
    let pointerSteerActive = false;
    let pointerTargetX: number | null = null;

    const isLeftKey = (e: KeyboardEvent) =>
      e.code === 'ArrowLeft' ||
      e.code === 'KeyA' ||
      e.code === 'Numpad4' ||
      e.key === 'ArrowLeft' ||
      e.key === 'a' ||
      e.key === 'A' ||
      e.key === '4';

    const isRightKey = (e: KeyboardEvent) =>
      e.code === 'ArrowRight' ||
      e.code === 'KeyD' ||
      e.code === 'Numpad6' ||
      e.key === 'ArrowRight' ||
      e.key === 'd' ||
      e.key === 'D' ||
      e.key === '6';

    const onDown = (e: KeyboardEvent) => {
      if (isLeftKey(e)) {
        inputLeft = true;
        e.preventDefault();
      }
      if (isRightKey(e)) {
        inputRight = true;
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (isLeftKey(e)) inputLeft = false;
      if (isRightKey(e)) inputRight = false;
    };

    const updatePointerTarget = (clientX: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const normX = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointerTargetX = normX * (trackWidth * 0.48);
    };
    const onPointerDownCanvas = (e: PointerEvent) => {
      renderer.domElement.focus();
      pointerSteerActive = true;
      updatePointerTarget(e.clientX);
    };
    const onPointerMoveCanvas = (e: PointerEvent) => {
      if (pointerSteerActive) {
        updatePointerTarget(e.clientX);
      }
    };
    const onPointerUpCanvas = () => {
      pointerSteerActive = false;
      pointerTargetX = null;
    };

    window.addEventListener('keydown', onDown, { passive: false });
    window.addEventListener('keyup', onUp);
    renderer.domElement.addEventListener('pointerdown', onPointerDownCanvas);
    window.addEventListener('pointermove', onPointerMoveCanvas);
    window.addEventListener('pointerup', onPointerUpCanvas);

    let ballX = 0;
    let ballVelX = 0;
    let ballY = 4.2; // Starts above the track and falls onto the ground!
    let ballVelY = -0.05;
    let isFallingOffEdge = false;
    let currentDistance = 0;
    let slopeSpeed = 1.65;
    let upgradeLevel = 1;
    let frameCount = 0;

    const animate = () => {
      gameLoopRef.current = requestAnimationFrame(animate);
      frameCount++;

      // 1. Apply Lateral Steering Input
      const steerAccel = 0.048;
      const maxVelX = 0.38;
      const moveLeft = inputLeft || controlsRef.current.left;
      const moveRight = inputRight || controlsRef.current.right;

      if (moveLeft && !moveRight) {
        ballVelX = Math.max(-maxVelX, ballVelX - steerAccel);
      } else if (moveRight && !moveLeft) {
        ballVelX = Math.min(maxVelX, ballVelX + steerAccel);
      } else if (pointerSteerActive && pointerTargetX !== null) {
        const diff = pointerTargetX - ballX;
        ballVelX = Math.max(-maxVelX, Math.min(maxVelX, diff * 0.15));
      } else {
        ballVelX *= 0.84;
        if (Math.abs(ballVelX) < 0.002) ballVelX = 0;
      }

      ballX += ballVelX;

      // 2. Apply Real Vertical Gravity & Slope Ground Contact
      const gravity = 0.036;
      ballVelY -= gravity;
      ballY += ballVelY;

      const overTrack = Math.abs(ballX) <= trackWidth / 2 + 0.22;
      if (!overTrack && ballY <= ballRadius + 0.15) {
        isFallingOffEdge = true;
      }

      // Ground height at z = 0 is y = 0, so ball center rests at y = ballRadius (0.68)
      if (!isFallingOffEdge && overTrack) {
        if (ballY <= ballRadius) {
          ballY = ballRadius;
          if (ballVelY < -0.22) {
            // Elastic bounce when landing from initial drop or jump ramp
            ballVelY = -ballVelY * 0.32;
            playSound('score');
          } else {
            ballVelY = 0;
          }
        }
        shadowRing.visible = true;
        shadowRing.position.x = ballX;
        const heightAboveGround = Math.max(0, ballY - ballRadius);
        shadowRing.scale.setScalar(Math.max(0.35, 1.0 - heightAboveGround * 0.18));

        camera.position.x += (ballX * 0.44 - camera.position.x) * 0.18;
        camera.position.y += (3.3 + heightAboveGround * 0.35 - camera.position.y) * 0.15;
        camera.lookAt(ballX * 0.25, -1.2, -14);
      } else {
        shadowRing.visible = false;
        camera.position.x = ballX * 0.55;
        camera.lookAt(ball.position.x, ball.position.y - 1.2, ball.position.z - 4);

        if (ballY < -11.0) {
          playSound('crash');
          setGameOver(true);
          cancelAnimationFrame(gameLoopRef.current);
          return;
        }
      }

      currentDistance += slopeSpeed;
      const calculatedUpgrade = Math.floor(currentDistance / 600) + 1;
      if (calculatedUpgrade > upgradeLevel) {
        upgradeLevel = calculatedUpgrade;
        slopeSpeed += 0.22;
        playSound('levelup');
      }

      ball.position.set(ballX, ballY, 0);
      ball.rotation.x -= slopeSpeed * 0.14;
      ball.rotation.z -= ballVelX * 0.48;

      // 3. Advance Track Segments & Lock Y to Slope Grade (seg.y = seg.z * slopeGrade)
      trackSegments.forEach((seg) => {
        seg.position.z += slopeSpeed;
        if (seg.position.z > segmentLength * 1.5) {
          seg.position.z -= totalSegments * segmentLength;
        }
        seg.position.y = seg.position.z * slopeGrade;
      });

      // 4. Advance Entities Along Slope Surface & Check Collisions
      for (let i = entities.length - 1; i >= 0; i--) {
        const ent = entities[i];
        ent.mesh.position.z += slopeSpeed;
        const surfaceY = ent.mesh.position.z * slopeGrade;
        if (ent.type === 'gem') {
          ent.mesh.position.y = surfaceY + 0.85 + Math.sin(frameCount * 0.1 + i) * 0.12;
          ent.mesh.rotation.y += 0.06;
        } else if (ent.type === 'ramp') {
          ent.mesh.position.y = surfaceY + 0.2;
        } else {
          ent.mesh.position.y = surfaceY + 0.65;
        }

        const dx = Math.abs(ball.position.x - ent.mesh.position.x);
        const dz = Math.abs(ball.position.z - ent.mesh.position.z);
        const dy = Math.abs(ball.position.y - ent.mesh.position.y);

        if (!isFallingOffEdge) {
          if (ent.type === 'ramp' && dx < 1.45 && dz < 1.25 && ballY <= ballRadius + 0.5) {
            ballVelY = 0.52; // Launch ball into the air!
            playSound('boost');
          } else if (ent.type === 'gem' && dx < 1.25 && dz < 1.15 && dy < 1.35) {
            currentDistance += 220;
            updateScore(Math.round(currentDistance));
            playSound('score');
            scene.remove(ent.mesh);
            entities.splice(i, 1);
            continue;
          } else if (ent.type === 'obstacle' && dx < 1.05 && dz < 0.68 && ballY < 1.65) {
            playSound('crash');
            setGameOver(true);
            cancelAnimationFrame(gameLoopRef.current);
            return;
          }
        }

        if (ent.mesh.position.z > 12) {
          scene.remove(ent.mesh);
          entities.splice(i, 1);
          spawnEntity(-320);
        }
      }

      if (frameCount % 6 === 0) {
        setSpeedGauge(Math.round(slopeSpeed * 100));
        updateScore(Math.round(currentDistance));
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDownCanvas);
      window.removeEventListener('pointermove', onPointerMoveCanvas);
      window.removeEventListener('pointerup', onPointerUpCanvas);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  };

  // =============================================================
  // 2. Glasia Dungeons — AAA 50-Floor Wide Procedural Roguelike Engine
  //    - 64x64 Procedural Pixel-PBR Textures (Albedo + Bump)
  //    - GLSL Screen-Space Path Tracing GI & Post-Processing
  //    - Dark Atmosphere: Wall Torches ONLY on non-Void floors;
  //      Handheld Torch ONLY on Void floors (21-30F, zero wall torches)
  //    - Wide 26x26..32x32 Single Floor + Randomized Goal Stairs Every Run
  //    - Corridor Spike Traps, Swinging Pendulums, Destructible Barrels/Urns
  // =============================================================
  const initMaze = (container: HTMLDivElement, activeFloor: number) => {
    const stInit = mazeStateRef.current;
    const gfx = stInit.graphicsSettings;
    const presetCfg = QUALITY_PRESET_CONFIG[gfx.preset];
    const isCustom = stInit.difficulty === 'CUSTOM';
    const customCfg = stInit.customConfig;

    const areaTheme = getAreaThemeForFloor(activeFloor);
    const cycleFloor = ((Math.max(1, activeFloor) - 1) % 50) + 1;
    const isVoidFloor = cycleFloor >= 21 && cycleFloor <= 30;

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);
    const rtWidth = Math.max(240, Math.round(width * presetCfg.pixelRatio));
    const rtHeight = Math.max(180, Math.round(height * presetCfg.pixelRatio));

    const scene = new THREE.Scene();
    // Darker, richer abyssal background color + hardware exponential fog
    const darkBgColor = new THREE.Color(areaTheme.fogColorHex).multiplyScalar(0.32);
    scene.background = darkBgColor;
    scene.fog = new THREE.FogExp2(darkBgColor, isVoidFloor ? 0.068 : 0.042);

    const camera = new THREE.PerspectiveCamera(gfx.fov || 75, width / height, 0.1, 75);

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // GLSL Screen-Space Path Tracing GI & Multi-Shader RenderTarget
    const renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight);
    renderTarget.texture.minFilter = THREE.NearestFilter;
    renderTarget.texture.magFilter = THREE.NearestFilter;
    renderTarget.depthTexture = new THREE.DepthTexture(rtWidth, rtHeight);
    renderTarget.depthTexture.type = THREE.UnsignedShortType;

    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Much darker atmospheric fog density so unlit corridors plunge into darkness
    const baseFogDensity = isVoidFloor ? 0.115 : 0.082;
    const postMaterial = createScreenSpacePathTracingMaterial(
      renderTarget.texture,
      renderTarget.depthTexture,
      camera.near,
      camera.far,
      darkBgColor,
      baseFogDensity,
      gfx.screenSpacePathTracing,
      presetCfg.ptSamples,
      gfx.bloomIntensity * presetCfg.bloomStrength,
      gfx.shaderMode
    );
    postMaterial.uniforms.uResolution.value.set(rtWidth, rtHeight);
    const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
    postScene.add(postQuad);

    // =============================================================
    // Lighting Rules:
    // - Low ambient light so corridors away from torches stay dark & atmospheric
    // - Non-Void Floors: NO player light! Illumination comes ONLY from Wall Torches!
    // - Void Floors (21-30F): NO Wall Torches! Player holds a Handheld Torch in left hand!
    // =============================================================
    const ambientLight = new THREE.AmbientLight(0x94a3b8, isVoidFloor ? 0.05 : 0.12);
    scene.add(ambientLight);
    scene.add(camera);

    let voidHandheldTorchLight: THREE.PointLight | null = null;
    let voidHandheldTorchGroup: THREE.Group | null = null;
    let voidHandheldFlameMat: THREE.ShaderMaterial | null = null;

    if (isVoidFloor) {
      // Player holds a 3D Torch in their left hand on Void floors!
      const lightMult = isCustom ? customCfg.torchLightMultiplier : 1.0;
      const heldInstance = buildWallTorchSconce(false, 0xa855f7, lightMult);
      voidHandheldTorchGroup = heldInstance.group;
      voidHandheldFlameMat = heldInstance.flameMat;
      voidHandheldTorchGroup.position.set(-0.42, -0.36, -0.62);
      voidHandheldTorchGroup.rotation.set(0.18, 0.25, -0.12);
      camera.add(voidHandheldTorchGroup);

      voidHandheldTorchLight = new THREE.PointLight(0xd8b4fe, 2.8 * lightMult, 16 * lightMult, 1.45);
      voidHandheldTorchLight.position.set(-0.35, -0.1, -0.55);
      camera.add(voidHandheldTorchLight);
    }

    // =============================================================
    // Wide Single-Floor Procedural Maze Generation (Default 24x24, Custom up to 32x32)
    // =============================================================
    const rawGridSize = isCustom ? customCfg.gridSize : 24;
    const gridSize = rawGridSize % 2 === 0 ? rawGridSize : rawGridSize + 1;
    const cellSize = 3.2;
    const halfGrid = (gridSize * cellSize) / 2;

    // 64x64 Procedural Pixel-PBR Textures (Albedo + Bump)
    const { map: wallTex, bumpMap: wallBump } = createProcedural64x64Textures(areaTheme.id, 'wall');
    const { map: floorTex, bumpMap: floorBump } = createProcedural64x64Textures(areaTheme.id, 'floor');
    const { map: ceilTex, bumpMap: ceilBump } = createProcedural64x64Textures(areaTheme.id, 'ceiling');

    floorTex.repeat.set(gridSize, gridSize);
    floorBump.repeat.set(gridSize, gridSize);
    ceilTex.repeat.set(gridSize, gridSize);
    ceilBump.repeat.set(gridSize, gridSize);

    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(gridSize * cellSize, gridSize * cellSize),
      new THREE.MeshStandardMaterial({
        map: floorTex,
        bumpMap: floorBump,
        bumpScale: 0.06,
        roughness: 0.58,
        metalness: 0.25,
      })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    scene.add(floorMesh);

    const ceilingMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(gridSize * cellSize, gridSize * cellSize),
      new THREE.MeshStandardMaterial({
        map: ceilTex,
        bumpMap: ceilBump,
        bumpScale: 0.07,
        roughness: 0.85,
        metalness: 0.15,
      })
    );
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = 3.2;
    scene.add(ceilingMesh);

    const grid: number[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(1));
    const wallBoxes: THREE.Box3[] = [];
    const wallGeo = new THREE.BoxGeometry(cellSize, 3.2, cellSize);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      bumpMap: wallBump,
      bumpScale: 0.085,
      roughness: 0.48,
      metalness: 0.32,
    });

    const gridToWorld = (r: number, c: number) => ({
      x: c * cellSize - halfGrid + cellSize / 2,
      z: r * cellSize - halfGrid + cellSize / 2,
    });

    // Carve wide maze passages using Randomized DFS + Multi-Chamber Rooms
    const visited = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
    const stack: [number, number][] = [[1, 1]];
    visited[1][1] = true;
    grid[1][1] = 0;

    while (stack.length > 0) {
      const [cr, cc] = stack[stack.length - 1];
      const dirs: [number, number][] = [
        [-2, 0],
        [2, 0],
        [0, -2],
        [0, 2],
      ].sort(() => Math.random() - 0.5) as [number, number][];

      let carved = false;
      for (const [dr, dc] of dirs) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr >= 1 && nr <= gridSize - 2 && nc >= 1 && nc <= gridSize - 2 && !visited[nr][nc]) {
          visited[nr][nc] = true;
          grid[cr + dr / 2][cc + dc / 2] = 0;
          grid[nr][nc] = 0;
          stack.push([nr, nc]);
          carved = true;
          break;
        }
      }
      if (!carved) stack.pop();
    }

    // Carve 3 random subterranean chambers (3x3 rooms) & braid corridors for wide exploration
    for (let roomIdx = 0; roomIdx < 3; roomIdx++) {
      const rr = Math.floor(Math.random() * (gridSize - 7)) + 3;
      const rc = Math.floor(Math.random() * (gridSize - 7)) + 3;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          grid[rr + dr][rc + dc] = 0;
        }
      }
    }

    for (let r = 1; r < gridSize - 1; r++) {
      for (let c = 1; c < gridSize - 1; c++) {
        if (r <= 2 && c <= 2) {
          grid[r][c] = 0; // Safe player start area
        } else if (grid[r][c] === 1 && Math.random() < 0.28) {
          grid[r][c] = 0;
        }
      }
    }

    // Ensure outer perimeter is solid wall
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (r === 0 || r === gridSize - 1 || c === 0 || c === gridSize - 1) {
          grid[r][c] = 1;
        }
      }
    }

    // =============================================================
    // Random Goal (Exit Stairs) Placement Every Time (Verified Distant Free Cell)
    // =============================================================
    const distantFreeCells: [number, number][] = [];
    const minGoalDist = Math.floor(gridSize * 0.72);
    for (let r = 2; r < gridSize - 2; r++) {
      for (let c = 2; c < gridSize - 2; c++) {
        if (grid[r][c] === 0 && r + c >= minGoalDist) {
          distantFreeCells.push([r, c]);
        }
      }
    }
    const chosenGoal: [number, number] =
      distantFreeCells.length > 0
        ? distantFreeCells[Math.floor(Math.random() * distantFreeCells.length)]
        : [gridSize - 2, gridSize - 2];

    const stairsR = chosenGoal[0];
    const stairsC = chosenGoal[1];
    // Open a 2x2 plaza around the randomly placed exit stairs so bosses and portals have breathing room
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = stairsR + dr;
        const nc = stairsC + dc;
        if (nr >= 1 && nr < gridSize - 1 && nc >= 1 && nc < gridSize - 1) {
          grid[nr][nc] = 0;
        }
      }
    }
    grid[stairsR][stairsC] = 2;
    setStairsGridPos({ r: stairsR, c: stairsC });

    // Instantiate Wall Meshes
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] === 1) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          const { x, z } = gridToWorld(r, c);
          wall.position.set(x, 1.6, z);
          scene.add(wall);
          wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }
      }
    }

    // =============================================================
    // Spawn Wall Torches Along Corridors (ONLY on Non-Void Floors!)
    // Uses a dynamic pool of PointLights attached to the nearest wall sconces
    // so every wall torch casts real 3D light without exceeding WebGL uniform limits.
    // =============================================================
    const wallTorches: WallTorchInstance[] = [];
    const torchLightPool: THREE.PointLight[] = [];
    if (!isVoidFloor) {
      const torchFlameHex =
        areaTheme.id === 'gracia'
          ? 0x38bdf8
          : areaTheme.id === 'cyber'
          ? 0xf472b6
          : areaTheme.id === 'core'
          ? 0xff4500
          : 0xff8c00;
      const lightMult = isCustom ? customCfg.torchLightMultiplier : 1.0;

      // Candidate corridor cells adjacent to a wall
      const torchCandidates: { r: number; c: number; dirR: number; dirC: number; rotY: number }[] = [];
      for (let r = 1; r < gridSize - 1; r++) {
        for (let c = 1; c < gridSize - 1; c++) {
          if (grid[r][c] === 0 && (r + c) % 2 === 0) {
            if (grid[r - 1][c] === 1) torchCandidates.push({ r, c, dirR: -1, dirC: 0, rotY: 0 });
            else if (grid[r + 1][c] === 1) torchCandidates.push({ r, c, dirR: 1, dirC: 0, rotY: Math.PI });
            else if (grid[r][c - 1] === 1) torchCandidates.push({ r, c, dirR: 0, dirC: -1, rotY: Math.PI / 2 });
            else if (grid[r][c + 1] === 1) torchCandidates.push({ r, c, dirR: 0, dirC: 1, rotY: -Math.PI / 2 });
          }
        }
      }

      torchCandidates.sort(() => Math.random() - 0.5);
      const maxSconces = Math.min(torchCandidates.length, 38);

      // Guarantee wall sconces near the starting chamber (1,1) & (2,1) so the opening corridor is lit by wall torches
      const startPos1 = gridToWorld(1, 1);
      const startTorch1 = buildWallTorchSconce(false, torchFlameHex, lightMult * 1.2);
      startTorch1.group.position.set(startPos1.x - cellSize * 0.42, 1.75, startPos1.z);
      startTorch1.group.rotation.y = Math.PI / 2;
      scene.add(startTorch1.group);
      wallTorches.push(startTorch1);

      const startPos2 = gridToWorld(2, 1);
      const startTorch2 = buildWallTorchSconce(false, torchFlameHex, lightMult * 1.2);
      startTorch2.group.position.set(startPos2.x - cellSize * 0.42, 1.75, startPos2.z);
      startTorch2.group.rotation.y = Math.PI / 2;
      scene.add(startTorch2.group);
      wallTorches.push(startTorch2);

      for (let i = 0; i < maxSconces; i++) {
        const cand = torchCandidates[i];
        const sconce = buildWallTorchSconce(false, torchFlameHex, lightMult);
        const pos = gridToWorld(cand.r, cand.c);
        sconce.group.position.set(
          pos.x + cand.dirC * (cellSize * 0.42),
          1.75,
          pos.z + cand.dirR * (cellSize * 0.42)
        );
        sconce.group.rotation.y = cand.rotY;
        scene.add(sconce.group);
        wallTorches.push(sconce);
      }

      // Create dynamic pool of PointLights that attach to the closest Wall Torches
      const poolSize = Math.min(presetCfg.maxActiveTorchLights, wallTorches.length);
      for (let i = 0; i < poolSize; i++) {
        const pLight = new THREE.PointLight(torchFlameHex, 2.55 * lightMult, 14.5 * lightMult, 1.45);
        scene.add(pLight);
        torchLightPool.push(pLight);
      }
    }

    // =============================================================
    // Place Exit Stairs Portal with GLSL Dimensional Vortex Shader
    // =============================================================
    const stairsPos = gridToWorld(stairsR, stairsC);
    const stairsPortal = new THREE.Group();
    const portalVortexMat = createGlslPortalVortexMaterial();
    const portalOuterCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.05, 2.8, 24, 1, true),
      portalVortexMat
    );
    const portalInnerCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.58, 2.7, 18, 1, true),
      portalVortexMat
    );
    const portalBaseRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.09, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0x00f2ff, emissive: 0x00f2ff, emissiveIntensity: 1.5 })
    );
    portalBaseRing.rotation.x = Math.PI / 2;
    portalBaseRing.position.y = -1.3;
    const portalTopRing = portalBaseRing.clone();
    portalTopRing.position.y = 1.3;
    const portalLight = new THREE.PointLight(0x00f2ff, 1.8, 9.0);
    stairsPortal.add(portalOuterCylinder, portalInnerCore, portalBaseRing, portalTopRing, portalLight);
    stairsPortal.position.set(stairsPos.x, 1.4, stairsPos.z);
    scene.add(stairsPortal);

    // Ambient Floating Dungeon Mana Motes
    const moteCount = Math.round(120 * presetCfg.particleMult);
    const motePositions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePositions[i * 3] = (Math.random() - 0.5) * gridSize * cellSize;
      motePositions[i * 3 + 1] = 0.2 + Math.random() * 2.8;
      motePositions[i * 3 + 2] = (Math.random() - 0.5) * gridSize * cellSize;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    const moteMat = new THREE.PointsMaterial({
      color: activeFloor >= 41 ? 0xff6b00 : activeFloor >= 31 ? 0xf472b6 : activeFloor >= 21 ? 0xc084fc : 0x38bdf8,
      size: 0.13,
      transparent: true,
      opacity: 0.7,
    });
    const ambientMotes = new THREE.Points(moteGeo, moteMat);
    scene.add(ambientMotes);

    // =============================================================
    // GLSL Shader VFX System (Volumetric Plasma Slash Waves, Runic Shockwaves & Particles)
    // =============================================================
    interface VfxParticle {
      mesh: THREE.Mesh;
      vx: number;
      vy: number;
      vz: number;
      gravity: number;
      life: number;
      maxLife: number;
      spinX: number;
      spinY: number;
      scaleDecay: boolean;
    }
    interface VfxGlslEffect {
      mesh: THREE.Mesh;
      mat: THREE.ShaderMaterial;
      life: number;
      maxLife: number;
      startScale: number;
      endScale: number;
      riseY: number;
      forwardVel?: THREE.Vector3;
    }
    const vfxParticles: VfxParticle[] = [];
    const vfxShockwaves: VfxGlslEffect[] = [];
    const sharedSparkGeo = new THREE.OctahedronGeometry(0.11, 0);
    const sharedCubeSparkGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);

    const spawnParticleBurst = (
      origin: THREE.Vector3,
      colorHex: number,
      count: number,
      speed = 0.15,
      upwardBias = 0.08,
      lifeFrames = 26,
      useCubes = false
    ) => {
      const actualCount = Math.max(4, Math.round(count * presetCfg.particleMult));
      for (let i = 0; i < actualCount; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: i % 3 === 0 ? 0xffffff : colorHex,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const pMesh = new THREE.Mesh(useCubes ? sharedCubeSparkGeo : sharedSparkGeo, mat);
        pMesh.position.copy(origin);
        pMesh.position.x += (Math.random() - 0.5) * 0.4;
        pMesh.position.y += (Math.random() - 0.5) * 0.4;
        pMesh.position.z += (Math.random() - 0.5) * 0.4;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.3) * Math.PI;
        const spd = speed * (0.45 + Math.random() * 0.85);
        scene.add(pMesh);
        vfxParticles.push({
          mesh: pMesh,
          vx: Math.cos(theta) * Math.cos(phi) * spd,
          vy: Math.sin(phi) * spd + upwardBias,
          vz: Math.sin(theta) * Math.cos(phi) * spd,
          gravity: 0.0045,
          life: lifeFrames + Math.floor(Math.random() * 10),
          maxLife: lifeFrames + 10,
          spinX: (Math.random() - 0.5) * 0.35,
          spinY: (Math.random() - 0.5) * 0.35,
          scaleDecay: true,
        });
      }
    };

    // Spawns a genuine GLSL Runic Magic Circle / Shockwave Disc
    const spawnShockwaveRing = (
      origin: THREE.Vector3,
      colorHex: number,
      startScale = 0.5,
      endScale = 3.8,
      lifeFrames = 22,
      tiltFlat = true,
      riseY = 0.015
    ) => {
      const planeGeo = new THREE.PlaneGeometry(2.2, 2.2);
      const glslMat = createGlslRunicShockwaveMaterial(colorHex);
      const ringMesh = new THREE.Mesh(planeGeo, glslMat);
      ringMesh.position.copy(origin);
      if (tiltFlat) {
        ringMesh.rotation.x = -Math.PI / 2;
      } else {
        ringMesh.lookAt(camera.position);
      }
      ringMesh.scale.setScalar(startScale);
      scene.add(ringMesh);
      vfxShockwaves.push({
        mesh: ringMesh,
        mat: glslMat,
        life: lifeFrames,
        maxLife: lifeFrames,
        startScale,
        endScale,
        riseY,
      });
    };

    // Spawns a genuine GLSL Volumetric Plasma Slash Arc / Energy Wave
    const spawnGlslSlashWave = (
      origin: THREE.Vector3,
      yawAngle: number,
      tiltZ: number,
      colorHex: number,
      startScale = 0.8,
      endScale = 2.6,
      lifeFrames = 16,
      forwardSpeed = 0.16
    ) => {
      const waveGeo = new THREE.PlaneGeometry(2.4, 2.4, 8, 8);
      const waveMat = createGlslSlashArcMaterial(colorHex);
      const waveMesh = new THREE.Mesh(waveGeo, waveMat);
      waveMesh.position.copy(origin);
      waveMesh.rotation.order = 'YXZ';
      waveMesh.rotation.y = yawAngle;
      waveMesh.rotation.x = -Math.PI / 2 + 0.25;
      waveMesh.rotation.z = tiltZ;
      waveMesh.scale.setScalar(startScale);
      scene.add(waveMesh);
      vfxShockwaves.push({
        mesh: waveMesh,
        mat: waveMat,
        life: lifeFrames,
        maxLife: lifeFrames,
        startScale,
        endScale,
        riseY: 0,
        forwardVel: new THREE.Vector3(-Math.sin(yawAngle) * forwardSpeed, 0, -Math.cos(yawAngle) * forwardSpeed),
      });
    };

    // First-Person 3D Dynamic Weapon Viewmodel (Sword / Gun / Spear / Axe + Elemental Appearance)
    const weaponViewGroup = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x00f2ff,
      emissiveIntensity: 0.9,
      metalness: 0.85,
      roughness: 0.15,
    });
    const guardMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.55,
      metalness: 0.9,
      roughness: 0.2,
    });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.5 });

    // 1. Sword Mesh Group
    const swordMeshGroup = new THREE.Group();
    const bladeCoreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.78, 0.09), bladeMat);
    bladeCoreMesh.position.y = 0.42;
    const bladeTipMesh = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 4), bladeMat);
    bladeTipMesh.position.y = 0.91;
    bladeTipMesh.rotation.y = Math.PI / 4;
    const crossGuardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.14), guardMat);
    crossGuardMesh.position.y = 0.02;
    const gripMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.24, 8), gripMat);
    gripMesh.position.y = -0.12;
    const pommelMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), guardMat);
    pommelMesh.position.y = -0.26;
    swordMeshGroup.add(bladeCoreMesh, bladeTipMesh, crossGuardMesh, gripMesh, pommelMesh);

    // 2. Gun (Blaster Rifle) Mesh Group
    const gunMeshGroup = new THREE.Group();
    const gunBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.68), gripMat);
    gunBarrel.position.set(0, 0.12, -0.22);
    const gunEnergyRail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.62), bladeMat);
    gunEnergyRail.position.set(0, 0.16, -0.22);
    const gunMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.14, 12), guardMat);
    gunMuzzle.rotation.x = Math.PI / 2;
    gunMuzzle.position.set(0, 0.13, -0.6);
    const gunCoreOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), guardMat);
    gunCoreOrb.position.set(0, 0.22, -0.08);
    const gunGrip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.1), gripMat);
    gunGrip.position.set(0, -0.04, 0.04);
    gunGrip.rotation.x = 0.3;
    gunMeshGroup.add(gunBarrel, gunEnergyRail, gunMuzzle, gunCoreOrb, gunGrip);

    // 3. Spear (Elemental Halberd / Lance) Mesh Group
    const spearMeshGroup = new THREE.Group();
    const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 1.25, 10), gripMat);
    spearShaft.position.y = 0.32;
    const spearCollar = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 8, 16), guardMat);
    spearCollar.rotation.x = Math.PI / 2;
    spearCollar.position.y = 0.78;
    const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.44, 4), bladeMat);
    spearHead.position.y = 1.04;
    spearHead.rotation.y = Math.PI / 4;
    const spearSideWingL = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 4), guardMat);
    spearSideWingL.position.set(-0.08, 0.85, 0);
    spearSideWingL.rotation.z = 0.65;
    const spearSideWingR = spearSideWingL.clone();
    spearSideWingR.position.x = 0.08;
    spearSideWingR.rotation.z = -0.65;
    spearMeshGroup.add(spearShaft, spearCollar, spearHead, spearSideWingL, spearSideWingR);

    // 4. Axe (Twin-Bladed Elemental Battleaxe) Mesh Group
    const axeMeshGroup = new THREE.Group();
    const axeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.92, 10), gripMat);
    axeHandle.position.y = 0.24;
    const axeHub = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), guardMat);
    axeHub.position.y = 0.56;
    const axeBladeL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.045), bladeMat);
    axeBladeL.position.set(-0.16, 0.56, 0);
    axeBladeL.rotation.z = 0.15;
    const axeBladeR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.045), bladeMat);
    axeBladeR.position.set(0.16, 0.56, 0);
    axeBladeR.rotation.z = -0.15;
    const axeSpikeTop = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 4), guardMat);
    axeSpikeTop.position.y = 0.78;
    axeMeshGroup.add(axeHandle, axeHub, axeBladeL, axeBladeR, axeSpikeTop);

    weaponViewGroup.add(swordMeshGroup, gunMeshGroup, spearMeshGroup, axeMeshGroup);
    weaponViewGroup.position.set(0.42, -0.34, -0.68);
    weaponViewGroup.rotation.set(0.25, -0.35, 0.18);
    camera.add(weaponViewGroup);

    let weaponSwingTimer = 0;
    let cameraShakeTimer = 0;
    let cameraShakeIntensity = 0;

    // =============================================================
    // Interactive Floor Objects, Corridor Traps & Destructible Props
    // =============================================================
    interface FloorInteractable {
      id: string;
      r: number;
      c: number;
      mesh: THREE.Object3D;
      kind:
        | 'wood_chest'
        | 'silver_chest'
        | 'gold_chest'
        | 'xp_chest'
        | 'item_chest'
        | 'pitfall'
        | 'warp'
        | 'glitch_pit'
        | 'magma'
        | 'fuel_crystal'
        | 'spike_trap'
        | 'pendulum_trap'
        | 'destructible_prop';
      used: boolean;
      subGroup?: THREE.Group;
      phase?: number;
    }
    const interactables: FloorInteractable[] = [];

    const pickFreeCell = (): [number, number] => {
      for (let tries = 0; tries < 80; tries++) {
        const r = Math.floor(Math.random() * (gridSize - 2)) + 1;
        const c = Math.floor(Math.random() * (gridSize - 2)) + 1;
        if (grid[r][c] === 0 && !(r <= 2 && c <= 2) && !(Math.abs(r - stairsR) <= 1 && Math.abs(c - stairsC) <= 1)) {
          return [r, c];
        }
      }
      return [3, 3];
    };

    const buildChestModel = (colorHex: number): THREE.Group => {
      const chestGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.4,
        roughness: 0.35,
        metalness: 0.6,
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfacc15,
        emissiveIntensity: 0.65,
        metalness: 0.9,
        roughness: 0.2,
      });
      const baseBox = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.46, 0.66), bodyMat);
      baseBox.position.y = 0.23;
      const lidCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.88, 12), bodyMat);
      lidCylinder.rotation.z = Math.PI / 2;
      lidCylinder.position.y = 0.46;
      const strapLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.52, 0.7), trimMat);
      strapLeft.position.set(-0.28, 0.38, 0);
      const strapRight = strapLeft.clone();
      strapRight.position.x = 0.28;
      const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.72), trimMat);
      lockPlate.position.set(0, 0.42, 0);
      const auraRing = new THREE.Mesh(
        new THREE.RingGeometry(0.52, 0.66, 20),
        new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
      );
      auraRing.rotation.x = -Math.PI / 2;
      auraRing.position.y = 0.03;
      chestGroup.add(baseBox, lidCylinder, strapLeft, strapRight, lockPlate, auraRing);
      return chestGroup;
    };

    // Spawn 5 Chests per wide floor (2 Weapon Chests, 1 Item Chest, 2 XP Chests)
    const chestTypes: FloorInteractable['kind'][] = [
      Math.random() < 0.28 ? 'gold_chest' : Math.random() < 0.58 ? 'silver_chest' : 'wood_chest',
      Math.random() < 0.45 ? 'silver_chest' : 'wood_chest',
      'item_chest',
      'xp_chest',
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
      const chestGroup = buildChestModel(color);
      chestGroup.position.set(pos.x, 0.05, pos.z);
      scene.add(chestGroup);
      interactables.push({ id: `chest-${idx}`, r, c, mesh: chestGroup, kind: ckind, used: false });
    });

    const trapMult = isCustom ? customCfg.trapMultiplier : 1.0;
    const areaAccentColor = ELEMENT_PREFIX_META[areaTheme.id].colorHex;

    // Spawn Corridor Floor Spike Traps (thrust upward rhythmically)
    const spikeTrapCount = Math.max(2, Math.round(5 * trapMult));
    for (let i = 0; i < spikeTrapCount; i++) {
      const [r, c] = pickFreeCell();
      grid[r][c] = 7;
      const pos = gridToWorld(r, c);
      const { group, spikesGroup } = buildCorridorSpikeTrap();
      group.position.set(pos.x, 0, pos.z);
      scene.add(group);
      interactables.push({
        id: `spike-${i}`,
        r,
        c,
        mesh: group,
        subGroup: spikesGroup,
        kind: 'spike_trap',
        used: false,
        phase: i * 1.1,
      });
    }

    // Spawn Ceiling Swinging Pendulum Guillotine Blades in Corridors
    const pendulumCount = Math.max(2, Math.round(4 * trapMult));
    for (let i = 0; i < pendulumCount; i++) {
      const [r, c] = pickFreeCell();
      grid[r][c] = 7;
      const pos = gridToWorld(r, c);
      const { group, pivotGroup } = buildSwingingPendulumTrap();
      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = (i % 2) * (Math.PI / 2);
      scene.add(group);
      interactables.push({
        id: `pendulum-${i}`,
        r,
        c,
        mesh: group,
        subGroup: pivotGroup,
        kind: 'pendulum_trap',
        used: false,
        phase: i * 1.4,
      });
    }

    // Spawn Destructible Corridor Barrels & Ancient Urns (can be smashed with weapon attacks!)
    for (let i = 0; i < 8; i++) {
      const [r, c] = pickFreeCell();
      const pos = gridToWorld(r, c);
      const propGroup = buildDestructibleBarrelOrUrn(i % 2 === 0, areaAccentColor);
      propGroup.position.set(pos.x + (Math.random() - 0.5) * 0.6, 0, pos.z + (Math.random() - 0.5) * 0.6);
      scene.add(propGroup);
      interactables.push({
        id: `prop-${i}`,
        r,
        c,
        mesh: propGroup,
        kind: 'destructible_prop',
        used: false,
      });
    }

    // Spawn Ancient Corridor Pillars along intersections
    for (let i = 0; i < 6; i++) {
      const [r, c] = pickFreeCell();
      const pos = gridToWorld(r, c);
      const pillar = buildAncientCorridorPillar(areaAccentColor);
      pillar.position.set(pos.x + cellSize * 0.34, 0, pos.z + cellSize * 0.34);
      scene.add(pillar);
    }

    // Spawn Pitfalls (from 4F+) & Warp Tiles
    if (activeFloor >= 4) {
      const pitCount = Math.max(2, Math.round(3 * trapMult));
      for (let i = 0; i < pitCount; i++) {
        const [r, c] = pickFreeCell();
        grid[r][c] = 4;
        const pos = gridToWorld(r, c);
        const mesh = new THREE.Mesh(
          new THREE.RingGeometry(0.35, 0.92, 20),
          new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(pos.x, 0.05, pos.z);
        scene.add(mesh);
        interactables.push({ id: `pit-${i}`, r, c, mesh, kind: 'pitfall', used: false });
      }
    }

    for (let i = 0; i < 2; i++) {
      const [r, c] = pickFreeCell();
      grid[r][c] = 5;
      const pos = gridToWorld(r, c);
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.92, 24),
        new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(pos.x, 0.06, pos.z);
      scene.add(mesh);
      interactables.push({ id: `warp-${i}`, r, c, mesh, kind: 'warp', used: false });
    }

    // 21-30F Void: Fuel Crystals for the Handheld Torch
    if (isVoidFloor) {
      for (let i = 0; i < 5; i++) {
        const [r, c] = pickFreeCell();
        const pos = gridToWorld(r, c);
        const crystalGroup = new THREE.Group();
        const coreCrystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.48, 0),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.1 })
        );
        const crystalRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.62, 0.04, 8, 20),
          new THREE.MeshBasicMaterial({ color: 0xfde047 })
        );
        crystalRing.rotation.x = Math.PI / 3;
        crystalGroup.add(coreCrystal, crystalRing);
        crystalGroup.position.set(pos.x, 0.85, pos.z);
        scene.add(crystalGroup);
        interactables.push({ id: `fuel-${i}`, r, c, mesh: crystalGroup, kind: 'fuel_crystal', used: false });
      }
    }

    // 31-40F Cyber: Glitch Pits
    if (cycleFloor >= 31 && cycleFloor <= 40) {
      for (let i = 0; i < 3; i++) {
        const [r, c] = pickFreeCell();
        grid[r][c] = 6;
        const pos = gridToWorld(r, c);
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1.7, 1.7),
          new THREE.MeshBasicMaterial({ color: 0xec4899, wireframe: true })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(pos.x, 0.06, pos.z);
        scene.add(mesh);
        interactables.push({ id: `glitch-${i}`, r, c, mesh, kind: 'glitch_pit', used: false });
      }
    }

    // 41-50F Core: Magma Pools
    if (cycleFloor >= 41) {
      for (let i = 0; i < 4; i++) {
        const [r, c] = pickFreeCell();
        grid[r][c] = 6;
        const pos = gridToWorld(r, c);
        const mesh = new THREE.Mesh(
          new THREE.CircleGeometry(1.15, 18),
          new THREE.MeshBasicMaterial({ color: 0xff4500 })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(pos.x, 0.04, pos.z);
        scene.add(mesh);
        interactables.push({ id: `magma-${i}`, r, c, mesh, kind: 'magma', used: false });
      }
    }

    setMinimapGrid(grid.map((row) => [...row]));

    // =============================================================
    // Procedural Multi-Part 3D Character Builder for Enemies & Bosses
    // =============================================================
    type EnemyArchetype =
      | 'golem'
      | 'wisp'
      | 'stalker'
      | 'phantom'
      | 'shield_ifrit'
      | 'burning_soul'
      | 'boss';

    interface EnemyModelParts {
      root: THREE.Group;
      bodyGroup: THREE.Group;
      headGroup: THREE.Group;
      leftArm: THREE.Group;
      rightArm: THREE.Group;
      leftLeg: THREE.Group;
      rightLeg: THREE.Group;
      coreMesh: THREE.Mesh;
      orbitRing1?: THREE.Object3D;
      orbitRing2?: THREE.Object3D;
      shieldLeft?: THREE.Group;
      shieldRight?: THREE.Group;
      hpBarGroup: THREE.Group;
      hpBarFill: THREE.Mesh;
      hitMaterials: THREE.MeshStandardMaterial[];
      baseEmissiveColors: number[];
    }

    const buildEnemyCharacterModel = (
      archetype: EnemyArchetype,
      primaryColor: number,
      isFinalBossFlag = false,
      isMajorBossFlag = false
    ): EnemyModelParts => {
      const root = new THREE.Group();
      const bodyGroup = new THREE.Group();
      const headGroup = new THREE.Group();
      const leftArm = new THREE.Group();
      const rightArm = new THREE.Group();
      const leftLeg = new THREE.Group();
      const rightLeg = new THREE.Group();
      const hitMaterials: THREE.MeshStandardMaterial[] = [];
      const baseEmissiveColors: number[] = [];

      const registerMat = (mat: THREE.MeshStandardMaterial, emissiveHex: number) => {
        hitMaterials.push(mat);
        baseEmissiveColors.push(emissiveHex);
        return mat;
      };

      const armorMat = registerMat(
        new THREE.MeshStandardMaterial({
          color: primaryColor,
          emissive: primaryColor,
          emissiveIntensity: 0.32,
          roughness: 0.35,
          metalness: 0.65,
        }),
        primaryColor
      );

      const darkMetalMat = registerMat(
        new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          emissive: primaryColor,
          emissiveIntensity: 0.15,
          roughness: 0.45,
          metalness: 0.8,
        }),
        primaryColor
      );

      const coreGlowColor = isFinalBossFlag ? 0xfef08a : 0xffffff;
      const coreMat = registerMat(
        new THREE.MeshStandardMaterial({
          color: coreGlowColor,
          emissive: primaryColor,
          emissiveIntensity: 1.15,
          roughness: 0.1,
          metalness: 0.2,
        }),
        primaryColor
      );

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      let coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), coreMat);
      let orbitRing1: THREE.Object3D | undefined;
      let orbitRing2: THREE.Object3D | undefined;
      let shieldLeft: THREE.Group | undefined;
      let shieldRight: THREE.Group | undefined;

      if (archetype === 'golem') {
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.86, 0.62), darkMetalMat);
        torso.position.y = 1.05;
        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.56, 0.68), armorMat);
        chestPlate.position.y = 1.12;
        coreMesh.position.set(0, 1.12, 0.36);

        headGroup.position.set(0, 1.66, 0);
        const helm = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.44, 0.5), armorMat);
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.53), eyeMat);
        visor.position.y = 0.04;
        const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 5), darkMetalMat);
        hornL.position.set(-0.28, 0.24, 0);
        hornL.rotation.z = 0.35;
        const hornR = hornL.clone();
        hornR.position.x = 0.28;
        hornR.rotation.z = -0.35;
        headGroup.add(helm, visor, hornL, hornR);

        leftArm.position.set(-0.68, 1.35, 0);
        const pauldronL = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), armorMat);
        const forearmL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.75, 0.34), darkMetalMat);
        forearmL.position.set(0, -0.42, 0.08);
        const fistL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.42), coreMat);
        fistL.position.set(0, -0.82, 0.14);
        leftArm.add(pauldronL, forearmL, fistL);

        rightArm.position.set(0.68, 1.35, 0);
        rightArm.add(pauldronL.clone(), forearmL.clone(), fistL.clone());

        leftLeg.position.set(-0.26, 0.6, 0);
        const legMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.6, 0.38), armorMat);
        legMeshL.position.y = -0.3;
        leftLeg.add(legMeshL);

        rightLeg.position.set(0.26, 0.6, 0);
        const legMeshR = legMeshL.clone();
        rightLeg.add(legMeshR);

        bodyGroup.add(torso, chestPlate, coreMesh, headGroup, leftArm, rightArm, leftLeg, rightLeg);
      } else if (archetype === 'wisp') {
        const prismBody = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), armorMat);
        prismBody.position.y = 1.25;
        prismBody.scale.set(0.9, 1.35, 0.9);
        coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 1), coreMat);
        coreMesh.position.set(0, 1.25, 0);

        headGroup.position.set(0, 1.92, 0);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.48, 6), coreMat);
        const eyeGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), eyeMat);
        eyeGem.position.set(0, -0.1, 0.22);
        headGroup.add(crown, eyeGem);

        leftArm.position.set(-0.58, 1.35, 0);
        const wingL1 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85, 4), coreMat);
        wingL1.rotation.z = 0.75;
        wingL1.position.set(-0.25, 0.1, 0);
        const wingL2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.65, 4), armorMat);
        wingL2.rotation.z = 1.15;
        wingL2.position.set(-0.32, -0.22, 0);
        leftArm.add(wingL1, wingL2);

        rightArm.position.set(0.58, 1.35, 0);
        const wingR1 = wingL1.clone();
        wingR1.rotation.z = -0.75;
        wingR1.position.x = 0.25;
        const wingR2 = wingL2.clone();
        wingR2.rotation.z = -1.15;
        wingR2.position.x = 0.32;
        rightArm.add(wingR1, wingR2);

        const ring1 = new THREE.Group();
        ring1.position.y = 1.25;
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2;
          const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), coreMat);
          shard.position.set(Math.cos(ang) * 0.82, 0, Math.sin(ang) * 0.82);
          ring1.add(shard);
        }
        orbitRing1 = ring1;

        const ring2 = new THREE.Mesh(
          new THREE.TorusGeometry(0.68, 0.03, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
        );
        ring2.position.y = 1.25;
        ring2.rotation.x = Math.PI / 3;
        orbitRing2 = ring2;

        bodyGroup.add(prismBody, coreMesh, headGroup, leftArm, rightArm, ring1, ring2);
      } else if (archetype === 'stalker') {
        const cloakTorso = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.35, 7), darkMetalMat);
        cloakTorso.position.y = 0.95;
        const ribArmor = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.24, 0.68, 6), armorMat);
        ribArmor.position.y = 1.22;
        coreMesh.position.set(0, 1.24, 0.32);

        headGroup.position.set(0, 1.76, 0.05);
        const hood = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), darkMetalMat);
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.06), eyeMat);
        eyeL.position.set(-0.1, 0.02, 0.27);
        eyeL.rotation.z = -0.2;
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.1;
        eyeR.rotation.z = 0.2;
        const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 5), coreMat);
        hornL.position.set(-0.22, 0.28, -0.05);
        hornL.rotation.set(-0.3, 0, 0.4);
        const hornR = hornL.clone();
        hornR.position.x = 0.22;
        hornR.rotation.z = -0.4;
        headGroup.add(hood, eyeL, eyeR, hornL, hornR);

        const buildScytheArm = (isLeft: boolean) => {
          const s = isLeft ? -1 : 1;
          const armGrp = new THREE.Group();
          armGrp.position.set(s * 0.52, 1.42, 0);
          const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 6), armorMat);
          upper.position.set(s * 0.12, -0.2, 0.15);
          upper.rotation.x = -0.5;
          const blade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.78, 4), coreMat);
          blade.position.set(s * 0.14, -0.38, 0.52);
          blade.rotation.x = Math.PI / 2 + 0.35;
          armGrp.add(upper, blade);
          return armGrp;
        };
        const scL = buildScytheArm(true);
        const scR = buildScytheArm(false);
        leftArm.copy(scL);
        scL.children.forEach((c) => leftArm.add(c.clone()));
        rightArm.copy(scR);
        scR.children.forEach((c) => rightArm.add(c.clone()));

        const voidHalo = new THREE.Mesh(
          new THREE.TorusGeometry(0.55, 0.035, 8, 20),
          new THREE.MeshBasicMaterial({ color: 0xd8b4fe, wireframe: true })
        );
        voidHalo.position.set(0, 1.45, -0.25);
        orbitRing1 = voidHalo;

        bodyGroup.add(cloakTorso, ribArmor, coreMesh, headGroup, leftArm, rightArm, voidHalo);
      } else if (archetype === 'phantom') {
        const chassis = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), darkMetalMat);
        chassis.position.y = 1.22;
        chassis.scale.set(0.95, 1.3, 0.7);
        const wireShell = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.62, 1),
          new THREE.MeshBasicMaterial({ color: 0xf472b6, wireframe: true })
        );
        wireShell.position.y = 1.22;
        orbitRing1 = wireShell;
        coreMesh.position.set(0, 1.22, 0.34);

        headGroup.position.set(0, 1.82, 0);
        const cyberHead = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), armorMat);
        const cyberVisor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.28), eyeMat);
        cyberVisor.position.set(0, 0.02, 0.12);
        const dataHalo = new THREE.Mesh(
          new THREE.RingGeometry(0.32, 0.42, 6),
          new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide })
        );
        dataHalo.rotation.x = Math.PI / 2;
        dataHalo.position.y = 0.26;
        headGroup.add(cyberHead, cyberVisor, dataHalo);

        const buildKatanaArm = (isLeft: boolean) => {
          const s = isLeft ? -1 : 1;
          const grp = new THREE.Group();
          grp.position.set(s * 0.56, 1.38, 0);
          const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), armorMat);
          const katana = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.88, 0.1), coreMat);
          katana.position.set(0, -0.25, 0.42);
          katana.rotation.x = Math.PI / 3;
          grp.add(shoulder, katana);
          return grp;
        };
        const kL = buildKatanaArm(true);
        const kR = buildKatanaArm(false);
        leftArm.position.copy(kL.position);
        kL.children.forEach((c) => leftArm.add(c.clone()));
        rightArm.position.copy(kR.position);
        kR.children.forEach((c) => rightArm.add(c.clone()));

        bodyGroup.add(chassis, wireShell, coreMesh, headGroup, leftArm, rightArm);
      } else if (archetype === 'shield_ifrit') {
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.36, 0.95, 8), darkMetalMat);
        torso.position.y = 1.08;
        const breastplate = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.55, 0.58), armorMat);
        breastplate.position.y = 1.18;
        coreMesh.position.set(0, 1.18, 0.34);

        headGroup.position.set(0, 1.74, 0);
        const skull = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.46), armorMat);
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.09, 0.49), eyeMat);
        visor.position.y = 0.03;
        const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.48, 6), coreMat);
        hornL.position.set(-0.28, 0.3, 0);
        hornL.rotation.z = 0.45;
        const hornR = hornL.clone();
        hornR.position.x = 0.28;
        hornR.rotation.z = -0.45;
        headGroup.add(skull, visor, hornL, hornR);

        leftArm.position.set(-0.62, 1.32, 0);
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.68, 0.28), armorMat);
        armL.position.y = -0.28;
        leftArm.add(armL);

        rightArm.position.set(0.62, 1.32, 0);
        rightArm.add(armL.clone());

        leftLeg.position.set(-0.24, 0.6, 0);
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.6, 0.32), darkMetalMat);
        legL.position.y = -0.3;
        leftLeg.add(legL);
        rightLeg.position.set(0.24, 0.6, 0);
        rightLeg.add(legL.clone());

        const shieldMat = registerMat(
          new THREE.MeshStandardMaterial({
            color: 0xf97316,
            emissive: 0xff4500,
            emissiveIntensity: 0.75,
            metalness: 0.85,
            roughness: 0.2,
          }),
          0xff4500
        );
        const shieldTrimMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, wireframe: true });

        shieldLeft = new THREE.Group();
        const panelL = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.35, 0.12), shieldMat);
        const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.15), shieldTrimMat);
        shieldLeft.add(panelL, frameL);
        shieldLeft.position.set(-0.3, 1.08, 0.62);

        shieldRight = new THREE.Group();
        shieldRight.add(panelL.clone(), frameL.clone());
        shieldRight.position.set(0.3, 1.08, 0.62);

        bodyGroup.add(torso, breastplate, coreMesh, headGroup, leftArm, rightArm, leftLeg, rightLeg, shieldLeft, shieldRight);
      } else if (archetype === 'burning_soul') {
        coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 1), coreMat);
        coreMesh.position.set(0, 1.22, 0);

        headGroup.position.set(0, 1.82, 0);
        const flameCrown = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 5), armorMat);
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
        eyeL.position.set(-0.11, -0.1, 0.24);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.11;
        headGroup.add(flameCrown, eyeL, eyeR);

        const cage1 = new THREE.Group();
        cage1.position.y = 1.22;
        const ringMesh1 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.055, 8, 20), darkMetalMat);
        cage1.add(ringMesh1);
        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * Math.PI * 2;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 4), armorMat);
          spike.position.set(Math.cos(ang) * 0.84, Math.sin(ang) * 0.84, 0);
          spike.rotation.z = ang - Math.PI / 2;
          cage1.add(spike);
        }
        orbitRing1 = cage1;

        const cage2 = new THREE.Mesh(
          new THREE.TorusGeometry(0.86, 0.04, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0xfef08a, wireframe: true })
        );
        cage2.position.y = 1.22;
        cage2.rotation.y = Math.PI / 2;
        orbitRing2 = cage2;

        bodyGroup.add(coreMesh, headGroup, cage1, cage2);
      } else {
        const bossScale = isFinalBossFlag ? 1.38 : isMajorBossFlag ? 1.22 : 1.08;
        bodyGroup.scale.setScalar(bossScale);

        const upperTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.46, 1.15, 8), darkMetalMat);
        upperTorso.position.y = 1.28;
        const chestArmor = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.72, 0.78), armorMat);
        chestArmor.position.y = 1.36;
        coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 1), coreMat);
        coreMesh.position.set(0, 1.35, 0.45);

        headGroup.position.set(0, 2.08, 0);
        const bossHelm = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), armorMat);
        const bossVisor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.46), eyeMat);
        bossVisor.position.set(0, 0.04, 0.18);
        const crownCenter = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 4), coreMat);
        crownCenter.position.set(0, 0.42, 0);
        const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.65, 6), coreMat);
        hornL.position.set(-0.38, 0.34, 0);
        hornL.rotation.z = 0.52;
        const hornR = hornL.clone();
        hornR.position.x = 0.38;
        hornR.rotation.z = -0.52;
        headGroup.add(bossHelm, bossVisor, crownCenter, hornL, hornR);

        const buildBossArmSide = (isLeft: boolean) => {
          const s = isLeft ? -1 : 1;
          const armGrp = new THREE.Group();
          armGrp.position.set(s * 0.85, 1.56, 0);
          const pauldron = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), armorMat);
          const upperBlade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.15, 4), coreMat);
          upperBlade.position.set(s * 0.18, -0.35, 0.52);
          upperBlade.rotation.x = Math.PI / 2 + 0.25;
          const lowerClaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 0.28), darkMetalMat);
          lowerClaw.position.set(s * 0.28, -0.55, 0.15);
          armGrp.add(pauldron, upperBlade, lowerClaw);
          return armGrp;
        };
        const bArmL = buildBossArmSide(true);
        const bArmR = buildBossArmSide(false);
        leftArm.position.copy(bArmL.position);
        bArmL.children.forEach((c) => leftArm.add(c.clone()));
        rightArm.position.copy(bArmR.position);
        bArmR.children.forEach((c) => rightArm.add(c.clone()));

        const reactorRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.055, 10, 28), coreMat);
        reactorRing1.position.y = 1.35;
        reactorRing1.rotation.x = Math.PI / 3;
        orbitRing1 = reactorRing1;

        const reactorRing2 = new THREE.Mesh(
          new THREE.TorusGeometry(1.35, 0.04, 8, 28),
          new THREE.MeshBasicMaterial({ color: 0xfef08a, wireframe: true })
        );
        reactorRing2.position.y = 1.35;
        reactorRing2.rotation.y = Math.PI / 3;
        orbitRing2 = reactorRing2;

        bodyGroup.add(upperTorso, chestArmor, coreMesh, headGroup, leftArm, rightArm, reactorRing1, reactorRing2);
      }

      const hpBarGroup = new THREE.Group();
      const barWidth = archetype === 'boss' ? 1.6 : 1.05;
      const hpBg = new THREE.Mesh(
        new THREE.PlaneGeometry(barWidth, 0.13),
        new THREE.MeshBasicMaterial({ color: 0x090d16, side: THREE.DoubleSide })
      );
      const hpBarFill = new THREE.Mesh(
        new THREE.PlaneGeometry(barWidth - 0.04, 0.09),
        new THREE.MeshBasicMaterial({
          color: archetype === 'boss' ? 0xf43f5e : 0x10b981,
          side: THREE.DoubleSide,
        })
      );
      hpBarFill.position.z = 0.01;
      hpBarGroup.add(hpBg, hpBarFill);
      hpBarGroup.position.y = archetype === 'boss' ? 3.15 : 2.38;

      root.add(bodyGroup, hpBarGroup);

      return {
        root,
        bodyGroup,
        headGroup,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        coreMesh,
        orbitRing1,
        orbitRing2,
        shieldLeft,
        shieldRight,
        hpBarGroup,
        hpBarFill,
        hitMaterials,
        baseEmissiveColors,
      };
    };

    // Spawn Enemies & Bosses (X5F Mid-Boss, X0F Major Boss, X50F Cycle Boss)
    interface MazeEnemy {
      id: string;
      name: string;
      archetype: EnemyArchetype;
      mesh: THREE.Group;
      parts: EnemyModelParts;
      colorHex: number;
      hp: number;
      maxHp: number;
      atk: number;
      xpValue: number;
      isBoss: boolean;
      specialType: 'normal' | 'shield_ifrit' | 'burning_soul';
      shieldActive: boolean;
      alive: boolean;
      walkPhase: number;
      hitFlashTimer: number;
      attackAnimTimer: number;
      freezeTimer: number;
    }
    const enemies: MazeEnemy[] = [];

    const diffMult =
      mazeStateRef.current.difficulty === 'EASY'
        ? 0.75
        : mazeStateRef.current.difficulty === 'NORMAL'
        ? 1.0
        : mazeStateRef.current.difficulty === 'HARD'
        ? 1.35
        : mazeStateRef.current.difficulty === 'CUSTOM'
        ? customCfg.enemyMultiplier
        : 1.75;

    const isBossFloor = activeFloor % 5 === 0;
    const isMajorBoss = activeFloor % 10 === 0;
    const isFinalBoss = cycleFloor === 50;
    const elMeta = ELEMENT_PREFIX_META[areaTheme.id];

    if (isBossFloor) {
      const bossName = isFinalBoss
        ? `【深淵覇王】${elMeta.prefix}暴走した熱源システム (F${activeFloor})`
        : isMajorBoss
        ? `【大ボス】${elMeta.prefix}${areaTheme.name}・オーバーロード (F${activeFloor})`
        : `【中ボス】${elMeta.prefix}${areaTheme.name}・ガーディアン (F${activeFloor})`;
      const bossHp = Math.round((220 + activeFloor * 55) * (isFinalBoss ? 2.2 : isMajorBoss ? 1.5 : 1.1) * diffMult);
      const bossColor = isFinalBoss ? 0xff2200 : elMeta.colorHex;
      const bossParts = buildEnemyCharacterModel('boss', bossColor, isFinalBoss, isMajorBoss);
      const bPos = gridToWorld(stairsR, stairsC);
      bossParts.root.position.set(bPos.x, 0, bPos.z);
      scene.add(bossParts.root);

      enemies.push({
        id: `boss-${activeFloor}`,
        name: bossName,
        archetype: 'boss',
        mesh: bossParts.root,
        parts: bossParts,
        colorHex: bossColor,
        hp: bossHp,
        maxHp: bossHp,
        atk: Math.round((16 + activeFloor * 2.2) * diffMult),
        xpValue: 180 + activeFloor * 25,
        isBoss: true,
        specialType: 'normal',
        shieldActive: false,
        alive: true,
        walkPhase: 0,
        hitFlashTimer: 0,
        attackAnimTimer: 0,
        freezeTimer: 0,
      });
      setCurrentFloorBossAlive(true);
      setCurrentFloorBossName(bossName);
      setCurrentFloorBossHpPct(100);
    } else {
      setCurrentFloorBossAlive(false);
      setCurrentFloorBossName(null);
    }

    // Regular Floor Enemies across the wide floor
    const enemyCount = Math.max(4, Math.round(7 * (isCustom ? Math.min(2.2, customCfg.enemyMultiplier) : 1.0)));
    for (let i = 0; i < enemyCount; i++) {
      const [er, ec] = pickFreeCell();
      const ePos = gridToWorld(er, ec);
      let specialType: MazeEnemy['specialType'] = 'normal';
      let archetype: EnemyArchetype = 'golem';
      let eName = `${areaTheme.name} Sentinel`;
      let eColor = 0x38bdf8;

      if (cycleFloor >= 41) {
        if (i % 2 === 0) {
          specialType = 'shield_ifrit';
          archetype = 'shield_ifrit';
          eName = 'シールド・イフリート';
          eColor = 0xf97316;
        } else {
          specialType = 'burning_soul';
          archetype = 'burning_soul';
          eName = 'バーニング・ソウル (自爆-60s)';
          eColor = 0xef4444;
        }
      } else if (cycleFloor >= 31) {
        archetype = 'phantom';
        eName = 'グリッチ・ファントム';
        eColor = 0xec4899;
      } else if (cycleFloor >= 21) {
        archetype = 'stalker';
        eName = 'ヴォイド・ストーカー';
        eColor = 0xa855f7;
      } else if (cycleFloor >= 11) {
        archetype = 'wisp';
        eName = 'クリスタル・ウィスプ';
        eColor = 0x06b6d4;
      } else {
        archetype = 'golem';
        eName = 'アース・ゴーレム';
        eColor = 0x10b981;
      }

      const parts = buildEnemyCharacterModel(archetype, eColor);
      parts.root.position.set(ePos.x, 0, ePos.z);
      scene.add(parts.root);

      const eHp = Math.round((50 + activeFloor * 18) * diffMult);
      enemies.push({
        id: `enemy-${i}`,
        name: eName,
        archetype,
        mesh: parts.root,
        parts,
        colorHex: eColor,
        hp: eHp,
        maxHp: eHp,
        atk: Math.round((9 + activeFloor * 1.6) * diffMult),
        xpValue: 45 + activeFloor * 14,
        isBoss: false,
        specialType,
        shieldActive: false,
        alive: true,
        walkPhase: Math.random() * Math.PI * 2,
        hitFlashTimer: 0,
        attackAnimTimer: 0,
        freezeTimer: 0,
      });
    }

    // Player Position & Fixed WASD / Arrow Movement with Wall Sliding
    const startWorld = gridToWorld(1, 1);
    let posX = startWorld.x;
    let posZ = startWorld.z;
    let yaw = Math.PI;
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
      const deathOrigin = en.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      spawnParticleBurst(deathOrigin, en.colorHex, en.isBoss ? 64 : 36, en.isBoss ? 0.24 : 0.18, 0.1, 34, true);
      spawnShockwaveRing(
        new THREE.Vector3(en.mesh.position.x, 0.14, en.mesh.position.z),
        en.colorHex,
        0.55,
        en.isBoss ? 5.6 : 3.2,
        26,
        true,
        0.02
      );
      spawnGlslSlashWave(deathOrigin, yaw, 0.35, en.colorHex, 0.9, en.isBoss ? 4.2 : 2.6, 20, 0.04);
      scene.remove(en.mesh);
      playSound('levelup');

      gainMazeXp(en.xpValue, en.name);

      if (en.isBoss) {
        setCurrentFloorBossAlive(false);
        setDefeatedBossFloors((prev) => (prev.includes(activeFloor) ? prev : [...prev, activeFloor]));
        setChestCounts((c) => ({ ...c, boss: c.boss + 1 }));

        if (activeFloor === 50 && isDailyChallenge) {
          recordDailyChallengeBest(50, totalRunSeconds);
        }

        const bossWpn = rollBossChestWeapon(activeFloor, isMajorBoss);
        const candidates: MazeWeapon[] = [
          rollBossChestWeapon(activeFloor, false),
          rollSwordChestWeapon('gold', activeFloor),
          rollBossChestWeapon(activeFloor, isMajorBoss),
          rollSwordChestWeapon('silver', activeFloor),
        ];
        triggerTopWeaponRoulette(
          activeFloor === 50
            ? `🏆 50F 深淵覇王撃破！ 階段から脱出で完全制覇！`
            : `👑 ボスチェスト (${en.name})`,
          bossWpn,
          candidates
        );
      } else {
        setCombatLog(`⚔️ ${en.name} を撃破！ (+${en.xpValue} XP)`);
      }
    };

    const getRarityColorHex = (rarity: WeaponRarity): number => {
      switch (rarity) {
        case 'OG':
          return 0xf43f5e;
        case 'ETERNAL':
          return 0x22d3ee;
        case 'SECRET':
          return 0xe879f9;
        case 'MYTHIC':
          return 0xfb7185;
        case 'Legendary':
          return 0xfacc15;
        case 'Exotic':
          return 0xfb923c;
        case 'Epic':
          return 0xa855f7;
        case 'Rare':
          return 0x38bdf8;
        case 'Uncommon':
          return 0x10b981;
        default:
          return 0xe2e8f0;
      }
    };

    // Register Attack (Sword / Gun / Spear / Axe with GLSL Shader Slash Waves & Prop Smashing)
    mazeActionsRef.current.attack = () => {
      playSound('attack');
      const st = mazeStateRef.current;
      const wpn = st.weapon;
      const wpnColor = ELEMENT_PREFIX_META[wpn.element]?.colorHex || getRarityColorHex(wpn.rarity);
      weaponSwingTimer = 14;

      const forwardDir = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const slashOrigin = new THREE.Vector3(posX, 1.12, posZ).addScaledVector(forwardDir, 1.15);

      if (wpn.category === 'gun') {
        // 3D Energy Laser Beam + GLSL Muzzle Shockwave
        const beamLen = wpn.range + 1.5;
        const beamMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, beamLen, 8),
          new THREE.MeshBasicMaterial({ color: wpnColor, transparent: true, opacity: 0.92 })
        );
        beamMesh.rotation.x = Math.PI / 2;
        beamMesh.rotation.z = -yaw;
        const beamCenter = new THREE.Vector3(posX, 1.05, posZ).addScaledVector(forwardDir, beamLen * 0.5);
        beamMesh.position.copy(beamCenter);
        scene.add(beamMesh);
        setTimeout(() => {
          scene.remove(beamMesh);
          beamMesh.geometry.dispose();
          (beamMesh.material as THREE.Material).dispose();
        }, 120);
        spawnGlslSlashWave(slashOrigin, yaw, 0, wpnColor, 0.55, 1.85, 14, 0.32);
        spawnParticleBurst(slashOrigin, wpnColor, 18, 0.26, 0.02, 16, false);
      } else if (wpn.category === 'spear') {
        spawnGlslSlashWave(slashOrigin.clone().addScaledVector(forwardDir, 0.35), yaw, 0, wpnColor, 0.65, 2.2, 15, 0.26);
        spawnShockwaveRing(slashOrigin.clone().addScaledVector(forwardDir, 0.9), wpnColor, 0.25, 1.6, 14, true, 0);
        spawnParticleBurst(slashOrigin.clone().addScaledVector(forwardDir, 0.8), wpnColor, 18, 0.22, 0.03, 16, false);
      } else if (wpn.category === 'axe') {
        spawnGlslSlashWave(slashOrigin, yaw, 0.28, wpnColor, 1.0, 3.1, 18, 0.14);
        spawnGlslSlashWave(slashOrigin, yaw, -0.28, 0xfacc15, 0.85, 2.7, 16, 0.12);
        spawnShockwaveRing(new THREE.Vector3(slashOrigin.x, 0.15, slashOrigin.z), wpnColor, 0.55, 2.9, 18, true, 0.01);
        cameraShakeTimer = 8;
        cameraShakeIntensity = 0.055;
      } else {
        // Sword GLSL Plasma Crescent Wave
        spawnGlslSlashWave(slashOrigin, yaw, 0.22, wpnColor, 0.85, 2.5, 16, 0.18);
        spawnShockwaveRing(new THREE.Vector3(slashOrigin.x, 0.14, slashOrigin.z), wpnColor, 0.35, 1.85, 14, true, 0);
      }

      const effectiveRange = wpn.range + st.weaponRangeBonus + 1.65;

      // Check Destructible Corridor Barrels & Ancient Urns in attack range
      for (const prop of interactables) {
        if (prop.used || prop.kind !== 'destructible_prop') continue;
        const distProp = Math.hypot(prop.mesh.position.x - posX, prop.mesh.position.z - posZ);
        if (distProp <= effectiveRange) {
          prop.used = true;
          const pPos = prop.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0));
          spawnParticleBurst(pPos, 0xf59e0b, 22, 0.18, 0.08, 22, true);
          spawnShockwaveRing(new THREE.Vector3(pPos.x, 0.1, pPos.z), wpnColor, 0.3, 1.8, 15, true, 0.01);
          scene.remove(prop.mesh);
          playSound('score');
          const rollDrop = Math.random();
          if (rollDrop < 0.45) {
            const xpDrop = 25 + activeFloor * 5;
            gainMazeXp(xpDrop, '🏺 古代の壺を破壊');
          } else if (rollDrop < 0.78) {
            setMazeHp((h) => Math.min(st.maxHp, h + 15));
            setCombatLog('🛢️ 木樽を破壊！ 回復ポーションの雫で HP +15 回復！');
          } else {
            setTorchFuel((f) => Math.min(100, f + 25));
            setFloorTimeLeft((t) => t + 10);
            setCombatLog('🏺 壺から時空の灯火を発見！ 燃料 +25% & 制限時間 +10秒！');
          }
        }
      }

      const boostMult = st.chronoBoostSec > 0 ? 1.6 : 1.0;
      const isCrit = Math.random() < st.critChance;
      const critMult = isCrit ? 1.85 : 1.0;
      const totalDmg = Math.round((wpn.damage + st.atk) * boostMult * critMult);

      let hitCount = 0;
      for (const en of enemies) {
        if (!en.alive) continue;
        const dxE = en.mesh.position.x - posX;
        const dzE = en.mesh.position.z - posZ;
        const dist = Math.hypot(dxE, dzE);
        if (dist <= effectiveRange) {
          const hitPos = en.mesh.position.clone().add(new THREE.Vector3(0, 1.25, 0));
          if (en.specialType === 'shield_ifrit' && en.shieldActive && wpn.category !== 'axe') {
            spawnParticleBurst(hitPos, 0xfacc15, 16, 0.15, 0.05, 18, false);
            spawnShockwaveRing(hitPos, 0xf97316, 0.35, 1.5, 14, false, 0);
            cameraShakeTimer = 6;
            cameraShakeIntensity = 0.04;
            setCombatLog('🛡️ シールド・イフリートが正面ガード中！（斧ならガード貫通可能）');
            return;
          }
          const appliedDmg =
            en.specialType === 'shield_ifrit' && en.shieldActive && wpn.category === 'axe'
              ? Math.round(totalDmg * 0.45)
              : totalDmg;

          en.hp -= appliedDmg;
          en.hitFlashTimer = 12;
          if (dist > 0.1) {
            const kbDist = wpn.category === 'axe' ? 0.48 : wpn.category === 'spear' ? 0.36 : 0.26;
            const kbX = en.mesh.position.x + (dxE / dist) * kbDist;
            const kbZ = en.mesh.position.z + (dzE / dist) * kbDist;
            if (!collidesAt(kbX, kbZ)) {
              en.mesh.position.set(kbX, 0, kbZ);
            }
          }
          spawnParticleBurst(hitPos, isCrit ? 0xfef08a : wpnColor, isCrit ? 30 : 20, 0.18, 0.07, 22, false);
          spawnShockwaveRing(hitPos, isCrit ? 0xfef08a : wpnColor, 0.25, isCrit ? 2.1 : 1.45, 14, false, 0);
          cameraShakeTimer = 5;
          cameraShakeIntensity = 0.038;
          hitCount++;

          const hpRatio = Math.max(0.001, en.hp / en.maxHp);
          en.parts.hpBarFill.scale.x = hpRatio;

          if (en.isBoss) {
            setCurrentFloorBossHpPct(Math.max(0, Math.round((en.hp / en.maxHp) * 100)));
          }
          if (en.hp <= 0) {
            handleEnemyDefeated(en);
          } else {
            setCombatLog(
              `${WEAPON_CATEGORY_META[wpn.category].icon}${isCrit ? '⚡会心！ ' : ' '} ${en.name} に ${appliedDmg} ダメージ！ (残りHP: ${en.hp})`
            );
          }
          if ((wpn.category === 'sword' || wpn.category === 'gun') || hitCount >= 2) {
            break;
          }
        }
      }
      if (hitCount === 0) {
        setCombatLog(`💨 空振り！ (${WEAPON_CATEGORY_META[wpn.category].label} 射程: ${wpn.range}m)`);
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
      const baseCd = wpn.cooldownSec || 15;
      const finalCd = Math.max(4, Math.round(baseCd * (1 - mazeStateRef.current.skillHaste)));
      setSkillCooldown(finalCd);
      weaponSwingTimer = 18;
      cameraShakeTimer = 14;
      cameraShakeIntensity = 0.075;

      const elMetaSkill = ELEMENT_PREFIX_META[wpn.element];
      const skillColor = elMetaSkill ? elMetaSkill.colorHex : getRarityColorHex(wpn.rarity);
      const playerFloorOrigin = new THREE.Vector3(posX, 0.16, posZ);
      spawnShockwaveRing(playerFloorOrigin, skillColor, 0.6, 9.2, 30, true, 0.02);
      spawnShockwaveRing(new THREE.Vector3(posX, 0.85, posZ), 0xffffff, 0.45, 6.5, 24, true, 0.04);
      spawnGlslSlashWave(new THREE.Vector3(posX, 1.15, posZ), yaw, 0, skillColor, 1.2, 5.2, 24, 0.24);
      spawnParticleBurst(new THREE.Vector3(posX, 1.1, posZ), skillColor, 54, 0.24, 0.12, 34, true);

      const dmgMult = wpn.element === 'core' ? 3.0 : 2.45;
      const skillDmg = Math.round((wpn.damage + mazeStateRef.current.atk) * dmgMult);

      enemies.forEach((en) => {
        if (!en.alive) return;
        en.hp -= skillDmg;
        en.hitFlashTimer = 16;
        if (wpn.element === 'gracia') {
          en.freezeTimer = 480; // 8 seconds freeze
        }
        const enOrigin = en.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        spawnParticleBurst(enOrigin, skillColor, 26, 0.2, 0.09, 26, false);
        spawnShockwaveRing(
          new THREE.Vector3(en.mesh.position.x, 0.15, en.mesh.position.z),
          skillColor,
          0.35,
          2.8,
          22,
          true,
          0.03
        );
        const hpRatio = Math.max(0.001, en.hp / en.maxHp);
        en.parts.hpBarFill.scale.x = hpRatio;

        if (en.isBoss) {
          setCurrentFloorBossHpPct(Math.max(0, Math.round((en.hp / en.maxHp) * 100)));
        }
        if (en.hp <= 0) {
          handleEnemyDefeated(en);
        }
      });

      if (wpn.element === 'ground') {
        setMazeMaxHp((m) => m + 15);
        setMazeHp((h) => Math.min(mazeStateRef.current.maxHp + 15, h + Math.round(mazeStateRef.current.maxHp * 0.4)));
        setFloorTimeLeft((t) => t + 30);
      } else if (wpn.element === 'gracia') {
        setFloorTimeLeft((t) => t + 25);
      } else if (wpn.element === 'void') {
        setTorchFuel(100);
        setMazeHp((h) => Math.min(mazeStateRef.current.maxHp, h + Math.round(mazeStateRef.current.maxHp * 0.35)));
        setFloorTimeLeft((t) => t + 20);
      } else if (wpn.element === 'cyber') {
        setChronoBoostSec((s) => s + 25);
        setFloorTimeLeft((t) => t + 25);
      } else if (wpn.element === 'core') {
        setMazeHp((h) => Math.min(mazeStateRef.current.maxHp, h + Math.round(mazeStateRef.current.maxHp * 0.5)));
        setFloorTimeLeft((t) => t + 30);
      }

      setCombatLog(
        `✨ ${elMetaSkill.prefix}スキル「${wpn.skillName}」発動！ 全域に ${skillDmg} ダメージ (${elMetaSkill.bossSkillDesc})`
      );
    };

    mazeActionsRef.current.paintFloor = () => {
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(0.25, 0.65, 16),
        new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(posX, 0.07, posZ);
      scene.add(marker);
      spawnShockwaveRing(new THREE.Vector3(posX, 0.08, posZ), 0x00f2ff, 0.3, 1.4, 15, true, 0);
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
      const elapsedTime = ticks / 60;

      // Update GLSL Shaders Time Uniforms (Post-Processing Path Tracer / Standard Shader, Portal Vortex, Torches)
      postMaterial.uniforms.uTime.value = elapsedTime;
      portalVortexMat.uniforms.uTime.value = elapsedTime;
      if (voidHandheldFlameMat) {
        voidHandheldFlameMat.uniforms.uTime.value = elapsedTime * 1.35;
      }
      for (let i = 0; i < wallTorches.length; i++) {
        const wt = wallTorches[i];
        wt.flameMat.uniforms.uTime.value = elapsedTime + wt.flickerSeed;
      }
      // Dynamically bind the PointLight pool to the nearest wall torches so wall sconces illuminate corridors around the player
      if (!isVoidFloor && torchLightPool.length > 0 && wallTorches.length > 0) {
        const sortedTorches = [...wallTorches].sort((a, b) => {
          const da = (a.group.position.x - posX) ** 2 + (a.group.position.z - posZ) ** 2;
          const db = (b.group.position.x - posX) ** 2 + (b.group.position.z - posZ) ** 2;
          return da - db;
        });
        for (let i = 0; i < torchLightPool.length; i++) {
          const wt = sortedTorches[i];
          const pl = torchLightPool[i];
          if (wt && pl) {
            pl.position.set(wt.group.position.x, wt.group.position.y + 0.25, wt.group.position.z);
            const flicker =
              1.0 +
              Math.sin(elapsedTime * 11.0 + wt.flickerSeed) * 0.14 +
              Math.cos(elapsedTime * 19.0 + wt.flickerSeed * 2.1) * 0.08;
            pl.intensity = wt.baseIntensity * flicker;
          }
        }
      }

      const st = mazeStateRef.current;
      const moveSpeed = (st.chronoBoostSec > 0 ? 0.15 : 0.1) * st.moveSpeedMult;
      const rotSpeed = 0.042;

      // Turn Left / Right
      if (keys['ArrowLeft'] || keys['KeyA'] || controlsRef.current.left) yaw += rotSpeed;
      if (keys['ArrowRight'] || keys['KeyD'] || controlsRef.current.right) yaw -= rotSpeed;

      // Forward / Backward
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

      const isPlayerMoving = dx !== 0 || dz !== 0;
      if (dx !== 0 && !collidesAt(posX + dx, posZ)) {
        posX += dx;
      }
      if (dz !== 0 && !collidesAt(posX, posZ + dz)) {
        posZ += dz;
      }

      // Camera Position + Head-bob + Camera Shake
      const headBobY = isPlayerMoving ? Math.sin(ticks * 0.22) * 0.035 : Math.sin(ticks * 0.05) * 0.008;
      let shakeX = 0;
      let shakeY = 0;
      if (cameraShakeTimer > 0) {
        cameraShakeTimer--;
        shakeX = (Math.random() - 0.5) * cameraShakeIntensity;
        shakeY = (Math.random() - 0.5) * cameraShakeIntensity;
      }
      camera.position.set(posX + shakeX, 1.15 + headBobY + shakeY, posZ);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yaw;

      // Update First-Person 3D Weapon Viewmodel & Void Left-Hand Torch Sway
      const activeWpn = st.weapon;
      swordMeshGroup.visible = activeWpn.category === 'sword';
      gunMeshGroup.visible = activeWpn.category === 'gun';
      spearMeshGroup.visible = activeWpn.category === 'spear';
      axeMeshGroup.visible = activeWpn.category === 'axe';

      const wpnRarityColor = getRarityColorHex(activeWpn.rarity);
      const wpnElementMeta = ELEMENT_PREFIX_META[activeWpn.element];
      const wpnElemColor = wpnElementMeta ? wpnElementMeta.colorHex : wpnRarityColor;
      const wpnAccentColor = wpnElementMeta ? wpnElementMeta.accentHex : 0xfacc15;

      bladeMat.color.setHex(wpnElemColor);
      bladeMat.emissive.setHex(wpnRarityColor);
      guardMat.color.setHex(wpnAccentColor);
      guardMat.emissive.setHex(wpnElemColor);

      const idleSwayX = isPlayerMoving ? Math.cos(ticks * 0.18) * 0.025 : Math.cos(ticks * 0.04) * 0.008;
      const idleSwayY = isPlayerMoving ? Math.abs(Math.sin(ticks * 0.18)) * 0.03 : Math.sin(ticks * 0.04) * 0.01;

      if (voidHandheldTorchGroup) {
        voidHandheldTorchGroup.position.set(-0.42 - idleSwayX * 0.8, -0.36 - idleSwayY * 0.9, -0.62);
      }

      if (weaponSwingTimer > 0) {
        weaponSwingTimer--;
        const swingProg = 1 - weaponSwingTimer / 14;
        const swingArc = Math.sin(swingProg * Math.PI);
        if (activeWpn.category === 'gun') {
          weaponViewGroup.position.set(0.42, -0.32 + swingArc * 0.08, -0.68 + swingArc * 0.18);
          weaponViewGroup.rotation.set(0.15 + swingArc * 0.35, -0.22, 0.05);
        } else if (activeWpn.category === 'spear') {
          weaponViewGroup.position.set(0.38 - swingArc * 0.14, -0.34 + swingArc * 0.06, -0.68 - swingArc * 0.52);
          weaponViewGroup.rotation.set(-0.65 - swingArc * 0.45, -0.25, 0.12);
        } else {
          weaponViewGroup.position.set(0.42 - swingArc * 0.38, -0.34 + swingArc * 0.12, -0.68 - swingArc * 0.25);
          weaponViewGroup.rotation.set(0.25 - swingArc * 1.35, -0.35 + swingArc * 0.95, 0.18 + swingArc * 0.85);
        }
      } else {
        weaponViewGroup.position.set(0.42 + idleSwayX, -0.34 - idleSwayY, -0.68);
        weaponViewGroup.rotation.set(
          activeWpn.category === 'gun' ? 0.08 : 0.25,
          activeWpn.category === 'gun' ? -0.18 : -0.35,
          0.18
        );
      }

      // Animate Ambient Dungeon Mana Motes
      const motePosAttr = moteGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < moteCount; i++) {
        let my = motePosAttr.getY(i) + 0.005;
        if (my > 2.85) my = 0.15;
        motePosAttr.setY(i, my);
      }
      motePosAttr.needsUpdate = true;

      // Update Active 3D VFX Particles & GLSL Shader Effects
      for (let i = vfxParticles.length - 1; i >= 0; i--) {
        const p = vfxParticles[i];
        p.life--;
        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        p.mesh.position.z += p.vz;
        p.vy -= p.gravity;
        p.mesh.rotation.x += p.spinX;
        p.mesh.rotation.y += p.spinY;
        const ratio = Math.max(0, p.life / p.maxLife);
        if (p.scaleDecay) {
          p.mesh.scale.setScalar(0.2 + ratio * 0.9);
        }
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          (p.mesh.material as THREE.Material).dispose();
          vfxParticles.splice(i, 1);
        }
      }

      for (let i = vfxShockwaves.length - 1; i >= 0; i--) {
        const sw = vfxShockwaves[i];
        sw.life--;
        const progress = 1 - sw.life / sw.maxLife;
        const curScale = sw.startScale + (sw.endScale - sw.startScale) * progress;
        sw.mesh.scale.setScalar(curScale);
        sw.mesh.position.y += sw.riseY;
        if (sw.forwardVel) {
          sw.mesh.position.add(sw.forwardVel);
        }
        sw.mat.uniforms.uTime.value = elapsedTime;
        sw.mat.uniforms.uProgress.value = progress;
        if (sw.life <= 0) {
          scene.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          sw.mat.dispose();
          vfxShockwaves.splice(i, 1);
        }
      }

      // Update Void Handheld Torch Light & Fog density dynamically
      if (isVoidFloor && voidHandheldTorchLight) {
        const fuelRatio = Math.max(0.05, st.torchFuel / 100);
        postMaterial.uniforms.uFogDensity.value = 0.085 + (1 - fuelRatio) * 0.16;
        const lightMult = isCustom ? customCfg.torchLightMultiplier : 1.0;
        const flicker = 1.0 + Math.sin(elapsedTime * 13.0) * 0.12;
        voidHandheldTorchLight.distance = (4.5 + fuelRatio * 14.5) * lightMult;
        voidHandheldTorchLight.intensity = (0.7 + fuelRatio * 2.4) * lightMult * flicker;
      }

      // Convert player world pos to grid cell
      const curC = Math.min(gridSize - 1, Math.max(0, Math.floor((posX + halfGrid) / cellSize)));
      const curR = Math.min(gridSize - 1, Math.max(0, Math.floor((posZ + halfGrid) / cellSize)));
      if (ticks % 6 === 0) {
        setPlayerGridPos({ r: curR, c: curC, yaw });
      }

      // Animate Exit Stairs Portal & Check Floor Advancement
      portalOuterCylinder.rotation.y += 0.035;
      portalInnerCore.rotation.y -= 0.05;
      portalBaseRing.rotation.z += 0.04;
      portalTopRing.rotation.z -= 0.04;
      if (ticks % 18 === 0) {
        spawnParticleBurst(
          new THREE.Vector3(stairsPos.x, 0.3, stairsPos.z),
          0x00f2ff,
          2,
          0.04,
          0.06,
          24,
          false
        );
      }

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

      // Check Interactables & Animate Corridor Traps (Spike Traps, Pendulum Guillotines, Chests, etc.)
      for (const item of interactables) {
        if (item.used) continue;

        if (item.kind === 'spike_trap' && item.subGroup) {
          const cycle = Math.sin(elapsedTime * 2.8 + (item.phase || 0));
          const spikeUp = cycle > 0.25;
          const targetY = spikeUp ? 0.02 : -0.45;
          item.subGroup.position.y += (targetY - item.subGroup.position.y) * 0.25;

          if (spikeUp && Math.hypot(posX - item.mesh.position.x, posZ - item.mesh.position.z) < 1.15 && ticks % 32 === 0) {
            spawnParticleBurst(new THREE.Vector3(posX, 0.35, posZ), 0xf43f5e, 14, 0.14, 0.06, 18, false);
            cameraShakeTimer = 7;
            cameraShakeIntensity = 0.055;
            setMazeHp((h) => {
              const next = h - 12;
              if (next <= 0) {
                triggerMazeDeath(`${activeFloor}Fの通路スパイク罠に貫かれて倒れた`);
              }
              return Math.max(0, next);
            });
            setCombatLog('🩸 床のスパイク罠が作動！ 12 ダメージ！');
          }
          continue;
        }

        if (item.kind === 'pendulum_trap' && item.subGroup) {
          const swingAng = Math.sin(elapsedTime * 2.4 + (item.phase || 0)) * 0.68;
          item.subGroup.rotation.z = swingAng;

          // Blade is near bottom of arc when |swingAng| < 0.25
          if (
            Math.abs(swingAng) < 0.26 &&
            Math.hypot(posX - item.mesh.position.x, posZ - item.mesh.position.z) < 1.25 &&
            ticks % 30 === 0
          ) {
            spawnParticleBurst(new THREE.Vector3(posX, 1.1, posZ), 0xf43f5e, 18, 0.16, 0.06, 20, false);
            cameraShakeTimer = 9;
            cameraShakeIntensity = 0.065;
            setMazeHp((h) => {
              const next = h - 16;
              if (next <= 0) {
                triggerMazeDeath(`${activeFloor}Fの振り子ギロチン罠に斬り裂かれて倒れた`);
              }
              return Math.max(0, next);
            });
            setCombatLog('⚔️ 振り子ギロチン罠に接触！ 16 ダメージ！');
          }
          continue;
        }

        if (item.kind === 'destructible_prop') {
          continue;
        }

        if (item.kind.includes('chest') || item.kind === 'fuel_crystal') {
          item.mesh.rotation.y += 0.028;
          item.mesh.position.y =
            item.kind === 'fuel_crystal'
              ? 0.8 + Math.sin(ticks * 0.08) * 0.12
              : 0.05 + Math.sin(ticks * 0.06) * 0.04;
        }
        if (item.r === curR && item.c === curC) {
          if (item.kind === 'magma') {
            if (ticks % 35 === 0) {
              spawnParticleBurst(new THREE.Vector3(posX, 0.2, posZ), 0xff4500, 12, 0.1, 0.08, 20, false);
              cameraShakeTimer = 6;
              cameraShakeIntensity = 0.045;
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
          spawnParticleBurst(item.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xfacc15, 24, 0.15, 0.09, 26, true);
          spawnShockwaveRing(new THREE.Vector3(item.mesh.position.x, 0.1, item.mesh.position.z), 0xfacc15, 0.3, 2.2, 18, true, 0.02);
          scene.remove(item.mesh);

          if (item.kind === 'wood_chest' || item.kind === 'silver_chest' || item.kind === 'gold_chest') {
            playSound('score');
            const tier = item.kind === 'gold_chest' ? 'gold' : item.kind === 'silver_chest' ? 'silver' : 'wood';
            setChestCounts((c) => ({ ...c, [tier]: c[tier] + 1 }));
            const rolled = rollSwordChestWeapon(tier, activeFloor);
            const candidates: MazeWeapon[] = [
              rollSwordChestWeapon(tier, activeFloor),
              rollSwordChestWeapon(tier, activeFloor),
              rollSwordChestWeapon('gold', activeFloor),
              rollSwordChestWeapon('silver', activeFloor),
            ];
            triggerTopWeaponRoulette(
              tier === 'gold' ? '✨ 金の武器チェスト' : tier === 'silver' ? '🥈 銀の武器チェスト' : '📦 木の武器チェスト',
              rolled,
              candidates
            );
          } else if (item.kind === 'xp_chest') {
            playSound('levelup');
            setChestCounts((c) => ({ ...c, xp: c.xp + 1 }));
            const rRoll = Math.random() * 100;
            let xpRarity: WeaponRarity = 'Common';
            let xpReward = 80;
            if (rRoll < 4) {
              xpRarity = 'MYTHIC';
              xpReward = 950;
            } else if (rRoll < 12) {
              xpRarity = 'Legendary';
              xpReward = 620;
            } else if (rRoll < 24) {
              xpRarity = 'Exotic';
              xpReward = 420;
            } else if (rRoll < 42) {
              xpRarity = 'Epic';
              xpReward = 280;
            } else if (rRoll < 68) {
              xpRarity = 'Rare';
              xpReward = 175;
            } else if (rRoll < 88) {
              xpRarity = 'Uncommon';
              xpReward = 115;
            } else {
              xpRarity = 'Common';
              xpReward = 75;
            }
            const floorScaledXp = Math.round(xpReward * (1 + activeFloor * 0.05));
            gainMazeXp(floorScaledXp, `💠 [${xpRarity}] 経験値チェスト`);
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
            if (Math.random() < 0.2) {
              const skip = Math.floor(Math.random() * 5) + 1;
              playSound('boost');
              advanceToFloor(Math.min(50, activeFloor + skip), `🕳️ 落とし穴の大スキップ(20%)成功！ 一気に +${skip}F 進んだ！`);
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

      // =============================================================
      // Full-Body Articulated Enemy AI, Dynamic Kinematics & Combat Tick
      // =============================================================
      enemies.forEach((en) => {
        if (!en.alive) return;

        const dxP = posX - en.mesh.position.x;
        const dzP = posZ - en.mesh.position.z;
        const dist = Math.hypot(dxP, dzP);

        en.parts.hpBarGroup.lookAt(camera.position.x, en.parts.hpBarGroup.getWorldPosition(new THREE.Vector3()).y, camera.position.z);

        // Frozen by Gracia Boss Skill
        if (en.freezeTimer > 0) {
          en.freezeTimer--;
          en.parts.hitMaterials.forEach((mat) => {
            mat.emissive.setHex(0x38bdf8);
            mat.emissiveIntensity = 1.25;
          });
          return;
        }

        const targetAngle = Math.atan2(dxP, dzP);
        let angleDiff = targetAngle - en.mesh.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        en.mesh.rotation.y += angleDiff * 0.14;

        if (en.specialType === 'shield_ifrit') {
          en.shieldActive = Math.floor(ticks / 90) % 2 === 0;
          if (en.parts.shieldLeft && en.parts.shieldRight) {
            const targetShieldX = en.shieldActive ? 0.28 : 0.78;
            const targetShieldZ = en.shieldActive ? 0.64 : 0.15;
            const targetShieldRotY = en.shieldActive ? 0 : 1.15;
            en.parts.shieldLeft.position.x += (-targetShieldX - en.parts.shieldLeft.position.x) * 0.18;
            en.parts.shieldLeft.position.z += (targetShieldZ - en.parts.shieldLeft.position.z) * 0.18;
            en.parts.shieldLeft.rotation.y += (-targetShieldRotY - en.parts.shieldLeft.rotation.y) * 0.18;

            en.parts.shieldRight.position.x += (targetShieldX - en.parts.shieldRight.position.x) * 0.18;
            en.parts.shieldRight.position.z += (targetShieldZ - en.parts.shieldRight.position.z) * 0.18;
            en.parts.shieldRight.rotation.y += (targetShieldRotY - en.parts.shieldRight.rotation.y) * 0.18;
          }
        }

        const isMoving = dist < 13.5 && dist > 1.4;
        if (isMoving) {
          const stepSpeed = en.isBoss ? 0.025 : en.specialType === 'burning_soul' ? 0.036 : 0.028;
          const nextX = en.mesh.position.x + (dxP / dist) * stepSpeed;
          const nextZ = en.mesh.position.z + (dzP / dist) * stepSpeed;
          if (!collidesAt(nextX, en.mesh.position.z)) en.mesh.position.x = nextX;
          if (!collidesAt(en.mesh.position.x, nextZ)) en.mesh.position.z = nextZ;
          en.walkPhase += 0.22;
        } else {
          en.walkPhase += 0.085;
        }

        const p = en.parts;
        const swing = Math.sin(en.walkPhase);
        const cosPhase = Math.cos(en.walkPhase);
        const bob = Math.abs(cosPhase);

        p.coreMesh.rotation.y += 0.075;
        p.coreMesh.rotation.x += 0.05;
        const coreScale =
          en.specialType === 'burning_soul'
            ? 1.0 + Math.sin(ticks * 0.28) * 0.28
            : 1.0 + Math.sin(ticks * 0.12) * 0.11;
        p.coreMesh.scale.setScalar(coreScale);

        if (p.orbitRing1) {
          p.orbitRing1.rotation.y += en.specialType === 'burning_soul' ? 0.14 : 0.055;
          p.orbitRing1.rotation.z += 0.038;
        }
        if (p.orbitRing2) {
          p.orbitRing2.rotation.x -= 0.065;
          p.orbitRing2.rotation.y -= 0.048;
        }

        // Full-Body Articulated Kinematics (Torso twist, hip sway, head tracking, arm & leg multi-axis motion)
        if (en.attackAnimTimer > 0) {
          en.attackAnimTimer--;
          const prog = 1 - en.attackAnimTimer / 18;
          // Wind-up (0..0.35) then explosive forward cleave (0.35..1.0)
          const lunge = prog < 0.35 ? -Math.sin((prog / 0.35) * (Math.PI / 2)) * 0.45 : Math.sin(((prog - 0.35) / 0.65) * Math.PI);
          p.leftArm.rotation.x = -1.75 * lunge;
          p.rightArm.rotation.x = -1.75 * lunge;
          p.leftArm.rotation.z = -0.35 * lunge;
          p.rightArm.rotation.z = 0.35 * lunge;
          p.bodyGroup.position.z = 0.44 * lunge;
          p.bodyGroup.rotation.x = 0.32 * lunge;
          p.bodyGroup.rotation.y = Math.sin(prog * Math.PI * 2) * 0.22;
        } else if (en.hitFlashTimer > 0) {
          // Hit stagger knockback posture
          const stagger = en.hitFlashTimer / 12;
          p.bodyGroup.rotation.x = -0.28 * stagger;
          p.bodyGroup.rotation.z = Math.sin(ticks * 0.8) * 0.15 * stagger;
          p.leftArm.rotation.z = -0.5 * stagger;
          p.rightArm.rotation.z = 0.5 * stagger;
        } else {
          p.bodyGroup.position.z *= 0.82;
          if (en.archetype === 'wisp' || en.archetype === 'phantom' || en.archetype === 'burning_soul' || en.archetype === 'boss') {
            p.bodyGroup.position.y = Math.sin(en.walkPhase * 0.85) * 0.18;
            p.bodyGroup.position.x = Math.cos(en.walkPhase * 0.42) * 0.08;
            p.bodyGroup.rotation.x = isMoving ? 0.18 + Math.sin(en.walkPhase) * 0.06 : Math.sin(en.walkPhase * 0.4) * 0.06;
            p.bodyGroup.rotation.z = cosPhase * 0.08;
            p.bodyGroup.rotation.y = swing * 0.16;

            p.leftArm.rotation.x = swing * 0.55;
            p.rightArm.rotation.x = -swing * 0.55;
            p.leftArm.rotation.z = -0.22 - Math.abs(cosPhase) * 0.28;
            p.rightArm.rotation.z = 0.22 + Math.abs(cosPhase) * 0.28;
            p.leftArm.rotation.y = cosPhase * 0.25;
            p.rightArm.rotation.y = -cosPhase * 0.25;
          } else {
            // Bipedal Golem / Stalker / Shield Ifrit Full-Body Stride
            const strideAmp = isMoving ? 0.82 : 0.18;
            p.bodyGroup.position.y = isMoving ? bob * 0.14 : Math.sin(en.walkPhase) * 0.045;
            p.bodyGroup.position.x = isMoving ? swing * 0.065 : 0;
            p.bodyGroup.rotation.x = isMoving ? 0.14 + bob * 0.05 : Math.sin(en.walkPhase) * 0.03;
            p.bodyGroup.rotation.z = isMoving ? -swing * 0.09 : 0;
            p.bodyGroup.rotation.y = isMoving ? -swing * 0.22 : Math.sin(en.walkPhase * 0.5) * 0.08;

            p.leftArm.rotation.x = swing * strideAmp;
            p.rightArm.rotation.x = -swing * strideAmp;
            p.leftArm.rotation.z = -0.14 - bob * 0.12;
            p.rightArm.rotation.z = 0.14 + bob * 0.12;

            p.leftLeg.rotation.x = -swing * strideAmp;
            p.rightLeg.rotation.x = swing * strideAmp;
            p.leftLeg.rotation.z = -0.04 * swing;
            p.rightLeg.rotation.z = 0.04 * swing;
          }
        }

        // Expressive Head Tracking & Bob
        p.headGroup.rotation.y = Math.sin(en.walkPhase * 0.5) * 0.22;
        p.headGroup.rotation.x = Math.cos(en.walkPhase * 0.5) * 0.1;
        p.headGroup.rotation.z = Math.sin(en.walkPhase * 0.25) * 0.08;

        if (en.hitFlashTimer > 0) {
          en.hitFlashTimer--;
          const isFlashOn = en.hitFlashTimer > 0;
          p.hitMaterials.forEach((mat, idx) => {
            if (isFlashOn) {
              mat.emissive.setHex(0xffffff);
              mat.emissiveIntensity = 1.8;
            } else {
              mat.emissive.setHex(p.baseEmissiveColors[idx]);
              mat.emissiveIntensity = 0.38;
            }
          });
        }

        if (dist <= 1.78 && ticks % 45 === 0) {
          if (en.specialType === 'burning_soul') {
            en.alive = false;
            const boomOrigin = en.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
            spawnParticleBurst(boomOrigin, 0xef4444, 52, 0.26, 0.12, 34, true);
            spawnShockwaveRing(new THREE.Vector3(en.mesh.position.x, 0.2, en.mesh.position.z), 0xef4444, 0.45, 5.2, 26, true, 0.02);
            cameraShakeTimer = 14;
            cameraShakeIntensity = 0.085;
            scene.remove(en.mesh);
            setFloorTimeLeft((t) => Math.max(5, t - 60));
            setCombatLog('💥 バーニング・ソウルが自爆！ 制限時間が -60秒 削られた！');
            return;
          }

          en.attackAnimTimer = 18;
          cameraShakeTimer = 8;
          cameraShakeIntensity = en.isBoss ? 0.065 : 0.045;
          spawnParticleBurst(new THREE.Vector3(posX, 1.0, posZ), 0xf43f5e, 14, 0.14, 0.04, 18, false);
          spawnGlslSlashWave(
            en.mesh.position.clone().add(new THREE.Vector3(0, 1.15, 0)),
            en.mesh.rotation.y + Math.PI,
            0.2,
            en.colorHex,
            0.65,
            2.1,
            14,
            0.12
          );

          setMazeHp((h) => {
            const next = h - en.atk;
            if (next <= 0) {
              triggerMazeDeath(`${activeFloor}Fにて「${en.name}」の攻撃により倒れた`);
            }
            return Math.max(0, next);
          });
        }
      });

      if (gfx.shaderMode === 'OFF') {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
      } else {
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.render(postScene, postCamera);
      }
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      renderTarget.dispose();
      wallTex.dispose();
      wallBump.dispose();
      floorTex.dispose();
      floorBump.dispose();
      ceilTex.dispose();
      ceilBump.dispose();
      moteGeo.dispose();
      moteMat.dispose();
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
  }, [mode, gameOver, mazeVictory, mazeFloor, mazeRunId, gbRom, customRomName, graphicsSettings, customConfig]);

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
    { id: 'cloudhub', label: '🌐 GitHub & jsDelivr クラウドHub (Eaglercraft / Slope2 / TGLSC / Lumin / CloudMoon / Stash)', icon: 'Cloud' },
    { id: 'aistudio', label: '🤖 AIゲーム制作スタジオ', icon: 'Sparkles' },
    { id: 'velocity', label: 'Slope (3D Glider)', icon: 'Flame' },
    { id: 'maze', label: 'Glasia Dungeons', icon: 'Compass' },
    { id: '2048', label: '2048', icon: 'LayoutGrid' },
    { id: 'puzzles', label: 'パズル・タイピング', icon: 'Grid3x3' },
    { id: 'gameboy', label: 'Game Boy', icon: 'Gamepad2' },
  ];

  const activeAreaTheme = getAreaThemeForFloor(mazeFloor);
  const timerMins = Math.floor(floorTimeLeft / 60);
  const timerSecs = floorTimeLeft % 60;
  const cycleFloorHud = ((mazeFloor - 1) % 50) + 1;

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
                setMazeVictory(false);
                setCauseOfDeath(null);
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
            <div className="hidden md:flex items-center gap-2">
              <span className="text-white/50">A/D or ←/→ or ドラッグ操作</span>
              <span className="font-bold text-sky-400">{speedGauge} km/h</span>
            </div>
          )}
          {mode === 'maze' && (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${activeAreaTheme.uiBorder} ${activeAreaTheme.uiBg} ${activeAreaTheme.uiText}`}>
                {activeAreaTheme.badge} {mazeFloor}F / 50F ({activeAreaTheme.name})
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold">
                {graphicsSettings.preset} · {SHADER_MODE_META[graphicsSettings.shaderMode].shortLabel}
              </span>
              <span className={`font-bold ${floorTimeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                ⏱ {timerMins}:{timerSecs < 10 ? '0' : ''}{timerSecs}
              </span>
              <span className="text-emerald-400 font-bold">
                HP {mazeHp}/{mazeMaxHp}
              </span>
              {mazeScreenState === 'PLAYING' && (
                <button
                  onClick={() => {
                    setMazeScreenState('TITLE');
                    setTitleSubModal('NONE');
                  }}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/90 text-[10px] font-sans font-bold transition"
                >
                  🏠 タイトル
                </button>
              )}
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
      <div
        tabIndex={0}
        className="relative flex-1 overflow-hidden min-h-0 min-w-0 flex items-center justify-center outline-none"
        ref={containerRef}
      >
        {/* =========================================================
            Glasia Dungeons AAA Title Screen & Sub-Modals (Play / Codex / Settings)
           ========================================================= */}
        {mode === 'maze' && mazeScreenState === 'TITLE' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-black/75 via-slate-950/55 to-black/85 backdrop-blur-[2px]">
            {/* Top Technical Badge Bar */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-white/70">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-bold">
                  GLSL SHADER: {SHADER_MODE_META[graphicsSettings.shaderMode].label}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-bold">
                  QUALITY: {graphicsSettings.preset}
                </span>
                <span className="hidden sm:inline px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                  64×64 PBR TEXTURES · 50 FLOORS WIDE LABYRINTH
                </span>
              </div>
              {lunaticCleared && (
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-500/30 to-amber-500/30 border border-amber-400/60 text-amber-200 font-bold">
                  👑 LUNATIC 50F 制覇済 · CUSTOM解放中
                </span>
              )}
            </div>

            {/* Center Hero Title & Action Buttons */}
            <div className="flex flex-col items-center text-center max-w-2xl my-auto">
              <div className="text-[11px] font-mono uppercase tracking-[0.45em] text-cyan-300/90 mb-2">
                DARK FANTASY PROCEDURAL ABYSS ROGUELIKE
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-b from-white via-cyan-100 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_6px_30px_rgba(0,242,255,0.35)]">
                Glasia Dungeons
              </h1>
              <p className="mt-3 text-xs sm:text-sm text-white/70 max-w-lg leading-relaxed">
                松明の炎だけが照らす漆黒の50階層。PTGI (スクリーンスペース・パストレーシングGI) と標準GLSLシェーダーを自在に切り替え、広大な迷宮と120種の属性武器で深淵を攻略せよ。
              </p>

              {/* Main Title Buttons: Quick Play / Difficulty Select / Codex / Settings */}
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 w-full">
                <button
                  onClick={() => startNewMazeRun('NORMAL', false)}
                  className="w-64 sm:w-52 py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-300 hover:brightness-110 text-slate-950 font-black text-base shadow-[0_0_30px_rgba(56,189,248,0.45)] transition transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Icon name="Play" size={18} />
                  <span>いますぐプレイ</span>
                </button>
                <button
                  onClick={() => setTitleSubModal('DIFFICULTY')}
                  className="w-64 sm:w-44 py-4 px-5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-bold text-sm backdrop-blur-xl transition flex items-center justify-center gap-2"
                >
                  <Icon name="Compass" size={17} />
                  <span>難易度選択</span>
                </button>
                <button
                  onClick={() => setTitleSubModal('CODEX')}
                  className="w-64 sm:w-44 py-4 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-sm backdrop-blur-xl transition flex items-center justify-center gap-2"
                >
                  <Icon name="BookOpen" size={17} />
                  <span>図鑑 ({discoveredWeapons.length}/120)</span>
                </button>
                <button
                  onClick={() => setTitleSubModal('SETTINGS')}
                  className="w-64 sm:w-48 py-4 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-sm backdrop-blur-xl transition flex items-center justify-center gap-2"
                >
                  <Icon name="Sliders" size={17} />
                  <span>設定 (PTGI / 標準Shader)</span>
                </button>
              </div>

              {/* Instant Shader Switcher Strip on Title Screen */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 bg-black/55 border border-white/15 rounded-2xl px-3 py-2">
                <span className="text-[10px] font-bold text-white/60 mr-1">シェーダー切替:</span>
                {(['FULL_PT', 'PTGI', 'STANDARD', 'CEL', 'CRT', 'OFF'] as ShaderMode[]).map((sm) => {
                  const active = graphicsSettings.shaderMode === sm;
                  return (
                    <button
                      key={sm}
                      onClick={() =>
                        setGraphicsSettings((g) => ({
                          ...g,
                          shaderMode: sm,
                          screenSpacePathTracing: sm === 'FULL_PT' || sm === 'PTGI',
                        }))
                      }
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition ${
                        active
                          ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.45)]'
                          : 'bg-white/5 text-white/70 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {SHADER_MODE_META[sm].shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Feature Highlights */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-white/65 border-t border-white/10 pt-3">
              <div className="bg-black/45 px-3 py-2 rounded-xl border border-white/10">
                <span className="text-amber-300 font-bold">🕯️ 壁の松明 & Void手持ち松明</span>
                <div className="text-[10px] text-white/50">通常階層は壁の松明のみ・Void階層は左手に松明を携行</div>
              </div>
              <div className="bg-black/45 px-3 py-2 rounded-xl border border-white/10">
                <span className="text-cyan-300 font-bold">🗺️ 広大な50階層 & ランダム出口</span>
                <div className="text-[10px] text-white/50">24×24〜32×32の広大な迷宮・毎回異なるゴール配置</div>
              </div>
              <div className="bg-black/45 px-3 py-2 rounded-xl border border-white/10">
                <span className="text-rose-300 font-bold">⚔️ 通路ギミック & 破壊オブジェクト</span>
                <div className="text-[10px] text-white/50">床スパイク・天井振り子ギロチン・破壊可能な樽と古代壺</div>
              </div>
              <div className="bg-black/45 px-3 py-2 rounded-xl border border-white/10">
                <span className="text-purple-300 font-bold">✨ GLSL パストレーシング GI</span>
                <div className="text-[10px] text-white/50">リアルタイム間接光バウンス & GLSLプラズマ斬撃シェーダー</div>
              </div>
            </div>

            {/* Sub-Modal 1: Difficulty Selection & Custom Mode Configuration */}
            {titleSubModal === 'DIFFICULTY' && (
              <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
                <div className="max-w-xl w-full bg-zinc-900/95 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90%] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <h2 className="text-base font-black text-cyan-300">⚔️ 難易度を選択してダンジョンへ出発 (全50階層)</h2>
                      <p className="text-[11px] text-white/60">最高難易度「LUNATIC」で50Fを制覇すると「CUSTOM (カスタム)」が解放されます</p>
                    </div>
                    <button onClick={() => setTitleSubModal('NONE')} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white">
                      <Icon name="X" size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {[
                      { id: 'EASY' as MazeDifficulty, title: 'EASY (探索重視)', desc: '敵ステータス 0.75x · 初心者でも安心の探索モード', badge: '推奨: 初見', color: 'border-emerald-400/50 bg-emerald-950/40 text-emerald-200' },
                      { id: 'NORMAL' as MazeDifficulty, title: 'NORMAL (標準)', desc: '敵ステータス 1.0x · Glasia Dungeonsの標準バランス', badge: '標準', color: 'border-sky-400/50 bg-sky-950/40 text-sky-200' },
                      { id: 'HARD' as MazeDifficulty, title: 'HARD (熟練者)', desc: '敵ステータス 1.35x · 罠と強敵が牙を剥く高難度', badge: '高難度', color: 'border-amber-400/50 bg-amber-950/40 text-amber-200' },
                      { id: 'LUNATIC' as MazeDifficulty, title: 'LUNATIC (最高難易度)', desc: '敵ステータス 1.75x · 50F踏破で「CUSTOM」モード解放！', badge: '🔥 最高難度', color: 'border-rose-500/60 bg-rose-950/50 text-rose-200' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => startNewMazeRun(d.id, false)}
                        className={`p-3.5 rounded-2xl border text-left transition hover:brightness-125 flex flex-col justify-between gap-1.5 ${d.color}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm">{d.title}</span>
                          <span className="px-2 py-0.5 rounded bg-black/40 text-[10px] font-mono">{d.badge}</span>
                        </div>
                        <p className="text-[11px] opacity-80">{d.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Daily RTA Challenge Button */}
                  <button
                    onClick={() => startNewMazeRun('NORMAL', true)}
                    className="w-full p-3 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:brightness-125 text-left flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-black text-amber-300">🏆 デイリーRTAチャレンジ (50Fタイムアタック)</div>
                      <div className="text-[11px] text-white/70">本日のベスト到達: {dailyBestFloor}F {dailyBestTimeSec ? `(${dailyBestTimeSec}s)` : ''}</div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-black text-xs">RTA開始</span>
                  </button>

                  {/* Custom Mode Section (Unlocked by Lunatic 50F Clear or Instant Unlock Toggle) */}
                  <div className="p-4 rounded-2xl bg-black/55 border border-purple-400/40 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-purple-300">
                          ⚙️ CUSTOM (カスタム難易度) {lunaticCleared ? '— 解放済！' : '— 🔒 LUNATIC 50F制覇で解放'}
                        </span>
                        <div className="text-[10px] text-white/55">階層の広さ・敵の倍率・罠密度・松明の明るさ・初期武器レア度を自由設定</div>
                      </div>
                      {!lunaticCleared && (
                        <button
                          onClick={() => setLunaticCleared(true)}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/30 hover:bg-purple-500/50 border border-purple-400/50 text-[10px] text-purple-200 font-bold"
                        >
                          🔓 テスト用に即時解放
                        </button>
                      )}
                    </div>

                    {lunaticCleared && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] pt-2 border-t border-white/10">
                        <div>
                          <label className="text-white/70 block mb-1">1階層の広さ (Grid Size): <span className="text-cyan-300 font-mono">{customConfig.gridSize}×{customConfig.gridSize}</span></label>
                          <input
                            type="range"
                            min={20}
                            max={32}
                            step={4}
                            value={customConfig.gridSize}
                            onChange={(e) => setCustomConfig((c) => ({ ...c, gridSize: Number(e.target.value) }))}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-white/70 block mb-1">敵ステータス・密度倍率: <span className="text-rose-300 font-mono">{customConfig.enemyMultiplier.toFixed(1)}x</span></label>
                          <input
                            type="range"
                            min={0.5}
                            max={3.0}
                            step={0.25}
                            value={customConfig.enemyMultiplier}
                            onChange={(e) => setCustomConfig((c) => ({ ...c, enemyMultiplier: Number(e.target.value) }))}
                            className="w-full accent-rose-400"
                          />
                        </div>
                        <div>
                          <label className="text-white/70 block mb-1">通路の罠・ギミック密度: <span className="text-amber-300 font-mono">{customConfig.trapMultiplier.toFixed(1)}x</span></label>
                          <input
                            type="range"
                            min={0.5}
                            max={2.5}
                            step={0.25}
                            value={customConfig.trapMultiplier}
                            onChange={(e) => setCustomConfig((c) => ({ ...c, trapMultiplier: Number(e.target.value) }))}
                            className="w-full accent-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-white/70 block mb-1">松明の光源輝度倍率: <span className="text-yellow-300 font-mono">{customConfig.torchLightMultiplier.toFixed(1)}x</span></label>
                          <input
                            type="range"
                            min={0.5}
                            max={2.0}
                            step={0.25}
                            value={customConfig.torchLightMultiplier}
                            onChange={(e) => setCustomConfig((c) => ({ ...c, torchLightMultiplier: Number(e.target.value) }))}
                            className="w-full accent-yellow-400"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-center justify-between gap-2">
                          <span className="text-white/70">初期装備レア度:</span>
                          <div className="flex flex-wrap gap-1">
                            {(['Common', 'Rare', 'Epic', 'Legendary', 'MYTHIC', 'OG'] as const).map((r) => (
                              <button
                                key={r}
                                onClick={() => setCustomConfig((c) => ({ ...c, startingRarity: r }))}
                                className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                  customConfig.startingRarity === r
                                    ? 'bg-purple-400 text-black border-white'
                                    : 'bg-black/40 text-white/65 border-white/15'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => startNewMazeRun('CUSTOM', false)}
                          className="sm:col-span-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400 text-black font-black text-xs shadow-lg hover:brightness-110 transition"
                        >
                          🚀 このカスタム設定で Glasia Dungeons に出撃！
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Modal 2: Settings (PTGI + Normal Shaders & Quality Presets) */}
            {titleSubModal === 'SETTINGS' && (
              <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
                <div className="max-w-lg w-full bg-zinc-900/95 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90%] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <h2 className="text-base font-black text-cyan-300">⚡ 設定 (GLSL シェーダーモード & クオリティプリセット)</h2>
                      <p className="text-[11px] text-white/60">PTGI (パストレーシングGI) と標準シェーダー・セルシェーダー・CRTをリアルタイム切り替え</p>
                    </div>
                    <button onClick={() => setTitleSubModal('NONE')} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white">
                      <Icon name="X" size={16} />
                    </button>
                  </div>

                  {/* GLSL Shader Mode Selector (Full PT + PTGI + Normal Shaders) */}
                  <div>
                    <div className="text-xs font-bold text-cyan-200 mb-2">✨ GLSL シェーダーモード選択 (フルパストレーシング / PTGI / 標準シェーダー / 特殊シェーダー)</div>
                    <div className="grid grid-cols-1 gap-2">
                      {(['FULL_PT', 'PTGI', 'STANDARD', 'CEL', 'CRT', 'OFF'] as ShaderMode[]).map((sm) => {
                        const meta = SHADER_MODE_META[sm];
                        const active = graphicsSettings.shaderMode === sm;
                        return (
                          <button
                            key={sm}
                            onClick={() =>
                              setGraphicsSettings((g) => ({
                                ...g,
                                shaderMode: sm,
                                screenSpacePathTracing: sm === 'FULL_PT' || sm === 'PTGI',
                              }))
                            }
                            className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                              active
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                                : 'bg-black/45 border-white/15 text-white/70 hover:text-white hover:border-white/30'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-black">{meta.label}</div>
                              <div className="text-[10px] opacity-75 mt-0.5">{meta.desc}</div>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 ${
                                active ? 'bg-cyan-400 text-slate-950' : 'bg-white/10 text-white/60'
                              }`}
                            >
                              {active ? '選択中' : '切替'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quality Preset Selector */}
                  <div>
                    <div className="text-xs font-bold text-white/80 mb-2">🎨 クオリティプリセット (Quality Preset)</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as QualityPreset[]).map((preset) => {
                        const cfg = QUALITY_PRESET_CONFIG[preset];
                        const active = graphicsSettings.preset === preset;
                        return (
                          <button
                            key={preset}
                            onClick={() => setGraphicsSettings((g) => ({ ...g, preset }))}
                            className={`p-2.5 rounded-xl border text-left transition ${
                              active
                                ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                                : 'bg-black/40 border-white/15 text-white/65 hover:text-white'
                            }`}
                          >
                            <div className="text-xs font-black">{preset}</div>
                            <div className="text-[10px] opacity-80 mt-0.5">PT Samples: {cfg.ptSamples}</div>
                            <div className="text-[9px] opacity-65">Scale: {Math.round(cfg.renderScale * 100)}%</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bloom & FOV Sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                      <label className="block text-white/75 mb-1">
                        ブルーム発光強度: <span className="text-amber-300 font-mono">{graphicsSettings.bloomIntensity.toFixed(1)}</span>
                      </label>
                      <input
                        type="range"
                        min={0.4}
                        max={1.8}
                        step={0.1}
                        value={graphicsSettings.bloomIntensity}
                        onChange={(e) => setGraphicsSettings((g) => ({ ...g, bloomIntensity: Number(e.target.value) }))}
                        className="w-full accent-amber-400"
                      />
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                      <label className="block text-white/75 mb-1">
                        カメラ視野角 (FOV): <span className="text-cyan-300 font-mono">{graphicsSettings.fov}°</span>
                      </label>
                      <input
                        type="range"
                        min={65}
                        max={95}
                        step={5}
                        value={graphicsSettings.fov}
                        onChange={(e) => setGraphicsSettings((g) => ({ ...g, fov: Number(e.target.value) }))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      🔊 サウンド効果音: {soundEnabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => setTitleSubModal('NONE')}
                      className="px-5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs"
                    >
                      完了
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Modal 3: Codex (図鑑) on Title Screen */}
            {titleSubModal === 'CODEX' && (
              <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
                <div className="max-w-2xl w-full bg-zinc-900/95 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[88%] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-base font-black text-cyan-300">
                      📖 Glasia Dungeons 大図鑑 (4カテゴリー × 10レア度 × 3種 = 全120種武器 & 階層ギミック)
                    </span>
                    <button onClick={() => setTitleSubModal('NONE')} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white">
                      <Icon name="X" size={16} />
                    </button>
                  </div>
                  <div className="overflow-y-auto space-y-4 text-xs pr-1">
                    <div>
                      <div className="text-white/60 font-bold mb-1.5">🏆 撃破済みボス階層 (5F〜50F):</div>
                      <div className="flex flex-wrap gap-1.5">
                        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((bf) => {
                          const cleared = defeatedBossFloors.includes(bf);
                          return (
                            <span
                              key={bf}
                              className={`px-2.5 py-1 rounded-lg border font-mono ${
                                cleared
                                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                                  : 'bg-white/5 border-white/10 text-white/35'
                              }`}
                            >
                              {bf}F {cleared ? '✓撃破' : '未撃破'}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-white/60 font-bold mb-1.5">⚔️ 4種武器カテゴリー & 各レアリティ3種バリエーション:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(['sword', 'gun', 'spear', 'axe'] as WeaponCategory[]).map((cat) => {
                          const meta = WEAPON_CATEGORY_META[cat];
                          return (
                            <div key={cat} className="p-2.5 rounded-xl bg-black/45 border border-white/10">
                              <div className="font-bold text-amber-300">{meta.icon} {meta.label} (全30種 · 各レア度3種)</div>
                              <div className="text-[11px] text-white/65 mt-0.5">
                                基本射程: {meta.baseRange}m · 攻撃倍率: {meta.dmgMult}x
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-white/60 font-bold mb-1.5">🎒 所持武器コレクション ({weaponBag.length}種 — クリックで初期装備に選択):</div>
                      <div className="space-y-1.5">
                        {weaponBag.map((w) => (
                          <button
                            key={w.id}
                            onClick={() => setEquippedWeapon(w)}
                            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between ${RARITY_COLORS[w.rarity]}`}
                          >
                            <span>
                              {WEAPON_CATEGORY_META[w.category].icon} {w.name} ({w.rarity} · {WEAPON_CATEGORY_META[w.category].label})
                            </span>
                            <span className="font-mono">ATK {w.damage} · {w.range}m</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            Glasia Dungeons In-Game HUD & Area-Themed UI Overlay
           ========================================================= */}
        {mode === 'maze' && mazeScreenState === 'PLAYING' && (
          <>
            {/* Top-Center Non-Blocking Weapon Roulette Banner (P Key to Equip / 10s Auto-XP) & Level-Up 3-Choice Banner */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 w-full max-w-lg px-3 pointer-events-none">
              {topRoulette && (
                <div className="w-full rounded-2xl bg-slate-950/90 border border-amber-400/50 backdrop-blur-xl px-4 py-2.5 shadow-2xl pointer-events-auto transition-all">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-amber-300 truncate">{topRoulette.chestTitle}</span>
                    {topRoulette.spinning ? (
                      <span className="text-cyan-300 font-mono font-bold animate-pulse">🎰 ルーレット抽選中...</span>
                    ) : (
                      <span className="text-amber-200 font-mono font-bold">
                        ⏳ 自動XP変換まで {topRoulette.secondsLeft}秒 (+{WEAPON_RARITY_XP_VALUE[topRoulette.weapon.rarity]} XP)
                      </span>
                    )}
                  </div>

                  {(() => {
                    const shownRarity = topRoulette.spinning ? topRoulette.previewRarity : topRoulette.weapon.rarity;
                    const shownCat = topRoulette.spinning ? topRoulette.previewCategory : topRoulette.weapon.category;
                    const shownName = topRoulette.spinning ? topRoulette.previewName : topRoulette.weapon.name;
                    const catMeta = WEAPON_CATEGORY_META[shownCat];
                    return (
                      <div className={`mt-1.5 px-3 py-2 rounded-xl border flex items-center justify-between gap-3 ${RARITY_COLORS[shownRarity]}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-90">
                            <span>[{shownRarity}]</span>
                            <span>·</span>
                            <span>{catMeta.icon} {catMeta.label}</span>
                            <span>·</span>
                            <span>Variant #{topRoulette.weapon.variantIndex + 1}</span>
                          </div>
                          <div className="text-sm font-black truncate mt-0.5">
                            {catMeta.icon} {shownName}
                          </div>
                          <div className="text-[11px] opacity-90">
                            ATK <span className="font-bold">{topRoulette.weapon.damage}</span> · 射程 {topRoulette.weapon.range}m
                            {topRoulette.weapon.skillName ? ` · ✨${topRoulette.weapon.skillName}` : ''}
                          </div>
                        </div>

                        {!topRoulette.spinning && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={equipTopRouletteWeapon}
                              className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs shadow-lg transition"
                            >
                              [Pキー] 装備
                            </button>
                            <button
                              onClick={convertTopRouletteToXp}
                              className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] transition"
                            >
                              +{WEAPON_RARITY_XP_VALUE[topRoulette.weapon.rarity]} XP
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {!topRoulette.spinning && (
                    <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500 transition-all duration-1000"
                        style={{ width: `${(topRoulette.secondsLeft / 10) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Level-Up 3-Choice Upgrade Banner (Non-blocking, selectable via keys 1/2/3 or click) */}
              {levelUpChoices && (
                <div className="w-full rounded-2xl bg-indigo-950/92 border border-cyan-400/60 backdrop-blur-xl p-3 shadow-2xl pointer-events-auto">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-black text-cyan-300">
                      🆙 LEVEL UP! アップグレードを3択から選択 (1 / 2 / 3 キー)
                    </span>
                    {pendingLevelUpCount > 1 && (
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-mono text-[10px]">
                        残り +{pendingLevelUpCount}回
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {levelUpChoices.map((choice, idx) => (
                      <button
                        key={choice.id}
                        onClick={() => handleSelectLevelUpUpgrade(choice)}
                        className="p-2 rounded-xl bg-black/55 hover:bg-cyan-500/25 border border-white/15 hover:border-cyan-400 text-left transition flex flex-col justify-between gap-1 group"
                      >
                        <div className="flex items-center justify-between text-[11px] font-extrabold text-white group-hover:text-cyan-200">
                          <span className="truncate">{choice.icon} {choice.title}</span>
                          <span className="px-1.5 py-0.2 rounded bg-white/15 font-mono text-[10px] text-amber-300">
                            [{idx + 1}]
                          </span>
                        </div>
                        <div className="text-[10px] text-white/70 leading-tight">{choice.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Top-Left: Area Status, Equipped Weapon, Quick PT/Quality & Archive Controls */}
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-xs pointer-events-none">
              <div className={`p-3 rounded-2xl border backdrop-blur-xl pointer-events-auto shadow-xl ${activeAreaTheme.uiBorder} ${activeAreaTheme.uiBg}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-xs font-extrabold ${activeAreaTheme.uiText}`}>
                    {activeAreaTheme.badge} {activeAreaTheme.jpName} ({mazeFloor}F/50F)
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-white/80">
                    LV.{mazeLevel} ({mazeXp}/{mazeXpNext} XP)
                  </span>
                </div>

                {/* Equipped Weapon Badge */}
                <div className={`mt-1.5 px-2.5 py-1.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${RARITY_COLORS[equippedWeapon.rarity]}`}>
                  <div className="truncate">
                    <div className="font-bold truncate">
                      {WEAPON_CATEGORY_META[equippedWeapon.category].icon} {equippedWeapon.name}
                    </div>
                    <div className="text-[10px] opacity-80">
                      [{equippedWeapon.rarity} · {WEAPON_CATEGORY_META[equippedWeapon.category].label}] ATK: {equippedWeapon.damage + mazeAtk} · 射程: {(equippedWeapon.range + weaponRangeBonus).toFixed(1)}m
                    </div>
                  </div>
                </div>

                {/* Elemental / High-Rarity Active Skill Button */}
                {equippedWeapon.skillName && (
                  <button
                    onClick={() => mazeActionsRef.current.useSkill()}
                    className="mt-1.5 w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400 text-black font-extrabold text-[11px] hover:brightness-110 transition shadow-md"
                  >
                    ✨ {ELEMENT_PREFIX_META[equippedWeapon.element]?.prefix}スキル: {equippedWeapon.skillName}{' '}
                    {skillCooldown > 0 ? `(${skillCooldown}s)` : '[Rキー]'}
                  </button>
                )}

                {/* Void Area (21-30F) Handheld Torch Fuel Meter */}
                {cycleFloorHud >= 21 && cycleFloorHud <= 30 && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-[10px] text-amber-300 mb-1">
                      <span>🕯️ 左手の松明の燃料 (Void階層は壁松明なし)</span>
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

                {/* Quick Shader Mode (FULL_PT / PTGI / Normal Shader / Cel / CRT / OFF) & Quality Bar */}
                <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    {(['FULL_PT', 'PTGI', 'STANDARD', 'CEL', 'CRT', 'OFF'] as ShaderMode[]).map((sm) => (
                      <button
                        key={sm}
                        onClick={() =>
                          setGraphicsSettings((g) => ({
                            ...g,
                            shaderMode: sm,
                            screenSpacePathTracing: sm === 'FULL_PT' || sm === 'PTGI',
                          }))
                        }
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                          graphicsSettings.shaderMode === sm
                            ? 'bg-cyan-400 text-black'
                            : 'bg-black/40 text-white/65 hover:text-white'
                        }`}
                      >
                        {SHADER_MODE_META[sm].shortLabel}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as QualityPreset[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => setGraphicsSettings((g) => ({ ...g, preset: q }))}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                          graphicsSettings.preset === q
                            ? 'bg-amber-400 text-black'
                            : 'bg-black/40 text-white/60 hover:text-white'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowArchiveModal(true)}
                      className="px-2 py-0.5 rounded text-[9px] bg-white/10 hover:bg-white/20 text-cyan-200 font-semibold ml-auto"
                    >
                      📖 図鑑
                    </button>
                  </div>
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

            {/* Top-Right: Wide Dynamic Minimap, Direction Eye & Item Bag */}
            <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 pointer-events-none">
              <div className={`p-2.5 rounded-2xl border backdrop-blur-xl pointer-events-auto flex flex-col items-center gap-1.5 ${activeAreaTheme.uiBorder} ${activeAreaTheme.uiBg}`}>
                <div className="flex items-center justify-between w-full text-[10px] text-white/75 font-mono gap-2">
                  <span>MAP ({playerGridPos.c},{playerGridPos.r})</span>
                  {directionEyeActive && (
                    <span className="text-amber-300 font-bold">
                      👁️ 出口: ({stairsGridPos.c},{stairsGridPos.r})
                    </span>
                  )}
                </div>

                {/* Dynamic Wide Minimap Grid (24x24 default, up to 32x32 in Custom) */}
                <div
                  className="grid gap-[1px] bg-black/75 p-1 rounded-lg border border-white/10"
                  style={{
                    gridTemplateColumns: `repeat(${minimapGrid.length || 24}, minmax(0, 1fr))`,
                  }}
                >
                  {minimapGrid.map((row, rIdx) =>
                    row.map((cell, cIdx) => {
                      const isPlayer = playerGridPos.r === rIdx && playerGridPos.c === cIdx;
                      const dist = Math.abs(playerGridPos.r - rIdx) + Math.abs(playerGridPos.c - cIdx);
                      const visible = mapRevealed || dist <= 5 || (directionEyeActive && cell === 2);

                      let colorClass = 'bg-zinc-900';
                      if (isPlayer) colorClass = 'bg-white';
                      else if (!visible) colorClass = 'bg-black';
                      else if (cell === 1) colorClass = 'bg-zinc-600';
                      else if (cell === 2) colorClass = 'bg-cyan-400';
                      else if (cell === 3) colorClass = 'bg-amber-400';
                      else if (cell === 4) colorClass = 'bg-rose-500';
                      else if (cell === 5) colorClass = 'bg-purple-400';
                      else if (cell === 6 || cell === 7) colorClass = 'bg-orange-500';

                      return <div key={`${rIdx}-${cIdx}`} className={`w-1 h-1 sm:w-1.5 sm:h-1.5 ${colorClass}`} />;
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
                  操作: W/S(前後) · A/D(旋回) · Space(攻撃/樽破壊) · R(属性スキル) · P(ルーレット装備) · 1/2/3(Lv強化)
                </div>
              </div>

              {/* Attack Button */}
              <button
                onClick={() => mazeActionsRef.current.attack()}
                className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-extrabold text-xs shadow-xl active:scale-95 pointer-events-auto border border-white/20"
              >
                {WEAPON_CATEGORY_META[equippedWeapon.category].icon} 攻撃 (Space)
              </button>
            </div>

            {/* Archive / Codex Modal (In-Game) */}
            {showArchiveModal && (
              <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-xl flex items-center justify-center p-6">
                <div className="max-w-lg w-full bg-zinc-900 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85%] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-sm font-bold text-cyan-300">📖 Glasia Dungeons 図鑑 (剣・銃・槍・斧)</span>
                    <button onClick={() => setShowArchiveModal(false)} className="text-white/50 hover:text-white">
                      <Icon name="X" size={16} />
                    </button>
                  </div>
                  <div className="overflow-y-auto space-y-3 text-xs">
                    <div>
                      <div className="text-white/50 mb-1">撃破済みボス階層:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Set([...[5, 10, 15, 20, 25, 30, 35, 40, 45, 50], ...defeatedBossFloors])).map((bf) => {
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
                              {WEAPON_CATEGORY_META[w.category].icon} {w.name} ({w.rarity} · {WEAPON_CATEGORY_META[w.category].label})
                            </span>
                            <span className="font-mono">ATK {w.damage} · {w.range}m</span>
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

        {/* Cloud & Unblocked Game Hub (GB-Math, TGLSC, Lumin, CloudMoon, Ultimate Game Stash) & AI Game Maker Studio */}
        {(mode === 'cloudhub' || mode === 'aistudio') && (
          <div className="absolute inset-0 z-30 bg-slate-950 overflow-hidden">
            <CloudAndAIGameHub
              mode={mode}
              currentScore={score}
              discoveredWeaponsCount={discoveredWeapons.length}
              mazeBestFloor={dailyBestFloor}
              onUnlockEverything={() => {
                setLunaticCleared(true);
              }}
            />
          </div>
        )}

        {/* Touch & On-Screen Controls for Slope Glider */}
        {mode === 'velocity' && (
          <div className="absolute inset-x-6 bottom-6 z-20 flex items-center justify-between pointer-events-none">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setControl('left', true);
              }}
              onPointerUp={() => setControl('left', false)}
              onPointerLeave={() => setControl('left', false)}
              onPointerCancel={() => setControl('left', false)}
              className="w-16 h-16 rounded-2xl glass-jelly flex items-center justify-center text-sky-300 pointer-events-auto active:scale-95 transition"
            >
              <Icon name="ChevronLeft" size={28} />
            </button>
            <div className="px-3.5 py-1.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/10 text-[11px] text-white/75 pointer-events-none">
              ← / → キー、A / D キー、または画面ドラッグでボールを左右ステアリング
            </div>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setControl('right', true);
              }}
              onPointerUp={() => setControl('right', false)}
              onPointerLeave={() => setControl('right', false)}
              onPointerCancel={() => setControl('right', false)}
              className="w-16 h-16 rounded-2xl glass-jelly flex items-center justify-center text-sky-300 pointer-events-auto active:scale-95 transition"
            >
              <Icon name="ChevronRight" size={28} />
            </button>
          </div>
        )}

        {/* Game Over / Glasia Dungeons Detailed Result Screen */}
        {(gameOver || mazeVictory) && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/88 p-6 backdrop-blur-2xl">
            {mode === 'maze' ? (
              <div className="max-w-md w-full bg-zinc-900/95 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-3">
                <div className={`text-2xl sm:text-3xl font-black tracking-tight ${mazeVictory ? 'text-amber-300' : 'text-rose-400'}`}>
                  {mazeVictory ? '🏆 GLASIA DUNGEONS 50F CONQUERED!' : '💀 EXPEDITION FAILED'}
                </div>
                <div className="text-xs text-white/80 font-mono">
                  到達階層: <span className="text-cyan-300 font-bold">{mazeFloor}F / 50F</span> · 難易度: {mazeDifficulty}
                </div>
                {mazeVictory && mazeDifficulty === 'LUNATIC' && (
                  <div className="w-full p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400 text-xs text-amber-200 font-bold">
                    👑 最高難易度「LUNATIC」全50階層制覇！ タイトル画面に「CUSTOM (カスタム難易度)」が解放されました！
                  </div>
                )}
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
                <div className="w-full flex items-center gap-2 mt-2">
                  <button
                    onClick={() => startNewMazeRun(mazeDifficulty, isDailyChallenge)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500 text-black px-4 py-3 font-extrabold text-xs hover:brightness-110 transition"
                  >
                    <Icon name="RotateCcw" size={15} /> 1Fから再挑戦
                  </button>
                  <button
                    onClick={() => {
                      setGameOver(false);
                      setMazeVictory(false);
                      setMazeScreenState('TITLE');
                      setTitleSubModal('NONE');
                    }}
                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
                  >
                    タイトルへ
                  </button>
                </div>
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
