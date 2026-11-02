import { AppId } from './types';

export interface VirtualFile {
  id: string;
  name: string;
  kind: 'file';
  type: 'text' | 'image' | 'audio' | 'pdf';
  content: string; // text content, image URL, audio metadata, or PDF summary
  createdAt: number;
  tags?: string[];
  description?: string;
}

export interface VirtualFolder {
  id: string;
  name: string;
  kind: 'folder';
  children: VirtualNode[];
  tags?: string[];
}

export type VirtualNode = VirtualFile | VirtualFolder;

const img = (
  id: string,
  name: string,
  url: string,
  tags: string[] = [],
  description = '',
  daysAgo = 0
): VirtualFile => ({
  id,
  name,
  kind: 'file',
  type: 'image',
  content: url,
  createdAt: Date.now() - daysAgo * 86400000,
  tags,
  description,
});

const txt = (
  id: string,
  name: string,
  content: string,
  tags: string[] = [],
  description = '',
  daysAgo = 0
): VirtualFile => ({
  id,
  name,
  kind: 'file',
  type: 'text',
  content,
  createdAt: Date.now() - daysAgo * 86400000,
  tags,
  description,
});

const pdf = (
  id: string,
  name: string,
  content: string,
  tags: string[] = [],
  description = ''
): VirtualFile => ({
  id,
  name,
  kind: 'file',
  type: 'pdf',
  content,
  createdAt: Date.now() - 2 * 86400000,
  tags,
  description,
});

const aud = (
  id: string,
  name: string,
  content: string,
  tags: string[] = [],
  description = ''
): VirtualFile => ({
  id,
  name,
  kind: 'file',
  type: 'audio',
  content,
  createdAt: Date.now() - 3 * 86400000,
  tags,
  description,
});

const initial: VirtualFolder = {
  id: 'root',
  name: 'This PC',
  kind: 'folder',
  children: [
    {
      id: 'documents',
      name: 'Documents',
      kind: 'folder',
      children: [
        txt(
          'doc-welcome',
          'Welcome.txt',
          'Welcome to GlassiumOS 5 u1 (GlasispectUI)!\n\nThis web operating system includes multi-shell desktop modes, Surface Material Engine, restored Live2D silk wallpapers, SpectClip Calculator, Spatial Layer File Preview, and 3DMaze 50-Floor Roguelike.',
          ['OS5開発', '重要'],
          'GlassiumOS 5 u1 ウェルカムガイド'
        ),
        txt(
          'doc-notes',
          'SystemNotes.txt',
          'GlassiumOS 5 u1 Highlights:\n- GlasispectUI Design Architecture\n- Restored Default 5-Color Live2D Wallpapers (Amethyst & Cyan Silk, Abyssal Deep Ocean, Polar Emerald Aurora, Neon Cyber Dusk, Crimson Rose Nebula)\n- SpectClip & Liquid Glass Mini Widget Calculator\n- Spatial Layer Preview, Smart Drop Zone, Smart Tag Binder & AI Semantic Action in Files\n- 3DMaze 50-Floor Roguelike & Fixed Slope Physics',
          ['OS5開発'],
          'GlassiumOS 5 u1 リリースノート'
        ),
        pdf(
          'doc-spec-pdf',
          'Glasispect_Architecture.pdf',
          'GLASISPECT UI SPECIFICATION v5.1\n\n1. Spatial Layer Preview: Instant hover/click translucent surface card.\n2. SVG Liquid Refraction: feTurbulence + feDisplacementMap edge distortion.\n3. Smart Drop Zone: Multi-window temporary file staging shelf.',
          ['OS5開発', 'デザイン'],
          'GlasispectUI 空間レイヤーとSVG屈折エンジンの仕様書PDF'
        ),
      ],
    },
    {
      id: 'pictures',
      name: 'Pictures',
      kind: 'folder',
      children: [
        img(
          'pic-spect-crimson',
          'Crimson_Spect_Art.png',
          'https://images.pexels.com/photos/2832382/pexels-photo-2832382.jpeg?auto=compress&cs=tinysrgb&w=1200',
          ['OS5開発', 'デザイン'],
          '先週作った、赤っぽい背景のお絵描きファイル — Spect Studio制作 (Crimson Rose Nebula アートワーク)',
          7
        ),
        img(
          'pic-1',
          'Aurora.jpg',
          'https://images.pexels.com/photos/1933239/pexels-photo-1933239.jpeg?auto=compress&cs=tinysrgb&w=1200',
          ['デザイン'],
          'Amethyst & Cyan Silk オーロラコンセプト写真',
          4
        ),
        img(
          'pic-2',
          'CosmicNebula.jpg',
          'https://images.pexels.com/photos/2150/sky-space-dark-galaxy.jpg?auto=compress&cs=tinysrgb&w=1200',
          ['デザイン'],
          '深宇宙ネビュラ高解像度アート',
          5
        ),
        img(
          'pic-3',
          'Oasis.jpg',
          'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=1200',
          ['デザイン'],
          'エメラルドオアシス風景画',
          10
        ),
      ],
    },
    {
      id: 'downloads',
      name: 'Downloads',
      kind: 'folder',
      children: [
        txt(
          'dl-readme',
          'README.txt',
          'Downloads folder. Files you save from Editor or download from Browser/App Store appear here.\nTry AI Batch Action: "ダウンロードフォルダにある画像ファイルを全部1つのフォルダにまとめて、名前の頭に【OS5】って付けて"',
          ['重要'],
          'ダウンロードフォルダの説明テキスト'
        ),
        img(
          'dl-img-1',
          'UI_Concept_01.jpg',
          'https://images.pexels.com/photos/3109807/pexels-photo-3109807.jpeg?auto=compress&cs=tinysrgb&w=1200',
          ['OS5開発'],
          'ダウンロードしたGlasispectUIコンセプト画像1',
          2
        ),
        img(
          'dl-img-2',
          'Glasispect_Banner_02.jpg',
          'https://images.pexels.com/photos/2693212/pexels-photo-2693212.png?auto=compress&cs=tinysrgb&w=1200',
          ['デザイン'],
          'ダウンロードしたプロモーションバナー画像2',
          1
        ),
        img(
          'dl-img-3',
          'Aurora_Sample_03.jpg',
          'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&w=1200',
          ['OS5開発', 'デザイン'],
          'ダウンロードしたLive2Dシルク壁紙サンプル画像3',
          1
        ),
        aud(
          'dl-audio-1',
          'Synth_Preview.mp3',
          'Track: Glasispect Ambient Synth Wave\nArtist: Spect Audio Engine\nTempo: 124 BPM · Key: C Minor · Duration: 02:48',
          ['デザイン'],
          'GlasispectUI 起動サウンド＆アンビエントシンセ音源'
        ),
      ],
    },
    {
      id: 'trash',
      name: 'Recycle Bin',
      kind: 'folder',
      children: [
        txt('trash-old-cache', 'deprecated_cache.log', 'Old v4.7 cache file staged for automatic purge.'),
      ],
    },
  ],
};

export function getInitialFileSystem(): VirtualFolder {
  return JSON.parse(JSON.stringify(initial)) as VirtualFolder;
}

// path helpers
export function findNode(root: VirtualFolder, path: string[]): VirtualNode | null {
  let current: VirtualNode = root;
  for (const seg of path) {
    if (current.kind !== 'folder') return null;
    const found: VirtualNode | undefined = current.children.find((c) => c.name === seg);
    if (!found) return null;
    current = found;
  }
  return current;
}

export function getFolder(root: VirtualFolder, path: string[]): VirtualFolder | null {
  const node = findNode(root, path);
  return node && node.kind === 'folder' ? node : null;
}

export function findParent(root: VirtualFolder, path: string[]): VirtualFolder | null {
  if (path.length === 0) return null;
  return getFolder(root, path.slice(0, -1));
}

export type { AppId };
