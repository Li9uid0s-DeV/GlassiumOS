import { useState, useRef, useEffect } from 'react';
import { useOS } from '../OSContext';
import { Icon } from '../Icon';

interface Line {
  type: 'input' | 'output';
  text: string;
}

type TerminalBgId = 'obsidian' | 'matrix' | 'cyber-violet' | 'deep-navy' | 'amber-retro' | 'glasispect';
type TerminalFontId = 'jetbrains' | 'fira' | 'courier' | 'monospace' | 'pixel';

const BG_PRESETS: { id: TerminalBgId; label: string; bgClass: string; textClass: string; promptClass: string }[] = [
  {
    id: 'obsidian',
    label: 'Obsidian Black',
    bgClass: 'bg-black/80 backdrop-blur-xl',
    textClass: 'text-emerald-300',
    promptClass: 'text-cyan-300',
  },
  {
    id: 'glasispect',
    label: 'Glasispect Glass',
    bgClass: 'bg-slate-950/45 backdrop-blur-2xl',
    textClass: 'text-cyan-100',
    promptClass: 'text-cyan-400',
  },
  {
    id: 'matrix',
    label: 'Matrix Phosphor',
    bgClass: 'bg-[#021208]/90 backdrop-blur-xl',
    textClass: 'text-[#4ade80]',
    promptClass: 'text-[#86efac]',
  },
  {
    id: 'cyber-violet',
    label: 'Cyber Violet',
    bgClass: 'bg-[#130726]/85 backdrop-blur-xl',
    textClass: 'text-fuchsia-200',
    promptClass: 'text-cyan-300',
  },
  {
    id: 'deep-navy',
    label: 'Abyssal Navy',
    bgClass: 'bg-[#041022]/85 backdrop-blur-xl',
    textClass: 'text-sky-200',
    promptClass: 'text-teal-300',
  },
  {
    id: 'amber-retro',
    label: 'Amber CRT',
    bgClass: 'bg-[#170e02]/90 backdrop-blur-xl',
    textClass: 'text-amber-300',
    promptClass: 'text-yellow-400',
  },
];

const FONT_PRESETS: { id: TerminalFontId; label: string; style: string }[] = [
  { id: 'jetbrains', label: 'JetBrains Mono', style: '"JetBrains Mono", "Fira Code", ui-monospace, monospace' },
  { id: 'fira', label: 'Fira Code', style: '"Fira Code", "Source Code Pro", ui-monospace, monospace' },
  { id: 'courier', label: 'Courier Prime', style: '"Courier New", Courier, monospace' },
  { id: 'monospace', label: 'System Mono', style: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { id: 'pixel', label: 'Cyber Pixel', style: '"MS Gothic", "Courier New", monospace' },
];

const BANNER = `GlassiumOS 5 u4 Terminal [GlasispectUI Shell v5.4]
(c) GlassiumOS Project. Zero-Border Liquid Glass Runtime.
Type 'help' for commands, or use the top bar to switch Background Color & Font.`;

const MOCK_WEATHER = [
  { city: 'Tokyo', temp: '22°C (72°F)', cond: 'Clear Skies', wind: '5 mph NE' },
  { city: 'New York', temp: '20°C (68°F)', cond: 'Partly Cloudy', wind: '8 mph SW' },
  { city: 'London', temp: '16°C (61°F)', cond: 'Light Breeze', wind: '11 mph W' },
  { city: 'Paris', temp: '19°C (66°F)', cond: 'Sunny', wind: '5 mph S' },
];

const FORTUNES = [
  '「シンプルさは究極の洗練である」 — GlasispectUI Design Principle',
  '3DMaze ヒント: 21F〜30F (Voidエリア) では松明の燃料オイルを切らさないよう注意！',
  '電卓の SpectClip に「1,500円×3個」をペーストすると自動で純粋な数式に変換されます。',
  'ファイルアプリでスペースキーまたはシングルクリックすると、空間レイヤー「スペクト・プレビュー」が浮かび上がります。',
];

function tryEval(expr: string): string | null {
  const s = expr.replace(/\s+/g, '');
  if (!s || !/^[0-9+\-*/().%]+$/.test(s)) return null;
  let pos = 0;

  function parseExpression(): number {
    let val = parseTerm();
    while (pos < s.length && (s[pos] === '+' || s[pos] === '-')) {
      const op = s[pos++];
      const right = parseTerm();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  }

  function parseTerm(): number {
    let val = parseFactor();
    while (pos < s.length && (s[pos] === '*' || s[pos] === '/' || s[pos] === '%')) {
      const op = s[pos++];
      const right = parseFactor();
      if ((op === '/' || op === '%') && right === 0) return NaN;
      val = op === '*' ? val * right : op === '/' ? val / right : val % right;
    }
    return val;
  }

  function parseFactor(): number {
    if (s[pos] === '+') {
      pos++;
      return parseFactor();
    }
    if (s[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    if (s[pos] === '(') {
      pos++;
      const val = parseExpression();
      if (s[pos] === ')') pos++;
      return val;
    }
    const start = pos;
    while (pos < s.length && ((s[pos] >= '0' && s[pos] <= '9') || s[pos] === '.')) pos++;
    if (start === pos) return NaN;
    return parseFloat(s.slice(start, pos));
  }

  const res = parseExpression();
  if (pos !== s.length || !Number.isFinite(res)) return null;
  return String(Math.round(res * 1e10) / 1e10);
}

export function TerminalApp() {
  const {
    fileSystem,
    openApp,
    lockSystem,
    setWallpaper,
    setAuroraColor,
    setShellMode,
    windows,
    closeWindow,
  } = useOS();

  const [lines, setLines] = useState<Line[]>([
    { type: 'output', text: BANNER },
    { type: 'output', text: '' },
  ]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState<string[]>([]);
  const [bgId, setBgId] = useState<TerminalBgId>('obsidian');
  const [fontId, setFontId] = useState<TerminalFontId>('jetbrains');
  const [fontSize, setFontSize] = useState<number>(13);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<string[]>([]);
  const histIdx = useRef(-1);

  const activeBg = BG_PRESETS.find((b) => b.id === bgId) ?? BG_PRESETS[0];
  const activeFont = FONT_PRESETS.find((f) => f.id === fontId) ?? FONT_PRESETS[0];

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [lines]);

  const print = (text: string) => setLines((l) => [...l, { type: 'output', text }]);

  const runCommand = (raw: string) => {
    const cmd = raw.trim();
    setLines((l) => [...l, { type: 'input', text: `${prompt()} ${cmd}` }]);
    if (!cmd) return;
    historyRef.current = [cmd, ...historyRef.current].slice(0, 50);
    histIdx.current = -1;

    const [name, ...args] = cmd.split(/\s+/);
    switch (name.toLowerCase()) {
      case 'help':
        print('GlassiumOS 5 u4 (GlasispectUI) Commands:');
        print('  help                 Show all available commands');
        print('  glasispect           Show GlasispectUI & GlassiumOS 5 u4 architecture info');
        print('  color <preset>       Change terminal background (obsidian, glasispect, matrix, cyber-violet, deep-navy, amber-retro)');
        print('  font <preset>        Change terminal font (jetbrains, fira, courier, monospace, pixel)');
        print('  live2d <color>       Switch default Live2D wallpaper color (amethyst-cyan-silk, abyssal-deep-ocean, polar-emerald-aurora, neon-cyber-dusk, crimson-rose-nebula)');
        print('  matrix               Print cyber digital matrix stream');
        print('  ascii                Display GlassiumOS 5 u4 prism ASCII emblem');
        print('  fortune              Print random OS tip or 3DMaze hint');
        print('  ping <host>          Simulate network latency ping');
        print('  calc <expr>          Evaluate mathematical expression');
        print('  weather [city]       Show atmospheric telemetry');
        print('  ls / cd / pwd / cat  Navigate & inspect virtual file system');
        print('  ps / top / kill      Inspect or terminate running windows');
        print('  open <app>           Launch app (browser, notepad, calculator, explorer, game, studio, paint, settings)');
        print('  neofetch / sysinfo   Display system summary');
        print('  clear                Clear terminal output');
        break;
      case 'clear':
        setLines([]);
        return;
      case 'glasispect':
        print('========================================================');
        print('  GlassiumOS 5 u4 — GlasispectUI Compositor Engine');
        print('  - Music: Liquid Glass UI, Playlist Import, Lyric Translation & 10-Band EQ');
        print('  - Weather: Global Search, Saved Cities, Rain Radar Map & 5-Min Sync');
        print('  - Store & Suite: Sonic 3D, Write, Sheet, Stage, Note & TSX Runner');
        print('========================================================');
        break;
      case 'color':
      case 'bg': {
        const target = args[0]?.toLowerCase() as TerminalBgId;
        const found = BG_PRESETS.find((b) => b.id === target);
        if (found) {
          setBgId(found.id);
          print(`[Terminal] Background changed to: ${found.label}`);
        } else {
          print(`Usage: color <${BG_PRESETS.map((b) => b.id).join(' | ')}>`);
        }
        break;
      }
      case 'font': {
        const target = args[0]?.toLowerCase() as TerminalFontId;
        const found = FONT_PRESETS.find((f) => f.id === target);
        if (found) {
          setFontId(found.id);
          print(`[Terminal] Font family changed to: ${found.label}`);
        } else {
          print(`Usage: font <${FONT_PRESETS.map((f) => f.id).join(' | ')}>`);
        }
        break;
      }
      case 'live2d': {
        const validColors = [
          'amethyst-cyan-silk',
          'abyssal-deep-ocean',
          'polar-emerald-aurora',
          'neon-cyber-dusk',
          'crimson-rose-nebula',
        ];
        const c = args[0]?.toLowerCase();
        if (c && validColors.includes(c)) {
          setWallpaper('live2d');
          setAuroraColor(c as never);
          print(`[Live2D] Activated restored Live2D preset: ${c}`);
        } else {
          print(`Usage: live2d <${validColors.join(' | ')}>`);
        }
        break;
      }
      case 'matrix':
        print('01000111 01001100 01000001 01010011 01001001 01010011 01010000 01000101 01000011 01010100');
        print('Σ Ω Ψ λ π Δ  GLASISPECT-UI NEURAL MATRIX STREAM ACTIVE  Δ π λ Ψ Ω Σ');
        print('01010101 00110001  [50-FLOOR DUNGEON SEED SYNCHRONIZED]  01111000');
        break;
      case 'ascii':
        print('        /\\        ');
        print('       /  \\       GlassiumOS 5 u4');
        print('      / /\\ \\      UI: GlasispectUI');
        print('     / /  \\ \\     Kernel: WebOS 5.4');
        print('    /_/____\\_\\    Zero-Border Liquid Glass');
        break;
      case 'fortune':
        print(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]);
        break;
      case 'ping': {
        const host = args[0] || 'glassium.os';
        print(`PING ${host} (127.0.0.1): 56 data bytes`);
        print(`64 bytes from ${host}: icmp_seq=0 ttl=64 time=8.4 ms`);
        print(`64 bytes from ${host}: icmp_seq=1 ttl=64 time=7.9 ms`);
        print(`--- ${host} ping statistics: 2 packets transmitted, 2 received, 0% packet loss ---`);
        break;
      }
      case 'uname':
        print('GlassiumOS 5 u4 WebOS x86_64 (GlasispectUI Compositor)');
        break;
      case 'ps':
      case 'top': {
        print('PID    PROCESS NAME             STATE       MEMORY');
        print('--------------------------------------------------');
        print('1      glassium-core-u4         Running     32 MB');
        print('2      glasispect-compositor    Running     64 MB');
        windows.forEach((w, idx) => {
          print(`${100 + idx}    ${w.title.padEnd(24, ' ')} ${w.minimized ? 'Suspended' : 'Running'}   48 MB`);
        });
        break;
      }
      case 'kill': {
        const target = args[0];
        if (!target) {
          print('kill: specify process PID or title substring');
          break;
        }
        const win = windows.find(
          (w, i) => String(100 + i) === target || w.title.toLowerCase().includes(target.toLowerCase())
        );
        if (win) {
          closeWindow(win.id);
          print(`Process '${win.title}' (ID: ${win.id}) terminated.`);
        } else {
          print(`kill: process '${target}' not found.`);
        }
        break;
      }
      case 'shell': {
        const targetShell = args[0]?.toLowerCase();
        const validShells = ['windows', 'windows11', 'windows10', 'windows8', 'mac', 'ubuntu', 'dex', 'chromeos'];
        if (targetShell && validShells.includes(targetShell)) {
          setShellMode(targetShell as never);
          print(`[SYSTEM] Switched active shell mode to: ${targetShell.toUpperCase()}`);
        } else {
          print(`shell: unknown shell '${args[0] ?? ''}'. Available: ${validShells.join(', ')}`);
        }
        break;
      }
      case 'cat': {
        const filename = args[0];
        if (!filename) {
          print('cat: specify file name');
          break;
        }
        let folder = fileSystem;
        for (const seg of cwd) {
          const next = folder.children.find((c) => c.name === seg && c.kind === 'folder');
          if (!next || next.kind !== 'folder') break;
          folder = next;
        }
        const file = folder.children.find(
          (c) => c.name.toLowerCase() === filename.toLowerCase() && c.kind === 'file'
        );
        if (file && file.kind === 'file') {
          print(file.content);
        } else {
          print(`cat: ${filename}: No such file`);
        }
        break;
      }
      case 'ls': {
        let folder = fileSystem;
        for (const seg of cwd) {
          const next = folder.children.find((c) => c.name === seg && c.kind === 'folder');
          if (!next || next.kind !== 'folder') {
            print('ls: cannot access path');
            break;
          }
          folder = next;
        }
        const items = folder.children.map((c) => (c.kind === 'folder' ? `[DIR] ${c.name}` : c.name));
        print(items.length ? items.join('   ') : '(empty)');
        break;
      }
      case 'cd': {
        if (!args[0] || args[0] === '/') {
          setCwd([]);
          break;
        }
        if (args[0] === '..') {
          setCwd((c) => c.slice(0, -1));
          break;
        }
        const target = args[0];
        let folder = fileSystem;
        for (const seg of cwd) {
          const next = folder.children.find((c) => c.name === seg && c.kind === 'folder');
          if (!next || next.kind !== 'folder') break;
          folder = next;
        }
        const found = folder.children.find(
          (c) => c.name.toLowerCase() === target.toLowerCase() && c.kind === 'folder'
        );
        if (found) setCwd((c) => [...c, found.name]);
        else print(`cd: no such directory: ${target}`);
        break;
      }
      case 'pwd':
        print('/' + cwd.join('/'));
        break;
      case 'date':
        print(new Date().toString());
        break;
      case 'whoami':
        print('glassium-administrator (uid=1000 gid=1000)');
        break;
      case 'echo':
        print(args.join(' '));
        break;
      case 'open': {
        const valid = [
          'explorer',
          'browser',
          'settings',
          'notepad',
          'terminal',
          'game',
          'appstore',
          'calculator',
          'taskmanager',
          'calendar',
          'synth',
          'studio',
          'paint',
          'ai',
        ];
        const app = args[0]?.toLowerCase();
        if (app && valid.includes(app)) {
          openApp(app as never);
          print(`[OK] Launching application process: ${app}`);
        } else {
          print(`open: unknown app '${args[0] ?? ''}'. Available: ${valid.join(', ')}`);
        }
        break;
      }
      case 'neofetch':
        print('    .-------.       user@glassium-os-u4');
        print('   /   ___   \\      -------------------');
        print('  |   /   \\   |     OS: GlassiumOS 5 u4');
        print('  |  | G5u4|  |     UI: GlasispectUI (Liquid Glass)');
        print('  |   \\___/   |     Font: ' + activeFont.label + ' | Bg: ' + activeBg.label);
        print('   \\         /      Uptime: ' + Math.floor(performance.now() / 1000) + 's');
        print("    `-------'       Display: " + window.innerWidth + 'x' + window.innerHeight);
        break;
      case 'sysinfo': {
        print('=== GlassiumOS 5 u4 (GlasispectUI) System Summary ===');
        print(`Architecture: WebOS Container (TypeScript + Vite + Three.js)`);
        print(`CPU Threads:  ${navigator.hardwareConcurrency ?? '8'} logical cores`);
        print(`Viewport:     ${window.innerWidth}x${window.innerHeight}`);
        print(`Uptime:       ${Math.floor(performance.now() / 1000)}s`);
        break;
      }
      case 'weather': {
        const cityArg = args.join(' ')?.toLowerCase();
        const match = cityArg
          ? MOCK_WEATHER.find((w) => w.city.toLowerCase().includes(cityArg))
          : MOCK_WEATHER[0];
        if (match) {
          print(`Weather: ${match.city} — ${match.temp}, ${match.cond} (Wind: ${match.wind})`);
        } else {
          print(`weather: city '${args.join(' ')}' not found. Try: ${MOCK_WEATHER.map((w) => w.city).join(', ')}`);
        }
        break;
      }
      case 'calc': {
        const expr = args.join(' ');
        if (!expr) {
          print('calc: no expression provided. Usage: calc 2+2*3');
          break;
        }
        const result = tryEval(expr);
        if (result !== null) {
          print(`${expr} = ${result}`);
        } else {
          print(`calc: invalid expression '${expr}'`);
        }
        break;
      }
      case 'theme': {
        const validThemes = ['live2d', 'space', 'aurora', 'sunset', 'ocean', 'forest', 'cosmic', 'bloom', 'shader'];
        const themeName = args[0]?.toLowerCase();
        if (themeName && validThemes.includes(themeName)) {
          setWallpaper(themeName as never);
          print(`Wallpaper switched to: ${themeName}`);
        } else {
          print(`theme: unknown theme '${args[0] ?? ''}'. Try: ${validThemes.join(', ')}`);
        }
        break;
      }
      case 'history': {
        if (historyRef.current.length === 0) {
          print('No command history yet.');
          break;
        }
        historyRef.current.forEach((h, i) => print(`  ${i + 1}  ${h}`));
        break;
      }
      case 'lock':
      case 'sleep':
        print('Locking system...');
        lockSystem();
        break;
      default:
        print(`${name}: command not found. Type 'help'.`);
    }
  };

  const prompt = () => 'glassium@u4:' + (cwd.length ? '/' + cwd.join('/') : '~') + '$';

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      runCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyRef.current.length === 0) return;
      histIdx.current = Math.min(histIdx.current + 1, historyRef.current.length - 1);
      setInput(historyRef.current[histIdx.current] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIdx.current = Math.max(histIdx.current - 1, -1);
      setInput(histIdx.current === -1 ? '' : historyRef.current[histIdx.current] ?? '');
    }
  };

  return (
    <div className={`flex flex-col h-full w-full min-w-0 min-h-0 ${activeBg.bgClass} ${activeBg.textClass} select-none`}>
      {/* Top Customization Bar: Background Color, Font Family, Font Size & Quick Commands */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-black/50 border-b border-white/10 text-[11px] shrink-0">
        <div className="flex items-center gap-3">
          {/* Background Color Selector */}
          <div className="flex items-center gap-1.5">
            <Icon name="Palette" size={12} className="opacity-70" />
            <span className="opacity-60">背景色:</span>
            <select
              value={bgId}
              onChange={(e) => setBgId(e.target.value as TerminalBgId)}
              onClick={(e) => e.stopPropagation()}
              className="bg-black/60 text-white border-b border-white/20 px-1.5 py-0.5 text-[11px] outline-none"
            >
              {BG_PRESETS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Family Selector */}
          <div className="flex items-center gap-1.5">
            <Icon name="FileText" size={12} className="opacity-70" />
            <span className="opacity-60">フォント:</span>
            <select
              value={fontId}
              onChange={(e) => setFontId(e.target.value as TerminalFontId)}
              onClick={(e) => e.stopPropagation()}
              className="bg-black/60 text-white border-b border-white/20 px-1.5 py-0.5 text-[11px] outline-none"
            >
              {FONT_PRESETS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFontSize((s) => Math.max(11, s - 1));
              }}
              className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-white"
            >
              A-
            </button>
            <span className="font-mono text-[10px] opacity-70 px-1">{fontSize}px</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFontSize((s) => Math.min(20, s + 1));
              }}
              className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-white"
            >
              A+
            </button>
          </div>
        </div>

        {/* Quick Command Buttons */}
        <div className="flex items-center gap-1">
          {['glasispect', 'neofetch', 'matrix', 'fortune', 'clear'].map((qCmd) => (
            <button
              key={qCmd}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                runCommand(qCmd);
              }}
              className="px-2 py-0.5 bg-white/[0.06] hover:bg-white/15 text-white/80 font-mono text-[10px] transition"
            >
              {qCmd}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Output & Input Area */}
      <div
        className="flex-1 p-3 overflow-auto select-text"
        style={{ fontFamily: activeFont.style, fontSize: `${fontSize}px` }}
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap leading-relaxed">
            {l.type === 'input' ? (
              <span className={activeBg.promptClass}>{l.text}</span>
            ) : (
              <span>{l.text}</span>
            )}
          </div>
        ))}
        <div className="flex items-center mt-0.5">
          <span className={`${activeBg.promptClass} whitespace-pre`}>{prompt()} </span>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            style={{ fontFamily: activeFont.style, fontSize: `${fontSize}px` }}
            className={`flex-1 bg-transparent outline-none border-none ${activeBg.textClass}`}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
export default TerminalApp;
