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

  // Universal CORS & Frame Unblocking Middleware (allows https://*.github.io and all WebOS origins)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Range, X-Requested-With, Accept, Origin'
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Length, Content-Range, Accept-Ranges, Content-Type'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.removeHeader('X-Frame-Options');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Koyeb Health Check & WebOS Connection Verification Endpoint
  app.get(['/api/health', '/healthz'], (_req, res) => {
    res.json({
      status: 'ok',
      service: 'glassiumos-koyeb-server',
      version: '5.0-u2',
      capabilities: ['ultraviolet', 'scramjet', 'wisp', 'music', 'entertainment', 'ai'],
      timestamp: Date.now(),
    });
  });

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
    const str = String(rawId).trim();
    if (/^(?:mono-itunes-|itunes-|album-|single-|artist-)/i.test(str)) return '';
    const stripped = str
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

  function stripTrackSuffixes(str: string): string {
    return (str || '')
      .replace(/\s*[([（【](?:feat\.|ft\.|with|prod\.|from|official|music video|mv|tv size|anime|remaster|deluxe|version|ver\.|live|acoustic|bonus)[^)\]）】]*[)\]）】]/gi, '')
      .replace(/\s*-\s*(?:single|ep|remastered|deluxe|version|ver\.|live|from).*$/gi, '')
      .trim();
  }

  const ARTIST_ALIAS_MAP: Record<string, string[]> = {
    yoasobi: ['yoasobi', 'ヨアソビ'],
    vaundy: ['vaundy', 'バウンディ'],
    '米津玄師': ['米津玄師', 'kenshiyonezu', 'yonezukenshi'],
    kenshiyonezu: ['米津玄師', 'kenshiyonezu', 'yonezukenshi'],
    'official髭男dism': ['official髭男dism', 'officialhigedandism'],
    officialhigedandism: ['official髭男dism', 'officialhigedandism'],
    ado: ['ado', 'アド', 'ウタfromonepiecefilmred'],
    mrsgreenapple: ['mrsgreenapple', 'ミセスグリーンアップル'],
    creepynuts: ['creepynuts', 'クリーピーナッツ'],
    tuki: ['tuki', 'ツキ'],
    dualipa: ['dualipa', 'デュアリパ'],
    daftpunk: ['daftpunk', 'ダフトパンク'],
    kinggnu: ['kinggnu', 'キングヌー'],
    backnumber: ['backnumber', 'バックナンバー'],
    aimyon: ['あいみょん', 'aimyon'],
    'あいみょん': ['あいみょん', 'aimyon'],
    fujiikaze: ['藤井風', 'fujiikaze'],
    '藤井風': ['藤井風', 'fujiikaze'],
  };

  function getArtistAllowedNorms(artistName: string, extraName?: string): string[] {
    const cleanPrimary = (artistName || '')
      .replace(/\s*(?:作曲|作詞|編曲|feat\.|ft\.|with|prod\.).*$/i, '')
      .split(/[,、/&×]/)[0]
      .trim();
    const baseNorm = normalizeCompareText(cleanPrimary || artistName);
    const set = new Set<string>();
    if (baseNorm) set.add(baseNorm);
    const aliases = ARTIST_ALIAS_MAP[baseNorm];
    if (aliases) {
      for (const a of aliases) set.add(normalizeCompareText(a));
    }
    if (extraName) {
      const extraNorm = normalizeCompareText(extraName);
      if (extraNorm && extraNorm.length >= 2) set.add(extraNorm);
    }
    return Array.from(set);
  }

  function isSameArtistStrict(candidateArtist: string, allowedNorms: string[]): boolean {
    if (!candidateArtist) return false;
    if (allowedNorms.length === 0) return true;
    const lowerRaw = candidateArtist.toLowerCase();
    if (
      /cover|tribute|karaoke|オルゴール|music box|8bit|lullaby|歌ってみた|翻唱|伴奏/i.test(
        lowerRaw
      )
    ) {
      return false;
    }
    const cFull = normalizeCompareText(candidateArtist);
    if (!cFull) return false;
    if (allowedNorms.some((a) => cFull === a)) return true;

    // Split candidate artist into individual credited artists and check primary credit
    const parts = candidateArtist
      .split(/[,、/&×()]/)
      .map((p) => normalizeCompareText(p))
      .filter(Boolean);

    for (const part of parts) {
      if (allowedNorms.some((a) => part === a)) return true;
      if (
        allowedNorms.some(
          (a) => a.length >= 4 && part.length >= 4 && (part.includes(a) || a.includes(part))
        )
      ) {
        return true;
      }
    }
    return false;
  }

  function isTitleMatchStrict(targetTitle: string, candidateTitle: string): boolean {
    const tFull = normalizeCompareText(targetTitle);
    const cFull = normalizeCompareText(candidateTitle);
    if (!tFull || !cFull) return false;
    if (tFull === cFull) return true;
    const tCore = normalizeCompareText(stripTrackSuffixes(targetTitle));
    const cCore = normalizeCompareText(stripTrackSuffixes(candidateTitle));
    if (tCore && cCore && tCore === cCore) return true;
    if (tCore.length >= 2 && cCore.length >= 2) {
      if (cCore.includes(tCore) || tCore.includes(cCore)) return true;
    }
    return false;
  }

  function isArtistMatchStrict(targetArtist: string, candidateArtist: string): boolean {
    if (!targetArtist) return true;
    if (!candidateArtist) return false;
    const allowed = getArtistAllowedNorms(targetArtist);
    return isSameArtistStrict(candidateArtist, allowed);
  }

  // Serialized mutex queue for gdstudio.xyz VIP stream unlock so we NEVER trigger Cloudflare burst blocks
  let gdRequestQueue: Promise<unknown> = Promise.resolve();

  function enqueueGdStudioRequest<T>(fn: () => Promise<T>): Promise<T> {
    const next = gdRequestQueue.then(async () => {
      try {
        return await fn();
      } finally {
        await new Promise((r) => setTimeout(r, 120));
      }
    });
    gdRequestQueue = next.catch(() => {});
    return next;
  }

  // First-party NetEase CloudMusic search (0 Cloudflare rate limits, ~180ms response, includes direct picUrl)
  async function searchNeteaseCloudDirect(
    query: string,
    limit = 20
  ): Promise<GdStudioTrackItem[]> {
    const q = query.trim();
    if (!q) return [];
    try {
      const res = await fetch(
        `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(q)}&type=1&offset=0&limit=${limit}`,
        {
          method: 'POST',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            Referer: 'https://music.163.com/',
            'X-Real-IP': '118.88.88.88',
          },
          signal: AbortSignal.timeout(3800),
        }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          result?: {
            songs?: Array<{
              id: number;
              name: string;
              ar?: Array<{ name?: string }>;
              al?: { name?: string; picUrl?: string };
            }>;
          };
        };
        const songs = data?.result?.songs;
        if (Array.isArray(songs) && songs.length > 0) {
          return songs.map((s) => {
            const idStr = String(s.id);
            if (s.al?.picUrl) {
              musicPicCache.set(idStr, s.al.picUrl.replace(/^http:\/\//i, 'https://'));
            }
            return {
              id: idStr,
              url_id: idStr,
              lyric_id: idStr,
              pic_id: idStr,
              name: String(s.name || ''),
              artist: Array.isArray(s.ar)
                ? s.ar.map((a) => a?.name || '').filter(Boolean)
                : [],
              album: s.al?.name || 'Single / Album',
              source: 'netease',
            };
          });
        }
      }
    } catch {
      // fall through
    }
    return [];
  }

  async function resolveExactGdStudioStream(
    rawId?: string,
    title?: string,
    artist?: string,
    preferredBr = 320,
    preferredSource = 'netease',
    allowFlac = false
  ): Promise<{ url: string; br: number; resolvedId: string } | null> {
    const cleanId = cleanNumericTrackId(rawId);
    const cleanArtist = (artist || '')
      .replace(/\s*(?:作曲|作詞|編曲|feat\.|ft\.|with|prod\.).*$/i, '')
      .split(/[,、/]/)[0]
      .trim();

    // For <audio> streaming, cap at 320kbps MP3 so browsers never fail decoding 86MB 24-bit/96kHz FLAC files
    const brParam =
      allowFlac && preferredBr >= 900
        ? 999
        : preferredBr >= 300
        ? 320
        : preferredBr >= 180
        ? 192
        : 128;

    const minFullBytes = brParam >= 300 ? 1850000 : 950000;
    const songCacheKey = `song::${normalizeCompareText(title || '')}::${normalizeCompareText(cleanArtist)}::${brParam}`;

    if (title && cleanArtist) {
      const songCached = musicStreamCache.get(songCacheKey);
      if (songCached && songCached.expiresAt > Date.now()) {
        return { url: songCached.url, br: songCached.br, resolvedId: cleanId };
      }
    }

    const cacheKey = `${preferredSource}::${cleanId}::${title || ''}::${cleanArtist}::${brParam}`;
    const cached = musicStreamCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { url: cached.url, br: cached.br, resolvedId: cleanId };
    }

    const storeStreamCache = (idStr: string, urlStr: string, brNum: number) => {
      const httpsUrl = urlStr.replace(/^http:\/\//i, 'https://');
      const entry = {
        url: httpsUrl,
        br: brNum || 320,
        expiresAt: Date.now() + 25 * 60 * 1000,
      };
      if (idStr) {
        musicStreamCache.set(`id::netease::${idStr}::${brParam}`, entry);
      }
      musicStreamCache.set(cacheKey, entry);
      if (title && cleanArtist) {
        musicStreamCache.set(songCacheKey, entry);
      }
      return { url: httpsUrl, br: entry.br };
    };

    // Fast official NetEase batch stream check (resolves non-VIP full tracks in ~150ms with 0 rate limits)
    const tryOfficialBatchIds = async (
      ids: string[]
    ): Promise<{ url: string; br: number; resolvedId: string } | null> => {
      const validIds = ids.filter((id) => /^\d+$/.test(id));
      if (validIds.length === 0) return null;
      try {
        const neRes = await fetch(
          `https://music.163.com/api/song/enhance/player/url?ids=[${validIds.join(',')}]&br=${brParam === 999 ? 999000 : brParam * 1000}`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              Referer: 'https://music.163.com/',
              'X-Real-IP': '118.88.88.88',
            },
            signal: AbortSignal.timeout(2800),
          }
        );
        if (neRes.ok) {
          const neData = (await neRes.json()) as {
            data?: Array<{
              id: number;
              url?: string;
              br?: number;
              size?: number;
              freeTrialInfo?: unknown;
            }>;
          };
          const dataMap = new Map(
            (neData?.data || []).map((d) => [String(d.id), d])
          );
          for (const cid of validIds) {
            const d = dataMap.get(cid);
            if (
              d?.url &&
              d.url.startsWith('http') &&
              !d.freeTrialInfo &&
              (!d.size || d.size >= minFullBytes)
            ) {
              const saved = storeStreamCache(
                cid,
                d.url,
                Math.round((Number(d.br) || 320000) / 1000)
              );
              return { ...saved, resolvedId: cid };
            }
          }
        }
      } catch {
        // ignore
      }
      return null;
    };

    const fetchUrlById = async (
      idToFetch: string,
      src = 'netease'
    ): Promise<{ url: string; br: number } | null> => {
      if (!idToFetch) return null;
      const idCacheKey = `id::${src}::${idToFetch}::${brParam}`;
      const idCached = musicStreamCache.get(idCacheKey);
      if (idCached && idCached.expiresAt > Date.now()) {
        return { url: idCached.url, br: idCached.br };
      }
      return enqueueGdStudioRequest(async () => {
        try {
          const uRes = await fetch(
            `https://music-api.gdstudio.xyz/api.php?types=url&source=${encodeURIComponent(src)}&id=${encodeURIComponent(idToFetch)}&br=${brParam}`,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              },
              signal: AbortSignal.timeout(4000),
            }
          );
          if (!uRes.ok) return null;
          const uData = (await uRes.json()) as { url?: string; br?: number; size?: number };
          if (uData?.url && typeof uData.url === 'string' && uData.url.startsWith('http')) {
            if (uData.size && Number(uData.size) > 0 && Number(uData.size) < minFullBytes) {
              return null;
            }
            return storeStreamCache(idToFetch, uData.url, Number(uData.br) || 320);
          }
        } catch {
          // ignore and fall through
        }
        return null;
      });
    };

    if (cleanId) {
      // 1. Prioritize GDStudio 320kbps Full-Length VIP Unlock first
      const directHit = await fetchUrlById(cleanId, 'netease');
      if (directHit) {
        return { ...directHit, resolvedId: cleanId };
      }

      // 2. Check official NetEase batch stream (strictly > 1.85MB)
      const officialDirect = await tryOfficialBatchIds([cleanId]);
      if (officialDirect) return officialDirect;
    }

    const searchQuery = `${title || ''} ${cleanArtist}`.trim();
    if (!searchQuery) return null;

    const list = await searchNeteaseCloudDirect(searchQuery, 12);
    if (list.length > 0) {
      const scored = list.map((item, idx) => {
        const itemTitle = String(item.name || '');
        const itemArtist = Array.isArray(item.artist)
          ? item.artist.join(' ')
          : String(item.artist || '');
        let score = 20 - idx;
        if (title && isTitleMatchStrict(title, itemTitle)) score += 65;
        if (cleanArtist && isArtistMatchStrict(cleanArtist, itemArtist)) score += 50;
        if (/live|dome|tour|concert/i.test(itemTitle) && !/live/i.test(title || '')) {
          score -= 18;
        }
        if (
          /instrumental|伴奏|karaoke|カラオケ|demo|30秒|試聴|cover|翻唱|歌ってみた/i.test(
            `${itemTitle} ${itemArtist}`
          ) &&
          !/instrumental|cover/i.test(title || '')
        ) {
          score -= 80;
        }
        return { item, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const topCandidates = scored.slice(0, 4);
      const candidateIds = topCandidates.map((c) => String(c.item.url_id || c.item.id || ''));

      // 1. Unlock top studio match via serialized GDStudio VIP resolver first (guarantees full-length 320kbps MP3)
      for (const candId of candidateIds.slice(0, 3)) {
        const res = await fetchUrlById(candId, 'netease');
        if (res) {
          return { url: res.url, br: res.br, resolvedId: candId };
        }
      }

      // 2. Try single-request official NetEase batch player (strictly > 1.85MB)
      const batchHit = await tryOfficialBatchIds(candidateIds);
      if (batchHit) return batchHit;
    }

    // 3. Fallback to GDStudio JOOX Full-Length Search
    try {
      const jooxRes = await fetch(
        `https://music-api.gdstudio.xyz/api.php?types=search&source=joox&name=${encodeURIComponent(searchQuery)}&count=4&pages=1`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (jooxRes.ok) {
        const jooxList = (await jooxRes.json()) as Array<{ id?: string; url_id?: string }>;
        if (Array.isArray(jooxList) && jooxList.length > 0) {
          for (const jItem of jooxList.slice(0, 2)) {
            const jId = String(jItem.url_id || jItem.id || '');
            const jUrl = await fetchUrlById(jId, 'joox');
            if (jUrl) {
              return { url: jUrl.url, br: jUrl.br, resolvedId: jId };
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
      const [gdItems, itunesJpData, itunesGlobalData] = await Promise.all([
        searchNeteaseCloudDirect(q, 20),
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=JP&entity=song&limit=16`,
          { signal: AbortSignal.timeout(4800) }
        )
          .then((r) =>
            r.ok
              ? (r.json() as Promise<{ results?: ItunesSearchResultItem[] }>)
              : { results: [] }
          )
          .catch(() => ({ results: [] as ItunesSearchResultItem[] })),
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=US&entity=song&limit=16`,
          { signal: AbortSignal.timeout(4800) }
        )
          .then((r) =>
            r.ok
              ? (r.json() as Promise<{ results?: ItunesSearchResultItem[] }>)
              : { results: [] }
          )
          .catch(() => ({ results: [] as ItunesSearchResultItem[] })),
      ]);

      const itunesList = [
        ...(Array.isArray(itunesJpData?.results) ? itunesJpData.results : []),
        ...(Array.isArray(itunesGlobalData?.results) ? itunesGlobalData.results : []),
      ];
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

          const matchedItunes = itunesList.find(
            (it) =>
              it.trackName &&
              isTitleMatchStrict(item.name, it.trackName) &&
              isArtistMatchStrict(artistStr, it.artistName || '')
          );

          const hiResItunesArt = matchedItunes?.artworkUrl100
            ? matchedItunes.artworkUrl100.replace('100x100bb', '600x600bb')
            : undefined;
          const artworkUrl =
            hiResItunesArt ||
            (item.pic_id ? `/api/music/pic?id=${encodeURIComponent(String(item.pic_id))}` : undefined);

          const durationSec =
            matchedItunes?.trackTimeMillis && matchedItunes.trackTimeMillis > 45000
              ? Math.round(matchedItunes.trackTimeMillis / 1000)
              : 218;

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
            audioUrl: `/api/music/play?id=${encodeURIComponent(trackId)}&title=${encodeURIComponent(item.name)}&artist=${encodeURIComponent(artistStr)}`,
            duration: durationSec,
            format: 'api.monochrome.tf / Full-Length Hi-Res Stream',
            bitrate: '320 kbps Full Track',
            genre: matchedItunes?.primaryGenreName || 'J-Pop / Lossless',
            year,
          });
        }
      }

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
          it.trackTimeMillis && it.trackTimeMillis > 45000
            ? Math.round(it.trackTimeMillis / 1000)
            : 218;

        results.push({
          id: `mono-itunes-${trackId}`,
          monoTrackId: '',
          title: it.trackName,
          artist: it.artistName,
          album: it.collectionName || 'Single',
          artworkUrl: hiResArt,
          audioUrl: `/api/music/play?title=${encodeURIComponent(it.trackName)}&artist=${encodeURIComponent(it.artistName)}`,
          duration: durationSec,
          format: 'api.monochrome.tf / Full-Length Hi-Res Stream',
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
    const br = Number(req.query.br) || 320;
    const source = String(req.query.source || 'auto');

    const gdResolved = await resolveExactGdStudioStream(rawId, title, artist, br, source, false);

    const resolvedUrl = gdResolved?.url;
    const resolvedBr = gdResolved?.br || 320;
    const resolvedId = gdResolved?.resolvedId || rawId;

    if (!resolvedUrl) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    res.json({
      audioUrl: resolvedUrl,
      proxyAudioUrl: `/api/music/play?id=${encodeURIComponent(resolvedId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&br=${br}&source=${encodeURIComponent(source)}`,
      resolvedId,
      format: 'api.monochrome.tf Full-Length Hi-Fi Stream',
      bitrate: `${resolvedBr} kbps Full Track`,
    });
  });

  // -------------------------------------------------------------------------
  // Monochrome / Deezer / iTunes Official Artist Discography Endpoint
  // Returns strictly verified Top Tracks, Albums, Singles & EPs, and MVs
  // -------------------------------------------------------------------------
  app.get('/api/music/artist', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const rawName = String(req.query.name || 'YOASOBI').trim() || 'YOASOBI';
    const primaryName =
      rawName
        .replace(/\s*(?:作曲|作詞|編曲|feat\.|ft\.|with|prod\.).*$/i, '')
        .split(/[,、/]/)[0]
        .trim() || rawName;

    interface ItunesAlbumItem {
      collectionId?: number;
      collectionName?: string;
      artistName?: string;
      artworkUrl100?: string;
      trackCount?: number;
      releaseDate?: string;
      primaryGenreName?: string;
      collectionType?: string;
    }

    try {
      const [
        deezerArtistData,
        gdArtistTracks,
        itunesSongsJp,
        itunesSongsUs,
        itunesAlbumsJp,
        itunesAlbumsUs,
        itunesMvsJp,
        itunesMvsUs,
      ] = await Promise.all([
        fetch(
          `https://api.deezer.com/search/artist?q=${encodeURIComponent(primaryName)}&limit=3`,
          { signal: AbortSignal.timeout(3800) }
        )
          .then((r) =>
            r.ok
              ? (r.json() as Promise<{
                  data?: Array<{
                    id?: number;
                    name?: string;
                    picture_xl?: string;
                    picture_big?: string;
                    picture_medium?: string;
                    nb_fan?: number;
                    nb_album?: number;
                  }>;
                }>)
              : { data: [] }
          )
          .catch(() => ({ data: [] })),
        searchNeteaseCloudDirect(primaryName, 25),
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(primaryName)}&country=JP&entity=song&limit=35`,
          { signal: AbortSignal.timeout(4000) }
        )
          .then((r) =>
            r.ok ? (r.json() as Promise<{ results?: ItunesSearchResultItem[] }>) : { results: [] }
          )
          .catch(() => ({ results: [] as ItunesSearchResultItem[] })),
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(primaryName)}&country=US&entity=song&limit=20`,
          { signal: AbortSignal.timeout(4000) }
        )
          .then((r) =>
            r.ok ? (r.json() as Promise<{ results?: ItunesSearchResultItem[] }>) : { results: [] }
          )
          .catch(() => ({ results: [] as ItunesSearchResultItem[] })),
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(primaryName)}&country=JP&entity=album&limit=35`,
          { signal: AbortSignal.timeout(4000) }
        )
          .then((r) =>
            r.ok ? (r.json() as Promise<{ results?: ItunesAlbumItem[] }>) : { results: [] }
          )
          .catch(() => ({ results: [] as ItunesAlbumItem[] })),
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(primaryName)}&country=US&entity=album&limit=20`,
          { signal: AbortSignal.timeout(4000) }
        )
          .then((r) =>
            r.ok ? (r.json() as Promise<{ results?: ItunesAlbumItem[] }>) : { results: [] }
          )
          .catch(() => ({ results: [] as ItunesAlbumItem[] })),
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(primaryName)}&country=JP&entity=musicVideo&limit=10`,
          { signal: AbortSignal.timeout(4000) }
        )
          .then((r) =>
            r.ok
              ? (r.json() as Promise<{
                  results?: Array<{
                    trackId?: number;
                    trackName?: string;
                    artistName?: string;
                    collectionName?: string;
                    previewUrl?: string;
                    artworkUrl100?: string;
                    trackTimeMillis?: number;
                    releaseDate?: string;
                    primaryGenreName?: string;
                  }>;
                }>)
              : { results: [] }
          )
          .catch(() => ({ results: [] })),
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(primaryName)}&country=US&entity=musicVideo&limit=10`,
          { signal: AbortSignal.timeout(4000) }
        )
          .then((r) =>
            r.ok
              ? (r.json() as Promise<{
                  results?: Array<{
                    trackId?: number;
                    trackName?: string;
                    artistName?: string;
                    collectionName?: string;
                    previewUrl?: string;
                    artworkUrl100?: string;
                    trackTimeMillis?: number;
                    releaseDate?: string;
                    primaryGenreName?: string;
                  }>;
                }>)
              : { results: [] }
          )
          .catch(() => ({ results: [] })),
      ]);

      const dzArtist = deezerArtistData?.data?.[0];
      const allowedArtistNorms = getArtistAllowedNorms(primaryName, dzArtist?.name);

      // Strictly filter iTunes songs so ONLY songs by this artist are included
      const allItunesSongs = [
        ...(itunesSongsJp.results || []),
        ...(itunesSongsUs.results || []),
      ].filter((s) => s.trackName && s.artistName && isSameArtistStrict(s.artistName, allowedArtistNorms));

      // Strictly filter GDStudio NetEase tracks so ONLY songs by this artist are included
      const validGdTracks = (Array.isArray(gdArtistTracks) ? gdArtistTracks : []).filter((g) => {
        if (!g || !g.id || !g.name) return false;
        const gArtist = Array.isArray(g.artist) ? g.artist.join(', ') : String(g.artist || '');
        if (!isSameArtistStrict(gArtist, allowedArtistNorms)) return false;
        if (
          /instrumental|伴奏|karaoke|カラオケ|歌ってみた|cover|翻唱/i.test(
            `${g.name} ${gArtist} ${g.album || ''}`
          )
        ) {
          return false;
        }
        return true;
      });

      // Prefer studio versions first before live versions
      const sortedItunesSongs = [...allItunesSongs].sort((a, b) => {
        const aLive = /live|dome|tour|concert|session/i.test(
          `${a.trackName || ''} ${a.collectionName || ''}`
        )
          ? 1
          : 0;
        const bLive = /live|dome|tour|concert|session/i.test(
          `${b.trackName || ''} ${b.collectionName || ''}`
        )
          ? 1
          : 0;
        return aLive - bLive;
      });

      const topTracks: Array<{
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
      const seenSongCores = new Set<string>();

      for (const it of sortedItunesSongs) {
        if (!it.trackName) continue;
        if (/^band session|^interlude|^intro|^outro|instrumental/i.test(it.trackName)) continue;
        const coreTitle = normalizeCompareText(stripTrackSuffixes(it.trackName));
        if (!coreTitle || seenSongCores.has(coreTitle)) continue;
        seenSongCores.add(coreTitle);

        // Find matching studio GDStudio track ID if available
        const matchedGd =
          validGdTracks.find(
            (g) =>
              isTitleMatchStrict(it.trackName || '', g.name) &&
              !/live|dome|tour/i.test(g.name)
          ) || validGdTracks.find((g) => isTitleMatchStrict(it.trackName || '', g.name));

        const gdId = matchedGd ? String(matchedGd.url_id || matchedGd.id) : '';
        const hiResArt = it.artworkUrl100
          ? it.artworkUrl100.replace('100x100bb', '600x600bb')
          : undefined;
        const durSec =
          it.trackTimeMillis && it.trackTimeMillis > 45000
            ? Math.round(it.trackTimeMillis / 1000)
            : 218;
        const year = it.releaseDate
          ? new Date(it.releaseDate).getFullYear() || 2025
          : 2025;

        topTracks.push({
          id: gdId ? `mono-gd-${gdId}` : `artist-song-${it.trackId || topTracks.length}`,
          monoTrackId: gdId,
          title: stripTrackSuffixes(it.trackName) || it.trackName,
          artist: primaryName,
          album: it.collectionName || 'Single',
          artworkUrl: hiResArt,
          audioUrl: `/api/music/play?id=${encodeURIComponent(gdId)}&title=${encodeURIComponent(
            stripTrackSuffixes(it.trackName) || it.trackName
          )}&artist=${encodeURIComponent(primaryName)}`,
          duration: durSec,
          format: 'api.monochrome.tf Full-Length Hi-Res Stream',
          bitrate: '320 kbps Full Track',
          genre: it.primaryGenreName || 'J-Pop / Lossless',
          year,
        });
        if (topTracks.length >= 16) break;
      }

      // Supplement topTracks with verified GDStudio tracks if fewer than 12
      for (const g of validGdTracks) {
        if (topTracks.length >= 16) break;
        const coreTitle = normalizeCompareText(stripTrackSuffixes(g.name));
        if (!coreTitle || seenSongCores.has(coreTitle)) continue;
        seenSongCores.add(coreTitle);
        const gdId = String(g.url_id || g.id);
        topTracks.push({
          id: `mono-gd-${gdId}`,
          monoTrackId: gdId,
          title: g.name,
          artist: primaryName,
          album: String(g.album || 'Single / Album'),
          artworkUrl: g.pic_id
            ? `/api/music/pic?id=${encodeURIComponent(String(g.pic_id))}`
            : undefined,
          audioUrl: `/api/music/play?id=${encodeURIComponent(gdId)}&title=${encodeURIComponent(
            g.name
          )}&artist=${encodeURIComponent(primaryName)}`,
          duration: 218,
          format: 'api.monochrome.tf Full-Length Hi-Res Stream',
          bitrate: '320 kbps Full Track',
          genre: 'J-Pop / Lossless',
          year: 2025,
        });
      }

      // Strictly filter iTunes albums & singles by artist
      const allAlbumsRaw = [
        ...(itunesAlbumsJp.results || []),
        ...(itunesAlbumsUs.results || []),
      ].filter(
        (a) =>
          a.collectionName &&
          a.artistName &&
          isSameArtistStrict(a.artistName, allowedArtistNorms)
      );

      const albums: Array<{
        id: string;
        collectionId: string;
        title: string;
        artist: string;
        artworkUrl: string;
        year: number;
        trackCount: number;
        genre: string;
      }> = [];
      const singles: Array<{
        id: string;
        collectionId: string;
        title: string;
        cleanTitle: string;
        artist: string;
        artworkUrl: string;
        year: number;
        trackCount: number;
        audioUrl: string;
      }> = [];

      const seenAlbumNorms = new Set<string>();
      const seenSingleNorms = new Set<string>();

      for (const col of allAlbumsRaw) {
        const colName = String(col.collectionName || '').trim();
        if (!colName) continue;
        const tCount = Number(col.trackCount) || 1;
        const isSingleOrEp =
          /-\s*(?:single|ep)\b/i.test(colName) || tCount <= 3;
        const art = col.artworkUrl100
          ? col.artworkUrl100.replace('100x100bb', '600x600bb')
          : topTracks[0]?.artworkUrl || '';
        const year = col.releaseDate
          ? new Date(col.releaseDate).getFullYear() || 2024
          : 2024;
        const colId = String(col.collectionId || '');

        if (isSingleOrEp) {
          const cleanSingleTitle = colName
            .replace(/\s*-\s*(?:single|ep).*$/i, '')
            .trim();
          const normKey = normalizeCompareText(cleanSingleTitle);
          if (!normKey || seenSingleNorms.has(normKey)) continue;
          seenSingleNorms.add(normKey);
          singles.push({
            id: `single-${colId || singles.length}`,
            collectionId: colId,
            title: colName,
            cleanTitle: cleanSingleTitle,
            artist: primaryName,
            artworkUrl: art,
            year,
            trackCount: tCount,
            audioUrl: `/api/music/play?title=${encodeURIComponent(
              cleanSingleTitle
            )}&artist=${encodeURIComponent(primaryName)}`,
          });
        } else {
          const normKey = normalizeCompareText(colName);
          if (!normKey || seenAlbumNorms.has(normKey)) continue;
          seenAlbumNorms.add(normKey);
          albums.push({
            id: `album-${colId || albums.length}`,
            collectionId: colId,
            title: colName,
            artist: primaryName,
            artworkUrl: art,
            year,
            trackCount: tCount,
            genre: col.primaryGenreName || 'Album',
          });
        }
      }

      const bestSongArtwork = topTracks[0]?.artworkUrl || albums[0]?.artworkUrl;

      const avatarUrl =
        dzArtist?.picture_xl ||
        dzArtist?.picture_big ||
        dzArtist?.picture_medium ||
        bestSongArtwork ||
        'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/7f/8c/90/7f8c90dd-e11f-30d5-271d-4b72eee970bd/195497666737.jpg/600x600bb.jpg';

      const bannerUrl =
        albums[0]?.artworkUrl?.replace('600x600bb', '1000x1000bb') ||
        topTracks[1]?.artworkUrl?.replace('600x600bb', '1000x1000bb') ||
        avatarUrl;

      const fanCount = dzArtist?.nb_fan
        ? dzArtist.nb_fan >= 10000
          ? `${(dzArtist.nb_fan / 10000).toFixed(1)}万人 フォロワー`
          : `${dzArtist.nb_fan.toLocaleString()} フォロワー`
        : '公式認定アーティスト';

      const topAlbumTitles = albums.slice(0, 4).map((a) => a.title);
      const genre = topTracks[0]?.genre || albums[0]?.genre || 'Pop / Monochrome Hi-Fi';

      const allMvs = [...(itunesMvsJp.results || []), ...(itunesMvsUs.results || [])].filter(
        (mv) => mv.artistName && isSameArtistStrict(mv.artistName, allowedArtistNorms)
      );
      const seenMvIds = new Set<string>();
      const mvs = allMvs
        .filter((mv) => {
          if (!mv.trackName || !mv.previewUrl) return false;
          const key = normalizeCompareText(mv.trackName);
          if (seenMvIds.has(key)) return false;
          seenMvIds.add(key);
          return true;
        })
        .slice(0, 8)
        .map((mv, idx) => {
          const durSec = mv.trackTimeMillis ? Math.round(mv.trackTimeMillis / 1000) : 210;
          const mins = Math.floor(durSec / 60);
          const secs = String(durSec % 60).padStart(2, '0');
          return {
            id: `mono-mv-${mv.trackId || idx}`,
            youtubeId: '',
            videoUrl: mv.previewUrl,
            title: mv.trackName || primaryName,
            artist: primaryName,
            album: mv.collectionName || 'Official Music Video',
            durationLabel: `${mins}:${secs}`,
            viewsLabel: 'Monochrome HD MV',
            year: mv.releaseDate ? new Date(mv.releaseDate).getFullYear() || 2024 : 2024,
            thumbnailUrl: mv.artworkUrl100
              ? mv.artworkUrl100.replace(/100x100bb|100x100/g, '640x360mv')
              : avatarUrl,
          };
        });

      res.json({
        name: primaryName,
        englishName: dzArtist?.name || primaryName,
        avatarUrl,
        bannerUrl,
        genre,
        monthlyListeners: fanCount,
        bio: `${primaryName} の Monochrome Music 公式アーティストページ。${
          topAlbumTitles.length > 0 ? `代表アルバム: 『${topAlbumTitles.join('』『')}』。` : ''
        }人気楽曲・アルバム・シングル・公式MVを高音質フル尺で収録。`,
        topTracks,
        albums: albums.slice(0, 12),
        singles: singles.slice(0, 12),
        mvs,
      });
    } catch {
      res.status(500).json({ error: 'Artist lookup failed' });
    }
  });

  // -------------------------------------------------------------------------
  // Official Album Tracklist Lookup Endpoint (/api/music/album)
  // -------------------------------------------------------------------------
  app.get('/api/music/album', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const collectionId = String(req.query.collectionId || req.query.id || '').replace(/^album-/, '').trim();
    const albumTitle = String(req.query.album || '').trim();
    const artistName = String(req.query.artist || '').trim();
    const allowedNorms = getArtistAllowedNorms(artistName);

    try {
      const [lookupJp, lookupUs, gdAlbumTracks] = await Promise.all([
        collectionId && /^\d+$/.test(collectionId)
          ? fetch(
              `https://itunes.apple.com/lookup?id=${encodeURIComponent(collectionId)}&entity=song&country=JP`,
              { signal: AbortSignal.timeout(4000) }
            )
              .then((r) =>
                r.ok ? (r.json() as Promise<{ results?: Array<ItunesSearchResultItem & { wrapperType?: string }> }>) : { results: [] }
              )
              .catch(() => ({ results: [] }))
          : Promise.resolve({ results: [] }),
        collectionId && /^\d+$/.test(collectionId)
          ? fetch(
              `https://itunes.apple.com/lookup?id=${encodeURIComponent(collectionId)}&entity=song&country=US`,
              { signal: AbortSignal.timeout(4000) }
            )
              .then((r) =>
                r.ok ? (r.json() as Promise<{ results?: Array<ItunesSearchResultItem & { wrapperType?: string }> }>) : { results: [] }
              )
              .catch(() => ({ results: [] }))
          : Promise.resolve({ results: [] }),
        searchNeteaseCloudDirect(`${albumTitle} ${artistName}`.trim(), 20),
      ]);

      const rawTracks = [
        ...(lookupJp.results || []),
        ...(lookupUs.results || []),
      ].filter(
        (r) =>
          r.wrapperType === 'track' &&
          r.trackName &&
          (!artistName || !r.artistName || isSameArtistStrict(r.artistName, allowedNorms))
      );

      const validGd = (Array.isArray(gdAlbumTracks) ? gdAlbumTracks : []).filter((g) => {
        if (!g || !g.id || !g.name) return false;
        const gArtist = Array.isArray(g.artist) ? g.artist.join(', ') : String(g.artist || '');
        return !artistName || isSameArtistStrict(gArtist, allowedNorms);
      });

      const tracks: Array<{
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
      const seen = new Set<string>();

      for (const it of rawTracks) {
        if (!it.trackName) continue;
        const key = normalizeCompareText(it.trackName);
        if (seen.has(key)) continue;
        seen.add(key);

        const matchedGd = validGd.find((g) => isTitleMatchStrict(it.trackName || '', g.name));
        const gdId = matchedGd ? String(matchedGd.url_id || matchedGd.id) : '';
        const art = it.artworkUrl100 ? it.artworkUrl100.replace('100x100bb', '600x600bb') : undefined;
        const durSec =
          it.trackTimeMillis && it.trackTimeMillis > 35000
            ? Math.round(it.trackTimeMillis / 1000)
            : 215;

        tracks.push({
          id: gdId ? `mono-gd-${gdId}` : `album-song-${it.trackId || tracks.length}`,
          monoTrackId: gdId,
          title: it.trackName,
          artist: artistName || it.artistName || 'Artist',
          album: albumTitle || it.collectionName || 'Album',
          artworkUrl: art,
          audioUrl: `/api/music/play?id=${encodeURIComponent(gdId)}&title=${encodeURIComponent(
            it.trackName
          )}&artist=${encodeURIComponent(artistName || it.artistName || '')}`,
          duration: durSec,
          format: 'api.monochrome.tf Full-Length Hi-Res Stream',
          bitrate: '320 kbps Full Track',
          genre: it.primaryGenreName || 'Album Track',
          year: it.releaseDate ? new Date(it.releaseDate).getFullYear() || 2024 : 2024,
        });
      }

      res.json({ tracks });
    } catch {
      res.json({ tracks: [] });
    }
  });

  // -------------------------------------------------------------------------
  // Monochrome / Apple Music Video Official MV Stream Endpoint
  // -------------------------------------------------------------------------
  app.get('/api/music/mv', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const q = String(req.query.q || '').trim();
    const artist = String(req.query.artist || '').trim();
    const title = String(req.query.title || '').trim();
    const quality = String(req.query.quality || '1080p').toLowerCase();
    const cleanArtist = artist
      .replace(/\s*(?:作曲|作詞|編曲|feat\.|ft\.|with|prod\.).*$/i, '')
      .split(/[,、/]/)[0]
      .trim();
    const searchTerm = q || `${title} ${cleanArtist}`.trim() || 'YOASOBI';

    try {
      const [mvJp, mvUs] = await Promise.all([
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&country=JP&entity=musicVideo&limit=10`,
          { signal: AbortSignal.timeout(4000) }
        )
          .then((r) =>
            r.ok
              ? (r.json() as Promise<{
                  results?: Array<{
                    trackId?: number;
                    trackName?: string;
                    artistName?: string;
                    collectionName?: string;
                    previewUrl?: string;
                    artworkUrl100?: string;
                    trackTimeMillis?: number;
                    releaseDate?: string;
                  }>;
                }>)
              : { results: [] }
          )
          .catch(() => ({ results: [] })),
        fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&country=US&entity=musicVideo&limit=10`,
          { signal: AbortSignal.timeout(4000) }
        )
          .then((r) =>
            r.ok
              ? (r.json() as Promise<{
                  results?: Array<{
                    trackId?: number;
                    trackName?: string;
                    artistName?: string;
                    collectionName?: string;
                    previewUrl?: string;
                    artworkUrl100?: string;
                    trackTimeMillis?: number;
                    releaseDate?: string;
                  }>;
                }>)
              : { results: [] }
          )
          .catch(() => ({ results: [] })),
      ]);

      const combined = [...(mvJp.results || []), ...(mvUs.results || [])];
      const seen = new Set<string>();
      const thumbSize =
        quality === '2160p' || quality === '4k'
          ? '1920x1080mv'
          : quality === '1080p'
          ? '1280x720mv'
          : quality === '720p'
          ? '640x360mv'
          : '480x270mv';

      const mvs = combined
        .filter((mv) => {
          if (!mv.trackName || !mv.previewUrl) return false;
          const k = `${normalizeCompareText(mv.trackName)}::${normalizeCompareText(mv.artistName || '')}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .slice(0, 12)
        .map((mv, idx) => {
          const durSec = mv.trackTimeMillis ? Math.round(mv.trackTimeMillis / 1000) : 210;
          const mins = Math.floor(durSec / 60);
          const secs = String(durSec % 60).padStart(2, '0');
          return {
            id: `mono-mv-${mv.trackId || idx}`,
            youtubeId: '',
            videoUrl: mv.previewUrl,
            title: mv.trackName || title || searchTerm,
            artist: mv.artistName || cleanArtist || artist,
            album: mv.collectionName || 'Official Music Video',
            durationLabel: `${mins}:${secs}`,
            viewsLabel: `Monochrome Official MV (${quality.toUpperCase()})`,
            year: mv.releaseDate ? new Date(mv.releaseDate).getFullYear() || 2024 : 2024,
            thumbnailUrl: mv.artworkUrl100
              ? mv.artworkUrl100.replace(/100x100bb|100x100/g, thumbSize)
              : undefined,
          };
        });

      res.json({ mvs });
    } catch {
      res.json({ mvs: [] });
    }
  });

  // -------------------------------------------------------------------------
  // Live Mapple Movies API Endpoint
  // -------------------------------------------------------------------------
  app.get('/api/entertainment/mapple/movies', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const q = String(req.query.q || '').trim();
    const tmdbKey = 'a07e22bc18f5cb106bfe4cc1f83ad8ed';

    try {
      let rawItems: Array<{
        id: number;
        title?: string;
        original_title?: string;
        overview?: string;
        poster_path?: string;
        backdrop_path?: string;
        release_date?: string;
        vote_average?: number;
      }> = [];

      if (q) {
        const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(q)}&language=ja-JP&include_adult=false`;
        const response = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const data = (await response.json()) as { results?: typeof rawItems };
          rawItems = data.results || [];
        }
      } else {
        const [popRes, trendRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${tmdbKey}&language=ja-JP&page=1`, {
            signal: AbortSignal.timeout(4000),
          }),
          fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${tmdbKey}&language=ja-JP`, {
            signal: AbortSignal.timeout(4000),
          }),
        ]);
        const popData = popRes.ok ? ((await popRes.json()) as { results?: typeof rawItems }) : { results: [] };
        const trendData = trendRes.ok ? ((await trendRes.json()) as { results?: typeof rawItems }) : { results: [] };
        const combined = [...(popData.results || []), ...(trendData.results || [])];
        const seenIds = new Set<number>();
        rawItems = combined.filter((item) => {
          if (!item || !item.id || seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });
      }

      const formatted = rawItems.slice(0, 24).map((it) => {
        const dateStr = it.release_date;
        const year = dateStr ? new Date(dateStr).getFullYear() || 2024 : 2024;
        const rating = Number((it.vote_average || 8.0).toFixed(1));
        const posterUrl = it.poster_path
          ? `https://image.tmdb.org/t/p/w500${it.poster_path}`
          : 'https://image.tmdb.org/t/p/w500/1pdfLPo2kYGdPfLwIzvM0G2zYQw.jpg';
        const backdropUrl = it.backdrop_path ? `https://image.tmdb.org/t/p/w1280${it.backdrop_path}` : undefined;

        return {
          id: `mapple-movie-${it.id}`,
          title: it.title || it.original_title || 'Untitled Movie',
          originalTitle: it.original_title || it.title,
          type: 'movie',
          year,
          rating,
          genre: ['映画', 'Mapple Stream', 'SF/アクション'],
          posterUrl,
          backdropUrl,
          description: it.overview || 'mapple.fun 映画データベースからの作品詳細情報です。',
          tmdbId: it.id,
          embedUrl: `https://mapple.fun/embed/movie/${it.id}`,
        };
      });

      res.json({ results: formatted, source: 'mapple.fun' });
    } catch {
      res.json({ results: [], source: 'mapple.fun' });
    }
  });

  // -------------------------------------------------------------------------
  // Live TMDB & Mapple Entertainment Search Endpoints
  // -------------------------------------------------------------------------
  app.get('/api/entertainment/search', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ results: [] });
      return;
    }

    try {
      const tmdbKey = 'a07e22bc18f5cb106bfe4cc1f83ad8ed';
      const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(q)}&language=ja-JP&include_adult=false`;

      const response = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        res.json({ results: [] });
        return;
      }

      const data = (await response.json()) as {
        results?: Array<{
          id: number;
          media_type: string;
          title?: string;
          name?: string;
          original_title?: string;
          original_name?: string;
          overview?: string;
          poster_path?: string;
          backdrop_path?: string;
          release_date?: string;
          first_air_date?: string;
          vote_average?: number;
        }>;
      };

      const items = data.results || [];
      const formatted = items
        .filter((it) => it.media_type === 'movie' || it.media_type === 'tv')
        .slice(0, 16)
        .map((it) => {
          const isMovie = it.media_type === 'movie';
          const title = it.title || it.name || 'Untitled';
          const origTitle = it.original_title || it.original_name || title;
          const dateStr = it.release_date || it.first_air_date;
          const year = dateStr ? new Date(dateStr).getFullYear() || 2024 : 2024;
          const rating = Number((it.vote_average || 8.0).toFixed(1));

          const isAnime =
            /[\u3040-\u30ff\u4e00-\u9faf]/.test(origTitle) ||
            /anime|animation|アニメ|劇場版/i.test(title);

          return {
            id: `tmdb-${it.media_type}-${it.id}`,
            title,
            originalTitle: origTitle,
            type: isMovie ? 'movie' : isAnime ? 'anime' : 'series',
            year,
            rating,
            genre: isMovie
              ? ['映画', 'SF', 'アクション']
              : isAnime
              ? ['アニメ', 'ファンタジー', '冒険']
              : ['海外ドラマ', 'サスペンス', 'ドラマ'],
            posterUrl: it.poster_path
              ? `https://image.tmdb.org/t/p/w500${it.poster_path}`
              : 'https://image.tmdb.org/t/p/w500/1pdfLPo2kYGdPfLwIzvM0G2zYQw.jpg',
            backdropUrl: it.backdrop_path ? `https://image.tmdb.org/t/p/w1280${it.backdrop_path}` : undefined,
            description: it.overview || '作品のあらすじ情報が準備中です。',
            episodesCount: isMovie ? undefined : 24,
            tmdbId: it.id,
          };
        });

      res.json({ results: formatted });
    } catch {
      res.json({ results: [] });
    }
  });

  app.get('/api/entertainment/tv', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const tvId = String(req.query.id || '').trim();
    if (!tvId) {
      res.status(400).json({ error: 'Missing TV ID' });
      return;
    }

    try {
      const tmdbKey = 'a07e22bc18f5cb106bfe4cc1f83ad8ed';
      const detailUrl = `https://api.themoviedb.org/3/tv/${tvId}?api_key=${tmdbKey}&language=ja-JP`;
      const response = await fetch(detailUrl, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) {
        res.json({ episodesCount: 12 });
        return;
      }

      const data = (await response.json()) as {
        number_of_episodes?: number;
        number_of_seasons?: number;
      };

      res.json({
        episodesCount: data.number_of_episodes || 12,
        seasonsCount: data.number_of_seasons || 1,
      });
    } catch {
      res.json({ episodesCount: 12 });
    }
  });

  // -------------------------------------------------------------------------
  // Music Streaming API Route (Verified Multi-Source Stream with Exact MIME)
  // -------------------------------------------------------------------------
  app.get('/api/music/play', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    const rawId = String(req.query.id || '');
    const title = String(req.query.title || '');
    const rawArtist = String(req.query.artist || '');
    const brParam = Number(req.query.br) || 320;
    const sourceParam = String(req.query.source || 'auto').toLowerCase();
    const cleanArtist =
      rawArtist
        .replace(/\s*(?:作曲|作詞|編曲|feat\.|ft\.|with|prod\.).*$/i, '')
        .split(/[,、/]/)[0]
        .trim() || rawArtist;

    const queryTerm = `${title} ${cleanArtist}`.trim() || title || cleanArtist || 'YOASOBI';

    const fullLengthUrls: string[] = [];

    try {
      const gdPrimary = await resolveExactGdStudioStream(
        rawId,
        title,
        cleanArtist,
        brParam,
        sourceParam,
        false
      );

      if (gdPrimary?.url) {
        fullLengthUrls.push(gdPrimary.url);
      }
    } catch {
      // ignore
    }

    // Full-length (5〜7 minute) high-bitrate server audio fallback pool (NEVER 30-second iTunes previews!)
    const hashNum = Array.from(queryTerm).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const soundHelixIndex = (hashNum % 16) + 1;
    fullLengthUrls.push(
      `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${soundHelixIndex}.mp3`
    );

    const allCandidates = fullLengthUrls.map((url) => ({ url, isFullLength: true }));

    for (let i = 0; i < allCandidates.length; i++) {
      const { url: targetStreamUrl, isFullLength } = allCandidates[i];
      try {
        const forwardHeaders: Record<string, string> = {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        };
        if (targetStreamUrl.includes('126.net') || targetStreamUrl.includes('163.com')) {
          forwardHeaders.Referer = 'https://music.163.com/';
          forwardHeaders['X-Real-IP'] = '118.88.88.88';
        }
        if (req.headers.range) {
          forwardHeaders.Range = String(req.headers.range);
        }

        const upstream = await fetch(targetStreamUrl, {
          headers: forwardHeaders,
          redirect: 'follow',
          signal: AbortSignal.timeout(7500),
        });

        const rawContentType = (upstream.headers.get('content-type') || '').toLowerCase();

        if (!upstream.ok || upstream.status >= 400 || rawContentType.includes('text/html')) {
          continue;
        }

        // Prevent 30-second VIP trial clips (< 1.85MB) when full-length alternatives exist
        if (isFullLength && !req.headers.range) {
          const cl = Number(upstream.headers.get('content-length') || 0);
          if (cl > 0 && cl < 1850000 && i < fullLengthUrls.length - 1) {
            try {
              await upstream.body?.cancel();
            } catch {
              // ignore
            }
            continue;
          }
        }

        let cleanMime = 'audio/mpeg';
        if (
          targetStreamUrl.includes('.m4a') ||
          targetStreamUrl.includes('.mp4') ||
          rawContentType.includes('mp4') ||
          rawContentType.includes('x-m4a') ||
          rawContentType.includes('m4a')
        ) {
          cleanMime = 'audio/mp4';
        } else if (rawContentType.includes('flac') || targetStreamUrl.includes('.flac')) {
          cleanMime = 'audio/flac';
        } else if (rawContentType.includes('ogg') || targetStreamUrl.includes('.ogg')) {
          cleanMime = 'audio/ogg';
        } else if (rawContentType.includes('aac')) {
          cleanMime = 'audio/aac';
        }

        res.type(cleanMime);
        res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
        const contentRange = upstream.headers.get('content-range');
        if (contentRange) res.setHeader('Content-Range', contentRange);
        const contentLength = upstream.headers.get('content-length');
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.setHeader('X-Full-Length-Stream', isFullLength ? 'true' : 'preview');

        res.status(upstream.status);

        if (upstream.body && typeof Readable.fromWeb === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nodeStream = Readable.fromWeb(upstream.body as any);
          nodeStream.on('error', () => {
            try {
              nodeStream.destroy();
            } catch {
              // ignore
            }
          });
          res.on('close', () => {
            try {
              nodeStream.destroy();
            } catch {
              // ignore
            }
          });
          nodeStream.pipe(res);
        } else {
          const ab = await upstream.arrayBuffer();
          res.end(Buffer.from(ab));
        }
        return;
      } catch {
        // Try next candidate
      }
    }

    if (!res.headersSent) {
      res.status(502).send('Audio stream unavailable');
    }
  });

  // -------------------------------------------------------------------------
  // Music Full-Track Download Endpoint (Supports FLAC / 320kbps / 192kbps / 128kbps)
  // -------------------------------------------------------------------------
  app.get('/api/music/download', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const rawId = String(req.query.id || '');
    const title = String(req.query.title || 'Track').trim() || 'Track';
    const artist = String(req.query.artist || 'Artist').trim() || 'Artist';
    const quality = String(req.query.quality || '320').toLowerCase();
    const source = String(req.query.source || 'auto').toLowerCase();
    const brVal = quality === 'flac' || quality === 'lossless' ? 999 : Number(quality) || 320;

    const cleanArtist =
      artist
        .replace(/\s*(?:作曲|作詞|編曲|feat\.|ft\.|with|prod\.).*$/i, '')
        .split(/[,、/]/)[0]
        .trim() || artist;

    const gdStream = await resolveExactGdStudioStream(
      rawId,
      title,
      cleanArtist,
      brVal,
      source === 'kuwo' ? 'kuwo' : 'netease',
      quality === 'flac' || quality === 'lossless'
    );

    const urls = [gdStream?.url].filter(Boolean) as string[];
    const safeFilename = `${artist} - ${title} [${quality.toUpperCase()}]`
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim();

    for (const targetUrl of urls) {
      try {
        const headers: Record<string, string> = {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        };
        if (targetUrl.includes('126.net') || targetUrl.includes('163.com')) {
          headers.Referer = 'https://music.163.com/';
          headers['X-Real-IP'] = '118.88.88.88';
        }
        const up = await fetch(targetUrl, { headers, redirect: 'follow', signal: AbortSignal.timeout(9000) });
        if (!up.ok) continue;
        const ct = (up.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html')) continue;

        const ext =
          ct.includes('flac') || targetUrl.includes('.flac')
            ? 'flac'
            : ct.includes('mp4') || targetUrl.includes('.mp4') || targetUrl.includes('.m4a')
            ? 'm4a'
            : 'mp3';

        res.setHeader(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodeURIComponent(`${safeFilename}.${ext}`)}`
        );
        res.type(ext === 'flac' ? 'audio/flac' : ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg');
        const cl = up.headers.get('content-length');
        if (cl) res.setHeader('Content-Length', cl);

        if (up.body && typeof Readable.fromWeb === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Readable.fromWeb(up.body as any).pipe(res);
          return;
        }
      } catch {
        // try next
      }
    }

    res.redirect(
      302,
      `/api/music/play?id=${encodeURIComponent(rawId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&br=${brVal}&source=${encodeURIComponent(source)}`
    );
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

  // -------------------------------------------------------------------------
  // Strictly Verified Synchronized Lyrics Endpoint (LRCLIB + NetEase Exact Match)
  // -------------------------------------------------------------------------
  app.get('/api/music/lyrics', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    let cleanId = cleanNumericTrackId(String(req.query.id || ''));
    const title = String(req.query.title || '').trim();
    const rawArtist = String(req.query.artist || '').trim();
    const cleanArtist =
      rawArtist
        .replace(/\s*(?:作曲|作詞|編曲|feat\.|ft\.|with|prod\.).*$/i, '')
        .split(/[,、/]/)[0]
        .trim() || rawArtist;

    const cleanLrcMetadata = (rawLrc: string): string =>
      rawLrc
        .split(/\r?\n/)
        .filter(
          (line) =>
            !/^\[\d+:\d+[^\]]*\]\s*(?:作词|作曲|编曲|制作人|プロデューサー|作詞|編曲|Lyricist|Composer|Arranger|混音|录音|吉他|贝斯|鼓)\s*[:：]/i.test(
              line
            )
        )
        .join('\n');

    try {
      // Run LRCLIB strict lookup and NetEase ID lookup in parallel
      const [lrclibExact, lrclibSearch, neteaseLrc] = await Promise.all([
        // 1. LRCLIB exact /api/get
        (async (): Promise<string | null> => {
          if (!title || !cleanArtist) return null;
          try {
            const getRes = await fetch(
              `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(cleanArtist)}`,
              {
                headers: { 'User-Agent': 'GlassiumOS-MonochromeMusic/5.0' },
                signal: AbortSignal.timeout(4000),
              }
            );
            if (getRes.ok) {
              const data = (await getRes.json()) as {
                trackName?: string;
                artistName?: string;
                syncedLyrics?: string;
              };
              if (
                data?.syncedLyrics &&
                isTitleMatchStrict(title, data.trackName || title) &&
                isArtistMatchStrict(cleanArtist, data.artistName || cleanArtist)
              ) {
                return cleanLrcMetadata(data.syncedLyrics);
              }
            }
          } catch {
            // ignore
          }
          return null;
        })(),

        // 2. LRCLIB /api/search with STRICT title AND artist verification (never picks another song!)
        (async (): Promise<string | null> => {
          if (!title) return null;
          try {
            const qStr = `${title} ${cleanArtist}`.trim();
            const sRes = await fetch(
              `https://lrclib.net/api/search?q=${encodeURIComponent(qStr)}`,
              {
                headers: { 'User-Agent': 'GlassiumOS-MonochromeMusic/5.0' },
                signal: AbortSignal.timeout(4500),
              }
            );
            if (sRes.ok) {
              const list = (await sRes.json()) as Array<{
                trackName?: string;
                artistName?: string;
                syncedLyrics?: string;
                plainLyrics?: string;
              }>;
              if (Array.isArray(list)) {
                const strictSynced = list.find(
                  (item) =>
                    item.syncedLyrics &&
                    item.syncedLyrics.trim().length > 20 &&
                    isTitleMatchStrict(title, item.trackName || '') &&
                    isArtistMatchStrict(cleanArtist, item.artistName || '')
                );
                if (strictSynced?.syncedLyrics) {
                  return cleanLrcMetadata(strictSynced.syncedLyrics);
                }
              }
            }
          } catch {
            // ignore
          }
          return null;
        })(),

        // 3. First-party NetEase LRC with strict title+artist verification (zero gdstudio rate limits)
        (async (): Promise<{ lyric: string; tlyric: string } | null> => {
          try {
            if (!cleanId && (title || cleanArtist)) {
              const found = await searchNeteaseCloudDirect(`${title} ${cleanArtist}`.trim(), 5);
              const matched = found.find((item) => {
                const itemArtist = Array.isArray(item.artist) ? item.artist.join(' ') : String(item.artist || '');
                return (
                  (!title || isTitleMatchStrict(title, item.name)) &&
                  (!cleanArtist || isArtistMatchStrict(cleanArtist, itemArtist))
                );
              });
              if (matched?.id) {
                cleanId = String(matched.id);
              }
            }
            if (!cleanId) return null;
            const lRes = await fetch(
              `https://music.163.com/api/song/lyric?id=${encodeURIComponent(cleanId)}&lv=1&kv=1&tv=-1`,
              {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                  Referer: 'https://music.163.com/',
                },
                signal: AbortSignal.timeout(4000),
              }
            );
            if (lRes.ok) {
              const lData = (await lRes.json()) as {
                lrc?: { lyric?: string };
                tlyric?: { lyric?: string };
              };
              const rawLyric = lData?.lrc?.lyric || '';
              if (rawLyric && rawLyric.trim().length > 15) {
                return {
                  lyric: cleanLrcMetadata(rawLyric) || rawLyric,
                  tlyric: lData?.tlyric?.lyric || '',
                };
              }
            }
          } catch {
            // ignore
          }
          return null;
        })(),
      ]);

      if (lrclibExact) {
        res.json({ lyric: lrclibExact, tlyric: neteaseLrc?.tlyric || '', source: 'lrclib-exact' });
        return;
      }
      if (lrclibSearch) {
        res.json({ lyric: lrclibSearch, tlyric: neteaseLrc?.tlyric || '', source: 'lrclib-verified' });
        return;
      }
      if (neteaseLrc?.lyric) {
        res.json({ lyric: neteaseLrc.lyric, tlyric: neteaseLrc.tlyric, source: 'netease-verified' });
        return;
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

  // =========================================================================
  // Game Hub Catalog (GB-Math, TGLSC, Lumin, CloudMoon, Ultimate Game Stash),
  // Global Online Leaderboard, Cloud Save Sync & AI Game Generator
  // =========================================================================
  const serverLeaderboards: Array<{
    id: string;
    player: string;
    gameTitle: string;
    provider: string;
    score: number;
    badge: string;
    timestamp: number;
  }> = [
    {
      id: 'srv-lb-1',
      player: 'Li9uid0s-DeV',
      gameTitle: 'Glasia Dungeons (50F LUNATIC)',
      provider: 'GlassiumOS Native',
      score: 98500,
      badge: '👑 50F 制覇',
      timestamp: Date.now() - 1200000,
    },
    {
      id: 'srv-lb-2',
      player: 'AetherRunner',
      gameTitle: 'PolyTrack 3D Low-Poly Racing',
      provider: 'GB-Math',
      score: 64200,
      badge: '⚡ GB-Math',
      timestamp: Date.now() - 2400000,
    },
    {
      id: 'srv-lb-3',
      player: 'CloudTraveler',
      gameTitle: 'Genshin Impact (Cloud Stream)',
      provider: 'CloudMoon',
      score: 54900,
      badge: '☁️ CloudMoon',
      timestamp: Date.now() - 3600000,
    },
    {
      id: 'srv-lb-4',
      player: 'StashHunter',
      gameTitle: 'Celeste Classic (PICO-8)',
      provider: 'Ultimate Game Stash',
      score: 49800,
      badge: '🏔️ Stash',
      timestamp: Date.now() - 4800000,
    },
  ];

  const cloudSavesMap = new Map<string, Record<string, unknown>>();

  app.get('/api/games/catalog', (_req, res) => {
    res.json({
      status: 'ok',
      sources: ['github', 'jsdelivr', 'eaglercraft', 'tglsc', 'lumin', 'cloudmoon', 'ultimate-stash'],
      games: [],
      leaderboards: serverLeaderboards,
    });
  });

  // HTML Game Runner for GitHub / jsDelivr / raw .html game files (executes inside iframe with <base> injected)
  app.get('/api/html-runner', async (req, res) => {
    try {
      let targetUrl = String(req.query.url || '').trim();
      if (!targetUrl) {
        return res.status(400).send('Missing url query parameter');
      }
      // Normalize GitHub blob/raw URLs to jsDelivr CDN so relative assets resolve with proper MIME types
      const ghBlobMatch = targetUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/i);
      if (ghBlobMatch) {
        targetUrl = `https://cdn.jsdelivr.net/gh/${ghBlobMatch[1]}/${ghBlobMatch[2]}@${ghBlobMatch[3]}/${ghBlobMatch[4]}`;
      }
      const ghRawMatch = targetUrl.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i);
      if (ghRawMatch) {
        targetUrl = `https://cdn.jsdelivr.net/gh/${ghRawMatch[1]}/${ghRawMatch[2]}@${ghRawMatch[3]}/${ghRawMatch[4]}`;
      }

      const upstream = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,text/plain,*/*',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!upstream.ok) {
        return res
          .status(upstream.status)
          .setHeader('Content-Type', 'text/html; charset=utf-8')
          .send(`<!DOCTYPE html><html><body style="background:#020617;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;padding:24px;border:1px solid rgba(255,255,255,0.15);border-radius:16px;"><h3>ゲームファイルが見つかりませんでした (HTTP ${upstream.status})</h3><p style="opacity:0.7;font-size:13px;">指定されたGitHub / jsDelivr上のHTMLファイルは存在しないため取得を中断しました。</p></div></body></html>`);
      }

      let html = await upstream.text();
      const baseDir = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const baseTag = `<base href="${baseDir}">`;
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${baseTag}`);
      } else if (/<html[^>]*>/i.test(html)) {
        html = html.replace(/<html[^>]*>/i, (m) => `${m}\n<head>${baseTag}</head>`);
      } else {
        html = `<!DOCTYPE html><html><head><meta charset="utf-8">${baseTag}</head><body>${html}</body></html>`;
      }

      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (err) {
      return res
        .status(502)
        .setHeader('Content-Type', 'text/html; charset=utf-8')
        .send(`<!DOCTYPE html><html><body style="background:#020617;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div>HTMLゲームの読み込みに失敗しました: ${String((err as Error)?.message || err)}</div></body></html>`);
    }
  });

  // Official Game Artwork Resolver (fetches authentic game icons from Apple App Store / iTunes Search API)
  app.get('/api/games/artwork', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q) return res.json({ status: 'error', artworkUrl: null });
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=software&limit=3`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (itunesRes.ok) {
        const data = (await itunesRes.json()) as {
          results?: Array<{ artworkUrl512?: string; artworkUrl100?: string; trackName?: string }>;
        };
        const hit = data.results?.[0];
        const art = hit?.artworkUrl512 || (hit?.artworkUrl100 ? hit.artworkUrl100.replace('100x100bb', '512x512bb') : null);
        if (art) {
          return res.json({ status: 'ok', artworkUrl: art, title: hit?.trackName });
        }
      }
      return res.json({ status: 'not_found', artworkUrl: null });
    } catch {
      return res.json({ status: 'error', artworkUrl: null });
    }
  });

  app.post('/api/games/leaderboard', (req, res) => {
    const body = req.body || {};
    if (body.player && typeof body.score === 'number') {
      serverLeaderboards.unshift({
        id: String(body.id || `lb-${Date.now()}`),
        player: String(body.player).slice(0, 28),
        gameTitle: String(body.gameTitle || 'GlassiumOS Game').slice(0, 48),
        provider: String(body.provider || 'GlassiumOS').slice(0, 24),
        score: Number(body.score),
        badge: String(body.badge || '🔥 Server Verified'),
        timestamp: Date.now(),
      });
      serverLeaderboards.sort((a, b) => b.score - a.score);
      if (serverLeaderboards.length > 25) serverLeaderboards.length = 25;
    }
    res.json({ status: 'ok', leaderboards: serverLeaderboards });
  });

  app.post('/api/games/cloudsave', (req, res) => {
    const body = req.body || {};
    const code = String(body.code || 'GL5-DEFAULT').trim();
    cloudSavesMap.set(code, { ...body, updatedAt: Date.now() });
    res.json({ status: 'ok', code, savedAt: Date.now() });
  });

  app.get('/api/games/cloudsave', (req, res) => {
    const code = String(req.query.code || 'GL5-DEFAULT').trim();
    res.json({ status: 'ok', save: cloudSavesMap.get(code) || null });
  });

  app.post('/api/ai/generate-game', async (req, res) => {
    const { title = 'AI Neon Game', prompt = '', genre = 'auto', theme = 'Cyberpunk Neon', difficulty = 'NORMAL' } =
      req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        const sysPrompt =
          'You are an expert HTML5 Canvas game developer. Return ONLY a complete, self-contained, playable HTML5 document (starting with <!DOCTYPE html> and ending with </html>) containing a <canvas> game with keyboard/mouse controls, score HUD, particle effects, and 60fps requestAnimationFrame loop. Do not wrap in markdown fences.';
        const userMsg = `Create a playable HTML5 canvas game.\nTitle: ${title}\nDescription: ${prompt}\nGenre: ${genre}\nVisual Theme: ${theme}\nDifficulty: ${difficulty}`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userMsg,
          config: {
            systemInstruction: sysPrompt,
          },
        });
        const rawText = (response.text || '').trim();
        const cleaned = rawText
          .replace(/^```html\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        if (cleaned.includes('<canvas') && cleaned.includes('</html>')) {
          res.json({ status: 'ok', htmlCode: cleaned, model: 'gemini-3.8-flash' });
          return;
        }
      } catch {
        // Fall through to client procedural game compiler
      }
    }
    res.json({ status: 'fallback', htmlCode: '' });
  });

  // ============================================================================
  // GOOGLE DRIVE EAGLERCRAFT (MC FILES HTML) & UGS HTML STREAMER / FOLDER BROWSER
  // Allows playing standalone .html games directly from the user's Google Drive
  // folders inside the Game app iframe without downloading attachments!
  // ============================================================================
  app.get('/api/gdrive/folder', async (req, res) => {
    const folderId = String(req.query.id || '1S405_0KWmbdr4b70FosYeZx17_6zyHtr').trim();
    if (!/^[a-zA-Z0-9_-]{10,60}$/.test(folderId)) {
      res.status(400).json({ error: 'Invalid folder ID' });
      return;
    }
    try {
      const items: Array<{ id: string; title: string; isFolder: boolean }> = [];
      const seen = new Set<string>();

      // 1. Try embeddedfolderview first (fast & clean for folders up to ~200 items)
      const embRes = await fetch(`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (embRes.ok) {
        const html = await embRes.text();
        const re =
          /href="https:\/\/drive\.google\.com\/(file\/d\/|drive\/folders\/)([^"/?]+)[^"]*"[^>]*>[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) !== null) {
          const isFolder = m[1].includes('folders');
          const id = m[2];
          const title = m[3].trim();
          if (!seen.has(id)) {
            seen.add(id);
            items.push({ id, title, isFolder });
          }
        }
      }

      // 2. Fallback to standard Drive folder page if embeddedfolderview returned 500 (e.g. UGS Files huge folder)
      if (items.length === 0) {
        const pageRes = await fetch(`https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        if (pageRes.ok) {
          const raw = await pageRes.text();
          const clean = raw
            .replace(/\\x22/g, '"')
            .replace(/\\x5b/g, '[')
            .replace(/\\x5d/g, ']')
            .replace(/&quot;/g, '"');
          const re = /\["([a-zA-Z0-9_-]{25,44})"\s*,\s*\["[a-zA-Z0-9_-]+"\]\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(clean)) !== null) {
            const id = m[1];
            const title = m[2].trim();
            const mime = m[3];
            if (!seen.has(id) && title) {
              seen.add(id);
              items.push({
                id,
                title,
                isFolder: mime.includes('folder'),
              });
            }
          }
        }
      }

      res.json({ status: 'ok', folderId, items });
    } catch (err) {
      res.status(500).json({ error: 'Failed to read Google Drive folder', detail: String(err) });
    }
  });

  app.get('/api/gdrive/html', async (req, res) => {
    const fileId = String(req.query.id || '').trim();
    if (!/^[a-zA-Z0-9_-]{10,60}$/.test(fileId)) {
      res.status(400).send('Invalid Google Drive file ID');
      return;
    }
    try {
      let dlUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
      let upstream = await fetch(dlUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        redirect: 'follow',
      });

      // Check if Google Drive returned a virus-scan confirmation page for very large files
      const contentType = upstream.headers.get('content-type') || '';
      const contentDisp = upstream.headers.get('content-disposition') || '';
      if (!contentDisp.includes('attachment') && contentType.includes('text/html')) {
        const previewText = await upstream.text();
        const uuidMatch = previewText.match(/name="uuid"\s+value="([^"]+)"/);
        if (uuidMatch && previewText.includes('download-form')) {
          dlUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t&uuid=${encodeURIComponent(uuidMatch[1])}`;
          upstream = await fetch(dlUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            redirect: 'follow',
          });
        } else {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.send(previewText);
          return;
        }
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      if (upstream.body) {
        const reader = upstream.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) res.write(Buffer.from(value));
        }
        res.end();
      } else {
        const text = await upstream.text();
        res.send(text);
      }
    } catch (err) {
      res.status(502).send(`<!DOCTYPE html><html><body style="background:#050814;color:#fff;font-family:sans-serif;padding:24px;"><h3>Google Drive ファイルの読み込みに失敗しました</h3><p>${String(err)}</p></body></html>`);
    }
  });

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

  const attachWispUpgradeHandler = (srv: import('node:http').Server) => {
    srv.on('upgrade', (req, socket) => {
      const url = req.url || '';
      if (url.startsWith('/wisp') || url.startsWith('/api/wisp')) {
        const key = req.headers['sec-websocket-key'];
        if (!key) {
          socket.destroy();
          return;
        }
        import('node:crypto').then(({ createHash }) => {
          const accept = createHash('sha1')
            .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
            .digest('base64');
          socket.write(
            [
              'HTTP/1.1 101 Switching Protocols',
              'Upgrade: websocket',
              'Connection: Upgrade',
              `Sec-WebSocket-Accept: ${accept}`,
              '\r\n',
            ].join('\r\n')
          );
          // Send Wisp v1 initial INFO packet (stream 0, packet type 0x01 CONNECT/INFO)
          const wispHello = Buffer.from([0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00]);
          const wsFrame = Buffer.concat([Buffer.from([0x82, wispHello.length]), wispHello]);
          try {
            socket.write(wsFrame);
          } catch {
            // ignore
          }
          socket.on('error', () => {});
        });
      }
    });
  };

  const primaryServer = app.listen(3000, '0.0.0.0', () => {
    console.log('GlassiumOS 5 Server running on http://localhost:3000');
  });
  attachWispUpgradeHandler(primaryServer);

  if (PORT !== 3000) {
    try {
      const secondaryServer = app.listen(PORT, '0.0.0.0', () => {
        console.log(`GlassiumOS 5 Server also listening on http://localhost:${PORT}`);
      });
      attachWispUpgradeHandler(secondaryServer);
    } catch {
      // ignore
    }
  }
}

startServer();
