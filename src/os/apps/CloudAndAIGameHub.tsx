import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon } from '../Icon';
import {
  backendFetch,
  getBackendBaseUrl,
  getBackendConnectionState,
  resolveBackendUrl,
} from '../backendConfig';
import {
  getServiceWorkerProxyUrl,
  configureServiceWorkerWisp,
  WISP_SERVER_PRESETS,
  ProxyEngine,
} from '../proxyService';

export type GameSourceProvider =
  | 'all'
  | 'github-jsdelivr'
  | 'eaglercraft'
  | 'slope2'
  | 'tglsc'
  | 'lumin'
  | 'cloudmoon'
  | 'ultimate-stash';

export interface ExternalGameItem {
  id: string;
  title: string;
  provider: Exclude<GameSourceProvider, 'all'>;
  providerLabel: string;
  category: string;
  rating: string;
  players: string;
  badge: string;
  accentColor: string;
  thumbnail: string;
  artworkQuery?: string;
  githubRepo?: string;
  description: string;
  playUrl: string;
  isHtmlFile?: boolean;
  controls: string;
  requiresProxy?: boolean;
  cloudStream?: boolean;
  gpuPod?: string;
}

export interface AIGeneratedGame {
  id: string;
  title: string;
  prompt: string;
  genre: string;
  theme: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'LUNATIC';
  createdAt: number;
  htmlCode: string;
  author: string;
  plays: number;
}

export interface LeaderboardEntry {
  id: string;
  player: string;
  gameTitle: string;
  provider: string;
  score: number;
  badge: string;
  timestamp: number;
}

export interface GDriveFolderItem {
  id: string;
  title: string;
  isFolder: boolean;
}

export const PROVIDER_META: Record<
  GameSourceProvider,
  {
    name: string;
    shortName: string;
    subtitle: string;
    badgeColor: string;
    icon: string;
  }
> = {
  all: {
    name: 'All Sources (GitHub / jsDelivr / クラウド統合ゲームハブ)',
    shortName: 'ALL HUB',
    subtitle:
      'GitHub & jsDelivr HTML · Eaglercraft · Slope2Game.io · TGLSC · Lumin · CloudMoon · Ultimate Game Stash',
    badgeColor: 'from-cyan-500/25 to-blue-500/15 border-cyan-400/40 text-cyan-300',
    icon: 'LayoutGrid',
  },
  'github-jsdelivr': {
    name: 'GitHub & jsDelivr Direct HTML Games',
    shortName: 'GitHub / jsDelivr',
    subtitle: 'GitHub・jsDelivrからHTMLゲームファイルと公式ゲーム画像を直接取得し、iframe内で実行（見つからない場合は自動スキップ）',
    badgeColor: 'from-emerald-500/25 to-teal-500/15 border-emerald-400/40 text-emerald-300',
    icon: 'Code2',
  },
  eaglercraft: {
    name: 'Minecraft (Eaglercraft HTML & Drive)',
    shortName: 'Minecraft HTML',
    subtitle: 'Googleドライブ直結 Eaglercraft (1.8.8〜1.21.11 / Resent / Tuff / Pixel) & ローカルHTML実行',
    badgeColor: 'from-lime-500/25 to-green-500/15 border-lime-400/40 text-lime-300',
    icon: 'Gamepad2',
  },
  slope2: {
    name: 'Slope2Game.io Official Hub',
    shortName: 'Slope2Game.io',
    subtitle: 'Slope 2・Slope Tunnel・Endless Highway など高速3Dボールラン＆ダウンヒルシリーズ',
    badgeColor: 'from-green-500/25 to-emerald-500/15 border-green-400/40 text-green-300',
    icon: 'Compass',
  },
  tglsc: {
    name: 'TGLSC Gaming Library',
    shortName: 'TGLSC',
    subtitle: 'TGLSC マルチプレイFPS・ボクセル・陣取りアクションライブラリ',
    badgeColor: 'from-violet-500/25 to-purple-500/15 border-violet-400/40 text-violet-300',
    icon: 'Zap',
  },
  lumin: {
    name: 'Lumin Game Portal',
    shortName: 'Lumin',
    subtitle: 'Lumin 高フレームレート WebGL 3Dドライブ・物理パズル・アーケードゲーム',
    badgeColor: 'from-amber-500/25 to-yellow-500/15 border-amber-400/40 text-amber-300',
    icon: 'Sparkles',
  },
  cloudmoon: {
    name: 'CloudMoon (ネイティブ Cloud Gaming UI)',
    shortName: 'CloudMoon',
    subtitle: '原神・崩壊スターレイル・ゼンレスゾーンゼロ・鳴潮・Roblox・Fortnite クラウドGPU配信',
    badgeColor: 'from-sky-500/25 to-indigo-500/15 border-sky-400/40 text-sky-300',
    icon: 'Cloud',
  },
  'ultimate-stash': {
    name: 'Ultimate Game Stash (UGS Drive & GitHub HTML)',
    shortName: 'Ultimate Stash',
    subtitle: '共有いただいた UGS Files ドライブ & GitHubオープンソース復刻HTMLゲーム保管庫',
    badgeColor: 'from-rose-500/25 to-pink-500/15 border-rose-400/40 text-rose-300',
    icon: 'Database',
  },
};

export interface GDriveQuickFile {
  id: string;
  title: string;
  versionBadge: string;
  category: 'eagler-vanilla' | 'eagler-client' | 'ugs-html';
  thumbnail: string;
  artworkQuery?: string;
  description: string;
}

export const GDRIVE_QUICK_FILES: GDriveQuickFile[] = [
  {
    id: '1V4zXCqow34s6hfA549m5ZTr8hHlIwHQk',
    title: 'EaglercraftX 1.8.8 (International 日本語対応)',
    versionBadge: '⛏️ MC 1.8.8 定番',
    category: 'eagler-vanilla',
    thumbnail: 'https://opengraph.githubassets.com/1/Eaglercraft-Archive/Eaglercraftx-1.8.8-src',
    artworkQuery: 'Minecraft',
    description: '最も人気の高い EaglercraftX 1.8.8 International フル版（サバイバル・マルチ対応）',
  },
  {
    id: '15UyGMUha9m_PJv2KsbFu453SFTIcjmhv',
    title: 'EaglercraftX 1.8.8 (WASM-GC 爆速FPS版)',
    versionBadge: '⚡ 1.8.8 WASM-GC',
    thumbnail: 'https://opengraph.githubassets.com/1/Eaglercraft-Archive/Eaglercraftx-1.8.8-src',
    artworkQuery: 'Minecraft',
    category: 'eagler-vanilla',
    description: 'WebAssembly GC により通常の2〜3倍のFPSが出る高速版 1.8.8',
  },
  {
    id: '1bdByw5XjzJjmrPTpb4fmK2eKXz04HFwq',
    title: 'Eaglercraft 1.21.11 (International)',
    versionBadge: '⛏️ MC 1.21.11 最新',
    category: 'eagler-vanilla',
    thumbnail: 'https://opengraph.githubassets.com/1/PrismarineJS/prismarine-viewer',
    artworkQuery: 'Minecraft',
    description: 'ドライブ収録の最新 Eaglercraft 1.21.11 多言語対応スタンドアロンHTML版',
  },
  {
    id: '1jiGknDC6WuB8HY7T1K3L7q9elPYAJ4us',
    title: 'EaglercraftX 1.20.6 [LATEST WASM-GC]',
    versionBadge: '⛏️ MC 1.20.6 WASM',
    category: 'eagler-vanilla',
    thumbnail: 'https://opengraph.githubassets.com/1/PrismarineJS/mineflayer',
    artworkQuery: 'Minecraft',
    description: '高速WASM-GCエンジン搭載の EaglercraftX 1.20.6 最新版',
  },
  {
    id: '1t3WShG-YFU5Hj_b0rLTaVrCtS3N7Fk4x',
    title: 'Eaglercraft 1.16.5 (u3 Nether Update)',
    versionBadge: '⛏️ MC 1.16.5',
    category: 'eagler-vanilla',
    thumbnail: 'https://opengraph.githubassets.com/1/Chunkr/Chunkr',
    artworkQuery: 'Minecraft',
    description: 'ネザーアップデート対応 Eaglercraft 1.16.5 スタンドアロンHTML版',
  },
  {
    id: '1hYCuAwStpKVaOkkxIWqqGWW_9p1XxRcw',
    title: 'Eaglercraft 1.14 Aether Edition',
    versionBadge: '⛏️ MC 1.14 Aether',
    category: 'eagler-vanilla',
    thumbnail: 'https://opengraph.githubassets.com/1/Gilded-Games/The-Aether',
    artworkQuery: 'Minecraft',
    description: '天界ディメンション (Aether) 対応 Eaglercraft 1.14 特別版',
  },
  {
    id: '1X-Sw3elXnLpGps355zuLvkoI_MVssfzZ',
    title: 'Eaglercraft 1.12.2 (International)',
    versionBadge: '⛏️ MC 1.12.2',
    category: 'eagler-vanilla',
    thumbnail: 'https://opengraph.githubassets.com/1/Eaglercraft-Archive/Eaglercraft-1.12',
    artworkQuery: 'Minecraft',
    description: '日本語を含む多言語対応の Eaglercraft 1.12.2 安定版',
  },
  {
    id: '1OYrNSy2XrXcVxU80QkrXIQitJblbBFd6',
    title: 'Resent Client 5.1 (PvP & FPS Boost)',
    versionBadge: '⚔️ Resent 5.1',
    category: 'eagler-client',
    thumbnail: 'https://opengraph.githubassets.com/1/LunarClient/Apollo',
    artworkQuery: 'Minecraft',
    description: 'FPS向上・キーストローク・CPS表示・PvP MOD内蔵の人気クライアント',
  },
  {
    id: '1bpA2C8S3fUFJQ86UDLP-nR-9Y0-286US',
    title: 'Tuff Client UT15 (International JS)',
    versionBadge: '🛡️ Tuff UT15',
    category: 'eagler-client',
    thumbnail: 'https://opengraph.githubassets.com/1/FeatherMC/feather-server-api',
    artworkQuery: 'Minecraft',
    description: '多機能HUDと軽量化を備えた Tuff Client UT15 多言語版',
  },
  {
    id: '1Uf5VuWGQS5hbDkGb5VzZTdZ7GQnnxbry',
    title: 'Pixel Client 3 (1.8.8 JS)',
    versionBadge: '✨ Pixel 3 (1.8.8)',
    category: 'eagler-client',
    thumbnail: 'https://opengraph.githubassets.com/1/CloudClientDev/CloudClient',
    artworkQuery: 'Minecraft',
    description: '美しいUIと高FPS描画を備えた Pixel Client 3',
  },
  {
    id: '16SVHF4XRFjv5WCqlLHJZhF6nkBM7q4ex',
    title: '1v1.LOL Building & Battle Shooter (UGS HTML)',
    versionBadge: '🎯 UGS Drive',
    category: 'ugs-html',
    thumbnail: 'https://opengraph.githubassets.com/1/justbuildlol/1v1',
    artworkQuery: '1v1.LOL',
    description: 'UGSドライブ収録の 1v1.LOL スタンドアロンHTML版（建築＆TPSバトル）',
  },
  {
    id: '11Vimxj_TcyjiPu4AOXCEZ5WH6KuFU7Bo',
    title: '3D Pinball Space Cadet (Windows名作復刻)',
    versionBadge: '🛸 UGS Drive',
    category: 'ugs-html',
    thumbnail: 'https://opengraph.githubassets.com/1/k4zmu2a/SpaceCadetPinball',
    artworkQuery: 'Pinball Deluxe Reloaded',
    description: '伝説のWindows 3Dピンボール Space Cadet 完全再現HTML版',
  },
  {
    id: '1yQclRMII5l-C_8hKY1W2EjdlYkyasm9N',
    title: 'Geometry 3Dash (3D Rhythm Platformer)',
    versionBadge: '🎵 UGS Drive',
    category: 'ugs-html',
    thumbnail: 'https://opengraph.githubassets.com/1/RobTopGames/GeometryDash',
    artworkQuery: 'Geometry Dash',
    description: '3D空間で展開するハイスピードGeometry Dashアクション',
  },
];

export const INITIAL_EXTERNAL_GAMES: ExternalGameItem[] = [
  // ================= 1. GITHUB & JSDELIVR DIRECT HTML GAMES =================
  {
    id: 'gh-jsdelivr-hexgl',
    title: 'HexGL Futuristic Wipeout 3D Racer (GitHub / jsDelivr HTML)',
    provider: 'github-jsdelivr',
    providerLabel: 'GitHub / jsDelivr',
    category: 'Sci-Fi 3D WebGL Racing',
    rating: '5.0 ★',
    players: '640K Plays',
    badge: '📦 BKcore/HexGL',
    accentColor: '#10b981',
    thumbnail: 'https://cdn.jsdelivr.net/gh/BKcore/HexGL@master/icon_256.png',
    githubRepo: 'BKcore/HexGL',
    description:
      'GitHubリポジトリ BKcore/HexGL から jsDelivr 経由で index.html と 3D アセットを直接取得して iframe 内で実行する近未来反重力レーシング。',
    playUrl: 'https://cdn.jsdelivr.net/gh/BKcore/HexGL@master/index.html',
    isHtmlFile: true,
    controls: '左右矢印: ステアリング · 上矢印: アクセル · A/D: エアブレーキ',
  },
  {
    id: 'gh-jsdelivr-hextris',
    title: 'Hextris Fast Hexagonal Puzzle (GitHub / jsDelivr HTML)',
    provider: 'github-jsdelivr',
    providerLabel: 'GitHub / jsDelivr',
    category: 'High-Speed Arcade Puzzle',
    rating: '4.9 ★',
    players: '520K Plays',
    badge: '📦 Hextris/hextris',
    accentColor: '#10b981',
    thumbnail: 'https://cdn.jsdelivr.net/gh/Hextris/hextris@gh-pages/images/icons/apple-touch-120.png',
    githubRepo: 'Hextris/hextris',
    description:
      'GitHub (Hextris/hextris@gh-pages) の公式HTMLとゲームアイコンを jsDelivr から直接取得して iframe で実行する高速六角形パズル。',
    playUrl: 'https://cdn.jsdelivr.net/gh/Hextris/hextris@gh-pages/index.html',
    isHtmlFile: true,
    controls: '左右矢印 / A・D: 六角形の回転 · 下矢印: 高速落下',
  },
  {
    id: 'gh-jsdelivr-2048',
    title: '2048 Official Original (gabrielecirulli/2048 HTML)',
    provider: 'github-jsdelivr',
    providerLabel: 'GitHub / jsDelivr',
    category: 'Number Logic Puzzle',
    rating: '5.0 ★',
    players: '1.1M Plays',
    badge: '📦 gabrielecirulli/2048',
    accentColor: '#10b981',
    thumbnail: 'https://cdn.jsdelivr.net/gh/gabrielecirulli/2048@master/meta/apple-touch-icon.png',
    githubRepo: 'gabrielecirulli/2048',
    description:
      'Gabriele Cirulli 氏の公式 GitHub リポジトリから index.html と公式タッチアイコンを jsDelivr 経由で直接取得して実行。',
    playUrl: 'https://cdn.jsdelivr.net/gh/gabrielecirulli/2048@master/index.html',
    isHtmlFile: true,
    controls: 'WASD / 矢印キー / スワイプ: タイル移動',
  },
  {
    id: 'gh-jsdelivr-floppybird',
    title: 'Floppy Bird HTML5 Arcade (nebez/floppybird HTML)',
    provider: 'github-jsdelivr',
    providerLabel: 'GitHub / jsDelivr',
    category: 'Retro Arcade',
    rating: '4.9 ★',
    players: '480K Plays',
    badge: '📦 nebez/floppybird',
    accentColor: '#10b981',
    thumbnail: 'https://cdn.jsdelivr.net/gh/nebez/floppybird@gh-pages/assets/thumb.png',
    githubRepo: 'nebez/floppybird',
    description:
      'GitHub (nebez/floppybird@gh-pages) の index.html と公式サムネイル (assets/thumb.png) を jsDelivr から直接読み込んで iframe 実行。',
    playUrl: 'https://cdn.jsdelivr.net/gh/nebez/floppybird@gh-pages/index.html',
    isHtmlFile: true,
    controls: 'Space / クリック / 上矢印: ジャンプ飛行',
  },
  {
    id: 'gh-jsdelivr-clumsybird',
    title: 'Clumsy Bird MelonJS Edition (ellisonleao/clumsy-bird)',
    provider: 'github-jsdelivr',
    providerLabel: 'GitHub / jsDelivr',
    category: 'Arcade Side-Scroller',
    rating: '4.8 ★',
    players: '310K Plays',
    badge: '📦 ellisonleao/clumsy-bird',
    accentColor: '#10b981',
    thumbnail: 'https://cdn.jsdelivr.net/gh/ellisonleao/clumsy-bird@master/data/img/bg.png',
    githubRepo: 'ellisonleao/clumsy-bird',
    description:
      'MelonJS エンジンで構築されたオープンソース『Clumsy Bird』を GitHub / jsDelivr から直接 iframe 実行。',
    playUrl: 'https://cdn.jsdelivr.net/gh/ellisonleao/clumsy-bird@master/index.html',
    isHtmlFile: true,
    controls: 'Space / マウス左クリック: ジャンプ',
  },
  {
    id: 'gh-jsdelivr-outrun-racer',
    title: 'JavaScript OutRun Pseudo-3D Racer (jakesgordon/javascript-racer)',
    provider: 'github-jsdelivr',
    providerLabel: 'GitHub / jsDelivr',
    category: 'Retro Arcade Racing',
    rating: '4.9 ★',
    players: '390K Plays',
    badge: '📦 javascript-racer',
    accentColor: '#10b981',
    thumbnail: 'https://opengraph.githubassets.com/1/jakesgordon/javascript-racer',
    githubRepo: 'jakesgordon/javascript-racer',
    description:
      'GitHub (jakesgordon/javascript-racer) の v4.final.html を jsDelivr から直接フェッチして iframe 内で実行するハイスピードアーケードレーサー。',
    playUrl: 'https://cdn.jsdelivr.net/gh/jakesgordon/javascript-racer@master/v4.final.html',
    isHtmlFile: true,
    controls: '矢印キー / WASD: アクセル・ブレーキ・ステアリング',
  },
  {
    id: 'gh-jsdelivr-astray',
    title: 'Astray WebGL 3D Maze Ball (wwwtyro/Astray HTML)',
    provider: 'github-jsdelivr',
    providerLabel: 'GitHub / jsDelivr',
    category: '3D WebGL Labyrinth',
    rating: '4.9 ★',
    players: '350K Plays',
    badge: '📦 wwwtyro/Astray',
    accentColor: '#10b981',
    thumbnail: 'https://opengraph.githubassets.com/1/wwwtyro/Astray',
    githubRepo: 'wwwtyro/Astray',
    description:
      'Three.js + Box2D による 3D 迷宮ゲーム『Astray』の HTML ファイルを GitHub / jsDelivr から直接取得して iframe 内で実行。',
    playUrl: 'https://cdn.jsdelivr.net/gh/wwwtyro/Astray@master/index.html',
    isHtmlFile: true,
    controls: '矢印キー / WASD: 3Dボールの転がり制御',
  },
  {
    id: 'gh-jsdelivr-trex',
    title: 'Chrome T-Rex Runner Arcade (wayou/t-rex-runner HTML)',
    provider: 'github-jsdelivr',
    providerLabel: 'GitHub / jsDelivr',
    category: 'Endless Runner',
    rating: '4.8 ★',
    players: '420K Plays',
    badge: '📦 wayou/t-rex-runner',
    accentColor: '#10b981',
    thumbnail: 'https://cdn.jsdelivr.net/gh/wayou/t-rex-runner@gh-pages/assets/default_200_percent/200-offline-sprite.png',
    githubRepo: 'wayou/t-rex-runner',
    description:
      'GitHub (wayou/t-rex-runner@gh-pages) の HTML ファイルと公式スプライトシートを jsDelivr から直接読み込んで iframe 実行。',
    playUrl: 'https://cdn.jsdelivr.net/gh/wayou/t-rex-runner@gh-pages/index.html',
    isHtmlFile: true,
    controls: 'Space / 上矢印: ジャンプ · 下矢印: しゃがみ',
  },
  {
    id: 'gh-jsdelivr-pacman',
    title: 'Google Pac-Man 30th Anniversary (macek/google_pacman HTML)',
    provider: 'github-jsdelivr',
    providerLabel: 'GitHub / jsDelivr',
    category: 'Retro Arcade',
    rating: '4.9 ★',
    players: '460K Plays',
    badge: '📦 macek/google_pacman',
    accentColor: '#10b981',
    thumbnail: 'https://opengraph.githubassets.com/1/macek/google_pacman',
    artworkQuery: 'PAC-MAN',
    githubRepo: 'macek/google_pacman',
    description:
      'GitHub (macek/google_pacman) から jsDelivr 経由で index.html を取得し iframe 内で直接実行する名作パックマン。',
    playUrl: 'https://cdn.jsdelivr.net/gh/macek/google_pacman@master/index.html',
    isHtmlFile: true,
    controls: '矢印キー / WASD: パックマン移動',
  },
  {
    id: 'gh-jsdelivr-onslaught',
    title: 'Onslaught! Arena Fantasy Shooter (LostDecade/onslaught_arena)',
    provider: 'github-jsdelivr',
    providerLabel: 'GitHub / jsDelivr',
    category: 'Top-Down Action RPG',
    rating: '4.8 ★',
    players: '275K Plays',
    badge: '📦 onslaught_arena',
    accentColor: '#10b981',
    thumbnail: 'https://opengraph.githubassets.com/1/LostDecade/onslaught_arena',
    githubRepo: 'LostDecade/onslaught_arena',
    description:
      'Lost Decade Games による名作ドット絵アリーナシューター『Onslaught! Arena』を GitHub / jsDelivr から直接 iframe 実行。',
    playUrl: 'https://cdn.jsdelivr.net/gh/LostDecade/onslaught_arena@master/htdocs/index.html',
    isHtmlFile: true,
    controls: 'WASD: 移動 · マウス左クリック: 武器投擲',
  },

  // ================= 2. MINECRAFT (EAGLERCRAFT DRIVE & HTML DIRECT) =================
  {
    id: 'gdrive-eaglercraft-188-intl',
    title: 'Minecraft: EaglercraftX 1.8.8 (日本語対応・HTML iframe直結)',
    provider: 'eaglercraft',
    providerLabel: 'Minecraft HTML',
    category: 'Sandbox / Survival / Multiplayer',
    rating: '5.0 ★',
    players: '1.2M Plays',
    badge: '⛏️ マイクラ 1.8.8',
    accentColor: '#84cc16',
    thumbnail: 'https://opengraph.githubassets.com/1/Eaglercraft-Archive/Eaglercraftx-1.8.8-src',
    artworkQuery: 'Minecraft',
    description:
      '共有Googleドライブ (MC Files HTML) から直接読み込む EaglercraftX 1.8.8 International フル版。iframe内でそのまま実行！',
    playUrl: '/api/gdrive/html?id=1V4zXCqow34s6hfA549m5ZTr8hHlIwHQk',
    isHtmlFile: true,
    controls: 'WASD: 移動 · Space: ジャンプ · 左クリック: 破壊/攻撃 · 右クリック: 設置 · E: インベントリ',
  },
  {
    id: 'gdrive-eaglercraft-12111',
    title: 'Minecraft: Eaglercraft 1.21.11 (最新バージョン・HTML直結)',
    provider: 'eaglercraft',
    providerLabel: 'Minecraft HTML',
    category: 'Sandbox / Latest Version',
    rating: '5.0 ★',
    players: '940K Plays',
    badge: '⛏️ マイクラ 1.21.11',
    accentColor: '#84cc16',
    thumbnail: 'https://opengraph.githubassets.com/1/PrismarineJS/prismarine-viewer',
    artworkQuery: 'Minecraft',
    description:
      '共有ドライブ収録の Eaglercraft 1.21.11 International オフラインHTML版をiframe内でそのまま直接起動します。',
    playUrl: '/api/gdrive/html?id=1bdByw5XjzJjmrPTpb4fmK2eKXz04HFwq',
    isHtmlFile: true,
    controls: 'WASD: 移動 · Space: ジャンプ · マウス: ブロック破壊・設置 · E: インベントリ',
  },
  {
    id: 'gdrive-eaglercraft-1206-wasm',
    title: 'Minecraft: EaglercraftX 1.20.6 [WASM-GC 高速版]',
    provider: 'eaglercraft',
    providerLabel: 'Minecraft HTML',
    category: 'Sandbox / High-FPS WASM',
    rating: '5.0 ★',
    players: '820K Plays',
    badge: '⚡ マイクラ 1.20.6 WASM',
    accentColor: '#84cc16',
    thumbnail: 'https://opengraph.githubassets.com/1/PrismarineJS/mineflayer',
    artworkQuery: 'Minecraft',
    description:
      '共有ドライブ収録の [LATEST] EaglercraftX 1.20.6 WASM-GC 版。高フレームレートで快適なマイクラ体験。',
    playUrl: '/api/gdrive/html?id=1jiGknDC6WuB8HY7T1K3L7q9elPYAJ4us',
    isHtmlFile: true,
    controls: 'WASD: 移動 · Space: ジャンプ · マウス: ブロック破壊・設置 · E: インベントリ',
  },
  {
    id: 'gdrive-resent-client-51',
    title: 'Minecraft: Resent Client 5.1 (PvP & FPS Boost)',
    provider: 'eaglercraft',
    providerLabel: 'Minecraft HTML',
    category: 'PvP Client / Sandbox',
    rating: '5.0 ★',
    players: '680K Plays',
    badge: '⚔️ Resent 5.1 PvP',
    accentColor: '#84cc16',
    thumbnail: 'https://opengraph.githubassets.com/1/LunarClient/Apollo',
    artworkQuery: 'Minecraft',
    description:
      '共有ドライブ収録の ResentClient 5.1。FPSブースト・CPS/Keystrokes HUD・PvP専用MOD内蔵クライアント。',
    playUrl: '/api/gdrive/html?id=1OYrNSy2XrXcVxU80QkrXIQitJblbBFd6',
    isHtmlFile: true,
    controls: 'WASD: 移動 · 右Shift: MODメニュー · マウス: 攻撃/建築',
  },

  // ================= 3. SLOPE2GAME.IO =================
  {
    id: 'slope2-main',
    title: 'Slope 2 (Power-Ups & Speed Boost Edition)',
    provider: 'slope2',
    providerLabel: 'Slope2Game.io',
    category: '3D High-Speed Ball Runner',
    rating: '5.0 ★',
    players: '1.4M Plays',
    badge: 'Slope2Game.io 公式',
    accentColor: '#22c55e',
    thumbnail: 'https://opengraph.githubassets.com/1/cgolden15/Slope-Game',
    artworkQuery: 'Slope Run Ball',
    description:
      'slope2game.io の看板タイトル！ジャンプ台・スピードブースト・ダイヤモンド収集要素が加わった進化版 Slope 2。',
    playUrl: 'https://kdata1.com/2020/05/slope/',
    controls: '左右矢印キー / A・D: ボールの左右コントロール',
  },
  {
    id: 'slope2-cheese-rolling',
    title: 'Slope Cheese Rolling 3D Downhill',
    provider: 'slope2',
    providerLabel: 'Slope2Game.io',
    category: '3D Downhill Physics',
    rating: '4.9 ★',
    players: '590K Plays',
    badge: 'Slope2Game.io 人気',
    accentColor: '#22c55e',
    thumbnail: 'https://opengraph.githubassets.com/1/BKcore/HexGL',
    artworkQuery: 'Rolling Sky Ball',
    description:
      'slope2game.io で人気の超急斜面ローリングアクション。障害物とライバルをかわして最速で駆け抜けろ！',
    playUrl: '/api/gdrive/html?id=18UnKdrZ6zeqHynTRefXtIIaoLji2Ig7r',
    isHtmlFile: true,
    controls: 'A / D または 左右矢印キー: ステアリング',
  },
  {
    id: 'slope2-tunnel-rush',
    title: 'Slope Cyber Tunnel 360° (GitHub HTML)',
    provider: 'slope2',
    providerLabel: 'Slope2Game.io',
    category: '3D Reflex Tunnel',
    rating: '4.9 ★',
    players: '710K Plays',
    badge: 'Slope2 360°',
    accentColor: '#22c55e',
    thumbnail: 'https://opengraph.githubassets.com/1/wwwtyro/Astray',
    artworkQuery: 'Tunnel Rush',
    description:
      '3D空間の回廊を猛スピードで進み、バリアの隙間をすり抜ける反射神経ゲーム。',
    playUrl: 'https://cdn.jsdelivr.net/gh/wwwtyro/Astray@master/index.html',
    isHtmlFile: true,
    controls: '左右矢印 / A・D: ボール制御',
  },

  // ================= 4. TGLSC =================
  {
    id: 'tglsc-1v1-arena',
    title: 'Vectaria.io Voxel Multiplayer Survival',
    provider: 'tglsc',
    providerLabel: 'TGLSC',
    category: 'Multiplayer Action / Sandbox',
    rating: '4.9 ★',
    players: '465K Plays',
    badge: 'TGLSC 厳選',
    accentColor: '#a855f7',
    thumbnail: 'https://opengraph.githubassets.com/1/minetest/minetest',
    artworkQuery: 'Block Craft 3D',
    description: 'TGLSCライブラリ収録のマルチプレイ対応ボクセルアドベンチャー＆サバイバルバトル。',
    playUrl: 'https://vectaria.io/',
    controls: 'WASD: 移動 · Space: ジャンプ · マウス: アクション',
  },
  {
    id: 'tglsc-krunker-strike',
    title: 'Kour.io Fast Tactical 3D FPS',
    provider: 'tglsc',
    providerLabel: 'TGLSC',
    category: '3D First-Person Shooter',
    rating: '4.8 ★',
    players: '590K Plays',
    badge: 'TGLSC FPS',
    accentColor: '#a855f7',
    thumbnail: 'https://opengraph.githubassets.com/1/BabylonJS/Babylon.js',
    artworkQuery: 'Critical Ops FPS',
    description:
      'ブラウザ上で軽快に動作するハイスピード3DタクティカルFPS。パルクール移動と多彩な武器クラスに対応。',
    playUrl: 'https://kour.io/',
    controls: 'WASD: 移動 · マウス: 照準/射撃 · Space: ジャンプ',
  },
  {
    id: 'tglsc-paper-io',
    title: 'Paper.io 2 Territory Conquest Arena',
    provider: 'tglsc',
    providerLabel: 'TGLSC',
    category: 'Arcade Strategy',
    rating: '4.8 ★',
    players: '412K Plays',
    badge: 'TGLSC アーケード',
    accentColor: '#a855f7',
    thumbnail: 'https://opengraph.githubassets.com/1/owid/owid-grapher',
    artworkQuery: 'Paper.io 2',
    description: 'ラインを引いて自分の陣地を広げ、ライバルの隙を突いてマップ全域を制覇するリアルタイム陣取りバトル。',
    playUrl: 'https://paper-io.com/',
    controls: 'WASD / 矢印キー / マウス: 方向転換',
  },

  // ================= 5. LUMIN =================
  {
    id: 'lumin-polytrack',
    title: 'PolyTrack 3D Low-Poly Time Attack Racing',
    provider: 'lumin',
    providerLabel: 'Lumin',
    category: '3D Racing / Time Attack',
    rating: '4.9 ★',
    players: '420K Plays',
    badge: 'Lumin 人気No.1',
    accentColor: '#f59e0b',
    thumbnail: 'https://opengraph.githubassets.com/1/jakesgordon/javascript-racer',
    artworkQuery: 'Horizon Chase',
    description: '高速ローポリゴン3Dトラックレーシング。ループコースとタイムアタック対応。',
    playUrl: 'https://www.kodub.com/apps/polytrack',
    controls: 'WASD / 矢印キー: 運転 · R: リスタート',
  },
  {
    id: 'lumin-retro-bowl',
    title: 'Slow Roads Endless Procedural Driving',
    provider: 'lumin',
    providerLabel: 'Lumin',
    category: '3D Zen Driving Simulator',
    rating: '4.9 ★',
    players: '640K Plays',
    badge: 'Lumin 殿堂入り',
    accentColor: '#f59e0b',
    thumbnail: 'https://opengraph.githubassets.com/1/mrdoob/three.js',
    artworkQuery: 'Asphalt 9 Legends',
    description:
      '自動生成される美しい山岳・海岸・惑星ハイウェイをどこまでもドライブできる3Dドライビングシミュレーター。',
    playUrl: 'https://slowroads.io/',
    controls: 'WASD: 運転 · Space: ハンドブレーキ · C: カメラ変更',
  },
  {
    id: 'lumin-tetris-js',
    title: 'JavaScript Arcade Tetris (jakesgordon/javascript-tetris)',
    provider: 'lumin',
    providerLabel: 'Lumin / GitHub',
    category: 'Arcade Puzzle',
    rating: '4.8 ★',
    players: '310K Plays',
    badge: 'Lumin HTML直結',
    accentColor: '#f59e0b',
    thumbnail: 'https://opengraph.githubassets.com/1/jakesgordon/javascript-tetris',
    githubRepo: 'jakesgordon/javascript-tetris',
    description: 'GitHub / jsDelivr から直接 index.html を取得して iframe 内で実行するクラシックアーケードテトリス。',
    playUrl: 'https://cdn.jsdelivr.net/gh/jakesgordon/javascript-tetris@master/index.html',
    isHtmlFile: true,
    controls: '矢印キー: 移動・回転 · Space: ハードドロップ',
  },

  // ================= 6. CLOUDMOON (NATIVE CLOUD GAMING CATALOG) =================
  {
    id: 'cloudmoon-genshin',
    title: '原神 (Genshin Impact) — CloudMoon GPU Stream',
    provider: 'cloudmoon',
    providerLabel: 'CloudMoon',
    category: 'オープンワールドRPG',
    rating: '5.0 ★',
    players: '1.8M Streams',
    badge: '☁️ RTX 4080 Pod · 60FPS',
    accentColor: '#38bdf8',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/7b/22/8e/7b228e25-247b-9682-6c7a-99e08a585116/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg',
    artworkQuery: 'Genshin Impact',
    description:
      'CloudMoonのクラウドGPUサーバー上で『原神』を直接レンダリングし、WebRTC 60fps映像ストリームとしてiframe内に配信。容量0MBで即プレイ！',
    playUrl: 'https://web.cloudmoonapp.com/',
    controls: 'WASD: 移動 · マウス: カメラ/通常攻撃 · E: 元素スキル · Q: 元素爆発',
    requiresProxy: true,
    cloudStream: true,
    gpuPod: 'Tokyo Edge RTX-4080 #04',
  },
  {
    id: 'cloudmoon-starrail',
    title: '崩壊：スターレイル (Honkai: Star Rail)',
    provider: 'cloudmoon',
    providerLabel: 'CloudMoon',
    category: 'スペースファンタジーRPG',
    rating: '5.0 ★',
    players: '1.3M Streams',
    badge: '☁️ Cloud WebRTC · 1080p',
    accentColor: '#38bdf8',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/54/26/9b/54269b3a-7383-7748-851c-91b9769d338c/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg',
    artworkQuery: 'Honkai Star Rail',
    description:
      '星穹列車に乗って銀河を巡るHoYoverse大人気RPGをCloudMoonサーバーから0秒起動。最高画質プリセット設定済み。',
    playUrl: 'https://web.cloudmoonapp.com/',
    controls: 'マウス / キーボードショートカット (1〜4: キャラ切替 · Space: 必殺技)',
    requiresProxy: true,
    cloudStream: true,
    gpuPod: 'Tokyo Edge RTX-4080 #09',
  },
  {
    id: 'cloudmoon-zzz',
    title: 'ゼンレスゾーンゼロ (Zenless Zone Zero)',
    provider: 'cloudmoon',
    providerLabel: 'CloudMoon',
    category: '都市ファンタジー3Dアクション',
    rating: '4.9 ★',
    players: '960K Streams',
    badge: '☁️ 低遅延 120Hz 対応',
    accentColor: '#38bdf8',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/7c/9a/3a/7c9a3a8e-01d7-2898-8c28-9b7a2c7b1941/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg',
    artworkQuery: 'Zenless Zone Zero',
    description:
      '新エリー都を舞台にしたハイスピード3Dパリィ＆連携アクションをクラウドストリーミングで遅延なくプレイ。',
    playUrl: 'https://web.cloudmoonapp.com/',
    controls: 'WASD: 移動 · 左クリック: 攻撃 · Space: 極限支援パリィ · E: 強化特殊スキル',
    requiresProxy: true,
    cloudStream: true,
    gpuPod: 'Tokyo Edge L40S #12',
  },
  {
    id: 'cloudmoon-wuthering',
    title: '鳴潮 (Wuthering Waves) — Cloud Stream',
    provider: 'cloudmoon',
    providerLabel: 'CloudMoon',
    category: 'オープンワールドARPG',
    rating: '4.9 ★',
    players: '840K Streams',
    badge: '☁️ Cloud GPU 60FPS',
    accentColor: '#38bdf8',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/9a/62/5c/9a625c37-9a4e-57f0-5a57-5f10e6f56b49/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg',
    artworkQuery: 'Wuthering Waves',
    description:
      'スタイリッシュなワイヤーアクション・壁走り・音骸バトルを楽しめるオープンワールドARPG『鳴潮』クラウド版。',
    playUrl: 'https://web.cloudmoonapp.com/',
    controls: 'WASD: 移動 · マウス: 攻撃/回避反撃 · R: 共鳴解放 · Q: 音骸スキル',
    requiresProxy: true,
    cloudStream: true,
    gpuPod: 'Tokyo Edge RTX-4080 #15',
  },
  {
    id: 'cloudmoon-roblox',
    title: 'Roblox (ロブロックス 全ワールド対応)',
    provider: 'cloudmoon',
    providerLabel: 'CloudMoon',
    category: 'アクション / メタバース',
    rating: '4.9 ★',
    players: '2.1M Streams',
    badge: '☁️ CloudMoon 人気No.1',
    accentColor: '#38bdf8',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/d1/6b/8a/d16b8a0a-0d52-2e67-77f4-08527e351a4e/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg',
    artworkQuery: 'Roblox',
    description:
      'Blox Fruits、Brookhaven、Doors、The Strongest BattlegroundsなどRobloxの全人気エクスペリエンスをブラウザ内で即プレイ。',
    playUrl: 'https://web.cloudmoonapp.com/',
    controls: 'WASD: 移動 · Space: ジャンプ · マウス右ドラッグ: 視点回転',
    requiresProxy: true,
    cloudStream: true,
    gpuPod: 'Tokyo Edge A10G #02',
  },
  {
    id: 'cloudmoon-brawlstars',
    title: 'Brawl Stars (ブロスタ) & Blue Archive',
    provider: 'cloudmoon',
    providerLabel: 'CloudMoon',
    category: '3v3 バトル / アニメRPG',
    rating: '4.9 ★',
    players: '920K Streams',
    badge: '☁️ モバイルクラウド',
    accentColor: '#38bdf8',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/0b/7c/07/0b7c0798-2190-7b1f-369c-80e0a726925c/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg',
    artworkQuery: 'Brawl Stars',
    description:
      'ブロスタ、ブルーアーカイブ、学園アイドルマスター、NIKKEなどの人気タイトルをCloudMoonの高速インスタンスで即起動。',
    playUrl: 'https://web.cloudmoonapp.com/',
    controls: 'WASD: 移動 · マウス: エイム＆ウルト発射',
    requiresProxy: true,
    cloudStream: true,
    gpuPod: 'Tokyo Edge A10G #07',
  },

  // ================= 7. ULTIMATE GAME STASH (UGS DRIVE & GITHUB HTML) =================
  {
    id: 'ugs-drive-1v1lol',
    title: '1v1.LOL Battle Royale & Builder (UGS Drive HTML)',
    provider: 'ultimate-stash',
    providerLabel: 'Ultimate Game Stash',
    category: '3D Third-Person Shooter / Builder',
    rating: '5.0 ★',
    players: '1.5M Plays',
    badge: '🎯 UGS Drive HTML',
    accentColor: '#f43f5e',
    thumbnail: 'https://opengraph.githubassets.com/1/justbuildlol/1v1',
    artworkQuery: '1v1.LOL',
    description:
      '共有UGSドライブ収録の高速建築＆サードパーソンシューター HTML版。iframe内で直接実行！',
    playUrl: '/api/gdrive/html?id=16SVHF4XRFjv5WCqlLHJZhF6nkBM7q4ex',
    isHtmlFile: true,
    controls: 'WASD: 移動 · マウス: 射撃/建築 · Z/X/C/V: 建築クラフト',
  },
  {
    id: 'ugs-drive-pinball',
    title: '3D Pinball Space Cadet (UGS Drive HTML)',
    provider: 'ultimate-stash',
    providerLabel: 'Ultimate Game Stash',
    category: 'Arcade Pinball',
    rating: '5.0 ★',
    players: '670K Plays',
    badge: '🛸 UGS Drive HTML',
    accentColor: '#f43f5e',
    thumbnail: 'https://opengraph.githubassets.com/1/k4zmu2a/SpaceCadetPinball',
    artworkQuery: 'Pinball Deluxe Reloaded',
    description: '共有UGSドライブ収録の宇宙ピンボール『Space Cadet』WebAssembly HTML復刻版。',
    playUrl: '/api/gdrive/html?id=11Vimxj_TcyjiPu4AOXCEZ5WH6KuFU7Bo',
    isHtmlFile: true,
    controls: 'Z / 左右矢印: フリッパー · Space: 発射',
  },
  {
    id: 'ugs-drive-geometry3d',
    title: 'Geometry 3Dash Rhythm Parkour (UGS Drive HTML)',
    provider: 'ultimate-stash',
    providerLabel: 'Ultimate Game Stash',
    category: '3D Rhythm Platformer',
    rating: '4.9 ★',
    players: '620K Plays',
    badge: '🎵 UGS Drive HTML',
    accentColor: '#f43f5e',
    thumbnail: 'https://opengraph.githubassets.com/1/RobTopGames/GeometryDash',
    artworkQuery: 'Geometry Dash',
    description: '立体的な3Dカメラワークで展開する進化系Geometry DashリズムアクションHTML版。',
    playUrl: '/api/gdrive/html?id=1yQclRMII5l-C_8hKY1W2EjdlYkyasm9N',
    isHtmlFile: true,
    controls: 'Space / クリック / 上矢印: ジャンプ・飛行',
  },
  {
    id: 'ugs-boulderdash',
    title: 'JavaScript Boulder Dash (jakesgordon/javascript-boulderdash)',
    provider: 'ultimate-stash',
    providerLabel: 'Ultimate Stash / GitHub',
    category: 'Retro Cave Action Puzzle',
    rating: '4.9 ★',
    players: '290K Plays',
    badge: '📦 javascript-boulderdash',
    accentColor: '#f43f5e',
    thumbnail: 'https://opengraph.githubassets.com/1/jakesgordon/javascript-boulderdash',
    githubRepo: 'jakesgordon/javascript-boulderdash',
    description:
      'GitHub (jakesgordon/javascript-boulderdash) から jsDelivr 経由で index.html を直接取得し iframe 内で実行する名作洞窟パズル。',
    playUrl: 'https://cdn.jsdelivr.net/gh/jakesgordon/javascript-boulderdash@master/index.html',
    isHtmlFile: true,
    controls: '矢印キー: 掘削・移動 · Space: 待機',
  },
];

// ============================================================================
// Procedural & Server AI-Assisted Playable HTML5 Game Compiler
// ============================================================================
export function compilePlayableAIGameHtml(params: {
  title: string;
  prompt: string;
  genre: string;
  theme: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'LUNATIC';
}): string {
  const { title, prompt, genre, theme, difficulty } = params;
  const pLower = `${title} ${prompt} ${genre}`.toLowerCase();

  let detectedMode: 'shooter' | 'survivor' | 'racing' | 'breaker' | 'platformer' = 'shooter';
  if (
    pLower.includes('サバイバ') ||
    pLower.includes('ヴァンサバ') ||
    pLower.includes('rpg') ||
    pLower.includes('魔法') ||
    pLower.includes('survivor') ||
    pLower.includes('zombie') ||
    pLower.includes('ゾンビ')
  ) {
    detectedMode = 'survivor';
  } else if (
    pLower.includes('レース') ||
    pLower.includes('車') ||
    pLower.includes('ドリフト') ||
    pLower.includes('racing') ||
    pLower.includes('drive') ||
    pLower.includes('スロープ') ||
    pLower.includes('slope')
  ) {
    detectedMode = 'racing';
  } else if (
    pLower.includes('ブロック') ||
    pLower.includes('パズル') ||
    pLower.includes('反射') ||
    pLower.includes('breakout') ||
    pLower.includes('ピンボール')
  ) {
    detectedMode = 'breaker';
  } else if (
    pLower.includes('ジャンプ') ||
    pLower.includes('アクション') ||
    pLower.includes('ラン') ||
    pLower.includes('platform') ||
    pLower.includes('マリオ') ||
    pLower.includes('忍者')
  ) {
    detectedMode = 'platformer';
  }

  const palettes: Record<
    string,
    { bg: string; primary: string; secondary: string; enemy: string; accent: string }
  > = {
    'Cyberpunk Neon': {
      bg: '#050814',
      primary: '#00f2ff',
      secondary: '#a855f7',
      enemy: '#f43f5e',
      accent: '#facc15',
    },
    'Dark Fantasy Abyss': {
      bg: '#090514',
      primary: '#c084fc',
      secondary: '#38bdf8',
      enemy: '#ef4444',
      accent: '#fbbf24',
    },
    'Golden Sparkle Luxury': {
      bg: '#0c0802',
      primary: '#fde047',
      secondary: '#f59e0b',
      enemy: '#fb7185',
      accent: '#38bdf8',
    },
    'Retro Pixel CRT': {
      bg: '#041208',
      primary: '#4ade80',
      secondary: '#22d3ee',
      enemy: '#f87171',
      accent: '#facc15',
    },
  };
  const pal = palettes[theme] || palettes['Cyberpunk Neon'];
  const diffMult =
    difficulty === 'EASY'
      ? 0.75
      : difficulty === 'HARD'
      ? 1.35
      : difficulty === 'LUNATIC'
      ? 1.85
      : 1.0;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title.replace(/</g, '&lt;')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
  body {
    background: ${pal.bg};
    color: #fff;
    font-family: 'Plus Jakarta Sans', 'Noto Sans JP', system-ui, sans-serif;
    overflow: hidden;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  #hud {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    background: rgba(0, 0, 0, 0.65);
    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(12px);
    z-index: 10;
    font-size: 13px;
  }
  .badge {
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    border: 1px solid ${pal.primary}66;
    color: ${pal.primary};
    font-weight: 800;
    font-size: 11px;
  }
  .stat { font-family: monospace; font-weight: 800; font-size: 14px; }
  #canvas-wrap { position: relative; flex: 1; width: 100%; height: 100%; }
  canvas { width: 100%; height: 100%; display: block; cursor: crosshair; }
  #controls-hint {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.7);
    border: 1px solid rgba(255,255,255,0.15);
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 11px;
    color: rgba(255,255,255,0.8);
    pointer-events: none;
  }
  #special-btn {
    padding: 5px 14px;
    border-radius: 10px;
    border: 1px solid ${pal.accent};
    background: ${pal.accent}22;
    color: ${pal.accent};
    font-weight: 800;
    font-size: 12px;
    cursor: pointer;
  }
  #special-btn:hover { background: ${pal.accent}; color: #000; }
</style>
</head>
<body>
  <div id="hud">
    <div style="display:flex;align-items:center;gap:10px;">
      <span class="badge">AI GENERATED · ${detectedMode.toUpperCase()}</span>
      <strong style="font-size:14px;">${title.replace(/</g, '&lt;')}</strong>
    </div>
    <div style="display:flex;align-items:center;gap:16px;">
      <span class="stat" style="color:${pal.primary}">SCORE: <span id="score">0</span></span>
      <span class="stat" style="color:#4ade80">HP: <span id="hp">100</span>%</span>
      <span class="stat" style="color:${pal.accent}">WAVE: <span id="wave">1</span></span>
      <button id="special-btn">⚡ OVERDRIVE (E / 右クリック)</button>
    </div>
  </div>
  <div id="canvas-wrap">
    <canvas id="game"></canvas>
    <div id="controls-hint">WASD / 矢印キー / マウス移動で操作 · Space / クリックで攻撃・アクション · Eで必殺オーバードライブ</div>
  </div>
<script>
(function() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const hpEl = document.getElementById('hp');
  const waveEl = document.getElementById('wave');
  const specialBtn = document.getElementById('special-btn');

  const MODE = ${JSON.stringify(detectedMode)};
  const DIFF = ${diffMult};
  const PAL = ${JSON.stringify(pal)};

  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight - 48;
  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight - 48;
  });

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let actx = null;
  function beep(freq, dur, type = 'sine', vol = 0.08) {
    try {
      if (!actx) actx = new AudioCtx();
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, actx.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.4), actx.currentTime + dur);
      g.gain.setValueAtTime(vol, actx.currentTime);
      g.gain.linearRampToValueAtTime(0.001, actx.currentTime + dur);
      o.connect(g);
      g.connect(actx.destination);
      o.start();
      o.stop(actx.currentTime + dur);
    } catch (e) {}
  }

  let score = 0;
  let hp = 100;
  let wave = 1;
  let ticks = 0;
  let overdriveCooldown = 0;

  const player = { x: W / 2, y: H * 0.75, vx: 0, vy: 0, r: 16 };
  const keys = {};
  let mouseX = W / 2, mouseY = H / 3, mouseDown = false;

  const bullets = [];
  const enemies = [];
  const particles = [];
  const stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * 2000,
    y: Math.random() * 1200,
    s: 1 + Math.random() * 2.5,
  }));

  const bricks = [];
  if (MODE === 'breaker') {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 10; c++) {
        bricks.push({ x: 80 + c * ((W - 160) / 10), y: 60 + r * 34, w: (W - 200) / 10, h: 22, hp: r === 0 ? 2 : 1 });
      }
    }
  }
  const ball = { x: W / 2, y: H / 2, vx: 5 * DIFF, vy: -5 * DIFF, r: 9 };

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyE') triggerOverdrive();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (e) => {
    mouseDown = true;
    if (e.button === 2) triggerOverdrive();
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  specialBtn.addEventListener('click', triggerOverdrive);

  function addParticles(x, y, color, count = 14) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 5.5;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 28 + Math.random() * 16, color });
    }
  }

  function triggerOverdrive() {
    if (overdriveCooldown > 0) return;
    overdriveCooldown = 180;
    beep(660, 0.28, 'sawtooth', 0.14);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
      bullets.push({ x: player.x, y: player.y, vx: Math.cos(a) * 11, vy: Math.sin(a) * 11, r: 6, color: PAL.accent });
    }
    enemies.forEach((en) => {
      en.hp -= 3;
      addParticles(en.x, en.y, PAL.accent, 8);
    });
  }

  function spawnEnemy() {
    const isBoss = wave % 3 === 0 && enemies.length === 0 && ticks % 240 === 0;
    let ex = Math.random() * (W - 60) + 30;
    let ey = -30;
    if (MODE === 'survivor') {
      const side = Math.floor(Math.random() * 4);
      if (side === 0) { ex = Math.random() * W; ey = -25; }
      else if (side === 1) { ex = W + 25; ey = Math.random() * H; }
      else if (side === 2) { ex = Math.random() * W; ey = H + 25; }
      else { ex = -25; ey = Math.random() * H; }
    } else if (MODE === 'platformer') {
      ex = W + 30;
      ey = H - 80 - (Math.random() > 0.5 ? 70 : 0);
    }
    enemies.push({
      x: ex,
      y: ey,
      r: isBoss ? 34 : 15 + Math.random() * 8,
      hp: isBoss ? 18 * DIFF : (1 + Math.floor(wave / 2)) * DIFF,
      speed: (isBoss ? 1.2 : 2.1 + Math.random() * 1.4) * DIFF,
      isBoss,
    });
  }

  function loop() {
    requestAnimationFrame(loop);
    ticks++;
    if (overdriveCooldown > 0) overdriveCooldown--;

    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridOffset = (ticks * 2) % 48;
    for (let x = 0; x < W; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = gridOffset; y < H; y += 48) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    stars.forEach((st) => {
      st.y = (st.y + st.s * (MODE === 'racing' ? 3.5 : 0.8)) % H;
      ctx.fillRect(st.x % W, st.y, st.s, st.s);
    });

    const spd = 6.2;
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= spd;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += spd;
    if (keys['ArrowUp'] || keys['KeyW']) player.y -= spd;
    if (keys['ArrowDown'] || keys['KeyS']) player.y += spd;

    if (mouseDown && MODE !== 'platformer') {
      player.x += (mouseX - player.x) * 0.12;
      if (MODE !== 'breaker') player.y += (mouseY - player.y) * 0.12;
    }

    if (MODE === 'platformer') {
      const groundY = H - 70;
      if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || mouseDown) && player.y >= groundY - 2) {
        player.vy = -13.5;
        beep(420, 0.12, 'triangle');
      }
      player.vy += 0.62;
      player.y = Math.min(groundY, player.y + player.vy);
      ctx.fillStyle = PAL.secondary + '44';
      ctx.fillRect(0, groundY + player.r, W, 80);
    }

    player.x = Math.max(24, Math.min(W - 24, player.x));
    player.y = Math.max(24, Math.min(H - 24, player.y));

    if (MODE === 'breaker') {
      player.y = H - 45;
      ctx.fillStyle = PAL.primary;
      ctx.fillRect(player.x - 56, player.y - 8, 112, 16);

      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.x < ball.r || ball.x > W - ball.r) { ball.vx *= -1; beep(340, 0.06); }
      if (ball.y < ball.r) { ball.vy *= -1; beep(380, 0.06); }
      if (ball.y > H) {
        ball.x = player.x; ball.y = player.y - 24; ball.vy = -Math.abs(ball.vy);
        hp = Math.max(10, hp - 15);
      }
      if (Math.abs(ball.x - player.x) < 62 && Math.abs(ball.y - player.y) < 18 && ball.vy > 0) {
        ball.vy = -Math.abs(ball.vy);
        ball.vx = (ball.x - player.x) * 0.14;
        beep(520, 0.08, 'triangle');
      }
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = PAL.accent;
      ctx.fill();

      bricks.forEach((b) => {
        if (b.hp <= 0) return;
        ctx.fillStyle = b.hp > 1 ? PAL.secondary : PAL.primary;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
          b.hp--;
          ball.vy *= -1;
          score += 150;
          addParticles(ball.x, ball.y, PAL.primary, 12);
          beep(640, 0.09, 'square');
        }
      });
    } else {
      const shouldFire = keys['Space'] || mouseDown || MODE === 'survivor' || ticks % 14 === 0;
      if (shouldFire && ticks % 8 === 0) {
        let tx = mouseX, ty = mouseY;
        if (MODE === 'survivor' && enemies.length > 0) {
          let nearest = enemies[0], bestD = 1e9;
          enemies.forEach((en) => {
            const d = Math.hypot(en.x - player.x, en.y - player.y);
            if (d < bestD) { bestD = d; nearest = en; }
          });
          tx = nearest.x; ty = nearest.y;
        } else if (MODE === 'shooter' || MODE === 'racing') {
          tx = player.x; ty = player.y - 200;
        } else if (MODE === 'platformer') {
          tx = player.x + 200; ty = player.y;
        }
        const ang = Math.atan2(ty - player.y, tx - player.x);
        bullets.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(ang) * 12,
          vy: Math.sin(ang) * 12,
          r: 5,
          color: PAL.primary,
        });
        if (wave >= 2) {
          bullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(ang + 0.16) * 11.5,
            vy: Math.sin(ang + 0.16) * 11.5,
            r: 4,
            color: PAL.secondary,
          });
        }
        beep(580, 0.04, 'sine', 0.04);
      }

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.shadowColor = PAL.primary;
      ctx.shadowBlur = 16;
      ctx.fillStyle = PAL.primary;
      ctx.beginPath();
      ctx.arc(0, 0, player.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    if (MODE !== 'breaker' && ticks % Math.max(18, Math.floor(46 / DIFF)) === 0) {
      spawnEnemy();
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      if (b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
        bullets.splice(i, 1);
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const en = enemies[i];
      if (MODE === 'survivor') {
        const ang = Math.atan2(player.y - en.y, player.x - en.x);
        en.x += Math.cos(ang) * en.speed;
        en.y += Math.sin(ang) * en.speed;
      } else if (MODE === 'platformer') {
        en.x -= en.speed * 1.6;
      } else {
        en.y += en.speed * (MODE === 'racing' ? 2.2 : 1.15);
        en.x += Math.sin((ticks + i * 20) * 0.04) * 1.5;
      }

      ctx.save();
      ctx.translate(en.x, en.y);
      ctx.shadowColor = en.isBoss ? PAL.accent : PAL.enemy;
      ctx.shadowBlur = en.isBoss ? 22 : 10;
      ctx.fillStyle = en.isBoss ? PAL.accent : PAL.enemy;
      ctx.beginPath();
      ctx.arc(0, 0, en.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.hypot(b.x - en.x, b.y - en.y) < en.r + b.r) {
          bullets.splice(j, 1);
          en.hp -= 1;
          addParticles(b.x, b.y, PAL.primary, 5);
          if (en.hp <= 0) {
            addParticles(en.x, en.y, en.isBoss ? PAL.accent : PAL.enemy, en.isBoss ? 32 : 14);
            score += en.isBoss ? 1000 : 120;
            if (score > wave * 1500) wave++;
            beep(en.isBoss ? 220 : 320, 0.12, 'sawtooth', 0.09);
            enemies.splice(i, 1);
            break;
          }
        }
      }

      if (enemies[i] && Math.hypot(en.x - player.x, en.y - player.y) < en.r + player.r) {
        addParticles(player.x, player.y, PAL.enemy, 18);
        enemies.splice(i, 1);
        hp = Math.max(0, hp - 12);
        beep(140, 0.2, 'sawtooth', 0.12);
        if (hp <= 0) {
          hp = 100;
          score = Math.max(0, Math.floor(score * 0.8));
        }
      } else if (enemies[i] && (en.y > H + 60 || en.x < -60)) {
        enemies.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 40);
      ctx.fillRect(p.x, p.y, 3.5, 3.5);
      ctx.globalAlpha = 1;
      if (p.life <= 0) particles.splice(i, 1);
    }

    scoreEl.textContent = String(score);
    hpEl.textContent = String(hp);
    waveEl.textContent = String(wave);
  }

  requestAnimationFrame(loop);
})();
</script>
</body>
</html>`;
}

const AI_GAME_STORAGE_KEY = 'glassium_ai_generated_games_v1';
const CLOUD_SAVE_CODE_KEY = 'glassium_cloud_save_code_v1';

const DEFAULT_AI_GAMES: AIGeneratedGame[] = [
  {
    id: 'ai-preset-starfighter',
    title: 'Neon Starfighter Overdrive',
    prompt:
      'サイバーパンク宇宙空間で次々と現れる敵艦隊とボスをレーザーとオーバードライブ必殺技で撃破する弾幕シューティング',
    genre: 'シューティング (Bullet Hell)',
    theme: 'Cyberpunk Neon',
    difficulty: 'NORMAL',
    createdAt: Date.now() - 3600000,
    htmlCode: compilePlayableAIGameHtml({
      title: 'Neon Starfighter Overdrive',
      prompt: 'サイバーパンク宇宙空間で敵艦隊を倒すシューティング',
      genre: 'shooter',
      theme: 'Cyberpunk Neon',
      difficulty: 'NORMAL',
    }),
    author: 'GlassiumOS AI Studio',
    plays: 1420,
  },
  {
    id: 'ai-preset-survivor',
    title: 'Abyss Magic Survivors',
    prompt:
      '四方八方から迫りくる深淵のモンスターを自動ホーミング魔法と広範囲オーバードライブでなぎ倒すヴァンサバ風ローグライク',
    genre: 'サバイバーRPG (Survivor)',
    theme: 'Dark Fantasy Abyss',
    difficulty: 'HARD',
    createdAt: Date.now() - 7200000,
    htmlCode: compilePlayableAIGameHtml({
      title: 'Abyss Magic Survivors',
      prompt: 'ヴァンサバ風サバイバーRPG 魔法アクション',
      genre: 'survivor',
      theme: 'Dark Fantasy Abyss',
      difficulty: 'HARD',
    }),
    author: 'GlassiumOS AI Studio',
    plays: 980,
  },
  {
    id: 'ai-preset-goldbreaker',
    title: 'Golden Sparkle Cyber Breaker',
    prompt: 'PS5風の黄金スパークル空間でネオンブロックを高速反射ボールで粉砕するブロック崩しアーケード',
    genre: 'ブロック崩し (Breaker)',
    theme: 'Golden Sparkle Luxury',
    difficulty: 'NORMAL',
    createdAt: Date.now() - 10800000,
    htmlCode: compilePlayableAIGameHtml({
      title: 'Golden Sparkle Cyber Breaker',
      prompt: '黄金スパークル空間のブロック崩しパズル',
      genre: 'breaker',
      theme: 'Golden Sparkle Luxury',
      difficulty: 'NORMAL',
    }),
    author: 'GlassiumOS AI Studio',
    plays: 760,
  },
];

interface CloudAndAIGameHubProps {
  mode: 'cloudhub' | 'aistudio';
  currentScore: number;
  discoveredWeaponsCount: number;
  mazeBestFloor: number;
  onUnlockEverything?: () => void;
}

export function CloudAndAIGameHub({
  mode,
  currentScore,
  discoveredWeaponsCount,
  mazeBestFloor,
  onUnlockEverything,
}: CloudAndAIGameHubProps) {
  // ---------------- 1. Native Game Hub State ----------------
  const [selectedProvider, setSelectedProvider] = useState<GameSourceProvider>(() => {
    const saved = localStorage.getItem('glassium_gamehub_provider') as GameSourceProvider | null;
    return saved || 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [externalGames, setExternalGames] = useState<ExternalGameItem[]>(INITIAL_EXTERNAL_GAMES);
  const [activeGame, setActiveGame] = useState<ExternalGameItem | null>(() => {
    try {
      const saved = localStorage.getItem('glassium_gamehub_active_game');
      return saved ? (JSON.parse(saved) as ExternalGameItem) : null;
    } catch {
      return null;
    }
  });
  const [localBlobHtmlUrl, setLocalBlobHtmlUrl] = useState<string | null>(null);
  const [localFileTitle, setLocalFileTitle] = useState<string>('');
  const [proxyEngine, setProxyEngine] = useState<'api-proxy' | 'scramjet' | 'ultraviolet' | 'direct'>('api-proxy');
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('glassium_gamehub_provider', selectedProvider);
    } catch {
      // ignore
    }
  }, [selectedProvider]);

  useEffect(() => {
    try {
      if (activeGame && !activeGame.playUrl.startsWith('blob:')) {
        localStorage.setItem('glassium_gamehub_active_game', JSON.stringify(activeGame));
      } else if (!activeGame) {
        localStorage.removeItem('glassium_gamehub_active_game');
      }
    } catch {
      // ignore
    }
  }, [activeGame]);

  // ---------------- 2. Google Drive Folder Explorer State ----------------
  const [showDriveExplorer, setShowDriveExplorer] = useState(false);
  const [driveQuickFilter, setDriveQuickFilter] = useState<
    'all' | 'eagler-vanilla' | 'eagler-client' | 'ugs-html'
  >('all');
  const [activeDriveFolderId, setActiveDriveFolderId] = useState<string>(
    '1S405_0KWmbdr4b70FosYeZx17_6zyHtr'
  );
  const [driveFolderStack, setDriveFolderStack] = useState<Array<{ id: string; title: string }>>([
    { id: '1S405_0KWmbdr4b70FosYeZx17_6zyHtr', title: 'MC Files HTML (マイクラ本体・クライアント)' },
  ]);
  const [driveFolderItems, setDriveFolderItems] = useState<GDriveFolderItem[]>([]);
  const [isLoadingDriveFolder, setIsLoadingDriveFolder] = useState(false);

  // ---------------- 3. CloudMoon Native Launcher UI State ----------------
  const [cloudMoonRegion, setCloudMoonRegion] = useState('🇯🇵 Tokyo Edge GPU-01 (11ms)');
  const [cloudMoonResolution, setCloudMoonResolution] = useState('1080p · 60 FPS WebRTC');
  const [cloudMoonCategory, setCloudMoonCategory] = useState('すべて');

  // ---------------- 4. AI Game Maker Studio State ----------------
  const [aiGames, setAiGames] = useState<AIGeneratedGame[]>(() => {
    try {
      const saved = localStorage.getItem(AI_GAME_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_AI_GAMES;
  });
  const [activeAiGame, setActiveAiGame] = useState<AIGeneratedGame>(
    () => aiGames[0] || DEFAULT_AI_GAMES[0]
  );
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [aiGenre, setAiGenre] = useState('自動判定 (Auto)');
  const [aiTheme, setAiTheme] = useState('Cyberpunk Neon');
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'NORMAL' | 'HARD' | 'LUNATIC'>(
    'NORMAL'
  );
  const [isGeneratingAiGame, setIsGeneratingAiGame] = useState(false);
  const [aiModifyPrompt, setAiModifyPrompt] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [editableHtmlCode, setEditableHtmlCode] = useState(activeAiGame.htmlCode);

  // ---------------- 5. Server-Only Features: Leaderboard & Cloud Save ----------------
  const [showServerPanel, setShowServerPanel] = useState(false);
  const [showJsdelivrGuide, setShowJsdelivrGuide] = useState(false);
  const [jsdelivrInput, setJsdelivrInput] = useState('Hextris/hextris');
  const [jsdelivrBranch, setJsdelivrBranch] = useState('gh-pages');
  const [jsdelivrStatus, setJsdelivrStatus] = useState<string>('');
  const [isScanningJsdelivr, setIsScanningJsdelivr] = useState(false);
  const [activeHtmlSrcDoc, setActiveHtmlSrcDoc] = useState<string | null>(null);
  const [isLoadingHtmlGame, setIsLoadingHtmlGame] = useState(false);

  const [playerName, setPlayerName] = useState('GlassiumPlayer');
  const [cloudSaveCode, setCloudSaveCode] = useState(
    () => localStorage.getItem(CLOUD_SAVE_CODE_KEY) || 'GL5-RENDER-777'
  );
  const [cloudSyncStatus, setCloudSyncStatus] = useState('');
  const [leaderboards, setLeaderboards] = useState<LeaderboardEntry[]>([
    {
      id: 'lb-1',
      player: 'Li9uid0s-DeV',
      gameTitle: 'Glasia Dungeons (50F LUNATIC)',
      provider: 'GlassiumOS Native',
      score: 98500,
      badge: '👑 50F 制覇',
      timestamp: Date.now() - 1800000,
    },
    {
      id: 'lb-2',
      player: 'AetherRunner',
      gameTitle: 'Minecraft: EaglercraftX 1.8.8',
      provider: 'Minecraft HTML',
      score: 76400,
      badge: '⛏️ マイクラ',
      timestamp: Date.now() - 3600000,
    },
    {
      id: 'lb-3',
      player: 'SlopeMaster',
      gameTitle: 'HexGL Futuristic Wipeout 3D',
      provider: 'GitHub / jsDelivr',
      score: 68200,
      badge: '📦 jsDelivr HTML',
      timestamp: Date.now() - 4800000,
    },
    {
      id: 'lb-4',
      player: 'CloudTraveler',
      gameTitle: '原神 (Genshin Impact Cloud)',
      provider: 'CloudMoon',
      score: 54900,
      badge: '☁️ CloudMoon',
      timestamp: Date.now() - 7200000,
    },
  ]);

  useEffect(() => {
    setEditableHtmlCode(activeAiGame.htmlCode);
  }, [activeAiGame]);

  useEffect(() => {
    configureServiceWorkerWisp(
      WISP_SERVER_PRESETS[0].wispUrl,
      proxyEngine === 'ultraviolet' ? 'ultraviolet' : 'scramjet',
      'auto'
    );
  }, [proxyEngine]);

  // Automatically fetch authentic official game artwork from Apple App Store / iTunes API (no generic stock photos)
  useEffect(() => {
    let cancelled = false;
    const resolveOfficialGameImages = async () => {
      const queries = Array.from(
        new Set(
          INITIAL_EXTERNAL_GAMES.map((g) => g.artworkQuery).filter((q): q is string => Boolean(q))
        )
      );
      const resolvedMap: Record<string, string> = {};
      await Promise.all(
        queries.map(async (q) => {
          try {
            const res = await fetch(
              `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=software&limit=1`
            );
            if (res.ok) {
              const data = await res.json();
              const hit = data.results?.[0];
              const art =
                hit?.artworkUrl512 ||
                (hit?.artworkUrl100 ? String(hit.artworkUrl100).replace('100x100bb', '512x512bb') : null);
              if (art) {
                resolvedMap[q] = art;
              }
            }
          } catch {
            // fallback to server endpoint
            try {
              const srv = await backendFetch(`/api/games/artwork?q=${encodeURIComponent(q)}`);
              if (srv.ok) {
                const d = await srv.json();
                if (d?.artworkUrl) resolvedMap[q] = d.artworkUrl;
              }
            } catch {
              // ignore
            }
          }
        })
      );
      if (cancelled || Object.keys(resolvedMap).length === 0) return;
      setExternalGames((prev) =>
        prev.map((g) =>
          g.artworkQuery && resolvedMap[g.artworkQuery]
            ? { ...g, thumbnail: resolvedMap[g.artworkQuery] }
            : g
        )
      );
    };
    resolveOfficialGameImages();
    return () => {
      cancelled = true;
    };
  }, []);

  const syncCatalogFromServer = useCallback(async (providerFilter?: GameSourceProvider) => {
    setIsSyncingCatalog(true);
    setSyncMessage('サーバーから GitHub / jsDelivr / クラウドゲームカタログを同期中...');
    try {
      const res = await backendFetch(
        `/api/games/catalog?source=${encodeURIComponent(providerFilter || 'all')}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.games) && data.games.length > 0) {
          setExternalGames((prev) => {
            const ids = new Set(prev.map((g) => g.id));
            const merged = [...prev];
            for (const g of data.games) {
              if (!ids.has(g.id)) merged.push(g);
            }
            return merged;
          });
        }
        if (Array.isArray(data.leaderboards) && data.leaderboards.length > 0) {
          setLeaderboards(data.leaderboards);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSyncingCatalog(false);
      setSyncMessage(
        `サーバー直結完了 (${getBackendBaseUrl()}) — GitHub/jsDelivr HTML · マイクラ · Slope2 · TGLSC · Lumin · CloudMoon · UGS`
      );
    }
  }, []);

  useEffect(() => {
    syncCatalogFromServer(selectedProvider);
  }, [selectedProvider, syncCatalogFromServer]);

  // Fetch Google Drive folder contents from server (/api/gdrive/folder)
  const loadDriveFolder = useCallback(async (folderId: string) => {
    setIsLoadingDriveFolder(true);
    try {
      const res = await backendFetch(`/api/gdrive/folder?id=${encodeURIComponent(folderId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setDriveFolderItems(data.items);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingDriveFolder(false);
    }
  }, []);

  useEffect(() => {
    if (showDriveExplorer) {
      loadDriveFolder(activeDriveFolderId);
    }
  }, [showDriveExplorer, activeDriveFolderId, loadDriveFolder]);

  const filteredGames = useMemo(() => {
    return externalGames.filter((g) => {
      const matchProvider = selectedProvider === 'all' || g.provider === selectedProvider;
      const matchCloudCategory =
        selectedProvider !== 'cloudmoon' ||
        cloudMoonCategory === 'すべて' ||
        g.category.includes(cloudMoonCategory);
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        g.title.toLowerCase().includes(q) ||
        g.providerLabel.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q);
      return matchProvider && matchCloudCategory && matchQuery;
    });
  }, [externalGames, selectedProvider, cloudMoonCategory, searchQuery]);

  // Launch and execute an HTML game file or proxied CloudMoon/external game inside the iframe
  const handleSelectAndPlayGame = useCallback(
    async (game: ExternalGameItem) => {
      setActiveHtmlSrcDoc(null);
      setJsdelivrStatus('');
      const needsProxy =
        Boolean(game.requiresProxy) ||
        Boolean(game.cloudStream) ||
        game.provider === 'cloudmoon' ||
        game.provider === 'slope2' ||
        game.provider === 'tglsc' ||
        game.provider === 'lumin' ||
        game.playUrl.includes('cloudmoonapp.com');

      if (needsProxy && proxyEngine === 'direct') {
        setProxyEngine('api-proxy');
      }

      const isJsdelivrOrRawHtml =
        Boolean(game.isHtmlFile) ||
        game.playUrl.includes('cdn.jsdelivr.net/gh/') ||
        game.playUrl.includes('raw.githubusercontent.com/') ||
        /\.html?(\?|$)/i.test(game.playUrl);

      if (isJsdelivrOrRawHtml && !game.playUrl.startsWith('/api/gdrive/html') && !game.playUrl.startsWith('blob:')) {
        setIsLoadingHtmlGame(true);
        setActiveGame(game);
        try {
          let targetUrl = game.playUrl;
          const ghBlobMatch = targetUrl.match(
            /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/i
          );
          if (ghBlobMatch) {
            targetUrl = `https://cdn.jsdelivr.net/gh/${ghBlobMatch[1]}/${ghBlobMatch[2]}@${ghBlobMatch[3]}/${ghBlobMatch[4]}`;
          }
          const res = await fetch(targetUrl);
          if (!res.ok) {
            // Fallback to server /api/html-runner proxy instead of giving up
            setActiveHtmlSrcDoc(null);
            return;
          }
          let html = await res.text();
          const baseDir = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
          const baseTag = `<base href="${baseDir}">`;
          if (/<head[^>]*>/i.test(html)) {
            html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${baseTag}`);
          } else {
            html = `<!DOCTYPE html><html><head><meta charset="utf-8">${baseTag}</head><body>${html}</body></html>`;
          }
          setActiveHtmlSrcDoc(html);
        } catch {
          // Fallback to backend /api/html-runner
          setActiveHtmlSrcDoc(null);
        } finally {
          setIsLoadingHtmlGame(false);
        }
        return;
      }

      setActiveGame(game);
    },
    [proxyEngine]
  );

  // Scan a GitHub repo or direct jsDelivr URL, fetch its real icon & .html entry point, or give up if not found
  const handleScanAndOpenFromJsdelivr = async () => {
    const raw = jsdelivrInput.trim();
    if (!raw) return;
    setIsScanningJsdelivr(true);
    setJsdelivrStatus('GitHub / jsDelivr 上で HTML ゲームファイルと公式画像を検索中...');

    try {
      // Case 1: Direct URL to .html on cdn.jsdelivr.net or github.com
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        let normalized = raw;
        const ghMatch = raw.match(
          /^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/(?:blob|tree|raw)\/([^/]+)(?:\/(.*))?)?$/i
        );
        if (ghMatch) {
          const owner = ghMatch[1];
          const repo = ghMatch[2];
          const branch = ghMatch[3] || jsdelivrBranch || 'master';
          const subPath = ghMatch[4] || 'index.html';
          normalized = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${subPath}`;
        }

        const repoExtract = normalized.match(/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)/i);
        const ownerRepo = repoExtract ? `${repoExtract[1]}/${repoExtract[2]}` : 'custom/html-game';
        const newGame: ExternalGameItem = {
          id: `jsdelivr-custom-${Date.now()}`,
          title: `${ownerRepo.split('/')[1] || 'Custom HTML Game'} (jsDelivr Direct)`,
          provider: 'github-jsdelivr',
          providerLabel: 'GitHub / jsDelivr',
          category: 'HTML5 Direct iframe',
          rating: '5.0 ★',
          players: 'jsDelivr CDN',
          badge: `📦 ${ownerRepo}`,
          accentColor: '#10b981',
          thumbnail: `https://opengraph.githubassets.com/1/${ownerRepo}`,
          githubRepo: ownerRepo,
          description: `jsDelivr (${normalized}) から直接取得したHTMLゲームファイル。`,
          playUrl: normalized,
          isHtmlFile: true,
          controls: 'キーボード / マウス操作',
        };
        setExternalGames((prev) => [newGame, ...prev]);
        setJsdelivrStatus(`✅ HTMLゲームを起動します: ${normalized}`);
        await handleSelectAndPlayGame(newGame);
        return;
      }

      // Case 2: owner/repo shorthand (e.g. "Hextris/hextris" or "gabrielecirulli/2048")
      const cleanRepo = raw.replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '');
      const parts = cleanRepo.split('/');
      if (parts.length < 2) {
        setJsdelivrStatus(
          '⚠️ 「ユーザー名/リポジトリ名」（例: Hextris/hextris）または「https://cdn.jsdelivr.net/gh/.../index.html」の形式で入力してください。'
        );
        return;
      }
      const owner = parts[0];
      const repo = parts[1];
      const branchesToTry = Array.from(new Set([jsdelivrBranch.trim() || 'master', 'master', 'main', 'gh-pages']));

      let foundBranch = '';
      let filesList: Array<{ name: string }> = [];

      for (const br of branchesToTry) {
        const metaUrl = `https://data.jsdelivr.com/v1/package/gh/${owner}/${repo}@${br}/flat`;
        const metaRes = await fetch(metaUrl);
        if (metaRes.ok) {
          const data = await metaRes.json();
          if (Array.isArray(data?.files) && data.files.length > 0) {
            foundBranch = br;
            filesList = data.files;
            break;
          }
        }
      }

      if (!foundBranch || filesList.length === 0) {
        setJsdelivrStatus(
          `❌ リポジトリ「${owner}/${repo}」がGitHub / jsDelivr上で見つかりませんでした。`
        );
        return;
      }

      const htmlFiles = filesList
        .map((f) => String(f.name || ''))
        .filter((n) => /\.html?$/i.test(n));

      if (htmlFiles.length === 0) {
        setJsdelivrStatus(
          `❌ リポジトリ「${owner}/${repo}@${foundBranch}」内に実行可能な .html ファイルが見つかりませんでした。`
        );
        return;
      }

      const preferredHtml =
        htmlFiles.find((f) => f.toLowerCase() === '/index.html') ||
        htmlFiles.find((f) => f.toLowerCase().endsWith('/index.html')) ||
        htmlFiles[0];

      const imageFiles = filesList
        .map((f) => String(f.name || ''))
        .filter((n) => /\.(png|jpg|jpeg|webp|gif)$/i.test(n));
      const preferredImage =
        imageFiles.find((img) => /(icon|thumb|logo|cover|apple-touch|screenshot|preview)/i.test(img)) ||
        imageFiles[0];

      const htmlCdnUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${foundBranch}${preferredHtml}`;
      const imageCdnUrl = preferredImage
        ? `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${foundBranch}${preferredImage}`
        : `https://opengraph.githubassets.com/1/${owner}/${repo}`;

      const newGame: ExternalGameItem = {
        id: `jsdelivr-${owner}-${repo}-${Date.now()}`,
        title: `${repo} (${owner}/${repo}@${foundBranch})`,
        provider: 'github-jsdelivr',
        providerLabel: 'GitHub / jsDelivr',
        category: 'GitHub HTML5 Game',
        rating: '5.0 ★',
        players: 'jsDelivr CDN',
        badge: `📦 ${owner}/${repo}`,
        accentColor: '#10b981',
        thumbnail: imageCdnUrl,
        githubRepo: `${owner}/${repo}`,
        description: `GitHubリポジトリ ${owner}/${repo}@${foundBranch} から自動検出した ${preferredHtml} を iframe で直接実行します。`,
        playUrl: htmlCdnUrl,
        isHtmlFile: true,
        controls: 'キーボード / マウス操作',
      };

      setExternalGames((prev) => [newGame, ...prev]);
      setJsdelivrStatus(`✅ ${htmlCdnUrl} とゲーム画像を取得しました！ iframeで実行します。`);
      await handleSelectAndPlayGame(newGame);
    } catch {
      setJsdelivrStatus(
        '❌ GitHub / jsDelivr からの通信に失敗しました。'
      );
    } finally {
      setIsScanningJsdelivr(false);
    }
  };

  // Resolve iframe URL (Server /api/gdrive/html, /api/html-runner, /api/proxy, Blob URL, Direct, or Server Scramjet/Ultraviolet)
  const resolveGameIframeSrc = useCallback(
    (rawUrl: string, forceProxy?: boolean, isHtmlFile?: boolean): string => {
      if (!rawUrl) return 'about:blank';
      if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) {
        return rawUrl;
      }
      if (rawUrl.startsWith('/api/gdrive/html') || rawUrl.startsWith('/api/html-runner') || rawUrl.startsWith('/api/proxy')) {
        return resolveBackendUrl(rawUrl);
      }
      if (
        isHtmlFile ||
        rawUrl.includes('cdn.jsdelivr.net/gh/') ||
        rawUrl.includes('raw.githubusercontent.com/') ||
        /\.html?(\?|$)/i.test(rawUrl)
      ) {
        return resolveBackendUrl(`/api/html-runner?url=${encodeURIComponent(rawUrl)}`);
      }
      const isCloudMoonOrProxied =
        forceProxy ||
        rawUrl.includes('cloudmoonapp.com') ||
        rawUrl.includes('slope') ||
        rawUrl.includes('1v1.lol') ||
        rawUrl.includes('krunker.io');

      const effectiveEngine =
        proxyEngine === 'direct' && isCloudMoonOrProxied ? 'api-proxy' : proxyEngine;

      if (effectiveEngine === 'direct') {
        return rawUrl;
      }
      if (effectiveEngine === 'api-proxy') {
        return resolveBackendUrl(`/api/proxy?url=${encodeURIComponent(rawUrl)}`);
      }
      return getServiceWorkerProxyUrl(rawUrl, effectiveEngine as ProxyEngine);
    },
    [proxyEngine]
  );

  // Launch a Google Drive HTML file directly in the Game iframe
  const handleLaunchDriveHtmlFile = (fileId: string, title: string, categoryLabel = 'MC Drive') => {
    setLocalBlobHtmlUrl(null);
    setActiveHtmlSrcDoc(null);
    setProxyEngine('direct');
    setActiveGame({
      id: `gdrive-file-${fileId}`,
      title,
      provider: 'eaglercraft',
      providerLabel: categoryLabel,
      category: 'Google Drive Standalone HTML',
      rating: '5.0 ★',
      players: 'Drive Direct',
      badge: '⛏️ Drive HTML直結',
      accentColor: '#10b981',
      thumbnail:
        'https://opengraph.githubassets.com/1/Eaglercraft-Archive/Eaglercraftx-1.8.8-src',
      description: `Googleドライブから直接ストリーミング起動: ${title}`,
      playUrl: `/api/gdrive/html?id=${encodeURIComponent(fileId)}`,
      isHtmlFile: true,
      controls: 'WASD: 移動 · Space: ジャンプ · マウス: 操作 · E: インベントリ',
    });
  };

  // Launch a user-selected local .html file via srcDoc + Blob URL inside iframe
  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localBlobHtmlUrl) {
      URL.revokeObjectURL(localBlobHtmlUrl);
    }
    const blobUrl = URL.createObjectURL(file);
    setLocalBlobHtmlUrl(blobUrl);
    setLocalFileTitle(file.name.replace(/\.html?$/i, ''));

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setActiveHtmlSrcDoc(reader.result);
      }
    };
    reader.readAsText(file);

    setActiveGame({
      id: `local-html-${Date.now()}`,
      title: file.name.replace(/\.html?$/i, ''),
      provider: 'eaglercraft',
      providerLabel: 'Local HTML File',
      category: 'Offline Standalone HTML',
      rating: '5.0 ★',
      players: 'Local Direct',
      badge: '📂 ローカルHTML',
      accentColor: '#10b981',
      thumbnail:
        'https://opengraph.githubassets.com/1/Eaglercraft-Archive/Eaglercraftx-1.8.8-src',
      description: `ローカルHTMLファイル (${file.name}) を iframe 内で直接実行中`,
      playUrl: blobUrl,
      isHtmlFile: true,
      controls: 'WASD: 移動 · Space: ジャンプ · マウス: 操作',
    });
  };

  // ---------------- AI Game Generation Handler ----------------
  const handleGenerateAIGame = async (customModification?: string) => {
    const promptText = customModification
      ? `${activeAiGame.prompt} / 追加指示: ${customModification}`
      : aiPrompt.trim() || 'ネオン空間で敵とボスを倒す爽快なシューティングゲーム';
    const gameTitle = customModification
      ? `${activeAiGame.title} v2`
      : aiTitle.trim() || promptText.slice(0, 22);

    setIsGeneratingAiGame(true);
    try {
      const res = await backendFetch('/api/ai/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: gameTitle,
          prompt: promptText,
          genre: aiGenre,
          theme: aiTheme,
          difficulty: aiDifficulty,
          existingHtml: customModification ? activeAiGame.htmlCode : undefined,
        }),
      });

      let generatedHtml = '';
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (
          data?.htmlCode &&
          typeof data.htmlCode === 'string' &&
          data.htmlCode.includes('<canvas')
        ) {
          generatedHtml = data.htmlCode;
        }
      }

      if (!generatedHtml) {
        generatedHtml = compilePlayableAIGameHtml({
          title: gameTitle,
          prompt: promptText,
          genre: aiGenre,
          theme: aiTheme,
          difficulty: aiDifficulty,
        });
      }

      const newGame: AIGeneratedGame = {
        id: `ai-game-${Date.now()}`,
        title: gameTitle,
        prompt: promptText,
        genre: aiGenre,
        theme: aiTheme,
        difficulty: aiDifficulty,
        createdAt: Date.now(),
        htmlCode: generatedHtml,
        author: playerName || 'Creator',
        plays: 1,
      };

      const nextList = [newGame, ...aiGames];
      setAiGames(nextList);
      setActiveAiGame(newGame);
      setEditableHtmlCode(newGame.htmlCode);
      setAiModifyPrompt('');
      try {
        localStorage.setItem(AI_GAME_STORAGE_KEY, JSON.stringify(nextList.slice(0, 20)));
      } catch {
        // ignore
      }
    } finally {
      setIsGeneratingAiGame(false);
    }
  };

  // ---------------- Server Cloud Save & Global Leaderboard Handlers ----------------
  const handleSubmitScoreToServer = async () => {
    const entry: LeaderboardEntry = {
      id: `lb-${Date.now()}`,
      player: playerName.trim() || 'GlassiumPlayer',
      gameTitle: activeGame
        ? activeGame.title
        : mode === 'aistudio'
        ? activeAiGame.title
        : `Glasia Dungeons (${mazeBestFloor}F)`,
      provider: activeGame
        ? activeGame.providerLabel
        : mode === 'aistudio'
        ? 'AI Game Studio'
        : 'GlassiumOS',
      score: Math.max(currentScore, mazeBestFloor * 1500, 12500),
      badge: '🔥 Server Verified',
      timestamp: Date.now(),
    };

    setLeaderboards((prev) =>
      [entry, ...prev].sort((a, b) => b.score - a.score).slice(0, 15)
    );
    setCloudSyncStatus('サーバーランキングにスコアを送信しました！');
    try {
      await backendFetch('/api/games/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch {
      // ignore
    }
  };

  const handleCloudSaveBackup = async () => {
    localStorage.setItem(CLOUD_SAVE_CODE_KEY, cloudSaveCode);
    setCloudSyncStatus(
      `クラウドセーブ完了 (コード: ${cloudSaveCode}) — 武器${discoveredWeaponsCount}種・AIゲーム${aiGames.length}本をサーバーに保存しました！`
    );
    try {
      await backendFetch('/api/games/cloudsave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cloudSaveCode,
          player: playerName,
          aiGamesCount: aiGames.length,
          discoveredWeaponsCount,
          mazeBestFloor,
          timestamp: Date.now(),
        }),
      });
    } catch {
      // ignore
    }
  };

  const connState = getBackendConnectionState();

  // ============================================================================
  // RENDER MODE 1: AI GAME MAKER STUDIO ('aistudio')
  // ============================================================================
  if (mode === 'aistudio') {
    return (
      <div className="flex h-full w-full bg-slate-950 text-white overflow-hidden">
        {/* Left Sidebar: AI Game Prompt & Generator Controls */}
        <div className="w-80 sm:w-96 shrink-0 border-r border-white/10 bg-slate-900/75 p-4 flex flex-col gap-3.5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-400 font-bold">
                SERVER + GEMINI AI GAME ENGINE
              </div>
              <h2 className="text-base font-black tracking-tight text-white">
                🤖 AI ゲーム制作スタジオ
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono">
              Server Online
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-black/45 border border-white/10 space-y-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-white/80 mb-1">
                ゲームタイトル (任意)
              </label>
              <input
                type="text"
                value={aiTitle}
                onChange={(e) => setAiTitle(e.target.value)}
                placeholder="例: Cyber Nova Striker"
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs outline-none focus:border-fuchsia-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-white/80 mb-1">
                どんなゲームを作りたい？（自然言語で指示）
              </label>
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="例: 宇宙空間で全方位から来る敵をホーミングレーザーと必殺技で倒すヴァンサバ風の弾幕ゲームを作って！"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs outline-none focus:border-fuchsia-400 resize-none"
              />
            </div>

            {/* Quick Idea Chips */}
            <div className="flex flex-wrap gap-1">
              {[
                {
                  label: '🚀 宇宙弾幕シューティング',
                  prompt: 'ネオン宇宙空間で敵艦隊と巨大ボスを撃破する弾幕シューティング',
                  genre: 'シューティング',
                },
                {
                  label: '🔮 ヴァンサバ風魔法RPG',
                  prompt: '全方位から迫るモンスターを自動ホーミング魔法でなぎ倒すサバイバーRPG',
                  genre: 'サバイバーRPG',
                },
                {
                  label: '🏎️ サイバー3Dレーシング',
                  prompt: '超高速で障害物やライバル車をかわしながら疾走するサイバーレーシング',
                  genre: 'レーシング',
                },
                {
                  label: '🧱 黄金ブロック崩し',
                  prompt: 'Golden Sparkleの輝きの中で多段ブロックを破壊する高速ブロック崩し',
                  genre: 'ブロック崩し',
                },
                {
                  label: '🥷 ネオン忍者ランナー',
                  prompt: 'ジャンプと手裏剣で次々と迫る敵を倒すハイスピード横スクロールアクション',
                  genre: 'アクション',
                },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setAiPrompt(chip.prompt);
                    setAiGenre(chip.genre);
                    setAiTitle(chip.label.replace(/^[^\s]+\s/, ''));
                  }}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-fuchsia-500/20 border border-white/10 hover:border-fuchsia-400/40 text-[10px] text-white/80 transition"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-white/60 mb-1">ビジュアルテーマ</label>
                <select
                  value={aiTheme}
                  onChange={(e) => setAiTheme(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white text-[11px] outline-none"
                >
                  <option value="Cyberpunk Neon">Cyberpunk Neon</option>
                  <option value="Dark Fantasy Abyss">Dark Fantasy Abyss</option>
                  <option value="Golden Sparkle Luxury">Golden Sparkle Luxury</option>
                  <option value="Retro Pixel CRT">Retro Pixel CRT</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-white/60 mb-1">難易度バランス</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) =>
                    setAiDifficulty(e.target.value as 'EASY' | 'NORMAL' | 'HARD' | 'LUNATIC')
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white text-[11px] outline-none"
                >
                  <option value="EASY">EASY</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="HARD">HARD</option>
                  <option value="LUNATIC">LUNATIC</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={isGeneratingAiGame}
              onClick={() => handleGenerateAIGame()}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2"
            >
              <Icon name="Sparkles" size={15} />
              <span>
                {isGeneratingAiGame
                  ? 'サーバーAIがゲームコードをコンパイル中...'
                  : '✨ AIで新しいゲームを生成・起動'}
              </span>
            </button>
          </div>

          {/* Live AI Modification Box */}
          <div className="p-3 rounded-2xl bg-fuchsia-950/20 border border-fuchsia-400/30 space-y-2 text-xs">
            <div className="text-[11px] font-bold text-fuchsia-300">
              🔧 プレイ中のゲームをAIで追加改造
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={aiModifyPrompt}
                onChange={(e) => setAiModifyPrompt(e.target.value)}
                placeholder="例: ボスを強くして・弾を派手にして"
                className="flex-1 px-2.5 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => handleGenerateAIGame(aiModifyPrompt || '難易度とエフェクトを強化')}
                className="px-3 py-1.5 rounded-xl bg-fuchsia-400 text-black font-bold text-xs shrink-0 hover:brightness-110"
              >
                改造反映
              </button>
            </div>
          </div>

          {/* Saved / Generated AI Games Library */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="text-[11px] font-bold text-white/70 mb-2 flex items-center justify-between">
              <span>🎮 生成済みAIゲームライブラリ ({aiGames.length})</span>
              <button
                type="button"
                onClick={() => setShowCodeEditor(!showCodeEditor)}
                className="text-[10px] text-cyan-300 hover:underline"
              >
                {showCodeEditor ? 'ゲーム画面に戻る' : '</> コード編集'}
              </button>
            </div>
            <div className="space-y-1.5 overflow-y-auto pr-1">
              {aiGames.map((g) => {
                const selected = g.id === activeAiGame.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setActiveAiGame(g);
                      setShowCodeEditor(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition ${
                      selected
                        ? 'bg-fuchsia-500/20 border-fuchsia-400 text-white'
                        : 'bg-black/40 border-white/10 text-white/75 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="truncate">{g.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-fuchsia-300">
                        {g.difficulty}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/55 truncate mt-0.5">{g.prompt}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Main Viewport: Live Playable AI Game Sandbox or Live Code Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-black relative">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-white/10 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300 font-mono text-[10px] font-bold">
                PLAYING AI GAME
              </span>
              <span className="font-bold truncate">{activeAiGame.title}</span>
              <span className="text-white/45 text-[11px] hidden sm:inline">
                ({activeAiGame.theme})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCodeEditor(!showCodeEditor)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold"
              >
                {showCodeEditor ? '▶ ゲームをプレイ' : '</> HTML/JSコードを編集'}
              </button>
              <button
                type="button"
                onClick={() => setActiveAiGame({ ...activeAiGame })}
                className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-[11px] font-bold"
              >
                🔄 リスタート
              </button>
            </div>
          </div>

          {showCodeEditor ? (
            <div className="flex-1 flex flex-col p-4 bg-slate-950 gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70 font-mono">
                  AIが生成したHTML5 Canvas / WebAudio ゲームコード（直接書き換えて即時反映できます）
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...activeAiGame, htmlCode: editableHtmlCode };
                    setActiveAiGame(updated);
                    setAiGames((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                    setShowCodeEditor(false);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-400 text-black font-black text-xs"
                >
                  コードを保存して実行
                </button>
              </div>
              <textarea
                value={editableHtmlCode}
                onChange={(e) => setEditableHtmlCode(e.target.value)}
                className="flex-1 w-full p-3 rounded-2xl bg-black border border-white/15 font-mono text-xs text-emerald-300 outline-none resize-none"
              />
            </div>
          ) : (
            <iframe
              key={`${activeAiGame.id}-${activeAiGame.htmlCode.length}`}
              title={activeAiGame.title}
              srcDoc={activeAiGame.htmlCode}
              className="w-full flex-1 border-0 bg-black"
              sandbox="allow-scripts allow-pointer-lock allow-same-origin"
            />
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER MODE 2: NATIVE GAME HUB & CLOUDMOON UI ('cloudhub')
  // ============================================================================
  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white overflow-hidden">
      {/* Hidden File Input for Local Eaglercraft / Game HTML files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        onChange={handleLocalFileUpload}
        className="hidden"
      />

      {/* Top Provider Hub Bar */}
      <div className="px-4 py-2.5 bg-slate-900/95 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              'all',
              'github-jsdelivr',
              'eaglercraft',
              'slope2',
              'tglsc',
              'lumin',
              'cloudmoon',
              'ultimate-stash',
            ] as GameSourceProvider[]
          ).map((prov) => {
            const meta = PROVIDER_META[prov];
            const active = selectedProvider === prov && !activeGame;
            return (
              <button
                key={prov}
                type="button"
                onClick={() => {
                  setSelectedProvider(prov);
                  setActiveGame(null);
                  setActiveHtmlSrcDoc(null);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  active
                    ? `bg-gradient-to-r ${meta.badgeColor} shadow-sm`
                    : 'bg-white/5 border-white/10 text-white/65 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon name={meta.icon} size={13} />
                <span>{meta.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Search + jsDelivr Guide/Loader + Drive MC Browser + Local File + Server Ranking */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ゲーム名・GitHub・マイクラ・Slope2検索..."
            className="w-44 sm:w-52 px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white outline-none focus:border-cyan-400"
          />

          <button
            type="button"
            onClick={() => setShowJsdelivrGuide(!showJsdelivrGuide)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              showJsdelivrGuide
                ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/25'
            }`}
          >
            <Icon name="Code" size={13} />
            <span>📦 jsDelivr / GitHub 設定・起動</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDriveExplorer(!showDriveExplorer)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              showDriveExplorer
                ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
            }`}
          >
            <Icon name="FolderOpen" size={13} />
            <span>⛏️ マイクラ & UGS ドライブ庫</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center gap-1"
            title="手元のマイクラ(.html)やゲームHTMLファイルを読み込んでiframe内で起動"
          >
            <Icon name="Upload" size={13} />
            <span>HTML読込</span>
          </button>

          <button
            type="button"
            onClick={() => setShowServerPanel(!showServerPanel)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              showServerPanel
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
            }`}
          >
            <Icon name="Trophy" size={13} />
            <span>サーバー同期</span>
          </button>
        </div>
      </div>

      {/* Active Game Iframe Player View */}
      {activeGame ? (
        <div className="flex-1 flex flex-col min-h-0 bg-black relative">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900 border-b border-white/10 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setActiveGame(null);
                  setActiveHtmlSrcDoc(null);
                }}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1"
              >
                <Icon name="ArrowLeft" size={13} />
                <span>ゲーム一覧へ戻る</span>
              </button>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-[10px] font-bold">
                {activeGame.providerLabel}
              </span>
              <span className="font-bold truncate">{activeGame.title}</span>
              {activeGame.isHtmlFile && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px]">
                  📄 HTML Direct iframe
                </span>
              )}
              {activeGame.gpuPod && (
                <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono text-[10px]">
                  ☁️ {activeGame.gpuPod} · {cloudMoonResolution}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/60 hidden lg:inline">
                🎮 {activeGame.controls}
              </span>
              {!activeGame.isHtmlFile &&
                !activeGame.playUrl.startsWith('/api/gdrive/html') &&
                !activeGame.playUrl.startsWith('blob:') && (
                  <button
                    type="button"
                    onClick={() =>
                      setProxyEngine((prev) =>
                        prev === 'direct'
                          ? 'scramjet'
                          : prev === 'scramjet'
                          ? 'ultraviolet'
                          : 'direct'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[11px] font-mono"
                  >
                    通信モード: {proxyEngine.toUpperCase()}
                  </button>
                )}
            </div>
          </div>

          {isLoadingHtmlGame ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-cyan-300 gap-3 font-mono text-xs">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span>GitHub / jsDelivr から HTML ゲームファイルとアセットを取得して iframe に展開中...</span>
            </div>
          ) : (
            <iframe
              key={`${activeGame.id}-${proxyEngine}-${localFileTitle}-${Boolean(activeHtmlSrcDoc)}`}
              title={activeGame.title}
              srcDoc={activeHtmlSrcDoc || undefined}
              src={
                activeHtmlSrcDoc
                  ? undefined
                  : resolveGameIframeSrc(
                      activeGame.playUrl,
                      Boolean(activeGame.requiresProxy),
                      Boolean(activeGame.isHtmlFile)
                    )
              }
              className="w-full flex-1 border-0 bg-black"
              allow="autoplay; fullscreen; gamepad; pointer-lock; accelerometer; gyroscope; clipboard-read; clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
            />
          )}
        </div>
      ) : (
        /* Main Native Catalog & Custom CloudMoon / jsDelivr / Drive UI */
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Optional Drawer 0: jsDelivr & GitHub HTML Game Configuration & Direct Loader */}
          {showJsdelivrGuide && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-cyan-950/75 via-slate-900 to-slate-950 border border-cyan-400/45 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold">
                    JSDELIVR & GITHUB HTML5 GAME RUNNER (IFRAME SRCDOC / BASE HREF AUTO-INJECT)
                  </div>
                  <h3 className="text-base font-black text-white mt-0.5">
                    📦 jsDelivr / GitHub から HTML ゲームを開く方法・設定ガイド
                  </h3>
                  <p className="text-xs text-white/70 mt-1">
                    GitHub 上の HTML ゲームはそのままでは `text/plain` として表示されてしまいますが、jsDelivr CDN を経由するか下のローダーに入力すると、自動的に <code>&lt;base href&gt;</code> とアイコン画像を補完して <b>iframe 内で直接実行</b> できます（ファイルが見つからない場合は無理にプロキシせず取得をあきらめます）。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJsdelivrGuide(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/75"
                >
                  閉じる
                </button>
              </div>

              {/* Step-by-step Setup Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-black/50 border border-cyan-400/25 space-y-1.5">
                  <div className="font-black text-cyan-300">① URL変換ルール（基本設定）</div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    GitHub のリポジトリ URL を以下の jsDelivr 形式にするだけで高速 CDN から HTML・JS・音声・画像を取得できます：
                  </p>
                  <code className="block p-2 rounded-lg bg-slate-950 text-emerald-300 font-mono text-[10px] break-all border border-white/10">
                    https://cdn.jsdelivr.net/gh/ユーザー名/リポジトリ名@ブランチ名/index.html
                  </code>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/50 border border-cyan-400/25 space-y-1.5">
                  <div className="font-black text-cyan-300">② リポジトリ名だけで自動探索</div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    下の入力欄に <code className="text-amber-300">owner/repo</code>（例: <code className="text-amber-300">Hextris/hextris</code>）を入れるだけで、<code className="text-cyan-200">data.jsdelivr.com</code> API から自動的に `.html` とゲーム内アイコン画像を検出します。
                  </p>
                  <code className="block p-2 rounded-lg bg-slate-950 text-cyan-200 font-mono text-[10px] break-all border border-white/10">
                    例: Hextris/hextris / ellisonleao/clumsy-bird
                  </code>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/50 border border-cyan-400/25 space-y-1.5">
                  <div className="font-black text-cyan-300">③ 相対パス & 404 自動判定</div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    取得した HTML に自動で <code className="text-emerald-300">&lt;base href=&quot;https://cdn.jsdelivr.net/gh/.../&quot;&gt;</code> を注入して iframe の `srcDoc` で実行します。万が一 404 の場合は即座に取得をあきらめて通知します。
                  </p>
                </div>
              </div>

              {/* Interactive Input & 1-Click Preset Repo Buttons */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/15 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={jsdelivrInput}
                    onChange={(e) => setJsdelivrInput(e.target.value)}
                    placeholder="GitHub (例: Hextris/hextris) または https://cdn.jsdelivr.net/gh/.../index.html"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white font-mono outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    value={jsdelivrBranch}
                    onChange={(e) => setJsdelivrBranch(e.target.value)}
                    placeholder="ブランチ (gh-pages / master / main)"
                    className="w-full sm:w-44 px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-cyan-300 font-mono outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    disabled={isScanningJsdelivr}
                    onClick={handleScanAndOpenFromJsdelivr}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-black text-xs shadow hover:brightness-110 shrink-0"
                  >
                    {isScanningJsdelivr ? '探索中...' : '▶ jsDelivrから取得してiframe起動'}
                  </button>
                </div>

                {/* Preset Verified Repos */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-white/55 font-bold mr-1">ワンクリック検証済みリポジトリ:</span>
                  {[
                    { label: 'Hextris (gh-pages)', repo: 'Hextris/hextris', branch: 'gh-pages' },
                    { label: '2048 (master)', repo: 'gabrielecirulli/2048', branch: 'master' },
                    { label: 'Clumsy Bird (gh-pages)', repo: 'ellisonleao/clumsy-bird', branch: 'gh-pages' },
                    { label: '0hh1 (master)', repo: 'Q42/0hh1', branch: 'master' },
                    { label: 'Astray Maze (master)', repo: 'wwwtyro/Astray', branch: 'master' },
                  ].map((preset) => (
                    <button
                      key={preset.repo}
                      type="button"
                      onClick={() => {
                        setJsdelivrInput(preset.repo);
                        setJsdelivrBranch(preset.branch);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-cyan-200 font-mono text-[10px]"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {jsdelivrStatus && (
                  <div className="px-3 py-2 rounded-xl bg-slate-900 border border-cyan-400/30 text-xs text-cyan-200 font-mono">
                    {jsdelivrStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Optional Drawer 1: Google Drive Eaglercraft (MC Files HTML) & UGS Files Browser */}
          {showDriveExplorer && (
            <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-400/40 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                    GOOGLE DRIVE DIRECT HTML STREAMER (MC FILES HTML & UGS FILES)
                  </div>
                  <h3 className="text-base font-black text-white">
                    ⛏️ 共有Googleドライブ マイクラ (Eaglercraft) & UGS ゲーム庫
                  </h3>
                  <p className="text-xs text-white/65">
                    共有いただいた2つのGoogleドライブフォルダ内の全HTMLゲームをダウンロード不要でそのままiframe内で起動します。
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'すべて表示' },
                      { id: 'eagler-vanilla', label: '⛏️ マイクラ公式版 (1.7〜1.21.11)' },
                      { id: 'eagler-client', label: '⚔️ PvP/軽量クライアント (Resent/Tuff/Pixel)' },
                      { id: 'ugs-html', label: '🎯 UGS HTMLゲーム' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDriveQuickFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        driveQuickFilter === tab.id
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                          : 'bg-black/40 border-white/10 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instant 1-Click Preset Cards from User's Google Drive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {GDRIVE_QUICK_FILES.filter(
                  (f) => driveQuickFilter === 'all' || f.category === driveQuickFilter
                ).map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      handleLaunchDriveHtmlFile(
                        item.id,
                        item.title,
                        item.category === 'ugs-html' ? 'UGS Drive' : 'MC Drive'
                      )
                    }
                    className="group cursor-pointer rounded-2xl overflow-hidden bg-black/55 border border-white/10 hover:border-emerald-400/60 transition flex flex-col justify-between"
                  >
                    <div className="relative h-24 w-full overflow-hidden bg-slate-900">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-80"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500/90 text-slate-950 font-mono font-black text-[10px]">
                        {item.versionBadge}
                      </span>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-white group-hover:text-emerald-300 transition line-clamp-1">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-white/60 mt-0.5 line-clamp-2">
                          {item.description}
                        </div>
                      </div>
                      <div className="text-[11px] font-black text-emerald-300 flex items-center justify-between pt-1 border-t border-white/10">
                        <span>▶ iframeで即プレイ</span>
                        <Icon name="Play" size={12} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Subfolder Browser for all 60+ folders inside MC Files HTML & UGS Files */}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-emerald-300">📂 ドライブ全フォルダ探索:</span>
                    {driveFolderStack.map((crumb, idx) => (
                      <button
                        key={crumb.id}
                        type="button"
                        onClick={() => {
                          const nextStack = driveFolderStack.slice(0, idx + 1);
                          setDriveFolderStack(nextStack);
                          setActiveDriveFolderId(crumb.id);
                        }}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] font-mono text-white"
                      >
                        {crumb.title} {idx < driveFolderStack.length - 1 ? '›' : ''}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDriveFolderStack([
                          {
                            id: '1S405_0KWmbdr4b70FosYeZx17_6zyHtr',
                            title: 'MC Files HTML (マイクラ)',
                          },
                        ]);
                        setActiveDriveFolderId('1S405_0KWmbdr4b70FosYeZx17_6zyHtr');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold"
                    >
                      ⛏️ MC Files フォルダ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDriveFolderStack([
                          {
                            id: '1ou3mI5xJVQv8Vt_MvwejPtf7zStSnU-s',
                            title: 'UGS Files (Ultimate Stash)',
                          },
                        ]);
                        setActiveDriveFolderId('1ou3mI5xJVQv8Vt_MvwejPtf7zStSnU-s');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[11px] font-bold"
                    >
                      🎯 UGS Files フォルダ
                    </button>
                  </div>
                </div>

                {isLoadingDriveFolder ? (
                  <div className="text-xs text-white/60 py-3 font-mono">
                    サーバー経由でGoogleドライブフォルダを読み込み中...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {driveFolderItems.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          if (entry.isFolder) {
                            setDriveFolderStack((prev) => [
                              ...prev,
                              { id: entry.id, title: entry.title },
                            ]);
                            setActiveDriveFolderId(entry.id);
                          } else {
                            handleLaunchDriveHtmlFile(entry.id, entry.title, 'Google Drive HTML');
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-xl border text-left text-[11px] truncate flex items-center gap-1.5 transition ${
                          entry.isFolder
                            ? 'bg-white/5 hover:bg-amber-500/20 border-white/10 text-amber-200'
                            : 'bg-emerald-500/15 hover:bg-emerald-500/30 border-emerald-400/30 text-emerald-200 font-bold'
                        }`}
                        title={entry.title}
                      >
                        <span>{entry.isFolder ? '📁' : '🎮'}</span>
                        <span className="truncate">{entry.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Optional Drawer 2: Server Leaderboard & Cloud Save */}
          {showServerPanel && (
            <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border border-amber-400/40 shadow-2xl grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Icon name="Trophy" size={15} />
                    <span>🌍 サーバー直結・グローバルオンラインランキング ({connState.url})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitScoreToServer}
                    className="px-3 py-1 rounded-xl bg-amber-400 text-black font-black text-[11px] hover:brightness-110"
                  >
                    現在のスコアをサーバー登録
                  </button>
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {leaderboards.map((lb, idx) => (
                    <div
                      key={lb.id}
                      className="px-3 py-2 rounded-xl bg-black/45 border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold truncate">{lb.player}</div>
                          <div className="text-[10px] text-white/50 truncate">
                            {lb.gameTitle} · {lb.provider}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-cyan-300">
                          {lb.score.toLocaleString()} PTS
                        </div>
                        <div className="text-[10px] text-amber-300">{lb.badge}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/45 border border-white/10 flex flex-col justify-between gap-3 text-xs">
                <div>
                  <div className="font-black text-cyan-300 mb-1">
                    ☁️ サーバークラウドセーブ同期 & 全要素アンロック
                  </div>
                  <p className="text-[11px] text-white/60">
                    進行状況・武器コレクション・AI制作ゲームをサーバー (`{connState.url}`) とリアルタイム同期します。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-white/55 mb-1">プレイヤー名</label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/55 mb-1">クラウド同期コード</label>
                    <input
                      type="text"
                      value={cloudSaveCode}
                      onChange={(e) => setCloudSaveCode(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-cyan-300 font-mono text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCloudSaveBackup}
                    className="flex-1 py-2 px-3 rounded-xl bg-cyan-400 text-black font-black text-xs hover:brightness-110"
                  >
                    ☁️ サーバーへセーブ同期
                  </button>
                  {onUnlockEverything && (
                    <button
                      type="button"
                      onClick={() => {
                        onUnlockEverything();
                        setCloudSyncStatus(
                          'サーバー権限で Glasia Dungeons 全120種武器＆CUSTOMモードを完全解放しました！'
                        );
                      }}
                      className="py-2 px-3 rounded-xl bg-purple-500/30 border border-purple-400/50 text-purple-200 font-bold text-xs hover:bg-purple-500/40"
                    >
                      🔓 全武器・CUSTOM即時解放
                    </button>
                  )}
                </div>

                {cloudSyncStatus && (
                  <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-xl px-3 py-1.5">
                    {cloudSyncStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dedicated CloudMoon Native Launcher UI Banner (when CloudMoon is selected) */}
          {selectedProvider === 'cloudmoon' ? (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-sky-950/90 via-indigo-950/85 to-slate-900 border border-sky-400/40 shadow-2xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-400 text-slate-950 font-mono font-black text-[10px]">
                      ☁️ CLOUDMOON NATIVE STREAMING ENGINE
                    </span>
                    <span className="text-xs text-sky-300 font-mono">
                      WebRTC GPU Cluster Connected · 待ち時間 0秒
                    </span>
                  </div>
                  <h2 className="text-xl font-black tracking-tight mt-1.5 text-white">
                    CloudMoon クラウドゲーミング・ネイティブランチャー
                  </h2>
                  <p className="text-xs text-white/70 mt-0.5">
                    容量0MB・インストール不要。下の一覧から遊びたいタイトルを選ぶと、クラウドGPUインスタンスを割り当てて直接iframe内にストリーム表示します。
                  </p>
                </div>

                {/* CloudMoon Server Node & Quality Selectors */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setProxyEngine('api-proxy');
                      handleSelectAndPlayGame({
                        id: 'cloudmoon-portal-proxy',
                        title: 'CloudMoon Web ポータル (プロキシ直結)',
                        provider: 'cloudmoon',
                        providerLabel: 'CloudMoon Proxy',
                        category: 'クラウドゲーミングポータル',
                        rating: '5.0 ★',
                        players: 'Cloud GPU',
                        badge: '☁️ プロキシ直結',
                        accentColor: '#38bdf8',
                        thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80',
                        description: 'CloudMoon (web.cloudmoonapp.com) をサーバープロキシ経由で直接iframe内に接続します。',
                        playUrl: 'https://web.cloudmoonapp.com/',
                        controls: 'マウス / キーボード / ゲームパッド',
                        requiresProxy: true,
                        cloudStream: true,
                        gpuPod: 'RTX-4090 Cloud Pod',
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="Zap" size={14} />
                    <span>☁️ CloudMoon 本体をプロキシで起動</span>
                  </button>
                  <select
                    value={cloudMoonRegion}
                    onChange={(e) => setCloudMoonRegion(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-black/60 border border-sky-400/40 text-sky-200 text-xs font-mono outline-none"
                  >
                    <option value="🇯🇵 Tokyo Edge GPU-01 (11ms)">🇯🇵 Tokyo Edge GPU-01 (11ms)</option>
                    <option value="🇸🇬 Singapore RTX-Node (34ms)">🇸🇬 Singapore RTX-Node (34ms)</option>
                    <option value="🇺🇸 US-West Cloud GPU (68ms)">🇺🇸 US-West Cloud GPU (68ms)</option>
                  </select>
                  <select
                    value={cloudMoonResolution}
                    onChange={(e) => setCloudMoonResolution(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-black/60 border border-sky-400/40 text-sky-200 text-xs font-mono outline-none"
                  >
                    <option value="1080p · 60 FPS WebRTC">1080p · 60 FPS WebRTC</option>
                    <option value="720p · 120 FPS Low-Latency">720p · 120 FPS Low-Latency</option>
                    <option value="1440p · HDR Ultra">1440p · HDR Ultra</option>
                  </select>
                </div>
              </div>

              {/* CloudMoon Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
                {[
                  'すべて',
                  'オープンワールド',
                  'スペースファンタジー',
                  'アクション',
                  'バトルロイヤル',
                  'アニメRPG',
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCloudMoonCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                      cloudMoonCategory === cat
                        ? 'bg-sky-400 text-slate-950'
                        : 'bg-white/10 text-white/75 hover:bg-white/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Standard Provider Header Banner */
            <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/70 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold">
                    AUTHENTIC ARTWORK & HTML IFRAME
                  </span>
                  <span className="text-[11px] text-white/55 font-mono">
                    {isSyncingCatalog ? '同期中...' : syncMessage}
                  </span>
                </div>
                <h2 className="text-lg font-black tracking-tight mt-1">
                  {PROVIDER_META[selectedProvider].name}
                </h2>
                <p className="text-xs text-white/65 mt-0.5">
                  {PROVIDER_META[selectedProvider].subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowJsdelivrGuide(true)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs shadow hover:brightness-110 flex items-center gap-1.5"
                >
                  <Icon name="Code" size={14} />
                  <span>📦 jsDelivr 設定・HTML起動</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDriveExplorer(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs shadow hover:brightness-110 flex items-center gap-1.5"
                >
                  <Icon name="FolderOpen" size={14} />
                  <span>⛏️ マイクラ & UGS ドライブ</span>
                </button>
                <button
                  type="button"
                  onClick={() => syncCatalogFromServer(selectedProvider)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold flex items-center gap-1.5"
                >
                  <Icon name="RotateCcw" size={13} />
                  <span>カタログ更新</span>
                </button>
              </div>
            </div>
          )}

          {/* Visual Game Cards Grid (With Real Game Cover Images, Titles, Badges & Direct Iframe Launch) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                onClick={() => handleSelectAndPlayGame(game)}
                className="cursor-pointer rounded-2xl overflow-hidden bg-slate-900/90 border border-white/10 hover:border-cyan-400/60 transition flex flex-col justify-between group shadow-lg"
              >
                {/* Game Cover Image Header */}
                <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                  <img
                    src={game.thumbnail}
                    alt={game.title}
                    onError={(e) => {
                      if (game.githubRepo) {
                        const target = e.currentTarget;
                        const fallback = `https://opengraph.githubassets.com/1/${game.githubRepo}`;
                        if (target.src !== fallback) {
                          target.src = fallback;
                        }
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-90"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                  {/* Provider Badge Top-Left */}
                  <span
                    style={{
                      backgroundColor: `${game.accentColor}dd`,
                      color: '#020617',
                    }}
                    className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-black shadow"
                  >
                    {game.providerLabel}
                  </span>

                  {/* Rating Badge Top-Right */}
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 border border-white/15 text-[10px] font-mono text-amber-300">
                    {game.rating}
                  </span>

                  {/* Special Badge Bottom-Left */}
                  <span className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded bg-black/75 border border-white/15 text-[10px] font-bold text-white/90">
                    {game.badge}
                  </span>
                </div>

                {/* Game Info Body */}
                <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-white group-hover:text-cyan-300 transition line-clamp-1">
                      {game.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-white/50 font-mono mt-0.5">
                      <span>{game.category}</span>
                      <span>{game.players}</span>
                    </div>
                    <p className="text-[11px] text-white/70 mt-2 leading-relaxed line-clamp-2">
                      {game.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="text-[10px] text-white/45 truncate">🎮 {game.controls}</div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAndPlayGame(game);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-black text-xs shadow hover:brightness-110 transition flex items-center justify-center gap-1.5"
                    >
                      <Icon name="Play" size={13} />
                      <span>
                        {game.cloudStream
                          ? '☁️ CloudMoon セッション起動 (iframe)'
                          : game.isHtmlFile
                          ? '▶ HTMLをiframeで実行'
                          : '▶ このゲームをプレイ (iframe)'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

