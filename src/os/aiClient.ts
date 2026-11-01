export interface AIAction {
  type: string;
  target?: string;
  value?: string;
  label?: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatRequestParams {
  message: string;
  history?: Array<{ role: string; content?: string; text?: string }>;
  systemContext?: Record<string, unknown>;
  apiKey?: string;
}

export interface AIChatResponse {
  reply: string;
  action?: AIAction;
  osAction?: AIAction;
  model?: string;
}

/**
 * Safe recursive-descent arithmetic parser (no eval / no Function constructor).
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

async function queryBrowserWikipedia(rawQuery: string): Promise<string | null> {
  const cleaned = rawQuery
    .replace(/(とは|って何|について教えて|について|を教えて|の意味|って誰|ってどこ|what is|who is|tell me about)/gi, '')
    .replace(/[?？!！。、]/g, '')
    .trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 50) return null;

  const isJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(cleaned);
  const lang = isJapanese ? 'ja' : 'en';

  try {
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleaned)}&utf8=&format=json&srlimit=1&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(3000) });
    if (!searchRes.ok) return null;
    const searchData = (await searchRes.json()) as {
      query?: { search?: Array<{ title: string }> };
    };
    const topHit = searchData.query?.search?.[0];
    if (!topHit?.title) return null;

    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topHit.title)}`;
    const sumRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(3000) });
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

function makeAction(type: string, target: string, label: string): AIAction {
  return { type, target, value: target, label };
}

function withNormalizedAction(res: AIChatResponse): AIChatResponse {
  if (res.action) {
    const targetVal = String(res.action.target ?? res.action.value ?? '');
    const normalized: AIAction = {
      type: res.action.type,
      target: targetVal,
      value: targetVal,
      label: res.action.label || targetVal,
    };
    return {
      ...res,
      action: normalized,
      osAction: normalized,
    };
  }
  return res;
}

async function generateSmartLocalFallback(userPrompt: string): Promise<AIChatResponse> {
  const msg = userPrompt.trim();
  const lower = msg.toLowerCase();

  // 1. Editor Writing & Grammar Prompts
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
    return { reply: fixed || rawBody, model: 'glassium-5-local-writer' };
  }

  if (msg.includes('箇条書きで簡潔に要約') || msg.includes('3〜5個の箇条書きで簡潔に要約')) {
    const parts = msg.split(/\n\n+/);
    const rawBody = parts.slice(1).join('\n\n').trim() || msg;
    const lines = rawBody
      .split(/[。\n.!?]+/)
      .map((s) => s.replace(/^[#\-*>\s]+/, '').trim())
      .filter((s) => s.length > 4);
    const topLines = lines.slice(0, 4);
    if (topLines.length === 0) {
      return {
        reply: '• 文書の主要なテーマと目的の整理\n• 重要なポイントの構造化\n• 次のアクションアイテムの確認',
        model: 'glassium-5-local-writer',
      };
    }
    return {
      reply: topLines.map((l) => `• ${l}`).join('\n'),
      model: 'glassium-5-local-writer',
    };
  }

  if (msg.includes('自然な続きの段落') || msg.includes('文脈に合う自然な続き')) {
    return {
      reply:
        'さらに、これらの取り組みを継続的に進めることで、全体の効率と品質をより一層高めることができます。今後は具体的なスケジュールと優先順位を明確にし、段階的な検証を行いながら着実に推進していきます。',
      model: 'glassium-5-local-writer',
    };
  }

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
    return {
      reply: `平素より大変お世話になっております。\n\n${polite}\n\nご不明な点がございましたら、お気軽にお申し付けください。引き続き何卒よろしくお願い申し上げます。`,
      model: 'glassium-5-local-writer',
    };
  }

  if (msg.includes('自然な英語に翻訳した本文のみ') || msg.includes('英語に翻訳')) {
    const parts = msg.split(/\n\n+/);
    const rawBody = parts.slice(1).join('\n\n').trim() || msg;
    if (/^[a-zA-Z0-9\s.,!?'"()-]+$/.test(rawBody)) {
      return { reply: rawBody, model: 'glassium-5-local-writer' };
    }
    return {
      reply: `Thank you for your continued support.\n\nRegarding the points noted in the document:\n"${rawBody.slice(0, 200)}"\n\nWe have organized the key requirements and action items above. Please let us know if you have any questions or feedback.`,
      model: 'glassium-5-local-writer',
    };
  }

  if (msg.includes('JSON array') || msg.includes('Break down the project task')) {
    const match = msg.match(/"([^"]+)"/);
    const taskTitle = match ? match[1] : 'Project Deliverable';
    return {
      reply: JSON.stringify([
        `Define scope & requirements for ${taskTitle}`,
        `Create initial implementation draft for ${taskTitle}`,
        `Review, test, and verify ${taskTitle}`,
      ]),
      model: 'glassium-5-local-planner',
    };
  }

  // 2. OS Shell Mode & UI Style Commands
  if (lower.includes('mac') || lower.includes('マック')) {
    return withNormalizedAction({
      reply: 'シェル環境を **macOS** モードに切り替えました。上部のメニューバーと下部のDockから操作できます。',
      action: makeAction('set_shell', 'mac', 'macOS モードに切替'),
      model: 'glassium-5-local-engine',
    });
  }
  if (lower.includes('ubuntu') || lower.includes('ウブンツ') || lower.includes('linux')) {
    return withNormalizedAction({
      reply: 'シェル環境を **Ubuntu Desktop** モードに切り替えました。',
      action: makeAction('set_shell', 'ubuntu', 'Ubuntu モードに切替'),
      model: 'glassium-5-local-engine',
    });
  }
  if (lower.includes('windows 11') || lower.includes('win11') || lower.includes('ウィンドウズ11')) {
    return withNormalizedAction({
      reply: 'シェル環境を **Windows 11** モードに切り替えました。',
      action: makeAction('set_shell', 'windows11', 'Windows 11 モードに切替'),
      model: 'glassium-5-local-engine',
    });
  }
  if (lower.includes('windows 10') || lower.includes('win10') || lower.includes('ウィンドウズ10')) {
    return withNormalizedAction({
      reply: 'シェル環境を **Windows 10** モードに切り替えました。',
      action: makeAction('set_shell', 'windows10', 'Windows 10 モードに切替'),
      model: 'glassium-5-local-engine',
    });
  }
  if (lower.includes('windows 8') || lower.includes('win8') || lower.includes('ウィンドウズ8')) {
    return withNormalizedAction({
      reply: 'シェル環境を **Windows 8.1** モードに切り替えました。',
      action: makeAction('set_shell', 'windows8', 'Windows 8.1 モードに切替'),
      model: 'glassium-5-local-engine',
    });
  }
  if (lower.includes('dex') || lower.includes('デックス')) {
    return withNormalizedAction({
      reply: 'シェル環境を **DeX Workstation** モードに切り替えました。',
      action: makeAction('set_shell', 'dex', 'DeX モードに切替'),
      model: 'glassium-5-local-engine',
    });
  }
  if (lower.includes('chromeos') || lower.includes('chrome os')) {
    return withNormalizedAction({
      reply: 'シェル環境を **ChromeOS** モードに切り替えました。',
      action: makeAction('set_shell', 'chromeos', 'ChromeOS モードに切替'),
      model: 'glassium-5-local-engine',
    });
  }
  if (lower.includes('glassium') && (lower.includes('mode') || lower.includes('モード') || lower.includes('ui'))) {
    return withNormalizedAction({
      reply: 'シェル環境を **GlassiumOS 5** 標準モードに切り替えました。',
      action: makeAction('set_shell', 'windows', 'GlassiumOS 5 モードに切替'),
      model: 'glassium-5-local-engine',
    });
  }

  // 3. Theme / Dark / Light Mode
  if (lower.includes('ダークモード') || lower.includes('dark mode') || lower.includes('暗く')) {
    return withNormalizedAction({
      reply: 'システムテーマを **ダークモード** に設定しました。',
      action: makeAction('set_theme', 'dark', 'ダークモードを適用'),
      model: 'glassium-5-local-engine',
    });
  }
  if (lower.includes('ライトモード') || lower.includes('light mode') || lower.includes('明るく')) {
    return withNormalizedAction({
      reply: 'システムテーマを **ライトモード** に設定しました。',
      action: makeAction('set_theme', 'light', 'ライトモードを適用'),
      model: 'glassium-5-local-engine',
    });
  }

  // 4. Wallpapers & Live Aurora
  if (lower.includes('壁紙') || lower.includes('wallpaper') || lower.includes('背景') || lower.includes('オーロラ') || lower.includes('aurora')) {
    if (lower.includes('桜') || lower.includes('sakura')) {
      return withNormalizedAction({
        reply: 'ライブ壁紙を **Sakura Silk** に変更しました。',
        action: makeAction('set_aurora', 'sakura-silk', 'Sakura Silk 壁紙を適用'),
        model: 'glassium-5-local-engine',
      });
    }
    if (lower.includes('サイバー') || lower.includes('cyber') || lower.includes('grid')) {
      return withNormalizedAction({
        reply: 'ライブ壁紙を **Cyber Grid** に変更しました。',
        action: makeAction('set_aurora', 'cyber-grid', 'Cyber Grid 壁紙を適用'),
        model: 'glassium-5-local-engine',
      });
    }
    if (lower.includes('星') || lower.includes('starlight') || lower.includes('星座')) {
      return withNormalizedAction({
        reply: 'ライブ壁紙を **Starlight Pulse** に変更しました。',
        action: makeAction('set_aurora', 'starlight-pulse', 'Starlight Pulse 壁紙を適用'),
        model: 'glassium-5-local-engine',
      });
    }
    return withNormalizedAction({
      reply: '壁紙を **2D Aurora Live Wallpaper** に設定しました。',
      action: makeAction('set_wallpaper', 'live2d', '2D Aurora 壁紙を適用'),
      model: 'glassium-5-local-engine',
    });
  }

  // 5. App Launchers
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
      return withNormalizedAction({
        reply: `**${app.name}** を起動しました。`,
        action: makeAction('open_app', app.id, `${app.name} を開く`),
        model: 'glassium-5-local-engine',
      });
    }
  }

  // 6. Safe Math Evaluation
  const mathAns = evaluateSafeMath(msg);
  if (mathAns) {
    return { reply: mathAns, model: 'glassium-5-local-math' };
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
      model: 'glassium-5-local-clock',
    };
  }

  // 8. Wikipedia Lookup
  const wiki = await queryBrowserWikipedia(msg);
  if (wiki) {
    return { reply: wiki, model: 'glassium-5-knowledge' };
  }

  // 9. Default Structured Response
  return {
    reply: `「**${msg.slice(0, 60)}**」についての回答です：\n\n1. **要点整理**: 目的と優先順位を明確にし、シンプルな手順に分割して進めることが効果的です。\n2. **GlassiumOS 5 での活用**: **Editor** アプリでの文書作成・要約、**Kanban Board** でのタスク分割、または **Glassium Studio** でのコード検証と連携できます。\n3. **システムコマンド**: 「設定を開いて」「macOSモードにして」「壁紙をSakura Silkにして」などの操作も直接指示できます。`,
    model: 'glassium-5-local-engine',
  };
}

/**
 * Unified AI client for GlassiumOS 5.
 * Supports both `requestAIChat({ message, history, systemContext })` and `requestAIChat(messagesArray, systemContext)`.
 */
export async function requestAIChat(
  input: AIChatMessage[] | AIChatRequestParams | string,
  systemContextArg?: Record<string, unknown>
): Promise<AIChatResponse> {
  let messages: AIChatMessage[] = [];
  let systemContext: Record<string, unknown> | undefined = systemContextArg;

  if (typeof input === 'string') {
    messages = [{ role: 'user', content: input }];
  } else if (Array.isArray(input)) {
    messages = input;
  } else if (input && typeof input === 'object' && 'message' in input) {
    const hist: AIChatMessage[] = Array.isArray(input.history)
      ? input.history.map((h) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: String(h.content ?? h.text ?? ''),
        }))
      : [];
    messages = [...hist, { role: 'user', content: String(input.message || '') }];
    if (input.systemContext) {
      systemContext = input.systemContext;
    }
  }

  const lastUserMsg = messages[messages.length - 1]?.content || '';

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, systemContext }),
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = (await res.json()) as AIChatResponse;
        if (data && typeof data.reply === 'string' && data.reply.trim()) {
          return withNormalizedAction(data);
        }
      }
    }
  } catch {
    // Fall through to local fallback engine
  }

  return generateSmartLocalFallback(lastUserMsg);
}
