/**
 * Lyric Language Detection & Bidirectional Translation Engine for GlassiumOS 5 u4 Music
 * Rules:
 * - Japanese lyrics (日本語) -> Translated into English (英語)
 * - English lyrics (英語) -> Translated into Japanese (日本語)
 * - Other languages (韓国語・中国語・スペイン語・フランス語など) -> Translated into Japanese (日本語)
 */

import { backendFetch } from './backendConfig';

export type LyricSourceLang = 'ja' | 'en' | 'other';

export interface LyricLanguageInfo {
  lang: LyricSourceLang;
  targetLang: 'en' | 'ja';
  badgeLabel: string;
}

/**
 * Detects whether a lyric line is Japanese, English, or another language.
 */
export function detectLyricLanguage(lineText: string): LyricLanguageInfo {
  const trimmed = (lineText || '').trim();
  if (!trimmed) {
    return { lang: 'en', targetLang: 'ja', badgeLabel: 'EN → JA' };
  }

  // Contains Hiragana or Katakana -> Japanese
  const hasKana = /[\u3040-\u309f\u30a0-\u30ff]/.test(trimmed);
  // Contains CJK Kanji/Hanzi
  const hasCjk = /[\u4e00-\u9faf]/.test(trimmed);
  // Contains Korean Hangul
  const hasHangul = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/.test(trimmed);
  // Contains Cyrillic or Arabic script
  const hasNonLatinScript = /[\u0410-\u044f]|[\u0621-\u064a]/.test(trimmed);
  // Contains European accented characters common in Spanish, French, German, Portuguese, Italian
  const hasEuroDiacritics = /[áéíóúñ¿¡àèùâêîôûçëïüäößãõ]/i.test(trimmed);
  // Common non-English words (Spanish/French/German/Italian/Indonesian)
  const hasOtherRomanceWords =
    /\b(quiero|amor|corazón|noche|siempre|todo|nada|vida|como|pero|para|avec|dans|toujours|monde|cette|nicht|ich|dich|liebe|nacht|siamo|questo)\b/i.test(
      trimmed
    );

  if (hasHangul) {
    return { lang: 'other', targetLang: 'ja', badgeLabel: 'KO → JA' };
  }

  if (hasKana) {
    return { lang: 'ja', targetLang: 'en', badgeLabel: 'JA → EN' };
  }

  if (hasCjk) {
    // Distinguish Japanese Kanji-only phrases from Chinese Hanzi phrases
    const commonChineseMarkers = /[的了是在有我和不人这中大为上个国到说们]/;
    if (commonChineseMarkers.test(trimmed)) {
      return { lang: 'other', targetLang: 'ja', badgeLabel: 'ZH → JA' };
    }
    return { lang: 'ja', targetLang: 'en', badgeLabel: 'JA → EN' };
  }

  if (hasNonLatinScript || hasEuroDiacritics || hasOtherRomanceWords) {
    return { lang: 'other', targetLang: 'ja', badgeLabel: '多言語 → JA' };
  }

  return { lang: 'en', targetLang: 'ja', badgeLabel: 'EN → JA' };
}

// Japanese -> English exact & phrase dictionary for instant fallback
const JA_TO_EN_LYRIC_MAP: Record<string, string> = {
  '沈むように溶けてゆくように': 'Like sinking down, like melting away into the night',
  '二人だけの空が広がる夜に': 'In the night where a sky just for the two of us unfolds',
  'さよならだけだった その一言で全てが分かった': 'It was only "goodbye", yet that single word told me everything',
  '日が沈み出した空と君の姿 フェンス越しに重なっていた': 'The setting sun in the sky and your figure overlapped beyond the fence',
  '初めて見た時から僕の心を全て奪った': 'From the very first moment I saw you, you stole my entire heart',
  'どこか儚い空気を纏う君は 寂しい目をしてたんだ': 'Wrapped in a fleeting aura, you had such lonely eyes',
  'いつだってチックタックと鳴る世界で何度だってさ': 'In a world that keeps ticking away, no matter how many times',
  '触れる心無い言葉うるさい声に 涙が零れそうでも': 'Even when heartless words and noisy voices almost make your tears fall',
  'ありきたりな喜びきっと二人なら見つけられる': 'Even ordinary happiness, I am sure the two of us can find it together',
  '騒がしい日々に笑えない君に 思い付く限り眩しい明日を': 'To you who cannot smile in these noisy days, I will bring the brightest tomorrow I can imagine',
  '明けない夜に落ちてゆく前に 僕の手を掴んでほら': 'Before falling into the endless night, come on and take my hand',
  '忘れてしまいたくて閉じ込めた日々も 抱きしめた温もりで溶かすから': 'Even the days you locked away wanting to forget, I will melt them with the warmth of my embrace',
  '怖くないよ いつか日が昇るまで 二人でいよう': 'There is nothing to fear, let us stay together until the sun rises someday',
  '無敵の笑顔で荒らすメディア': 'Taking the media by storm with an invincible smile',
  '知りたいその秘密ミステリアス': 'Everyone wants to know that mysterious secret',
  '抜けてるとこさえ彼女のエリア': 'Even her clumsy side is part of her charm',
  '完璧で嘘つきな君は 天才的なアイドル様': 'Perfect and untruthful, you are a genius idol',
  '今日何食べた？': 'What did you eat today?',
  '好きな本は？': 'What is your favorite book?',
  '遊びに行くならどこに行くの？': 'Where do you go when you hang out?',
  '何も食べてない': 'I have not eaten anything',
  'それは内緒': 'That is a secret',
  '何を聞かれても のらりくらり': 'No matter what they ask, dodging effortlessly',
  'そう淡々と だけど燦々と': 'So calmly, yet shining so brilliantly',
  '見えそうで見えない秘密は蜜の味': 'A secret almost seen yet hidden tastes like honey',
  'あれもナイナイ これもナイナイ': 'Neither that, nor this, none of it is true',
  '好きなタイプは？ 相手は？': 'What is your type? Who is your partner?',
  'さあ答えて': 'Now tell us the answer',
  '誰かを好きになることなんて 私分からなくてさ': 'Falling in love with someone is something I still do not understand',
  '嘘か本当か知り得ない': 'No one can tell whether it is a lie or the truth',
  'そんな言葉にまた一人堕ちる また好きにさせる': 'Falling for those words once again, making everyone fall in love with her',
  '誰もが目を奪われていく': 'Everyone has their eyes completely captivated',
  '君は完璧で究極のアイドル': 'You are the perfect and ultimate idol',
  '金輪際現れない 一番星の生まれ変わり': 'Never to appear again, the reincarnation of the brightest star',
  'その笑顔で愛してるで 誰も彼も虜にしていく': 'With that smile and "I love you", captivating absolutely everyone',
  'その瞳がその言葉が 嘘でもそれは完全なアイ': 'Even if those eyes and words are lies, it is still complete love',
  '夢ならばどれほどよかったでしょう': 'How wonderful it would have been if this were only a dream',
  '未だにあなたのことを夢にみる': 'Even now, I still dream of you',
  '忘れた物を取りに帰るように': 'Like going back to retrieve something left behind',
  '古びた思い出の埃を払う': 'Brushing off the dust from old memories',
  '戻らない幸せがあることを': 'That there is happiness that will never return',
  '最後にあなたが教えてくれた': 'You taught me that at the very end',
  '言えずに隠してた昏い過去も': 'Even the dark past I kept hidden without saying a word',
  'あなたがいなきゃ永遠に昏いまま': 'Without you, it would remain dark forever',
  'きっともうこれ以上傷つくことなど': 'Surely, being hurt any more than this',
  'ありはしないとわかっている': 'I know it could never happen again',
  'あの日の悲しみさえ あの日の苦しみさえ': 'Even the sadness of that day, even the pain of that day',
  'そのすべてを愛してた あなたとともに': 'I loved all of it, together with you',
  '胸に残り離れない 苦いレモンの匂い': 'The bitter scent of lemon lingers in my heart and never fades',
  '雨が降り止むまでは帰れない': 'I cannot go home until the rain stops falling',
  '今でもあなたはわたしの光': 'Even now, you are my guiding light',
  '努力 未来 a beautiful star': 'Effort, future, a beautiful shining star',
  'ケセラセラ 今日も唱える 限界などないさ': 'Que sera sera, I chant again today, there are no limits',
  'あんなに好きだったのにね': 'Even though we used to love each other so deeply',
  '君の怪獣が暴れ出す前に': 'Before the monster inside you breaks loose',
  '死ぬのがいいわ': 'I would rather die than be separated from you',
  'きらり 光る風に乗って': 'Riding on the sparkling, shining wind',
  '夜に駆ける': 'Racing into the night',
  '怪獣の花唄': 'The monster flower song',
  '白日': 'Under the pale white sun',
  'うっせぇわ': 'Shut up, I have had enough',
  '新時代 この未来だ 世界中全部変えてしまえば': 'New genesis, this is the future, if we change the whole world',
};

// English / Other -> Japanese exact & phrase dictionary for instant fallback
const EN_OTHER_TO_JA_LYRIC_MAP: Record<string, string> = {
  'drifting beyond the event horizon': '事象の地平線を超えて漂っていく',
  'photons bent in an infinite ring of light': '無限の光の輪の中で曲がる光子',
  'monochrome frequencies cutting through vacuum': '真空を切り裂くモノクロームの周波数',
  'echoes of the cosmos vibrating in stereo': 'ステレオで響き渡る宇宙の反響',
  'neon pulse synchronization complete': 'ネオンパルスの同期が完了した',
  'speed of sound colliding with quantum gravity': '音速が量子重力と衝突する',
  'stellar particles forming a crystalline mesh': '星間粒子が結晶のメッシュを形作る',
  'supernova resonance glowing in deep violet': '深い紫に輝く超新星の共鳴',
  'entering the digital troposphere': 'デジタル対流圏へと突入する',
  'infinite horizon unfolding before our eyes': '目の前に広がる無限の地平線',
  'bling-bang-bang-born': '実力と才能で頂点へと駆け上がる',
  'you are my special': 'あなたは私にとって特別な存在',
  'one more time we are gonna celebrate': 'もう一度、僕たちは祝福し踊り明かそう',
  'music got me feeling so free': '音楽が僕をこんなにも自由な気持ちにさせてくれる',
  'celebrate and dance so free': '祝おう、そして自由に踊り続けよう',
  'tonight is the night': '今夜こそがその特別な夜',
  'i love you': 'あなたを愛しています',
  'dont stop the music': '音楽を止めないで',
  'dancing in the moonlight': '月明かりの中で踊りながら',
};

// Word-level Japanese -> English glossary for compositional fallback
const JA_WORD_TO_EN: [string, string][] = [
  ['夜に駆ける', 'racing into the night'],
  ['僕たち', 'we'],
  ['私たち', 'we'],
  ['あなた', 'you'],
  ['君', 'you'],
  ['僕', 'I'],
  ['私', 'I'],
  ['心', 'heart'],
  ['世界', 'world'],
  ['未来', 'future'],
  ['明日', 'tomorrow'],
  ['今日', 'today'],
  ['昨日', 'yesterday'],
  ['涙', 'tears'],
  ['笑顔', 'smile'],
  ['言葉', 'words'],
  ['約束', 'promise'],
  ['記憶', 'memories'],
  ['思い出', 'memories'],
  ['光', 'light'],
  ['闇', 'darkness'],
  ['影', 'shadow'],
  ['夜空', 'night sky'],
  ['空', 'sky'],
  ['夜', 'night'],
  ['朝', 'morning'],
  ['星', 'stars'],
  ['月', 'moon'],
  ['太陽', 'sun'],
  ['風', 'wind'],
  ['雨', 'rain'],
  ['花', 'flowers'],
  ['海', 'ocean'],
  ['声', 'voice'],
  ['歌', 'song'],
  ['音', 'sound'],
  ['夢', 'dream'],
  ['愛', 'love'],
  ['恋', 'love'],
  ['時間', 'time'],
  ['永遠', 'forever'],
  ['奇跡', 'miracle'],
  ['運命', 'destiny'],
  ['孤独', 'solitude'],
  ['自由', 'freedom'],
  ['二人', 'the two of us'],
  ['一人', 'alone'],
  ['さよなら', 'goodbye'],
  ['ありがとう', 'thank you'],
  ['忘れない', 'never forget'],
  ['抱きしめ', 'embrace'],
  ['輝く', 'shining'],
  ['走る', 'running'],
  ['歩く', 'walking'],
];

// Word-level English -> Japanese glossary for compositional fallback
const EN_WORD_TO_JA: [RegExp, string][] = [
  [/\bi love you\b/gi, 'あなたを愛している'],
  [/\bforever and ever\b/gi, 'いつまでも永遠に'],
  [/\bin the night\b/gi, '夜の中で'],
  [/\bin the dark\b/gi, '暗闇の中で'],
  [/\bmy heart\b/gi, '私の心'],
  [/\byour eyes\b/gi, 'あなたの瞳'],
  [/\bdon't let go\b/gi, '手を離さないで'],
  [/\bhold my hand\b/gi, '私の手を握って'],
  [/\bcome with me\b/gi, '私と一緒に来て'],
  [/\bdrifting\b/gi, '漂う'],
  [/\bevent horizon\b/gi, '事象の地平線'],
  [/\bphotons\b/gi, '光子'],
  [/\binfinite\b/gi, '無限の'],
  [/\blight\b/gi, '光'],
  [/\bfrequencies\b/gi, '周波数'],
  [/\bechoes\b/gi, '反響'],
  [/\bcosmos\b/gi, '宇宙'],
  [/\bsupernova\b/gi, '超新星'],
  [/\bhorizon\b/gi, '地平線'],
  [/\bdream(?:s|ing)?\b/gi, '夢'],
  [/\blove\b/gi, '愛'],
  [/\bnight\b/gi, '夜'],
  [/\bsky\b/gi, '空'],
  [/\bstar(?:s)?\b/gi, '星'],
  [/\bworld\b/gi, '世界'],
  [/\bfuture\b/gi, '未来'],
  [/\btomorrow\b/gi, '明日'],
  [/\btonight\b/gi, '今夜'],
  [/\btogether\b/gi, '一緒に'],
  [/\bforever\b/gi, '永遠に'],
  [/\bmemories\b/gi, '思い出'],
  [/\bshine|shining\b/gi, '輝く'],
  [/\bdance|dancing\b/gi, '踊る'],
  [/\bmusic\b/gi, '音楽'],
  [/\bfree|freedom\b/gi, '自由'],
  [/\btime\b/gi, '時間'],
  [/\bheart\b/gi, '心'],
  [/\bvoice\b/gi, '声'],
  [/\btears\b/gi, '涙'],
  [/\brain\b/gi, '雨'],
  [/\bwind\b/gi, '風'],
  [/\bsun\b/gi, '太陽'],
  [/\bmoon\b/gi, '月'],
];

// In-memory translation cache shared across tracks
const memoryTranslationCache = new Map<string, string>();

/**
 * Calls the server-side `/api/music/translate-lyrics` endpoint to translate a batch of lyric lines:
 * - Japanese -> English
 * - English -> Japanese
 * - Other languages -> Japanese
 */
export async function translateLyricsBatchViaServer(
  lines: string[]
): Promise<Record<string, string>> {
  const uniqueLines = Array.from(
    new Set(
      lines
        .map((l) => (l || '').trim())
        .filter((l) => l.length > 0 && !l.startsWith('♪'))
    )
  );

  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const line of uniqueLines) {
    const cached = memoryTranslationCache.get(line);
    if (cached) {
      result[line] = cached;
    } else {
      missing.push(line);
    }
  }

  if (missing.length === 0) {
    return result;
  }

  const batchSlice = missing.slice(0, 90);
  let resolvedCount = 0;

  try {
    const resp = await backendFetch('/api/music/translate-lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: batchSlice, engine: 'deepl' }),
    });
    if (resp.ok) {
      const data = await resp.json();
      // 1. Handle translationsMap: Record<string, string>
      if (data && typeof data.translationsMap === 'object' && data.translationsMap !== null) {
        for (const [orig, trans] of Object.entries(data.translationsMap)) {
          if (typeof trans === 'string' && trans.trim()) {
            memoryTranslationCache.set(orig, trans.trim());
            result[orig] = trans.trim();
            resolvedCount++;
          }
        }
      }
      // 2. Handle translations: Array<{ original, translated }> or Record<string, string>
      if (data && Array.isArray(data.translations)) {
        for (const item of data.translations) {
          if (
            item &&
            typeof item.original === 'string' &&
            typeof item.translated === 'string' &&
            item.translated.trim()
          ) {
            memoryTranslationCache.set(item.original.trim(), item.translated.trim());
            result[item.original.trim()] = item.translated.trim();
            resolvedCount++;
          }
        }
      } else if (data && typeof data.translations === 'object' && data.translations !== null) {
        for (const [orig, trans] of Object.entries(data.translations)) {
          if (typeof trans === 'string' && trans.trim()) {
            memoryTranslationCache.set(orig, trans.trim());
            result[orig] = trans.trim();
            resolvedCount++;
          }
        }
      }
    }
  } catch {
    // Fall through to client-side neural translation bridge
  }

  // 3. Direct client-side neural translation fallback if server endpoint was unreachable
  if (resolvedCount === 0 && batchSlice.length > 0) {
    try {
      const jaLines: string[] = [];
      const otherLines: string[] = [];
      for (const l of batchSlice) {
        const info = detectLyricLanguage(l);
        if (info.lang === 'ja') jaLines.push(l);
        else otherLines.push(l);
      }

      const translateDirectGroup = async (groupLines: string[], tl: 'en' | 'ja') => {
        if (groupLines.length === 0) return;
        const sl = tl === 'en' ? 'ja' : 'auto';
        const chunkSize = 20;
        for (let i = 0; i < groupLines.length; i += chunkSize) {
          const chunk = groupLines.slice(i, i + chunkSize);
          const joined = chunk.join('\n');
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(joined)}`;
          const r = await fetch(url).catch(() => null);
          if (r && r.ok) {
            const d = await r.json();
            const fullText = Array.isArray(d?.[0])
              ? d[0].map((part: [string]) => (Array.isArray(part) ? part[0] : '')).join('')
              : '';
            const split = fullText.split('\n');
            if (split.length === chunk.length) {
              chunk.forEach((orig, idx) => {
                const tr = (split[idx] || '').trim();
                if (tr) {
                  memoryTranslationCache.set(orig, tr);
                  result[orig] = tr;
                }
              });
            }
          }
        }
      };

      await Promise.all([
        translateDirectGroup(jaLines, 'en'),
        translateDirectGroup(otherLines, 'ja'),
      ]);
    } catch {
      // Fallback to local dictionary if offline
    }
  }

  return result;
}

/**
 * Synchronous lyric translation lookup:
 * 1. Uses server-translated map or memory cache if available
 * 2. Otherwise applies deterministic language-aware translation:
 *    - Japanese -> English
 *    - English -> Japanese
 *    - Other languages -> Japanese
 */
export function getLyricTranslation(
  lineText: string,
  serverTranslations?: Record<string, string>
): string {
  if (!lineText || !lineText.trim()) return '';
  const trimmed = lineText.trim();

  // Skip metadata/loading lines
  if (
    trimmed.includes('同期歌詞を読み込み中') ||
    trimmed.includes('Loading synced lyrics') ||
    trimmed === '•••'
  ) {
    return '';
  }

  if (serverTranslations && serverTranslations[trimmed]) {
    return serverTranslations[trimmed];
  }
  const mem = memoryTranslationCache.get(trimmed);
  if (mem) return mem;

  const langInfo = detectLyricLanguage(trimmed);
  const cleanLower = trimmed.toLowerCase().replace(/[.,!?'"~～]/g, '').trim();

  if (langInfo.lang === 'ja') {
    // Japanese -> English
    for (const [k, v] of Object.entries(JA_TO_EN_LYRIC_MAP)) {
      if (trimmed === k || trimmed.includes(k) || k.includes(trimmed)) {
        return v;
      }
    }

    const matchedEnParts: string[] = [];
    for (const [jaWord, enWord] of JA_WORD_TO_EN) {
      if (trimmed.includes(jaWord) && !matchedEnParts.includes(enWord)) {
        matchedEnParts.push(enWord);
      }
    }
    if (matchedEnParts.length > 0) {
      const phrase = matchedEnParts.slice(0, 5).join(', ');
      return phrase.charAt(0).toUpperCase() + phrase.slice(1);
    }
    return '';
  }

  // English or Other language -> Japanese
  for (const [k, v] of Object.entries(EN_OTHER_TO_JA_LYRIC_MAP)) {
    if (cleanLower === k || cleanLower.includes(k)) {
      return v;
    }
  }

  let working = trimmed;
  let replacedCount = 0;
  for (const [re, jaRep] of EN_WORD_TO_JA) {
    if (re.test(working)) {
      working = working.replace(re, jaRep);
      replacedCount++;
    }
  }
  if (replacedCount > 0 && working !== trimmed) {
    return working;
  }

  return '';
}

export function generatePronunciationGuide(lineText: string): string {
  return lineText.trim();
}
