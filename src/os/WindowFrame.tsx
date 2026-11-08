import React, { useRef, useState, useEffect, ReactNode } from 'react';
import { WindowState, AppId } from './types';
import { useOS } from './OSContext';
import { Icon } from './Icon';

interface Props {
  win: WindowState;
  isHidden?: boolean;
  children: ReactNode;
}

const MIN_W = 320;
const MIN_H = 220;

const APP_JA_SUBTITLES: Partial<Record<AppId, string>> = {
  explorer: 'ファイル',
  browser: 'ブラウザ',
  terminal: 'ターミナル',
  settings: '設定',
  notepad: 'メモ帳',
  game: 'ゲーム',
  appstore: 'ストア',
  calculator: '電卓',
  taskmanager: 'タスク管理',
  sysmon: 'システム監視',
  calendar: 'カレンダー',
  synth: '音楽',
  weather: '天気',
  clock: '時計',
  ai: 'AIアシスタント',
  studio: '開発環境',
  retrocade: 'レトロゲーム',
};

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type SnapZone =
  | 'left'
  | 'right'
  | 'maximize'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'three-left'
  | 'three-center'
  | 'three-right'
  | null;

export const WindowFrame: React.FC<Props> = ({ win, isHidden, children }) => {
  const {
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    updateWindowRect,
    getTopWindowId,
    shellMode,
    theme,
    language,
  } = useOS();

  const isLight = theme === 'light';
  const isFocused = getTopWindowId() === win.id;
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<ResizeDir | null>(null);
  const [snapPreview, setSnapPreview] = useState<SnapZone>(null);
  const [showSnapFlyout, setShowSnapFlyout] = useState(false);
  const snapFlyoutTimer = useRef<number | null>(null);

  const frameRef = useRef<HTMLDivElement>(null);
  const liveRectRef = useRef({
    x: win.x,
    y: win.y,
    width: win.width,
    height: win.height,
  });

  useEffect(() => {
    liveRectRef.current = {
      x: win.x,
      y: win.y,
      width: win.width,
      height: win.height,
    };
  }, [win.x, win.y, win.width, win.height]);

  const dragStart = useRef<{
    mouseX: number;
    mouseY: number;
    winX: number;
    winY: number;
    winW: number;
    winH: number;
  }>({ mouseX: 0, mouseY: 0, winX: 0, winY: 0, winW: 0, winH: 0 });

  const computeSnapRect = (zone: SnapZone) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isTopBarMode = shellMode === 'mac' || shellMode === 'ubuntu';
    const topOffset = isTopBarMode ? 32 : 0;
    const bottomOffset = shellMode === 'mac' ? 76 : 48;
    const usableH = vh - topOffset - bottomOffset;
    const usableW = vw;

    switch (zone) {
      case 'left':
        return { x: 0, y: topOffset, width: Math.floor(usableW / 2), height: usableH };
      case 'right':
        return { x: Math.floor(usableW / 2), y: topOffset, width: Math.ceil(usableW / 2), height: usableH };
      case 'top-left':
        return { x: 0, y: topOffset, width: Math.floor(usableW / 2), height: Math.floor(usableH / 2) };
      case 'top-right':
        return { x: Math.floor(usableW / 2), y: topOffset, width: Math.ceil(usableW / 2), height: Math.floor(usableH / 2) };
      case 'bottom-left':
        return { x: 0, y: topOffset + Math.floor(usableH / 2), width: Math.floor(usableW / 2), height: Math.ceil(usableH / 2) };
      case 'bottom-right':
        return {
          x: Math.floor(usableW / 2),
          y: topOffset + Math.floor(usableH / 2),
          width: Math.ceil(usableW / 2),
          height: Math.ceil(usableH / 2),
        };
      case 'three-left':
        return { x: 0, y: topOffset, width: Math.floor(usableW / 3), height: usableH };
      case 'three-center':
        return { x: Math.floor(usableW / 3), y: topOffset, width: Math.floor(usableW / 3), height: usableH };
      case 'three-right':
        return { x: Math.floor((usableW / 3) * 2), y: topOffset, width: Math.ceil(usableW / 3), height: usableH };
      default:
        return null;
    }
  };

  const applySnapLayout = (zone: SnapZone) => {
    setShowSnapFlyout(false);
    setSnapPreview(null);
    if (!zone) return;
    if (zone === 'maximize') {
      if (!win.maximized) toggleMaximize(win.id);
      return;
    }
    const rect = computeSnapRect(zone);
    if (rect) {
      if (win.maximized) toggleMaximize(win.id);
      updateWindowRect(win.id, rect);
      focusWindow(win.id);
    }
  };

  useEffect(() => {
    if (!dragging && !resizing) return;

    let rafId: number | null = null;

    const handleMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;

      if (dragging) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const EDGE = 14;
        const CORNER = 48;

        let detectedZone: SnapZone = null;
        if (e.clientY <= EDGE) {
          if (e.clientX <= CORNER) detectedZone = 'top-left';
          else if (e.clientX >= vw - CORNER) detectedZone = 'top-right';
          else detectedZone = 'maximize';
        } else if (e.clientX <= EDGE) {
          if (e.clientY <= CORNER) detectedZone = 'top-left';
          else if (e.clientY >= vh - 60 - CORNER) detectedZone = 'bottom-left';
          else detectedZone = 'left';
        } else if (e.clientX >= vw - EDGE) {
          if (e.clientY <= CORNER) detectedZone = 'top-right';
          else if (e.clientY >= vh - 60 - CORNER) detectedZone = 'bottom-right';
          else detectedZone = 'right';
        }
        if (win.appId === 'calculator' && ( detectedZone === 'left' || detectedZone === 'right')) {
          detectedZone = null;
        }
        setSnapPreview(detectedZone);

        const maxY = window.innerHeight - 56;
        const minY = shellMode === 'mac' || shellMode === 'ubuntu' ? 32 : 0;
        const nextX = Math.max(-dragStart.current.winW + 120, Math.min(vw - 120, dragStart.current.winX + dx));
        const nextY = Math.max(minY, Math.min(maxY, dragStart.current.winY + dy));

        liveRectRef.current.x = nextX;
        liveRectRef.current.y = nextY;

        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            if (frameRef.current) {
              frameRef.current.style.left = `${liveRectRef.current.x}px`;
              frameRef.current.style.top = `${liveRectRef.current.y}px`;
            }
          });
        }
      } else if (resizing) {
        let { winX: x, winY: y, winW: width, winH: height } = dragStart.current;

        if (resizing.includes('e')) {
          width = Math.max(MIN_W, dragStart.current.winW + dx);
        }
        if (resizing.includes('s')) {
          height = Math.max(MIN_H, dragStart.current.winH + dy);
        }
        if (resizing.includes('w')) {
          const possibleW = dragStart.current.winW - dx;
          if (possibleW >= MIN_W) {
            width = possibleW;
            x = dragStart.current.winX + dx;
          }
        }
        if (resizing.includes('n')) {
          const minY = shellMode === 'mac' || shellMode === 'ubuntu' ? 32 : 0;
          const possibleH = dragStart.current.winH - dy;
          if (possibleH >= MIN_H && dragStart.current.winY + dy >= minY) {
            height = possibleH;
            y = dragStart.current.winY + dy;
          }
        }

        liveRectRef.current = { x, y, width, height };
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            if (frameRef.current) {
              frameRef.current.style.left = `${liveRectRef.current.x}px`;
              frameRef.current.style.top = `${liveRectRef.current.y}px`;
              frameRef.current.style.width = `${liveRectRef.current.width}px`;
              frameRef.current.style.height = `${liveRectRef.current.height}px`;
            }
          });
        }
      }
    };

    const handleUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (dragging && win.appId === 'calculator') {
        const vw = window.innerWidth;
        if (liveRectRef.current.x <= 36) {
          updateWindowRect(win.id, { x: 10, y: Math.max(48, liveRectRef.current.y), width: 320, height: 460 });
          window.dispatchEvent(new CustomEvent('glasispect-calc-edge-dock', { detail: { side: 'left', docked: true } }));
          setDragging(false);
          setResizing(null);
          setSnapPreview(null);
          return;
        } else if (liveRectRef.current.x + liveRectRef.current.width >= vw - 36) {
          updateWindowRect(win.id, { x: vw - 330, y: Math.max(48, liveRectRef.current.y), width: 320, height: 460 });
          window.dispatchEvent(new CustomEvent('glasispect-calc-edge-dock', { detail: { side: 'right', docked: true } }));
          setDragging(false);
          setResizing(null);
          setSnapPreview(null);
          return;
        }
      }
      if (dragging && snapPreview) {
        applySnapLayout(snapPreview);
      } else if (dragging || resizing) {
        updateWindowRect(win.id, { ...liveRectRef.current });
      }
      setDragging(false);
      setResizing(null);
      setSnapPreview(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragging, resizing, snapPreview, win.id, updateWindowRect, shellMode]);

  const hiddenWindow = Boolean(isHidden || win.minimized || win.closed);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('.snap-flyout-panel')) return;
    e.preventDefault();
    focusWindow(win.id);
    if (win.maximized) return;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: win.x,
      winY: win.y,
      winW: win.width,
      winH: win.height,
    };
    setDragging(true);
  };

  const startResize = (dir: ResizeDir) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    focusWindow(win.id);
    if (win.maximized) return;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: win.x,
      winY: win.y,
      winW: win.width,
      winH: win.height,
    };
    setResizing(dir);
  };

  const getMaximizedBounds = () => {
    if (shellMode === 'mac') {
      return { left: 0, top: 32, width: '100vw', height: 'calc(100vh - 108px)' };
    }
    if (shellMode === 'ubuntu') {
      return { left: 68, top: 32, width: 'calc(100vw - 68px)', height: 'calc(100vh - 32px)' };
    }
    if (shellMode === 'windows' || shellMode === 'windows11' || shellMode === 'windows10') {
      return { left: 0, top: 0, width: '100vw', height: 'calc(100vh - 48px)' };
    }
    return { left: 0, top: 0, width: '100vw', height: 'calc(100vh - 56px)' };
  };

  const style: React.CSSProperties = win.maximized
    ? {
        ...getMaximizedBounds(),
        zIndex: win.zIndex,
        borderRadius: 0,
        display: hiddenWindow ? 'none' : 'flex',
      }
    : {
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
        display: hiddenWindow ? 'none' : 'flex',
      };

  const isMacMode = shellMode === 'mac';
  const isUbuntuMode = shellMode === 'ubuntu';
  const isGlassium5Mode = shellMode === 'windows';
  const isWin10Mode = shellMode === 'windows10';
  const isWin11Mode = shellMode === 'windows11';
  const isDexOrChrome = shellMode === 'dex' || shellMode === 'chromeos';

  const previewRect = snapPreview === 'maximize' ? getMaximizedBounds() : computeSnapRect(snapPreview);

  const handleMaxMouseEnter = () => {
    if (snapFlyoutTimer.current) window.clearTimeout(snapFlyoutTimer.current);
    snapFlyoutTimer.current = window.setTimeout(() => {
      setShowSnapFlyout(true);
    }, 320);
  };

  const handleMaxMouseLeave = () => {
    if (snapFlyoutTimer.current) window.clearTimeout(snapFlyoutTimer.current);
    snapFlyoutTimer.current = window.setTimeout(() => {
      setShowSnapFlyout(false);
    }, 240);
  };

  // Determine window frame shape & border per shellMode
  const getWindowShapeClass = () => {
    if (win.maximized) return '!rounded-none';
    if (isGlassium5Mode) {
      return `!rounded-2xl border-t ${isFocused ? 'border-t-[var(--os-accent)]/80 shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.25)]' : 'border-t-white/20'}`;
    }
    if (isWin10Mode) {
      return `!rounded-none border ${isFocused ? 'border-[var(--os-accent)]/60' : isLight ? 'border-slate-300' : 'border-white/15'}`;
    }
    if (isUbuntuMode) {
      return '!rounded-t-xl !rounded-b-md';
    }
    if (isDexOrChrome) {
      return '!rounded-2xl';
    }
    return '!rounded-xl';
  };

  // Determine titlebar height & background per shellMode
  const getTitleBarClass = () => {
    if (isUbuntuMode) {
      return isLight
        ? 'h-10 bg-[#e8e8e8] text-slate-800 border-b border-black/10 px-3'
        : 'h-10 bg-[#2b2b2b] text-white border-b border-black/40 px-3';
    }
    if (isWin10Mode) {
      return isLight
        ? 'h-8 bg-white text-slate-900 border-b border-slate-200 pl-3 pr-0'
        : 'h-8 bg-[#18181b] text-white border-b border-white/10 pl-3 pr-0';
    }
    if (isGlassium5Mode) {
      return isLight
        ? 'h-9 bg-slate-50/90 text-slate-900 border-b border-slate-200/80 pl-3.5 pr-0'
        : 'h-9 bg-slate-950/60 text-white border-b border-white/10 pl-3.5 pr-0';
    }
    if (isMacMode) {
      return isLight
        ? 'h-10 bg-slate-100/80 text-slate-900 border-b border-slate-300/60 px-3.5'
        : 'h-10 bg-white/[0.03] text-white border-b border-white/[0.08] px-3.5';
    }
    if (isDexOrChrome) {
      return isLight
        ? 'h-11 bg-slate-100/90 text-slate-900 border-b border-slate-200 px-4'
        : 'h-11 bg-slate-900/75 text-white border-b border-white/10 px-4';
    }
    // Windows 11 default
    return isLight
      ? 'h-10 bg-white/60 text-slate-900 border-b border-slate-200/70 pl-3.5 pr-0'
      : 'h-10 bg-white/[0.02] text-white border-b border-white/[0.07] pl-3.5 pr-0';
  };

  return (
    <>
      {/* Edge Drag Snap Preview Ghost Overlay */}
      {dragging && snapPreview && previewRect && (
        <div
          className="pointer-events-none fixed z-[9998] bg-cyan-500/15 backdrop-blur-md transition-all duration-150"
          style={
            snapPreview === 'maximize'
              ? { ...getMaximizedBounds() }
              : {
                  left: (previewRect as { x: number }).x + 6,
                  top: (previewRect as { y: number }).y + 6,
                  width: (previewRect as { width: number }).width - 12,
                  height: (previewRect as { height: number }).height - 12,
                }
          }
        />
      )}

      <div
        ref={frameRef}
        onPointerDown={() => focusWindow(win.id)}
        style={style}
        data-window-shell={shellMode}
        className={`liquid-glass-window fixed flex flex-col overflow-hidden select-none ${getWindowShapeClass()} ${
          dragging || resizing
            ? 'is-dragging transition-none'
            : 'transition-[box-shadow,background-color] duration-200'
        } ${isFocused ? 'is-focused' : 'opacity-95'}`}
      >
        {/* Resize Handles */}
        {!win.maximized && (
          <>
            <div onPointerDown={startResize('n')} className="absolute -top-1 left-3 right-3 z-30 h-2.5 cursor-ns-resize" />
            <div onPointerDown={startResize('s')} className="absolute -bottom-1 left-3 right-3 z-30 h-2.5 cursor-ns-resize" />
            <div onPointerDown={startResize('w')} className="absolute top-3 bottom-3 -left-1 z-30 w-2.5 cursor-ew-resize" />
            <div onPointerDown={startResize('e')} className="absolute top-3 bottom-3 -right-1 z-30 w-2.5 cursor-ew-resize" />
            <div onPointerDown={startResize('nw')} className="absolute -top-1 -left-1 z-30 h-4 w-4 cursor-nwse-resize" />
            <div onPointerDown={startResize('ne')} className="absolute -top-1 -right-1 z-30 h-4 w-4 cursor-nesw-resize" />
            <div onPointerDown={startResize('sw')} className="absolute -bottom-1 -left-1 z-30 h-4 w-4 cursor-nesw-resize" />
            <div onPointerDown={startResize('se')} className="absolute -bottom-1 -right-1 z-30 h-4 w-4 cursor-nwse-resize" />
          </>
        )}

        {/* Title Bar */}
        <div
          onPointerDown={startDrag}
          onDoubleClick={() => toggleMaximize(win.id)}
          className={`relative flex shrink-0 items-center justify-between select-none ${getTitleBarClass()}`}
        >
          {/* Left Side: macOS Traffic Lights OR App Title */}
          {isMacMode ? (
            <div className="window-controls-container group flex items-center gap-2 z-20">
              {/* Close (Red) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeWindow(win.id);
                }}
                aria-label="Close"
                title="Close"
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FF5F56] border border-[#E0443E] text-[#4D0000] transition-transform active:scale-90"
              >
                <svg
                  viewBox="0 0 10 10"
                  className="h-2 w-2 opacity-0 transition-opacity group-hover:opacity-100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                >
                  <path d="M2.2 2.2L7.8 7.8M7.8 2.2L2.2 7.8" />
                </svg>
              </button>
              {/* Minimize (Yellow) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  minimizeWindow(win.id);
                }}
                aria-label="Minimize"
                title="Minimize"
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FFBD2E] border border-[#DEA123] text-[#5A3E00] transition-transform active:scale-90"
              >
                <svg
                  viewBox="0 0 10 10"
                  className="h-2 w-2 opacity-0 transition-opacity group-hover:opacity-100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                >
                  <path d="M2 5H8" />
                </svg>
              </button>
              {/* Maximize / Zoom (Green) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMaximize(win.id);
                }}
                aria-label="Zoom"
                title="Zoom"
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#27C93F] border border-[#1AAB29] text-[#004D0D] transition-transform active:scale-90"
              >
                <svg
                  viewBox="0 0 10 10"
                  className="h-2 w-2 opacity-0 transition-opacity group-hover:opacity-100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.65"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.2 5.5V7.8H4.5M7.8 4.5V2.2H5.5" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className={`flex items-center justify-center text-[var(--os-accent)] ${
                  isWin10Mode ? 'h-4 w-4' : 'h-5 w-5'
                }`}
              >
                <Icon name={win.icon} size={14} />
              </div>
              <span
                className={`truncate text-xs font-medium tracking-wide ${
                  isLight ? 'text-slate-900' : 'text-white/95'
                }`}
              >
                {win.title}
                {language === 'ja' &&
                  APP_JA_SUBTITLES[win.appId] &&
                  !win.title.includes(APP_JA_SUBTITLES[win.appId]!) && (
                    <span className={`ml-1.5 font-normal ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                      ({APP_JA_SUBTITLES[win.appId]})
                    </span>
                  )}
              </span>
            </div>
          )}

          {/* Centered Title for macOS & Ubuntu */}
          {(isMacMode || isUbuntuMode) && (
            <div className="pointer-events-none absolute inset-x-24 flex items-center justify-center gap-2 overflow-hidden">
              <Icon name={win.icon} size={13} className="shrink-0 text-[var(--os-accent)]" />
              <span
                className={`truncate text-xs font-medium tracking-wide ${
                  isLight ? 'text-slate-800' : 'text-white/90'
                }`}
              >
                {win.title}
              </span>
            </div>
          )}

          {/* Right Side Window Controls */}
          {isMacMode ? (
            <div className="w-14 shrink-0" />
          ) : isUbuntuMode ? (
            <div className="window-controls-container flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  minimizeWindow(win.id);
                }}
                aria-label="Minimize"
                className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                  isLight ? 'hover:bg-black/10 text-slate-700' : 'hover:bg-white/10 text-white/80'
                }`}
              >
                <Icon name="Minus" size={12} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMaximize(win.id);
                }}
                aria-label="Maximize"
                className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                  isLight ? 'hover:bg-black/10 text-slate-700' : 'hover:bg-white/10 text-white/80'
                }`}
              >
                <Icon name="Maximize2" size={11} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeWindow(win.id);
                }}
                aria-label="Close"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E95420] text-white hover:bg-[#d84615] transition-colors"
              >
                <Icon name="X" size={12} />
              </button>
            </div>
          ) : isDexOrChrome ? (
            <div className="window-controls-container flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  minimizeWindow(win.id);
                }}
                aria-label="Minimize"
                className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                  isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-white/80'
                }`}
              >
                <Icon name="Minus" size={13} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMaximize(win.id);
                }}
                aria-label="Maximize"
                className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                  isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-white/80'
                }`}
              >
                <Icon name="Maximize2" size={12} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeWindow(win.id);
                }}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-rose-500 hover:text-white transition-colors"
              >
                <Icon name="X" size={13} />
              </button>
            </div>
          ) : (
            /* GlassiumOS 5 / Windows 11 / Windows 10 Caption Buttons */
            <div className="window-controls-container relative flex h-full items-stretch">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  minimizeWindow(win.id);
                }}
                aria-label="Minimize"
                title="Minimize"
                className="win-caption-btn"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 5H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>

              <div
                className="relative flex h-full items-stretch"
                onMouseEnter={handleMaxMouseEnter}
                onMouseLeave={handleMaxMouseLeave}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMaximize(win.id);
                  }}
                  aria-label="Maximize"
                  title="Maximize / Snap Layouts"
                  className="win-caption-btn"
                >
                  {win.maximized ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <rect x="1.5" y="3" width="5.5" height="5.5" stroke="currentColor" strokeWidth="1.1" />
                      <path d="M3 3V1.5H8.5V7H7" stroke="currentColor" strokeWidth="1.1" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <rect x="1.5" y="1.5" width="7" height="7" stroke="currentColor" strokeWidth="1.1" />
                    </svg>
                  )}
                </button>

                {/* Snap Layouts Flyout */}
                {showSnapFlyout && (isWin11Mode || isGlassium5Mode) && (
                  <div
                    onMouseEnter={handleMaxMouseEnter}
                    onMouseLeave={handleMaxMouseLeave}
                    onClick={(e) => e.stopPropagation()}
                    className={`snap-flyout-panel absolute top-10 right-0 z-[9999] flex w-60 flex-col gap-2.5 p-3 shadow-2xl backdrop-blur-2xl ${
                      isLight ? 'bg-white/95 text-slate-700 border border-slate-200' : 'bg-slate-900/95 text-white border border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-medium opacity-60">
                      <span>Snap Layouts</span>
                      <span>GlassiumOS 5</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {/* 50 / 50 Split */}
                      <div className="grid h-12 grid-cols-2 gap-1 bg-black/20 p-1">
                        <button
                          type="button"
                          onClick={() => applySnapLayout('left')}
                          className="bg-white/15 transition-colors hover:bg-cyan-400/60"
                          title="Snap Left 50%"
                        />
                        <button
                          type="button"
                          onClick={() => applySnapLayout('right')}
                          className="bg-white/15 transition-colors hover:bg-cyan-400/60"
                          title="Snap Right 50%"
                        />
                      </div>

                      {/* 3 Columns */}
                      <div className="grid h-12 grid-cols-3 gap-1 bg-black/20 p-1">
                        <button
                          type="button"
                          onClick={() => applySnapLayout('three-left')}
                          className="bg-white/15 transition-colors hover:bg-cyan-400/60"
                          title="Left Column"
                        />
                        <button
                          type="button"
                          onClick={() => applySnapLayout('three-center')}
                          className="bg-white/15 transition-colors hover:bg-cyan-400/60"
                          title="Center Column"
                        />
                        <button
                          type="button"
                          onClick={() => applySnapLayout('three-right')}
                          className="bg-white/15 transition-colors hover:bg-cyan-400/60"
                          title="Right Column"
                        />
                      </div>

                      {/* 4 Quadrants */}
                      <div className="grid h-12 grid-cols-2 grid-rows-2 gap-1 bg-black/20 p-1">
                        <button
                          type="button"
                          onClick={() => applySnapLayout('top-left')}
                          className="bg-white/15 transition-colors hover:bg-cyan-400/60"
                          title="Top Left"
                        />
                        <button
                          type="button"
                          onClick={() => applySnapLayout('top-right')}
                          className="bg-white/15 transition-colors hover:bg-cyan-400/60"
                          title="Top Right"
                        />
                        <button
                          type="button"
                          onClick={() => applySnapLayout('bottom-left')}
                          className="bg-white/15 transition-colors hover:bg-cyan-400/60"
                          title="Bottom Left"
                        />
                        <button
                          type="button"
                          onClick={() => applySnapLayout('bottom-right')}
                          className="bg-white/15 transition-colors hover:bg-cyan-400/60"
                          title="Bottom Right"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeWindow(win.id);
                }}
                aria-label="Close"
                title="Close"
                className="win-caption-close"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Window Content Container with Per-Shell Layout Class */}
        <div className={`window-body-shell-${shellMode} relative flex-1 overflow-hidden`}>
          {children}
        </div>
      </div>
    </>
  );
};
