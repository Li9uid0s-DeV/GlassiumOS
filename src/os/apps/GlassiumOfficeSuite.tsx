import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useOS } from '../OSContext';
import { Icon } from '../Icon';
import { globalAudio } from '../globalAudioManager';
import { getMusicSettings, saveMusicSettings } from '../proxyService';
import { MusicEqualizerPanel } from './MusicEqualizerPanel';

// ============================================================================
// 1. GLASSIUM SONIC 3D (OS全体 立体音響 & 10バンド イコライザー)
// ============================================================================
export function GlassiumSonicStudio() {
  const { resolvedAccentHex, volume, setVolume, isMuted, toggleMute } = useOS();
  const [settings, setSettings] = useState(() => getMusicSettings());
  const [spatialEnabled, setSpatialEnabled] = useState<boolean>(settings.dolbyAtmosEnabled);
  const [spatialPreset, setSpatialPreset] = useState<'theater' | 'binaural' | 'studio'>(
    settings.dolbyAtmosPreset
  );
  const [roomWidth, setRoomWidth] = useState<number>(78);
  const [bassEnhance, setBassEnhance] = useState<number>(60);
  const [clarityLevel, setClarityLevel] = useState<number>(65);
  const [statusMsg, setStatusMsg] = useState<string>('OS全体のオーディオ出力に適用中');

  const applySpatialConfig = useCallback(
    (enabled: boolean, preset: 'theater' | 'binaural' | 'studio') => {
      setSpatialEnabled(enabled);
      setSpatialPreset(preset);
      const updated = saveMusicSettings({
        dolbyAtmosEnabled: enabled,
        dolbyAtmosPreset: preset,
      });
      setSettings(updated);
      globalAudio.setDolbyAtmos(enabled, preset);
      setStatusMsg(
        enabled
          ? `3D立体音響 (${preset.toUpperCase()}) を有効化しました`
          : '3D立体音響をオフにしました (ステレオ出力)'
      );
    },
    []
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#0d1017]/90 text-white p-6 overflow-y-auto space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: resolvedAccentHex }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg"
          >
            <span className="material-symbols-rounded text-2xl">spatial_audio</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Glassium Sonic 3D
            </h1>
            <p className="text-xs text-white/55">
              OS全体の立体音響 (Web Audio 3D) &amp; 10バンド イコライザー · GlassiumOS 5 u4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60 font-mono">{statusMsg}</span>
          <button
            type="button"
            onClick={() => applySpatialConfig(!spatialEnabled, spatialPreset)}
            style={spatialEnabled ? { backgroundColor: resolvedAccentHex } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
              spatialEnabled
                ? 'text-white border-transparent shadow-lg'
                : 'bg-white/10 text-white/75 border-white/15 hover:bg-white/15'
            }`}
          >
            立体音響: {spatialEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Master Volume & 3D Spatial Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 3D Soundstage Modes */}
        <div className="lg:col-span-7 rounded-2xl apple-liquid-glass border border-white/15 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">3D 立体音響モード選択</h2>
            <span className="text-[11px] font-mono text-white/50">
              Web Audio Convolver + Haas Stereo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                {
                  id: 'binaural',
                  title: 'バイノーラル 360°',
                  desc: 'ヘッドホン・イヤホン向けの立体定位',
                  icon: 'headphones',
                },
                {
                  id: 'theater',
                  title: 'シアターサラウンド',
                  desc: '広がりのあるホール残響と低音補強',
                  icon: 'theaters',
                },
                {
                  id: 'studio',
                  title: 'スタジオモニター',
                  desc: '定位感と明瞭度を重視したモニター音場',
                  icon: 'speaker',
                },
              ] as const
            ).map((mode) => {
              const active = spatialEnabled && spatialPreset === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => applySpatialConfig(true, mode.id)}
                  style={
                    active
                      ? {
                          backgroundColor: `${resolvedAccentHex}28`,
                          borderColor: resolvedAccentHex,
                        }
                      : undefined
                  }
                  className={`p-4 rounded-xl border text-left transition flex flex-col gap-2 ${
                    active
                      ? 'text-white shadow-md'
                      : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]'
                  }`}
                >
                  <span
                    className="material-symbols-rounded text-2xl"
                    style={active ? { color: resolvedAccentHex } : undefined}
                  >
                    {mode.icon}
                  </span>
                  <div className="text-xs font-bold text-white">{mode.title}</div>
                  <div className="text-[11px] text-white/55 leading-relaxed">{mode.desc}</div>
                </button>
              );
            })}
          </div>

          {/* 3D Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">空間の広がり</span>
                <span className="font-mono text-white">{roomWidth}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={roomWidth}
                onChange={(e) => setRoomWidth(Number(e.target.value))}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">重低音ブースト</span>
                <span className="font-mono text-white">{bassEnhance}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={bassEnhance}
                onChange={(e) => setBassEnhance(Number(e.target.value))}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">ボーカル明瞭度</span>
                <span className="font-mono text-white">{clarityLevel}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={clarityLevel}
                onChange={(e) => setClarityLevel(Number(e.target.value))}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right: OS Master Output Level */}
        <div className="lg:col-span-5 rounded-2xl apple-liquid-glass border border-white/15 p-5 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">OS マスター音量 &amp; 出力状況</h2>
            <p className="text-[11px] text-white/55 mt-0.5">
              システム全体の音量とミュート状態を制御します
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80">マスター出力音量</span>
              <span className="text-lg font-mono font-bold text-white">
                {isMuted ? 'MUTE (0%)' : `${volume}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                globalAudio.setVolume(v / 100);
              }}
              style={{ accentColor: resolvedAccentHex }}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between pt-1">
              <button
                type="button"
                onClick={toggleMute}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
              >
                {isMuted ? 'ミュート解除' : 'ミュート'}
              </button>
              <span className="text-[11px] font-mono text-white/50 self-center">
                48kHz / 32-bit Float Web Audio
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 10-Band Parametric Equalizer */}
      <div className="rounded-2xl apple-liquid-glass border border-white/15 p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">10バンド イコライザー (EQ)</h2>
        <MusicEqualizerPanel
          currentTrackGenre="OS Master Audio"
          onStatusMessage={(msg) => setStatusMsg(msg)}
        />
      </div>
    </div>
  );
}

// ============================================================================
// 2. GLASSIUM WRITE (Word 文書作成アプリ)
// ============================================================================
const WRITE_TEMPLATES = [
  {
    id: 'blank',
    name: '白紙の文書',
    title: '無題の文書.docx',
    content:
      'Glassium Write 文書\n\nここにテキストを入力してください。見出し、箇条書き、文字サイズ変更、およびファイルシステムへの保存に対応しています。',
  },
  {
    id: 'report',
    name: 'プロジェクト企画書',
    title: 'GlassiumOS_5_u4_企画書.docx',
    content:
      'プロジェクト企画書 — GlassiumOS 5 u4\n\n1. 概要\n本ドキュメントはシステムの更新内容とスケジュールをまとめた企画書です。\n\n2. 主な目標\n・UIの一貫性と操作性の向上\n・オフィススイート (Write / Sheet / Stage / Note) の統合\n・天気レーダーと5分自動更新の実装',
  },
  {
    id: 'minutes',
    name: '会議議事録',
    title: '定例会議_議事録.docx',
    content:
      '定例ミーティング議事録\n\n日時: 2025年5月\n参加者: 開発チーム全員\n\n■ アジェンダ\n1. 前回タスクの進捗確認\n2. 音楽アプリのUI改善と歌詞翻訳の確認\n3. 次回リリースに向けたテスト項目',
  },
];

export function GlassiumWriteApp() {
  const { resolvedAccentHex, fsCreateFile } = useOS();
  const [docTitle, setDocTitle] = useState(WRITE_TEMPLATES[1].title);
  const [content, setContent] = useState(WRITE_TEMPLATES[1].content);
  const [fontSize, setFontSize] = useState<number>(15);
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string>('');

  const stats = useMemo(() => {
    const chars = content.length;
    const charsNoSpace = content.replace(/\s+/g, '').length;
    const lines = content.split('\n').length;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return { chars, charsNoSpace, lines, words };
  }, [content]);

  const handleSaveToFs = () => {
    const safeName = docTitle.endsWith('.txt') || docTitle.endsWith('.docx') ? docTitle : `${docTitle}.docx`;
    fsCreateFile('/home/user/Documents', safeName, content);
    setSaveBanner(`Documents/${safeName} に保存しました`);
    setTimeout(() => setSaveBanner(''), 3000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#10131a] text-white select-none overflow-hidden">
      {/* Ribbon Toolbar */}
      <div className="px-4 py-2.5 apple-liquid-glass border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            style={{ backgroundColor: resolvedAccentHex }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow"
          >
            W
          </div>
          <input
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="bg-white/[0.06] border border-white/15 rounded-lg px-2.5 py-1 text-xs font-bold text-white outline-none w-48"
          />
          <div className="flex items-center gap-1">
            {WRITE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setDocTitle(tpl.title);
                  setContent(tpl.content);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-[11px] text-white/75 hover:text-white transition"
              >
                {tpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Formatting Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value as 'sans' | 'serif' | 'mono')}
            className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none"
          >
            <option value="sans">ゴシック (Sans)</option>
            <option value="serif">明朝 (Serif)</option>
            <option value="mono">等幅 (Mono)</option>
          </select>

          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none"
          >
            {[12, 14, 15, 16, 18, 20, 24, 28].map((sz) => (
              <option key={sz} value={sz}>
                {sz} px
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsBold((b) => !b)}
            style={isBold ? { backgroundColor: resolvedAccentHex } : undefined}
            className={`w-7 h-7 rounded-lg text-xs font-bold ${
              isBold ? 'text-white' : 'bg-white/5 text-white/70'
            }`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => setIsItalic((i) => !i)}
            style={isItalic ? { backgroundColor: resolvedAccentHex } : undefined}
            className={`w-7 h-7 rounded-lg text-xs italic font-serif ${
              isItalic ? 'text-white' : 'bg-white/5 text-white/70'
            }`}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => setIsUnderline((u) => !u)}
            style={isUnderline ? { backgroundColor: resolvedAccentHex } : undefined}
            className={`w-7 h-7 rounded-lg text-xs underline ${
              isUnderline ? 'text-white' : 'bg-white/5 text-white/70'
            }`}
          >
            U
          </button>

          <div className="h-4 w-px bg-white/15 mx-1" />

          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => setTextAlign(align)}
              style={textAlign === align ? { backgroundColor: resolvedAccentHex } : undefined}
              className={`px-2 py-1 rounded-lg text-[11px] ${
                textAlign === align ? 'text-white' : 'bg-white/5 text-white/70'
              }`}
            >
              {align === 'left' ? '左揃え' : align === 'center' ? '中央' : '右揃え'}
            </button>
          ))}

          <button
            type="button"
            onClick={handleSaveToFs}
            style={{ backgroundColor: resolvedAccentHex }}
            className="ml-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow"
          >
            保存
          </button>
        </div>
      </div>

      {/* Document Page Canvas */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex justify-center bg-[#0b0d13]">
        <div className="w-full max-w-3xl min-h-[540px] rounded-2xl bg-[#161922] border border-white/15 shadow-2xl p-8 sm:p-10 flex flex-col">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              fontSize: `${fontSize}px`,
              textAlign,
              fontWeight: isBold ? 700 : 400,
              fontStyle: isItalic ? 'italic' : 'normal',
              textDecoration: isUnderline ? 'underline' : 'none',
            }}
            className={`w-full flex-1 bg-transparent text-white/95 outline-none resize-none leading-relaxed ${
              fontFamily === 'serif'
                ? 'font-serif'
                : fontFamily === 'mono'
                ? 'font-mono'
                : 'font-sans'
            }`}
            placeholder="ここに文書を入力..."
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-1.5 bg-black/50 border-t border-white/10 flex items-center justify-between text-[11px] text-white/55 font-mono">
        <div className="flex items-center gap-4">
          <span>文字数: {stats.chars}</span>
          <span>空白除く: {stats.charsNoSpace}</span>
          <span>行数: {stats.lines}</span>
          <span>単語数: {stats.words}</span>
        </div>
        <div>{saveBanner || 'Glassium Write · GlassiumOS 5 u4'}</div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. GLASSIUM SHEET (Excel 表計算アプリ)
// ============================================================================
const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROWS = Array.from({ length: 16 }, (_, i) => i + 1);

const INITIAL_SHEET_DATA: Record<string, string> = {
  A1: '項目',
  B1: '第1四半期',
  C1: '第2四半期',
  D1: '合計',
  A2: 'クラウド売上',
  B2: '1250',
  C2: '1480',
  D2: '=SUM(B2:C2)',
  A3: 'ライセンス',
  B3: '840',
  C3: '920',
  D3: '=SUM(B3:C3)',
  A4: 'サポート契約',
  B4: '430',
  C4: '510',
  D4: '=SUM(B4:C4)',
  A5: '合計',
  B5: '=SUM(B2:B4)',
  C5: '=SUM(C2:C4)',
  D5: '=SUM(D2:D4)',
  A6: '平均',
  B6: '=AVERAGE(B2:B4)',
  C6: '=AVERAGE(C2:C4)',
  D6: '=AVERAGE(D2:D4)',
};

function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.trim().toUpperCase().split(':');
  if (parts.length !== 2) return [rangeStr.trim().toUpperCase()];
  const startMatch = parts[0].match(/^([A-H])(\d+)$/);
  const endMatch = parts[1].match(/^([A-H])(\d+)$/);
  if (!startMatch || !endMatch) return [];
  const c1 = COLS.indexOf(startMatch[1]);
  const r1 = parseInt(startMatch[2], 10);
  const c2 = COLS.indexOf(endMatch[1]);
  const r2 = parseInt(endMatch[2], 10);
  const cells: string[] = [];
  for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
      cells.push(`${COLS[c]}${r}`);
    }
  }
  return cells;
}

function evaluateCell(
  cellId: string,
  cells: Record<string, string>,
  visited = new Set<string>()
): string {
  if (visited.has(cellId)) return '#REF!';
  visited.add(cellId);
  const raw = (cells[cellId] || '').trim();
  if (!raw.startsWith('=')) return raw;

  const expr = raw.slice(1).trim().toUpperCase();
  const fnMatch = expr.match(/^(SUM|AVERAGE|AVG|MAX|MIN)\(([^)]+)\)$/);
  if (fnMatch) {
    const fn = fnMatch[1];
    const arg = fnMatch[2];
    const targetCells = arg.includes(':')
      ? expandRange(arg)
      : arg.split(',').map((s) => s.trim());
    const nums = targetCells
      .map((cid) => parseFloat(evaluateCell(cid, cells, new Set(visited))))
      .filter((n) => !Number.isNaN(n));
    if (nums.length === 0) return '0';
    if (fn === 'SUM') return String(nums.reduce((a, b) => a + b, 0));
    if (fn === 'AVERAGE' || fn === 'AVG')
      return String(Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100);
    if (fn === 'MAX') return String(Math.max(...nums));
    if (fn === 'MIN') return String(Math.min(...nums));
  }

  // Basic cell arithmetic e.g. =B2+C2
  const replaced = expr.replace(/\b([A-H]\d+)\b/g, (m) => {
    const val = parseFloat(evaluateCell(m, cells, new Set(visited)));
    return Number.isNaN(val) ? '0' : String(val);
  });
  if (/^[\d+\-*/().\s]+$/.test(replaced)) {
    try {
      const res = Function(`"use strict"; return (${replaced});`)();
      if (typeof res === 'number' && Number.isFinite(res)) {
        return String(Math.round(res * 100) / 100);
      }
    } catch {
      return '#ERR';
    }
  }
  return raw;
}

export function GlassiumSheetApp() {
  const { resolvedAccentHex, fsCreateFile } = useOS();
  const [sheetName, setSheetName] = useState('四半期売上集計.xlsx');
  const [cells, setCells] = useState<Record<string, string>>(INITIAL_SHEET_DATA);
  const [selectedCell, setSelectedCell] = useState<string>('D5');
  const [statusMsg, setStatusMsg] = useState('数式 (=SUM, =AVERAGE, =MAX, =MIN, 四則演算) 対応');

  const updateCellValue = (cellId: string, val: string) => {
    setCells((prev) => ({ ...prev, [cellId]: val }));
  };

  const exportCsv = () => {
    const lines = ROWS.map((r) =>
      COLS.map((c) => {
        const val = evaluateCell(`${c}${r}`, cells);
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csvContent = lines.join('\n');
    const safeName = sheetName.replace(/\.xlsx$/i, '') + '.csv';
    fsCreateFile('/home/user/Documents', safeName, csvContent);
    setStatusMsg(`Documents/${safeName} にCSV出力しました`);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0f1318] text-white select-none overflow-hidden">
      {/* Header & Formula Bar */}
      <div className="p-3 apple-liquid-glass border-b border-white/10 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: resolvedAccentHex }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow"
            >
              X
            </div>
            <input
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              className="bg-white/[0.06] border border-white/15 rounded-lg px-2.5 py-1 text-xs font-bold text-white outline-none w-48"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCells({})}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white/80"
            >
              クリア
            </button>
            <button
              type="button"
              onClick={() => setCells(INITIAL_SHEET_DATA)}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white/80"
            >
              サンプル読込
            </button>
            <button
              type="button"
              onClick={exportCsv}
              style={{ backgroundColor: resolvedAccentHex }}
              className="px-3.5 py-1 rounded-lg text-xs font-bold text-white shadow"
            >
              CSV保存
            </button>
          </div>
        </div>

        {/* Formula Bar */}
        <div className="flex items-center gap-2">
          <div className="w-14 py-1 px-2 rounded-lg bg-black/50 border border-white/15 text-center font-mono text-xs font-bold text-white">
            {selectedCell}
          </div>
          <span className="text-xs font-mono italic text-white/50">fx</span>
          <input
            value={cells[selectedCell] || ''}
            onChange={(e) => updateCellValue(selectedCell, e.target.value)}
            placeholder="値または数式を入力 (例: =SUM(B2:B4))"
            className="flex-1 bg-black/50 border border-white/15 rounded-lg px-3 py-1 text-xs font-mono text-white outline-none"
          />
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-white/[0.05] text-white/60 font-mono">
              <th className="w-10 py-1.5 border border-white/10 text-center">#</th>
              {COLS.map((c) => (
                <th key={c} className="min-w-[100px] py-1.5 border border-white/10 text-center">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r}>
                <td className="bg-white/[0.03] border border-white/10 text-center font-mono text-white/50 py-1">
                  {r}
                </td>
                {COLS.map((c) => {
                  const id = `${c}${r}`;
                  const isSel = selectedCell === id;
                  const evaluated = evaluateCell(id, cells);
                  const isHeaderRow = r === 1;
                  return (
                    <td
                      key={id}
                      onClick={() => setSelectedCell(id)}
                      style={
                        isSel
                          ? {
                              outline: `2px solid ${resolvedAccentHex}`,
                              backgroundColor: `${resolvedAccentHex}18`,
                            }
                          : undefined
                      }
                      className={`border border-white/10 px-2 py-1 cursor-cell ${
                        isHeaderRow ? 'bg-white/[0.06] font-bold text-white' : 'text-white/90'
                      }`}
                    >
                      {isSel ? (
                        <input
                          autoFocus
                          value={cells[id] || ''}
                          onChange={(e) => updateCellValue(id, e.target.value)}
                          className="w-full bg-transparent outline-none text-white font-mono"
                        />
                      ) : (
                        <span className="block truncate">{evaluated}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-1.5 bg-black/50 border-t border-white/10 flex items-center justify-between text-[11px] text-white/55 font-mono">
        <span>{statusMsg}</span>
        <span>
          選択セル {selectedCell}: {evaluateCell(selectedCell, cells) || '空'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// 4. GLASSIUM STAGE (PowerPoint プレゼンテーションアプリ)
// ============================================================================
interface SlideItem {
  id: string;
  title: string;
  subtitle: string;
  bullets: string[];
  themeGradient: string;
}

const INITIAL_SLIDES: SlideItem[] = [
  {
    id: 'slide-1',
    title: 'GlassiumOS 5 u4 アップデート',
    subtitle: 'Liquid Glass デザイン & オフィススイート統合',
    bullets: [
      'Spotify風 Liquid Glass 音楽アプリ & 多言語歌詞翻訳',
      '5分自動更新・雨雲レーダー対応の天気アプリ',
      'Microsoft Store風 App Store & .tsx アプリ実行環境',
    ],
    themeGradient: 'from-cyan-700 via-indigo-900 to-slate-950',
  },
  {
    id: 'slide-2',
    title: '音楽とオーディオの進化',
    subtitle: 'Glassium Groove & Glassium Sonic 3D',
    bullets: [
      'OSアクセントカラーと完全連動するUI',
      'Spotify / Apple Music / YouTube Music からプレイリスト取込',
      'OS全体の3D立体音響と10バンドEQ制御',
    ],
    themeGradient: 'from-rose-700 via-purple-900 to-slate-950',
  },
  {
    id: 'slide-3',
    title: 'Glassium Office スイート',
    subtitle: 'Write / Sheet / Stage / Note',
    bullets: [
      'Glassium Write: 文書作成とファイル保存',
      'Glassium Sheet: 関数計算とCSV出力',
      'Glassium Stage & Note: プレゼンとノート管理',
    ],
    themeGradient: 'from-emerald-700 via-teal-900 to-slate-950',
  },
];

export function GlassiumStageApp() {
  const { resolvedAccentHex } = useOS();
  const [slides, setSlides] = useState<SlideItem[]>(INITIAL_SLIDES);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);

  const currentSlide = slides[activeIdx] || slides[0];

  const updateCurrentSlide = (patch: Partial<SlideItem>) => {
    setSlides((prev) => prev.map((s, idx) => (idx === activeIdx ? { ...s, ...patch } : s)));
  };

  const addSlide = () => {
    const newSlide: SlideItem = {
      id: `slide-${Date.now()}`,
      title: `新規スライド ${slides.length + 1}`,
      subtitle: 'サブタイトルを入力',
      bullets: ['ポイント 1', 'ポイント 2', 'ポイント 3'],
      themeGradient: 'from-blue-700 via-indigo-900 to-slate-950',
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveIdx(slides.length);
  };

  if (isPresenting) {
    return (
      <div
        className={`flex flex-col justify-between h-full w-full p-12 bg-gradient-to-br ${currentSlide.themeGradient} text-white select-none`}
      >
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono text-white/60">
            SLIDE {activeIdx + 1} / {slides.length} · Glassium Stage
          </span>
          <button
            type="button"
            onClick={() => setIsPresenting(false)}
            className="px-4 py-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-xs font-bold"
          >
            発表を終了
          </button>
        </div>

        <div className="max-w-4xl mx-auto w-full space-y-6 my-auto">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">{currentSlide.title}</h1>
          <p className="text-xl text-white/80 font-medium">{currentSlide.subtitle}</p>
          <ul className="space-y-3 pt-4 text-lg text-white/90 list-disc pl-6">
            {currentSlide.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            disabled={activeIdx === 0}
            onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
            className="px-5 py-2 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 text-xs font-bold"
          >
            ← 前へ
          </button>
          <button
            type="button"
            disabled={activeIdx === slides.length - 1}
            onClick={() => setActiveIdx((i) => Math.min(slides.length - 1, i + 1))}
            className="px-5 py-2 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 text-xs font-bold"
          >
            次へ →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#11131a] text-white select-none overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-2.5 apple-liquid-glass border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            style={{ backgroundColor: resolvedAccentHex }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow"
          >
            P
          </div>
          <span className="text-sm font-bold text-white">Glassium Stage</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addSlide}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
          >
            + スライド追加
          </button>
          <button
            type="button"
            onClick={() => setIsPresenting(true)}
            style={{ backgroundColor: resolvedAccentHex }}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow flex items-center gap-1"
          >
            <span className="material-symbols-rounded text-sm">slideshow</span>
            <span>スライドショー開始</span>
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Slide Thumbnails Rail */}
        <div className="w-52 border-r border-white/10 p-3 overflow-y-auto space-y-2.5 bg-black/25">
          {slides.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => setActiveIdx(idx)}
              style={
                idx === activeIdx
                  ? { borderColor: resolvedAccentHex, backgroundColor: `${resolvedAccentHex}20` }
                  : undefined
              }
              className={`p-3 rounded-xl border cursor-pointer transition ${
                idx === activeIdx
                  ? 'text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]'
              }`}
            >
              <div className="text-[10px] font-mono text-white/45">SLIDE {idx + 1}</div>
              <div className="text-xs font-bold truncate mt-0.5">{s.title}</div>
            </div>
          ))}
        </div>

        {/* Slide Canvas Editor */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto flex flex-col items-center justify-center">
          <div
            className={`w-full max-w-3xl aspect-video rounded-2xl bg-gradient-to-br ${currentSlide.themeGradient} border border-white/20 shadow-2xl p-8 sm:p-10 flex flex-col justify-center space-y-4`}
          >
            <input
              value={currentSlide.title}
              onChange={(e) => updateCurrentSlide({ title: e.target.value })}
              className="bg-transparent text-2xl sm:text-4xl font-black text-white outline-none border-b border-transparent focus:border-white/30 pb-1"
            />
            <input
              value={currentSlide.subtitle}
              onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })}
              className="bg-transparent text-sm sm:text-lg text-white/80 outline-none border-b border-transparent focus:border-white/30 pb-1"
            />
            <textarea
              value={currentSlide.bullets.join('\n')}
              onChange={(e) =>
                updateCurrentSlide({ bullets: e.target.value.split('\n') })
              }
              rows={4}
              className="bg-black/20 rounded-xl p-3 text-xs sm:text-sm text-white/90 outline-none border border-white/10 resize-none leading-relaxed"
              placeholder="箇条書き (1行につき1項目)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. GLASSIUM NOTE (OneNote デジタルノートアプリ)
// ============================================================================
interface NotePage {
  id: string;
  section: string;
  title: string;
  body: string;
  checklist: { text: string; done: boolean }[];
}

const INITIAL_NOTES: NotePage[] = [
  {
    id: 'note-1',
    section: '開発メモ',
    title: 'GlassiumOS 5 u4 リリースノート',
    body: '・音楽アプリの検索・詳細画面・設定画面を刷新\n・歌詞の自動翻訳 (日↔英 / 多言語→日) を実装\n・天気アプリの地点検索と雨雲レーダーを追加',
    checklist: [
      { text: '動的アクセントカラーの修正確認', done: true },
      { text: 'ロック画面の5番目の時計ファイル適用', done: true },
      { text: 'App Storeへのオフィスアプリ追加', done: true },
    ],
  },
  {
    id: 'note-2',
    section: 'アイデア',
    title: 'カスタム .tsx アプリ構想',
    body: 'App Store からユーザー独自の .tsx コンポーネントをアップロードしてウィンドウ内で即座に動かせる機能。',
    checklist: [
      { text: 'サンプルTSXテンプレートの用意', done: true },
      { text: 'サンドボックス実行エンジンの統合', done: true },
    ],
  },
];

export function GlassiumNoteApp() {
  const { resolvedAccentHex } = useOS();
  const [pages, setPages] = useState<NotePage[]>(INITIAL_NOTES);
  const [activePageId, setActivePageId] = useState<string>(INITIAL_NOTES[0].id);
  const [newTodoText, setNewTodoText] = useState('');

  const activePage = pages.find((p) => p.id === activePageId) || pages[0];

  const updateActivePage = (patch: Partial<NotePage>) => {
    setPages((prev) =>
      prev.map((p) => (p.id === activePage.id ? { ...p, ...patch } : p))
    );
  };

  const addNewPage = () => {
    const np: NotePage = {
      id: `note-${Date.now()}`,
      section: '一般',
      title: '新しいページ',
      body: '',
      checklist: [],
    };
    setPages((prev) => [np, ...prev]);
    setActivePageId(np.id);
  };

  return (
    <div className="flex h-full w-full bg-[#101218] text-white select-none overflow-hidden">
      {/* Left Pages Sidebar */}
      <div className="w-60 border-r border-white/10 p-3 flex flex-col justify-between bg-black/30">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div
                style={{ backgroundColor: resolvedAccentHex }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs"
              >
                N
              </div>
              <span className="text-xs font-bold text-white">Glassium Note</span>
            </div>
            <button
              type="button"
              onClick={addNewPage}
              style={{ color: resolvedAccentHex }}
              className="text-xs font-bold hover:underline"
            >
              + 新規
            </button>
          </div>

          <div className="space-y-1">
            {pages.map((p) => {
              const active = p.id === activePage.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePageId(p.id)}
                  style={
                    active
                      ? { backgroundColor: `${resolvedAccentHex}25`, borderColor: resolvedAccentHex }
                      : undefined
                  }
                  className={`w-full p-2.5 rounded-xl border text-left transition ${
                    active
                      ? 'text-white'
                      : 'border-transparent bg-white/[0.03] text-white/70 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="text-[10px] font-mono text-white/45">{p.section}</div>
                  <div className="text-xs font-bold truncate mt-0.5">{p.title}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-[10px] font-mono text-white/40 px-1">GlassiumOS 5 u4</div>
      </div>

      {/* Main Note Canvas */}
      <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
        <div className="border-b border-white/10 pb-3 space-y-1">
          <input
            value={activePage.section}
            onChange={(e) => updateActivePage({ section: e.target.value })}
            className="bg-transparent text-xs font-mono text-white/50 outline-none"
          />
          <input
            value={activePage.title}
            onChange={(e) => updateActivePage({ title: e.target.value })}
            className="w-full bg-transparent text-2xl font-extrabold text-white outline-none"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Freeform Text Note */}
          <div className="lg:col-span-7 space-y-2">
            <div className="text-xs font-bold text-white/70">ノート本文</div>
            <textarea
              value={activePage.body}
              onChange={(e) => updateActivePage({ body: e.target.value })}
              rows={12}
              className="w-full rounded-2xl bg-white/[0.04] border border-white/10 p-4 text-xs sm:text-sm text-white outline-none leading-relaxed resize-none"
              placeholder="自由にメモを入力..."
            />
          </div>

          {/* Checklist */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold text-white/70">チェックリスト</div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-2.5">
              {activePage.checklist.map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2.5 text-xs text-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => {
                      const next = activePage.checklist.map((c, i) =>
                        i === idx ? { ...c, done: !c.done } : c
                      );
                      updateActivePage({ checklist: next });
                    }}
                    style={{ accentColor: resolvedAccentHex }}
                    className="rounded"
                  />
                  <span className={item.done ? 'line-through text-white/45' : 'text-white/90'}>
                    {item.text}
                  </span>
                </label>
              ))}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTodoText.trim()) return;
                  updateActivePage({
                    checklist: [
                      ...activePage.checklist,
                      { text: newTodoText.trim(), done: false },
                    ],
                  });
                  setNewTodoText('');
                }}
                className="flex gap-1.5 pt-2"
              >
                <input
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  placeholder="タスクを追加..."
                  className="flex-1 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  style={{ backgroundColor: resolvedAccentHex }}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                >
                  追加
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. GLASSIUM TSX APP RUNNER (GlassiumOS用 .tsx アプリのアップロード＆実行環境)
// ============================================================================
export const DEFAULT_SAMPLE_TSX_CODE = `export default function CustomGlassiumApp() {
  const [count, setCount] = useState(0);
  const [note, setNote] = useState('GlassiumOS 5 u4 カスタムTSXアプリへようこそ！');

  return React.createElement(
    'div',
    { className: 'p-6 space-y-4 text-white' },
    React.createElement('h2', { className: 'text-xl font-bold' }, '🚀 マイ TSX アプリ'),
    React.createElement('p', { className: 'text-xs text-white/70' }, note),
    React.createElement(
      'div',
      { className: 'flex items-center gap-3' },
      React.createElement(
        'button',
        {
          onClick: () => setCount((c) => c + 1),
          className: 'px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs',
        },
        'カウントアップ: ' + count
      ),
      React.createElement(
        'button',
        {
          onClick: () => setCount(0),
          className: 'px-3 py-2 rounded-xl bg-white/10 text-white text-xs',
        },
        'リセット'
      )
    )
  );
}`;

/**
 * Lightweight JSX + TypeScript to executable React.createElement compiler
 * so uploaded .tsx files with either JSX (`<div>...</div>`) or `React.createElement` run cleanly in the browser.
 */
function transpileTsxSourceToComponent(tsxSource: string): React.ComponentType {
  let code = tsxSource || DEFAULT_SAMPLE_TSX_CODE;

  // Strip import statements
  code = code.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  code = code.replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '');

  // Strip interface / type declarations
  code = code.replace(/^\s*(?:export\s+)?interface\s+\w+\s*\{[\s\S]*?\}\s*$/gm, '');
  code = code.replace(/^\s*(?:export\s+)?type\s+\w+\s*=[^;]+;\s*$/gm, '');

  // Strip generic type params on hooks e.g. useState<number>(0) -> useState(0)
  code = code.replace(/\b(useState|useRef|useMemo|useCallback)<[^>]+>\(/g, '$1(');

  // Convert simple JSX tags if present into React.createElement calls (up to 4 nesting passes)
  // Self-closing tags: <input className="a" />
  code = code.replace(
    /<([A-Za-z][A-Za-z0-9.]*)\s+([^>]*?)\/>/g,
    (_m, tag, attrs) => {
      const propPairs = attrs
        .trim()
        .replace(/([a-zA-Z0-9_]+)=("[^"]*"|'[^']*'|\{[^}]*\})/g, (_a: string, k: string, v: string) => {
          const cleanV = v.startsWith('{') && v.endsWith('}') ? v.slice(1, -1) : v;
          return `${k}: ${cleanV}, `;
        });
      const tagExpr = /^[a-z]/.test(tag) ? `'${tag}'` : tag;
      return `React.createElement(${tagExpr}, { ${propPairs} })`;
    }
  );

  for (let pass = 0; pass < 5; pass++) {
    const prev = code;
    code = code.replace(
      /<([A-Za-z][A-Za-z0-9.]*)(\s+[^>]*)?>([^<]*)<\/\1>/g,
      (_m, tag, attrs, children) => {
        let propsObj = 'null';
        if (attrs && attrs.trim()) {
          const pairs: string[] = [];
          attrs.replace(
            /([a-zA-Z0-9_]+)=("[^"]*"|'[^']*'|\{[^}]*\})/g,
            (_a: string, k: string, v: string) => {
              const cleanV = v.startsWith('{') && v.endsWith('}') ? v.slice(1, -1) : v;
              pairs.push(`${k}: ${cleanV}`);
              return '';
            }
          );
          propsObj = `{ ${pairs.join(', ')} }`;
        }
        const trimmedChild = (children || '').trim();
        let childExpr = 'null';
        if (trimmedChild) {
          if (trimmedChild.startsWith('{') && trimmedChild.endsWith('}')) {
            childExpr = trimmedChild.slice(1, -1);
          } else if (trimmedChild.includes('React.createElement')) {
            childExpr = trimmedChild;
          } else {
            childExpr = JSON.stringify(trimmedChild);
          }
        }
        const tagExpr = /^[a-z]/.test(tag) ? `'${tag}'` : tag;
        return `React.createElement(${tagExpr}, ${propsObj}, ${childExpr})`;
      }
    );
    if (code === prev) break;
  }

  // Replace `export default function Name` or `export function Name`
  let fnName = 'CustomAppComponent';
  const namedMatch = code.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
  if (namedMatch) {
    fnName = namedMatch[1];
    code = code.replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/, 'function $1');
  } else {
    code = code.replace(/export\s+default\s+/, 'const CustomAppComponent = ');
  }
  code = code.replace(/\bexport\s+/g, '');

  const factory = new Function(
    'React',
    'useState',
    'useEffect',
    'useMemo',
    'useRef',
    'useCallback',
    'Icon',
    'useOS',
    `${code}\nreturn typeof ${fnName} !== 'undefined' ? ${fnName} : CustomAppComponent;`
  );

  return factory(
    React,
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
    Icon,
    useOS
  );
}

export function GlassiumTsxRunnerApp({
  initialCode,
  initialTitle,
}: {
  initialCode?: string;
  initialTitle?: string;
}) {
  const { resolvedAccentHex, installApp } = useOS();
  const [tsxCode, setTsxCode] = useState<string>(initialCode || DEFAULT_SAMPLE_TSX_CODE);
  const [appName, setAppName] = useState<string>(initialTitle || 'マイ TSX アプリ');
  const [showCodeEditor, setShowCodeEditor] = useState<boolean>(!initialCode);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialCode) setTsxCode(initialCode);
    if (initialTitle) setAppName(initialTitle);
  }, [initialCode, initialTitle]);

  const CompiledComponent = useMemo(() => {
    try {
      setErrorMsg('');
      return transpileTsxSourceToComponent(tsxCode);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'TSXコンパイルエラー');
      return null;
    }
  }, [tsxCode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setTsxCode(text);
      const baseName = file.name.replace(/\.(tsx|ts|jsx|js)$/i, '');
      setAppName(baseName);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0e1118] text-white select-none overflow-hidden">
      {/* Top Bar */}
      <div className="px-4 py-2.5 apple-liquid-glass border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            style={{ backgroundColor: resolvedAccentHex }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-mono text-xs font-bold"
          >
            TSX
          </div>
          <span className="text-xs font-bold text-white">{appName}</span>
          <span className="text-[10px] font-mono text-white/45">GlassiumOS 5 u4 Runtime</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".tsx,.ts,.jsx,.js"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
          >
            .tsx ファイルを選択
          </button>
          <button
            type="button"
            onClick={() => setShowCodeEditor((v) => !v)}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
          >
            {showCodeEditor ? 'エディタを隠す' : 'TSXコードを編集'}
          </button>
          <button
            type="button"
            onClick={() => {
              installApp({
                id: `tsx-${Date.now()}`,
                name: appName,
                author: 'User TSX App',
                category: 'utilities',
                icon: 'Code',
                rating: 5.0,
                size: '12 KB',
                version: '5.0 u4',
                description: 'ユーザー作成の .tsx アプリケーション',
                tsxSource: tsxCode,
              });
            }}
            style={{ backgroundColor: resolvedAccentHex }}
            className="px-3.5 py-1 rounded-lg text-xs font-bold text-white shadow"
          >
            OSアプリとして登録
          </button>
        </div>
      </div>

      {/* Main Split Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {showCodeEditor && (
          <div className="w-1/2 border-r border-white/10 flex flex-col bg-black/40">
            <div className="px-3 py-1.5 border-b border-white/10 text-[11px] font-mono text-white/60">
              ソースコード (.tsx)
            </div>
            <textarea
              value={tsxCode}
              onChange={(e) => setTsxCode(e.target.value)}
              className="flex-1 w-full bg-transparent p-3 text-xs font-mono text-emerald-300 outline-none resize-none"
              spellCheck={false}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto relative">
          {errorMsg ? (
            <div className="p-6 text-xs font-mono text-rose-400 bg-rose-950/30 m-4 rounded-xl border border-rose-500/30">
              コンパイルエラー: {errorMsg}
            </div>
          ) : CompiledComponent ? (
            <CompiledComponent />
          ) : null}
        </div>
      </div>
    </div>
  );
}
