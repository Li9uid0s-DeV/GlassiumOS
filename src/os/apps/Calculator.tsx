import { useState, useEffect, useCallback } from 'react';
import { Icon } from '../Icon';
import { UnitConverterView, BmiView, ExpenseView } from './ExtraAppsSuite';

export type CalcMode = 'standard' | 'scientific' | 'unitconverter' | 'bmi' | 'expense';

export function Calculator({ initialTab }: { initialTab?: string }) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [mode, setMode] = useState<CalcMode>(() => {
    if (initialTab === 'unitconverter' || initialTab === 'bmi' || initialTab === 'expense' || initialTab === 'scientific') {
      return initialTab;
    }
    return 'standard';
  });
  const [memory, setMemory] = useState<number>(0);
  const [history, setHistory] = useState<{ eq: string; res: string }[]>(() => {
    try {
      const saved = localStorage.getItem('liquidos_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  useEffect(() => {
    if (initialTab === 'unitconverter' || initialTab === 'bmi' || initialTab === 'expense' || initialTab === 'scientific') {
      setMode(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    try {
      localStorage.setItem('liquidos_calc_history', JSON.stringify(history.slice(0, 30)));
    } catch {
      // ignore
    }
  }, [history]);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setEquation('');
    setWaitingForOperand(false);
  };

  const clearEntry = () => {
    setDisplay('0');
  };

  const backspace = () => {
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const toggleSign = () => {
    const val = parseFloat(display);
    if (!isNaN(val) && val !== 0) {
      setDisplay(String(-val));
    }
  };

  const performOp = (nextOp: string) => {
    const inputValue = parseFloat(display);
    if (equation && !waitingForOperand) {
      const result = evaluateEquation(equation + ' ' + inputValue);
      setDisplay(String(result));
      setEquation(String(result) + ' ' + nextOp);
    } else {
      setEquation(inputValue + ' ' + nextOp);
    }
    setWaitingForOperand(true);
  };

  const evaluateEquation = (expr: string): number => {
    try {
      const clean = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-');
      const fn = new Function(`return (${clean})`);
      const val = fn();
      return isFinite(val) ? Math.round(val * 1e10) / 1e10 : 0;
    } catch {
      return 0;
    }
  };

  const calculate = () => {
    if (!equation) return;
    const fullEq = `${equation} ${display}`;
    const result = evaluateEquation(fullEq);
    setDisplay(String(result));
    setHistory((prev) => [{ eq: fullEq, res: String(result) }, ...prev]);
    setEquation('');
    setWaitingForOperand(true);
  };

  const performSciFunc = (func: string) => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    let res = 0;
    switch (func) {
      case 'sin':
        res = Math.sin((val * Math.PI) / 180);
        break;
      case 'cos':
        res = Math.cos((val * Math.PI) / 180);
        break;
      case 'tan':
        res = Math.tan((val * Math.PI) / 180);
        break;
      case 'sqrt':
        res = val >= 0 ? Math.sqrt(val) : NaN;
        break;
      case 'sqr':
        res = Math.pow(val, 2);
        break;
      case 'cube':
        res = Math.pow(val, 3);
        break;
      case 'inv':
        res = val !== 0 ? 1 / val : NaN;
        break;
      case 'ln':
        res = val > 0 ? Math.log(val) : NaN;
        break;
      case 'log':
        res = val > 0 ? Math.log10(val) : NaN;
        break;
      case 'fact':
        res = factorial(Math.min(100, Math.floor(Math.abs(val))));
        break;
      case 'pi':
        res = Math.PI;
        break;
      case 'e':
        res = Math.E;
        break;
      default:
        res = val;
    }
    setDisplay(isNaN(res) ? 'Error' : String(Math.round(res * 1e10) / 1e10));
    setWaitingForOperand(true);
  };

  const factorial = (n: number): number => {
    if (n <= 1) return 1;
    let acc = 1;
    for (let i = 2; i <= n; i++) acc *= i;
    return acc;
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (mode !== 'standard' && mode !== 'scientific') return;
      if (e.key >= '0' && e.key <= '9') inputDigit(e.key);
      else if (e.key === '.') inputDecimal();
      else if (e.key === '+' || e.key === '-') performOp(e.key === '-' ? '−' : '+');
      else if (e.key === '*') performOp('×');
      else if (e.key === '/') performOp('÷');
      else if (e.key === 'Enter' || e.key === '=') calculate();
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape') clearAll();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [display, equation, waitingForOperand, mode]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const TABS: { id: CalcMode; label: string }[] = [
    { id: 'standard', label: '標準電卓' },
    { id: 'scientific', label: '関数電卓' },
    { id: 'unitconverter', label: '単位変換' },
    { id: 'bmi', label: 'BMI計算' },
    { id: 'expense', label: '収支記録' },
  ];

  return (
    <div className="flex h-full w-full select-none flex-col bg-slate-950 text-white">
      {/* Top Hairline Navigation Bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 text-xs shrink-0 overflow-x-auto">
        <div className="flex items-center gap-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`py-3 border-b-2 transition whitespace-nowrap ${
                mode === t.id
                  ? 'border-cyan-400 text-cyan-300 font-semibold'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(mode === 'standard' || mode === 'scientific') && (
          <div className="flex items-center gap-3 pl-2">
            {memory !== 0 && (
              <span className="text-[11px] font-mono text-cyan-300">
                M = {memory}
              </span>
            )}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 transition ${
                showHistory ? 'text-cyan-300' : 'text-white/50 hover:text-white'
              }`}
              title="計算履歴"
            >
              <Icon name="History" size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Sub-Views for Unit Converter, BMI, Expense */}
      {mode === 'unitconverter' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <UnitConverterView />
        </div>
      ) : mode === 'bmi' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <BmiView />
        </div>
      ) : mode === 'expense' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ExpenseView />
        </div>
      ) : (
        <>
          {/* Main display */}
          <div className="flex flex-1 flex-col justify-end px-5 py-4 text-right">
            <div className="h-6 font-mono text-sm tracking-wide text-white/50">{equation}</div>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-3xl font-light tracking-tight text-white/95">
              {display}
            </div>
          </div>

          {/* Memory Bar */}
          <div className="grid grid-cols-5 divide-x divide-white/10 border-t border-white/10 text-xs text-white/70">
            <button
              onClick={() => setMemory(0)}
              disabled={memory === 0}
              className="py-2 font-medium transition-colors hover:bg-white/5 disabled:opacity-30"
            >
              MC
            </button>
            <button
              onClick={() => { setDisplay(String(memory)); setWaitingForOperand(true); }}
              disabled={memory === 0}
              className="py-2 font-medium transition-colors hover:bg-white/5 disabled:opacity-30"
            >
              MR
            </button>
            <button
              onClick={() => setMemory((m) => m + parseFloat(display))}
              className="py-2 font-medium transition-colors hover:bg-white/5"
            >
              M+
            </button>
            <button
              onClick={() => setMemory((m) => m - parseFloat(display))}
              className="py-2 font-medium transition-colors hover:bg-white/5"
            >
              M-
            </button>
            <button
              onClick={() => setMemory(parseFloat(display))}
              className="py-2 font-medium transition-colors hover:bg-white/5"
            >
              MS
            </button>
          </div>

          {/* Keypad */}
          <div className="flex-1 border-t border-white/10">
            {mode === 'scientific' ? (
              <div className="grid h-full grid-cols-5 divide-x divide-y divide-white/10 text-xs">
                <button onClick={() => performSciFunc('sin')} className="calc-cell sci">sin</button>
                <button onClick={() => performSciFunc('cos')} className="calc-cell sci">cos</button>
                <button onClick={() => performSciFunc('tan')} className="calc-cell sci">tan</button>
                <button onClick={() => performSciFunc('pi')} className="calc-cell sci">π</button>
                <button onClick={() => performSciFunc('e')} className="calc-cell sci">e</button>

                <button onClick={() => performSciFunc('sqr')} className="calc-cell sci">x²</button>
                <button onClick={() => performSciFunc('cube')} className="calc-cell sci">x³</button>
                <button onClick={() => performSciFunc('sqrt')} className="calc-cell sci">√x</button>
                <button onClick={() => performSciFunc('ln')} className="calc-cell sci">ln</button>
                <button onClick={() => performSciFunc('log')} className="calc-cell sci">log</button>

                <button onClick={() => performSciFunc('inv')} className="calc-cell sci">1/x</button>
                <button onClick={() => performSciFunc('fact')} className="calc-cell sci">n!</button>
                <button onClick={clearEntry} className="calc-cell fn">CE</button>
                <button onClick={clearAll} className="calc-cell fn">C</button>
                <button onClick={backspace} className="calc-cell fn"><Icon name="Delete" size={14} /></button>

                <button onClick={() => inputDigit('7')} className="calc-cell num">7</button>
                <button onClick={() => inputDigit('8')} className="calc-cell num">8</button>
                <button onClick={() => inputDigit('9')} className="calc-cell num">9</button>
                <button onClick={() => performOp('÷')} className="calc-cell op">÷</button>
                <button onClick={toggleSign} className="calc-cell fn">±</button>

                <button onClick={() => inputDigit('4')} className="calc-cell num">4</button>
                <button onClick={() => inputDigit('5')} className="calc-cell num">5</button>
                <button onClick={() => inputDigit('6')} className="calc-cell num">6</button>
                <button onClick={() => performOp('×')} className="calc-cell op">×</button>
                <button onClick={calculate} className="calc-cell equal row-span-2">=</button>

                <button onClick={() => inputDigit('1')} className="calc-cell num">1</button>
                <button onClick={() => inputDigit('2')} className="calc-cell num">2</button>
                <button onClick={() => inputDigit('3')} className="calc-cell num">3</button>
                <button onClick={() => performOp('−')} className="calc-cell op">−</button>

                <button onClick={() => inputDigit('0')} className="calc-cell num col-span-2">0</button>
                <button onClick={inputDecimal} className="calc-cell num">.</button>
                <button onClick={() => performOp('+')} className="calc-cell op">+</button>
              </div>
            ) : (
              <div className="grid h-full grid-cols-4 divide-x divide-y divide-white/10 text-sm">
                <button onClick={clearEntry} className="calc-cell fn">CE</button>
                <button onClick={clearAll} className="calc-cell fn">C</button>
                <button onClick={backspace} className="calc-cell fn"><Icon name="Delete" size={16} /></button>
                <button onClick={() => performOp('÷')} className="calc-cell op">÷</button>

                <button onClick={() => inputDigit('7')} className="calc-cell num">7</button>
                <button onClick={() => inputDigit('8')} className="calc-cell num">8</button>
                <button onClick={() => inputDigit('9')} className="calc-cell num">9</button>
                <button onClick={() => performOp('×')} className="calc-cell op">×</button>

                <button onClick={() => inputDigit('4')} className="calc-cell num">4</button>
                <button onClick={() => inputDigit('5')} className="calc-cell num">5</button>
                <button onClick={() => inputDigit('6')} className="calc-cell num">6</button>
                <button onClick={() => performOp('−')} className="calc-cell op">−</button>

                <button onClick={() => inputDigit('1')} className="calc-cell num">1</button>
                <button onClick={() => inputDigit('2')} className="calc-cell num">2</button>
                <button onClick={() => inputDigit('3')} className="calc-cell num">3</button>
                <button onClick={() => performOp('+')} className="calc-cell op">+</button>

                <button onClick={toggleSign} className="calc-cell fn">±</button>
                <button onClick={() => inputDigit('0')} className="calc-cell num">0</button>
                <button onClick={inputDecimal} className="calc-cell num">.</button>
                <button onClick={calculate} className="calc-cell equal">=</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* History Slide-out Tape */}
      {showHistory && (
        <div className="absolute inset-0 z-30 flex flex-col bg-slate-950/95 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-sm font-semibold text-white">計算履歴</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setHistory([])}
                className="text-xs text-rose-400 hover:underline"
              >
                クリア
              </button>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 text-white/60 hover:text-white"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 divide-y divide-white/10 overflow-y-auto">
            {history.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-white/40">
                計算履歴はありません
              </div>
            ) : (
              history.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setDisplay(item.res);
                    setShowHistory(false);
                  }}
                  className="cursor-pointer py-3 text-right transition-colors hover:bg-white/[0.03]"
                >
                  <div className="text-xs text-white/50">{item.eq}</div>
                  <div className="font-mono text-base font-medium text-cyan-300">{item.res}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .calc-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          transition: background-color 0.12s ease;
          user-select: none;
        }
        .calc-cell.num {
          background: transparent;
          color: #ffffff;
        }
        .calc-cell.num:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .calc-cell.fn {
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.7);
        }
        .calc-cell.fn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }
        .calc-cell.sci {
          background: rgba(56, 189, 248, 0.04);
          color: rgba(186, 230, 253, 0.9);
          font-size: 11px;
        }
        .calc-cell.sci:hover {
          background: rgba(56, 189, 248, 0.12);
          color: #ffffff;
        }
        .calc-cell.op {
          background: rgba(56, 189, 248, 0.08);
          color: #38bdf8;
          font-size: 16px;
        }
        .calc-cell.op:hover {
          background: rgba(56, 189, 248, 0.18);
          color: #ffffff;
        }
        .calc-cell.equal {
          background: #06b6d4;
          color: #020617;
          font-weight: 700;
        }
        .calc-cell.equal:hover {
          background: #22d3ee;
        }
      `}</style>
    </div>
  );
}
