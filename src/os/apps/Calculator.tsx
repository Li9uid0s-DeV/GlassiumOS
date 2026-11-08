import { useState, useEffect, useCallback } from 'react';
import { Icon } from '../Icon';
import { useOS } from '../OSContext';
import { requestAIChat } from '../aiClient';
import { UnitConverterView, BmiView, ExpenseView } from './ExtraAppsSuite';

export type CalcMode = 'standard' | 'scientific' | 'ai-simulator' | 'unitconverter' | 'bmi' | 'expense';

export interface TaggedVariable {
  id: string;
  tag: string;
  value: number;
  formula?: string;
}

export interface ContextSimResult {
  prompt: string;
  formula: string;
  total: number;
  breakdown: { label: string; amount: number; color: string }[];
  forecastNote: string;
}

/**
 * SpectClip Parser:
 * Strips Japanese units/currencies/kanji ("1,500円×3個", "月額3,000円×24ヶ月", "1200 + 450円")
 * and converts full-width digits/operators into a clean arithmetic expression.
 */
export function parseSpectClipExpression(raw: string): { cleanExpr: string; result: number | null } {
  if (!raw || !raw.trim()) return { cleanExpr: '', result: null };

  // Convert full-width numbers and operators to half-width
  let s = raw
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/，|、|,/g, '')
    .replace(/×|✕|✖|x|X/g, '*')
    .replace(/÷|／/g, '/')
    .replace(/＋/g, '+')
    .replace(/−|ー|―|－/g, '-')
    .replace(/（/g, '(')
    .replace(/）/g, ')');

  // Convert Japanese multiplier units like 5万 -> 50000, 3千 -> 3000, 2億 -> 200000000
  s = s.replace(/(\d+(?:\.\d+)?)\s*億/g, (_, n) => String(parseFloat(n) * 100000000));
  s = s.replace(/(\d+(?:\.\d+)?)\s*万/g, (_, n) => String(parseFloat(n) * 10000));
  s = s.replace(/(\d+(?:\.\d+)?)\s*千/g, (_, n) => String(parseFloat(n) * 1000));

  // Strip currency and unit words (円, 個, ヶ月, ヵ月, 年, 人, 回, 時間, 日, 本, 枚, 袋, 台, ¥, $, etc.)
  s = s.replace(/[¥$€£]/g, '');
  s = s.replace(/[^0-9+\-*/().%\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  // If spaces separate numbers without operators, join only valid tokens
  const cleanExpr = s.replace(/\s+/g, '');
  if (!cleanExpr || !/\d/.test(cleanExpr) || !/^[0-9+\-*/().%]+$/.test(cleanExpr)) {
    return { cleanExpr: '', result: null };
  }

  try {
    const fn = new Function(`return (${cleanExpr})`);
    const val = fn();
    if (typeof val === 'number' && Number.isFinite(val)) {
      return { cleanExpr, result: Math.round(val * 1e10) / 1e10 };
    }
  } catch {
    // ignore parse failure
  }
  return { cleanExpr, result: null };
}

/**
 * Natural language Context Formula Simulator parser:
 * Handles Japanese/English financial & project scenarios, plus AI fallback.
 */
function simulateContextFormulaLocally(prompt: string, savedVars: TaggedVariable[]): ContextSimResult {
  const text = prompt.trim();

  // Inject any referenced saved variable tags
  let enrichedText = text;
  savedVars.forEach((v) => {
    if (enrichedText.includes(v.tag)) {
      enrichedText = enrichedText.replaceAll(v.tag, `${v.value}`);
    }
  });

  // Normalize full-width digits
  const norm = enrichedText
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/,/g, '');

  // Pattern 1: Initial cost + monthly cost * years/months (e.g. "初期費用が5万円で、毎月3,000円のサーバー代がかかる場合、2年間の総額は？")
  const initMatch = norm.match(/初期[^\d]*(\d+(?:\.\d+)?)\s*(万)?/);
  const monthlyMatch = norm.match(/(?:毎月|月額)[^\d]*(\d+(?:\.\d+)?)\s*(万)?/);
  const yearsMatch = norm.match(/(\d+(?:\.\d+)?)\s*年/);
  const monthsMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:ヶ月|か月|カ月|月間)/);

  if (initMatch || monthlyMatch) {
    const initVal = initMatch ? parseFloat(initMatch[1]) * (initMatch[2] === '万' ? 10000 : 1) : 0;
    const monthlyVal = monthlyMatch ? parseFloat(monthlyMatch[1]) * (monthlyMatch[2] === '万' ? 10000 : 1) : 0;
    const months = yearsMatch
      ? parseFloat(yearsMatch[1]) * 12
      : monthsMatch
      ? parseFloat(monthsMatch[1])
      : 12;

    const recurringTotal = monthlyVal * months;
    const total = initVal + recurringTotal;
    const formula =
      initVal > 0 && monthlyVal > 0
        ? `${initVal} + (${monthlyVal} * ${months})`
        : monthlyVal > 0
        ? `${monthlyVal} * ${months}`
        : `${initVal}`;

    const breakdown: { label: string; amount: number; color: string }[] = [];
    if (initVal > 0) breakdown.push({ label: '初期費用 (Initial)', amount: initVal, color: '#06b6d4' });
    if (recurringTotal > 0)
      breakdown.push({ label: `継続費用 (${months}ヶ月分)`, amount: recurringTotal, color: '#8b5cf6' });

    const devVar = savedVars.find((v) => v.tag.includes('開発') || v.tag.includes('予算'));
    const runwayMonths =
      monthlyVal > 0
        ? Math.floor((devVar ? devVar.value : Math.max(total * 1.5, 300000)) / monthlyVal)
        : 24;

    return {
      prompt,
      formula,
      total,
      breakdown: breakdown.length ? breakdown : [{ label: '算出合計', amount: total, color: '#06b6d4' }],
      forecastNote: `予測シミュレーション: 月額 ${monthlyVal.toLocaleString()}円のペースで運用した場合、1年あたり ${(monthlyVal * 12).toLocaleString()}円（日割り約 ${Math.round(monthlyVal / 30).toLocaleString()}円）。予備予算 300,000円 に対するランウェイは約 ${runwayMonths}ヶ月です。`,
    };
  }

  // Pattern 2: Runway / Budget question ("予算100万円で毎月8万円使うと何ヶ月持つ？")
  const numbers: number[] = [];
  const numRegex = /(\d+(?:\.\d+)?)\s*(億|万|千)?/g;
  let m: RegExpExecArray | null;
  while ((m = numRegex.exec(norm)) !== null) {
    const mult = m[2] === '億' ? 1e8 : m[2] === '万' ? 1e4 : m[2] === '千' ? 1e3 : 1;
    numbers.push(parseFloat(m[1]) * mult);
  }

  if ((norm.includes('何ヶ月') || norm.includes('何カ月') || norm.includes('持つ')) && numbers.length >= 2) {
    const budget = Math.max(numbers[0], numbers[1]);
    const burn = Math.min(numbers[0], numbers[1]);
    const months = burn > 0 ? Math.round((budget / burn) * 10) / 10 : 0;
    return {
      prompt,
      formula: `${budget} / ${burn}`,
      total: months,
      breakdown: [
        { label: '総予算 (Budget)', amount: budget, color: '#10b981' },
        { label: '月間消費 (Monthly Burn)', amount: burn, color: '#f43f5e' },
      ],
      forecastNote: `ランウェイ予測: 総予算 ${budget.toLocaleString()}円 を毎月 ${burn.toLocaleString()}円 のペースで使用すると、約 ${months}ヶ月 持続します（10%節約時は約 ${Math.round((budget / (burn * 0.9)) * 10) / 10}ヶ月）。`,
    };
  }

  // Pattern 3: SpectClip expression fallback
  const spect = parseSpectClipExpression(norm);
  if (spect.result !== null) {
    return {
      prompt,
      formula: spect.cleanExpr,
      total: spect.result,
      breakdown: [{ label: '計算結果', amount: Math.abs(spect.result), color: '#06b6d4' }],
      forecastNote: `数式「${spect.cleanExpr}」を自動抽出して計算しました。`,
    };
  }

  // Pattern 4: Sum all extracted numbers
  if (numbers.length > 0) {
    const sum = numbers.reduce((a, b) => a + b, 0);
    return {
      prompt,
      formula: numbers.join(' + '),
      total: sum,
      breakdown: numbers.map((n, idx) => ({
        label: `項目 ${idx + 1}`,
        amount: n,
        color: ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'][idx % 5],
      })),
      forecastNote: `入力テキスト内の数値項目（計 ${numbers.length} 件）を合算して内訳を算出しました。`,
    };
  }

  return {
    prompt,
    formula: '50000 + (3000 * 24)',
    total: 122000,
    breakdown: [
      { label: '初期費用', amount: 50000, color: '#06b6d4' },
      { label: '月額費用 (24ヶ月)', amount: 72000, color: '#8b5cf6' },
    ],
    forecastNote: '例:「初期費用が5万円で、毎月3,000円のサーバー代がかかる場合、2年間の総額は？」のように入力してください。',
  };
}

export function Calculator({ initialTab }: { initialTab?: string }) {
  const { windows, updateWindowRect, openApp, saveFile, addNotification, playSound } = useOS();

  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [mode, setMode] = useState<CalcMode>(() => {
    if (
      initialTab === 'unitconverter' ||
      initialTab === 'bmi' ||
      initialTab === 'expense' ||
      initialTab === 'scientific' ||
      initialTab === 'ai-simulator'
    ) {
      return initialTab;
    }
    return 'standard';
  });

  // Mini Widget / Magnetic Edge Dock State
  const [miniWidgetMode, setMiniWidgetMode] = useState<boolean>(false);
  const [dockSide, setDockSide] = useState<'left' | 'right'>('right');

  // SpectClip Smart Clipboard Input
  const [spectClipInput, setSpectClipInput] = useState('');
  const [spectClipStatus, setSpectClipStatus] = useState<string>('');
  const [copiedClean, setCopiedClean] = useState(false);

  // Smart Tag Variable Storage ("計算履歴のスマート・タグ保存")
  const [taggedVars, setTaggedVars] = useState<TaggedVariable[]>(() => {
    try {
      const saved = localStorage.getItem('glasispect_calc_tagged_vars');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { id: 'tv-1', tag: '家賃', value: 54300, formula: '54300' },
      { id: 'tv-2', tag: '開発費', value: 120000, formula: '40000 * 3' },
      { id: 'tv-3', tag: 'サーバー代', value: 36000, formula: '3000 * 12' },
    ];
  });
  const [newTagName, setNewTagName] = useState('');

  // AI Context Formula Simulator State
  const [simPrompt, setSimPrompt] = useState(
    '初期費用が5万円で、毎月3,000円のサーバー代がかかる場合、2年間の総額は？'
  );
  const [simResult, setSimResult] = useState<ContextSimResult>(() =>
    simulateContextFormulaLocally('初期費用が5万円で、毎月3,000円のサーバー代がかかる場合、2年間の総額は？', [])
  );
  const [simLoading, setSimLoading] = useState(false);

  const [memory] = useState<number>(0);
  const [history, setHistory] = useState<{ eq: string; res: string }[]>(() => {
    try {
      const saved = localStorage.getItem('liquidos_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  useEffect(() => {
    if (
      initialTab === 'unitconverter' ||
      initialTab === 'bmi' ||
      initialTab === 'expense' ||
      initialTab === 'scientific'
    ) {
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

  useEffect(() => {
    try {
      localStorage.setItem('glasispect_calc_tagged_vars', JSON.stringify(taggedVars));
    } catch {
      // ignore
    }
  }, [taggedVars]);

  // Listen for WindowFrame magnetic edge drag event
  useEffect(() => {
    const onEdgeDock = (e: Event) => {
      const detail = (e as CustomEvent<{ side: 'left' | 'right'; docked: boolean }>).detail;
      if (detail) {
        setDockSide(detail.side);
        setMiniWidgetMode(detail.docked);
        playSound('notify');
      }
    };
    window.addEventListener('glasispect-calc-edge-dock', onEdgeDock);
    return () => window.removeEventListener('glasispect-calc-edge-dock', onEdgeDock);
  }, [playSound]);

  // Toggle Magnetic Edge Mini Widget Mode programmatically
  const toggleMiniWidgetDock = (side: 'left' | 'right' = dockSide) => {
    const calcWin = windows.find((w) => w.appId === 'calculator');
    const nextMini = !miniWidgetMode;
    setMiniWidgetMode(nextMini);
    setDockSide(side);
    playSound('click');

    if (calcWin) {
      const vw = window.innerWidth;
      if (nextMini) {
        updateWindowRect(calcWin.id, {
          x: side === 'left' ? 10 : vw - 330,
          y: 72,
          width: 320,
          height: 460,
        });
      } else {
        updateWindowRect(calcWin.id, {
          x: Math.max(80, Math.floor((vw - 680) / 2)),
          y: 90,
          width: 680,
          height: 540,
        });
      }
    }
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

  // Apply SpectClip smart string ("1,500円×3個" -> 4500)
  const applySpectClip = (rawText: string) => {
    setSpectClipInput(rawText);
    const { cleanExpr, result } = parseSpectClipExpression(rawText);
    if (result !== null) {
      setEquation(cleanExpr);
      setDisplay(String(result));
      setWaitingForOperand(true);
      setHistory((prev) => [{ eq: `${rawText.trim()} → ${cleanExpr}`, res: String(result) }, ...prev]);
      setSpectClipStatus(`SpectClip 変換完了: ${cleanExpr} = ${result.toLocaleString()}`);
      playSound('click');
    } else if (rawText.trim()) {
      setSpectClipStatus('数値または数式を検出できませんでした');
    } else {
      setSpectClipStatus('');
    }
  };

  // Copy clean number to clipboard
  const copyCleanResult = async () => {
    const cleanNum = display.replace(/[^0-9.-]/g, '') || '0';
    try {
      await navigator.clipboard.writeText(cleanNum);
    } catch {
      // Fallback if clipboard permission denied in iframe
    }
    setCopiedClean(true);
    playSound('notify');
    setTimeout(() => setCopiedClean(false), 2000);
  };

  // Save current display value with a custom variable tag
  const saveCurrentWithTag = (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = parseFloat(display);
    if (isNaN(numVal)) return;
    const label = newTagName.trim() || `変数_${taggedVars.length + 1}`;
    const item: TaggedVariable = {
      id: `tv-${Date.now()}`,
      tag: label,
      value: numVal,
      formula: equation || String(numVal),
    };
    setTaggedVars((prev) => [item, ...prev]);
    setNewTagName('');
    playSound('notify');
  };

  // Insert tagged variable into active calculation
  const insertTaggedVariable = (v: TaggedVariable) => {
    playSound('click');
    if (waitingForOperand || display === '0') {
      setDisplay(String(v.value));
      setWaitingForOperand(false);
    } else {
      const nextEq = `${display} + ${v.value}`;
      const res = evaluateEquation(nextEq);
      setEquation(nextEq);
      setDisplay(String(res));
      setWaitingForOperand(true);
      setHistory((prev) => [{ eq: `${display} + [${v.tag}:${v.value}]`, res: String(res) }, ...prev]);
    }
  };

  // Export Tagged Variables & Calculation Breakdown to Editor (Notepad) with Graph
  const exportToEditorWithGraph = () => {
    const items = taggedVars.length > 0 ? taggedVars : [{ id: '1', tag: '計算結果', value: parseFloat(display) || 0 }];
    const maxVal = Math.max(1, ...items.map((i) => Math.abs(i.value)));
    const totalVal = items.reduce((acc, i) => acc + i.value, 0);

    const barsMd = items
      .map((item) => {
        const blocks = Math.max(1, Math.round((Math.abs(item.value) / maxVal) * 20));
        const bar = '█'.repeat(blocks);
        const pct = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(1) : '0.0';
        return `| **${item.tag}** | \`${item.value.toLocaleString()}\` | ${pct}% | ${bar} |`;
      })
      .join('\n');

    const mdContent = `# Glasispect 電卓 スマート・タグ集計 ＆ グラフ分析レポート

- **出力日時**: ${new Date().toLocaleString('ja-JP')}
- **現在の計算値**: \`${Number(display || 0).toLocaleString()}\`
- **タグ変数合計**: \`${totalVal.toLocaleString()} 円\`

## 1. 変数タグ別ビジュアルグラフ (Visual Breakdown)

| タグ名 (Variable) | 数値 (Amount) | 構成比 | グラフ (Chart) |
| :--- | :---: | :---: | :--- |
${barsMd}

## 2. 直近の計算履歴
${
  history.length > 0
    ? history
        .slice(0, 8)
        .map((h) => `- \`${h.eq} = ${Number(h.res).toLocaleString()}\``)
        .join('\n')
    : '- 履歴なし'
}
`;

    saveFile(['Documents'], 'Calculator_Graph_Report.md', mdContent);
    openApp('notepad', {
      title: 'Calculator_Graph_Report.md',
      payload: { fileName: 'Calculator_Graph_Report.md', content: mdContent },
    });
    addNotification({
      title: 'Editor 連携完了',
      message: 'スマート・タグ集計とグラフを Editor (Calculator_Graph_Report.md) に出力しました。',
      icon: 'FileText',
    });
  };

  // Run Context Formula Simulator (Local deterministic parser + AI enhancement)
  const runContextSimulator = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSimLoading(true);
    const localSim = simulateContextFormulaLocally(simPrompt, taggedVars);
    setSimResult(localSim);
    setDisplay(String(localSim.total));
    setEquation(localSim.formula);

    try {
      const aiRes = await requestAIChat({
        message: `次の計算・予算シミュレーションに対して、1〜2文で簡潔な財務アドバイスまたは予測コメントを日本語で作成してください: 「${simPrompt}」 (算出式: ${localSim.formula} = ${localSim.total})`,
      });
      if (aiRes.reply) {
        setSimResult((prev) => ({
          ...prev,
          forecastNote: aiRes.reply,
        }));
      }
    } catch {
      // Keep local forecastNote
    } finally {
      setSimLoading(false);
    }
  };

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
      case 'fact': {
        const n = Math.min(100, Math.floor(Math.abs(val)));
        let acc = 1;
        for (let i = 2; i <= n; i++) acc *= i;
        res = acc;
        break;
      }
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }
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

  // Global paste listener for SpectClip when Calculator is focused
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }
      const pasted = e.clipboardData?.getData('text');
      if (pasted) {
        applySpectClip(pasted);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const TABS: { id: CalcMode; label: string }[] = [
    { id: 'standard', label: '標準＋タグ' },
    { id: 'ai-simulator', label: 'AI数式シミュ' },
    { id: 'scientific', label: '関数電卓' },
    { id: 'unitconverter', label: '単位変換' },
    { id: 'bmi', label: 'BMI' },
    { id: 'expense', label: '収支' },
  ];

  return (
    <div
      className={`relative flex h-full w-full select-none flex-col text-white transition-all duration-300 ${
        miniWidgetMode
          ? 'bg-cyan-950/25 backdrop-blur-3xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),0_0_40px_rgba(6,182,212,0.28)]'
          : 'bg-slate-950/95'
      }`}
    >
      {/* Hidden SVG Filter for GlasispectUI Liquid Glass Refraction Distortion in Mini Widget Mode */}
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="glasispect-liquid-glass-refraction" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.024" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {miniWidgetMode && (
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            background:
              'radial-gradient(circle at 20% 15%, rgba(56,189,248,0.38), transparent 55%), radial-gradient(circle at 85% 80%, rgba(168,85,247,0.32), transparent 55%)',
            filter: 'url(#glasispect-liquid-glass-refraction)',
          }}
        />
      )}

      {/* Top Navigation & Liquid Glass Mini Widget Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-3 text-xs shrink-0 overflow-x-auto bg-black/30">
        <div className="flex items-center gap-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`py-2.5 border-b-2 transition whitespace-nowrap text-[11px] ${
                mode === t.id
                  ? 'border-cyan-400 text-cyan-300 font-bold'
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 pl-2 shrink-0">
          {memory !== 0 && <span className="text-[10px] font-mono text-cyan-300">M={memory}</span>}
          <button
            type="button"
            onClick={() => toggleMiniWidgetDock('left')}
            className={`px-2 py-1 text-[10px] font-mono transition ${
              miniWidgetMode && dockSide === 'left'
                ? 'bg-cyan-400 text-black font-bold'
                : 'bg-white/10 hover:bg-white/20 text-cyan-200'
            }`}
            title="画面左端に Liquid Glass ミニウィジェットとして吸着"
          >
            ◀端吸着
          </button>
          <button
            type="button"
            onClick={() => toggleMiniWidgetDock('right')}
            className={`px-2 py-1 text-[10px] font-mono transition ${
              miniWidgetMode && dockSide === 'right'
                ? 'bg-cyan-400 text-black font-bold'
                : 'bg-white/10 hover:bg-white/20 text-cyan-200'
            }`}
            title="画面右端に Liquid Glass ミニウィジェットとして吸着"
          >
            端吸着▶
          </button>
          {!miniWidgetMode && (mode === 'standard' || mode === 'scientific') && (
            <button
              type="button"
              onClick={() => setShowRightPanel(!showRightPanel)}
              className={`p-1.5 transition ${showRightPanel ? 'text-cyan-300' : 'text-white/50 hover:text-white'}`}
              title="スマート・タグ保存＆履歴パネル表示切替"
            >
              <Icon name="Layers" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* SpectClip Smart Clipboard Bar (Always accessible on Standard / Scientific / Mini Widget) */}
      {(mode === 'standard' || mode === 'scientific') && (
        <div className="relative z-10 flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border-b border-white/10 text-[11px] shrink-0">
          <span className="text-cyan-400 font-mono font-bold shrink-0">SpectClip:</span>
          <input
            type="text"
            value={spectClipInput}
            onChange={(e) => applySpectClip(e.target.value)}
            placeholder="例:「1,500円×3個」「1200 + 450円」をペーストで自動計算..."
            className="flex-1 bg-transparent text-white placeholder-white/35 outline-none text-[11px] min-w-0"
          />
          <button
            type="button"
            onClick={copyCleanResult}
            className="px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 text-[10px] font-semibold shrink-0 transition"
            title="計算結果を綺麗な数字としてクリップボードにコピー"
          >
            {copiedClean ? 'コピー完了!' : '結果コピー'}
          </button>
        </div>
      )}

      {spectClipStatus && (mode === 'standard' || mode === 'scientific') && (
        <div className="relative z-10 px-3 py-1 bg-cyan-500/10 text-cyan-300 text-[10px] font-mono flex items-center justify-between">
          <span>{spectClipStatus}</span>
          <button onClick={() => setSpectClipStatus('')} className="opacity-60 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {/* Sub-Views */}
      {mode === 'unitconverter' ? (
        <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
          <UnitConverterView />
        </div>
      ) : mode === 'bmi' ? (
        <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
          <BmiView />
        </div>
      ) : mode === 'expense' ? (
        <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
          <ExpenseView />
        </div>
      ) : mode === 'ai-simulator' ? (
        /* =================================================================
           CALCULATOR × AI: CONTEXT FORMULA SIMULATOR
           ================================================================= */
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-cyan-300">
                電卓 × AI：コンテキスト数式シミュレーター
              </h2>
              <p className="text-[11px] text-white/55">
                自然な文章から数式を自動構築し、内訳グラフと予算ランウェイ予測を算出します
              </p>
            </div>
            <button
              type="button"
              onClick={exportToEditorWithGraph}
              className="px-3 py-1.5 bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 transition shrink-0"
            >
              Editorへグラフ出力
            </button>
          </div>

          <form onSubmit={runContextSimulator} className="space-y-2">
            <label className="block text-[11px] text-white/70 font-semibold">
              シミュレーションしたい文章を入力（保存したスマート・タグ名もそのまま使えます）:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={simPrompt}
                onChange={(e) => setSimPrompt(e.target.value)}
                placeholder="例: 初期費用が5万円で、毎月3,000円のサーバー代がかかる場合、2年間の総額は？"
                className="flex-1 bg-white/[0.05] border-b border-cyan-400/60 px-3 py-2 text-xs text-white outline-none"
              />
              <button
                type="submit"
                disabled={simLoading}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shrink-0 transition"
              >
                {simLoading ? '解析中...' : '数式生成＆計算'}
              </button>
            </div>

            {/* Preset scenario chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                '初期費用が5万円で、毎月3,000円のサーバー代がかかる場合、2年間の総額は？',
                '予算120万円で毎月15万円の開発費を使うと、予算はあと何ヶ月持つ？',
                '1,500円×3個 と 2,800円×4個 の合計は？',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setSimPrompt(sample);
                    const res = simulateContextFormulaLocally(sample, taggedVars);
                    setSimResult(res);
                    setDisplay(String(res.total));
                  }}
                  className="px-2 py-1 bg-white/[0.05] hover:bg-white/10 text-[10px] text-white/75 transition text-left"
                >
                  {sample}
                </button>
              ))}
            </div>
          </form>

          {/* Generated Formula & Total Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/[0.03] border-t border-cyan-400/50 p-4">
            <div>
              <div className="text-[10px] font-mono text-white/45 uppercase">自動生成された数式 (Auto Formula)</div>
              <div className="text-sm font-mono text-cyan-300 mt-1 break-all">{simResult.formula}</div>
            </div>
            <div className="sm:text-right">
              <div className="text-[10px] font-mono text-white/45 uppercase">算出結果 (Computed Result)</div>
              <div className="text-2xl font-bold font-mono text-white mt-0.5">
                {simResult.total.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Visual Breakdown Bar Chart */}
          <div className="space-y-2 bg-white/[0.02] p-4 border-t border-white/10">
            <div className="text-xs font-bold text-white/85">内訳ビジュアルグラフ (Visual Breakdown)</div>
            <div className="space-y-2.5 pt-1">
              {simResult.breakdown.map((item, idx) => {
                const maxAmt = Math.max(1, ...simResult.breakdown.map((b) => b.amount));
                const widthPct = Math.max(6, Math.min(100, (item.amount / maxAmt) * 100));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/80 font-medium">{item.label}</span>
                      <span className="font-mono text-cyan-300">{item.amount.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${widthPct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Forecast & Simulation Insight */}
          <div className="p-3.5 bg-cyan-500/10 border-l-2 border-cyan-400 text-xs text-cyan-100 leading-relaxed">
            <div className="font-bold text-cyan-300 mb-1">AI 将来予測 ＆ シミュレーション分析</div>
            {simResult.forecastNote}
          </div>
        </div>
      ) : (
        /* =================================================================
           STANDARD / SCIENTIFIC CALCULATOR + RIGHT SMART TAG STOCK PANEL
           ================================================================= */
        <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Calculator Display & Keypad */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Display Readout */}
            <div className="flex flex-col justify-end px-4 py-3 text-right border-b border-white/10 min-h-[88px] bg-black/20">
              <div className="flex items-center justify-between text-[11px] font-mono text-white/45 h-5">
                <span className="truncate">
                  {miniWidgetMode ? 'LIQUID GLASS WIDGET' : ''}
                </span>
                <span className="truncate">{equation}</span>
              </div>
              <div className="text-3xl font-light tracking-tight text-white tabular-nums truncate">
                {Number.isFinite(Number(display)) && !display.endsWith('.')
                  ? Number(display).toLocaleString('en-US', { maximumFractionDigits: 10 })
                  : display}
              </div>
            </div>

            {/* Scientific Row */}
            {mode === 'scientific' && (
              <div className="grid grid-cols-6 border-b border-white/10 text-xs bg-white/[0.02]">
                {[
                  { label: 'sin', fn: 'sin' },
                  { label: 'cos', fn: 'cos' },
                  { label: 'tan', fn: 'tan' },
                  { label: '√x', fn: 'sqrt' },
                  { label: 'x²', fn: 'sqr' },
                  { label: 'x³', fn: 'cube' },
                  { label: '1/x', fn: 'inv' },
                  { label: 'ln', fn: 'ln' },
                  { label: 'log', fn: 'log' },
                  { label: 'n!', fn: 'fact' },
                  { label: 'π', fn: 'pi' },
                  { label: 'e', fn: 'e' },
                ].map((b) => (
                  <button
                    key={b.fn}
                    onClick={() => performSciFunc(b.fn)}
                    className="py-2 text-center font-mono text-cyan-300/80 hover:bg-white/[0.06] hover:text-cyan-300 transition border-r border-b border-white/5 last:border-r-0"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Smart Tag Bar inside Mini Widget Mode */}
            {miniWidgetMode && taggedVars.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-white/10 overflow-x-auto bg-black/30">
                <span className="text-[10px] text-white/45 shrink-0">タグ呼出:</span>
                {taggedVars.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => insertTaggedVariable(v)}
                    className="px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 text-[10px] font-mono whitespace-nowrap"
                  >
                    {v.tag} ({v.value.toLocaleString()})
                  </button>
                ))}
              </div>
            )}

            {/* Main Keypad Grid */}
            <div className="flex-1 grid grid-cols-4 divide-x divide-y divide-white/10 text-base">
              <button
                onClick={clearEntry}
                className="bg-white/[0.02] hover:bg-white/[0.07] text-xs font-semibold text-white/70 transition"
              >
                CE
              </button>
              <button
                onClick={clearAll}
                className="bg-white/[0.02] hover:bg-white/[0.07] text-xs font-semibold text-rose-400 transition"
              >
                AC
              </button>
              <button
                onClick={backspace}
                className="bg-white/[0.02] hover:bg-white/[0.07] flex items-center justify-center text-white/70 transition"
              >
                <Icon name="Delete" size={16} />
              </button>
              <button
                onClick={() => performOp('÷')}
                className="bg-white/[0.04] hover:bg-cyan-500/20 text-cyan-300 font-semibold transition"
              >
                ÷
              </button>

              {['7', '8', '9'].map((n) => (
                <button
                  key={n}
                  onClick={() => inputDigit(n)}
                  className="hover:bg-white/[0.06] active:bg-white/10 font-medium transition"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => performOp('×')}
                className="bg-white/[0.04] hover:bg-cyan-500/20 text-cyan-300 font-semibold transition"
              >
                ×
              </button>

              {['4', '5', '6'].map((n) => (
                <button
                  key={n}
                  onClick={() => inputDigit(n)}
                  className="hover:bg-white/[0.06] active:bg-white/10 font-medium transition"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => performOp('−')}
                className="bg-white/[0.04] hover:bg-cyan-500/20 text-cyan-300 font-semibold transition"
              >
                −
              </button>

              {['1', '2', '3'].map((n) => (
                <button
                  key={n}
                  onClick={() => inputDigit(n)}
                  className="hover:bg-white/[0.06] active:bg-white/10 font-medium transition"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => performOp('+')}
                className="bg-white/[0.04] hover:bg-cyan-500/20 text-cyan-300 font-semibold transition"
              >
                +
              </button>

              <button
                onClick={toggleSign}
                className="hover:bg-white/[0.06] text-xs font-medium text-white/70 transition"
              >
                +/−
              </button>
              <button
                onClick={() => inputDigit('0')}
                className="hover:bg-white/[0.06] active:bg-white/10 font-medium transition"
              >
                0
              </button>
              <button
                onClick={inputDecimal}
                className="hover:bg-white/[0.06] font-medium transition"
              >
                .
              </button>
              <button
                onClick={calculate}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition"
              >
                =
              </button>
            </div>
          </div>

          {/* Right Panel: Smart Tag Variable Stock & History (Shown when not in compact mini widget) */}
          {!miniWidgetMode && showRightPanel && (
            <div className="w-60 shrink-0 border-l border-white/10 bg-black/35 flex flex-col justify-between p-3 text-xs overflow-y-auto">
              <div className="space-y-4">
                {/* Save Current Result with Smart Tag */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">スマート・タグ保存 (変数管理)</span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    現在の計算結果にタグ（例: 家賃・開発費）をつけてストックし、ワンクリックで次の計算に呼び出せます。
                  </p>
                  <form onSubmit={saveCurrentWithTag} className="flex gap-1.5">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="タグ名 (例: 家賃, 開発費)"
                      className="flex-1 min-w-0 bg-white/[0.06] border-b border-white/20 px-2 py-1 text-[11px] text-white outline-none"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-cyan-500 text-black font-bold text-[11px] shrink-0"
                    >
                      保存
                    </button>
                  </form>
                </div>

                {/* Stocked Variable Tags List */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-white/45 uppercase">
                    ストック済み変数 (クリックで計算に挿入)
                  </div>
                  <div className="divide-y divide-white/10 border-t border-b border-white/10">
                    {taggedVars.map((v) => (
                      <div
                        key={v.id}
                        className="py-2 flex items-center justify-between gap-2 group hover:bg-white/[0.04] px-1 transition"
                      >
                        <button
                          type="button"
                          onClick={() => insertTaggedVariable(v)}
                          className="flex-1 text-left min-w-0"
                          title="クリックして現在の計算に呼び出す"
                        >
                          <div className="text-xs font-bold text-cyan-300 truncate">#{v.tag}</div>
                          <div className="text-[11px] font-mono text-white/85">
                            {v.value.toLocaleString()}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaggedVars((prev) => prev.filter((item) => item.id !== v.id))}
                          className="opacity-40 hover:opacity-100 text-rose-400 p-1 text-[10px]"
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculation History */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/45 uppercase">計算履歴</span>
                    {history.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHistory([])}
                        className="text-[10px] text-rose-400/80 hover:text-rose-300"
                      >
                        クリア
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {history.length === 0 ? (
                      <div className="text-[11px] text-white/35 py-2">履歴はまだありません</div>
                    ) : (
                      history.map((h, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setDisplay(h.res);
                            setWaitingForOperand(false);
                          }}
                          className="w-full text-right p-1.5 bg-white/[0.03] hover:bg-white/[0.07] transition block"
                        >
                          <div className="text-[10px] text-white/45 font-mono truncate">{h.eq} =</div>
                          <div className="text-xs font-mono font-bold text-cyan-300">{h.res}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Editor Graph Integration Button */}
              <div className="pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={exportToEditorWithGraph}
                  className="w-full py-2 px-3 bg-white/10 hover:bg-cyan-500 hover:text-black text-white text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Icon name="FileText" size={13} />
                  <span>Editorでグラフ・表に変換</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default Calculator;
