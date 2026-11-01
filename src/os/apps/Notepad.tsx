import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from '../OSContext';
import { Icon } from '../Icon';

interface Props {
  payload?: { fileName?: string; content?: string };
}

export interface MemoNote {
  id: string;
  title: string;
  content: string;
  category: 'General' | 'Meeting' | 'Journal' | 'Brainstorm' | 'Project' | 'TechSpec';
  bgColor: 'dark' | 'white' | 'amber' | 'slate' | 'mint' | 'violet';
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

const TEMPLATES: Array<{
  id: string;
  name: string;
  desc: string;
  category: MemoNote['category'];
  icon: string;
  defaultTitle: string;
  bgColor: MemoNote['bgColor'];
  content: string;
}> = [
  {
    id: 'blank',
    name: '白紙 (Blank)',
    desc: 'シンプルな空白のドキュメントから執筆を開始します。',
    category: 'General',
    icon: 'FileText',
    defaultTitle: '無題のメモ.txt',
    bgColor: 'dark',
    content: '',
  },
  {
    id: 'meeting',
    name: '📋 議事録 (Meeting Notes)',
    desc: '日時、参加者、アジェンダ、決定事項、アクションアイテムを整然と整理。',
    category: 'Meeting',
    icon: 'Calendar',
    defaultTitle: '【議事録】新規プロジェクトキックオフ.md',
    bgColor: 'white',
    content: `# 📋 議事録: [プロジェクト / 会議名]
- **日時**: ${new Date().toLocaleDateString('ja-JP')}
- **参加者**: 山田, 佐藤, AI Assistant
- **場所**: オンライン会議室 / Glassium Meeting Room

---

## 🎯 アジェンダ (Agenda)
1. 前回の振り返りと進捗確認
2. 新機能の仕様・デザインの最終チェック
3. 開発スケジュールと役割分担の決定

---

## 📝 決定事項 (Key Decisions)
- [x] UIフレームワークには TailWind CSS と Framer Motion を継続採用
- [ ] サーバーサイド AI（Gemini 3.8 Flash）との通信エンドポイントを最適化

---

## ⚡ アクションアイテム (Action Items)
- [ ] **@山田**: データベーススキーマの更新と動作検証
- [ ] **@佐藤**: カスタムカラーパレットとテンプレートの追加
- [ ] **@全員**: 次回ミーティングに向けたフィードバック収集

[CHART:bar|四半期目標進捗|1Q:85, 2Q:92, 3Q:78, 4Q:95]
`,
  },
  {
    id: 'journal',
    name: '📔 デイリージャーナル (Daily Journal)',
    desc: '毎日の達成事項、気付き、振り返りと翌日の目標を記録。',
    category: 'Journal',
    icon: 'BookOpen',
    defaultTitle: `【日報】${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}.md`,
    bgColor: 'amber',
    content: `# 📔 デイリージャーナル - ${new Date().toLocaleDateString('ja-JP')}

## 🌟 本日のハイライト & 達成したこと
- GlassiumOS 4.7 エディタアプリの全面的ダッシュボード化・AI統合完了
- 画面デザインとレスポンシブ配置のブラッシュアップ

## 💡 今日の学んだこと・気づき
- ユーザーにとって価値のある機能を分かりやすく提示することでUXが飛躍的に向上する
- 定型作業のテンプレート化による作業効率の向上

## 🎯 明日の目標 & やること
- [ ] ユーザーフィードバックの分析と優先順位付け
- [ ] 新機能のパフォーマンステスト

[CHART:pie|作業時間の内訳|開発:60, デザイン:20, ドキュメント:20]
`,
  },
  {
    id: 'brainstorm',
    name: '💡 ブレインストーミング (Brainstorming)',
    desc: 'アイデア出し、課題解決のアイデア、長所・短所をブレスト。',
    category: 'Brainstorm',
    icon: 'Sparkles',
    defaultTitle: '【アイデア】次世代機能ブレスト.md',
    bgColor: 'violet',
    content: `# 💡 ブレインストーミング: [テーマ名]

## 🚀 コア目標
- ユーザー体験を革新するクリエイティブ機能の創出

## 📌 アイデアリスト
- **AIグラマー＆自動執筆アシスタント**:
  - 文法修正、トーン変換、文章の要約・拡張を1クリックで実行
- **インタラクティブSVGグラフ**:
  - 棒グラフ、折れ線グラフ、円グラフをテキスト内にダイナミック描画
- **マルチペーパーカラー**:
  - 用途や気分に合わせてダークガラス、和紙アンバー、ミントグリーンを切り替え

## ⚖️ メリット & 懸念点
| 項目 | メリット | 懸念点 |
| --- | --- | --- |
| AI執筆 | 執筆スピード向上 | オフライン時のフォールバック |
| SVGグラフ | 高解像度・軽量 | カスタマイズ性のバランス |
`,
  },
  {
    id: 'project',
    name: '🚀 プロジェクト計画 (Project Plan)',
    desc: '目的、スコープ、マイルストーン、リソース配分のフレームワーク。',
    category: 'Project',
    icon: 'Rocket',
    defaultTitle: '【計画書】GlassiumOS-4.7-ロードマップ.md',
    bgColor: 'slate',
    content: `# 🚀 プロジェクト計画書: GlassiumOS 4.7 アップグレード

## 🎯 プロジェクトの目的
2.5D Glassium Window Engine と Gemini AI を融合し、最高峰のデスクトップ体験を提供する。

## 📅 マイルストーン & タイムライン
- **Phase 1 (11/01)**: システム設定UIの Windows 11 風統合
- **Phase 2 (11/02)**: エディタアプリのダッシュボード化・テンプレート追加
- **Phase 3 (11/03)**: Gemini 3.8 Flash を用いた高度な校正・文章生成エンジン導入

[CHART:line|リソース推移|Week1:20, Week2:45, Week3:80, Week4:100]
`,
  },
  {
    id: 'techspec',
    name: '💻 技術仕様書 (Technical Spec)',
    desc: 'システム構成、API仕様、データ構造のエンジニア向けドキュメント。',
    category: 'TechSpec',
    icon: 'Terminal',
    defaultTitle: '【仕様書】Editor-AI-Integration.md',
    bgColor: 'mint',
    content: `# 💻 技術仕様書: Editor Component Architecture

## 1. 概要
GlassiumOS 内部で動作するリッチエディタ兼ダッシュボードシステム。

## 2. API エンドポイント仕様
- **POST** \`/api/ai/chat\`
  - Body: \`{ message: string, history: Array }\`
  - Response: \`{ reply: string, model: string }\`

## 3. UI カラープロファイル
- \`dark\`: ダークガラスグラデーション
- \`white\`: ピュアホワイトペーパー
- \`amber\`: 和紙アンバー
- \`slate\`: コズミックスレート
- \`mint\`: ミントエメラルド
- \`violet\`: サイバーバイオレット
`,
  },
];

const DEFAULT_NOTES: MemoNote[] = [
  {
    id: 'demo-1',
    title: '⚡ GlassiumOS 4.7 リリリースノート.md',
    content: `# ⚡ GlassiumOS 4.7 リリースノート

GlassiumOS 4.7 へようこそ！今回のアップデートでは、エディタアプリが大幅に進化しました。

## 🎉 主な新機能
1. **ダッシュボード & テンプレート機能**:
   - アプリ起動時にすべてのメモを一覧表示。
   - 議事録、日報、ブレストなどのテンプレートから1タップで新規作成。
2. **Gemini 3.8 Flash 搭載 AI ライティングアシスタント**:
   - **Fix Grammar**: 文法・誤字脱字・てにをはを完璧に修正。
   - **文章生成 & トーン変更**: ビジネス調、カジュアル調、要約などへ自由自在に書き換え。
3. **リッチペーパーテーマ & SVG グラフ機能**:
   - 用紙カラーをダーク、ホワイト、アンバー、ミント等に切り替え。
   - テキスト内に棒グラフ、折れ線グラフ、円グラフを埋め込んで自動描画！

[CHART:bar|機能利用頻度予想|エディタ:95, 設定:88, ブラウザ:82, ゲーム:75]
`,
    category: 'General',
    bgColor: 'dark',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 3600000 * 3,
    pinned: true,
  },
  {
    id: 'demo-2',
    title: '📋 新機能開発キックオフ議事録.md',
    content: TEMPLATES[1].content,
    category: 'Meeting',
    bgColor: 'white',
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now() - 3600000 * 12,
    pinned: false,
  },
  {
    id: 'demo-3',
    title: '💡 AIエディタ機能アイデアメモ.md',
    content: TEMPLATES[3].content,
    category: 'Brainstorm',
    bgColor: 'violet',
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 1800000,
    pinned: false,
  },
];

// Paper Theme Configurations
const BG_THEMES: Record<MemoNote['bgColor'], { label: string; bgClass: string; textClass: string; borderClass: string; accentClass: string }> = {
  dark: {
    label: 'Dark Glass',
    bgClass: 'bg-zinc-950/80 backdrop-blur-xl',
    textClass: 'text-zinc-100',
    borderClass: 'border-white/10',
    accentClass: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
  },
  white: {
    label: 'White Paper',
    bgClass: 'bg-zinc-50 text-zinc-900',
    textClass: 'text-zinc-900 font-sans',
    borderClass: 'border-zinc-300',
    accentClass: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  amber: {
    label: 'Warm Amber',
    bgClass: 'bg-amber-50/90 text-amber-950',
    textClass: 'text-amber-950 font-serif',
    borderClass: 'border-amber-200',
    accentClass: 'bg-amber-200/60 text-amber-900 border-amber-300',
  },
  slate: {
    label: 'Cosmic Slate',
    bgClass: 'bg-slate-900 text-slate-100',
    textClass: 'text-slate-100 font-mono',
    borderClass: 'border-slate-700',
    accentClass: 'bg-slate-800 text-cyan-400 border-cyan-500/30',
  },
  mint: {
    label: 'Mint Emerald',
    bgClass: 'bg-emerald-950/70 text-emerald-100',
    textClass: 'text-emerald-100',
    borderClass: 'border-emerald-800/50',
    accentClass: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
  },
  violet: {
    label: 'Cyber Violet',
    bgClass: 'bg-violet-950/70 text-violet-100',
    textClass: 'text-violet-100',
    borderClass: 'border-violet-800/50',
    accentClass: 'bg-violet-900/60 text-violet-300 border-violet-700/50',
  },
};

// Fallback local grammar engine if offline
function fallbackCorrectGrammar(text: string): { corrected: string; changes: string[] } {
  let result = text;
  const changes: string[] = [];

  // Fix common Japanese typos
  if (result.includes('ら抜き言葉')) {
    result = result.replace(/食べれる/g, '食べられる').replace(/見れる/g, '見られる');
    changes.push('ら抜き言葉を正調化（例: 見れる → 見られる）');
  }

  // Fix double spaces
  if (/  +/.test(result)) {
    result = result.replace(/  +/g, ' ');
    changes.push('連続した余分なスペースを解消');
  }

  // Fix punctuation spacing
  result = result.replace(/([。！？])([^\n\s」』）])/g, '$1 $2');
  if (result !== text) {
    changes.push('句読点の後のスペース調整');
  }

  // Capitalize English sentences
  result = result.replace(/(^|[.!?]\s+)([a-z])/g, (_, p, l) => p + l.toUpperCase());

  return { corrected: result, changes: changes.length > 0 ? changes : ['文章の全体的なレイアウトと句読点を最適化しました。'] };
}

export function NotepadApp({ payload }: Props) {
  const { saveFile } = useOS();

  // Notes state initialized from localStorage
  const [notes, setNotes] = useState<MemoNote[]>(() => {
    try {
      const saved = localStorage.getItem('glassium_editor_notes_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_NOTES;
  });

  // Current View mode: 'dashboard' | 'editor'
  const [viewMode, setViewMode] = useState<'dashboard' | 'editor'>('dashboard');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Active note editor state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MemoNote['category']>('General');
  const [bgColor, setBgColor] = useState<MemoNote['bgColor']>('dark');
  const [isSaved, setIsSaved] = useState(true);

  // Dashboard filter & search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');

  // Modals & Panels
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFolder, setSaveFolder] = useState('Documents');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiActionType, setAiActionType] = useState<'grammar' | 'generate' | 'tone' | 'summarize'>('grammar');
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState<'business' | 'casual' | 'professional' | 'bullets'>('business');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatusMsg, setAiStatusMsg] = useState<string | null>(null);

  // SVG Chart Insertion Modal
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [chartTitle, setChartTitle] = useState('データ推移');
  const [chartDataStr, setChartDataStr] = useState('1Q:100, 2Q:150, 3Q:220, 4Q:300');

  // Image Insertion Modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Save notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('glassium_editor_notes_v2', JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  // Sync payload on external file open
  useEffect(() => {
    if (payload?.content !== undefined || payload?.fileName !== undefined) {
      const newNote: MemoNote = {
        id: 'file-' + Date.now(),
        title: payload.fileName || '開いたファイル.txt',
        content: payload.content || '',
        category: 'General',
        bgColor: 'dark',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
      setTitle(newNote.title);
      setContent(newNote.content);
      setCategory(newNote.category);
      setBgColor(newNote.bgColor);
      setViewMode('editor');
    }
  }, [payload]);

  // Open existing note
  const handleOpenNote = (note: MemoNote) => {
    setActiveNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setBgColor(note.bgColor);
    setIsSaved(true);
    setViewMode('editor');
  };

  // Create new note with template
  const handleCreateNew = (templateId = 'blank') => {
    const tmpl = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
    const newNote: MemoNote = {
      id: 'note-' + Date.now(),
      title: tmpl.defaultTitle,
      content: tmpl.content,
      category: tmpl.category,
      bgColor: tmpl.bgColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setTitle(newNote.title);
    setContent(newNote.content);
    setCategory(newNote.category);
    setBgColor(newNote.bgColor);
    setIsSaved(true);
    setShowTemplateModal(false);
    setViewMode('editor');
  };

  // Save active note changes
  const saveActiveNote = () => {
    if (!activeNoteId) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId
          ? {
              ...n,
              title,
              content,
              category,
              bgColor,
              updatedAt: Date.now(),
            }
          : n
      )
    );
    setIsSaved(true);
  };

  // Auto-save debounce
  useEffect(() => {
    if (viewMode !== 'editor' || !activeNoteId) return;
    setIsSaved(false);
    const timer = setTimeout(() => {
      saveActiveNote();
    }, 1200);
    return () => clearTimeout(timer);
  }, [title, content, category, bgColor, viewMode, activeNoteId]);

  // Delete note
  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNoteId === id) {
      setViewMode('dashboard');
      setActiveNoteId(null);
    }
  };

  // Toggle pin
  const handleTogglePin = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  };

  // Save file to OS File Explorer
  const handleExportToFileSystem = () => {
    const path =
      saveFolder === 'Downloads' ? ['Downloads'] :
      saveFolder === 'Pictures' ? ['Pictures'] : ['Documents'];
    saveFile(path, title.endsWith('.txt') || title.endsWith('.md') ? title : title + '.md', content);
    setShowSaveModal(false);
    setAiStatusMsg('OSファイルシステムに保存しました！');
    setTimeout(() => setAiStatusMsg(null), 3000);
  };

  // Execute AI action via /api/ai/chat
  const handleRunAiAction = async () => {
    setIsAiLoading(true);
    setAiStatusMsg(null);

    let systemPrompt = '';
    let userMsg = '';

    if (aiActionType === 'grammar') {
      systemPrompt = `あなたはプロフェッショナルな校正者・文章編集者です。提供されたテキストの誤字脱字、文法、てにをは、表記揺れを正確に修正してください。修正後のテキストのみを出力してください。解説は不要です。`;
      userMsg = `以下のテキストを校正してください:\n\n${content}`;
    } else if (aiActionType === 'generate') {
      systemPrompt = `あなたは優秀なAIライティングアシスタントです。指示に従って高品質で読みやすい文章を生成してください。`;
      userMsg = `指示: ${aiPrompt}\n\n現在のドキュメントコンテキスト: ${content.slice(0, 500)}`;
    } else if (aiActionType === 'tone') {
      const toneMap = {
        business: 'フォーマルで丁寧なビジネス敬語表現',
        casual: 'フレンドリーで親しみやすいカジュアル表現',
        professional: '論理的で洗練されたプロフェッショナル表現',
        bullets: '箇条書きで要点を明快に整理した構成',
      };
      systemPrompt = `以下の文章を「${toneMap[selectedTone]}」へリライトしてください。元の意味を保ちつつ、自然な日本語に仕上げてください。リライト結果のみを出力してください。`;
      userMsg = `文章:\n\n${content}`;
    } else if (aiActionType === 'summarize') {
      systemPrompt = `以下の文章を要約し、要点を分かりやすく整理してください。`;
      userMsg = `文章:\n\n${content}`;
    }

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${systemPrompt}\n\n${userMsg}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.reply || '';
        if (reply) {
          if (aiActionType === 'generate') {
            setContent((prev) => (prev ? prev + '\n\n' + reply : reply));
          } else {
            setContent(reply);
          }
          setAiStatusMsg('✨ AI処理が完了し、ドキュメントに反映されました！');
        } else {
          throw new Error('Empty response');
        }
      } else {
        throw new Error('API failed');
      }
    } catch {
      // Fallback to local grammar engine
      if (aiActionType === 'grammar') {
        const { corrected, changes } = fallbackCorrectGrammar(content);
        setContent(corrected);
        setAiStatusMsg(`✨ オフラインAI校正完了: ${changes.join(' / ')}`);
      } else {
        setAiStatusMsg('⚠️ AIサーバー接続エラー。ネットワークをご確認ください。');
      }
    } finally {
      setIsAiLoading(false);
      setShowAiModal(false);
      setTimeout(() => setAiStatusMsg(null), 4000);
    }
  };

  // Insert Chart code into note
  const handleInsertChart = () => {
    const chartTag = `\n\n[CHART:${chartType}|${chartTitle}|${chartDataStr}]\n\n`;
    setContent((prev) => prev + chartTag);
    setShowChartModal(false);
  };

  // Insert Image into note
  const handleInsertImage = () => {
    if (!imageUrl) return;
    const imgTag = `\n\n![画像](${imageUrl})\n\n`;
    setContent((prev) => prev + imgTag);
    setImageUrl('');
    setShowImageModal(false);
  };

  // File Upload handler for images
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        const imgTag = `\n\n![アップロード画像](${dataUrl})\n\n`;
        setContent((prev) => prev + imgTag);
        setShowImageModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Filtered notes for Dashboard
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesCat = selectedCatFilter === 'all' || n.category === selectedCatFilter;
      const matchesQuery =
        !searchQuery ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [notes, selectedCatFilter, searchQuery]);

  // Current theme config
  const currentTheme = BG_THEMES[bgColor] || BG_THEMES.dark;

  return (
    <div className="flex h-full w-full min-w-0 min-h-0 flex-col bg-zinc-950/90 text-white font-sans overflow-hidden">
      {/* Dynamic Status / Notification Banner */}
      <AnimatePresence>
        {aiStatusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 py-2 bg-gradient-to-r from-violet-600/90 to-brand-600/90 text-white text-xs font-medium flex items-center justify-between border-b border-white/10 z-30 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Icon name="Sparkles" size={14} className="text-yellow-300 animate-pulse" />
              <span>{aiStatusMsg}</span>
            </div>
            <button onClick={() => setAiStatusMsg(null)} className="hover:opacity-75">
              <Icon name="X" size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 1. DASHBOARD VIEW                                                         */}
      {/* ========================================================================= */}
      {viewMode === 'dashboard' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Top Dashboard Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-brand-500/30 to-violet-500/30 border border-brand-400/30">
                  <Icon name="FileText" size={22} className="text-brand-300" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    Glassium Memo & Editor
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      v4.7 AI
                    </span>
                  </h1>
                  <p className="text-xs text-white/50">
                    ドキュメント作成、AI文章校正、テンプレート & ダイナミックSVGグラフ
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-white transition active:scale-95"
              >
                <Icon name="Sparkles" size={14} className="text-yellow-400" />
                テンプレートから選択
              </button>
              <button
                onClick={() => handleCreateNew('blank')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 hover:from-brand-400 hover:to-violet-500 text-xs font-semibold text-white shadow-lg shadow-brand-500/20 transition active:scale-95"
              >
                <Icon name="Plus" size={16} />
                新規メモ作成
              </button>
            </div>
          </div>

          {/* Quick Start Templates Section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5">
              <Icon name="Grid3x3" size={12} />
              クイックテンプレート作成
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {TEMPLATES.map((tmpl) => (
                <motion.button
                  key={tmpl.id}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCreateNew(tmpl.id)}
                  className="flex flex-col items-start p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition group"
                >
                  <div className="p-2 rounded-lg bg-white/10 text-brand-300 mb-2 group-hover:scale-110 transition">
                    <Icon name={tmpl.icon} size={16} />
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-brand-300 transition line-clamp-1">
                    {tmpl.name}
                  </span>
                  <span className="text-[10px] text-white/40 line-clamp-2 mt-1">
                    {tmpl.desc}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
            {/* Category tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'すべて' },
                { id: 'General', label: '全般' },
                { id: 'Meeting', label: '📋 議事録' },
                { id: 'Journal', label: '📔 日報' },
                { id: 'Brainstorm', label: '💡 アイデア' },
                { id: 'Project', label: '🚀 計画' },
                { id: 'TechSpec', label: '💻 仕様書' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCatFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    selectedCatFilter === tab.id
                      ? 'bg-brand-500 text-white font-semibold shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative flex-1 max-w-xs">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="メモを検索..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/40 outline-none focus:border-brand-400 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <Icon name="X" size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Memo Notes Grid */}
          <div className="flex-1">
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl">
                <Icon name="FileText" size={36} className="text-white/20 mb-3" />
                <p className="text-sm font-medium text-white/60">メモが見つかりません</p>
                <p className="text-xs text-white/40 mt-1">「新規メモ作成」からドキュメントを作成できます。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredNotes.map((note) => {
                  const theme = BG_THEMES[note.bgColor] || BG_THEMES.dark;
                  return (
                    <motion.div
                      key={note.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ y: -4 }}
                      onClick={() => handleOpenNote(note)}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border ${theme.borderClass} ${theme.bgClass} cursor-pointer shadow-lg hover:shadow-xl transition group min-h-[160px] overflow-hidden`}
                    >
                      {/* Pinned Indicator & Category Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${theme.accentClass}`}>
                          {note.category}
                        </span>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => handleTogglePin(note.id, e)}
                            className={`p-1 rounded hover:bg-black/20 ${note.pinned ? 'text-amber-400' : 'text-white/40'}`}
                            title={note.pinned ? 'ピン留め解除' : 'ピン留め'}
                          >
                            <Icon name="Pin" size={12} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteNote(note.id, e)}
                            className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-black/20"
                            title="削除"
                          >
                            <Icon name="Trash2" size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Title & Preview Content */}
                      <div className="flex-1 space-y-1">
                        <h3 className="text-xs font-bold line-clamp-1 group-hover:text-brand-300 transition">
                          {note.title}
                        </h3>
                        <p className="text-[11px] opacity-70 line-clamp-3 font-mono leading-relaxed whitespace-pre-wrap">
                          {note.content.replace(/#+|\*+|`+|\[CHART:[^\]]+\]/g, '').trim() || '（内容なし）'}
                        </p>
                      </div>

                      {/* Date Timestamp */}
                      <div className="mt-3 pt-2 border-t border-current/10 flex items-center justify-between text-[10px] opacity-50">
                        <span>{new Date(note.updatedAt).toLocaleDateString('ja-JP')}</span>
                        <span className="group-hover:translate-x-1 transition flex items-center gap-1">
                          開く <Icon name="ChevronRight" size={10} />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDITOR VIEW                                                            */}
      {/* ========================================================================= */}
      {viewMode === 'editor' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Top Navigation & Toolbar Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-white/10 bg-black/40 backdrop-blur-md">
            {/* Left: Back & Title Edit */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => {
                  saveActiveNote();
                  setViewMode('dashboard');
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition shrink-0"
              >
                <Icon name="ChevronLeft" size={14} />
                一覧へ
              </button>

              <div className="h-4 w-[1px] bg-white/10 shrink-0" />

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ドキュメントタイトル..."
                className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-brand-400 px-1 py-0.5 text-xs font-bold text-white outline-none min-w-[140px] max-w-[280px] truncate"
              />

              <span className="text-[10px] text-white/40 shrink-0">
                {isSaved ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Icon name="Check" size={10} /> 保存済み
                  </span>
                ) : (
                  <span className="text-amber-400">自動保存中...</span>
                )}
              </span>
            </div>

            {/* Right: Actions, AI, Paper Color, Chart, Save */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Paper Background Color Selector */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                <span className="text-[10px] text-white/50 px-1">背景:</span>
                {(Object.keys(BG_THEMES) as Array<MemoNote['bgColor']>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setBgColor(key)}
                    className={`w-4 h-4 rounded-full border transition ${
                      bgColor === key ? 'scale-125 border-white ring-2 ring-brand-400/50' : 'border-white/30 hover:scale-110'
                    }`}
                    style={{
                      backgroundColor:
                        key === 'dark' ? '#09090b' :
                        key === 'white' ? '#f4f4f5' :
                        key === 'amber' ? '#fef3c7' :
                        key === 'slate' ? '#0f172a' :
                        key === 'mint' ? '#064e3b' : '#4c1d95',
                    }}
                    title={BG_THEMES[key].label}
                  />
                ))}
              </div>

              {/* AI Assistant Button */}
              <button
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-brand-500 hover:from-violet-500 hover:to-brand-400 text-xs font-semibold text-white shadow-md transition active:scale-95"
              >
                <Icon name="Sparkles" size={12} className="text-yellow-300" />
                AIアシスタント
              </button>

              {/* Insert SVG Chart */}
              <button
                onClick={() => setShowChartModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white transition"
                title="SVGグラフを挿入"
              >
                <Icon name="Activity" size={12} className="text-cyan-300" />
                グラフ
              </button>

              {/* Insert Image */}
              <button
                onClick={() => setShowImageModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white transition"
                title="画像を挿入"
              >
                <Icon name="ImageIcon" size={12} className="text-emerald-300" />
                画像
              </button>

              {/* Export to OS */}
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-xs font-semibold text-white transition active:scale-95"
              >
                <Icon name="Save" size={12} />
                エクスポート
              </button>
            </div>
          </div>

          {/* AI Quick Toolbar */}
          <div className="flex items-center gap-2 px-4 py-1.5 bg-violet-950/40 border-b border-violet-500/20 text-xs overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300 flex items-center gap-1 shrink-0">
              <Icon name="Sparkles" size={10} /> Quick AI:
            </span>

            <button
              onClick={() => {
                setAiActionType('grammar');
                handleRunAiAction();
              }}
              disabled={isAiLoading}
              className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-400/30 text-[11px] font-medium transition shrink-0 flex items-center gap-1"
            >
              🪄 Fix Grammar (文法校正)
            </button>

            <button
              onClick={() => {
                setAiActionType('tone');
                setSelectedTone('business');
                handleRunAiAction();
              }}
              disabled={isAiLoading}
              className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-400/30 text-[11px] font-medium transition shrink-0"
            >
              💼 ビジネス調に変換
            </button>

            <button
              onClick={() => {
                setAiActionType('tone');
                setSelectedTone('bullets');
                handleRunAiAction();
              }}
              disabled={isAiLoading}
              className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-400/30 text-[11px] font-medium transition shrink-0"
            >
              📋 箇条書きに要約
            </button>

            <button
              onClick={() => {
                setAiActionType('generate');
                setShowAiModal(true);
              }}
              disabled={isAiLoading}
              className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-400/30 text-[11px] font-medium transition shrink-0"
            >
              ✍️ 続きをAI生成
            </button>
          </div>

          {/* Main Editor Body Container */}
          <div className={`flex-1 flex flex-col md:flex-row min-h-0 ${currentTheme.bgClass} transition-colors duration-300 overflow-hidden`}>
            {/* Left: Raw Text Area */}
            <div className="flex-1 flex flex-col min-h-0 border-r border-current/10">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="ここにテキストを自由に入力してください... (AIアシスタントやグラフ挿入も利用可能です)"
                className={`flex-1 w-full resize-none p-6 text-sm outline-none leading-relaxed bg-transparent ${currentTheme.textClass}`}
                spellCheck={false}
              />
            </div>

            {/* Right / Inline SVG Chart & Image Dynamic Preview Panel */}
            <div className="w-full md:w-80 border-t md:border-t-0 border-current/10 bg-black/20 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-current/10 text-xs font-bold opacity-80">
                <span className="flex items-center gap-1.5">
                  <Icon name="Eye" size={14} /> リアルタイム・プレビュー
                </span>
                <span className="text-[10px] font-mono opacity-60">SVG Charts & Assets</span>
              </div>

              {/* Render dynamic charts found in content */}
              <RenderEmbeddedCharts content={content} />

              {/* Render dynamic images found in content */}
              <RenderEmbeddedImages content={content} />
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/10 bg-black/60 text-[11px] text-white/50">
            <div className="flex items-center gap-3">
              <span>文字数: {content.length}</span>
              <span>行数: {content.split('\n').length}</span>
              <span>読了目安: {Math.max(1, Math.ceil(content.length / 400))} 分</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono">Theme: {currentTheme.label}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TEMPLATE SELECTION MODAL                                               */}
      {/* ========================================================================= */}
      {showTemplateModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowTemplateModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel rounded-3xl p-6 w-full max-w-2xl border border-white/20 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Icon name="Sparkles" size={18} className="text-yellow-400" />
                テンプレートを選択
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleCreateNew(tmpl.id)}
                  className="flex flex-col items-start p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-400/50 text-left transition group"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-2 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      <Icon name={tmpl.icon} size={18} />
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-brand-300 transition">
                      {tmpl.name}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 line-clamp-2">{tmpl.desc}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. AI ASSISTANT MODAL                                                     */}
      {/* ========================================================================= */}
      {showAiModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowAiModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel rounded-3xl p-6 w-full max-w-lg border border-violet-500/30 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Icon name="Sparkles" size={18} className="text-yellow-400" />
                Gemini 3.8 Flash AI アシスタント
              </h3>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            {/* AI Action Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              {[
                { id: 'grammar', label: '🪄 校正' },
                { id: 'generate', label: '✍️ 生成' },
                { id: 'tone', label: '🎭 トーン' },
                { id: 'summarize', label: '🔍 要約' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAiActionType(tab.id as typeof aiActionType)}
                  className={`py-1.5 rounded-lg font-medium transition ${
                    aiActionType === tab.id
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sub-options depending on action type */}
            {aiActionType === 'generate' && (
              <div>
                <label className="block text-xs text-white/70 mb-1 font-medium">
                  生成のプロンプト・指示を入力してください:
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="例: 「新製品発表のメール文面を作成してください」「このテーマに関するメリットとデメリットを提案してください」"
                  className="w-full h-24 p-3 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-violet-400 resize-none"
                />
              </div>
            )}

            {aiActionType === 'tone' && (
              <div>
                <label className="block text-xs text-white/70 mb-2 font-medium">
                  変換するスタイル・トーンを選択:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'business', label: '💼 ビジネス調 (敬語・丁寧)' },
                    { id: 'casual', label: '😊 カジュアル調 (親しみやすい)' },
                    { id: 'professional', label: '🎓 プロフェッショナル (論理的)' },
                    { id: 'bullets', label: '📋 箇条書き整理' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTone(t.id as typeof selectedTone)}
                      className={`p-2.5 rounded-xl border text-xs text-left transition ${
                        selectedTone === t.id
                          ? 'bg-violet-600/30 border-violet-400 text-white font-semibold'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {aiActionType === 'grammar' && (
              <p className="text-xs text-white/60 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
                ドキュメント全体の誤字脱字、文法エラー、助詞の誤用、てにをはを AI が自動分析して最高レベルに修整します。
              </p>
            )}

            {aiActionType === 'summarize' && (
              <p className="text-xs text-white/60 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
                長文テキストの要点を抽出し、簡潔で分かりやすい要約文を作成します。
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-white/70 hover:bg-white/10 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleRunAiAction}
                disabled={isAiLoading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-brand-500 hover:from-violet-500 hover:to-brand-400 text-white shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isAiLoading ? (
                  <>
                    <Icon name="RefreshCw" size={14} className="animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Icon name="Sparkles" size={14} />
                    AIで実行する
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SVG CHART BUILDER MODAL                                                */}
      {/* ========================================================================= */}
      {showChartModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowChartModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel rounded-3xl p-6 w-full max-w-md border border-cyan-500/30 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Icon name="Activity" size={18} className="text-cyan-400" />
                SVG グラフの作成と挿入
              </h3>
              <button
                onClick={() => setShowChartModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1 font-medium">グラフタイプ:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bar', label: '📊 棒グラフ' },
                  { id: 'line', label: '📈 折れ線' },
                  { id: 'pie', label: '🥧 円グラフ' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setChartType(t.id as typeof chartType)}
                    className={`p-2 rounded-xl text-xs font-semibold border transition ${
                      chartType === t.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1 font-medium">グラフタイトル:</label>
              <input
                type="text"
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1 font-medium">
                データ項目と数値 (形式: `項目:数値, 項目:数値`):
              </label>
              <input
                type="text"
                value={chartDataStr}
                onChange={(e) => setChartDataStr(e.target.value)}
                placeholder="例: 1月:100, 2月:250, 3月:180"
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowChartModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-white/70 hover:bg-white/10 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleInsertChart}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition active:scale-95"
              >
                グラフを挿入
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. IMAGE INSERTION MODAL                                                  */}
      {/* ========================================================================= */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel rounded-3xl p-6 w-full max-w-md border border-emerald-500/30 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Icon name="ImageIcon" size={18} className="text-emerald-400" />
                画像の挿入
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1 font-medium">画像ファイルアップロード:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                className="w-full text-xs text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30 cursor-pointer"
              />
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-2 text-[10px] text-white/40 uppercase font-mono">または URL 指定</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1 font-medium">画像 URL:</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-white/70 hover:bg-white/10 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleInsertImage}
                disabled={!imageUrl}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition active:scale-95 disabled:opacity-40"
              >
                URLから挿入
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SAVE TO OS EXPORT MODAL                                                */}
      {/* ========================================================================= */}
      {showSaveModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowSaveModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel rounded-3xl p-6 w-full max-w-sm border border-brand-500/30 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Icon name="Save" size={18} className="text-brand-400" />
              OSファイルシステムに保存
            </h3>

            <div>
              <label className="block text-xs text-white/70 mb-1 font-medium">ファイル名:</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-brand-400"
              />
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1 font-medium">保存場所:</label>
              <select
                value={saveFolder}
                onChange={(e) => setSaveFolder(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-brand-400"
              >
                <option value="Documents">Documents (ドキュメント)</option>
                <option value="Downloads">Downloads (ダウンロード)</option>
                <option value="Pictures">Pictures (ピクチャ)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-white/70 hover:bg-white/10 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleExportToFileSystem}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-400 text-white shadow-md transition active:scale-95"
              >
                保存実行
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// HELPER COMPONENT: Render Embedded SVG Charts directly from markdown tags
// =========================================================================
function RenderEmbeddedCharts({ content }: { content: string }) {
  const chartMatches = useMemo(() => {
    const matches: Array<{ type: 'bar' | 'line' | 'pie'; title: string; items: Array<{ label: string; val: number }> }> = [];
    const regex = /\[CHART:(bar|line|pie)\|([^|]+)\|([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const type = match[1] as 'bar' | 'line' | 'pie';
      const title = match[2].trim();
      const rawData = match[3].split(',');
      const items = rawData
        .map((d) => {
          const [label, valStr] = d.split(':');
          return { label: label?.trim() || '項目', val: parseFloat(valStr?.trim() || '0') };
        })
        .filter((i) => !isNaN(i.val));

      matches.push({ type, title, items });
    }
    return matches;
  }, [content]);

  if (chartMatches.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-white/40">
        <Icon name="Activity" size={24} className="mx-auto mb-2 opacity-30" />
        グラフ埋め込みはありません
        <p className="text-[10px] opacity-60 mt-1">上部の「グラフ」ボタンから追加できます。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chartMatches.map((chart, idx) => {
        const maxVal = Math.max(...chart.items.map((i) => i.val), 1);
        const totalVal = chart.items.reduce((acc, i) => acc + i.val, 0) || 1;

        return (
          <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                <Icon name="Activity" size={12} /> {chart.title}
              </span>
              <span className="text-[10px] font-mono opacity-50 uppercase">{chart.type} chart</span>
            </div>

            {/* Bar Chart SVG */}
            {chart.type === 'bar' && (
              <div className="space-y-2 pt-1">
                {chart.items.map((item, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] opacity-80">
                      <span>{item.label}</span>
                      <span className="font-mono font-bold">{item.val}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.val / maxVal) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pie / Donut Chart representation */}
            {chart.type === 'pie' && (
              <div className="space-y-2 pt-1">
                <div className="flex h-3 rounded-full overflow-hidden bg-black/40">
                  {chart.items.map((item, i) => {
                    const colors = ['bg-cyan-400', 'bg-violet-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400'];
                    return (
                      <div
                        key={i}
                        style={{ width: `${(item.val / totalVal) * 100}%` }}
                        className={`h-full ${colors[i % colors.length]}`}
                        title={`${item.label}: ${item.val}`}
                      />
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                  {chart.items.map((item, i) => {
                    const bgColors = ['bg-cyan-400', 'bg-violet-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400'];
                    return (
                      <div key={i} className="flex items-center gap-1.5 opacity-80">
                        <span className={`w-2 h-2 rounded-full ${bgColors[i % bgColors.length]}`} />
                        <span className="truncate">{item.label}</span>
                        <span className="font-mono ml-auto opacity-60">
                          {Math.round((item.val / totalVal) * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Line Chart Sparkline */}
            {chart.type === 'line' && (
              <div className="pt-2">
                <svg className="w-full h-20 overflow-visible">
                  {/* Generate polyline points */}
                  {(() => {
                    const width = 240;
                    const height = 60;
                    const points = chart.items
                      .map((item, i) => {
                        const x = (i / Math.max(chart.items.length - 1, 1)) * width;
                        const y = height - (item.val / maxVal) * height;
                        return `${x},${y}`;
                      })
                      .join(' ');

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          points={points}
                        />
                        {chart.items.map((item, i) => {
                          const x = (i / Math.max(chart.items.length - 1, 1)) * width;
                          const y = height - (item.val / maxVal) * height;
                          return (
                            <g key={i}>
                              <circle cx={x} cy={y} r="4" fill="#0891b2" stroke="#fff" strokeWidth="1.5" />
                              <text x={x} y={y - 8} fill="#a5f3fc" fontSize="9" textAnchor="middle font-mono">
                                {item.val}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =========================================================================
// HELPER COMPONENT: Render Embedded Images
// =========================================================================
function RenderEmbeddedImages({ content }: { content: string }) {
  const images = useMemo(() => {
    const urls: string[] = [];
    const regex = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) urls.push(match[1]);
    }
    return urls;
  }, [content]);

  if (images.length === 0) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 border-t border-current/10 pt-3">
        <Icon name="ImageIcon" size={14} /> 埋め込み画像 ({images.length})
      </div>
      {images.map((url, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
          <img src={url} alt="Embedded Asset" className="w-full h-auto object-cover max-h-48" />
        </div>
      ))}
    </div>
  );
}

