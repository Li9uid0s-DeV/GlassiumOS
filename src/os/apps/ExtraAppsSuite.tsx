import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOS } from '../OSContext';
import { requestAIChat } from '../aiClient';

export interface ExtraAppMeta {
  id: string;
  name: string;
  nameJa: string;
  icon: string;
  category: 'utilities' | 'games';
  parentApp: string;
  description: string;
}

export const EXTRA_APPS_LIST: ExtraAppMeta[] = [
  { id: 'paint', name: 'Creative & Paint Studio', nameJa: 'ペイント・カラー制作', icon: 'Palette', category: 'utilities', parentApp: 'paint', description: 'キャンバス描画・カラーピッカー・QRコード作成を統合した制作ツール。' },
  { id: 'colorpicker', name: 'Color Mixer', nameJa: 'カラーピッカー', icon: 'Palette', category: 'utilities', parentApp: 'paint', description: 'RGB数値調整とHEXカラーコード出力。' },
  { id: 'qrcode', name: 'QR Generator', nameJa: 'QRコード作成', icon: 'Grid3x3', category: 'utilities', parentApp: 'paint', description: 'URLやテキストからQRマトリクスを生成。' },
  { id: 'pomodoro', name: 'Pomodoro Timer', nameJa: 'ポモドーロタイマー', icon: 'Clock', category: 'utilities', parentApp: 'clock', description: '25分集中と5分休憩のサイクルタイマー。' },
  { id: 'worldclock', name: 'World Clock', nameJa: '世界時計', icon: 'Globe', category: 'utilities', parentApp: 'clock', description: '主要都市の現在時刻を一覧表示。' },
  { id: 'unitconverter', name: 'Unit Converter', nameJa: '単位変換', icon: 'SlidersHorizontal', category: 'utilities', parentApp: 'calculator', description: '長さ・重さ・温度・データ容量の変換。' },
  { id: 'bmi', name: 'BMI & Health', nameJa: 'BMI・健康計算', icon: 'Activity', category: 'utilities', parentApp: 'calculator', description: '身長と体重からBMI指数と適正体重を算出。' },
  { id: 'expense', name: 'Expense Ledger', nameJa: '収支・家計簿', icon: 'Calculator', category: 'utilities', parentApp: 'calculator', description: '収入と支出の記録と残高集計。' },
  { id: 'kanban', name: 'Kanban Board', nameJa: 'カンバン管理', icon: 'LayoutGrid', category: 'utilities', parentApp: 'calendar', description: '未着手・進行中・完了の3段階タスク管理。' },
  { id: 'habit', name: 'Habit Tracker', nameJa: '習慣トラッカー', icon: 'CheckCircle2', category: 'utilities', parentApp: 'calendar', description: '曜日ごとの習慣達成チェック表。' },
  { id: 'whiteboard', name: 'Idea Notes', nameJa: 'アイデアメモ', icon: 'PenTool', category: 'utilities', parentApp: 'calendar', description: '短文メモの整理とAIによるタスク分解。' },
  { id: 'jsonformat', name: 'JSON Formatter', nameJa: 'JSON整形・検証', icon: 'Code2', category: 'utilities', parentApp: 'studio', description: 'JSONデータの整形・圧縮・構文チェック。' },
  { id: 'regex', name: 'Regex Tester', nameJa: '正規表現テスト', icon: 'Search', category: 'utilities', parentApp: 'studio', description: '正規表現パターンの一致確認とAIパターン生成。' },
  { id: 'base64', name: 'Base64 & URL', nameJa: 'Base64・URL変換', icon: 'Code2', category: 'utilities', parentApp: 'studio', description: 'Base64およびURLエンコード・デコード。' },
  { id: 'morse', name: 'Morse Code', nameJa: 'モールス信号変換', icon: 'Zap', category: 'utilities', parentApp: 'studio', description: '英数字テキストとモールス符号の相互変換。' },
  { id: 'passgen', name: 'Password Generator', nameJa: 'パスワード生成', icon: 'Key', category: 'utilities', parentApp: 'studio', description: '文字数と文字種を指定して安全なパスワードを生成。' },
  { id: 'markdown', name: 'Markdown View', nameJa: 'Markdown表示', icon: 'FileText', category: 'utilities', parentApp: 'notepad', description: 'Markdown記述とプレビューの並列表示。' },
  { id: 'wordcount', name: 'Text Counter', nameJa: '文字数カウント', icon: 'FileText', category: 'utilities', parentApp: 'notepad', description: '文字数・空白除外・単語数・行数の集計。' },
  { id: 'diff', name: 'Text Diff', nameJa: 'テキスト差分比較', icon: 'Layers', category: 'utilities', parentApp: 'notepad', description: '2つのテキストを行単位で比較。' },
  { id: 'drumpad', name: 'Drum Pad', nameJa: 'ドラムパッド', icon: 'Music', category: 'utilities', parentApp: 'synth', description: '9種類のシンセドラム音源パッド。' },
  { id: 'tuner', name: 'Tone Generator', nameJa: '周波数発振器', icon: 'Volume2', category: 'utilities', parentApp: 'synth', description: '80Hz〜1200Hzの基準音ジェネレーター。' },
  { id: 'minesweeper', name: 'Minesweeper', nameJa: 'マインスイーパー', icon: 'Gamepad2', category: 'games', parentApp: 'game', description: '地雷の位置を推理するグリッドパズル。' },
  { id: 'tictactoe', name: 'Tic-Tac-Toe', nameJa: '〇×ゲーム', icon: 'Grid3x3', category: 'games', parentApp: 'game', description: '3×3マスの対戦・AIゲーム。' },
  { id: 'memory', name: 'Memory Match', nameJa: '神経衰弱', icon: 'Sparkles', category: 'games', parentApp: 'game', description: '同じ絵柄のペアを揃える記憶ゲーム。' },
  { id: 'typing', name: 'Typing Practice', nameJa: 'タイピング練習', icon: 'SquareTerminal', category: 'games', parentApp: 'game', description: '入力速度(WPM)と正確性を測定。' },
  { id: 'sudoku', name: 'Mini Sudoku', nameJa: 'ナンプレ', icon: 'Grid3x3', category: 'games', parentApp: 'game', description: '4×4および数字ロジックパズル。' },
  { id: 'dictionary', name: 'Reference & Study', nameJa: '辞典・周期表・学習', icon: 'BookOpen', category: 'utilities', parentApp: 'dictionary', description: '用語辞典・元素周期表・学習カードを統合したリファレンス。' },
  { id: 'periodic', name: 'Periodic Table', nameJa: '元素周期表', icon: 'Sparkles', category: 'utilities', parentApp: 'dictionary', description: '主要元素の原子番号・原子量・分類一覧。' },
  { id: 'flashcards', name: 'Flashcards', nameJa: '学習カード', icon: 'BookOpen', category: 'utilities', parentApp: 'dictionary', description: '問題と解答を切り替える反復学習ツール。' },
  { id: 'sysinfo', name: 'System Info', nameJa: 'システム診断', icon: 'Cpu', category: 'utilities', parentApp: 'taskmanager', description: 'OS設定・画面解像度・CPUコア数などの環境情報。' },
];

/* ============================================================================
   INDIVIDUAL MINIMAL BORDERLESS TOOL VIEWS
   ============================================================================ */

export function PaintView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#06b6d4');
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawing.current = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    ctx.strokeStyle = tool === 'eraser' ? '#090d16' : color;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `glassium5-canvas-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const PALETTE = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#ffffff'];

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('brush'); }}
              className={`h-5 w-5 rounded-full transition ${color === c && tool === 'brush' ? 'scale-125 ring-2 ring-white' : 'opacity-65 hover:opacity-100'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2 text-white/70">
            <span>線幅 {size}px</span>
            <input type="range" min={1} max={32} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-24 accent-cyan-400" />
          </label>
          <button
            onClick={() => setTool(tool === 'eraser' ? 'brush' : 'eraser')}
            className={`px-3 py-1.5 transition ${tool === 'eraser' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : 'text-white/70 hover:text-white'}`}
          >
            消しゴム
          </button>
          <button onClick={clearCanvas} className="px-3 py-1.5 text-white/70 hover:text-white">消去</button>
          <button onClick={downloadImage} className="px-3.5 py-1.5 bg-cyan-500 text-black font-semibold">PNG保存</button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-black/30">
        <canvas
          ref={canvasRef}
          width={760}
          height={420}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={stopDraw}
          onPointerLeave={stopDraw}
          className="cursor-crosshair touch-none max-w-full max-h-full"
        />
      </div>
    </div>
  );
}

export function ColorPickerView() {
  const [r, setR] = useState(6);
  const [g, setG] = useState(182);
  const [b, setB] = useState(212);
  const [copied, setCopied] = useState(false);

  const hex = `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex items-center gap-6 pb-5 border-b border-white/[0.08]">
        <div className="h-24 w-24 shrink-0" style={{ backgroundColor: hex }} />
        <div className="space-y-1.5">
          <div className="text-2xl font-mono font-bold">{hex}</div>
          <div className="text-xs font-mono text-white/60">RGB({r}, {g}, {b})</div>
          <button
            onClick={() => { navigator.clipboard?.writeText(hex); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="mt-1 px-4 py-1.5 bg-cyan-500 text-black text-xs font-semibold"
          >
            {copied ? 'コピー完了' : 'HEXをコピー'}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {[
          { label: 'Red (赤)', val: r, set: setR, color: 'accent-rose-500' },
          { label: 'Green (緑)', val: g, set: setG, color: 'accent-emerald-500' },
          { label: 'Blue (青)', val: b, set: setB, color: 'accent-sky-500' },
        ].map((ch) => (
          <div key={ch.label} className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/70">{ch.label}</span>
              <span className="font-mono">{ch.val}</span>
            </div>
            <input type="range" min={0} max={255} value={ch.val} onChange={(e) => ch.set(Number(e.target.value))} className={`w-full ${ch.color}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function QRCodeView() {
  const [text, setText] = useState('https://glassium.os');
  const grid = useMemo(() => {
    const size = 15;
    const cells: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isCorner = (r < 4 && c < 4) || (r < 4 && c >= size - 4) || (r >= size - 4 && c < 4);
        if (isCorner) {
          cells[r][c] = r === 0 || r === 3 || c === 0 || c === 3 || (r >= 1 && r <= 2 && c >= 1 && c <= 2);
        } else {
          const v = Math.abs(Math.imul(hash ^ (r * 31 + c * 17), 2654435761));
          cells[r][c] = v % 2 === 0;
        }
      }
    }
    return cells;
  }, [text]);

  return (
    <div className="flex flex-col items-center justify-center py-6 gap-6">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="URL またはテキストを入力"
        className="w-full max-w-md bg-transparent border-b border-white/20 px-2 py-2 text-sm text-white outline-none focus:border-cyan-400"
      />
      <div className="p-4 bg-white">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
          {grid.flatMap((row, rIdx) =>
            row.map((on, cIdx) => (
              <div key={`${rIdx}-${cIdx}`} className={`w-3.5 h-3.5 ${on ? 'bg-slate-950' : 'bg-white'}`} />
            ))
          )}
        </div>
      </div>
      <div className="text-xs text-white/50 font-mono truncate max-w-md">{text || '-'}</div>
    </div>
  );
}

export function PomodoroView() {
  const [mode, setMode] = useState<'work' | 'short' | 'long'>('work');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [task, setTask] = useState('現在の集中タスク');

  const durations = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          if (mode === 'work') setSessions((n) => n + 1);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode]);

  const switchMode = (m: 'work' | 'short' | 'long') => {
    setRunning(false);
    setMode(m);
    setSecondsLeft(durations[m]);
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-6">
      <div className="flex gap-6 border-b border-white/10 pb-2">
        {[
          { id: 'work', label: '集中 25分' },
          { id: 'short', label: '小休憩 5分' },
          { id: 'long', label: '長休憩 15分' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => switchMode(item.id as 'work' | 'short' | 'long')}
            className={`pb-1 text-xs font-medium transition ${
              mode === item.id ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-white/60 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="text-7xl font-light font-mono tracking-tight text-cyan-400 tabular-nums">
        {mins}:{secs}
      </div>

      <input
        value={task}
        onChange={(e) => setTask(e.target.value)}
        className="bg-transparent border-b border-white/15 px-3 py-1.5 text-center text-sm text-white/90 outline-none focus:border-cyan-400 w-72"
      />

      <div className="flex gap-4">
        <button
          onClick={() => setRunning(!running)}
          className="px-6 py-2 bg-cyan-500 text-black font-semibold text-xs hover:brightness-110 transition"
        >
          {running ? '一時停止' : '開始'}
        </button>
        <button
          onClick={() => { setRunning(false); setSecondsLeft(durations[mode]); }}
          className="px-4 py-2 text-white/70 hover:text-white text-xs transition"
        >
          リセット
        </button>
      </div>

      <div className="text-xs text-white/50">完了サイクル数: <span className="text-cyan-400 font-mono font-bold">{sessions}</span></div>
    </div>
  );
}

export function UnitConverterView() {
  const [cat, setCat] = useState<'length' | 'weight' | 'temp' | 'data'>('length');
  const [val, setVal] = useState('1');
  const num = parseFloat(val) || 0;

  const results = useMemo(() => {
    if (cat === 'length') {
      return [
        { label: 'メートル (m)', value: num.toFixed(4) },
        { label: 'キロメートル (km)', value: (num / 1000).toFixed(6) },
        { label: 'センチメートル (cm)', value: (num * 100).toFixed(2) },
        { label: 'インチ (in)', value: (num * 39.3701).toFixed(3) },
        { label: 'フィート (ft)', value: (num * 3.28084).toFixed(3) },
      ];
    }
    if (cat === 'weight') {
      return [
        { label: 'キログラム (kg)', value: num.toFixed(3) },
        { label: 'グラム (g)', value: (num * 1000).toFixed(1) },
        { label: 'ポンド (lb)', value: (num * 2.20462).toFixed(3) },
        { label: 'オンス (oz)', value: (num * 35.274).toFixed(2) },
      ];
    }
    if (cat === 'temp') {
      return [
        { label: '摂氏 (°C)', value: num.toFixed(2) },
        { label: '華氏 (°F)', value: ((num * 9) / 5 + 32).toFixed(2) },
        { label: '絶対温度 (K)', value: (num + 273.15).toFixed(2) },
      ];
    }
    return [
      { label: 'メガバイト (MB)', value: num.toFixed(2) },
      { label: 'キロバイト (KB)', value: (num * 1024).toFixed(0) },
      { label: 'ギガバイト (GB)', value: (num / 1024).toFixed(4) },
      { label: 'テラバイト (TB)', value: (num / (1024 * 1024)).toFixed(6) },
    ];
  }, [cat, num]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-5 border-b border-white/10 pb-2.5">
        {[
          { id: 'length', label: '長さ (m)' },
          { id: 'weight', label: '重さ (kg)' },
          { id: 'temp', label: '温度 (°C)' },
          { id: 'data', label: '容量 (MB)' },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id as typeof cat)}
            className={`text-xs pb-1 transition ${cat === c.id ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-white/60 hover:text-white'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs text-white/50 block mb-1">基準値</label>
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-full bg-transparent border-b border-white/20 py-2 text-xl font-mono text-white outline-none focus:border-cyan-400"
        />
      </div>

      <div className="divide-y divide-white/[0.08]">
        {results.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-3">
            <span className="text-xs text-white/70">{r.label}</span>
            <span className="text-sm font-mono font-bold text-cyan-400">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BmiView() {
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(62);
  const hMeters = height / 100;
  const bmi = weight / (hMeters * hMeters);
  const ideal = 22 * hMeters * hMeters;

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1"><span>身長</span><span className="font-mono text-cyan-400">{height} cm</span></div>
          <input type="range" min={130} max={210} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full accent-cyan-400" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1"><span>体重</span><span className="font-mono text-cyan-400">{weight} kg</span></div>
          <input type="range" min={35} max={140} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full accent-cyan-400" />
        </div>
      </div>
      <div className="divide-y divide-white/[0.08] border-t border-white/[0.08]">
        <div className="flex items-center justify-between py-4">
          <div>
            <div className="text-xs text-white/60">BMI 指数</div>
            <div className="text-[11px] text-white/40">{bmi < 18.5 ? '低体重' : bmi < 25 ? '普通体重' : '肥満傾向'}</div>
          </div>
          <div className="text-2xl font-mono font-bold text-cyan-400">{bmi.toFixed(1)}</div>
        </div>
        <div className="flex items-center justify-between py-4">
          <div className="text-xs text-white/60">標準体重 (BMI 22)</div>
          <div className="text-2xl font-mono font-bold text-emerald-400">{ideal.toFixed(1)} kg</div>
        </div>
      </div>
    </div>
  );
}

export function ExpenseView() {
  const [records, setRecords] = useState([
    { id: '1', title: '昼食', amount: -1200 },
    { id: '2', title: '書籍購入', amount: -3400 },
    { id: '3', title: '売上入金', amount: 45000 },
  ]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  const add = () => {
    const n = Number(amount);
    if (!title.trim() || !n) return;
    setRecords((prev) => [{ id: String(Date.now()), title: title.trim(), amount: n }, ...prev]);
    setTitle('');
    setAmount('');
  };

  const total = records.reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between pb-3 border-b border-white/[0.08]">
        <span className="text-xs text-white/60">収支合計</span>
        <span className={`text-2xl font-mono font-bold ${total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          ¥{total.toLocaleString()}
        </span>
      </div>
      <div className="flex gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="項目名" className="flex-1 bg-transparent border-b border-white/20 py-1.5 text-xs outline-none" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="金額 (支出はマイナス)" className="w-40 bg-transparent border-b border-white/20 py-1.5 text-xs outline-none" />
        <button onClick={add} className="px-4 py-1.5 bg-cyan-500 text-black text-xs font-semibold">追加</button>
      </div>
      <div className="divide-y divide-white/[0.08]">
        {records.map((r) => (
          <div key={r.id} className="flex justify-between py-3 text-xs">
            <span>{r.title}</span>
            <span className={`font-mono font-bold ${r.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {r.amount >= 0 ? `+¥${r.amount.toLocaleString()}` : `-¥${Math.abs(r.amount).toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanView() {
  const [items, setItems] = useState<{ id: string; text: string; col: 'todo' | 'doing' | 'done' }[]>([
    { id: '1', text: 'UIレイアウト確認', col: 'todo' },
    { id: '2', text: 'AI統合モジュール検証', col: 'doing' },
    { id: '3', text: '多言語設定の反映', col: 'done' },
  ]);
  const [newText, setNewText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const addCard = () => {
    if (!newText.trim()) return;
    setItems((prev) => [...prev, { id: String(Date.now()), text: newText.trim(), col: 'todo' }]);
    setNewText('');
  };

  const askAiBreakdown = async () => {
    if (!newText.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await requestAIChat({
        message: `目標「${newText}」を実行するための具体的な短いタスクを3つ、改行区切りで出力してください。余計な説明は省いてください。`,
      });
      const lines = res.reply
        .split('\n')
        .map((l) => l.replace(/^[・\-*\d.]+\s*/, '').trim())
        .filter((l) => l.length > 1)
        .slice(0, 3);
      if (lines.length > 0) {
        setItems((prev) => [
          ...prev,
          ...lines.map((t, i) => ({ id: `${Date.now()}-${i}`, text: t, col: 'todo' as const })),
        ]);
        setNewText('');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const moveCard = (id: string, col: 'todo' | 'doing' | 'done') => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, col } : it)));
  };

  const cols: { key: 'todo' | 'doing' | 'done'; title: string }[] = [
    { key: 'todo', title: '未着手' },
    { key: 'doing', title: '進行中' },
    { key: 'done', title: '完了' },
  ];

  return (
    <div className="flex h-full w-full flex-col gap-5">
      <div className="flex gap-3 items-center pb-3 border-b border-white/[0.08]">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCard()}
          placeholder="タスクまたは目標を入力..."
          className="flex-1 bg-transparent border-b border-white/20 py-1.5 text-xs outline-none focus:border-cyan-400"
        />
        <button onClick={addCard} className="px-4 py-1.5 bg-cyan-500 text-black text-xs font-semibold">追加</button>
        <button onClick={askAiBreakdown} disabled={aiLoading} className="px-3 py-1.5 text-cyan-400 hover:text-cyan-300 text-xs font-medium">
          {aiLoading ? 'AI分解中...' : 'AIでサブタスク分解'}
        </button>
      </div>
      <div className="grid grid-cols-3 divide-x divide-white/[0.08] flex-1 min-h-0">
        {cols.map((c) => (
          <div key={c.key} className="px-4 flex flex-col gap-2 overflow-y-auto">
            <div className="text-xs font-bold text-cyan-400 pb-2 border-b border-white/[0.08]">{c.title}</div>
            <div className="divide-y divide-white/[0.06]">
              {items.filter((i) => i.col === c.key).map((card) => (
                <div key={card.id} className="py-3 text-xs space-y-2">
                  <div>{card.text}</div>
                  <div className="flex gap-3 text-[11px] text-white/50">
                    {c.key !== 'todo' && <button onClick={() => moveCard(card.id, 'todo')} className="hover:text-white">未着手へ</button>}
                    {c.key !== 'doing' && <button onClick={() => moveCard(card.id, 'doing')} className="hover:text-cyan-400">進行中へ</button>}
                    {c.key !== 'done' && <button onClick={() => moveCard(card.id, 'done')} className="hover:text-emerald-400">完了へ</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HabitView() {
  const days = ['月', '火', '水', '木', '金', '土', '日'];
  const [habits, setHabits] = useState([
    { name: '運動・ストレッチ', checks: [true, true, false, true, true, false, false] },
    { name: '技術学習 1時間', checks: [true, true, true, true, false, true, false] },
    { name: '読書', checks: [false, true, true, false, true, true, true] },
    { name: '水分補給 2L', checks: [true, true, true, true, true, true, false] },
  ]);

  const toggle = (hIdx: number, dIdx: number) => {
    setHabits((prev) =>
      prev.map((h, i) =>
        i === hIdx ? { ...h, checks: h.checks.map((c, j) => (j === dIdx ? !c : c)) } : h
      )
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-white/60">
            <th className="py-2.5">項目</th>
            {days.map((d) => <th key={d} className="py-2.5 text-center">{d}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.08]">
          {habits.map((h, hIdx) => (
            <tr key={h.name}>
              <td className="py-3.5 font-medium">{h.name}</td>
              {h.checks.map((c, dIdx) => (
                <td key={dIdx} className="py-3.5 text-center">
                  <button
                    onClick={() => toggle(hIdx, dIdx)}
                    className={`w-6 h-6 transition ${c ? 'text-cyan-400 font-bold' : 'text-white/20 hover:text-white/50'}`}
                  >
                    {c ? '●' : '○'}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WhiteboardView() {
  const [notes, setNotes] = useState([
    { id: '1', text: 'UIの余白と直線のバランスを調整する' },
    { id: '2', text: 'キーボードショートカット一覧を整備する' },
  ]);
  const [input, setInput] = useState('');

  const add = () => {
    if (!input.trim()) return;
    setNotes((prev) => [...prev, { id: String(Date.now()), text: input.trim() }]);
    setInput('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 pb-3 border-b border-white/[0.08]">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="メモを入力..." className="flex-1 bg-transparent border-b border-white/20 py-1.5 text-xs outline-none" />
        <button onClick={add} className="px-4 py-1.5 bg-cyan-500 text-black text-xs font-semibold">追加</button>
      </div>
      <div className="divide-y divide-white/[0.08]">
        {notes.map((n) => (
          <div key={n.id} className="py-3.5 flex items-center justify-between gap-4">
            <span className="text-xs leading-relaxed">{n.text}</span>
            <button onClick={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))} className="text-xs text-white/40 hover:text-rose-400">削除</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function JsonFormatView() {
  const [input, setInput] = useState('{"os":"GlassiumOS","version":5.0,"edition":"Minimal"}');
  const [error, setError] = useState<string | null>(null);

  const format = (spaces: number) => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, spaces));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '構文エラー');
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
        <div className="flex gap-4">
          <button onClick={() => format(2)} className="px-3.5 py-1 bg-cyan-500 text-black text-xs font-semibold">整形 (2スペース)</button>
          <button onClick={() => format(0)} className="px-3 py-1 text-white/70 hover:text-white text-xs">1行化</button>
        </div>
        {error ? <span className="text-xs text-rose-400">{error}</span> : <span className="text-xs text-emerald-400">有効なJSON</span>}
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="flex-1 w-full bg-transparent p-2 font-mono text-xs text-cyan-100 outline-none resize-none"
      />
    </div>
  );
}

export function RegexView() {
  const [pattern, setPattern] = useState('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b');
  const [flags, setFlags] = useState('g');
  const [sample, setSample] = useState('連絡先: info@glassium.os または dev@example.com');

  const matches = useMemo(() => {
    try {
      const re = new RegExp(pattern, flags);
      return Array.from(sample.matchAll(re)).map((m) => m[0]);
    } catch {
      return [];
    }
  }, [pattern, flags, sample]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 pb-2 border-b border-white/[0.08]">
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="正規表現パターン"
          className="flex-1 bg-transparent border-b border-white/20 py-1.5 font-mono text-xs text-cyan-300 outline-none"
        />
        <input
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          placeholder="g, i"
          className="w-16 bg-transparent border-b border-white/20 py-1.5 font-mono text-xs text-center outline-none"
        />
      </div>
      <textarea
        value={sample}
        onChange={(e) => setSample(e.target.value)}
        rows={4}
        className="w-full bg-transparent border-b border-white/[0.08] py-2 text-xs font-mono outline-none"
      />
      <div className="space-y-1">
        <div className="text-xs text-white/50">一致結果 ({matches.length}件)</div>
        <div className="divide-y divide-white/[0.06] font-mono text-xs text-cyan-400">
          {matches.map((m, i) => <div key={i} className="py-1.5">{m}</div>)}
        </div>
      </div>
    </div>
  );
}

export function Base64MorseView() {
  const [raw, setRaw] = useState('GlassiumOS 5.0');
  const encodedB64 = useMemo(() => {
    try {
      return btoa(unescape(encodeURIComponent(raw)));
    } catch {
      return '';
    }
  }, [raw]);

  const MORSE: Record<string, string> = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
    I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
    Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
    Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', ' ': '/',
  };
  const morse = raw.toUpperCase().split('').map((c) => MORSE[c] || '').join(' ');

  return (
    <div className="flex flex-col divide-y divide-white/[0.08]">
      <div className="pb-4">
        <div className="text-xs text-white/50 mb-1.5">入力テキスト</div>
        <input value={raw} onChange={(e) => setRaw(e.target.value)} className="w-full bg-transparent border-b border-white/20 py-1.5 text-xs font-mono outline-none" />
      </div>
      <div className="py-4">
        <div className="text-xs text-white/50 mb-1">Base64</div>
        <div className="font-mono text-xs text-cyan-400 break-all select-all">{encodedB64}</div>
      </div>
      <div className="py-4">
        <div className="text-xs text-white/50 mb-1">URL エンコード</div>
        <div className="font-mono text-xs text-emerald-400 break-all select-all">{encodeURIComponent(raw)}</div>
      </div>
      <div className="pt-4">
        <div className="text-xs text-white/50 mb-1">モールス符号</div>
        <div className="font-mono text-sm tracking-widest text-amber-300 break-all">{morse || '-'}</div>
      </div>
    </div>
  );
}

export function PassGenView() {
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [copied, setCopied] = useState(false);

  const password = useMemo(() => {
    let chars = 'abcdefghijklmnopqrstuvwxyz';
    if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useNumbers) chars += '0123456789';
    if (useSymbols) chars += '!@#$%^&*()_+-=';
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  }, [length, useUpper, useNumbers, useSymbols]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <span className="font-mono text-base text-cyan-400 break-all select-all">{password}</span>
        <button
          onClick={() => { navigator.clipboard?.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="px-4 py-1.5 bg-cyan-500 text-black text-xs font-semibold shrink-0"
        >
          {copied ? 'コピー完了' : 'コピー'}
        </button>
      </div>
      <div className="divide-y divide-white/[0.08] text-xs">
        <div className="py-3">
          <div className="flex justify-between mb-1.5"><span>文字数</span><span className="font-mono text-cyan-400">{length}</span></div>
          <input type="range" min={8} max={48} value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full accent-cyan-400" />
        </div>
        <label className="flex items-center justify-between py-3"><span>大文字 (A-Z)</span><input type="checkbox" checked={useUpper} onChange={(e) => setUseUpper(e.target.checked)} className="accent-cyan-400" /></label>
        <label className="flex items-center justify-between py-3"><span>数字 (0-9)</span><input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} className="accent-cyan-400" /></label>
        <label className="flex items-center justify-between py-3"><span>記号 (!@#$)</span><input type="checkbox" checked={useSymbols} onChange={(e) => setUseSymbols(e.target.checked)} className="accent-cyan-400" /></label>
      </div>
    </div>
  );
}

export function WordCountDiffView() {
  const [text, setText] = useState('GlassiumOS 5 は、十分な余白とシンプルな直線で構成されたインターフェースです。');
  const [compareText, setCompareText] = useState('GlassiumOS 5 は、余白と直線のみを用いた明快なインターフェースです。');
  const [showDiff, setShowDiff] = useState(false);

  const chars = text.length;
  const noSpace = text.replace(/\s+/g, '').length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text ? text.split('\n').length : 0;

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex gap-6 text-xs">
          <span>文字数: <strong className="font-mono text-cyan-400">{chars}</strong></span>
          <span>空白除外: <strong className="font-mono text-cyan-400">{noSpace}</strong></span>
          <span>単語数: <strong className="font-mono text-cyan-400">{words}</strong></span>
          <span>行数: <strong className="font-mono text-cyan-400">{lines}</strong></span>
        </div>
        <button onClick={() => setShowDiff(!showDiff)} className="text-xs text-cyan-400 hover:underline">
          {showDiff ? '文字数解析へ戻る' : 'テキスト差分比較を表示'}
        </button>
      </div>

      {!showDiff ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="解析するテキストを入力..."
          className="flex-1 bg-transparent py-2 text-xs leading-relaxed outline-none resize-none"
        />
      ) : (
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 border-b border-white/[0.08] pb-3">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="bg-transparent text-xs font-mono outline-none" placeholder="元のテキスト" />
            <textarea value={compareText} onChange={(e) => setCompareText(e.target.value)} rows={4} className="bg-transparent text-xs font-mono outline-none" placeholder="比較するテキスト" />
          </div>
          <div className="divide-y divide-white/[0.06] font-mono text-xs">
            {Array.from({ length: Math.max(text.split('\n').length, compareText.split('\n').length) }).map((_, i) => {
              const l = text.split('\n')[i] ?? '';
              const r = compareText.split('\n')[i] ?? '';
              return (
                <div key={i} className={`py-1.5 ${l === r ? 'text-white/50' : 'text-cyan-400'}`}>
                  {l === r ? `  ${l}` : `- ${l}  →  + ${r}`}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function DrumPadTunerView() {
  const [freq, setFreq] = useState(440);
  const [wave, setWave] = useState<OscillatorType>('sine');
  const [playing, setPlaying] = useState(false);
  const oscRef = useRef<OscillatorNode | null>(null);

  const pads = [
    { name: 'Kick', freq: 65, type: 'sine' as OscillatorType },
    { name: 'Snare', freq: 220, type: 'triangle' as OscillatorType },
    { name: 'Hi-Hat', freq: 880, type: 'square' as OscillatorType },
    { name: 'Clap', freq: 320, type: 'sawtooth' as OscillatorType },
    { name: 'Low Tom', freq: 110, type: 'sine' as OscillatorType },
    { name: 'Mid Tom', freq: 165, type: 'sine' as OscillatorType },
    { name: 'Rim', freq: 520, type: 'triangle' as OscillatorType },
    { name: 'Bell', freq: 587, type: 'square' as OscillatorType },
    { name: 'Sub', freq: 48, type: 'sine' as OscillatorType },
  ];

  const triggerPad = (f: number, t: OscillatorType) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = t;
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.19);
    } catch {
      // ignore
    }
  };

  const toggleTone = () => {
    if (playing) {
      oscRef.current?.stop();
      oscRef.current = null;
      setPlaying(false);
    } else {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscRef.current = osc;
      setPlaying(true);
    }
  };

  useEffect(() => {
    if (oscRef.current) {
      oscRef.current.frequency.value = freq;
      oscRef.current.type = wave;
    }
  }, [freq, wave]);

  useEffect(() => () => { oscRef.current?.stop(); }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
      <div className="space-y-3">
        <div className="text-xs font-bold text-cyan-400">808 ドラムパッド</div>
        <div className="grid grid-cols-3 gap-2">
          {pads.map((p) => (
            <button
              key={p.name}
              onClick={() => triggerPad(p.freq, p.type)}
              className="h-20 bg-white/[0.04] hover:bg-cyan-500/20 active:scale-95 transition flex flex-col items-center justify-center"
            >
              <span className="text-xs font-semibold">{p.name}</span>
              <span className="text-[10px] font-mono text-white/40">{p.freq}Hz</span>
            </button>
          ))}
        </div>
      </div>

      <div className="md:pl-8 flex flex-col justify-center gap-5">
        <div className="text-xs font-bold text-cyan-400">周波数ジェネレーター</div>
        <div className="text-4xl font-mono font-bold">{freq} Hz</div>
        <input type="range" min={80} max={1200} value={freq} onChange={(e) => setFreq(Number(e.target.value))} className="w-full accent-cyan-400" />
        <div className="flex gap-3">
          {(['sine', 'square', 'triangle', 'sawtooth'] as OscillatorType[]).map((w) => (
            <button key={w} onClick={() => setWave(w)} className={`text-xs pb-1 ${wave === w ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-white/50'}`}>{w}</button>
          ))}
        </div>
        <button onClick={toggleTone} className={`w-fit px-5 py-2 text-xs font-semibold ${playing ? 'bg-rose-500 text-white' : 'bg-cyan-500 text-black'}`}>
          {playing ? '発振停止' : '発振開始'}
        </button>
      </div>
    </div>
  );
}

export function PuzzleGamesView({ initialGame = 'minesweeper' }: { initialGame?: string }) {
  const [tab, setTab] = useState<'minesweeper' | 'tictactoe' | 'memory' | 'typing' | 'sudoku'>(
    (['minesweeper', 'tictactoe', 'memory', 'typing', 'sudoku'].includes(initialGame) ? initialGame : 'minesweeper') as 'minesweeper'
  );

  // Minesweeper state
  const SIZE = 8;
  const MINES = 8;
  const createBoard = () => {
    const b = Array.from({ length: SIZE * SIZE }, () => ({ mine: false, open: false, count: 0 }));
    let placed = 0;
    while (placed < MINES) {
      const idx = Math.floor(Math.random() * b.length);
      if (!b[idx].mine) { b[idx].mine = true; placed++; }
    }
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr * SIZE + nc].mine) count++;
          }
        }
        b[r * SIZE + c].count = count;
      }
    }
    return b;
  };
  const [board, setBoard] = useState(createBoard);
  const [mineOver, setMineOver] = useState(false);

  // TicTacToe state
  const [ttt, setTtt] = useState<(string | null)[]>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const tttWinner = useMemo(() => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, b, c] of lines) if (ttt[a] && ttt[a] === ttt[b] && ttt[a] === ttt[c]) return ttt[a];
    return null;
  }, [ttt]);

  // Memory state
  const symbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const [deck, setDeck] = useState(() => [...symbols, ...symbols].sort(() => Math.random() - 0.5));
  const [openCards, setOpenCards] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);

  // Typing state
  const phrases = [
    'const os = new GlassiumOS({ version: 5.0 });',
    'Clean typography and generous whitespace.',
    'async function executeAICommand(input: string) {}',
  ];
  const [pIdx, setPIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);

  // Sudoku state
  const solution = [[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]];
  const [sudoku, setSudoku] = useState([[1,0,3,0],[0,4,0,2],[2,0,4,0],[0,3,0,1]]);

  return (
    <div className="flex h-full w-full flex-col gap-5">
      <div className="flex gap-6 border-b border-white/[0.08] pb-2.5">
        {[
          { id: 'minesweeper', label: 'マインスイーパー' },
          { id: 'tictactoe', label: '〇×ゲーム' },
          { id: 'memory', label: '神経衰弱' },
          { id: 'typing', label: 'タイピング練習' },
          { id: 'sudoku', label: 'ナンプレ' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`text-xs pb-1 transition ${tab === t.id ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-white/60 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {tab === 'minesweeper' && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-64 text-xs">
              <span>{mineOver ? 'ゲームオーバー' : '地雷を避けてマスを開く'}</span>
              <button onClick={() => { setBoard(createBoard()); setMineOver(false); }} className="text-cyan-400 font-semibold">リセット</button>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {board.map((cell, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (mineOver || cell.open) return;
                    const next = board.map((c) => ({ ...c }));
                    next[i].open = true;
                    if (next[i].mine) setMineOver(true);
                    setBoard(next);
                  }}
                  className={`w-8 h-8 text-xs font-mono font-bold flex items-center justify-center ${
                    cell.open ? (cell.mine ? 'bg-rose-500 text-white' : 'bg-white/15 text-cyan-300') : 'bg-white/[0.05] hover:bg-white/10'
                  }`}
                >
                  {cell.open ? (cell.mine ? '×' : cell.count || '') : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'tictactoe' && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-xs font-semibold text-cyan-400">{tttWinner ? `勝者: ${tttWinner}` : `手番: ${xTurn ? 'X' : 'O'}`}</div>
            <div className="grid grid-cols-3 gap-1.5">
              {ttt.map((v, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (ttt[i] || tttWinner) return;
                    const next = [...ttt];
                    next[i] = xTurn ? 'X' : 'O';
                    setTtt(next);
                    setXTurn(!xTurn);
                  }}
                  className="w-16 h-16 bg-white/[0.05] hover:bg-white/10 text-xl font-mono font-bold text-cyan-300"
                >
                  {v}
                </button>
              ))}
            </div>
            <button onClick={() => { setTtt(Array(9).fill(null)); setXTurn(true); }} className="text-xs text-white/60 hover:text-white">リセット</button>
          </div>
        )}

        {tab === 'memory' && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex justify-between w-56 text-xs">
              <span>達成ペア: {matched.length / 2} / 8</span>
              <button onClick={() => { setDeck([...symbols, ...symbols].sort(() => Math.random() - 0.5)); setMatched([]); setOpenCards([]); }} className="text-cyan-400">シャッフル</button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {deck.map((s, i) => {
                const shown = openCards.includes(i) || matched.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (openCards.length === 2 || openCards.includes(i) || matched.includes(i)) return;
                      const next = [...openCards, i];
                      setOpenCards(next);
                      if (next.length === 2) {
                        if (deck[next[0]] === deck[next[1]]) {
                          setMatched((m) => [...m, next[0], next[1]]);
                          setOpenCards([]);
                        } else {
                          setTimeout(() => setOpenCards([]), 600);
                        }
                      }
                    }}
                    className={`w-13 h-13 font-mono font-bold text-sm ${shown ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/[0.05] hover:bg-white/10'}`}
                  >
                    {shown ? s : '?'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'typing' && (
          <div className="flex flex-col items-center gap-5 w-full max-w-lg">
            <div className="text-xs text-white/60">
              速度: <span className="font-mono font-bold text-cyan-400">{startTime ? Math.round(typed.length / 5 / Math.max(0.05, (Date.now() - startTime) / 60000)) : 0} WPM</span>
            </div>
            <div className="w-full py-3 border-b border-white/10 font-mono text-sm">
              {phrases[pIdx].split('').map((c, i) => (
                <span key={i} className={i >= typed.length ? 'text-white/40' : typed[i] === c ? 'text-cyan-400' : 'text-rose-400 underline'}>{c}</span>
              ))}
            </div>
            <input
              value={typed}
              onChange={(e) => {
                const val = e.target.value;
                if (!startTime && val.length === 1) setStartTime(Date.now());
                setTyped(val);
                if (val === phrases[pIdx]) {
                  setTimeout(() => { setPIdx((pIdx + 1) % phrases.length); setTyped(''); setStartTime(null); }, 400);
                }
              }}
              placeholder="上のテキストを入力..."
              className="w-full bg-transparent border-b border-white/20 py-2 font-mono text-sm outline-none focus:border-cyan-400"
            />
          </div>
        )}

        {tab === 'sudoku' && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-xs text-cyan-400">
              {JSON.stringify(sudoku) === JSON.stringify(solution) ? '正解です' : '各行・各列に1〜4を重複なく配置'}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {sudoku.flatMap((row, r) =>
                row.map((val, c) => (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => setSudoku((prev) => prev.map((rw, ri) => rw.map((v, ci) => (ri === r && ci === c ? (v % 4) + 1 : v))))}
                    className="w-14 h-14 bg-white/[0.05] hover:bg-white/10 text-lg font-mono font-bold text-cyan-300"
                  >
                    {val || ''}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function StudyReferenceHubApp({ initialTab = 'dictionary' }: { initialTab?: string }) {
  const [tab, setTab] = useState<'dictionary' | 'periodic' | 'flashcards'>(
    (['dictionary', 'periodic', 'flashcards'].includes(initialTab) ? initialTab : 'dictionary') as 'dictionary'
  );
  const [q, setQ] = useState('');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const entries = [
    { term: 'API (Application Programming Interface)', desc: 'ソフトウェア間で機能やデータを共有するためのインターフェース仕様。' },
    { term: 'HTTP 405 (Method Not Allowed)', desc: '対象URLで許可されていないHTTPメソッドが送信された際の応答コード。' },
    { term: 'TypeScript', desc: 'JavaScriptに静的型付けを加えたプログラミング言語。' },
    { term: 'WebGL', desc: 'ブラウザ上でGPUを用いて2D/3Dグラフィックスを描画する標準仕様。' },
    { term: 'GlassiumOS 5', desc: 'マルチシェル対応・Surface Material Engine搭載のデスクトップWeb OS環境。' },
  ];

  const handleAiLookup = async () => {
    if (!q.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await requestAIChat(`「${q.trim()}」の意味と概要を簡潔に解説してください。`);
      setAiResult(res.reply);
    } catch {
      setAiResult('解説を取得できませんでした。');
    } finally {
      setAiLoading(false);
    }
  };

  const elements = [
    { num: 1, sym: 'H', name: '水素 (Hydrogen)', mass: '1.008', cat: '非金属' },
    { num: 2, sym: 'He', name: 'ヘリウム (Helium)', mass: '4.0026', cat: '貴ガス' },
    { num: 6, sym: 'C', name: '炭素 (Carbon)', mass: '12.011', cat: '非金属' },
    { num: 7, sym: 'N', name: '窒素 (Nitrogen)', mass: '14.007', cat: '非金属' },
    { num: 8, sym: 'O', name: '酸素 (Oxygen)', mass: '15.999', cat: '非金属' },
    { num: 14, sym: 'Si', name: 'ケイ素 (Silicon)', mass: '28.085', cat: '半金属' },
    { num: 26, sym: 'Fe', name: '鉄 (Iron)', mass: '55.845', cat: '遷移金属' },
    { num: 29, sym: 'Cu', name: '銅 (Copper)', mass: '63.546', cat: '遷移金属' },
    { num: 47, sym: 'Ag', name: '銀 (Silver)', mass: '107.87', cat: '遷移金属' },
    { num: 79, sym: 'Au', name: '金 (Gold)', mass: '196.97', cat: '遷移金属' },
  ];
  const [selectedEl, setSelectedEl] = useState(elements[0]);

  const cards = [
    { q: 'HTTP 405 エラーの意味は？', a: '許可されていないHTTPメソッド（POST等）によるリクエスト。' },
    { q: 'React の useMemo の用途は？', a: '依存値が変化した時のみ計算を再実行して処理を最適化する。' },
    { q: 'ケイ素 (Silicon) の元素記号と原子番号は？', a: '元素記号 Si、原子番号 14。' },
  ];
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 text-white p-6 gap-5 overflow-y-auto">
      <div className="flex gap-6 border-b border-white/[0.08] pb-3">
        {[
          { id: 'dictionary', label: '用語辞典' },
          { id: 'periodic', label: '元素周期表' },
          { id: 'flashcards', label: '学習カード' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`text-xs pb-1 transition ${tab === t.id ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-white/60 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dictionary' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAiLookup(); }}
              placeholder="用語を検索または入力してAI解説..."
              className="flex-1 bg-transparent border-b border-white/20 py-2 text-xs outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleAiLookup}
              disabled={!q.trim() || aiLoading}
              className="px-3.5 py-1.5 bg-cyan-500 text-black text-xs font-semibold disabled:opacity-40"
            >
              {aiLoading ? '検索中...' : 'AIで用語解説'}
            </button>
          </div>
          {aiResult && (
            <div className="py-3 border-b border-cyan-500/30 text-xs text-white/90 whitespace-pre-wrap leading-relaxed">
              <div className="text-[11px] font-bold text-cyan-400 mb-1">AI 解説結果</div>
              {aiResult}
            </div>
          )}
          <div className="divide-y divide-white/[0.08]">
            {entries.filter((e) => e.term.toLowerCase().includes(q.toLowerCase()) || e.desc.includes(q)).map((item) => (
              <div key={item.term} className="py-3.5 space-y-1">
                <div className="text-xs font-bold text-cyan-400">{item.term}</div>
                <div className="text-xs text-white/70">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'periodic' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between pb-4 border-b border-white/[0.08]">
            <div>
              <span className="text-2xl font-mono font-bold text-cyan-400 mr-3">{selectedEl.sym}</span>
              <span className="text-sm font-bold">{selectedEl.name}</span>
            </div>
            <div className="text-xs text-white/60 font-mono">原子番号 {selectedEl.num} · 原子量 {selectedEl.mass} · {selectedEl.cat}</div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {elements.map((el) => (
              <button
                key={el.num}
                onClick={() => setSelectedEl(el)}
                className={`p-3 text-left transition ${selectedEl.num === el.num ? 'bg-cyan-500 text-black font-bold' : 'bg-white/[0.04] hover:bg-white/[0.08]'}`}
              >
                <div className="text-[10px] opacity-60 font-mono">{el.num}</div>
                <div className="text-base font-bold">{el.sym}</div>
                <div className="text-[10px] truncate">{el.name.split(' ')[0]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'flashcards' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-xs text-white/50">カード {cardIdx + 1} / {cards.length} (クリックで解答表示)</div>
          <button
            onClick={() => setFlipped(!flipped)}
            className="w-full max-w-md py-12 px-6 border-y border-white/15 text-center hover:bg-white/[0.02] transition"
          >
            <div className="text-[11px] text-cyan-400 mb-2">{flipped ? '解答' : '問題'}</div>
            <div className="text-base font-medium">{flipped ? cards[cardIdx].a : cards[cardIdx].q}</div>
          </button>
          <div className="flex gap-6 text-xs">
            <button onClick={() => { setFlipped(false); setCardIdx((cardIdx - 1 + cards.length) % cards.length); }} className="text-white/70 hover:text-white">前へ</button>
            <button onClick={() => { setFlipped(false); setCardIdx((cardIdx + 1) % cards.length); }} className="text-cyan-400 font-semibold">次へ</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CreativeStudioHubApp({ initialTab = 'paint' }: { initialTab?: string }) {
  const [tab, setTab] = useState<'paint' | 'colorpicker' | 'qrcode'>(
    (['paint', 'colorpicker', 'qrcode'].includes(initialTab) ? initialTab : 'paint') as 'paint'
  );

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 text-white p-6 gap-4 overflow-y-auto">
      <div className="flex gap-6 border-b border-white/[0.08] pb-3 shrink-0">
        {[
          { id: 'paint', label: 'キャンバス描画' },
          { id: 'colorpicker', label: 'カラーピッカー' },
          { id: 'qrcode', label: 'QRコード生成' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`text-xs pb-1 transition ${tab === t.id ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-white/60 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        {tab === 'paint' && <PaintView />}
        {tab === 'colorpicker' && <ColorPickerView />}
        {tab === 'qrcode' && <QRCodeView />}
      </div>
    </div>
  );
}

export function SysInfoView() {
  const { shellMode, designEngine, theme, language } = useOS();

  const specs = [
    { label: 'OS バージョン', value: 'GlassiumOS 5' },
    { label: '現在のシェルモード', value: shellMode === 'windows' ? 'GlassiumOS 5' : shellMode },
    { label: 'サーフェスマテリアル', value: designEngine },
    { label: 'テーマ / 表示言語', value: `${theme} / ${language.toUpperCase()}` },
    { label: 'CPU 論理コア数', value: `${navigator.hardwareConcurrency || 8}` },
    { label: '画面解像度', value: `${window.innerWidth} × ${window.innerHeight} px` },
    { label: '実行プラットフォーム', value: navigator.platform || 'Web Environment' },
  ];

  return (
    <div className="flex flex-col divide-y divide-white/[0.08]">
      {specs.map((s) => (
        <div key={s.label} className="flex items-center justify-between py-3.5 text-xs">
          <span className="text-white/60">{s.label}</span>
          <span className="font-mono font-bold text-cyan-400">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

export function renderExtraApp(appId: string): React.ReactNode | null {
  switch (appId) {
    case 'paint':
    case 'colorpicker':
    case 'qrcode':
      return <CreativeStudioHubApp initialTab={appId} />;
    case 'dictionary':
    case 'periodic':
    case 'flashcards':
      return <StudyReferenceHubApp initialTab={appId} />;
    case 'minesweeper':
    case 'tictactoe':
    case 'memory':
    case 'typing':
    case 'sudoku':
      return (
        <div className="h-full w-full bg-slate-950 text-white p-6">
          <PuzzleGamesView initialGame={appId} />
        </div>
      );
    default:
      return null;
  }
}
