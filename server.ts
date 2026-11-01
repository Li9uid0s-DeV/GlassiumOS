import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  content?: string;
  text?: string;
}

interface ActionPayload {
  type:
    | 'open_app'
    | 'set_shell'
    | 'set_theme'
    | 'apply_theme'
    | 'set_wallpaper'
    | 'set_aurora'
    | 'set_glass'
    | 'lock_system'
    | 'snap_windows'
    | 'none';
  target?: string;
  label?: string;
}

function evaluateSafeMath(expr: string): number | null {
  const normalized = expr
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/×|✕|＊/g, '*')
    .replace(/÷|／/g, '/')
    .replace(/＋/g, '+')
    .replace(/－|ー/g, '-')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/(\d+)\s*の\s*(\d+)\s*乗/g, 'Math.pow($1,$2)')
    .replace(/\^/g, '**')
    .replace(/ルート\s*(\d+(\.\d+)?)|√\s*(\d+(\.\d+)?)/g, 'Math.sqrt($1$3)');

  const cleaned = normalized
    .replace(/Math\.pow|Math\.sqrt/g, (m) => (m === 'Math.pow' ? '__POW__' : '__SQRT__'))
    .replace(/[^0-9+\-*/().%,\s_POWSQRT]/g, '')
    .replace(/__POW__/g, 'Math.pow')
    .replace(/__SQRT__/g, 'Math.sqrt')
    .trim();

  if (!cleaned || !/[0-9]/.test(cleaned)) return null;
  if (!/[+\-*/%]|Math\./.test(cleaned)) return null;
  try {
    const val = Function(`"use strict"; return (${cleaned});`)();
    return typeof val === 'number' && Number.isFinite(val) ? Number(val.toFixed(8)) : null;
  } catch {
    return null;
  }
}

function detectExplicitOSAction(raw: string): { reply: string; action: ActionPayload } | null {
  const q = raw.trim().toLowerCase();
  const isQuestion =
    /(とは|って何|ってなに|なぜ|どうして|理由|歴史|仕組み|意味|違い|方法|作り方|教えて|ですか|ますか|\?|？)/.test(q) &&
    !/(開いて|起動|切り替え|変更|にして|ロックして|スリープにして|整列して)/.test(q);

  if (isQuestion) return null;

  const hasCommandVerb =
    /(開いて|開く|起動|立ち上げ|切り替え|変更|にして|モード|ロック|スリープ|並べて|整列|open|launch|switch|set)/.test(q);

  // 1. Aurora customization
  if ((q.includes('オーロラ') || q.includes('aurora')) && (hasCommandVerb || q.length <= 16)) {
    if (q.includes('エメラルド') || q.includes('emerald') || q.includes('緑')) {
      return {
        reply: 'オーロラ背景を「エメラルド & スカイ」に切り替えました。',
        action: { type: 'set_aurora', target: 'emerald-sky', label: 'エメラルドを適用' },
      };
    }
    if (q.includes('ローズ') || q.includes('rose') || q.includes('ピンク') || q.includes('ゴールド')) {
      return {
        reply: 'オーロラ背景を「ローズ & アンバー」に切り替えました。',
        action: { type: 'set_aurora', target: 'rose-gold', label: 'ローズを適用' },
      };
    }
    if (q.includes('オーシャン') || q.includes('ocean') || q.includes('青') || q.includes('ブルー')) {
      return {
        reply: 'オーロラ背景を「ディープオーシャン」に切り替えました。',
        action: { type: 'set_aurora', target: 'ocean-blue', label: 'オーシャンを適用' },
      };
    }
    if (q.includes('サンセット') || q.includes('マゼンタ') || q.includes('sunset') || q.includes('紫')) {
      return {
        reply: 'オーロラ背景を「マゼンタ & サンセット」に切り替えました。',
        action: { type: 'set_aurora', target: 'sunset-magenta', label: 'サンセットを適用' },
      };
    }
    return {
      reply: '2D オーロラライブ背景を適用しました。設定アプリの「Display & Wallpaper」から色や速度も調整できます。',
      action: { type: 'set_aurora', target: 'cyan-violet', label: 'オーロラ背景を適用' },
    };
  }

  // 2. 3D Glass Curvature / Jelly Wobble
  if ((q.includes('湾曲') || q.includes('プルプル')) && hasCommandVerb) {
    return {
      reply: '2.5Dガラスのレンズ湾曲度とプルプル弾性を強化しました。',
      action: { type: 'set_glass', target: '78', label: 'ガラス質感を強化' },
    };
  }

  // 3. Sleep / Lock screen
  if ((q.includes('スリープ') || q.includes('ロック') || q === 'sleep' || q === 'lock') && (hasCommandVerb || q.length <= 10)) {
    return {
      reply: 'スリープ（ロック画面）を起動します。画面をクリックまたはスワイプすると解除できます。',
      action: { type: 'lock_system', label: 'スリープにする' },
    };
  }

  // 4. App Launches (only when user intends to open an app)
  if (hasCommandVerb || q.length <= 10) {
    if (q.includes('設定') || q === 'settings') {
      return {
        reply: '設定アプリを起動しました。壁紙、サウンド、テーマを調整できます。',
        action: { type: 'open_app', target: 'settings', label: '設定を開く' },
      };
    }
    if (q.includes('ブラウザ') || q === 'browser') {
      return {
        reply: 'ブラウザを起動しました。',
        action: { type: 'open_app', target: 'browser', label: 'ブラウザを開く' },
      };
    }
    if (q.includes('音楽') || q.includes('ミュージック') || q === 'music' || q === 'synth') {
      return {
        reply: 'ミュージックプレイヤーを起動しました。',
        action: { type: 'open_app', target: 'synth', label: '音楽を開く' },
      };
    }
    if (q.includes('ターミナル') || q.includes('端末') || q === 'terminal') {
      return {
        reply: 'ターミナルを起動しました。',
        action: { type: 'open_app', target: 'terminal', label: 'ターミナルを開く' },
      };
    }
    if (q.includes('ストア') || q === 'store' || q === 'appstore') {
      return {
        reply: 'アプリストアを起動しました。',
        action: { type: 'open_app', target: 'appstore', label: 'ストアを開く' },
      };
    }
    if (q.includes('ゲーム') || q === 'game' || q === '2048' || q.includes('スネーク')) {
      return {
        reply: 'ゲームセンターを起動しました。Velocity 3D、3D Maze、2048、Neon Snake、Glass Breakerをプレイできます。',
        action: { type: 'open_app', target: 'game', label: 'ゲームを開く' },
      };
    }
    if ((q.includes('電卓') || q === 'calculator') && !/[0-9]/.test(q)) {
      return {
        reply: '電卓アプリを起動しました。',
        action: { type: 'open_app', target: 'calculator', label: '電卓を開く' },
      };
    }
    if (q.includes('メモ帳') || q.includes('エディタ') || q === 'notepad' || q === 'editor') {
      return {
        reply: 'エディタを起動しました。',
        action: { type: 'open_app', target: 'notepad', label: 'エディタを開く' },
      };
    }
    if (q.includes('ファイル') || q.includes('エクスプローラー') || q === 'explorer' || q === 'files') {
      return {
        reply: 'ファイルアプリを起動しました。',
        action: { type: 'open_app', target: 'explorer', label: 'ファイルを開く' },
      };
    }
  }

  // 5. Shell switching
  if (hasCommandVerb) {
    if (q.includes('mac') || q.includes('マック')) {
      return {
        reply: 'macOSレイアウトに切り替えました。',
        action: { type: 'set_shell', target: 'mac', label: 'macOSに切替' },
      };
    }
    if (q.includes('windows 11') || q.includes('win11')) {
      return {
        reply: 'Windows 11レイアウトに切り替えました。',
        action: { type: 'set_shell', target: 'windows11', label: 'Windows 11に切替' },
      };
    }
    if (q.includes('windows 10') || q.includes('win10')) {
      return {
        reply: 'Windows 10レイアウトに切り替えました。',
        action: { type: 'set_shell', target: 'windows10', label: 'Windows 10に切替' },
      };
    }
    if (q.includes('vista') || q.includes('ビスタ')) {
      return {
        reply: 'Windows Vista Aeroレイアウトに切り替えました。',
        action: { type: 'set_shell', target: 'vista', label: 'Vistaに切替' },
      };
    }
    if (q.includes('xp')) {
      return {
        reply: 'Windows XPレイアウトに切り替えました。',
        action: { type: 'set_shell', target: 'xp', label: 'XPに切替' },
      };
    }
    if (q.includes('整列') || q.includes('スナップ') || q.includes('並べて')) {
      return {
        reply: '開いているウィンドウを左右50:50に整列しました。',
        action: { type: 'snap_windows', target: '50-50', label: 'ウィンドウを整列' },
      };
    }
  }

  return null;
}

function extractSearchTopic(raw: string): string {
  return raw
    .replace(/^[「『（(]+|[」』）)?？!！。、\s]+$/g, '')
    .replace(
      /(について詳しく教えて|について教えて|をわかりやすく教えて|を教えて|とは何ですか|とはなんですか|って何ですか|ってなんですか|とは何|とはなに|って何|ってなに|って誰|とは誰|はどこにある|はどこ|の意味を教えて|の意味は|の意味|の仕組み|の歴史|の作り方|のやり方|の方法|の違い|なぜ|どうして|とは|って|ください|おしえて|教えて)$/g,
      ''
    )
    .replace(/^(ねえ|あの|質問ですが|質問|すみません|ちょっと|えっと)[、,\s]*/g, '')
    .trim();
}

async function fetchWikipediaSummary(query: string): Promise<{ title: string; extract: string } | null> {
  const topic = extractSearchTopic(query);
  if (!topic || topic.length < 1 || topic.length > 80) return null;

  const tryWikiLang = async (lang: 'ja' | 'en', searchStr: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      // 1. Direct summary lookup
      const directUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchStr)}`;
      const directResp = await fetch(directUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'GlassiumOS/4.0 (AI Assistant Q&A)' },
      });
      if (directResp.ok) {
        const data = (await directResp.json()) as { type?: string; title?: string; extract?: string };
        if (data.extract && data.type !== 'disambiguation' && data.extract.length > 25) {
          clearTimeout(timer);
          return { title: data.title || searchStr, extract: data.extract };
        }
      }

      // 2. Search API fallback for natural language queries
      const searchApiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        searchStr
      )}&utf8=1&format=json&srlimit=1`;
      const searchResp = await fetch(searchApiUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'GlassiumOS/4.0 (AI Assistant Q&A)' },
      });
      if (searchResp.ok) {
        const searchData = (await searchResp.json()) as {
          query?: { search?: Array<{ title: string }> };
        };
        const topTitle = searchData.query?.search?.[0]?.title;
        if (topTitle) {
          const sumUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`;
          const sumResp = await fetch(sumUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'GlassiumOS/4.0 (AI Assistant Q&A)' },
          });
          if (sumResp.ok) {
            const sumData = (await sumResp.json()) as { title?: string; extract?: string };
            if (sumData.extract && sumData.extract.length > 20) {
              clearTimeout(timer);
              return { title: sumData.title || topTitle, extract: sumData.extract };
            }
          }
        }
      }
    } catch {
      // ignore timeout/network error
    } finally {
      clearTimeout(timer);
    }
    return null;
  };

  const jaRes = await tryWikiLang('ja', topic);
  if (jaRes) return jaRes;
  if (topic !== query.trim()) {
    const jaFull = await tryWikiLang('ja', query.trim());
    if (jaFull) return jaFull;
  }
  const enRes = await tryWikiLang('en', topic);
  return enRes;
}

async function getIntelligentLocalResponse(
  message: string,
  history?: ChatMessage[]
): Promise<{ reply: string; action: ActionPayload | null; model: string }> {
  const raw = (message || '').trim();
  const q = raw.toLowerCase();

  // 1. Check explicit OS control command first
  const osAction = detectExplicitOSAction(raw);
  if (osAction) {
    return { ...osAction, model: 'Glassium-AI' };
  }

  // 2. Math calculation
  const mathResult = evaluateSafeMath(raw);
  if (mathResult !== null) {
    return {
      reply: `計算結果は **${mathResult.toLocaleString('ja-JP')}** です。\n\n（式: \`${raw}\` ＝ \`${mathResult}\`）`,
      action: null,
      model: 'Glassium-AI',
    };
  }

  // 3. Greetings & Conversational Q&A
  if (/^(こんにちは|こんばんは|おはよう|おはようございます|やあ|ハロー|hello|hi|hey|ヤッホー)[!！。、\s]*$/i.test(raw)) {
    return {
      reply:
        'こんにちは！GlassiumOS-V4.0 のAIアシスタントです。\n調べたいことや疑問、プログラミング、翻訳、文章作成、雑談、OSの操作まで何でも気軽に質問してください！今日はどんなことをお伝いしましょうか？',
      action: null,
      model: 'Glassium-AI',
    };
  }

  if (q.includes('ありがとう') || q.includes('感謝') || q.includes('助かった') || q.includes('thank')) {
    return {
      reply: 'どういたしまして！お役に立てて嬉しいです。他にも気になることや質問があれば、いつでも話しかけてくださいね。',
      action: null,
      model: 'Glassium-AI',
    };
  }

  if (
    q.includes('何ができる') ||
    q.includes('なにができる') ||
    q.includes('使い方') ||
    q.includes('あなたは誰') ||
    q.includes('君は誰') ||
    q.includes('自己紹介')
  ) {
    return {
      reply:
        '私は **GlassiumOS-V4.0** に搭載された対話型AIアシスタントです。主に以下のような質疑応答や作業ができます：\n\n' +
        '1. **あらゆる疑問・知識の解説**: 科学、歴史、地理、IT用語、ニュース、料理レシピ、雑学などの質問に回答します。\n' +
        '2. **プログラミング & コード生成**: TypeScript / React / Python / HTML / CSS / SQL などのコード作成やバグ修正。\n' +
        '3. **文章作成・要約・翻訳**: ビジネスメール、レポート、英語⇔日本語の自然な翻訳、アイデア出し。\n' +
        '4. **計算・単位変換**: 複雑な数式（例: `128 * 45` や `2の10乗`）の即座の計算。\n' +
        '5. **OSの操作**: 「電卓を開いて」「macOSモードにして」「ウィンドウを並べて」などのシステム操作。\n\n' +
        'どんな質問でもそのまま入力してみてください！',
      action: null,
      model: 'Glassium-AI',
    };
  }

  if (q.includes('調子はどう') || q.includes('元気？') || q.includes('元気ですか')) {
    return {
      reply: 'とても快調です！2.5Dガラスコンポジタもスムーズに稼働しています。あなたのお手伝いをする準備は万端です。何か気になることはありますか？',
      action: null,
      model: 'Glassium-AI',
    };
  }

  if (q.includes('面白い話') || q.includes('ジョーク') || q.includes('ダジャレ') || q.includes('笑わせて')) {
    const jokes = [
      'プログラマーが買い物に行きました。\n妻：「牛乳を1本買ってきて。もし卵があったら6つお願い」\nプログラマーは牛乳を6本買って帰ってきました。\n妻：「なんで牛乳を6本も買ってきたの！？」\nプログラマー：「だって、卵があったから……」',
      '「AIが布団を敷いたよ。……ふとん（Python）だけに！」\n……少し冷えましたね。温かいコーヒーでもいかがですか？',
      'Wi-Fiと掛けまして、 सच्चा（本物の）友情と解きます。\nその心は……「目には見えないけれど、繋がっていると安心します」。',
    ];
    const picked = jokes[Math.floor(Math.random() * jokes.length)];
    return {
      reply: picked,
      action: null,
      model: 'Glassium-AI',
    };
  }

  if (q.includes('なぞなぞ') || q.includes('クイズ')) {
    return {
      reply:
        '**【なぞなぞ】**\nパンはパンでも、食べられないけれど料理の時に大活躍するパンは何でしょう？\n\n' +
        '……正解は **「フライパン」** です！\nもう一問出しましょうか？それとも他のジャンルのクイズがいいですか？',
      action: null,
      model: 'Glassium-AI',
    };
  }

  // 4. Date / Time questions
  if (q.includes('何時') || q.includes('今日の日付') || q.includes('今日は何日') || q.includes('何曜日') || q === '今日' || q === '今何時') {
    const now = new Date();
    return {
      reply: `現在は **${now.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })} ${now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}** です。`,
      action: null,
      model: 'Glassium-AI',
    };
  }

  // 5. Translation requests
  if (q.includes('英語で') || q.includes('英訳') || q.includes('translate')) {
    if (q.includes('よろしく') || q.includes('はじめまして')) {
      return {
        reply:
          '「よろしくお願いします / はじめまして」の英語表現はシーンによって以下のように使い分けられます：\n\n' +
          '- **初対面の挨拶**: *"Nice to meet you. I look forward to working with you."*\n' +
          '- **メールの結び（ビジネス）**: *"Thank you in advance for your cooperation."* または *"Best regards,"*\n' +
          '- **カジュアルな場面**: *"Looking forward to it!"* / *"Let\'s do our best!"*\n\n' +
          '特定の文を英訳したい場合は「『〇〇』を英語にして」と送ってください！',
        action: null,
        model: 'Glassium-AI',
      };
    }
    const quoted = raw.match(/[「『"](.+?)[」』"]/);
    if (quoted) {
      return {
        reply: `「**${quoted[1]}**」の英語表現ですね。\n\n- **標準的・丁寧な表現**: *"Could you please help me with ${quoted[1]}?"* / *"${quoted[1]}"*\n- ビジネスや日常会話など、使いたい場面を教えていただければニュアンスに合わせてさらに自然な英語に調整します！`,
        action: null,
        model: 'Glassium-AI',
      };
    }
  }

  // 6. Programming / Coding questions
  if (q.includes('react') || q.includes('コンポーネント') || q.includes('usestate')) {
    return {
      reply:
        'React（TypeScript）で状態管理を行うクリーンな関数コンポーネントの例です：\n\n```tsx\nimport { useState } from "react";\n\nexport function CounterCard() {\n  const [count, setCount] = useState<number>(0);\n\n  return (\n    <div className="p-4 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/10 text-white">\n      <p className="text-sm font-semibold">現在のカウント: {count}</p>\n      <div className="flex gap-2 mt-3">\n        <button onClick={() => setCount(c => c + 1)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-bold">+1</button>\n        <button onClick={() => setCount(0)} className="px-3 py-1.5 rounded-lg bg-white/10">リセット</button>\n      </div>\n    </div>\n  );\n}\n```\nフック（`useEffect` や `useMemo`）の使い方も必要であれば解説します！',
      action: null,
      model: 'Glassium-AI',
    };
  }

  if (q.includes('typescript') || q.includes('javascript') || q.includes('配列') || q.includes('重複')) {
    return {
      reply:
        'TypeScript / JavaScript の実用的な配列操作パターンです：\n\n```ts\n// 1. 重複の除去\nconst unique = [...new Set([1, 2, 2, 3, 4])];\n\n// 2. 条件でフィルタリング＆変換\nconst activeNames = users\n  .filter(user => user.isActive)\n  .map(user => user.name);\n\n// 3. 非同期データの取得 (async/await)\nasync function fetchData<T>(url: string): Promise<T> {\n  const res = await fetch(url);\n  if (!res.ok) throw new Error(`HTTP ${res.status}`);\n  return res.json();\n}\n```\n具体的に書きたい処理があれば教えてください！',
      action: null,
      model: 'Glassium-AI',
    };
  }

  if (q.includes('python') || q.includes('パイソン')) {
    return {
      reply:
        'Pythonでよく使われるデータ処理とクラス・関数の実装例です：\n\n```python\nfrom typing import List, Dict\n\ndef summarize_scores(scores: List[int]) -> Dict[str, float]:\n    if not scores:\n        return {"avg": 0.0, "max": 0, "min": 0}\n    return {\n        "avg": round(sum(scores) / len(scores), 2),\n        "max": max(scores),\n        "min": min(scores),\n    }\n\nprint(summarize_scores([85, 92, 78, 96]))\n# {\'avg\': 87.75, \'max\': 96, \'min\': 78}\n```\nスクレイピング、機械学習、自動化スクリプトなども作成できます！',
      action: null,
      model: 'Glassium-AI',
    };
  }

  if (q.includes('html') || q.includes('css') || (q.includes('ガラス') && q.includes('コード'))) {
    return {
      reply:
        '2.5D グラスモフィズム（すりガラス質感）を実現するHTML & CSSコード例です：\n\n```css\n.glass-panel {\n  background: rgba(15, 23, 42, 0.42);\n  backdrop-filter: blur(20px) saturate(190%);\n  -webkit-backdrop-filter: blur(20px) saturate(190%);\n  border: 1px solid rgba(255, 255, 255, 0.12);\n  border-radius: 18px;\n  box-shadow:\n    0 24px 60px rgba(0, 0, 0, 0.55),\n    inset 0 1px 1px rgba(255, 255, 255, 0.22);\n}\n```',
      action: null,
      model: 'Glassium-AI',
    };
  }

  // 7. Popular everyday topics (Cooking, Study, Sleep, Health)
  if (q.includes('カレー') && (q.includes('作り方') || q.includes('レシピ') || q.includes('美味'))) {
    return {
      reply:
        '**【コクが劇的に深まる美味しいカレーの作り方】**\n\n' +
        '1. **玉ねぎをあめ色になるまで炒める**: 強火〜中火で少し塩を振って水分を飛ばし、差し水をしながら15分ほど炒めると甘みが凝縮します。\n' +
        '2. **お肉に焼き目をつける**: 先にニンニク・生姜と一緒に表面をカリッと焼いて旨味を閉じ込めます。\n' +
        '3. **水を入れて20分煮込む**: アクを丁寧にすくい、具材が柔らかくなるまで煮ます。\n' +
        '4. **一度火を止めてからルーを溶かす**: 沸騰したままだと小麦粉がダマになるため、必ず火を止めて溶かします。\n' +
        '5. **隠し味**: 仕上げに「インスタントコーヒー小さじ1」「ウスターソース小さじ2」「バター10g」を入れると専門店のような深いコクが出ます！',
      action: null,
      model: 'Glassium-AI',
    };
  }

  if (q.includes('勉強') || q.includes('集中') || q.includes('やる気') || q.includes('モチベーション')) {
    return {
      reply:
        '**【集中力とやる気を引き出す3つの科学的テクニック】**\n\n' +
        '1. **5分だけ始める（作業興奮の活用）**: 脳の側坐核は「行動し始めてから」やる気ホルモン（ドーパミン）を出します。「まず1問だけ」「5分だけ」と決めて着手するのが最も効果的です。\n' +
        '2. **ポモドーロ・テクニック（25分集中＋5分休憩）**: 25分タイマーをセットし、途中であっても時間が来たら必ず5分休むことで、脳の疲労を防ぎ高い集中力を維持できます（OS内のClockアプリも活用できます）。\n' +
        '3. **スマホを視界から外す**: 視界にスマホがあるだけで認知能力が低下することが研究で分かっています。別の部屋やカバンにしまうだけで集中度が大幅に上がります。',
      action: null,
      model: 'Glassium-AI',
    };
  }

  // 8. Live Wikipedia / Knowledge Base lookup for factual questions ("〇〇とは？", "日本の首都は？", "織田信長について", etc.)
  const wikiResult = await fetchWikipediaSummary(raw);
  if (wikiResult) {
    return {
      reply: `### ${wikiResult.title}\n\n${wikiResult.extract}\n\n---\n💡 さらに詳しい背景や関連するトピックについて知りたい場合は、続けて質問してください！`,
      action: null,
      model: 'Glassium-AI',
    };
  }

  // 9. Context-aware follow-up handling ("もっと詳しく", "例えば？", "要約して")
  if (Array.isArray(history) && history.length > 1) {
    const lastModelMsg = [...history]
      .reverse()
      .find((m) => m.role === 'model' || m.role === 'assistant');
    const lastText = lastModelMsg?.content || lastModelMsg?.text || '';
    if (lastText && /(詳しく|具体例|例えば|たとえば|つまり|要約|まとめ|簡単に)/.test(q)) {
      return {
        reply:
          `直前の内容について、さらに分かりやすくポイントを整理しますね：\n\n` +
          `- **核心のポイント**: ${lastText.slice(0, 140).replace(/\n+/g, ' ')}...\n` +
          `- **実践・応用の視点**: 基本の仕組みを押さえた上で、具体的なケースに当てはめて段階的に試すのが効果的です。\n\n` +
          `特にどの部分（背景・手順・具体例など）を深掘りしたいか教えていただければ、そこを重点的に解説します！`,
        action: null,
        model: 'Glassium-AI',
      };
    }
  }

  // 10. Thoughtful general Q&A fallback (never a robotic feature list)
  const topic = extractSearchTopic(raw) || raw;
  return {
    reply:
      `「**${topic}**」についてのご質問ですね。\n\n` +
      `このテーマを考える上では、以下の3つの視点が重要になります：\n\n` +
      `1. **基本概念と背景**: 「${topic}」は、目的や文脈によって複数の側面を持っています。まず前提となる定義や目的を明確にすることで理解が深まります。\n` +
      `2. **具体的なアプローチ**: 実際に取り組む・調べる際は、全体像を把握してから細部のステップ（手順・比較・メリットと注意点）に分解するのが効果的です。\n` +
      `3. **次のステップ**: もし「${topic}」に関して、**具体的なキーワード（人物名・技術名・用語）**や**知りたい角度（歴史・仕組み・コード例・翻訳など）**があれば、ぜひ教えてください。ピンポイントで詳しくお答えします！`,
    action: null,
    model: 'Glassium-AI',
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      geminiAvailable: Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY),
    });
  });

  // Web Reverse Proxy Endpoint for Browser & jsDelivr / GitHub Pages
  app.get('/api/proxy', async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send('URL query parameter required');
    }

    let targetUrl = rawUrl.trim();

    // Transform github.com/owner/repo to jsDelivr CDN for direct previewing
    const ghRepoMatch = targetUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(\/?.*)?$/i);
    if (ghRepoMatch) {
      const owner = ghRepoMatch[1];
      const repo = ghRepoMatch[2].replace(/\.git$/i, '');
      const sub = ghRepoMatch[3] && ghRepoMatch[3].length > 1 ? ghRepoMatch[3] : '/index.html';
      targetUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@latest${sub}`;
    } else if (/^(jsdelivr|gh):/i.test(targetUrl)) {
      const repoPath = targetUrl.replace(/^(jsdelivr|gh):\/+/i, '').replace(/^(jsdelivr|gh):/i, '');
      const parts = repoPath.split('/');
      if (parts.length >= 2) {
        const owner = parts[0];
        const repo = parts[1].replace(/\.git$/i, '');
        const rest = parts.slice(2).join('/') || 'index.html';
        targetUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@latest/${rest}`;
      }
    } else if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    // Auto-optimize DuckDuckGo queries and homepage to pure HTML version for iframe compatibility
    if (
      targetUrl === 'https://duckduckgo.com' ||
      targetUrl === 'https://duckduckgo.com/' ||
      targetUrl.includes('duckduckgo.com/?q=') ||
      targetUrl.includes('duckduckgo.com?q=')
    ) {
      if (targetUrl === 'https://duckduckgo.com' || targetUrl === 'https://duckduckgo.com/') {
        targetUrl = 'https://html.duckduckgo.com/html/';
      } else {
        targetUrl = targetUrl.replace(/https?:\/\/duckduckgo\.com\/?\?q=/i, 'https://html.duckduckgo.com/html/?q=');
      }
    }

    const fetchWithFallback = async (urlToFetch: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const resp = await fetch(urlToFetch, {
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          },
        });
        clearTimeout(timeout);
        return resp;
      } catch (e) {
        clearTimeout(timeout);
        throw e;
      }
    };

    try {
      let response = await fetchWithFallback(targetUrl);

      if (!response.ok && (response.status === 404 || response.status >= 500)) {
        const ghPagesMatch = targetUrl.match(/^https?:\/\/([^.]+)\.github\.io\/([^/]+)(\/.*)?$/i);
        if (ghPagesMatch) {
          const owner = ghPagesMatch[1];
          const repo = ghPagesMatch[2];
          const subPath = !ghPagesMatch[3] || ghPagesMatch[3] === '/' ? '/index.html' : ghPagesMatch[3];
          const jsDelivrUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@latest${subPath}`;
          const fallbackResp = await fetchWithFallback(jsDelivrUrl);
          if (fallbackResp.ok) {
            targetUrl = jsDelivrUrl;
            response = fallbackResp;
          } else {
            // Try raw github
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main${subPath}`;
            const rawResp = await fetchWithFallback(rawUrl);
            if (rawResp.ok) {
              targetUrl = rawUrl;
              response = rawResp;
            }
          }
        }
      }

      const parsed = new URL(targetUrl);
      let contentType = response.headers.get('content-type') || 'text/html; charset=utf-8';

      const isJsDelivrOrRaw =
        parsed.hostname.includes('jsdelivr.net') || parsed.hostname.includes('githubusercontent.com');
      if (
        isJsDelivrOrRaw &&
        (parsed.pathname.endsWith('.html') || parsed.pathname.endsWith('.htm') || parsed.pathname.endsWith('/'))
      ) {
        contentType = 'text/html; charset=utf-8';
      }

      res.setHeader('Content-Type', contentType);
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Content-Type-Options');
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (contentType.includes('text/html')) {
        let html = await response.text();
        const baseHref = `${parsed.protocol}//${parsed.host}${parsed.pathname.substring(0, parsed.pathname.lastIndexOf('/') + 1) || '/'}`;

        const scriptInjection = `
          <base href="${baseHref}">
          <script>
            (function() {
              window.addEventListener('click', function(e) {
                var a = e.target.closest('a');
                if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
                  e.preventDefault();
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(a.href);
                }
              }, true);
            })();
          </script>
        `;

        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(/<head[^>]*>/i, (match) => `${match}${scriptInjection}`);
        } else {
          html = scriptInjection + html;
        }

        return res.send(html);
      } else {
        const buffer = await response.arrayBuffer();
        return res.send(Buffer.from(buffer));
      }
    } catch (err: unknown) {
      console.error('Proxy error:', err);
      return res.status(502).send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family:sans-serif;background:#09090b;color:#f4f4f5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="max-width:420px;padding:2rem;background:rgba(255,255,255,0.04);border-radius:1rem;text-align:center;">
              <h1 style="font-size:1rem;color:#38bdf8;">ページの読み込みに失敗しました</h1>
              <p style="font-size:0.8rem;color:rgba(255,255,255,0.6);">${rawUrl}</p>
              <button onclick="window.location.reload()" style="background:#38bdf8;color:#000;font-weight:600;border:none;padding:0.5rem 1.2rem;border-radius:0.5rem;cursor:pointer;">再試行</button>
            </div>
          </body>
        </html>
      `);
    }
  });

  // AI Chat Endpoint using @google/genai + Live Knowledge Fallback
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, history, context } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const explicitAction = detectExplicitOSAction(message);
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.json(await getIntelligentLocalResponse(message, history));
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const systemInstruction = `あなたは「GlassiumOS-V4.0」に搭載された優秀で親切なAIアシスタントです。
ユーザーからのあらゆる質問（一般知識、科学、歴史、ニュース、雑学、料理、健康、数学、プログラミング、翻訳、文章作成、雑談、相談など）に対して、的確・丁寧・分かりやすく日本語で回答してください。
ハッタリや定型文ではなく、質問の意図を正確に汲み取って、具体的で役に立つ回答を提供してください。`;

      // Sanitize multi-turn history so contents strictly starts with 'user' and alternates roles
      const rawHistory: Array<{ role: 'user' | 'model'; text: string }> = [];
      if (Array.isArray(history)) {
        for (const item of history.slice(-10) as ChatMessage[]) {
          const text = (item.content || item.text || '').trim();
          if (!text) continue;
          const role: 'user' | 'model' =
            item.role === 'model' || item.role === 'assistant' ? 'model' : 'user';
          rawHistory.push({ role, text });
        }
      }

      // Drop any leading 'model' greeting messages so contents[0] is guaranteed to be 'user'
      while (rawHistory.length > 0 && rawHistory[0].role !== 'user') {
        rawHistory.shift();
      }

      // Merge consecutive same-role messages
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
      for (const turn of rawHistory) {
        const prev = contents[contents.length - 1];
        if (prev && prev.role === turn.role) {
          prev.parts[0].text += `\n${turn.text}`;
        } else {
          contents.push({ role: turn.role, parts: [{ text: turn.text }] });
        }
      }

      const userPromptText = context
        ? `${message}\n\n(※現在のOS状態: ${JSON.stringify(context)})`
        : message;

      const lastTurn = contents[contents.length - 1];
      if (lastTurn && lastTurn.role === 'user') {
        lastTurn.parts[0].text = userPromptText;
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: userPromptText }],
        });
      }

      const modelsToTry = [
        'gemini-3-flash-preview',
        'gemini-2.5-flash',
        'gemini-3.8-flash',
        'gemini-flash-latest',
      ];
      let replyText = '';
      const parsedAction: ActionPayload | null = explicitAction?.action ?? null;

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
            },
          });
          if (response.text && response.text.trim()) {
            replyText = response.text.trim();
            break;
          }
        } catch (innerErr) {
          console.warn(`Model ${modelName} attempt failed:`, innerErr);
        }
      }

      if (!replyText) {
        return res.json(await getIntelligentLocalResponse(message, history));
      }

      // If user explicitly asked to run an OS command, attach the action
      if (parsedAction && parsedAction.type !== 'none') {
        return res.json({
          reply: replyText,
          action: parsedAction,
          model: 'Gemini Flash',
        });
      }

      return res.json({
        reply: replyText,
        action: null,
        model: 'Gemini Flash',
      });
    } catch (err: unknown) {
      console.warn('AI route fallback:', err);
      return res.json(await getIntelligentLocalResponse(req.body?.message || '', req.body?.history));
    }
  });

  app.use((req, _res, next) => {
    if (req.url.startsWith('/LiquidOS-')) {
      const rewritten = req.url.replace(/^\/LiquidOS-[^/]+/, '') || '/';
      req.url = rewritten;
    }
    next();
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
