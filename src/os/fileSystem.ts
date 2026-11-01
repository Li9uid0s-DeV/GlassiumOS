import { AppId } from './types';

export interface VirtualFile {
  id: string;
  name: string;
  kind: 'file';
  type: 'text' | 'image';
  content: string; // text content or image URL
  createdAt: number;
}

export interface VirtualFolder {
  id: string;
  name: string;
  kind: 'folder';
  children: VirtualNode[];
}

export type VirtualNode = VirtualFile | VirtualFolder;

const img = (id: string, name: string, url: string): VirtualFile => ({
  id, name, kind: 'file', type: 'image', content: url, createdAt: Date.now(),
});
const txt = (id: string, name: string, content: string): VirtualFile => ({
  id, name, kind: 'file', type: 'text', content, createdAt: Date.now(),
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
        txt('doc-welcome', 'Welcome.txt', 'Welcome to GlassiumOS 5!\n\nThis web operating system includes multi-shell desktop modes, Surface Material Engine, integrated AI assistant, and 10 live wallpapers.'),
        txt('doc-notes', 'SystemNotes.txt', 'GlassiumOS 5 Highlights:\n- Surface Material Engine (Liquid, Frosted, Clear, Solid)\n- 8 Desktop Shell Environments (GlassiumOS 5, Windows 11, Windows 10, Windows 8.1, macOS, Ubuntu, DeX, ChromeOS)\n- 10 2D Live Wallpapers & Custom Wallpaper Uploads\n- Integrated AI Assistant & Omnibar'),
      ],
    },
    {
      id: 'pictures',
      name: 'Pictures',
      kind: 'folder',
      children: [
        img('pic-1', 'Aurora.jpg', 'https://images.pexels.com/photos/1933239/pexels-photo-1933239.jpeg?auto=compress&cs=tinysrgb&w=1200'),
        img('pic-2', 'CosmicNebula.jpg', 'https://images.pexels.com/photos/2150/sky-space-dark-galaxy.jpg?auto=compress&cs=tinysrgb&w=1200'),
        img('pic-3', 'Oasis.jpg', 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=1200'),
      ],
    },
    {
      id: 'downloads',
      name: 'Downloads',
      kind: 'folder',
      children: [
        txt('dl-readme', 'README.txt', 'Downloads folder. Files you save from Notepad or download from App Store will appear here.'),
      ],
    },
    {
      id: 'trash',
      name: 'Recycle Bin',
      kind: 'folder',
      children: [
        txt('trash-old-cache', 'deprecated_cache.log', 'Old v3.0.0 cache file staged for automatic purge.'),
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
