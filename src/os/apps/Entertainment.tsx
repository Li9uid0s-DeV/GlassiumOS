import { useState, useEffect, useMemo, useCallback } from 'react';
import { backendFetch, resolveBackendUrl } from '../backendConfig';

export type EntertainmentTab = 'movies' | 'anime' | 'youtube' | 'shorts';
export type StreamingProvider = 'vidlink' | 'mapple-fun' | 'streamex' | 'flixhd' | 'mapletv' | 'youtube';

interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  type: 'movie' | 'series' | 'anime';
  year: number;
  rating: number;
  genre: string[];
  posterUrl: string;
  backdropUrl?: string;
  description: string;
  episodesCount?: number;
  tmdbId?: number;
  imdbId?: string;
  youtubeId?: string;
  embedUrl?: string;
  featured?: boolean;
}

interface YouTubeVideoItem {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  views: string;
  category: 'music' | 'anime' | 'gaming' | 'lofi' | 'tech';
  directVideoUrl?: string;
}

interface YouTubeShortItem {
  id: string;
  title: string;
  creator: string;
  views: string;
  likes: string;
  category: string;
}

const PROVIDER_METADATA: Record<
  StreamingProvider,
  { name: string; badge: string; color: string; desc: string }
> = {
  vidlink: {
    name: 'VidCore 1080p (Sandbox解除済)',
    badge: '最推奨 (Primary)',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    desc: 'Sandboxチェック不要・高速1080pダイレクトシネマサーバー',
  },
  'mapple-fun': {
    name: 'VidLink Pro HD',
    badge: '高速サーバー 1',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    desc: '映画・アニメ・海外ドラマ マルチオーディオ対応ストリーム',
  },
  streamex: {
    name: 'AutoEmbed.me (Proxy)',
    badge: 'ミラー 2 (Proxy)',
    color: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    desc: 'サーバー側Sandbox無害化プロキシ経由プレイヤー',
  },
  flixhd: {
    name: '2Embed Cinema (Proxy)',
    badge: 'ミラー 3 (IMDb/TMDB)',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    desc: 'document.domainブロック解除済 2Embed / VidCore連動サーバー',
  },
  mapletv: {
    name: 'VidFast / NontonGo',
    badge: 'ミラー 4 (Edge)',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    desc: '分散エッジ中継シネマ＆アニメサーバー',
  },
  youtube: {
    name: 'YouTube / 公式PV・Direct HD',
    badge: '公式トレイラー・Direct MP4',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    desc: 'TMDB公式YouTube本予告＆Apple iTunes Direct HDストリーム',
  },
};

function MediaPoster({
  src,
  alt,
  title,
  year,
  className = 'w-full h-full object-cover',
}: {
  src: string;
  alt: string;
  title: string;
  year?: number;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-zinc-900 to-indigo-950 flex flex-col items-center justify-center p-3 text-center border border-white/10 select-none relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.15),transparent)]" />
        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 text-rose-400 shadow-md border border-rose-500/20">
          <span className="material-symbols-rounded text-2xl">movie</span>
        </div>
        <span className="text-xs font-bold text-white line-clamp-2 leading-tight relative z-10">
          {title}
        </span>
        {year && <span className="text-[10px] text-white/50 mt-1 relative z-10">{year}年</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}

const CURATED_MEDIA_CATALOG: MediaItem[] = [
  // Anime
  {
    id: 'frieren-beyond-journeys-end',
    title: '葬送のフリーレン',
    originalTitle: "Frieren: Beyond Journey's End",
    type: 'anime',
    year: 2023,
    rating: 9.3,
    genre: ['ファンタジー', '冒険', 'ドラマ'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/dqZENchTd7lp5zht7BdlqM7RBhD.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/9faGSFi5jam6pDWGNd0p8JcJgXQ.jpg',
    description: '魔王を倒した勇者一行のその後を描く後日譚ファンタジー。千年以上生きるエルフの魔法使いフリーレンが、人の心を知るための旅に出る。',
    episodesCount: 28,
    tmdbId: 209867,
    imdbId: 'tt22248376',
    youtubeId: 'qgQunxD0qMo',
    featured: true,
  },
  {
    id: 'demon-slayer-kimetsu',
    title: '鬼滅の刃 柱稽古編',
    originalTitle: 'Demon Slayer: Kimetsu no Yaiba',
    type: 'anime',
    year: 2024,
    rating: 8.9,
    genre: ['ダークファンタジー', 'アクション', '時代劇'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/nTvM4mhqNlHIvUkI1gVnW6XP7GG.jpg',
    description: '鬼殺隊最高位の剣士「柱」たちによる合同強化訓練が始まる。宿敵・鬼舞辻無惨との最終決戦に向け、炭治郎たちの過酷な修業の幕が上がる。',
    episodesCount: 55,
    tmdbId: 85937,
    imdbId: 'tt9335498',
    youtubeId: 'W3_n7wE4vY4',
    featured: true,
  },
  {
    id: 'jujutsu-kaisen-s2',
    title: '呪術廻戦 懐玉・玉折／渋谷事変',
    originalTitle: 'Jujutsu Kaisen',
    type: 'anime',
    year: 2023,
    rating: 8.8,
    genre: ['オカルト', 'アクション', 'ダークファンタジー'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/gmECX1DvFgdUPjtio2zaL8BPYPu.jpg',
    description: '五条悟と夏油傑の高専時代、そしてハロウィンの渋谷を舞台に繰り広げられる未曾有の呪霊テロ。特級呪術師たちの激突を描く。',
    episodesCount: 47,
    tmdbId: 95479,
    imdbId: 'tt12343534',
    youtubeId: 'O6qVieflwqs',
  },
  {
    id: 'kusuriya-no-hitorigoto',
    title: '薬屋のひとりごと',
    originalTitle: 'The Apothecary Diaries',
    type: 'anime',
    year: 2023,
    rating: 9.0,
    genre: ['ミステリー', '時代劇', 'ドラマ'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/e3ojpANrFnmJCyeBNTinBt9BCIN.jpg',
    description: '大陸の中央に位置する大国・後宮に勤める元薬師の少女・猫猫（マオマオ）が、王宮内で巻き起こる難事件を薬学の知識で解決する。',
    episodesCount: 24,
    tmdbId: 220542,
    imdbId: 'tt26743760',
    youtubeId: 'XYNGkSvFT8c',
  },
  {
    id: 'solo-leveling',
    title: '俺だけレベルアップな件',
    originalTitle: 'Solo Leveling',
    type: 'anime',
    year: 2024,
    rating: 8.6,
    genre: ['ファンタジー', 'アクション', '冒険'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr1viJuBDV4j6eb.jpg',
    description: '人類最弱兵器と呼ばれたE級ハンター水篠旬が、死の淵で手に入れた「自分だけが見えるクエスト画面」を通じて最強のS級へと成長していく。',
    episodesCount: 12,
    tmdbId: 127532,
    imdbId: 'tt21209876',
    youtubeId: 'cR5gZk8G7nE',
  },
  {
    id: 'oshi-no-ko',
    title: '【推しの子】',
    originalTitle: 'Oshi no Ko',
    type: 'anime',
    year: 2024,
    rating: 8.7,
    genre: ['サスペンス', 'ドラマ', 'ファンタジー'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/op3B52xK7i1G1B1Z2kG9pD0T3xS.jpg',
    description: '伝説のアイドル・アイの死の真相を追うアクアとルビー。芸能界の光と闇、そして2.5次元舞台編での役者たちの熱き演技バトル。',
    episodesCount: 24,
    tmdbId: 203737,
    imdbId: 'tt21030032',
    youtubeId: '1n_k_0t_WpM',
  },
  {
    id: 'dungeon-meshi',
    title: 'ダンジョン飯',
    originalTitle: 'Delicious in Dungeon',
    type: 'anime',
    year: 2024,
    rating: 8.6,
    genre: ['ファンタジー', 'コメディ', '冒険'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/tN3p7k2uB2eN8Q9L0mG3sF5wR1.jpg',
    description: 'レッドドラゴンに食べられた妹を救うため、魔物を狩って自給自足で料理しながら深層を目指す異色グルメファンタジー。',
    episodesCount: 24,
    tmdbId: 209868,
    imdbId: 'tt21621494',
    youtubeId: 'c1uY1b-7Vjg',
  },
  {
    id: 'attack-on-titan',
    title: '進撃の巨人 The Final Season',
    originalTitle: 'Attack on Titan',
    type: 'anime',
    year: 2023,
    rating: 9.2,
    genre: ['アクション', 'ダークファンタジー', 'ドラマ'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg',
    description: '巨人がすべてを支配する世界。壁の外の真実を知ったエレン・イェーガーと調査兵団が迎える人類の最終局面。',
    episodesCount: 89,
    tmdbId: 1429,
    imdbId: 'tt2560140',
    youtubeId: 'E7WytLM2KvY',
  },
  {
    id: 'spy-x-family',
    title: 'SPY×FAMILY (スパイファミリー)',
    originalTitle: 'SPY x FAMILY',
    type: 'anime',
    year: 2023,
    rating: 8.6,
    genre: ['アクション', 'コメディ', 'ファミリー'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/3r4LYFuXrg3G8fepysr4xSLWnQL.jpg',
    description: '敏腕スパイ〈黄昏〉、殺し屋ヨル、超能力者アーニャが互いの正体を隠して仮初の家族を築き、世界の平和に挑む。',
    episodesCount: 37,
    tmdbId: 120089,
    imdbId: 'tt13706018',
    youtubeId: 'ofXigq9aIpo',
  },
  {
    id: 'cyberpunk-edgerunners',
    title: 'サイバーパンク エッジランナーズ',
    originalTitle: 'Cyberpunk: Edgerunners',
    type: 'anime',
    year: 2022,
    rating: 8.7,
    genre: ['SF', 'アクション', 'ダークファンタジー'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/7jSWOc6jWSw5hZ78HB8Hw3pJxuk.jpg',
    description: 'テクノロジーと身体改造に狂乱したメガシティ・ナイトシティ。すべてを失ったストリートキッドのデイビッドが傭兵「エッジランナー」として頂点を目指す。',
    episodesCount: 10,
    tmdbId: 105248,
    imdbId: 'tt12590266',
    youtubeId: 'JtqIas3bYhg',
  },

  // Movies
  {
    id: 'dune-part-two',
    title: 'デューン 砂の惑星 PART2',
    originalTitle: 'Dune: Part Two',
    type: 'movie',
    year: 2024,
    rating: 8.8,
    genre: ['SF', 'アドベンチャー', 'アクション'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/8b8R8W88QjeTdn9OE8PY05Nxl1X.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    description: '宇宙の命運を握る砂の惑星アラキス。ポール・アトレイデスがチャニやフレメンたちと手を組み、一族を滅ぼした宿敵ハルコンネン家への復讐に立ち向かう。',
    tmdbId: 693134,
    imdbId: 'tt15239678',
    youtubeId: 'Way9Dexny3w',
    featured: true,
  },
  {
    id: 'oppenheimer',
    title: 'オッペンハイマー',
    originalTitle: 'Oppenheimer',
    type: 'movie',
    year: 2023,
    rating: 8.9,
    genre: ['ドラマ', '歴史', 'サスペンス'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGvF8Z1nOHb.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    description: 'クリストファー・ノーラン監督作品。マンハッタン計画を指揮し原子爆弾を生み出した天才物理学者J・ロバート・オッペンハイマーの光と影。',
    tmdbId: 872585,
    imdbId: 'tt15398776',
    youtubeId: 'uYPbbksJxIg',
  },
  {
    id: 'interstellar',
    title: 'インターステラー',
    originalTitle: 'Interstellar',
    type: 'movie',
    year: 2014,
    rating: 9.2,
    genre: ['SF', 'ドラマ', 'アドベンチャー'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    description: '地球の寿命が尽きかけ、人類滅亡の危機に瀕した近未来。愛する家族を残し、人類の居住可能な新たな惑星を探すためワームホールを越える探査チームの旅。',
    tmdbId: 157336,
    imdbId: 'tt0816692',
    youtubeId: 'zSWdZVtXT7E',
  },
  {
    id: 'your-name-kimi-no-na-wa',
    title: '君の名は。',
    originalTitle: 'Your Name.',
    type: 'movie',
    year: 2016,
    rating: 8.9,
    genre: ['ファンタジー', 'ドラマ', 'アニメーション'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/dIWwZW7dJJtqC6CgWzYkNVKIUm8.jpg',
    description: '1000年ぶりとなる彗星の接近を1カ月後に控えた日本。東京に暮らす少年・瀧と飛騨の山奥に暮らす少女・三葉の心が入れ替わる奇跡の物語。',
    tmdbId: 372058,
    imdbId: 'tt5311514',
    youtubeId: 'k4xGqY5IDBE',
  },
  {
    id: 'suzume-no-tojimari',
    title: 'すずめの戸締まり',
    originalTitle: 'Suzume',
    type: 'movie',
    year: 2022,
    rating: 8.5,
    genre: ['ファンタジー', '冒険', 'アニメーション'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/vIeu8WysZrTSFb2uhPViKjX9EcC.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/6YwkGolwdOMNpbTOmLjoehlVWs5.jpg',
    description: '九州の静かな町で暮らす17歳の少女・鈴芽（すずめ）は、「扉を探してるんだ」という旅の青年・草太に出会う。日本各地の災いの扉を閉める旅。',
    tmdbId: 916224,
    imdbId: 'tt16428256',
    youtubeId: 'SwNo_M7gB7c',
  },
  {
    id: 'spirited-away',
    title: '千と千尋の神隠し',
    originalTitle: 'Spirited Away',
    type: 'movie',
    year: 2001,
    rating: 9.0,
    genre: ['ファンタジー', '冒険', 'アニメーション'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg',
    description: '神々の世界に迷い込んだ10歳の少女・千尋が、湯屋「油屋」で働きながら豚に変えられた両親を救うために奮闘するスタジオジブリ不朽の名作。',
    tmdbId: 129,
    imdbId: 'tt0245429',
    youtubeId: 'ByXuk9QqQkk',
  },
  {
    id: 'godzilla-minus-one',
    title: 'ゴジラ-1.0 (Godzilla Minus One)',
    originalTitle: 'ゴジラ-1.0',
    type: 'movie',
    year: 2023,
    rating: 8.7,
    genre: ['SF', 'アクション', 'ドラマ'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/hkxxMIGaiCTmrEArK7J56JTKUlB.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/bWIIWhnaoWx3FTVXv6GkYDv3djL.jpg',
    description: '戦後、焦土と化し無（ゼロ）になった日本へ、追い打ちをかけるように突如現れたゴジラ。その圧倒的な脅威に立ち向かう人々の物語。',
    tmdbId: 940721,
    imdbId: 'tt23289160',
    youtubeId: 'VvSrHIX5a-0',
  },
  {
    id: 'spider-man-across-spider-verse',
    title: 'スパイダーマン：アクロス・ザ・スパイダーバース',
    originalTitle: 'Spider-Man: Across the Spider-Verse',
    type: 'movie',
    year: 2023,
    rating: 8.8,
    genre: ['アニメーション', 'アクション', 'SF'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
    description: 'マルチバースを自在に渡り歩くスパイダー・ソサエティに出会ったマイルス・モラレス。自らの愛する人を救うか、マルチバースの秩序を守るかの選択を迫られる。',
    tmdbId: 569094,
    imdbId: 'tt9362722',
    youtubeId: 'cqGjhVJWtEg',
  },
  {
    id: 'inception',
    title: 'インセプション',
    originalTitle: 'Inception',
    type: 'movie',
    year: 2010,
    rating: 8.8,
    genre: ['SF', 'アクション', 'サスペンス'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
    description: '他人の夢の潜在意識に入り込みアイデアを盗み出すプロフェッショナル・コブが、逆に相手の心にアイデアを植え付ける究極の作戦「インセプション」に挑む。',
    tmdbId: 27205,
    imdbId: 'tt1375666',
    youtubeId: 'YoHD9XEInc0',
  },

  // TV Series
  {
    id: 'shogun-2024',
    title: 'SHOGUN 将軍',
    originalTitle: 'Shōgun',
    type: 'series',
    year: 2024,
    rating: 8.8,
    genre: ['時代劇', 'ドラマ', 'アクション'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg',
    description: '天下分け目の関ヶ原前夜。戦国最強の武将・吉井虎長と、難破して日本に漂着した英国人航海士ジョン・ブラックソーンの運命が交錯する超大作戦国ドラマ。',
    episodesCount: 10,
    tmdbId: 126308,
    imdbId: 'tt2788316',
    youtubeId: 'yBLHX-pE_V4',
    featured: true,
  },
  {
    id: 'fallout-series',
    title: 'フォールアウト',
    originalTitle: 'Fallout',
    type: 'series',
    year: 2024,
    rating: 8.5,
    genre: ['SF', 'アクション', 'ドラマ'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/AnsSKR9LuK0T9bAOcPVA3PUvyWj.jpg',
    description: '核戦争から200年後の荒廃したロサンゼルス。地下シェルター「Vault 33」から初めて過酷なウェイストランドへ飛び出したルーシーの波乱に満ちたサバイバル。',
    episodesCount: 8,
    tmdbId: 106379,
    imdbId: 'tt12637874',
    youtubeId: 'V-mugKDQDlg',
  },
  {
    id: 'stranger-things',
    title: 'ストレンジャー・シングス 未知の世界',
    originalTitle: 'Stranger Things',
    type: 'series',
    year: 2022,
    rating: 8.7,
    genre: ['SF', 'ミステリー', 'ドラマ'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    description: '1980年代のインディアナ州ホーキンス。少年の失踪事件をきっかけに、町に潜む秘密研究所、超能力を持つ謎の少女、そして「裏側の世界」の脅威が姿を現す。',
    episodesCount: 34,
    tmdbId: 66732,
    imdbId: 'tt4574334',
    youtubeId: 'b9EkMc79ZSU',
  },
];

const CURATED_YOUTUBE_VIDEOS: YouTubeVideoItem[] = [
  {
    id: 'W3_n7wE4vY4',
    title: 'テレビアニメ「鬼滅の刃」柱稽古編 公式本予告 PV',
    channelTitle: 'アニプレックス チャンネル',
    thumbnailUrl: 'https://img.youtube.com/vi/W3_n7wE4vY4/hqdefault.jpg',
    views: '450万回視聴',
    category: 'anime',
  },
  {
    id: 'qgQunxD0qMo',
    title: 'TVアニメ『葬送のフリーレン』本PV／主題歌：YOASOBI「勇者」',
    channelTitle: 'TOHO animation チャンネル',
    thumbnailUrl: 'https://img.youtube.com/vi/qgQunxD0qMo/hqdefault.jpg',
    views: '890万回視聴',
    category: 'anime',
  },
  {
    id: 'mNEUkkoUoIA',
    title: 'YOASOBI「夜に駆ける」Official Music Video',
    channelTitle: 'Ayase / YOASOBI',
    thumbnailUrl: 'https://img.youtube.com/vi/mNEUkkoUoIA/hqdefault.jpg',
    views: '2.8億回視聴',
    category: 'music',
  },
  {
    id: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio - beats to relax/study to',
    channelTitle: 'Lofi Girl',
    thumbnailUrl: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    views: 'LIVE · 4.8万人視聴中',
    category: 'lofi',
  },
  {
    id: 'Way9Dexny3w',
    title: '映画『デューン 砂の惑星PART2』本予告 3分特別映像',
    channelTitle: 'ワーナー ブラザース 公式',
    thumbnailUrl: 'https://img.youtube.com/vi/Way9Dexny3w/hqdefault.jpg',
    views: '320万回視聴',
    category: 'tech',
  },
  {
    id: 'c1uY1b-7Vjg',
    title: 'TVアニメ『ダンジョン飯』第1シーズン OPノンクレジット「Sleep Walking Orchestra」BUMP OF CHICKEN',
    channelTitle: 'KADOKAWAanime',
    thumbnailUrl: 'https://img.youtube.com/vi/c1uY1b-7Vjg/hqdefault.jpg',
    views: '610万回視聴',
    category: 'anime',
  },
  {
    id: '8yvGCAvOAfM',
    title: 'Unreal Engine 5.4 - Next-Gen Photorealism Realtime Tech Showcase',
    channelTitle: 'Unreal Engine',
    thumbnailUrl: 'https://img.youtube.com/vi/8yvGCAvOAfM/hqdefault.jpg',
    views: '230万回視聴',
    category: 'gaming',
  },
  {
    id: 'yBLHX-pE_V4',
    title: '『SHOGUN 将軍』公式本予告編 (真田広之 主演・プロデュース)',
    channelTitle: 'ディズニープラス公式',
    thumbnailUrl: 'https://img.youtube.com/vi/yBLHX-pE_V4/hqdefault.jpg',
    views: '1,200万回視聴',
    category: 'tech',
  },
];

const CURATED_YOUTUBE_SHORTS: YouTubeShortItem[] = [
  {
    id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up (4K 60FPS Remastered)',
    creator: 'Rick Astley Official',
    views: '15億回',
    likes: '1,600万',
    category: 'Legend',
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody - Queen (Official 4K Video)',
    creator: 'Queen Official',
    views: '17億回',
    likes: '1,200万',
    category: 'Rock Masterpiece',
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Despacito - Luis Fonsi ft. Daddy Yankee',
    creator: 'Luis Fonsi',
    views: '84億回',
    likes: '5,300万',
    category: 'Global Hit',
  },
  {
    id: '9bZkp7q19f0',
    title: 'GANGNAM STYLE (강남スタイル) M/V',
    creator: 'Official PSY',
    views: '51億回',
    likes: '2,900万',
    category: 'K-Pop Milestone',
  },
  {
    id: 'JGwWNGJdvx8',
    title: 'Shape of You - Ed Sheeran',
    creator: 'Ed Sheeran',
    views: '62億回',
    likes: '3,200万',
    category: 'Pop Classic',
  },
  {
    id: 'OPf0YbXqDm0',
    title: 'Mark Ronson - Uptown Funk ft. Bruno Mars',
    creator: 'Mark Ronson',
    views: '52億回',
    likes: '2,200万',
    category: 'Funk Anthem',
  },
];

// Lightweight module-level caches for instant 0ms tab switching & search
let cachedPopularMappleMovies: MediaItem[] = [];
const cachedSearchQueries = new Map<string, MediaItem[]>();
const cachedTvEpisodeCounts = new Map<number, number>();

function optimizePosterUrl(url?: string): string {
  if (!url) return '';
  return url.replace('/t/p/w500/', '/t/p/w342/').replace('/t/p/w1280/', '/t/p/w780/');
}

const ENT_STATE_KEY = 'glassium_entertainment_saved_state_v2';

export function EntertainmentApp({ initialTab, payload }: { initialTab?: string; payload?: { videoId?: string; mode?: string } }) {
  const savedState = useMemo(() => {
    try {
      const raw = localStorage.getItem(ENT_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [activeTab, setActiveTab] = useState<EntertainmentTab>(() => {
    if (initialTab === 'shorts' || payload?.mode === 'shorts') return 'shorts';
    if (initialTab === 'youtube' || payload?.mode === 'youtube') return 'youtube';
    if (initialTab === 'anime' || payload?.mode === 'anime') return 'anime';
    return (savedState?.activeTab as EntertainmentTab) || 'movies';
  });

  const [provider, setProvider] = useState<StreamingProvider>(
    (savedState?.provider as StreamingProvider) || 'vidlink'
  );
  const [searchQuery, setSearchQuery] = useState<string>(savedState?.searchQuery || '');
  const [selectedGenre, setSelectedGenre] = useState<string>(savedState?.selectedGenre || 'All');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(
    savedState?.selectedMedia || cachedPopularMappleMovies[0] || CURATED_MEDIA_CATALOG[0]
  );
  const [currentEpisode, setCurrentEpisode] = useState<number>(savedState?.currentEpisode || 1);
  const [isPlayingCinema, setIsPlayingCinema] = useState<boolean>(Boolean(savedState?.isPlayingCinema));
  const [theaterMode, setTheaterMode] = useState(false);
  const [visibleCardCount, setVisibleCardCount] = useState<number>(24);

  // Persist current Entertainment progress so closing/reopening or reloading keeps exact place
  useEffect(() => {
    try {
      localStorage.setItem(
        ENT_STATE_KEY,
        JSON.stringify({
          activeTab,
          provider,
          searchQuery,
          selectedGenre,
          selectedMedia,
          currentEpisode,
          isPlayingCinema,
        })
      );
    } catch {
      // ignore
    }
  }, [activeTab, provider, searchQuery, selectedGenre, selectedMedia, currentEpisode, isPlayingCinema]);

  // YouTube Custom Search & Playback State
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [activeYoutubeId, setActiveYoutubeId] = useState<string>(payload?.videoId || 'W3_n7wE4vY4');

  // YouTube Shorts Vertical Feed State
  const [activeShortIndex, setActiveShortIndex] = useState(0);
  const [customShortInput, setCustomShortInput] = useState('');
  const [shortsList, setShortsList] = useState<YouTubeShortItem[]>(CURATED_YOUTUBE_SHORTS);

  // Watchlist (persisted in localStorage)
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('glassium_entertainment_watchlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return ['frieren-beyond-journeys-end', 'dune-part-two'];
    } catch {
      return ['frieren-beyond-journeys-end', 'dune-part-two'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('glassium_entertainment_watchlist', JSON.stringify(watchlist));
    } catch {
      // ignore
    }
  }, [watchlist]);

  const toggleWatchlist = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWatchlist((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const isWatchlisted = useCallback((id: string) => watchlist.includes(id), [watchlist]);

  const [onlineSearchResults, setOnlineSearchResults] = useState<MediaItem[]>([]);
  const [mappleMovies, setMappleMovies] = useState<MediaItem[]>(cachedPopularMappleMovies);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Fetch movies from mapple.fun API (with in-memory cache)
  const fetchMappleMovies = useCallback(async (q?: string) => {
    if (!q && cachedPopularMappleMovies.length > 0) {
      setMappleMovies(cachedPopularMappleMovies);
      return;
    }
    setIsSearchingOnline(true);
    try {
      const res = await backendFetch(`/api/entertainment/mapple/movies?q=${encodeURIComponent(q || '')}`);
      if (res.ok) {
        const data = (await res.json()) as { results?: MediaItem[] };
        if (Array.isArray(data.results) && data.results.length > 0) {
          if (!q) {
            cachedPopularMappleMovies = data.results;
          }
          setMappleMovies(data.results);
          if (!isPlayingCinema && activeTab === 'movies' && !selectedMedia) {
            setSelectedMedia(data.results[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch mapple movies:', err);
    } finally {
      setIsSearchingOnline(false);
    }
  }, [activeTab, isPlayingCinema, selectedMedia]);

  // Initial fetch for Mapple movies on mount or when tab becomes 'movies'
  useEffect(() => {
    if (activeTab === 'movies' && mappleMovies.length === 0) {
      fetchMappleMovies();
    }
  }, [activeTab, mappleMovies.length, fetchMappleMovies]);

  // Coordinate audio focus with Music app so Entertainment and Music never conflict
  useEffect(() => {
    const onMediaFocus = (evt: Event) => {
      const detail = (evt as CustomEvent<{ source?: string }>).detail;
      if (detail?.source === 'music') {
        setIsPlayingCinema(false);
      }
    };
    window.addEventListener('glassium-media-focus', onMediaFocus);
    return () => window.removeEventListener('glassium-media-focus', onMediaFocus);
  }, []);

  useEffect(() => {
    if (isPlayingCinema || activeTab === 'youtube' || activeTab === 'shorts') {
      window.dispatchEvent(
        new CustomEvent('glassium-media-focus', { detail: { source: 'entertainment' } })
      );
    }
  }, [isPlayingCinema, activeTab]);

  // Debounced live Multi-Source search fetch with query cache
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setOnlineSearchResults([]);
      setIsSearchingOnline(false);
      return;
    }

    const cached = cachedSearchQueries.get(q.toLowerCase());
    if (cached) {
      setOnlineSearchResults(cached);
      if (!isPlayingCinema && cached[0]) {
        setSelectedMedia(cached[0]);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const res = await backendFetch(`/api/entertainment/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = (await res.json()) as { results?: MediaItem[] };
          if (Array.isArray(data.results) && data.results.length > 0) {
            cachedSearchQueries.set(q.toLowerCase(), data.results);
            setOnlineSearchResults(data.results);
            if (!isPlayingCinema) {
              setSelectedMedia(data.results[0]);
              setCurrentEpisode(1);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setIsSearchingOnline(false);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [searchQuery, isPlayingCinema]);

  // Fetch TV episodes count when selected media changes (cached)
  useEffect(() => {
    const tmdbId = selectedMedia?.tmdbId;
    if (selectedMedia && selectedMedia.type !== 'movie' && tmdbId) {
      if (cachedTvEpisodeCounts.has(tmdbId)) {
        const epCount = cachedTvEpisodeCounts.get(tmdbId)!;
        setSelectedMedia((prev) =>
          prev && prev.episodesCount !== epCount ? { ...prev, episodesCount: epCount } : prev
        );
        return;
      }
      backendFetch(`/api/entertainment/tv?id=${tmdbId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.episodesCount) {
            cachedTvEpisodeCounts.set(tmdbId, data.episodesCount);
            setSelectedMedia((prev) => (prev ? { ...prev, episodesCount: data.episodesCount } : prev));
          }
        })
        .catch(() => {});
    }
  }, [selectedMedia]);

  // Filter media based on tab, genre, and search (properly filtering when searchQuery is active!)
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const localMatching = [...CURATED_MEDIA_CATALOG, ...mappleMovies].filter((m) => {
      if (!q) return true;
      return (
        (m.title || '').toLowerCase().includes(q) ||
        (m.originalTitle || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.genre || []).some((g) => g.toLowerCase().includes(q))
      );
    });

    let list = q ? [...onlineSearchResults, ...localMatching] : [...CURATED_MEDIA_CATALOG, ...mappleMovies];
    const seen = new Set<string>();
    list = list.filter((m) => {
      const key = m.tmdbId ? `tmdb-${m.type}-${m.tmdbId}` : m.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!q) {
      if (activeTab === 'movies') {
        list = list.filter((m) => m.type === 'movie' || m.type === 'series');
      } else if (activeTab === 'anime') {
        list = list.filter((m) => m.type === 'anime');
      }
    }

    if (selectedGenre !== 'All') {
      list = list.filter((m) => (m.genre || []).some((g) => g.includes(selectedGenre)));
    }

    return list;
  }, [onlineSearchResults, mappleMovies, activeTab, selectedGenre, searchQuery]);

  const displayedCatalog = useMemo(
    () => filteredCatalog.slice(0, visibleCardCount),
    [filteredCatalog, visibleCardCount]
  );

  // Compute embed URL via our own-origin /api/entertainment/player Cinema Gateway so iframes never fail with X-Frame-Options or Sandbox blocks!
  const currentEmbedUrl = useMemo(() => {
    if (!selectedMedia) return '';

    // If item has a direct .m4v / .mp4 video file URL and user hasn't picked a specific external provider
    if (
      selectedMedia.embedUrl &&
      (selectedMedia.embedUrl.includes('.m4v') || selectedMedia.embedUrl.includes('.mp4')) &&
      !selectedMedia.tmdbId &&
      !selectedMedia.imdbId
    ) {
      return selectedMedia.embedUrl;
    }

    const tmdbId = selectedMedia.tmdbId ? String(selectedMedia.tmdbId) : '';
    const imdbId = selectedMedia.imdbId || '';
    const ep = currentEpisode || 1;
    const ytId = selectedMedia.youtubeId || '';

    const params = new URLSearchParams({
      tmdbId,
      imdbId,
      type: selectedMedia.type,
      ep: String(ep),
      title: selectedMedia.title,
      originalTitle: selectedMedia.originalTitle || selectedMedia.title,
      provider,
      ytId,
    });

    return resolveBackendUrl(`/api/entertainment/player?${params.toString()}`);
  }, [selectedMedia, provider, currentEpisode]);

  const parseYoutubeInput = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const vMatch = trimmed.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/i);
    return vMatch ? vMatch[1] : null;
  };

  const handlePlayCustomYoutube = () => {
    const parsed = parseYoutubeInput(customYoutubeUrl);
    if (parsed) {
      setActiveYoutubeId(parsed);
      setCustomYoutubeUrl('');
    }
  };

  const handleAddCustomShort = () => {
    const parsed = parseYoutubeInput(customShortInput);
    if (parsed) {
      const newShort: YouTubeShortItem = {
        id: parsed,
        title: `YouTube Short #${parsed.slice(0, 5)}`,
        creator: 'YouTube Creator',
        views: 'ユーザー追加',
        likes: '—',
        category: 'Custom',
      };
      setShortsList([newShort, ...shortsList]);
      setActiveShortIndex(0);
      setCustomShortInput('');
    }
  };

  const nextShort = () => {
    setActiveShortIndex((prev) => (prev + 1) % shortsList.length);
  };

  const prevShort = () => {
    setActiveShortIndex((prev) => (prev - 1 + shortsList.length) % shortsList.length);
  };

  const activeShort = shortsList[activeShortIndex] ?? shortsList[0];

  return (
    <div className="h-full w-full flex flex-col bg-[#0b0f19] text-white select-none overflow-hidden font-sans">
      {/* ===================================================================
          TOP NAVIGATION BAR (Liquid Glass Styling)
         =================================================================== */}
      <header className="h-14 px-4 bg-zinc-950/70 backdrop-blur-xl border-b border-white/10 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-900/40">
            <span className="material-symbols-rounded text-lg text-white">tv</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
              Glassium Entertainment
            </h1>
            <p className="text-[10px] text-white/50 -mt-0.5">
              Prime Shows · StreameX · FlixHD · Maple TV · YouTube & Shorts
            </p>
          </div>
        </div>

        {/* Center: Tabs */}
        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => {
              setActiveTab('movies');
              setIsPlayingCinema(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'movies'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-rounded text-[16px]">movie</span>
            <span>映画・ドラマ</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('anime');
              setIsPlayingCinema(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'anime'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-rounded text-[16px]">auto_awesome</span>
            <span>アニメ</span>
          </button>
          <button
            onClick={() => setActiveTab('youtube')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'youtube'
                ? 'bg-red-500/25 text-red-300 border border-red-500/30 shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-rounded text-[16px]">play_circle</span>
            <span>YouTube動画</span>
          </button>
          <button
            onClick={() => setActiveTab('shorts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'shorts'
                ? 'bg-gradient-to-r from-red-600/30 to-pink-600/30 text-pink-300 border border-pink-500/30 shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-rounded text-[16px]">phone_android</span>
            <span>Shorts</span>
          </button>
        </nav>

        {/* Right: Provider Switcher Pill */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-white/50 hidden sm:inline">サーバー:</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as StreamingProvider)}
            className="bg-black/60 border border-white/15 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none hover:border-white/30 transition cursor-pointer"
          >
            <option value="vidlink">VidLink Pro (1080p 最推奨)</option>
            <option value="mapple-fun">VidSrc CC / Mapple (高速1)</option>
            <option value="streamex">AutoEmbed HD (ミラー2)</option>
            <option value="flixhd">2Embed Cinema (ミラー3)</option>
            <option value="mapletv">Embed.su Pro (ミラー4)</option>
            <option value="youtube">YouTube / 公式PV</option>
          </select>
        </div>
      </header>

      {/* ===================================================================
          MAIN CONTENT AREA
         =================================================================== */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* TAB 1 & 2: MOVIES & ANIME */}
        {(activeTab === 'movies' || activeTab === 'anime') && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {/* HERO BANNER / ACTIVE CINEMA PLAYER */}
            {selectedMedia && (
              <div
                className={`relative transition-all duration-300 ${
                  theaterMode
                    ? 'h-[480px] sm:h-[580px] bg-black'
                    : isPlayingCinema
                    ? 'h-[360px] sm:h-[440px] bg-black'
                    : 'h-[240px] sm:h-[300px]'
                } overflow-hidden shrink-0 border-b border-white/10`}
              >
                {isPlayingCinema ? (
                  <div className="relative w-full h-full bg-black">
                    {/\.(m4v|mp4|webm)(\?|$)/i.test(currentEmbedUrl) ? (
                      <video
                        key={currentEmbedUrl}
                        src={currentEmbedUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <iframe
                        key={`${selectedMedia.id}-${provider}-${currentEpisode}`}
                        src={currentEmbedUrl}
                        title={selectedMedia.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                      />
                    )}
                    {/* Floating Controls & 1-Click Server Switcher over video */}
                    <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-10 pointer-events-none">
                      <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-full border border-white/20 pointer-events-auto overflow-x-auto max-w-full">
                        {(
                          [
                            ['vidlink', 'VidCore 1080p'],
                            ['mapple-fun', 'VidLink Pro'],
                            ['flixhd', '2Embed (Sandbox解除)'],
                            ['streamex', 'AutoEmbed.me'],
                            ['mapletv', 'VidFast / NontonGo'],
                            ['youtube', '公式PV / Direct HD'],
                          ] as Array<[StreamingProvider, string]>
                        ).map(([provKey, label]) => (
                          <button
                            key={provKey}
                            type="button"
                            onClick={() => setProvider(provKey)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition whitespace-nowrap ${
                              provider === provKey
                                ? 'bg-rose-600 text-white shadow'
                                : 'text-white/70 hover:text-white hover:bg-white/15'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 pointer-events-auto ml-auto">
                        <button
                          onClick={() => setTheaterMode(!theaterMode)}
                          className="w-8 h-8 rounded-full bg-black/80 backdrop-blur-md hover:bg-white/20 flex items-center justify-center text-white border border-white/20 transition"
                          title={theaterMode ? '通常サイズ' : 'シアターモード'}
                        >
                          <span className="material-symbols-rounded text-base">
                            {theaterMode ? 'close_fullscreen' : 'fit_screen'}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setIsPlayingCinema(false);
                            setTheaterMode(false);
                          }}
                          className="w-8 h-8 rounded-full bg-black/80 backdrop-blur-md hover:bg-rose-500/80 flex items-center justify-center text-white border border-white/20 transition"
                          title="閉じる"
                        >
                          <span className="material-symbols-rounded text-base">close</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <img
                      src={optimizePosterUrl(selectedMedia.backdropUrl || selectedMedia.posterUrl)}
                      alt={selectedMedia.title}
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover opacity-35"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/75 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f19] via-transparent to-transparent" />

                    <div className="relative z-10 h-full max-w-5xl mx-auto px-6 py-6 flex flex-col justify-end">
                      <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full border ${PROVIDER_METADATA[provider].color}`}
                        >
                          {PROVIDER_METADATA[provider].name}
                        </span>
                        <span className="text-white/70">· {selectedMedia.year}年</span>
                        <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                          ★ {selectedMedia.rating}
                        </span>
                        {selectedMedia.episodesCount && (
                          <span className="text-white/60">
                            · 全{selectedMedia.episodesCount}話
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-tight">
                        {selectedMedia.title}
                      </h2>
                      {selectedMedia.originalTitle && (
                        <p className="text-xs text-white/50 -mt-1 mb-2 font-mono">
                          {selectedMedia.originalTitle}
                        </p>
                      )}

                      <p className="text-xs sm:text-sm text-white/80 max-w-2xl line-clamp-2 sm:line-clamp-3 mb-3 leading-relaxed">
                        {selectedMedia.description}
                      </p>

                      {/* Episode selector for Series & Anime */}
                      {Boolean(selectedMedia.episodesCount) && (
                        <div className="flex items-center gap-1.5 overflow-x-auto py-1 mb-3 max-w-xl">
                          <span className="text-[11px] text-white/60 font-semibold shrink-0">エピソード:</span>
                          {Array.from({ length: Math.min(12, selectedMedia.episodesCount || 1) }, (_, i) => i + 1).map((ep) => (
                            <button
                              key={ep}
                              onClick={() => {
                                setCurrentEpisode(ep);
                                setIsPlayingCinema(true);
                              }}
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold shrink-0 transition ${
                                currentEpisode === ep
                                  ? 'bg-rose-500 text-white shadow-sm'
                                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                              }`}
                            >
                              第{ep}話
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setIsPlayingCinema(true)}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-900/40 transition active:scale-95"
                        >
                          <span className="material-symbols-rounded text-lg">play_arrow</span>
                          <span>今すぐ再生 ({PROVIDER_METADATA[provider].name})</span>
                        </button>
                        <button
                          onClick={(e) => toggleWatchlist(selectedMedia.id, e)}
                          className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                            isWatchlisted(selectedMedia.id)
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-white/10 hover:bg-white/15 text-white/80 border-white/15'
                          }`}
                        >
                          <span className="material-symbols-rounded text-base">
                            {isWatchlisted(selectedMedia.id) ? 'check' : 'bookmark_add'}
                          </span>
                          <span>{isWatchlisted(selectedMedia.id) ? '保存済み' : 'マイリスト'}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* FILTER & SEARCH BAR */}
            <div className="px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/5">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="映画・ドラマ・アニメ名 (TMDB/mapple.fun リアルタイム検索)..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-rose-500/60 focus:bg-white/10 transition"
                />
                {isSearchingOnline && (
                  <span className="material-symbols-rounded absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 text-sm animate-spin">
                    progress_activity
                  </span>
                )}
                {!isSearchingOnline && searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                  >
                    <span className="material-symbols-rounded text-sm">close</span>
                  </button>
                )}
              </div>

              {/* Genre Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {['All', 'ファンタジー', 'アクション', 'SF', 'ダークファンタジー', 'ドラマ'].map(
                  (genre) => (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(genre)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                        selectedGenre === genre
                          ? 'bg-white text-black shadow'
                          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {genre}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* CATALOG CARDS GRID */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-rose-500" />
                  {activeTab === 'anime' ? '人気アニメ一覧' : '話題の映画・ドラマ'}
                  <span className="text-xs font-normal text-white/50">
                    ({filteredCatalog.length}作品)
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {displayedCatalog.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedMedia(item);
                      setIsPlayingCinema(true);
                    }}
                    className={`group relative rounded-xl overflow-hidden bg-zinc-900 border transition-colors duration-150 cursor-pointer flex flex-col ${
                      selectedMedia?.id === item.id
                        ? 'border-rose-500 ring-1 ring-rose-500/60'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="aspect-[2/3] w-full relative overflow-hidden bg-zinc-800">
                      <MediaPoster
                        src={optimizePosterUrl(item.posterUrl)}
                        alt={item.title}
                        title={item.title}
                        year={item.year}
                      />
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
                          <span className="material-symbols-rounded text-2xl">play_arrow</span>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/85 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                        ★ {item.rating}
                      </div>
                      <button
                        onClick={(e) => toggleWatchlist(item.id, e)}
                        className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/85 flex items-center justify-center text-white/80 hover:text-amber-400 transition-colors"
                      >
                        <span className="material-symbols-rounded text-sm">
                          {isWatchlisted(item.id) ? 'bookmark' : 'bookmark_border'}
                        </span>
                      </button>
                    </div>

                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-white/50 truncate mt-0.5">
                          {item.year} · {(item.genre || []).slice(0, 2).join(' / ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredCatalog.length > visibleCardCount && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCardCount((c) => c + 18)}
                    className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition"
                  >
                    さらに表示 ({filteredCatalog.length - visibleCardCount}作品)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: YOUTUBE PLAYER & TRENDING */}
        {activeTab === 'youtube' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto w-full">
            {/* Custom URL Input Bar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">
                  link
                </span>
                <input
                  type="text"
                  value={customYoutubeUrl}
                  onChange={(e) => setCustomYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePlayCustomYoutube()}
                  placeholder="YouTube動画URLまたは動画IDを貼り付けて再生 (例: https://www.youtube.com/watch?v=...)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-red-500/60 focus:bg-white/10 transition"
                />
              </div>
              <button
                onClick={handlePlayCustomYoutube}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow"
              >
                <span className="material-symbols-rounded text-base">play_arrow</span>
                <span>動画を再生</span>
              </button>
            </div>

            {/* Active Video Player Screen */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/15 shadow-2xl mb-6 relative">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeYoutubeId}?autoplay=1&rel=0&modestbranding=1`}
                title="YouTube Video Player"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Trending YouTube Videos List */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-red-500" />
                おすすめ・急上昇 YouTube動画
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {CURATED_YOUTUBE_VIDEOS.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => setActiveYoutubeId(vid.id)}
                  className={`group rounded-xl overflow-hidden bg-zinc-900 border transition cursor-pointer flex flex-col ${
                    activeYoutubeId === vid.id
                      ? 'border-red-500 shadow-md shadow-red-950/40 ring-1 ring-red-500'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="aspect-video relative overflow-hidden bg-zinc-800">
                    <MediaPoster
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      title={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
                        <span className="material-symbols-rounded text-xl">play_arrow</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-red-400 transition">
                      {vid.title}
                    </h4>
                    <p className="text-[11px] text-white/50 mt-1">{vid.channelTitle}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{vid.views}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: YOUTUBE SHORTS (VERTICAL FEED) */}
        {activeTab === 'shorts' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
            {/* Quick URL Input for Shorts */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 max-w-sm w-full px-4">
              <input
                type="text"
                value={customShortInput}
                onChange={(e) => setCustomShortInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomShort()}
                placeholder="Shorts URL / IDを貼る..."
                className="flex-1 bg-black/70 backdrop-blur-xl border border-white/20 rounded-full px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-pink-500"
              />
              <button
                onClick={handleAddCustomShort}
                className="w-8 h-8 rounded-full bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shrink-0 shadow"
                title="Shortsを追加"
              >
                <span className="material-symbols-rounded text-base">add</span>
              </button>
            </div>

            {/* Vertical Shorts Reel Card (9:16 Aspect Ratio) */}
            <div className="relative w-full max-w-[340px] h-[520px] rounded-3xl overflow-hidden bg-black border border-white/20 shadow-2xl flex flex-col justify-between">
              {/* YouTube Shorts Embed Iframe */}
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeShort.id}?autoplay=1&loop=1&playlist=${activeShort.id}&modestbranding=1&controls=1`}
                title={activeShort.title}
                className="w-full h-full border-0 absolute inset-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />

              {/* Top gradient overlay */}
              <div className="relative z-10 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1 text-pink-400">
                    <span className="material-symbols-rounded text-sm">bolt</span>
                    YouTube Shorts
                  </span>
                  <span className="text-white/50 text-[11px]">
                    {activeShortIndex + 1} / {shortsList.length}
                  </span>
                </div>
              </div>

              {/* Bottom metadata overlay */}
              <div className="relative z-10 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                <h4 className="text-sm font-bold text-white drop-shadow">
                  {activeShort.title}
                </h4>
                <p className="text-xs text-white/70 mt-0.5">@{activeShort.creator}</p>
                <div className="flex items-center gap-3 text-[11px] text-white/60 mt-1">
                  <span>再生: {activeShort.views}</span>
                  <span>高評価: {activeShort.likes}</span>
                </div>
              </div>
            </div>

            {/* Right-Hand Navigation Controls (Next / Prev) */}
            <div className="flex sm:flex-col items-center gap-2 mt-4 sm:mt-0 sm:absolute sm:right-1/2 sm:translate-x-52 sm:top-1/2 sm:-translate-y-1/2 z-20">
              <button
                onClick={prevShort}
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition active:scale-90"
                title="前のShorts (上)"
              >
                <span className="material-symbols-rounded text-xl">expand_less</span>
              </button>
              <button
                onClick={nextShort}
                className="w-11 h-11 rounded-full bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center transition active:scale-90 shadow-lg shadow-pink-900/40"
                title="次のShorts (下)"
              >
                <span className="material-symbols-rounded text-xl">expand_more</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
