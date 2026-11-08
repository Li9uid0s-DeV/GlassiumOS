/**
 * Karaoke Pronunciation Guide & Dynamic Timing Engine for GlassiumOS Music
 * Provides:
 * - Real-time Romaji / Furigana pronunciation guides for Japanese lyrics
 * - Dynamic lead-in timing countdown (歌い出しタイミング)
 * - Syllable and line color-wipe calculation
 */

// Japanese Kana to Hepburn Romaji Map
const KANA_ROMAJI_MAP: Record<string, string> = {
  // Digraphs (拗音)
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
  'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'じゃ': 'ja',  'じゅ': 'ju',  'じょ': 'jo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
  'ふぁ': 'fa',  'ふぃ': 'fi',  'ふぇ': 'fe',  'ふぉ': 'fo',
  'てぃ': 'ti',  'でぃ': 'di',  'うぃ': 'wi',  'うぇ': 'we',

  // Basic Hiragana
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'wo', 'ん': 'n',

  // Dakuten & Handakuten
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
};

// Common lyric kanji reading dictionary for popular J-Pop songs
const COMMON_LYRIC_KANJI: Record<string, string> = {
  // Frequently recurring lyric words in YOASOBI, Kenshi Yonezu, Ado, King Gnu, etc.
  '夜に駆ける': 'yoru ni kakeru',
  '夜': 'yoru',
  '君': 'kimi',
  '僕': 'boku',
  '私': 'watashi',
  '心': 'kokoro',
  '愛': 'ai',
  '恋': 'koi',
  '夢': 'yume',
  '空': 'sora',
  '涙': 'namida',
  '明日': 'asu',
  '今日': 'kyou',
  '昨日': 'kinou',
  '今': 'ima',
  '未来': 'mirai',
  '過去': 'kako',
  '世界': 'sekai',
  '光': 'hikari',
  '影': 'kage',
  '時間': 'jikan',
  '記憶': 'kioku',
  '約束': 'yakusoku',
  '笑顔': 'egao',
  '言葉': 'kotoba',
  '声': 'koe',
  '歌': 'uta',
  '音': 'oto',
  '風': 'kaze',
  '星': 'hoshi',
  '月': 'tsuki',
  '太陽': 'taiyou',
  '雨': 'ame',
  '花': 'hana',
  '海': 'umi',
  '道': 'michi',
  '手': 'te',
  '目': 'me',
  '旅': 'tabi',
  '運命': 'unmei',
  '永遠': 'eien',
  '奇跡': 'kiseki',
  '孤独': 'kodoku',
  '自由': 'jiyuu',
  '痛': 'ita',
  '傷': 'kizu',
  '歩': 'aru',
  '走': 'hasi',
  '沈む': 'shizumu',
  '溶けて': 'tokete',
  '騒がしい': 'sawagashii',
  '日々に': 'hibi ni',
  '笑えない': 'waraenai',
  '思い付く': 'omoitsuku',
  '限り': 'kagiri',
  '眩しい': 'mabushii',
  '掴み': 'tsukami',
  '届く': 'todoku',
  '響く': 'hibiku',
  '照らす': 'terasu',
  '始まる': 'hajimaru',
  '終わる': 'owaru',
  '忘れない': 'wasurenai',
  '想い': 'omoi',
  '命': 'inochi',
  '魂': 'tamashii',
  '胸': 'mune',
  '色': 'iro',
  '二人': 'futari',
  '一人': 'hitori',
  '青': 'ao',
  '赤': 'aka',
  '白': 'shiro',
  '黒': 'kuro',
};

// Convert Katakana to Hiragana for uniform phonetics
function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/**
 * Generate Romaji / Furigana pronunciation guide for a line of text.
 */
export function generatePronunciationGuide(lineText: string): string {
  if (!lineText || !lineText.trim()) return '';
  const trimmed = lineText.trim();

  // If already ASCII / English, return clean text
  if (/^[-a-zA-Z0-9\s.,!?'"()]+$/.test(trimmed)) {
    return trimmed;
  }

  // Check against known whole lyric phrases
  let working = trimmed;

  // Substitute common Kanji terms with phonetic hiragana
  const kanjiKeys = Object.keys(COMMON_LYRIC_KANJI).sort((a, b) => b.length - a.length);
  for (const k of kanjiKeys) {
    if (working.includes(k)) {
      working = working.replaceAll(k, ` ${COMMON_LYRIC_KANJI[k]} `);
    }
  }

  // Convert remaining Katakana to Hiragana
  working = katakanaToHiragana(working);

  // Convert Hiragana characters and digraphs to Romaji
  let result = '';
  let i = 0;
  while (i < working.length) {
    // Sokuon (促音: っ / ッ)
    if (working[i] === 'っ') {
      const nextPair = working.slice(i + 1, i + 3);
      const nextChar = working[i + 1] || '';
      const nextRomaji = KANA_ROMAJI_MAP[nextPair] || KANA_ROMAJI_MAP[nextChar] || '';
      if (nextRomaji) {
        result += nextRomaji[0];
      }
      i++;
      continue;
    }

    // Try 2-character combo (digraph)
    const pair = working.slice(i, i + 2);
    if (KANA_ROMAJI_MAP[pair]) {
      result += KANA_ROMAJI_MAP[pair] + ' ';
      i += 2;
      continue;
    }

    // Single character
    const single = working[i];
    if (KANA_ROMAJI_MAP[single]) {
      result += KANA_ROMAJI_MAP[single] + ' ';
      i++;
      continue;
    }

    // Space or punctuation
    result += single;
    i++;
  }

  // Clean up duplicate spaces and format as readable Romaji pronunciation guide
  return result
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/([a-z])\s+([a-z]{1,2})\b/gi, '$1$2'); // join small syllables for smoother flow
}

export interface KaraokeLeadInState {
  isActive: boolean;
  secondsRemaining: number;
  dotsLit: number; // 0, 1, 2, or 3
  isUrgent: boolean;
  label: string;
}

/**
 * Calculates lead-in countdown info before a line starts singing.
 * Gives singer exact 3-2-1 rhythm warning.
 */
export function calculateLeadInState(
  lineTime: number,
  currentTime: number,
  leadInThreshold = 3.5
): KaraokeLeadInState {
  const delta = lineTime - currentTime;
  if (delta > 0 && delta <= leadInThreshold) {
    let dotsLit = 0;
    if (delta <= 3.0) dotsLit = 1;
    if (delta <= 2.0) dotsLit = 2;
    if (delta <= 1.0) dotsLit = 3;

    return {
      isActive: true,
      secondsRemaining: Math.max(0, delta),
      dotsLit,
      isUrgent: delta <= 1.0,
      label: delta <= 0.4 ? 'GO! 歌い出し' : `歌い出しまで ${delta.toFixed(1)}s`,
    };
  }

  return {
    isActive: false,
    secondsRemaining: 0,
    dotsLit: 0,
    isUrgent: false,
    label: '',
  };
}

/**
 * Color scheme styles for Karaoke highlight effects.
 */
export type KaraokeColorTheme = 'neon-gold' | 'cyber-cyan' | 'ruby-rose' | 'rainbow-glow';

export const KARAOKE_COLOR_THEMES: Record<
  KaraokeColorTheme,
  {
    name: string;
    activeGradient: string;
    glowColor: string;
    badgeBg: string;
    activeText: string;
  }
> = {
  'neon-gold': {
    name: 'ゴールド (DAM風)',
    activeGradient: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 45%, #ec4899 90%, #ffffff 100%)',
    glowColor: 'rgba(251, 191, 36, 0.9)',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    activeText: '#fbbf24',
  },
  'cyber-cyan': {
    name: 'サイバーシアン (JOYSOUND風)',
    activeGradient: 'linear-gradient(90deg, #06b6d4 0%, #38bdf8 50%, #818cf8 100%)',
    glowColor: 'rgba(56, 189, 248, 0.9)',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
    activeText: '#38bdf8',
  },
  'ruby-rose': {
    name: 'ルビーローズ (Apple Music風)',
    activeGradient: 'linear-gradient(90deg, #f43f5e 0%, #fb7185 45%, #ec4899 90%, #ffffff 100%)',
    glowColor: 'rgba(244, 63, 94, 0.9)',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
    activeText: '#f43f5e',
  },
  'rainbow-glow': {
    name: 'レインボーネオン',
    activeGradient: 'linear-gradient(90deg, #f43f5e 0%, #fbbf24 33%, #34d399 66%, #38bdf8 100%)',
    glowColor: 'rgba(244, 63, 94, 0.85)',
    badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40',
    activeText: '#f472b6',
  },
};

/**
 * Lyrics Japanese Translation & Poetic Interpretation Dictionary (歌詞通訳・日本語対訳)
 */
const SONG_LYRIC_TRANSLATIONS: Record<string, string> = {
  // English Track Lines -> Natural Japanese Translation
  'drifting beyond the event horizon': '事象の地平線を超えて、果てなき宇宙を漂う',
  'photons bent in an infinite ring of light': '無限の光の環の中で、曲げられてゆく光子たち',
  'monochrome frequencies cutting through vacuum': 'モノクロームの周波数が、冷たい真空を切り裂いていく',
  'echoes of the cosmos vibrating in stereo': '全方位のステレオで共鳴する、宇宙の深淵からの反響',
  'neon pulse synchronization complete': 'ネオンパルスとの完全同期プロセスが完了した',
  'speed of sound colliding with quantum gravity': '音の速さが、量子の重力と激しく交錯する',
  'stellar particles forming a crystalline mesh': '星屑の粒子が、澄み切ったクリスタルの網を形成する',
  'supernova resonance glowing in deep violet': '超新星の残響が、深い深紫色の光となって輝きを放つ',
  'entering the digital troposphere': 'デジタルの対流圏へと静かに突入していく',
  'infinite horizon unfolding before our eyes': '無限に広がる地平線が、私たちの目の前で今開かれる',
  'bling-bang-bang-born': '実力と才能だけで、頂点へ駆け上がれ',
  'you are my special': 'あなたこそが、私にとってかけがえのない特別な存在',

  // J-Pop Catalog Exact Lines -> Expressive Poetic Subtitles
  '沈むように溶けてゆくように': '沈みゆく薄暮の中で、心が優しく溶け合っていくように',
  '二人だけの空が広がる夜に': 'ただ二人だけの静寂な夜空が、どこまでも広がる瞬間に',
  'さよならだけだった その一言で全てが分かった': '『さよなら』というたった一言で、すべてを悟ってしまった',
  '日が沈み出した空と君の姿 フェンス越しに重なっていた': '夕暮れに染まりゆく空とあなたの面影が、フェンス越しに静かに重なっていた',
  '初めて見た時から僕の心を全て奪った': '初めて出会ったあの日から、私の心のすべてを奪い去った',
  'どこか儚い空気を纏う君は 寂しい目をしてたんだ': 'どこか儚げな雰囲気をまとったあなたは、哀しげな瞳をしていた',
  'いつだってチックタックと鳴る世界で何度だってさ': '絶え間なく時を刻み続けるこの世界で、何度立ち止まったとしても',
  '触れる心無い言葉うるさい声に 涙が零れそうでも': '冷たい心ない言葉や喧騒に、涙がこぼれ落ちそうになっても',
  'ありきたりな喜びきっと二人なら見つけられる': '何気ないささやかな喜びも、二人ならきっと見つけ出せる',
  '騒がしい日々に笑えない君に 思い付く限り眩しい明日を': '慌ただしい日々に笑顔をなくしたあなたへ、精一杯の眩しい未来を届けたい',
  '明けない夜に落ちてゆく前に 僕の手を掴んでほら': '明けない夜の闇へと沈んでゆく前に、どうか私の手をしっかりと握って',
  '忘れてしまいたくて閉じ込めた日々も 抱きしめた温もりで溶かすから': '消し去りたくて閉じ込めていた記憶も、温かい抱擁ですべて溶かしてあげるから',
  '怖くないよ いつか日が昇るまで 二人でいよう': '何も恐れることはないよ、再び陽が昇るその時まで、ずっと二人でいよう',
  '無敵の笑顔で荒らすメディア': '誰にも真似できない完璧な笑顔で、メディアを熱狂させる',
  '知りたいその秘密ミステリアス': '誰もが知りたがる、その謎めいた本当の素顔',
  '抜けてるとこさえ彼女のエリア': '少し隙のあるところさえ、彼女の計算された魅力',
  '完璧で嘘つきな君は 天才的なアイドル様': '完璧な嘘で世界を魅了する、天性のカリスマアイドル',
  '夢ならばどれほどよかったでしょう': 'もしこれが悪い夢だったなら、どれほど救われただろう',
  '今でもあなたはわたしの光': '今この瞬間も、あなたは私の道を照らす唯一の光',
  '努力 未来 a beautiful star': 'ひたむきな努力、掴み取る未来、美しく輝く一番星',
  'ケセラセラ 今日も唱える 限界などないさ': 'なるようになるさ、今日も心に刻む、限界なんて存在しない',
  'あんなに好きだったのにね': 'あんなにも深く愛し合っていたはずなのにね',
  '君の怪獣が暴れ出す前に': '胸の中の抑えきれない情熱が溢れ出す前に',
  '死ぬのがいいわ': 'あなたと離れ離れになるくらいなら、いっそ命果てる方がまし',
  'きらり 光る風に乗って': 'きらきらと光り輝く爽やかな風に乗って',
  '夜に駆ける': '二人で夜の闇を駆け抜けてゆく',
  '怪獣の花唄': 'あの頃の記憶を呼び覚ます、力強い歌声を胸に',
  '白日': '真っ白な光の中で、すべてをやり直せたら',
  'subtitle': '言葉にできない想いを、静かに添えて',
  'pretender': '君の運命の人は、僕じゃないと知っているけれど',
};

/**
 * Returns Japanese translated subtitle for a given lyric line.
 */
export function getLyricTranslation(lineText: string): string {
  if (!lineText || !lineText.trim()) return '';
  const clean = lineText.trim().toLowerCase().replace(/[.,!?'"~～]/g, '');

  // Exact match from translation dictionary
  for (const [key, trans] of Object.entries(SONG_LYRIC_TRANSLATIONS)) {
    if (clean === key || clean.includes(key) || key.includes(clean)) {
      return trans;
    }
  }

  // Common English idioms & word translations
  const englishReplacements: [RegExp, string][] = [
    [/\bdrifting\b/gi, '漂う'],
    [/\bevent horizon\b/gi, '事象の地平線'],
    [/\bphotons\b/gi, '光子'],
    [/\bquantum\b/gi, '量子'],
    [/\bfrequencies\b/gi, '周波数'],
    [/\bhorizon\b/gi, '地平線'],
    [/\bsynchronization\b/gi, '同期'],
    [/\bechoes\b/gi, '反響'],
    [/\bcosmos\b/gi, '宇宙'],
    [/\bsupernova\b/gi, '超新星'],
    [/\bparticles\b/gi, '粒子'],
    [/\bi love you\b/gi, 'あなたを愛している'],
    [/\bforever\b/gi, '永遠に'],
    [/\btogether\b/gi, '共に'],
    [/\btonight\b/gi, '今夜'],
    [/\bdancing in the dark\b/gi, '暗闇の中で踊り明かそう'],
    [/\bshining star\b/gi, '輝く星'],
  ];

  if (/^[-a-zA-Z0-9\s.,!?'"()]+$/.test(lineText.trim())) {
    let translated = lineText;
    for (const [re, rep] of englishReplacements) {
      translated = translated.replace(re, rep);
    }
    if (translated !== lineText) {
      return `【訳】${translated}`;
    }
  }

  return '';
}
