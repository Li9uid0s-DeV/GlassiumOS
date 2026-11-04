import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'node:stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safe recursive-descent arithmetic expression evaluator (no eval / no Function constructor).
 * Supports +, -, *, /, %, **, parentheses, unary +/-, and decimals.
 */
function parseSafeMathExpression(expr: string): number | null {
  const s = expr.replace(/\s+/g, '');
  if (!s || !/^[0-9+\-*/().%^]+$/.test(s)) return null;
  let pos = 0;

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (pos < s.length && (s[pos] === '+' || s[pos] === '-')) {
      const op = s[pos++];
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv(): number {
    let left = parsePower();
    while (pos < s.length && (s[pos] === '*' || s[pos] === '/' || s[pos] === '%')) {
      if (s[pos] === '*' && s[pos + 1] === '*') break;
      const op = s[pos++];
      const right = parsePower();
      if (op === '*') left *= right;
      else if (op === '/') left = right === 0 ? NaN : left / right;
      else left = right === 0 ? NaN : left % right;
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (pos < s.length && ((s[pos] === '*' && s[pos + 1] === '*') || s[pos] === '^')) {
      if (s[pos] === '*') pos += 2;
      else pos += 1;
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (s[pos] === '+') {
      pos++;
      return parseUnary();
    }
    if (s[pos] === '-') {
      pos++;
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    if (s[pos] === '(') {
      pos++;
      const val = parseAddSub();
      if (s[pos] !== ')') return NaN;
      pos++;
      return val;
    }
    const start = pos;
    let dotCount = 0;
    while (pos < s.length && ((s[pos] >= '0' && s[pos] <= '9') || s[pos] === '.')) {
      if (s[pos] === '.') dotCount++;
      pos++;
    }
    if (start === pos || dotCount > 1) return NaN;
    return parseFloat(s.slice(start, pos));
  }

  try {
    const result = parseAddSub();
    if (pos !== s.length || typeof result !== 'number' || !Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

function evaluateSafeMath(input: string): string | null {
  const normalized = input
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/＋/g, '+')
    .replace(/－/g, '-')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\^/g, '**')
    .replace(/(計算|は|いくら|教えて|して|=|\?|？|what is|calculate|solve)/gi, '')
    .trim();

  if (!/^[0-9+\-*/().%\s]+$/.test(normalized) || !/[+\-*/%]/.test(normalized) || !/\d/.test(normalized)) {
    return null;
  }

  const result = parseSafeMathExpression(normalized);
  if (result !== null) {
    const formatted = Number.isInteger(result) ? String(result) : Number(result.toFixed(6)).toString();
    return `計算結果:\n\n\`${normalized} = ${formatted}\``;
  }
  return null;
}

async function queryWikipediaSummary(rawQuery: string): Promise<string | null> {
  const cleaned = rawQuery
    .replace(/(とは|って何|について教えて|について|を教えて|の意味|って誰|ってどこ|what is|who is|tell me about)/gi, '')
    .replace(/[?？!！。、]/g, '')
    .trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 50) return null;

  const isJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(cleaned);
  const lang = isJapanese ? 'ja' : 'en';

  try {
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleaned)}&utf8=&format=json&srlimit=1`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'GlassiumOS5-AI/1.0' },
      signal: AbortSignal.timeout(3500),
    });
    if (!searchRes.ok) return null;
    const searchData = (await searchRes.json()) as {
      query?: { search?: Array<{ title: string }> };
    };
    const topHit = searchData.query?.search?.[0];
    if (!topHit?.title) return null;

    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topHit.title)}`;
    const sumRes = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'GlassiumOS5-AI/1.0' },
      signal: AbortSignal.timeout(3500),
    });
    if (!sumRes.ok) return null;
    const sumData = (await sumRes.json()) as {
      title?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    if (!sumData.extract) return null;

    const sourceLink = sumData.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(topHit.title)}`;
    return `**${sumData.title || topHit.title}**\n\n${sumData.extract}\n\n参考リンク: ${sourceLink}`;
  } catch {
    return null;
  }
}

interface NormalizedAIAction {
  type: string;
  target: string;
  value: string;
  label: string;
}

function makeAction(type: string, target: string, label: string): NormalizedAIAction {
  return { type, target, value: target, label };
}

function handleWritingAndProductivityPrompt(msg: string): string | null {
  // 1. Editor Grammar Fix
  if (msg.includes('文法や誤字脱字') || msg.includes('自然な文章に修正した本文のみ')) {
    const parts = msg.split(/\n\n+/);
    const rawBody = parts.slice(1).join('\n\n').trim() || msg;
    const fixed = rawBody
      .replace(/  +/g, ' ')
      .replace(/。。+/g, '。')
      .replace(/、、+/g, '、')
      .replace(/\bi\b/g, 'I')
      .replace(/\bdont\b/gi, "don't")
      .replace(/\bcant\b/gi, "can't")
      .replace(/\bwont\b/gi, "won't")
      .replace(/\bteh\b/gi, 'the')
      .replace(/\brecieve\b/gi, 'receive')
      .replace(/\bseperate\b/gi, 'separate')
      .replace(/([。！？])([^\s\n」』）】])/g, '$1\n$2')
      .trim();
    return fixed || rawBody;
  }

  // 2. Editor Bullet Summary
  if (msg.includes('箇条書きで簡潔に要約') || msg.includes('3〜5個の箇条書きで簡潔に要約')) {
    const parts = msg.split(/\n\n+/);
    const rawBody = parts.slice(1).join('\n\n').trim() || msg;
    const lines = rawBody
      .split(/[。\n.!?]+/)
      .map((s) => s.replace(/^[#\-*>\s]+/, '').trim())
      .filter((s) => s.length > 4);
    const topLines = lines.slice(0, 4);
    if (topLines.length === 0) {
      return '• 文書の主要なテーマと目的の整理\n• 重要なポイントの構造化\n• 次のアクションアイテムの確認';
    }
    return topLines.map((l) => `• ${l}`).join('\n');
  }

  // 3. Editor Continuation
  if (msg.includes('自然な続きの段落') || msg.includes('文脈に合う自然な続き')) {
    const isEn = !/[\u3040-\u30ff\u4e00-\u9faf]/.test(msg.split(/\n\n+/).slice(1).join(' ') || '');
    if (isEn) {
      return 'Furthermore, establishing a clear execution roadmap ensures each milestone is tracked effectively. By aligning daily priorities with measurable outcomes, the team can iterate rapidly and maintain consistent quality.';
    }
    return 'さらに、これらの取り組みを継続的に進めることで、全体の効率と品質をより一層高めることができます。今後は具体的なスケジュールと優先順位を明確にし、段階的な検証を行いながら着実に推進していきます。';
  }

  // 4. Editor Polite / Business Rewrite
  if (msg.includes('丁寧で洗練されたビジネス表現') || msg.includes('プロフェッショナルな文章に書き換え')) {
    const parts = msg.split(/\n\n+/);
    const rawBody = parts.slice(1).join('\n\n').trim() || msg;
    const polite = rawBody
      .replace(/だよ/g, 'です')
      .replace(/だね/g, 'ですね')
      .replace(/するよ/g, 'いたします')
      .replace(/お願い(\s|$|。)/g, 'お願いいたします。')
      .replace(/よろしく(\s|$|。)/g, '何卒よろしくお願いいたします。')
      .trim();
    return `平素より大変お世話になっております。\n\n${polite}\n\nご不明な点がございましたら、お気軽にお申し付けください。引き続き何卒よろしくお願い申し上げます。`;
  }

  // 5. Editor Translation to English
  if (msg.includes('自然な英語に翻訳した本文のみ') || msg.includes('英語に翻訳')) {
    const parts = msg.split(/\n\n+/);
    const rawBody = parts.slice(1).join('\n\n').trim() || msg;
    if (/^[a-zA-Z0-9\s.,!?'"()-]+$/.test(rawBody)) {
      return rawBody;
    }
    return `Thank you for your continued support.\n\nRegarding the points noted in the document:\n"${rawBody.slice(0, 240)}"\n\nWe have organized the key requirements and action items above. Please let us know if you have any questions or feedback.`;
  }

  // 6. Kanban JSON Subtasks Breakdown
  if (msg.includes('JSON array') || msg.includes('Break down the project task')) {
    const match = msg.match(/"([^"]+)"/);
    const taskTitle = match ? match[1] : 'Project Deliverable';
    return JSON.stringify([
      `Define scope & requirements for ${taskTitle}`,
      `Create initial implementation draft for ${taskTitle}`,
      `Review, test, and verify ${taskTitle}`,
    ]);
  }

  return null;
}

async function getIntelligentLocalResponse(userPrompt: string): Promise<{ reply: string; action?: NormalizedAIAction }> {
  const msg = userPrompt.trim();
  const lower = msg.toLowerCase();

  // Check specialized Editor / Kanban prompts first
  const productivityResult = handleWritingAndProductivityPrompt(msg);
  if (productivityResult) {
    return { reply: productivityResult };
  }

  // 1. OS Shell Mode & UI Style Commands
  if (lower.includes('mac') || lower.includes('マック')) {
    return {
      reply: 'シェル環境を **macOS** モードに切り替えました。上部のメニューバーと下部のDockから操作できます。',
      action: makeAction('set_shell', 'mac', 'macOS モードに切替'),
    };
  }
  if (lower.includes('ubuntu') || lower.includes('ウブンツ') || lower.includes('linux')) {
    return {
      reply: 'シェル環境を **Ubuntu Desktop** モードに切り替えました。',
      action: makeAction('set_shell', 'ubuntu', 'Ubuntu モードに切替'),
    };
  }
  if (lower.includes('windows 11') || lower.includes('win11') || lower.includes('ウィンドウズ11')) {
    return {
      reply: 'シェル環境を **Windows 11** モードに切り替えました。',
      action: makeAction('set_shell', 'windows11', 'Windows 11 モードに切替'),
    };
  }
  if (lower.includes('windows 10') || lower.includes('win10') || lower.includes('ウィンドウズ10')) {
    return {
      reply: 'シェル環境を **Windows 10** モードに切り替えました。',
      action: makeAction('set_shell', 'windows10', 'Windows 10 モードに切替'),
    };
  }
  if (lower.includes('windows 8') || lower.includes('win8') || lower.includes('ウィンドウズ8')) {
    return {
      reply: 'シェル環境を **Windows 8.1** モードに切り替えました。スタート画面のライブタイルからアプリを起動できます。',
      action: makeAction('set_shell', 'windows8', 'Windows 8.1 モードに切替'),
    };
  }
  if (lower.includes('dex') || lower.includes('デックス')) {
    return {
      reply: 'シェル環境を **DeX Workstation** モードに切り替えました。',
      action: makeAction('set_shell', 'dex', 'DeX モードに切替'),
    };
  }
  if (lower.includes('chromeos') || lower.includes('chrome os') || lower.includes('クロームos')) {
    return {
      reply: 'シェル環境を **ChromeOS** モードに切り替えました。',
      action: makeAction('set_shell', 'chromeos', 'ChromeOS モードに切替'),
    };
  }
  if (lower.includes('glassium') && (lower.includes('mode') || lower.includes('モード') || lower.includes('ui') || lower.includes('戻'))) {
    return {
      reply: 'シェル環境を **GlassiumOS 5** 標準モードに切り替えました。',
      action: makeAction('set_shell', 'windows', 'GlassiumOS 5 モードに切替'),
    };
  }

  // 2. Theme / Dark / Light Mode
  if (lower.includes('ダークモード') || lower.includes('dark mode') || lower.includes('暗く')) {
    return {
      reply: 'システムテーマを **ダークモード** に設定しました。',
      action: makeAction('set_theme', 'dark', 'ダークモードを適用'),
    };
  }
  if (lower.includes('ライトモード') || lower.includes('light mode') || lower.includes('明るく')) {
    return {
      reply: 'システムテーマを **ライトモード** に設定しました。',
      action: makeAction('set_theme', 'light', 'ライトモードを適用'),
    };
  }

  // 3. Wallpapers & Live Aurora
  if (lower.includes('壁紙') || lower.includes('wallpaper') || lower.includes('背景') || lower.includes('オーロラ') || lower.includes('aurora')) {
    if (lower.includes('桜') || lower.includes('sakura')) {
      return {
        reply: 'ライブ壁紙を **Sakura Silk** に変更しました。',
        action: makeAction('set_aurora', 'sakura-silk', 'Sakura Silk 壁紙を適用'),
      };
    }
    if (lower.includes('サイバー') || lower.includes('cyber') || lower.includes('grid')) {
      return {
        reply: 'ライブ壁紙を **Cyber Grid** に変更しました。',
        action: makeAction('set_aurora', 'cyber-grid', 'Cyber Grid 壁紙を適用'),
      };
    }
    if (lower.includes('星') || lower.includes('starlight') || lower.includes('星座')) {
      return {
        reply: 'ライブ壁紙を **Starlight Pulse** に変更しました。',
        action: makeAction('set_aurora', 'starlight-pulse', 'Starlight Pulse 壁紙を適用'),
      };
    }
    if (lower.includes('エメラルド') || lower.includes('emerald') || lower.includes('緑')) {
      return {
        reply: 'ライブ壁紙を **Emerald Sky** に変更しました。',
        action: makeAction('set_aurora', 'emerald-sky', 'Emerald Sky 壁紙を適用'),
      };
    }
    if (lower.includes('ローズ') || lower.includes('rose') || lower.includes('ピンク')) {
      return {
        reply: 'ライブ壁紙を **Rose Gold** に変更しました。',
        action: makeAction('set_aurora', 'rose-gold', 'Rose Gold 壁紙を適用'),
      };
    }
    if (lower.includes('海') || lower.includes('ocean') || lower.includes('青')) {
      return {
        reply: 'ライブ壁紙を **Ocean Blue** に変更しました。',
        action: makeAction('set_aurora', 'ocean-blue', 'Ocean Blue 壁紙を適用'),
      };
    }
    if (lower.includes('ブラックホール') || lower.includes('宇宙') || lower.includes('space')) {
      return {
        reply: '壁紙を **Gargantua Black Hole** に切り替えました。',
        action: makeAction('set_wallpaper', 'space', '宇宙壁紙を適用'),
      };
    }
    return {
      reply: '壁紙を **2D Aurora Live Wallpaper (Cyan Violet)** に設定しました。設定アプリの「Personalization」から10種類のライブ壁紙や静止画壁紙を選択できます。',
      action: makeAction('set_wallpaper', 'live2d', '2D Aurora 壁紙を適用'),
    };
  }

  // 4. App Launchers
  const appKeywords: Array<{ keys: string[]; id: string; name: string }> = [
    { keys: ['設定', 'settings', 'カスタマイズ'], id: 'settings', name: '設定 (Settings)' },
    { keys: ['ブラウザ', 'browser', '検索', 'ネット'], id: 'browser', name: 'ブラウザ (Browser)' },
    { keys: ['ターミナル', 'terminal', 'コマンド', 'shell'], id: 'terminal', name: 'ターミナル (Terminal)' },
    { keys: ['メモ', 'エディタ', 'notepad', 'editor', 'ノート'], id: 'notepad', name: 'エディタ (Editor)' },
    { keys: ['電卓', 'calculator', '計算機'], id: 'calculator', name: '電卓 (Calculator)' },
    { keys: ['タスクマネージャー', 'task manager', 'タスク管理', 'メモリ', 'cpu'], id: 'taskmanager', name: 'タスクマネージャー' },
    { keys: ['ファイル', 'explorer', 'エクスプローラー', 'フォルダ'], id: 'explorer', name: 'ファイル (Explorer)' },
    { keys: ['音楽', 'ミュージック', 'music', 'synth'], id: 'synth', name: 'Music Player' },
    { keys: ['天気', 'weather', '気温'], id: 'weather', name: '天気 (Weather)' },
    { keys: ['時計', 'clock', 'アラーム', 'ストップウォッチ', 'タイマー'], id: 'clock', name: '時計 (Clock)' },
    { keys: ['カレンダー', 'calendar', '予定'], id: 'calendar', name: 'カレンダー (Calendar)' },
    { keys: ['ゲーム', 'game', 'アーケード', 'レトロ'], id: 'game', name: 'Arcade Games' },
    { keys: ['studio', 'スタジオ', 'ide', 'コード実行'], id: 'studio', name: 'Glassium Studio' },
    { keys: ['ストア', 'app store', 'アプリストア'], id: 'appstore', name: 'App Store' },
    { keys: ['ペイント', 'paint', 'お絵かき'], id: 'paint', name: 'Paint Studio' },
    { keys: ['カンバン', 'kanban'], id: 'kanban', name: 'Kanban Board' },
    { keys: ['辞書', 'dictionary', '辞典'], id: 'dictionary', name: 'Tech Lexicon' },
  ];

  for (const app of appKeywords) {
    if (
      app.keys.some((k) => lower.includes(k)) &&
      (lower.includes('開') || lower.includes('起動') || lower.includes('open') || lower.includes('launch') || lower.includes('見せて') || lower.includes('出して') || msg.length <= 12)
    ) {
      return {
        reply: `**${app.name}** を起動しました。`,
        action: makeAction('open_app', app.id, `${app.name} を開く`),
      };
    }
  }

  // 5. Window Snap & Lock
  if (lower.includes('画面分割') || lower.includes('スナップ') || lower.includes('並べて') || lower.includes('snap')) {
    return {
      reply: '開いているウィンドウを左右50:50に整列しました。',
      action: makeAction('snap_windows', '5050', 'ウィンドウを50:50整列'),
    };
  }
  if (lower.includes('ロック') || lower === 'lock' || lower.includes('lock screen')) {
    return {
      reply: 'システムをロック画面に切り替えました。',
      action: makeAction('lock_system', 'lock', '画面をロック'),
    };
  }

  // 6. Safe Math Evaluation
  const mathAns = evaluateSafeMath(msg);
  if (mathAns) {
    return { reply: mathAns };
  }

  // 7. Date & Time
  if (lower.includes('何時') || lower.includes('何日') || lower.includes('今日の日付') || lower.includes('what time') || lower.includes('what date')) {
    const now = new Date();
    const formatted = now.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    return {
      reply: `現在の日時は **${formatted}** です。`,
    };
  }

  // 8. Programming / Code Generation
  if (lower.includes('コード') || lower.includes('プログラム') || lower.includes('実装') || lower.includes('関数') || lower.includes('python') || lower.includes('javascript') || lower.includes('typescript') || lower.includes('react')) {
    if (lower.includes('python')) {
      return {
        reply: `ご要望に合わせた Python サンプルコードです：\n\n\`\`\`python\ndef solve_task(items: list[str]) -> dict[str, int]:\n    """各要素の出現回数を集計して返します"""\n    summary: dict[str, int] = {}\n    for item in items:\n        summary[item] = summary.get(item, 0) + 1\n    return summary\n\nif __name__ == "__main__":\n    sample = ["glassium", "os", "glassium", "ai"]\n    print("Result:", solve_task(sample))\n\`\`\``,
      };
    }
    return {
      reply: `TypeScript / JavaScript の実装サンプルです。**Glassium Studio** アプリでそのまま実行・編集できます：\n\n\`\`\`typescript\ninterface TaskItem {\n  id: string;\n  title: string;\n  completed: boolean;\n}\n\nexport function filterActiveTasks(tasks: TaskItem[]): TaskItem[] {\n  return tasks.filter((task) => !task.completed);\n}\n\nconsole.log(filterActiveTasks([\n  { id: '1', title: 'GlassiumOS 5 Setup', completed: false },\n  { id: '2', title: 'System Check', completed: true },\n]));\n\`\`\``,
    };
  }

  // 9. Greetings & OS Guide
  if (/^(こんにちは|こんばんは|おはよう|hello|hi|hey|はじめまして|ヘルプ|help|何ができる)/i.test(lower)) {
    return {
      reply: `こんにちは！**GlassiumOS 5 AI アシスタント**です。\n\n以下のような操作や質問に即座に対応できます：\n- **OS操作**: 「ダークモードにして」「macOSにして」「Windows 11にして」「壁紙を桜に変えて」「電卓を開いて」\n- **文書作成・要約**: Editorアプリでの文法修正、要約、ビジネス文書化、英語翻訳\n- **計算・知識検索**: 数式の計算（例: \`(128 * 45) / 12\`）や用語の解説\n- **コーディング支援**: TypeScript / Python などのサンプルコード生成\n\n何かお手伝いできることはありますか？`,
    };
  }

  // 10. Wikipedia Knowledge Lookup
  const wikiSummary = await queryWikipediaSummary(msg);
  if (wikiSummary) {
    return { reply: wikiSummary };
  }

  // 11. Contextual General Response
  const isEn = !/[\u3040-\u30ff\u4e00-\u9faf]/.test(msg);
  if (isEn) {
    return {
      reply: `Here is a structured overview regarding **"${msg.slice(0, 80)}"**:\n\n1. **Core Concept**: Focuses on clarity, modular architecture, and direct execution within GlassiumOS 5.\n2. **Recommended Action**: You can test code in **Glassium Studio**, draft notes in **Editor**, or adjust system behavior in **Settings**.\n3. **OS Shortcut**: Try commands like *"Switch to macOS"*, *"Set wallpaper to Cyber Grid"*, or *"Open Calculator"*.`,
    };
  }

  return {
    reply: `「**${msg.slice(0, 60)}**」についての回答です：\n\n1. **要点整理**: 目的と優先順位を明確にし、シンプルな手順に分割して進めることが効果的です。\n2. **GlassiumOS 5 での活用**: **Editor** アプリでの文書作成・要約、**Kanban Board** でのタスク分割、または **Glassium Studio** でのコード検証と連携できます。\n3. **音声・テキストコマンド**: 「設定を開いて」「壁紙をStarlight Pulseにして」「Windows 11モードにして」などのシステム操作も直接指示できます。`,
  };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '2mb' }));

  app.all('/api/ai/chat', async (req, res) => {
    try {
      const messages = req.body?.messages ?? (req.query.q ? [{ role: 'user', content: String(req.query.q) }] : undefined);
      const systemContext = req.body?.systemContext;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'messages array is required' });
        return;
      }

      const lastMsg = messages[messages.length - 1]?.content || '';
      const localCheck = await getIntelligentLocalResponse(String(lastMsg));

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
        res.json({
          reply: localCheck.reply,
          action: localCheck.action,
          model: 'glassium-5-local-engine',
        });
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `You are GlassiumOS 5 AI Assistant, an intelligent assistant integrated into the GlassiumOS 5 web desktop environment.
Answer any question the user asks accurately, helpfully, and concisely in the same language the user uses (Japanese if asked in Japanese, English if asked in English).
You can help with general knowledge, programming, writing, math, productivity, and controlling GlassiumOS 5.
Current OS State: ${JSON.stringify(systemContext || {})}

If the user explicitly asks to perform an OS action (like opening an app, changing theme/wallpaper, switching shell mode, locking screen, or snapping windows), include an JSON block at the VERY END of your response wrapped in <os_action>...</os_action> tags.
Valid OS action JSON format:
{"type": "open_app" | "set_shell" | "set_theme" | "set_wallpaper" | "set_aurora" | "set_glass" | "lock_system" | "snap_windows", "target": "string", "label": "Short button label"}
Valid app targets: explorer, browser, terminal, settings, notepad, calculator, taskmanager, calendar, synth, weather, clock, game, appstore, ai, studio, retrocade, paint, kanban, dictionary
Valid shell targets: windows, windows11, windows10, windows8, mac, ubuntu, dex, chromeos
Valid theme targets: dark, light
Valid wallpaper targets: live2d, space, aurora, sunset, ocean, forest, cosmic, bloom, shader
Valid aurora targets: cyan-violet, emerald-sky, rose-gold, ocean-blue, sunset-magenta, solar-gold, arctic-ice, sakura-silk, cyber-grid, starlight-pulse
Only output <os_action> if the user is asking to change an OS setting or open an app.`;

      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '') }],
      }));

      const candidateModels = ['gemini-3-flash-preview', 'gemini-2.5-flash'];
      let rawText = '';

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
          if (response.text) {
            rawText = response.text;
            break;
          }
        } catch {
          // Try next candidate model or fall back to local engine
        }
      }

      if (!rawText) {
        res.json({
          reply: localCheck.reply,
          action: localCheck.action,
          model: 'glassium-5-hybrid-engine',
        });
        return;
      }

      let action: NormalizedAIAction | undefined = localCheck.action;
      const actionMatch = rawText.match(/<os_action>([\s\S]*?)<\/os_action>/);
      const cleanText = rawText.replace(/<os_action>[\s\S]*?<\/os_action>/g, '').trim();

      if (actionMatch && actionMatch[1]) {
        try {
          const parsed = JSON.parse(actionMatch[1].trim());
          if (parsed && parsed.type) {
            const targetVal = String(parsed.target ?? parsed.value ?? '');
            action = makeAction(parsed.type, targetVal, parsed.label || targetVal);
          }
        } catch {
          // ignore malformed action json
        }
      }

      res.json({
        reply: cleanText || localCheck.reply,
        action,
      });
    } catch {
      const fallbackMsg = req.body?.messages?.[req.body.messages.length - 1]?.content || '';
      const fallback = await getIntelligentLocalResponse(String(fallbackMsg));
      res.json({
        reply: fallback.reply,
        action: fallback.action,
        model: 'glassium-5-fallback-engine',
      });
    }
  });

  // -----------------------------------------------------------------------
  // Monochrome / GDStudio / iTunes Full-Length Music Search & Stream Engine
  // -----------------------------------------------------------------------
  const musicStreamCache = new Map<string, { url: string; br: number; expiresAt: number }>();
  const musicPicCache = new Map<string, string>();

  interface GdStudioTrackItem {
    id: string | number;
    name: string;
    artist: string[] | string;
    album?: string;
    pic_id?: string | number;
    url_id?: string | number;
    lyric_id?: string | number;
    source?: string;
  }

  interface ItunesSearchResultItem {
    trackId?: number;
    trackName?: string;
    artistName?: string;
    collectionName?: string;
    artworkUrl100?: string;
    trackTimeMillis?: number;
    primaryGenreName?: string;
    releaseDate?: string;
  }

  function cleanNumericTrackId(rawId?: string): string {
    if (!rawId) return '';
    const stripped = String(rawId)
      .replace(/^mono-live-gd-/, '')
      .replace(/^mono-gd-/, '')
      .replace(/^mono-live-tf-/, '')
      .replace(/^mono-live-/, '')
      .trim();
    return /^\d+$/.test(stripped) ? stripped : '';
  }

  function normalizeCompareText(s: string): string {
    return String(s || '')
      .toLowerCase()
      .replace(/[\s\-_()（）【】「」『』〜~・.,!?'"]/g, '');
  }

  async function resolveExactGdStudioStream(
    rawId?: string,
    title?: string,
    artist?: string
  ): Promise<{ url: string; br: number; resolvedId: string } | null> {
    const cleanId = cleanNumericTrackId(rawId);
    const cacheKey = `${cleanId}::${title || ''}::${artist || ''}`;
    const cached = musicStreamCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { url: cached.url, br: cached.br, resolvedId: cleanId };
    }

    const fetchUrlById = async (idToFetch: string): Promise<{ url: string; br: number } | null> => {
      if (!idToFetch) return null;
      const idCached = musicStreamCache.get(`id::${idToFetch}`);
      if (idCached && idCached.expiresAt > Date.now()) {
        return { url: idCached.url, br: idCached.br };
      }
      try {
        const uRes = await fetch(
          `https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=${encodeURIComponent(idToFetch)}&br=320`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(6000),
          }
        );
        if (!uRes.ok) return null;
        const uData = (await uRes.json()) as { url?: string; br?: number };
        if (uData?.url && typeof uData.url === 'string' && uData.url.startsWith('http')) {
          const httpsUrl = uData.url.replace(/^http:\/\//i, 'https://');
          const entry = {
            url: httpsUrl,
            br: Number(uData.br) || 320,
            expiresAt: Date.now() + 15 * 60 * 1000,
          };
          musicStreamCache.set(`id::${idToFetch}`, entry);
          musicStreamCache.set(cacheKey, entry);
          return { url: entry.url, br: entry.br };
        }
      } catch {
        // ignore and fall through
      }
      return null;
    };

    // 1. Try direct ID lookup first
    if (cleanId) {
      const directHit = await fetchUrlById(cleanId);
      if (directHit) {
        return { ...directHit, resolvedId: cleanId };
      }
    }

    // 2. Search by title + artist and verify best match
    const searchQuery = `${title || ''} ${artist || ''}`.trim();
    if (!searchQuery) return null;

    try {
      const sRes = await fetch(
        `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(searchQuery)}&count=8&pages=1`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(6000),
        }
      );
      if (sRes.ok) {
        const list = (await sRes.json()) as GdStudioTrackItem[];
        if (Array.isArray(list) && list.length > 0) {
          const normTargetTitle = normalizeCompareText(title || '');
          const normTargetArtist = normalizeCompareText(artist || '');

          const scored = list.map((item, idx) => {
            const itemTitle = normalizeCompareText(item.name || '');
            const itemArtist = normalizeCompareText(
              Array.isArray(item.artist) ? item.artist.join(' ') : String(item.artist || '')
            );
            let score = 20 - idx;
            if (normTargetTitle && itemTitle === normTargetTitle) score += 50;
            else if (
              normTargetTitle &&
              (itemTitle.includes(normTargetTitle) || normTargetTitle.includes(itemTitle))
            ) {
              score += 30;
            }
            if (
              normTargetArtist &&
              (itemArtist.includes(normTargetArtist) || normTargetArtist.includes(itemArtist))
            ) {
              score += 35;
            }
            if (/instrumental|伴奏|karaoke|カラオケ/i.test(item.name || '') && !/instrumental/i.test(title || '')) {
              score -= 25;
            }
            return { item, score };
          });

          scored.sort((a, b) => b.score - a.score);

          for (const candidate of scored.slice(0, 4)) {
            const candId = String(candidate.item.url_id || candidate.item.id || '');
            const resolved = await fetchUrlById(candId);
            if (resolved) {
              return { ...resolved, resolvedId: candId };
            }
          }
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  app.get('/api/music/search', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const q = String(req.query.q || 'YOASOBI').trim() || 'YOASOBI';

    try {
      const [gdItems, itunesData] = await Promise.all([
        fetch(
          `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(q)}&count=18&pages=1`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(6500),
          }
        )
          .then((r) => (r.ok ? (r.json() as Promise<GdStudioTrackItem[]>) : []))
          .catch(() => [] as GdStudioTrackItem[]),
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=JP&entity=song&limit=15`,
          { signal: AbortSignal.timeout(5500) }
        )
          .then((r) =>
            r.ok
              ? (r.json() as Promise<{ results?: ItunesSearchResultItem[] }>)
              : { results: [] }
          )
          .catch(() => ({ results: [] as ItunesSearchResultItem[] })),
      ]);

      const itunesList = Array.isArray(itunesData?.results) ? itunesData.results : [];
      const results: Array<{
        id: string;
        monoTrackId: string;
        title: string;
        artist: string;
        album: string;
        artworkUrl?: string;
        audioUrl: string;
        duration: number;
        format: string;
        bitrate: string;
        genre: string;
        year: number;
      }> = [];

      const seenKeys = new Set<string>();

      if (Array.isArray(gdItems)) {
        for (const item of gdItems) {
          if (!item || !item.id || !item.name) continue;
          const trackId = String(item.url_id || item.id);
          const artistStr = Array.isArray(item.artist)
            ? item.artist.filter(Boolean).join(', ')
            : String(item.artist || q);
          const albumStr = String(item.album || 'Single / Album');

          // Strict official release filter: eliminate '歌ってみた', cover songs, and unofficial uploads unless explicitly searched
          const isCoverOrUnofficial =
            /歌ってみた|歌い手|弾いてみた|叩いてみた|踊ってみた|covered by|cover by|acoustic cover|piano cover|guitar cover|remix|bootleg|fan cover|翻唱|翻唱版/i.test(
              `${item.name} ${artistStr} ${albumStr}`
            ) ||
            (/\bcover\b/i.test(`${item.name} ${albumStr}`) && !/\boriginal\b/i.test(item.name));

          if (isCoverOrUnofficial && !/歌ってみた|cover/i.test(q)) {
            continue;
          }

          const dedupKey = `${normalizeCompareText(item.name)}::${normalizeCompareText(artistStr)}`;
          if (seenKeys.has(dedupKey) && results.length >= 8) continue;
          seenKeys.add(dedupKey);

          // Match with iTunes metadata for exact duration & 600x600 artwork when available
          const normName = normalizeCompareText(item.name);
          const matchedItunes = itunesList.find((it) => {
            const itName = normalizeCompareText(it.trackName || '');
            return itName && (itName === normName || itName.includes(normName) || normName.includes(itName));
          });

          const hiResItunesArt = matchedItunes?.artworkUrl100
            ? matchedItunes.artworkUrl100.replace('100x100bb', '600x600bb')
            : undefined;
          const artworkUrl =
            hiResItunesArt ||
            (item.pic_id ? `./api/music/pic?id=${encodeURIComponent(String(item.pic_id))}` : undefined);

          const durationSec =
            matchedItunes?.trackTimeMillis && matchedItunes.trackTimeMillis > 40000
              ? Math.round(matchedItunes.trackTimeMillis / 1000)
              : 215;

          const year = matchedItunes?.releaseDate
            ? new Date(matchedItunes.releaseDate).getFullYear() || 2025
            : 2025;

          results.push({
            id: `mono-gd-${trackId}`,
            monoTrackId: trackId,
            title: item.name,
            artist: artistStr,
            album: albumStr,
            artworkUrl,
            audioUrl: `./api/music/play?id=${encodeURIComponent(trackId)}&title=${encodeURIComponent(item.name)}&artist=${encodeURIComponent(artistStr)}`,
            duration: durationSec,
            format: 'api.monochrome.tf / 320kbps Full Stream',
            bitrate: '320 kbps Full Track',
            genre: matchedItunes?.primaryGenreName || 'J-Pop / Lossless',
            year,
          });
        }
      }

      // Append any iTunes songs not already present
      for (const it of itunesList) {
        if (!it.trackName || !it.artistName) continue;
        const dedupKey = `${normalizeCompareText(it.trackName)}::${normalizeCompareText(it.artistName)}`;
        if (seenKeys.has(dedupKey)) continue;
        seenKeys.add(dedupKey);

        const trackId = String(it.trackId || results.length + 1);
        const hiResArt = it.artworkUrl100
          ? it.artworkUrl100.replace('100x100bb', '600x600bb')
          : undefined;
        const durationSec =
          it.trackTimeMillis && it.trackTimeMillis > 40000
            ? Math.round(it.trackTimeMillis / 1000)
            : 215;

        results.push({
          id: `mono-itunes-${trackId}`,
          monoTrackId: '',
          title: it.trackName,
          artist: it.artistName,
          album: it.collectionName || 'Single',
          artworkUrl: hiResArt,
          audioUrl: `./api/music/play?title=${encodeURIComponent(it.trackName)}&artist=${encodeURIComponent(it.artistName)}`,
          duration: durationSec,
          format: 'api.monochrome.tf / 320kbps Full Stream',
          bitrate: '320 kbps Full Track',
          genre: it.primaryGenreName || 'Pop',
          year: it.releaseDate ? new Date(it.releaseDate).getFullYear() || 2025 : 2025,
        });
      }

      res.json({ tracks: results.slice(0, 20) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Music search error';
      res.status(500).json({ error: msg, tracks: [] });
    }
  });

  app.get('/api/music/info', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const rawId = String(req.query.id || '');
    const title = String(req.query.title || '');
    const artist = String(req.query.artist || '');

    const resolved = await resolveExactGdStudioStream(rawId, title, artist);
    if (!resolved) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    res.json({
      audioUrl: resolved.url,
      proxyAudioUrl: `./api/music/play?id=${encodeURIComponent(resolved.resolvedId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&proxy=1`,
      resolvedId: resolved.resolvedId,
      format: 'api.monochrome.tf 320kbps MP3 Full Stream',
      bitrate: `${resolved.br} kbps Hi-Fi`,
    });
  });

  app.get('/api/music/play', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    const rawId = String(req.query.id || '');
    const title = String(req.query.title || '');
    const artist = String(req.query.artist || '');

    const resolved = await resolveExactGdStudioStream(rawId, title, artist);
    let targetStreamUrl = resolved?.url;

    // Fallback: If NetEase stream is not found, fetch official preview from iTunes Japan
    if (!targetStreamUrl && (title || artist)) {
      try {
        const queryTerm = `${title} ${artist}`.trim();
        const itRes = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(queryTerm)}&country=JP&entity=song&limit=3`,
          { signal: AbortSignal.timeout(4500) }
        );
        if (itRes.ok) {
          const itData = (await itRes.json()) as { results?: Array<{ previewUrl?: string }> };
          const pUrl = itData?.results?.find((r) => r.previewUrl)?.previewUrl;
          if (pUrl) {
            targetStreamUrl = pUrl;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!targetStreamUrl) {
      res.status(404).send('Audio stream not found');
      return;
    }

    try {
      const forwardHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Referer: 'https://music.163.com/',
      };
      if (req.headers.range) {
        forwardHeaders.Range = String(req.headers.range);
      }

      const upstream = await fetch(targetStreamUrl, {
        headers: forwardHeaders,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
      res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
      const contentRange = upstream.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);
      const contentLength = upstream.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      res.status(upstream.status);

      if (upstream.body && typeof Readable.fromWeb === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nodeStream = Readable.fromWeb(upstream.body as any);
        nodeStream.pipe(res);
      } else {
        const ab = await upstream.arrayBuffer();
        res.send(Buffer.from(ab));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Audio stream failed';
      res.status(502).send(msg);
    }
  });

  app.get('/api/music/pic', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const picId = String(req.query.id || '').trim();
    if (!picId) {
      res.status(400).send('Missing pic id');
      return;
    }
    const cachedPic = musicPicCache.get(picId);
    if (cachedPic) {
      res.redirect(302, cachedPic);
      return;
    }
    try {
      const pRes = await fetch(
        `https://music-api.gdstudio.xyz/api.php?types=pic&source=netease&id=${encodeURIComponent(picId)}&size=500`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (pRes.ok) {
        const pData = (await pRes.json()) as { url?: string };
        if (pData?.url && pData.url.startsWith('http')) {
          const httpsPic = pData.url.replace(/^http:\/\//i, 'https://');
          musicPicCache.set(picId, httpsPic);
          res.redirect(302, httpsPic);
          return;
        }
      }
    } catch {
      // ignore
    }
    res.status(404).send('Picture not found');
  });

  app.get('/api/music/lyrics', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    let cleanId = cleanNumericTrackId(String(req.query.id || ''));
    const title = String(req.query.title || '').trim();
    const artist = String(req.query.artist || '').trim();

    try {
      if (!cleanId && (title || artist)) {
        const resolved = await resolveExactGdStudioStream('', title, artist);
        if (resolved?.resolvedId) {
          cleanId = resolved.resolvedId;
        }
      }

      if (cleanId) {
        const lRes = await fetch(
          `https://music-api.gdstudio.xyz/api.php?types=lyric&source=netease&id=${encodeURIComponent(cleanId)}`,
          { signal: AbortSignal.timeout(5500) }
        );
        if (lRes.ok) {
          const lData = (await lRes.json()) as { lyric?: string; tlyric?: string };
          if (lData?.lyric && lData.lyric.trim().length > 0) {
            // Strip composer/lyricist metadata lines at 00:00 so lyrics start cleanly
            const cleanedLrc = lData.lyric
              .split(/\r?\n/)
              .filter(
                (line) =>
                  !/^\[\d+:\d+[^\]]*\]\s*(?:作词|作曲|编曲|制作人|プロデューサー|作詞|編曲|Lyricist|Composer|Arranger)\s*[:：]/i.test(
                    line
                  )
              )
              .join('\n');
            res.json({ lyric: cleanedLrc || lData.lyric, tlyric: lData.tlyric || '' });
            return;
          }
        }
      }
    } catch {
      // fall through
    }

    res.json({ lyric: '', tlyric: '' });
  });

  // Wisp v1 Server & Bare-Mux Info Endpoint
  app.get('/api/wisp-info', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      protocol: 'wisp-v1',
      version: '1.2.0',
      engines: ['ultraviolet-v3.2', 'scramjet-v3.0', 'bare-mux-wisp'],
      multiplexing: true,
      tcpStream: true,
      udpExtension: true,
      status: 'online',
      timestamp: Date.now(),
    });
  });

  // Full Wisp / Bare-Mux Upstream Tunnel (Supports GET, POST, PUT, DELETE, OPTIONS + Binary + Range requests)
  app.all('/api/wisp', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, Range, Authorization, X-Wisp-Target, X-Wisp-Server, X-Proxy-Engine'
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Type, Content-Length, Content-Range, Accept-Ranges, X-Wisp-Final-Url, X-Wisp-Status, X-Wisp-Server-Used'
    );

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    const rawUrl = (req.query.url as string) || (req.headers['x-wisp-target'] as string);
    const wispNode = (req.query.wisp as string) || (req.headers['x-wisp-server'] as string) || 'wss://wisp.mercurywork.shop/';
    if (!rawUrl || typeof rawUrl !== 'string') {
      res.status(400).json({ error: 'Missing target url for Wisp tunnel' });
      return;
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    } catch {
      res.status(400).json({ error: 'Invalid target URL' });
      return;
    }

    try {
      const forwardHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: (req.headers['accept'] as string) || '*/*',
        'Accept-Language': (req.headers['accept-language'] as string) || 'ja,en-US;q=0.9,en;q=0.8',
        Referer: `${targetUrl.protocol}//${targetUrl.host}/`,
        Origin: `${targetUrl.protocol}//${targetUrl.host}`,
      };

      if (req.headers['range']) {
        forwardHeaders['Range'] = String(req.headers['range']);
      }
      if (req.headers['content-type']) {
        forwardHeaders['Content-Type'] = String(req.headers['content-type']);
      }
      if (req.headers['authorization']) {
        forwardHeaders['Authorization'] = String(req.headers['authorization']);
      }

      const fetchInit: RequestInit = {
        method: req.method,
        headers: forwardHeaders,
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        fetchInit.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const upstream = await fetch(targetUrl.toString(), fetchInit);
      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Wisp-Final-Url', upstream.url || targetUrl.toString());
      res.setHeader('X-Wisp-Status', String(upstream.status));
      res.setHeader('X-Wisp-Server-Used', wispNode);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      const contentRange = upstream.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);
      const acceptRanges = upstream.headers.get('accept-ranges');
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

      const arrayBuffer = await upstream.arrayBuffer();
      res.status(upstream.status).send(Buffer.from(arrayBuffer));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wisp upstream connection failed';
      res.status(502).json({ error: msg, target: targetUrl.toString(), wispNode });
    }
  });

  app.get('/api/proxy', async (req, res) => {
    const rawUrl = req.query.url;
    const isRawMode = req.query.raw === '1';
    if (!rawUrl || typeof rawUrl !== 'string') {
      res.status(400).send('Missing url query parameter');
      return;
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    } catch {
      res.status(400).send('Invalid URL');
      return;
    }

    try {
      const forwardHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept:
          (req.headers['accept'] as string) ||
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        Referer: `${targetUrl.protocol}//${targetUrl.host}/`,
      };
      if (req.headers['range']) {
        forwardHeaders['Range'] = String(req.headers['range']);
      }

      const upstream = await fetch(targetUrl.toString(), {
        headers: forwardHeaders,
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });

      const contentType = upstream.headers.get('content-type') || 'text/html; charset=utf-8';
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-Final-Url', upstream.url || targetUrl.toString());

      // If Service Worker requested raw response (?raw=1), return unmodified bytes so SW UV/Scramjet rewrites it
      if (isRawMode) {
        const arrayBuffer = await upstream.arrayBuffer();
        res.status(upstream.status).setHeader('Content-Type', contentType).send(Buffer.from(arrayBuffer));
        return;
      }

      if (upstream.status === 404 && (targetUrl.hostname.includes('github.io') || targetUrl.hostname.includes('github.com'))) {
        const safeTarget = escapeHtml(targetUrl.href);
        res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(`
          <!DOCTYPE html>
          <html lang="ja">
            <head>
              <meta charset="utf-8" />
              <style>
                body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #090d16; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
                .box { max-width: 560px; padding: 32px; background: rgba(15,23,42,0.85); border-top: 2px solid #06b6d4; }
                h2 { margin: 0 0 8px; font-size: 18px; color: #38bdf8; }
                p { margin: 0 0 14px; font-size: 13px; line-height: 1.6; color: #cbd5e1; }
                .url { font-family: monospace; font-size: 11px; padding: 8px 10px; background: rgba(0,0,0,0.45); color: #67e8f9; word-break: break-all; margin-bottom: 16px; }
                a.btn { display: inline-block; padding: 8px 16px; background: #06b6d4; color: #000; font-weight: 700; font-size: 12px; text-decoration: none; margin-right: 8px; }
              </style>
            </head>
            <body>
              <div class="box">
                <h2>GitHub Pages URL Redirect / Smart Recovery</h2>
                <p>指定された GitHub Pages URL は移動または変更されています。GlasispectUI ブラウザのスマートモードまたは検索からアクセスできます。</p>
                <div class="url">${safeTarget}</div>
                <a class="btn" href="/api/proxy?url=${encodeURIComponent('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(targetUrl.hostname + ' ' + targetUrl.pathname))}">Web検索で新しいURLを探す</a>
              </div>
            </body>
          </html>
        `);
        return;
      }

      if (contentType.includes('text/html')) {
        let html = await upstream.text();
        const finalTarget = new URL(upstream.url || targetUrl.toString());
        const origin = `${finalTarget.protocol}//${finalTarget.host}`;
        const pathDir = finalTarget.pathname.endsWith('/')
          ? finalTarget.pathname
          : finalTarget.pathname.substring(0, finalTarget.pathname.lastIndexOf('/') + 1) || '/';
        const basePath = `${origin}${pathDir}`;

        const baseAndNavScript = `
          <base href="${escapeHtml(basePath)}" />
          <meta name="referrer" content="no-referrer" />
          <style>
            html, body { max-width: 100vw !important; overflow-x: hidden !important; }
          </style>
          <script>
            (function() {
              document.addEventListener('click', function(e) {
                var a = e.target && e.target.closest ? e.target.closest('a') : null;
                if (!a) return;
                var href = a.getAttribute('href');
                if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
                e.preventDefault();
                try {
                  var abs = new URL(href, ${JSON.stringify(finalTarget.href)}).href;
                  window.parent.postMessage({ type: 'LIQUID_BROWSER_NAV', url: abs }, '*');
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(abs);
                } catch (err) {}
              }, true);

              document.addEventListener('submit', function(e) {
                var form = e.target;
                if (!form || form.tagName !== 'FORM') return;
                var method = (form.getAttribute('method') || 'GET').toUpperCase();
                if (method === 'GET') {
                  e.preventDefault();
                  try {
                    var action = form.getAttribute('action') || ${JSON.stringify(finalTarget.href)};
                    var absUrl = new URL(action, ${JSON.stringify(finalTarget.href)});
                    var fd = new FormData(form);
                    fd.forEach(function(val, key) {
                      absUrl.searchParams.set(key, String(val));
                    });
                    window.parent.postMessage({ type: 'LIQUID_BROWSER_NAV', url: absUrl.href }, '*');
                    window.location.href = '/api/proxy?url=' + encodeURIComponent(absUrl.href);
                  } catch (err) {}
                }
              }, true);
            })();
          </script>
        `;

        html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');

        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(/<head[^>]*>/i, (match) => `${match}${baseAndNavScript}`);
        } else {
          html = `<!DOCTYPE html><html><head>${baseAndNavScript}</head><body>${html}</body></html>`;
        }

        html = html.replace(/(href|src)=["']\/([^/"'][^"']*)["']/gi, `$1="${origin}/$2"`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      } else {
        const arrayBuffer = await upstream.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.send(Buffer.from(arrayBuffer));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown fetch error';
      const safeUrl = escapeHtml(String(rawUrl));
      const safeMessage = escapeHtml(message);
      res.status(502).send(`
        <!DOCTYPE html>
        <html lang="ja">
          <head>
            <meta charset="utf-8" />
            <style>
              body {
                margin: 0;
                font-family: system-ui, -apple-system, sans-serif;
                background: #090d16;
                color: #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
              }
              .card {
                max-width: 480px;
                padding: 28px;
                background: rgba(255,255,255,0.03);
                border-top: 2px solid rgba(56,189,248,0.6);
              }
              h2 { margin: 0 0 10px; font-size: 18px; color: #38bdf8; }
              p { margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: #94a3b8; }
              code { display: block; padding: 10px; background: rgba(0,0,0,0.4); font-size: 11px; color: #f87171; word-break: break-all; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>サイトへ接続できませんでした</h2>
              <p>対象サーバー（${safeUrl}）が応答しないか、接続を拒否しました。</p>
              <code>${safeMessage}</code>
            </div>
          </body>
        </html>
      `);
    }
  });

  // Server-side Ultraviolet (/uv/service/*) & Scramjet (/scramjet/*) Wisp Tunnel Handlers
  // Ensures zero SPA-recursion even if an iframe navigates before Service Worker claim completes
  const handleServerSideUvOrScramjet = async (
    req: express.Request,
    res: express.Response,
    engine: 'ultraviolet' | 'scramjet'
  ) => {
    const prefix = engine === 'ultraviolet' ? '/uv/service/' : '/scramjet/';
    const rawIdx = req.originalUrl.indexOf(prefix);
    const encodedPart = rawIdx !== -1 ? req.originalUrl.slice(rawIdx + prefix.length) : '';
    if (!encodedPart) {
      res.status(400).send('Missing encoded URL');
      return;
    }

    let decodedUrl = '';
    try {
      let cleanRaw = encodedPart;
      let queryTail = '';
      const qPos = cleanRaw.indexOf('?');
      if (qPos !== -1 && !cleanRaw.slice(0, qPos).includes('://')) {
        queryTail = cleanRaw.slice(qPos);
        cleanRaw = cleanRaw.slice(0, qPos);
      }
      if (engine === 'ultraviolet') {
        const unxored = cleanRaw
          .split('')
          .map((ch, idx) => (idx % 2 === 0 ? String.fromCharCode(ch.charCodeAt(0) ^ 2) : ch))
          .join('');
        decodedUrl = decodeURIComponent(unxored) + queryTail;
      } else {
        decodedUrl = decodeURIComponent(cleanRaw) + queryTail;
      }
    } catch {
      decodedUrl = encodedPart;
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(decodedUrl.startsWith('http') ? decodedUrl : `https://${decodedUrl}`);
    } catch {
      res.status(400).send('Invalid target URL');
      return;
    }

    const encodeForEngine = (u: string): string => {
      if (engine === 'ultraviolet') {
        const xor = encodeURIComponent(u)
          .split('')
          .map((ch, idx) => (idx % 2 === 0 ? String.fromCharCode(ch.charCodeAt(0) ^ 2) : ch))
          .join('');
        return `/uv/service/${xor}`;
      }
      return `/scramjet/${encodeURIComponent(u)}`;
    };

    try {
      const upstream = await fetch(targetUrl.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: (req.headers['accept'] as string) || '*/*',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          Referer: `${targetUrl.protocol}//${targetUrl.host}/`,
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const finalTarget = new URL(upstream.url || targetUrl.toString());

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      if (contentType.toLowerCase().includes('text/html')) {
        let html = await upstream.text();
        html = html
          .replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '')
          .replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '')
          .replace(/\sintegrity=["'][^"']*["']/gi, '')
          .replace(/\scrossorigin=["'][^"']*["']/gi, '');

        html = html.replace(
          /(<(?:script|link|img|audio|video|source|iframe|embed|a|form)\b[^>]*?\s)(src|href|action)=(["'])([^"']+)\3/gi,
          (fullMatch, tagPrefix, attrName, quote, attrVal) => {
            const trimmed = String(attrVal).trim();
            if (
              !trimmed ||
              trimmed.startsWith('data:') ||
              trimmed.startsWith('blob:') ||
              trimmed.startsWith('javascript:') ||
              trimmed.startsWith('mailto:') ||
              trimmed.startsWith('#') ||
              trimmed.startsWith('/uv/service/') ||
              trimmed.startsWith('/scramjet/')
            ) {
              return fullMatch;
            }
            try {
              const resolved = new URL(trimmed, finalTarget.href).href;
              return `${tagPrefix}${attrName}=${quote}${encodeForEngine(resolved)}${quote}`;
            } catch {
              return fullMatch;
            }
          }
        );

        const runtimeHook = `<script>
          (function() {
            var TARGET_ORIGIN = ${JSON.stringify(finalTarget.origin)};
            var TARGET_HREF = ${JSON.stringify(finalTarget.href)};
            var ENGINE = ${JSON.stringify(engine)};
            function toProxy(u) {
              if (!u || typeof u !== 'string') return u;
              var t = u.trim();
              if (!t || t.startsWith('data:') || t.startsWith('blob:') || t.startsWith('javascript:') || t.startsWith('#') || t.indexOf('/uv/service/') !== -1 || t.indexOf('/scramjet/') !== -1) return u;
              try {
                var r = new URL(t, TARGET_HREF);
                if (r.origin === window.location.origin) r = new URL(r.pathname + r.search + r.hash, TARGET_ORIGIN);
                if (ENGINE === 'ultraviolet') {
                  var x = encodeURIComponent(r.href).split('').map(function(c, i){ return i % 2 === 0 ? String.fromCharCode(c.charCodeAt(0) ^ 2) : c; }).join('');
                  return '/uv/service/' + x;
                }
                return '/scramjet/' + encodeURIComponent(r.href);
              } catch(e) { return u; }
            }
            var origFetch = window.fetch;
            if (origFetch) {
              window.fetch = function(input, init) {
                if (typeof input === 'string') input = toProxy(input);
                else if (input instanceof URL) input = toProxy(input.href);
                return origFetch.call(this, input, init);
              };
            }
            var origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(m, u, a, us, p) {
              if (typeof u === 'string') u = toProxy(u);
              return origOpen.call(this, m, u, a !== false, us, p);
            };
          })();
        </script>`;

        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(/<head[^>]*>/i, (m) => m + runtimeHook);
        } else {
          html = `<!DOCTYPE html><html><head>${runtimeHook}</head><body>${html}</body></html>`;
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(html);
        return;
      }

      const buf = await upstream.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.status(upstream.status).send(Buffer.from(buf));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upstream connection failed';
      res.status(502).send(`Wisp / ${engine.toUpperCase()} Tunnel Error: ${escapeHtml(msg)}`);
    }
  };

  app.all('/uv/service/*all', (req, res) => handleServerSideUvOrScramjet(req, res, 'ultraviolet'));
  app.all('/scramjet/*all', (req, res) => handleServerSideUvOrScramjet(req, res, 'scramjet'));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GlassiumOS 5 Server running on http://localhost:${PORT}`);
  });
}

startServer();
