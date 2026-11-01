import { useState, useEffect, useRef, useMemo } from 'react';
import { useOS } from '../OSContext';
import { Icon } from '../Icon';
import { SysInfoView } from './ExtraAppsSuite';

interface ProcessStat {
  id: string;
  name: string;
  icon: string;
  cpu: number;
  memory: number; // in MB
  disk: number; // in MB/s
  status: 'Running' | 'Suspended';
  isSystem?: boolean;
}

type TaskTab = 'processes' | 'performance' | 'sysinfo' | 'history';

function resolveInitialTaskTab(tab?: string): TaskTab {
  if (tab === 'sysinfo') return 'sysinfo';
  if (tab === 'performance' || tab === 'sysmon') return 'performance';
  if (tab === 'history') return 'history';
  return 'processes';
}

export function TaskManager({ initialTab }: { initialTab?: string } = {}) {
  const { windows, closeWindow, openApp } = useOS();
  const [activeTab, setActiveTab] = useState<TaskTab>(() => resolveInitialTaskTab(initialTab));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) setActiveTab(resolveInitialTaskTab(initialTab));
  }, [initialTab]);

  const [perfHistory, setPerfHistory] = useState<{ cpu: number; mem: number; gpu: number }[]>(() =>
    Array(30).fill({ cpu: 12, mem: 24, gpu: 8 })
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const systemProcesses: ProcessStat[] = useMemo(() => [
    { id: 'sys-dwm', name: 'Glassium Compositor (DWM)', icon: 'Layers', cpu: 2.8, memory: 96, disk: 0.1, status: 'Running', isSystem: true },
    { id: 'sys-kernel', name: 'GlassiumOS 5 Kernel', icon: 'Cpu', cpu: 1.1, memory: 64, disk: 0.2, status: 'Running', isSystem: true },
    { id: 'sys-audio', name: 'WebAudio Synth Service', icon: 'Music', cpu: 0.4, memory: 38, disk: 0.0, status: 'Running', isSystem: true },
    { id: 'sys-three', name: 'WebGL Shader Pipeline', icon: 'Sparkles', cpu: 3.5, memory: 128, disk: 0.4, status: 'Running', isSystem: true },
  ], []);

  const windowProcesses: ProcessStat[] = useMemo(() => {
    return windows.map((w) => {
      let baseMem = 45;
      let baseCpu = 1.2;
      if (w.appId === 'game') { baseMem = 280; baseCpu = 8.5; }
      else if (w.appId === 'browser') { baseMem = 190; baseCpu = 3.2; }
      else if (w.appId === 'synth') { baseMem = 85; baseCpu = 2.4; }
      else if (w.appId === 'explorer') { baseMem = 55; baseCpu = 0.8; }

      return {
        id: w.id,
        name: w.title || w.appId,
        icon: w.icon || 'AppWindow',
        cpu: Math.round((baseCpu + Math.random() * 1.5) * 10) / 10,
        memory: Math.round(baseMem + Math.random() * 10),
        disk: Math.round(Math.random() * 0.5 * 10) / 10,
        status: w.minimized ? 'Suspended' : 'Running',
        isSystem: false,
      };
    });
  }, [windows]);

  const allProcesses = useMemo(
    () => [...windowProcesses, ...systemProcesses],
    [windowProcesses, systemProcesses]
  );

  const filteredProcesses = allProcesses.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const totalCpu = Math.min(
        100,
        Math.round(allProcesses.reduce((acc, p) => acc + p.cpu, 4) + Math.sin(Date.now() / 2000) * 5)
      );
      const totalMem = Math.min(
        100,
        Math.round(allProcesses.reduce((acc, p) => acc + p.memory, 300) / 16)
      );
      const totalGpu = Math.min(100, Math.round(18 + Math.random() * 12));

      setPerfHistory((prev) => [...prev.slice(1), { cpu: totalCpu, mem: totalMem, gpu: totalGpu }]);
    }, 1000);

    return () => clearInterval(timer);
  }, [allProcesses]);

  useEffect(() => {
    if (activeTab !== 'performance' || !canvasRef.current) return;
    const cvs = canvasRef.current;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const w = (cvs.width = cvs.clientWidth * window.devicePixelRatio);
    const h = (cvs.height = cvs.clientHeight * window.devicePixelRatio);

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x < w; x += w / 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    perfHistory.forEach((pt, i) => {
      const x = (i / (perfHistory.length - 1)) * w;
      const y = h - (pt.cpu / 100) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    perfHistory.forEach((pt, i) => {
      const x = (i / (perfHistory.length - 1)) * w;
      const y = h - (pt.mem / 100) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [perfHistory, activeTab]);

  const handleEndTask = () => {
    if (!selectedProcessId) return;
    const targetWin = windows.find((w) => w.id === selectedProcessId);
    if (targetWin) {
      closeWindow(targetWin.id);
      setSelectedProcessId(null);
    }
  };

  const totalCpuUsage = perfHistory[perfHistory.length - 1]?.cpu || 15;
  const totalMemUsage = perfHistory[perfHistory.length - 1]?.mem || 28;

  return (
    <div className="flex h-full w-full select-none flex-col bg-slate-950/50 text-white backdrop-blur-xl">
      {/* Top Hairline Navigation Bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 text-xs">
        <div className="flex items-center gap-5">
          {[
            { id: 'processes' as const, label: 'プロセス', icon: 'List' },
            { id: 'performance' as const, label: 'パフォーマンス', icon: 'Activity' },
            { id: 'sysinfo' as const, label: 'システム診断', icon: 'Cpu' },
            { id: 'history' as const, label: '実行履歴', icon: 'History' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 py-3 border-b-2 font-medium transition-colors ${
                activeTab === t.id
                  ? 'border-sky-400 text-sky-300'
                  : 'border-transparent text-white/50 hover:text-white/85'
              }`}
            >
              <Icon name={t.icon} size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 py-1.5">
          <button
            onClick={handleEndTask}
            disabled={!selectedProcessId || selectedProcessId.startsWith('sys-')}
            className="flex items-center gap-1.5 py-1 text-rose-400 transition-colors hover:text-rose-300 disabled:opacity-30"
          >
            <Icon name="XCircle" size={14} /> タスクを終了
          </button>
          <button
            onClick={() => openApp('terminal', { title: 'Terminal', icon: 'SquareTerminal' })}
            className="flex items-center gap-1.5 py-1 text-white/75 transition-colors hover:text-white"
          >
            <Icon name="Plus" size={14} /> 新しいタスクを実行
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'processes' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <div className="flex items-center gap-2 border-b border-white/20 pb-1 w-64">
              <Icon name="Search" size={13} className="text-white/40" />
              <input
                type="text"
                placeholder="プロセスを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-white/40 outline-none"
              />
            </div>

            <div className="flex items-center gap-6 text-xs text-white/70">
              <div>
                CPU: <span className="font-mono font-semibold text-sky-400">{totalCpuUsage}%</span>
              </div>
              <div>
                メモリ: <span className="font-mono font-semibold text-purple-400">{totalMemUsage}%</span>
              </div>
              <div>
                実行数: <span className="font-mono font-semibold text-emerald-400">{allProcesses.length}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-900/90 text-white/60 backdrop-blur-md">
                <tr className="border-b border-white/10">
                  <th className="py-2.5 pl-4 pr-2 font-medium">名前</th>
                  <th className="py-2.5 px-3 font-medium">状態</th>
                  <th className="py-2.5 px-3 text-right font-medium">CPU</th>
                  <th className="py-2.5 px-3 text-right font-medium">メモリ</th>
                  <th className="py-2.5 px-3 text-right font-medium">ディスク</th>
                  <th className="py-2.5 pr-4 text-right font-medium">種別</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredProcesses.map((proc) => {
                  const isSelected = selectedProcessId === proc.id;
                  return (
                    <tr
                      key={proc.id}
                      onClick={() => setSelectedProcessId(proc.id)}
                      onDoubleClick={() => {
                        if (!proc.isSystem) closeWindow(proc.id);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-500/20 text-white'
                          : 'hover:bg-white/5 text-white/80'
                      }`}
                    >
                      <td className="py-2.5 pl-4 pr-2">
                        <div className="flex items-center gap-2">
                          <Icon name={proc.icon} size={14} className={proc.isSystem ? 'text-amber-400' : 'text-sky-400'} />
                          <span className="font-medium">{proc.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[11px] font-medium ${
                            proc.status === 'Running' ? 'text-emerald-300' : 'text-amber-300'
                          }`}
                        >
                          {proc.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white/90">{proc.cpu}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white/90">{proc.memory} MB</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white/60">{proc.disk} MB/s</td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className="text-[11px] text-white/40">
                          {proc.isSystem ? 'System' : 'Application'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
          <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10 pb-5">
            <div className="pr-4">
              <div className="text-xs text-sky-300 font-medium">CPU 使用率</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-white">{totalCpuUsage}%</div>
              <div className="mt-1 text-[11px] text-white/50">8 Cores @ 3.60 GHz</div>
            </div>
            <div className="px-4">
              <div className="text-xs text-purple-300 font-medium">メモリ (RAM)</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-white">4.8 / 16.0 GB</div>
              <div className="mt-1 text-[11px] text-white/50">{totalMemUsage}% 使用中</div>
            </div>
            <div className="pl-4">
              <div className="text-xs text-emerald-300 font-medium">GPU 描画パイプライン</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-white">
                {perfHistory[perfHistory.length - 1]?.gpu || 20}%
              </div>
              <div className="mt-1 text-[11px] text-white/50">WebGL 2.0 Engine</div>
            </div>
          </div>

          <div className="flex-1 min-h-[220px] relative overflow-hidden flex flex-col">
            <div className="flex items-center justify-between text-xs text-white/70 mb-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-400 inline-block" /> CPU %
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-400 inline-block" /> メモリ %
                </span>
              </div>
              <span className="text-[11px] text-white/40">60秒リアルタイム推移</span>
            </div>
            <canvas ref={canvasRef} className="flex-1 w-full h-full border-b border-white/10" />
          </div>
        </div>
      )}

      {/* System Diagnostics Tab */}
      {activeTab === 'sysinfo' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <SysInfoView />
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="flex flex-1 flex-col p-6">
          <div className="text-xs text-white/60 mb-3">アプリケーション別の累積リソース使用履歴:</div>
          <div className="divide-y divide-white/10 border-t border-b border-white/10 overflow-y-auto">
            {TASK_HISTORY.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-3.5 text-xs">
                <div className="flex items-center gap-3">
                  <Icon name={item.icon} size={16} className="text-sky-400" />
                  <div>
                    <div className="font-medium text-white">{item.name}</div>
                    <div className="text-[11px] text-white/40">最終起動: {item.lastRun}</div>
                  </div>
                </div>
                <div className="text-right font-mono text-white/80">
                  <div>CPU 時間: {item.cpuTime}</div>
                  <div className="text-[11px] text-white/50">最大メモリ: {item.peakMem} MB</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TASK_HISTORY = [
  { name: 'Games & 3D Engine', icon: 'Gamepad2', lastRun: '2 mins ago', cpuTime: '00:04:12', peakMem: 310 },
  { name: 'Browser', icon: 'Globe', lastRun: '15 mins ago', cpuTime: '00:12:45', peakMem: 210 },
  { name: 'Music & Synth Studio', icon: 'Music', lastRun: '1 hour ago', cpuTime: '00:08:20', peakMem: 95 },
  { name: 'Terminal', icon: 'SquareTerminal', lastRun: 'Today, 10:24 AM', cpuTime: '00:01:14', peakMem: 42 },
  { name: 'Editor', icon: 'FileText', lastRun: 'Today, 09:15 AM', cpuTime: '00:00:48', peakMem: 38 },
];
