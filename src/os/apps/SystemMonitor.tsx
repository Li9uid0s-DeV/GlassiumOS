import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useOS } from '../OSContext';
import { Icon } from '../Icon';

export function SystemMonitorApp() {
  const { windows, closeWindow, focusWindow } = useOS();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cpuUsage, setCpuUsage] = useState(14);
  const [ramUsage, setRamUsage] = useState(1.8);
  const [activeTab, setActiveTab] = useState<'performance' | 'processes' | 'specs'>('performance');

  const historyRef = useRef<{ cpu: number[] }>({
    cpu: Array(40).fill(14),
  });

  useEffect(() => {
    let timer = performance.now();
    let raf = 0;

    const tick = () => {
      const now = performance.now();

      if (now - timer >= 1000) {
        timer = now;

        const baseCpu = 10 + windows.length * 4 + (Math.sin(now * 0.002) * 4 + Math.random() * 5);
        const clampedCpu = Math.min(95, Math.max(4, Math.round(baseCpu)));
        setCpuUsage(clampedCpu);

        const baseRam = 1.6 + windows.length * 0.25 + Math.sin(now * 0.001) * 0.1;
        setRamUsage(parseFloat(baseRam.toFixed(2)));

        historyRef.current.cpu.shift();
        historyRef.current.cpu.push(clampedCpu);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = (canvas.width = canvas.clientWidth);
          const h = (canvas.height = canvas.clientHeight);

          ctx.clearRect(0, 0, w, h);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          for (let y = 0; y < h; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          const cpuHist = historyRef.current.cpu;
          const step = w / (cpuHist.length - 1);

          ctx.beginPath();
          ctx.moveTo(0, h - (cpuHist[0] / 100) * (h - 20) - 10);
          for (let i = 1; i < cpuHist.length; i++) {
            const x = i * step;
            const y = h - (cpuHist[i] / 100) * (h - 20) - 10;
            ctx.lineTo(x, y);
          }

          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(0, h - (cpuHist[0] / 100) * (h - 20) - 10);
          for (let i = 1; i < cpuHist.length; i++) {
            const x = i * step;
            const y = h - (cpuHist[i] / 100) * (h - 20) - 10;
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [windows.length]);

  return (
    <div className="flex h-full w-full flex-col bg-slate-900/40 backdrop-blur-md text-white select-none">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-white/[0.04]">
        <div className="flex items-center gap-2">
          <Icon name="Activity" size={17} className="text-cyan-300" />
          <span className="text-sm font-semibold tracking-wide">System Monitor</span>
        </div>

        <div className="flex gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
          {(['performance', 'processes', 'specs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs rounded-lg capitalize font-medium transition ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-fuchsia-500/40 to-cyan-500/40 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'performance' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-panel p-3.5 rounded-xl flex flex-col justify-between border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60 font-medium">CPU Utilization</span>
                  <Icon name="Cpu" size={15} className="text-fuchsia-300" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{cpuUsage}%</span>
                  <span className="text-[11px] text-white/45">{navigator.hardwareConcurrency || 8} Threads</span>
                </div>
                <div className="w-full bg-black/40 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-fuchsia-500 to-violet-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${cpuUsage}%` }}
                  />
                </div>
              </div>

              <div className="glass-panel p-3.5 rounded-xl flex flex-col justify-between border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60 font-medium">Memory Allocation</span>
                  <Icon name="HardDrive" size={15} className="text-cyan-300" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{ramUsage} GB</span>
                  <span className="text-[11px] text-white/45">Active Heap</span>
                </div>
                <div className="w-full bg-black/40 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (ramUsage / 8) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="glass-panel p-3.5 rounded-xl flex flex-col justify-between border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60 font-medium">Active Windows</span>
                  <Icon name="Layers" size={15} className="text-violet-300" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{windows.length}</span>
                  <span className="text-[11px] text-white/45">Tasks</span>
                </div>
                <div className="w-full bg-black/40 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, windows.length * 15)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white/80">Resource Activity History</span>
                <span className="text-[11px] text-cyan-300 font-mono">60s Window</span>
              </div>
              <div className="h-44 w-full rounded-lg bg-black/40 border border-white/10 overflow-hidden relative">
                <canvas ref={canvasRef} className="h-full w-full" />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'processes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="flex justify-between text-[11px] text-white/50 px-3 pb-1 border-b border-white/10 font-semibold uppercase">
              <span>Process Name</span>
              <div className="flex gap-16 mr-12">
                <span>Memory</span>
                <span>Actions</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="glass-panel p-2.5 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Icon name="Shield" size={15} className="text-cyan-300" />
                  <span className="font-medium text-white">GlassiumOS Window Server</span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">SYSTEM</span>
                </div>
                <div className="flex items-center gap-12">
                  <span className="text-white/60 font-mono">96 MB</span>
                  <span className="text-white/35 text-[11px] mr-4">Active</span>
                </div>
              </div>

              {windows.map((win) => (
                <div key={win.id} className="glass-panel p-2.5 rounded-xl flex items-center justify-between text-xs group hover:bg-white/10 transition">
                  <div className="flex items-center gap-2.5">
                    <Icon name={win.icon} size={15} className="text-fuchsia-300" />
                    <span className="font-medium text-white">{win.title}</span>
                    <span className="text-[10px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded font-mono">ID: {win.id}</span>
                  </div>
                  <div className="flex items-center gap-8">
                    <span className="text-white/60 font-mono">{(48 + win.width * 0.05).toFixed(0)} MB</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => focusWindow(win.id)}
                        className="px-2 py-1 text-[11px] bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                      >
                        Focus
                      </button>
                      <button
                        onClick={() => closeWindow(win.id)}
                        className="px-2 py-1 text-[11px] bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-lg transition"
                      >
                        End
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'specs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="glass-panel p-4 rounded-xl space-y-3 border border-white/10">
              <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">System Specifications</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                  <div className="text-white/50 text-[11px]">System Version</div>
                  <div className="font-medium text-white mt-0.5">GlassiumOS-V4.0</div>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                  <div className="text-white/50 text-[11px]">Framework Stack</div>
                  <div className="font-medium text-white mt-0.5">React 19 + TypeScript + Tailwind CSS</div>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                  <div className="text-white/50 text-[11px]">Design Architecture</div>
                  <div className="font-medium text-white mt-0.5">2.5D Glassmorphism & Specular Gradients</div>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                  <div className="text-white/50 text-[11px]">Storage Persistence</div>
                  <div className="font-medium text-white mt-0.5">Local Virtual File System</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
