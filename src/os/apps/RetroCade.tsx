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
    <div className="h-full w-full flex flex-col bg-black/40 backdrop-blur-2xl text-white select-none">
      {/* Top Header */}
      <div className="h-13 px-5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl glass-jelly flex items-center justify-center text-rose-400">
            <Icon name="Gamepad2" size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold">RetroCade エミュレータ</div>
            <div className="text-[10px] text-white/50">Wasm & Canvas レトロゲームセンター</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white/90 flex items-center gap-1.5 cursor-pointer transition">
            <Icon name="Upload" size={13} />
            <span>ROM読込 (.nes / .gb)</span>
            <input type="file" accept=".nes,.gb,.bin,.rom" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Game Sidebar */}
        <div className="w-72 border-r border-white/10 p-4 flex flex-col gap-3 overflow-y-auto bg-black/20">
          <div className="text-xs font-semibold text-white/60 mb-1">内蔵ゲームライブラリ</div>
          {BUILTIN_GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => { setCurrentGame(game); setIsPlaying(true); playSound('click'); }}
              className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${currentGame.id === game.id && isPlaying ? 'bg-cyan-500/20 border-cyan-400/50 text-white' : 'bg-white/[0.02] border-white/10 text-white/80 hover:bg-white/[0.06]'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{game.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-cyan-300">{game.system}</span>
              </div>
              <span className="text-[10px] text-white/50">{game.description}</span>
            </button>
          ))}

          {customRomName && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-left flex flex-col gap-1 mt-2">
              <div className="text-xs font-semibold text-cyan-300">カスタムROM</div>
              <span className="text-[10px] text-white/80 truncate">{customRomName}</span>
            </div>
          )}
        </div>

        {/* Main Emulator View */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-zinc-950 to-black relative">
          <div className="absolute top-4 left-6 flex items-center gap-4 text-xs font-mono">
            <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
              スコア: <span className="text-cyan-400 font-bold">{score}</span>
            </div>
            <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
              ハイスコア: <span className="text-amber-400 font-bold">{highScore}</span>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
            <canvas
              ref={canvasRef}
              width={480}
              height={360}
              className="block"
            />
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                <div className="text-base font-bold">{currentGame.title}</div>
                <button
                  onClick={() => setIsPlaying(true)}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:scale-105 transition"
                >
                  ゲームスタート
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 text-[11px] text-white/40 font-mono">
            操作方法: [A] [D] または [←] [→] キーでパドル操作
          </div>
        </div>
      </div>
    </div>
  );
}
