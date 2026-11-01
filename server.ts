import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

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
  const PORT = 3000;

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

  app.get('/api/proxy', async (req, res) => {
    const rawUrl = req.query.url;
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
      const upstream = await fetch(targetUrl.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
      });

      const contentType = upstream.headers.get('content-type') || 'text/html; charset=utf-8';
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (contentType.includes('text/html')) {
        let html = await upstream.text();
        const origin = `${targetUrl.protocol}//${targetUrl.host}`;
        const basePath = targetUrl.href.substring(0, targetUrl.href.lastIndexOf('/') + 1);

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
                  var abs = new URL(href, ${JSON.stringify(targetUrl.href)}).href;
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
                    var action = form.getAttribute('action') || ${JSON.stringify(targetUrl.href)};
                    var absUrl = new URL(action, ${JSON.stringify(targetUrl.href)});
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

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
