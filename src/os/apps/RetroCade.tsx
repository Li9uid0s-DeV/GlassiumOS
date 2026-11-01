import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../Icon';
import { useOS } from '../OSContext';

interface RetroGame {
  id: string;
  title: string;
  system: 'GameBoy' | 'NES' | 'Arcade';
  year: number;
  description: string;
}

const BUILTIN_GAMES: RetroGame[] = [
  { id: 'gb-tetris', title: 'Retro Brick Drop', system: 'GameBoy', year: 1989, description: 'クラシックなブロックパズルゲーム' },
  { id: 'nes-mario', title: 'Super Jump Bros', system: 'NES', year: 1985, description: '横スクロールアクションアドベンチャー' },
  { id: 'arcade-pong', title: 'Retro Ping Pong', system: 'Arcade', year: 1972, description: '2プレイヤー対戦テニスゲーム' },
];

export function RetroCadeApp() {
  const { playSound, addNotification } = useOS();
  const [currentGame, setCurrentGame] = useState<RetroGame>(BUILTIN_GAMES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('retrocade_highscore') || '1500'));
  const [customRomName, setCustomRomName] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  // Simple Retro Arcade canvas simulation engine
  const runEmulator = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x = 160;
    let y = 120;
    let dx = 3;
    let dy = 2;
    let paddleX = 140;
    let currentScore = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') paddleX = Math.max(10, paddleX - 25);
      if (e.key === 'ArrowRight' || e.key === 'd') paddleX = Math.min(canvas.width - 90, paddleX + 25);
    };
    window.addEventListener('keydown', handleKeyDown);

    const loop = () => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Retro Grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      // Ball / Player Object
      ctx.fillStyle = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#06b6d4';
      ctx.fillRect(x, y, 14, 14);
      ctx.shadowBlur = 0;

      // Paddle
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(paddleX, canvas.height - 24, 80, 10);

      x += dx;
      y += dy;

      if (x <= 10 || x >= canvas.width - 20) dx = -dx;
      if (y <= 10) dy = -dy;

      // Paddle collision
      if (y >= canvas.height - 34 && x >= paddleX && x <= paddleX + 80) {
        dy = -dy;
        currentScore += 100;
        setScore(currentScore);
        if (currentScore > highScore) {
          setHighScore(currentScore);
          localStorage.setItem('retrocade_highscore', String(currentScore));
        }
      }

      if (y > canvas.height) {
        // Reset ball
        x = 160;
        y = 120;
        currentScore = Math.max(0, currentScore - 200);
        setScore(currentScore);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [highScore]);

  useEffect(() => {
    if (isPlaying) {
      const cleanup = runEmulator();
      return cleanup;
    }
  }, [isPlaying, runEmulator]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomRomName(file.name);
    setCurrentGame({
      id: 'custom-rom',
      title: file.name.replace(/\.[^/.]+$/, ''),
      system: file.name.endsWith('.gb') ? 'GameBoy' : 'NES',
      year: 2026,
      description: 'カスタムロードされたレトロROMファイル',
    });
    setIsPlaying(true);
    playSound('open');
    addNotification('RetroCade', `ROMファイル "${file.name}" をロードしました。`);
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white select-none">
      {/* Top Header */}
      <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <Icon name="Gamepad2" size={16} className="text-rose-400" />
          <span className="text-xs font-semibold tracking-wide">RetroCade エミュレータ</span>
          <span className="text-[11px] text-white/40">·</span>
          <span className="text-[11px] text-white/50">Wasm & Canvas プレイヤー</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-white/80 hover:text-white flex items-center gap-1.5 cursor-pointer transition">
            <Icon name="Upload" size={13} />
            <span>ROMファイル読込 (.nes / .gb)</span>
            <input type="file" accept=".nes,.gb,.bin,.rom" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Game Sidebar */}
        <div className="w-64 border-r border-white/10 p-4 flex flex-col gap-3 overflow-y-auto bg-slate-900/20">
          <div className="text-xs font-medium text-white/50 mb-1">ライブラリ</div>
          {BUILTIN_GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => { setCurrentGame(game); setIsPlaying(true); playSound('click'); }}
              className={`p-3 text-left transition border-b border-white/5 flex flex-col gap-1 ${currentGame.id === game.id && isPlaying ? 'text-cyan-400 font-medium' : 'text-white/80 hover:text-white'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{game.title}</span>
                <span className="text-[10px] text-white/40">{game.system}</span>
              </div>
              <span className="text-[11px] text-white/50 font-normal">{game.description}</span>
            </button>
          ))}

          {customRomName && (
            <div className="p-3 border-t border-white/10 text-left flex flex-col gap-1 mt-2">
              <span className="text-xs font-medium text-cyan-400">カスタムROM</span>
              <span className="text-[11px] text-white/70 truncate">{customRomName}</span>
            </div>
          )}
        </div>

        {/* Main Emulator View */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black relative">
          <div className="absolute top-4 left-6 flex items-center gap-4 text-xs font-mono text-white/70">
            <div>
              スコア: <span className="text-white font-semibold">{score}</span>
            </div>
            <span className="text-white/20">|</span>
            <div>
              ハイスコア: <span className="text-white font-semibold">{highScore}</span>
            </div>
          </div>

          <div className="relative border border-white/15 bg-black">
            <canvas
              ref={canvasRef}
              width={480}
              height={360}
              className="block"
            />
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3">
                <div className="text-sm font-semibold">{currentGame.title}</div>
                <button
                  onClick={() => setIsPlaying(true)}
                  className="px-5 py-2 bg-white text-black font-semibold text-xs rounded hover:bg-slate-200 transition"
                >
                  ゲームスタート
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 text-[11px] text-white/40 font-mono">
            操作: [A] [D] または [←] [→] キーでパドル操作
          </div>
        </div>
      </div>
    </div>
  );
}
