import { useState, useEffect } from 'react';
import { useOS } from '../OSContext';
import { VirtualFolder, VirtualNode } from '../fileSystem';
import { Icon } from '../Icon';

interface Props {
  payload?: { folderPath?: string[] };
}

const ROOT_PATH = ['This PC'];

export function FileExplorerApp({ payload }: Props) {
  const {
    fileSystem, openFileNode, emptyRecycleBin, restoreRecycleFile,
    createFolder, recycleFile,
  } = useOS();
  const startPath = payload?.folderPath?.length
    ? [...ROOT_PATH, ...payload.folderPath]
    : ROOT_PATH;
  const [path, setPath] = useState<string[]>(startPath);
  const [selectedNode, setSelectedNode] = useState<VirtualNode | null>(null);
  const [quickLookNode, setQuickLookNode] = useState<VirtualNode | null>(null);

  // Resolve current folder
  let current: VirtualFolder = fileSystem;
  for (let i = 1; i < path.length; i++) {
    const next = current.children.find((c) => c.name === path[i] && c.kind === 'folder');
    if (!next || next.kind !== 'folder') break;
    current = next;
  }

  const isRecycleBin = path[path.length - 1] === 'Recycle Bin' || path[path.length - 1] === 'Trash';

  const navigateTo = (segments: string[]) => {
    setPath(segments);
    setSelectedNode(null);
    setQuickLookNode(null);
  };

  const enterNode = (node: VirtualNode) => {
    if (node.kind === 'folder') {
      setPath((p) => [...p, node.name]);
      setSelectedNode(null);
      setQuickLookNode(null);
    } else {
      openFileNode(node);
    }
  };

  // Keyboard shortcut listener for Mac Quick Look (Space key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && selectedNode) {
        // Prevent default spacebar page scrolling
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

  return (
    <div className="flex flex-row h-full w-full min-w-0 min-h-0 bg-zinc-950/60 backdrop-blur-md relative">
      {/* Sidebar */}
      <div className="w-44 shrink-0 border-r border-white/10 p-2.5 overflow-y-auto bg-black/20 flex flex-col justify-between select-none">
        <div>
          <div className="text-[10px] text-white/40 px-2 py-1 uppercase tracking-wider font-semibold">Quick access</div>
          {sidebar.map((item) => {
            const active = path.join('/') === item.path.join('/');
            return (
              <button
                key={item.label}
                onClick={() => navigateTo(item.path)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition mb-1 font-medium ${
                  active ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <Icon name={item.icon} size={15} className={active ? 'text-cyan-300' : 'text-white/50'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sidebar storage meter */}
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between text-[10px] text-white/60 mb-1">
            <span>Liquid VFS Disk</span>
            <span className="text-cyan-300 font-mono">1.2 GB / 50 GB</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full w-[24%]" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-white/5 select-none">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPath((p) => p.slice(0, -1))}
              disabled={path.length <= 1}
              className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-30 transition"
              title="Back"
            >
              <Icon name="ArrowLeft" size={15} />
            </button>
            <button
              onClick={() => setPath(startPath)}
              className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 transition"
              title="Refresh"
            >
              <Icon name="RefreshCw" size={13} />
            </button>
          </div>

          {/* Breadcrumb Path */}
          <div className="flex-1 flex items-center gap-1 text-xs text-white/70 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 overflow-hidden">
            {path.map((seg, i) => (
              <span key={i} className="flex items-center gap-1 whitespace-nowrap">
                {i > 0 && <Icon name="ChevronRight" size={11} className="text-white/30" />}
                <button
                  onClick={() => setPath(path.slice(0, i + 1))}
                  className="hover:text-cyan-300 transition font-medium"
                >
                  {seg}
                </button>
              </span>
            ))}
          </div>

          {/* Actions: Empty Bin / New Folder */}
          <div className="flex items-center gap-2">
            {isRecycleBin ? (
              <button
                onClick={emptyRecycleBin}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5 transition border border-rose-500/30"
              >
                <Icon name="Trash2" size={13} />
                <span>Empty Recycle Bin</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  const name = prompt('Folder name:', 'New Folder');
                  if (name) createFolder(path.slice(1), name);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1.5 transition"
              >
                <Icon name="FolderPlus" size={13} />
                <span>New Folder</span>
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 select-none" onClick={() => setSelectedNode(null)}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
            {current.children.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    enterNode(node);
                  }}
                  className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/25 border-cyan-400/60 ring-2 ring-cyan-400/30 shadow-lg'
                      : 'bg-white/5 hover:bg-white/10 border-transparent hover:border-white/15'
                  }`}
                >
                  <div className="flex flex-col items-center w-full">
                    <div className="text-3xl group-hover:scale-105 transition-transform mb-1">
                      {node.kind === 'folder' ? (
                        <Icon name="Folder" size={38} className="text-amber-400" />
                      ) : node.type === 'image' ? (
                        <Icon name="ImageIcon" size={34} className="text-emerald-400" />
                      ) : (
                        <Icon name="File" size={34} className="text-cyan-300" />
                      )}
                    </div>
                    <span className="text-[11px] text-white/90 text-center break-all line-clamp-2 leading-tight">
                      {node.name}
                    </span>
                  </div>

                  {/* Recycle Bin Specific Action */}
                  {isRecycleBin ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        restoreRecycleFile(node.name);
                      }}
                      className="mt-1 px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-medium transition"
                      title="Restore file to Documents"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        recycleFile(path.slice(1), node.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 mt-1 p-1 rounded hover:bg-rose-500/20 text-white/40 hover:text-rose-400 text-[10px] transition"
                      title="Move to Recycle Bin"
                    >
                      <Icon name="Trash2" size={12} />
                    </button>
                  )}
                </div>
              );
            })}
            {current.children.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center text-white/40 text-sm py-16">
                <Icon name={isRecycleBin ? 'Trash2' : 'Folder'} size={36} className="text-white/20 mb-2" />
                <span>{isRecycleBin ? 'Recycle Bin is empty' : 'This folder is empty'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="px-3 py-1.5 border-t border-white/10 text-[11px] text-white/50 bg-black/20 flex items-center justify-between select-none">
          <span>{current.children.length} item(s) {selectedNode ? `· Selected: ${selectedNode.name} (Press Space for Quick Look)` : ''}</span>
          <span className="font-mono text-[10px]">Liquid VFS · UTF-8</span>
        </div>
      </div>

      {/* Mac Quick Look Glass Modal */}
      {quickLookNode && (
        <div
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={() => setQuickLookNode(null)}
        >
          <div
            className="w-full max-w-xl max-h-[80%] bg-zinc-900/90 border border-white/20 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Look Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Icon
                  name={quickLookNode.kind === 'folder' ? 'Folder' : quickLookNode.type === 'image' ? 'ImageIcon' : 'FileText'}
                  size={18}
                  className="text-cyan-400"
                />
                <span>Quick Look — {quickLookNode.name}</span>
              </div>
              <button
                onClick={() => setQuickLookNode(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            {/* Content Preview */}
            <div className="flex-1 overflow-auto p-4 bg-black/50 rounded-xl border border-white/10 font-mono text-xs text-white/90">
              {quickLookNode.kind === 'folder' ? (
                <div className="text-center py-8 text-white/60 font-sans">
                  フォルダーアイテム ({quickLookNode.children?.length || 0} 件のコンテンツ)
                </div>
              ) : quickLookNode.type === 'image' ? (
                <div className="flex items-center justify-center">
                  <img
                    src={quickLookNode.content || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'}
                    alt={quickLookNode.name}
                    className="max-h-80 object-contain rounded-lg shadow-md"
                  />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap leading-relaxed text-xs text-cyan-100">
                  {quickLookNode.content || 'ファイルが空です。'}
                </pre>
              )}
            </div>

            {/* Quick Look Action Bar */}
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
