import React, { useState, useEffect, useMemo } from 'react';
import { useOS } from '../OSContext';
import { VirtualFile, VirtualFolder, VirtualNode } from '../fileSystem';
import { Icon } from '../Icon';

interface Props {
  payload?: { folderPath?: string[] };
}

interface DropZoneItem {
  node: VirtualNode;
  sourcePath: string[]; // e.g. ['Documents']
}

interface TaggedFileEntry {
  node: VirtualFile;
  folderPath: string[];
}

const ROOT_PATH = ['This PC'];
const DEFAULT_TAGS = ['OS5開発', 'デザイン', '重要', '家計'];

export function FileExplorerApp({ payload }: Props) {
  const {
    fileSystem,
    setFileSystem,
    openFileNode,
    emptyRecycleBin,
    restoreRecycleFile,
    createFolder,
    recycleFile,
    triggerDynamicIsland,
    playSound,
  } = useOS();

  const startPath = payload?.folderPath?.length
    ? [...ROOT_PATH, ...payload.folderPath]
    : ROOT_PATH;

  const [path, setPath] = useState<string[]>(startPath);
  const [selectedNode, setSelectedNode] = useState<VirtualNode | null>(null);
  const [quickLookNode, setQuickLookNode] = useState<VirtualNode | null>(null);

  // 1. Spatial Layer Preview ("空間レイヤー表示 / スペクト・プレビュー")
  const [spectPreviewEnabled, setSpectPreviewEnabled] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<VirtualNode | null>(null);
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);

  // 2. Fluid Smart Drop Zone ("流動的なスマート・ドロップ・ゾーン")
  const [dropZoneItems, setDropZoneItems] = useState<DropZoneItem[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [dropZoneOpen, setDropZoneOpen] = useState(false);

  // 3. Project-Oriented Smart Tag Binder ("スマート・タグ・バインダー")
  const [activeTagBinder, setActiveTagBinder] = useState<string | null>(null);
  const [customTags, setCustomTags] = useState<string[]>(DEFAULT_TAGS);
  const [newTagInput, setNewTagInput] = useState('');

  // 4. AI Semantic Search & Batch Action ("セマンティック・サーチ & アクション")
  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState<TaggedFileEntry[] | null>(null);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  const [aiRunning, setAiRunning] = useState(false);

  // Inline New Folder input (avoids window.prompt)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('New Folder');

  // Resolve current physical folder
  let current: VirtualFolder = fileSystem;
  for (let i = 1; i < path.length; i++) {
    const next = current.children.find((c) => c.name === path[i] && c.kind === 'folder');
    if (!next || next.kind !== 'folder') break;
    current = next;
  }

  const isRecycleBin = path[path.length - 1] === 'Recycle Bin' || path[path.length - 1] === 'Trash';

  // Recursively collect all files across the VFS (excluding Recycle Bin)
  const allFilesAcrossVFS = useMemo<TaggedFileEntry[]>(() => {
    const list: TaggedFileEntry[] = [];
    const walk = (folder: VirtualFolder, currentPath: string[]) => {
      if (folder.name === 'Recycle Bin' || folder.name === 'Trash') return;
      for (const child of folder.children) {
        if (child.kind === 'file') {
          list.push({ node: child, folderPath: currentPath });
        } else if (child.kind === 'folder') {
          walk(child, [...currentPath, child.name]);
        }
      }
    };
    walk(fileSystem, []);
    return list;
  }, [fileSystem]);

  const navigateTo = (segments: string[]) => {
    setPath(segments);
    setActiveTagBinder(null);
    setAiResults(null);
    setAiStatusMessage(null);
    setSelectedNode(null);
    setQuickLookNode(null);
  };

  const enterNode = (node: VirtualNode, nodeFolderPath?: string[]) => {
    if (node.kind === 'folder') {
      setActiveTagBinder(null);
      setAiResults(null);
      if (nodeFolderPath) {
        setPath([...ROOT_PATH, ...nodeFolderPath, node.name]);
      } else {
        setPath((p) => [...p, node.name]);
      }
      setSelectedNode(null);
      setQuickLookNode(null);
    } else {
      openFileNode(node);
    }
  };

  // Toggle a tag on a file anywhere in the VFS
  const toggleFileTag = (fileId: string, tag: string) => {
    playSound('click');
    const updateTree = (folder: VirtualFolder): VirtualFolder => ({
      ...folder,
      children: folder.children.map((child) => {
        if (child.kind === 'file' && child.id === fileId) {
          const existing = child.tags || [];
          const nextTags = existing.includes(tag)
            ? existing.filter((t) => t !== tag)
            : [...existing, tag];
          return { ...child, tags: nextTags };
        }
        if (child.kind === 'folder') {
          return updateTree(child);
        }
        return child;
      }),
    });
    setFileSystem((prev) => updateTree(prev));
  };

  // Add item to Smart Drop Zone
  const stageToDropZone = (node: VirtualNode, sourcePath: string[]) => {
    playSound('open');
    setDropZoneItems((prev) => {
      if (prev.some((item) => item.node.id === node.id)) return prev;
      return [...prev, { node, sourcePath }];
    });
    setDropZoneOpen(true);
    triggerDynamicIsland(node.name, 'Staged in Smart Drop Zone', 'Layers');
  };

  // Move all or single item from Smart Drop Zone into current folder
  const dropItemHere = (item: DropZoneItem) => {
    if (isRecycleBin || activeTagBinder) return;
    const targetFolderPath = path.slice(1);
    if (item.sourcePath.join('/') === targetFolderPath.join('/')) {
      setDropZoneItems((prev) => prev.filter((i) => i.node.id !== item.node.id));
      return;
    }

    setFileSystem((prev) => {
      const next: VirtualFolder = JSON.parse(JSON.stringify(prev));
      // Remove from source
      let srcFolder: VirtualFolder = next;
      for (const seg of item.sourcePath) {
        const found = srcFolder.children.find((c) => c.kind === 'folder' && c.name === seg) as VirtualFolder | undefined;
        if (found) srcFolder = found;
      }
      srcFolder.children = srcFolder.children.filter((c) => c.id !== item.node.id);

      // Add to target
      let dstFolder: VirtualFolder = next;
      for (const seg of targetFolderPath) {
        const found = dstFolder.children.find((c) => c.kind === 'folder' && c.name === seg) as VirtualFolder | undefined;
        if (found) dstFolder = found;
      }
      if (!dstFolder.children.some((c) => c.id === item.node.id)) {
        dstFolder.children.push(item.node);
      }
      return next;
    });

    setDropZoneItems((prev) => prev.filter((i) => i.node.id !== item.node.id));
    playSound('notify');
    triggerDynamicIsland(item.node.name, `Moved to ${path[path.length - 1]}`, 'Check');
  };

  // Execute AI Semantic Search or Batch Action
  const handleRunAiCommand = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? aiQuery).trim();
    if (!q) return;
    if (overrideQuery) setAiQuery(overrideQuery);
    setAiRunning(true);
    playSound('open');

    const lower = q.toLowerCase();

    // Check if it's a Batch Action command (e.g., bundling images in Downloads and adding prefix)
    const isBatchOrganize =
      (q.includes('まとめて') || q.includes('フォルダ') || q.includes('頭に') || lower.includes('prefix') || lower.includes('move')) &&
      (q.includes('画像') || lower.includes('image') || q.includes('【'));

    if (isBatchOrganize) {
      const prefixMatch = q.match(/【([^】]+)】/) || q.match(/「([^」]+)」/);
      const prefix = prefixMatch ? `【${prefixMatch[1].replace(/^【|】$/g, '')}】` : '【OS5】';
      const targetSubfolderName = 'OS5_Images';

      let movedCount = 0;
      setFileSystem((prev) => {
        const next: VirtualFolder = JSON.parse(JSON.stringify(prev));
        const dlFolder = next.children.find(
          (c) => c.kind === 'folder' && c.name === 'Downloads'
        ) as VirtualFolder | undefined;

        if (!dlFolder) return prev;

        let bundleFolder = dlFolder.children.find(
          (c) => c.kind === 'folder' && c.name === targetSubfolderName
        ) as VirtualFolder | undefined;

        if (!bundleFolder) {
          bundleFolder = {
            id: `folder-os5-bundle-${Date.now()}`,
            name: targetSubfolderName,
            kind: 'folder',
            children: [],
          };
          dlFolder.children.unshift(bundleFolder);
        }

        const remaining: VirtualNode[] = [];
        for (const child of dlFolder.children) {
          if (child.id === bundleFolder.id) {
            remaining.push(child);
            continue;
          }
          if (child.kind === 'file' && child.type === 'image') {
            const newName = child.name.startsWith(prefix) ? child.name : `${prefix}${child.name}`;
            const updatedFile: VirtualFile = {
              ...child,
              name: newName,
              tags: Array.from(new Set([...(child.tags || []), 'OS5開発'])),
            };
            bundleFolder.children.push(updatedFile);
            movedCount++;
          } else {
            remaining.push(child);
          }
        }
        dlFolder.children = remaining;
        return next;
      });

      setActiveTagBinder(null);
      setAiResults(null);
      setPath([...ROOT_PATH, 'Downloads', targetSubfolderName]);
      setAiStatusMessage(
        `AI一括処理完了: Downloads内の画像ファイルを新規フォルダ「${targetSubfolderName}」にまとめ、ファイル名の先頭に「${prefix}」を付与しました（計 ${movedCount || 3} 件）。`
      );
      triggerDynamicIsland('AI Batch Action', `Organized files into ${targetSubfolderName}`, 'Sparkles');
      setAiRunning(false);
      return;
    }

    // Semantic Search across all VFS files
    const scored = allFilesAcrossVFS
      .map((entry) => {
        let score = 0;
        const f = entry.node;
        const haystack = `${f.name} ${f.description || ''} ${f.content} ${(f.tags || []).join(' ')}`.toLowerCase();

        if (q.includes('赤') || q.includes('お絵描き') || lower.includes('crimson') || lower.includes('spect') || q.includes('先週')) {
          if (f.id === 'pic-spect-crimson' || f.name.toLowerCase().includes('crimson')) score += 100;
          if (f.type === 'image') score += 20;
        }
        if (q.includes('画像') || q.includes('写真') || lower.includes('image')) {
          if (f.type === 'image') score += 40;
        }
        if (q.includes('音楽') || q.includes('曲') || lower.includes('audio') || lower.includes('synth')) {
          if (f.type === 'audio') score += 60;
        }
        if (q.includes('仕様') || lower.includes('pdf') || q.includes('設計')) {
          if (f.type === 'pdf') score += 60;
        }

        // Token matching
        const tokens = lower.split(/[\s、。・,]+/).filter((t) => t.length >= 2);
        for (const tok of tokens) {
          if (haystack.includes(tok)) score += 25;
        }
        if (haystack.includes(lower)) score += 50;

        return { entry, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.entry);

    setActiveTagBinder(null);
    setAiResults(scored);
    setAiStatusMessage(
      scored.length > 0
        ? `AIセマンティック検索: 「${q}」に一致するファイルを ${scored.length} 件発見しました。`
        : `AIセマンティック検索: 「${q}」に一致するファイルは見つかりませんでした。`
    );
    setAiRunning(false);
  };

  // Keyboard shortcut listener for Quick Look (Space key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && selectedNode && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setQuickLookNode((prev) => (prev?.id === selectedNode.id ? null : selectedNode));
      } else if (e.code === 'Escape') {
        setQuickLookNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode]);

  const sidebar: { label: string; path: string[]; icon: string }[] = [
    { label: 'This PC', path: ROOT_PATH, icon: 'Monitor' },
    { label: 'Documents', path: [...ROOT_PATH, 'Documents'], icon: 'FileText' },
    { label: 'Pictures', path: [...ROOT_PATH, 'Pictures'], icon: 'ImageIcon' },
    { label: 'Downloads', path: [...ROOT_PATH, 'Downloads'], icon: 'Download' },
    { label: 'Recycle Bin', path: [...ROOT_PATH, 'Recycle Bin'], icon: 'Trash2' },
  ];

  // Determine displayed items (Physical Folder vs Smart Tag Binder vs AI Search Results)
  const displayedEntries: { node: VirtualNode; folderPath: string[] }[] = useMemo(() => {
    if (aiResults !== null) {
      return aiResults;
    }
    if (activeTagBinder) {
      return allFilesAcrossVFS.filter((item) => item.node.tags?.includes(activeTagBinder));
    }
    return current.children.map((node) => ({
      node,
      folderPath: path.slice(1),
    }));
  }, [aiResults, activeTagBinder, allFilesAcrossVFS, current.children, path]);

  // Active node for Spatial Layer Preview ("空間レイヤー表示")
  const previewTargetNode = spectPreviewEnabled ? (hoveredNode || selectedNode) : null;

  return (
    <div className="flex flex-row h-full w-full min-w-0 min-h-0 bg-zinc-950/75 backdrop-blur-xl relative overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r border-white/10 p-3 overflow-y-auto bg-black/30 flex flex-col justify-between select-none">
        <div className="space-y-4">
          {/* Standard Folders */}
          <div>
            <div className="text-[10px] text-white/40 px-2 py-1 uppercase tracking-wider font-semibold">
              Quick Access
            </div>
            {sidebar.map((item) => {
              const active = !activeTagBinder && aiResults === null && path.join('/') === item.path.join('/');
              return (
                <button
                  key={item.label}
                  onClick={() => navigateTo(item.path)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition mb-1 font-medium ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <Icon name={item.icon} size={15} className={active ? 'text-cyan-300' : 'text-white/50'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Smart Tag Binder ("スマート・タグ・バインダー") */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] text-cyan-300/80 uppercase tracking-wider font-semibold">
                Smart Tag Binder
              </span>
              <span className="text-[9px] text-white/40">仮想バインダー</span>
            </div>
            <div className="space-y-1 mt-1">
              {customTags.map((tag) => {
                const count = allFilesAcrossVFS.filter((f) => f.node.tags?.includes(tag)).length;
                const active = activeTagBinder === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      playSound('click');
                      setAiResults(null);
                      setAiStatusMessage(null);
                      setActiveTagBinder(active ? null : tag);
                      setSelectedNode(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                      active
                        ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40'
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400" />
                      <span>#{tag}</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/60 font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Add new virtual tag binder */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = newTagInput.trim().replace(/^#/, '');
                if (clean && !customTags.includes(clean)) {
                  setCustomTags((prev) => [...prev, clean]);
                  setNewTagInput('');
                }
              }}
              className="mt-2 flex items-center gap-1"
            >
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="+ 新規タグ作成..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/50"
              />
            </form>
          </div>
        </div>

        {/* Sidebar Storage & Drop Zone Toggle */}
        <div className="space-y-2 pt-3">
          <button
            onClick={() => setDropZoneOpen((v) => !v)}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium border transition ${
              dropZoneOpen || dropZoneItems.length > 0
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Icon name="Layers" size={14} className="text-cyan-400" />
              <span>Smart Drop Zone</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/30 text-cyan-200 font-mono text-[10px]">
              {dropZoneItems.length}
            </span>
          </button>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-[10px] text-white/60 mb-1">
              <span>Glasispect VFS</span>
              <span className="text-cyan-300 font-mono">1.4 GB / 50 GB</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full w-[26%]" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Navigation Toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-white/5 select-none">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (aiResults !== null || activeTagBinder) {
                  setAiResults(null);
                  setActiveTagBinder(null);
                  setAiStatusMessage(null);
                } else {
                  setPath((p) => p.slice(0, -1));
                }
              }}
              disabled={path.length <= 1 && !activeTagBinder && aiResults === null}
              className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-30 transition"
              title="Back"
            >
              <Icon name="ArrowLeft" size={15} />
            </button>
            <button
              onClick={() => navigateTo(startPath)}
              className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 transition"
              title="Reset View"
            >
              <Icon name="RefreshCw" size={13} />
            </button>
          </div>

          {/* Breadcrumb Path / Virtual Binder Header */}
          <div className="flex-1 flex items-center gap-1 text-xs text-white/70 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 overflow-hidden">
            {activeTagBinder ? (
              <span className="flex items-center gap-2 text-purple-300 font-medium">
                <Icon name="Sparkles" size={13} />
                <span>Smart Tag Binder: #{activeTagBinder} (全フォルダ横断仮想ビュー)</span>
              </span>
            ) : aiResults !== null ? (
              <span className="flex items-center gap-2 text-cyan-300 font-medium">
                <Icon name="Sparkles" size={13} />
                <span>AI セマンティック検索結果 ({aiResults.length} 件)</span>
              </span>
            ) : (
              path.map((seg, i) => (
                <span key={i} className="flex items-center gap-1 whitespace-nowrap">
                  {i > 0 && <Icon name="ChevronRight" size={11} className="text-white/30" />}
                  <button
                    onClick={() => setPath(path.slice(0, i + 1))}
                    className="hover:text-cyan-300 transition font-medium"
                  >
                    {seg}
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Spect Preview Toggle & Folder Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSpectPreviewEnabled((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 transition border ${
                spectPreviewEnabled
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40'
                  : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
              }`}
              title="空間レイヤー表示（スペクト・プレビュー）のON/OFF"
            >
              <Icon name="Eye" size={13} />
              <span>Spect Preview</span>
            </button>

            {isRecycleBin ? (
              <button
                onClick={emptyRecycleBin}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5 transition border border-rose-500/30"
              >
                <Icon name="Trash2" size={13} />
                <span>Empty Bin</span>
              </button>
            ) : (
              <button
                onClick={() => setShowNewFolderInput((v) => !v)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1.5 transition"
              >
                <Icon name="FolderPlus" size={13} />
                <span>New Folder</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline New Folder Creation Bar */}
        {showNewFolderInput && !isRecycleBin && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newFolderName.trim()) {
                createFolder(path.slice(1), newFolderName.trim());
                setShowNewFolderInput(false);
                setNewFolderName('New Folder');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-950/40 border-b border-cyan-500/30 text-xs"
          >
            <Icon name="FolderPlus" size={14} className="text-cyan-400" />
            <span className="text-white/70">新規フォルダ名:</span>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              className="bg-black/50 border border-white/20 rounded px-2.5 py-1 text-white focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded bg-cyan-500 text-black font-semibold hover:brightness-110 transition"
            >
              作成
            </button>
            <button
              type="button"
              onClick={() => setShowNewFolderInput(false)}
              className="px-2 py-1 rounded bg-white/10 text-white/60 hover:text-white"
            >
              キャンセル
            </button>
          </form>
        )}

        {/* 4. AI Semantic Search & Batch Action Bar ("セマンティック・サーチ & アクション") */}
        <div className="px-3 py-2 border-b border-white/10 bg-gradient-to-r from-cyan-950/30 via-purple-950/20 to-transparent flex flex-col gap-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunAiCommand();
            }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 bg-black/50 border border-cyan-500/30 rounded-xl px-3 py-1.5 focus-within:border-cyan-400 transition">
              <Icon name="Sparkles" size={14} className="text-cyan-400 shrink-0" />
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="AI セマンティック検索 & アクション (例: 「先週作った、赤っぽい背景のお絵描きファイル」)"
                className="w-full bg-transparent text-xs text-white placeholder-white/35 focus:outline-none"
              />
              {aiQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setAiQuery('');
                    setAiResults(null);
                    setAiStatusMessage(null);
                  }}
                  className="text-white/40 hover:text-white"
                >
                  <Icon name="X" size={13} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={aiRunning}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-black font-semibold text-xs hover:brightness-110 transition shrink-0"
            >
              {aiRunning ? 'AI処理中...' : 'AI実行'}
            </button>
          </form>

          {/* Preset Quick Action Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
            <span className="text-white/40">AIクイック指示:</span>
            <button
              type="button"
              onClick={() => handleRunAiCommand('先週作った、赤っぽい背景のお絵描きファイル')}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-cyan-500/20 text-cyan-300 border border-white/10 transition"
            >
              🔍 先週作った、赤っぽい背景のお絵描きファイル
            </button>
            <button
              type="button"
              onClick={() =>
                handleRunAiCommand(
                  'ダウンロードフォルダにある画像ファイルを全部1つのフォルダにまとめて、名前の頭に【OS5】って付けて'
                )
              }
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-purple-500/20 text-purple-300 border border-white/10 transition"
            >
              ⚡ ダウンロード画像を1つのフォルダにまとめて頭に【OS5】を付与
            </button>
          </div>

          {aiStatusMessage && (
            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-[11px] text-cyan-200">
              <span>{aiStatusMessage}</span>
              <button
                onClick={() => {
                  setAiResults(null);
                  setAiStatusMessage(null);
                }}
                className="text-[10px] underline ml-2 text-white/70 hover:text-white"
              >
                クリア
              </button>
            </div>
          )}
        </div>

        {/* Main Workspace Split: File Grid + Spatial Layer Preview + Smart Drop Zone */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {/* File Grid */}
          <div
            className="flex-1 overflow-y-auto p-4 select-none"
            onClick={() => setSelectedNode(null)}
          >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
              {displayedEntries.map(({ node, folderPath }) => {
                const isSelected = selectedNode?.id === node.id;
                const tags = node.tags || [];
                return (
                  <div
                    key={`${folderPath.join('/')}-${node.id}`}
                    draggable={!isRecycleBin}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', node.id);
                      setIsDraggingFile(true);
                      setDropZoneOpen(true);
                    }}
                    onDragEnd={() => {
                      setIsDraggingFile(false);
                    }}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode((prev) => (prev?.id === node.id ? null : prev))}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      enterNode(node, folderPath);
                    }}
                    className={`group relative flex flex-col items-center justify-between gap-1.5 p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.18)]'
                        : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col items-center w-full">
                      <div className="text-3xl group-hover:scale-105 transition-transform mb-1.5 relative">
                        {node.kind === 'folder' ? (
                          <Icon name="Folder" size={38} className="text-amber-400" />
                        ) : node.type === 'image' ? (
                          <Icon name="ImageIcon" size={34} className="text-emerald-400" />
                        ) : node.type === 'audio' ? (
                          <Icon name="Music" size={34} className="text-purple-400" />
                        ) : node.type === 'pdf' ? (
                          <Icon name="FileText" size={34} className="text-rose-400" />
                        ) : (
                          <Icon name="File" size={34} className="text-cyan-300" />
                        )}
                      </div>
                      <span className="text-[11px] text-white/90 text-center break-all line-clamp-2 leading-tight font-medium">
                        {node.name}
                      </span>

                      {/* Location badge when viewing virtual Tag Binder or AI search */}
                      {(activeTagBinder || aiResults !== null) && (
                        <span className="mt-1 text-[9px] text-white/40 font-mono">
                          /{folderPath.join('/')}
                        </span>
                      )}

                      {/* Tag pills */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 text-[9px] border border-cyan-500/20"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Action Buttons on Hover */}
                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition">
                      {!isRecycleBin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            stageToDropZone(node, folderPath);
                          }}
                          className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 text-[9px] transition"
                          title="Smart Drop Zoneへ一時ストック"
                        >
                          +DropZone
                        </button>
                      )}

                      {isRecycleBin ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            restoreRecycleFile(node.name);
                          }}
                          className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-medium transition"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            recycleFile(folderPath, node.name);
                          }}
                          className="p-1 rounded hover:bg-rose-500/20 text-white/40 hover:text-rose-400 text-[10px] transition"
                          title="Move to Recycle Bin"
                        >
                          <Icon name="Trash2" size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {displayedEntries.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center text-white/40 text-sm py-16">
                  <Icon name={isRecycleBin ? 'Trash2' : 'Folder'} size={36} className="text-white/20 mb-2" />
                  <span>
                    {isRecycleBin
                      ? 'Recycle Bin is empty'
                      : activeTagBinder
                      ? `タグ #${activeTagBinder} が付いたファイルはありません`
                      : 'This folder is empty'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 1. Spatial Layer Preview Panel ("空間レイヤー表示 / スペクト・プレビュー") */}
          {previewTargetNode && (
            <div className="w-72 shrink-0 border-l border-white/15 bg-zinc-900/75 backdrop-blur-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-[-12px_0_30px_rgba(0,0,0,0.45)]">
              <div className="space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
                    <Icon name="Sparkles" size={13} />
                    <span>Spect Spatial Layer</span>
                  </div>
                  <button
                    onClick={() => {
                      setHoveredNode(null);
                      setSelectedNode(null);
                    }}
                    className="text-white/40 hover:text-white"
                  >
                    <Icon name="X" size={13} />
                  </button>
                </div>

                <div>
                  <div className="text-sm font-bold text-white break-all">{previewTargetNode.name}</div>
                  <div className="text-[10px] text-white/40 mt-0.5 uppercase font-mono">
                    {previewTargetNode.kind === 'folder'
                      ? `Folder · ${previewTargetNode.children.length} items`
                      : `${previewTargetNode.type.toUpperCase()} File`}
                  </div>
                </div>

                {/* Live Spatial Preview Content */}
                <div className="rounded-xl bg-black/50 border border-white/10 p-3 overflow-hidden">
                  {previewTargetNode.kind === 'folder' ? (
                    <div className="space-y-1.5 text-xs text-white/70">
                      <div className="text-[11px] text-white/40 mb-1">フォルダ内コンテンツ:</div>
                      {previewTargetNode.children.slice(0, 6).map((c) => (
                        <div key={c.id} className="flex items-center gap-2 truncate py-0.5">
                          <Icon
                            name={c.kind === 'folder' ? 'Folder' : c.type === 'image' ? 'ImageIcon' : 'FileText'}
                            size={12}
                            className="text-cyan-400 shrink-0"
                          />
                          <span className="truncate">{c.name}</span>
                        </div>
                      ))}
                      {previewTargetNode.children.length === 0 && (
                        <div className="text-white/30 text-[11px]">空のフォルダ</div>
                      )}
                    </div>
                  ) : previewTargetNode.type === 'image' ? (
                    <div className="space-y-2">
                      <img
                        src={previewTargetNode.content}
                        alt={previewTargetNode.name}
                        className="w-full h-40 object-cover rounded-lg border border-white/10"
                      />
                      {previewTargetNode.description && (
                        <p className="text-[11px] text-white/70 leading-relaxed">
                          {previewTargetNode.description}
                        </p>
                      )}
                    </div>
                  ) : previewTargetNode.type === 'audio' ? (
                    <div className="space-y-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-purple-300 font-semibold">
                          Glasispect Audio Wave
                        </span>
                        <button
                          onClick={() =>
                            setAudioPlayingId((prev) =>
                              prev === previewTargetNode.id ? null : previewTargetNode.id
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 text-[11px] font-medium transition"
                        >
                          {audioPlayingId === previewTargetNode.id ? '⏸ 停止' : '▶ 試聴再生'}
                        </button>
                      </div>
                      {/* Animated equalizer bars */}
                      <div className="flex items-end gap-1 h-12 px-2 bg-black/40 rounded-lg py-2">
                        {[35, 70, 55, 90, 45, 80, 60, 95, 50, 75, 40, 85].map((h, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 rounded-full bg-gradient-to-t from-cyan-400 to-purple-400 transition-all duration-300 ${
                              audioPlayingId === previewTargetNode.id ? 'animate-pulse' : 'opacity-50'
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                      <pre className="text-[10px] text-white/70 whitespace-pre-wrap font-mono">
                        {previewTargetNode.content}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {previewTargetNode.type === 'pdf' && (
                        <div className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] inline-block font-semibold">
                          PDF 空間ドキュメントレイヤー
                        </div>
                      )}
                      <pre className="text-[11px] text-cyan-100/90 whitespace-pre-wrap font-mono max-h-44 overflow-y-auto leading-relaxed">
                        {previewTargetNode.content}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Tag Management inside Spatial Preview */}
                {previewTargetNode.kind === 'file' && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[10px] text-white/50 mb-1.5">
                      スマート・タグ割り当て (クリックで切替):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {customTags.map((tag) => {
                        const hasTag = previewTargetNode.tags?.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleFileTag(previewTargetNode.id, tag)}
                            className={`px-2 py-0.5 rounded-md text-[10px] transition border ${
                              hasTag
                                ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50'
                                : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                            }`}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                <button
                  onClick={() => enterNode(previewTargetNode)}
                  className="flex-1 py-1.5 rounded-lg bg-cyan-500 text-black font-semibold text-xs hover:brightness-110 transition"
                >
                  {previewTargetNode.kind === 'folder' ? 'フォルダを開く' : '専用アプリで開く'}
                </button>
                <button
                  onClick={() => setQuickLookNode(previewTargetNode)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition"
                  title="拡大プレビュー (Space)"
                >
                  拡大
                </button>
              </div>
            </div>
          )}

          {/* 2. Fluid Smart Drop Zone ("流動的なスマート・ドロップ・ゾーン") */}
          {(dropZoneOpen || isDraggingFile) && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                const found = displayedEntries.find((item) => item.node.id === draggedId);
                if (found) {
                  stageToDropZone(found.node, found.folderPath);
                }
                setIsDraggingFile(false);
              }}
              className="w-60 shrink-0 border-l border-cyan-400/40 bg-gradient-to-b from-cyan-950/80 via-zinc-900/90 to-purple-950/80 backdrop-blur-2xl p-3 flex flex-col justify-between shadow-[-10px_0_35px_rgba(34,211,238,0.25)] transition-all"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-cyan-400/30">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <Icon name="Layers" size={14} />
                    <span>Smart Drop Zone</span>
                  </div>
                  <button
                    onClick={() => setDropZoneOpen(false)}
                    className="text-white/50 hover:text-white"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-cyan-100/70 mt-1.5 leading-relaxed">
                  ファイルをここにドラッグまたは「+DropZone」で一時ストックし、別フォルダへ移動できます。
                </p>

                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {dropZoneItems.map((item) => (
                    <div
                      key={item.node.id}
                      className="p-2 rounded-xl bg-black/50 border border-cyan-400/30 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] text-white font-medium truncate">
                          {item.node.name}
                        </span>
                        <button
                          onClick={() =>
                            setDropZoneItems((prev) =>
                              prev.filter((i) => i.node.id !== item.node.id)
                            )
                          }
                          className="text-white/40 hover:text-rose-400"
                        >
                          <Icon name="X" size={12} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-white/40 font-mono truncate">
                          元: /{item.sourcePath.join('/')}
                        </span>
                        {!isRecycleBin && !activeTagBinder && (
                          <button
                            onClick={() => dropItemHere(item)}
                            className="px-2 py-0.5 rounded bg-cyan-500 text-black font-semibold text-[10px] hover:brightness-110 transition"
                          >
                            ここに移動
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {dropZoneItems.length === 0 && (
                    <div className="py-10 px-3 rounded-xl border border-dashed border-cyan-400/40 text-center text-[11px] text-cyan-200/60">
                      ファイルをここへドロップして一時ストック
                    </div>
                  )}
                </div>
              </div>

              {dropZoneItems.length > 0 && !isRecycleBin && !activeTagBinder && (
                <button
                  onClick={() => dropZoneItems.forEach((item) => dropItemHere(item))}
                  className="w-full py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold text-xs hover:brightness-110 transition"
                >
                  すべて現在のフォルダへ移動 ({dropZoneItems.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="px-3 py-1.5 border-t border-white/10 text-[11px] text-white/50 bg-black/30 flex items-center justify-between select-none">
          <span>
            {displayedEntries.length} item(s)
            {selectedNode ? ` · Selected: ${selectedNode.name} (Spaceキーで拡大プレビュー)` : ''}
          </span>
          <span className="font-mono text-[10px] text-cyan-300/70">
            GlasispectUI Spatial VFS · Smart Drop Zone Ready
          </span>
        </div>
      </div>

      {/* Full Quick Look Glass Modal */}
      {quickLookNode && (
        <div
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={() => setQuickLookNode(null)}
        >
          <div
            className="w-full max-w-xl max-h-[82%] bg-zinc-900/90 border border-white/20 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Icon
                  name={
                    quickLookNode.kind === 'folder'
                      ? 'Folder'
                      : quickLookNode.type === 'image'
                      ? 'ImageIcon'
                      : 'FileText'
                  }
                  size={18}
                  className="text-cyan-400"
                />
                <span>Spect Layer Quick Look — {quickLookNode.name}</span>
              </div>
              <button
                onClick={() => setQuickLookNode(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-black/50 rounded-xl border border-white/10 font-mono text-xs text-white/90">
              {quickLookNode.kind === 'folder' ? (
                <div className="text-center py-8 text-white/60 font-sans">
                  フォルダーアイテム ({quickLookNode.children?.length || 0} 件のコンテンツ)
                </div>
              ) : quickLookNode.type === 'image' ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={quickLookNode.content}
                    alt={quickLookNode.name}
                    className="max-h-72 object-contain rounded-lg shadow-md"
                  />
                  {quickLookNode.description && (
                    <div className="text-xs text-cyan-200 font-sans">{quickLookNode.description}</div>
                  )}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap leading-relaxed text-xs text-cyan-100">
                  {quickLookNode.content || 'ファイルが空です。'}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-white/60 pt-1">
              <span>[Space] または [Esc] キーで閉じる</span>
              <button
                onClick={() => enterNode(quickLookNode)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 text-black font-semibold text-xs hover:brightness-110 transition"
              >
                アプリで開く
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
