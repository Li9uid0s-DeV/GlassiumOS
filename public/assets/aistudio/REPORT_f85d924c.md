# GlassiumOS リポジトリ分析レポート

対象: `Li9uid0s-DeV/GlassiumOS`（main ブランチ、HEAD `652a888` 時点）
調査方法: GitHub から全ソースファイル（89ファイル）を取得し、行番号付きで精査した。以下、ファイル名・行番号はすべてリポジトリ内のパスとその行番号である。推測ではなく、コードで確認できた事実のみを記載する。

---

## a. リポジトリ概要

### 構成と技術スタック

- **React 18 + TypeScript + Vite 5 + Tailwind CSS 3** の Web OS。`package.json` の scripts は `dev`/`start` が `tsx server.ts`、`build` が `vite build && node scripts/generate-svg-launcher.js`。
- エントリは `src/main.tsx`（バックエンド接続インターセプタを入れてから React を起動し、`./sw-proxy.js` を Service Worker 登録）→ `src/App.tsx`（エラーバウンダリ＋ `OSProvider`）→ `src/os/Desktop.tsx`。
- OS の中核は `src/os/OSContext.tsx`（2,325行）で、ウィンドウ管理・仮想デスクトップ・テーマ/アクセント・仮想ファイルシステム・カレンダー課題などを 1 つの巨大 Context に集約している。
- ウィンドウ枠は `src/os/WindowFrame.tsx`、タスクバー `src/os/Taskbar.tsx`（86KB）、スタートメニュー `src/os/StartMenu.tsx`、ロック画面、通知センター、動的壁紙（`DynamicWorldWallpaper.tsx` 81KB、Three.js 系 `SpaceWallpaper`/`Live2DWallpaper`/`LiquidShader`）など。
- アプリは `src/os/types.ts:1-55` の `AppId` で約50種：Browser、Terminal、Settings（166KB）、ファイルエクスプローラ、電卓、カレンダー、天気、時計、AI Assistant、App Store、ゲーム（`Game.tsx` 245KB）、シンセ/ビジュアライザ（242KB）、GarageBand、Office スイート（スプレッドシート/スライド/ノート/TSXランナー）、Entertainment、Glassium Studio、その他 ExtraAppsSuite に多数の小物ツール（単位変換、QR、JSON整形、漢字フラッシュカード等）。カスタムアプリ（`custom:` / `tsx:` プレフィックス、App Store から URL や TSX を追加）もサポートする。

### 実行・デプロイ

- **GitHub Pages**: `.github/workflows/deploy.yml` が main への push で `npm run build` し、`./dist` を Pages にデプロイする。`vite.config.ts` は `base: './'`。
- **統合サーバー**: リポジトリ内に Express サーバーが2系統同居している。(1) ルートの `server.ts`（5,795行・ルート54個）— AI Studio / ローカル実行用で、音楽・映画・AI・プロキシ等を全部入りで実装。(2) `koyeb-backend/server.js`（815行）— 旧 Koyeb 用バックエンドの複製。さらに別リポジトリ `GlassiumOS-backend`（Render 用）が存在し、同じ役割の実装が**3系統に分裂**している。
- その他: `Dockerfile`（node:20、build 後 `npm start`）、`Procfile`、`rust-core/`（Wasm コアの雛形、`src/os/rustWasmCore.ts` から参照）、`scripts/generate-svg-launcher.js`（ビルド後に単体起動用 SVG/HTML ランチャーを生成）。

### バックエンド接続の仕組み（重要）

中核は `src/os/backendConfig.ts`：

- 既定 URL は `https://glassiumos-backend-2.onrender.com`（同ファイル:9、定数名や保存キー `glassium_koyeb_backend_url` に旧 Koyeb の名残）。
- `getBackendBaseUrl()`（同:31-46）は localStorage の保存値 → `VITE_BACKEND_URL` → 既定 URL の順で解決する。
- `main.tsx:88` で `installBackendFetchInterceptor()` が呼ばれ、**`window.fetch` 自体を差し替えて**（backendConfig.ts:263-267）全ての `/api/*`、`/uv/service/*`、`/scramjet/*` リクエストをバックエンドへ振り分ける。ホスト名が静的ホスティング（github.io / dpdns.org / pages.dev 等）でない場合は「統合ローカルサーバーあり」とみなし相対パスのままにする（同:76-89）。
- プロキシは `src/os/proxyService.ts`（2,660行）が担当し、Wisp サーバーのプリセット（同:127-171、公式・サードパーティ・自前 Render の `wss://` 群）、Ultraviolet/Scramjet の Service Worker、複数フォールバック経路を持つ。
- AI は `src/os/aiClient.ts` が `backendFetch('/api/ai/chat',...)`（同:544）を叩き、失敗時はローカル応答エンジン（Wikipedia 要約など同:146-155）にフォールバックする設計。

---

## b. バグ・問題点（優先度順）

### H1. srcDoc / プロキシ iframe が `allow-scripts` + `allow-same-origin` で親と同一オリジン実行される

- `src/os/apps/Browser.tsx:1631-1640`：プロキシで取得した**外部サイトの HTML を `srcDoc` に入れ**、sandbox が `allow-scripts allow-same-origin allow-forms allow-popups allow-modals`。
- `src/os/apps/CloudAndAIGameHub.tsx:2497-2502`：AI 生成 HTML ゲームを srcDoc 実行（同 sandbox 組み合わせ）。同:2688-2703：GitHub/jsDelivr から取得した第三者 HTML ゲームも同じ。
- `src/os/Desktop.tsx:168-182`（CustomAppView）：ユーザーが追加したカスタムアプリ URL を `/api/proxy` 経由で iframe 表示し、同じ sandbox 組み合わせ。
- 問題: srcDoc のオリジンは埋め込み側と同一になるため、`allow-same-origin` + `allow-scripts` の組み合わせはサンドボックスを実質無効化する。埋め込まれた側のスクリプトから親 DOM と **localStorage（`gemini_api_key` / `glassium_ai_key` などの API キー: `src/os/apps/AIAssistantApp.tsx:116-117`、`src/os/apps/GlassiumStudio.tsx:27,77`、全 OS 設定、バックエンド URL）にアクセス可能**。悪意あるサイト/ゲーム HTML を1回開くだけでキー窃取や設定改竄が成立する。
- 対照的に `src/os/apps/GlassiumStudio.tsx:251-256` のプレビューは `allow-same-origin` を付けず正しく分離できているので、方針統一で直せる。

### H2. バックエンド死活判定が「失敗しても接続済み」と嘘をつく

- `src/os/backendConfig.ts:135-186` `autoConnectBackendServer()`：`/api/health` が失敗・非200 の場合も catch を素通りし、最終的に `status: 'connected'`、しかも **`latencyMs: 12` という固定の偽装値**（同:174-180）で状態を上書きし、`glassium-backend-status` イベントまで配信する。
- 結果: Render がスリープ/停止していても UI は「接続済み・12ms」と表示し続け、音楽・AI・プロキシが黙って失敗する原因切り分けができない。無料枠のスリープが常態の運用では特に悪影響が大きい。

### H3. TMDB API キーがフロントリポジトリ内サーバーに直書きされている

- `server.ts:3026, 3032, 3185, 3395, 3634` の5箇所で TMDB API キー（32桁）が URL 文字列に直接埋め込まれている。`server.ts` はフロントエンドと同じ**公開リポジトリ**内にあるため、キー
...[truncated 11023 chars]は誰でも取得でき、使い回されればクォータ枯渇やアカウント停止のリスクがある。環境変数 `TMDB_API_KEY` 化とキーの再発行（ローテーション）が前提。
- 参考（低）: `firebase-applet-config.json:4` にも Firebase の `apiKey` や projectId 一式がコミットされている。Firebase の Web 向け apiKey は公開前提の識別子ではあるが、Firestore/Storage のセキュリティルール側で保護されているか別途確認が必要。

### M4. 全リクエスト横取り fetch の6秒タイムアウト＋二重リクエスト

- `src/os/backendConfig.ts:224-241` `backendFetch()`：バックエンド応答が非200 の場合も例外時も、最後に `nativeFetch(input, init)` で**元の相対パスへ再リクエスト**する。静的ホストでは `/api/*` は存在しないため、失敗が二重リクエスト＋404 に化け、エラー表示が実態とずれる。
- 同:228-231 で呼び出し側の `init` を展開した後に `signal: AbortSignal.timeout(6000)` で**呼び出し側の AbortSignal を上書き**している。AI チャット（Gemini は6秒超が普通）や大きな音楽取得が横取り経由だと途中で切られやすい。
- 同:274-276 の9分間隔ヘルスチェック `setInterval` はクリアされず、モジュール常駐前提（アプリ寿命と一致するので実害は小さいが、HMR/再マウントで増殖し得る）。

### M5. 静的ホスト判定が常に false になるデッドロジック

- `src/os/backendConfig.ts:62-74` `isStaticHostWithoutBackend()`：`hasCustomBackend = Boolean(getBackendBaseUrl())` とするが、`getBackendBaseUrl()`（同:31-46）は必ず既定 URL を返すため常に true となり、この関数は**ホストに関わらず常に false** を返す。呼び出し側が「静的ホストでバックエンドなし」分岐を期待していると誤動作する。
- 関連: `src/os/proxyService.ts:312-319` のローカル Wisp ブリッジ確認は `fetch('./api/wisp-info')` と相対パスで、静的ホストやサブパス配信では 404 になる経路が残る。

### M6. 電卓の式評価が検証なしの `new Function`（もう一方は検証あり）

- `src/os/apps/Calculator.tsx:333-345` `evaluateEquation()` は `×÷−` の置換だけで `new Function('return (...)')` を実行する。同じファイルの `parseSpectClipExpression()`（同:50-60）は文字種ホワイトリスト検証をしてから同じ `new Function` を使っており、防御方針が割れている。
- 現状、入力はボタン操作と数値由来の formula が中心で直ちに悪用しにくいが、自然文シミュレータの生成式（同:468 で `setEquation(localSim.formula)`）など入力経路が増えるほど任意コード実行（= H1 と同様に localStorage のキー窃取）に直結する。安全な式パーサへの置換か、せめて検証の共通化を。

### M7. リポジトリ肥大：総量134.9MB、うち `public/` が112.2MB

- ソースは `src/` の2.87MBしかないのに、追跡ファイル総量は134.9MB。
- 内訳（manifest 集計）: アーカイブ類が計49.8MB（ルート `dist.zip` 16.5MB、`public/dist.zip` 16.5MB、`public/dist.tar.gz` 16.7MB と**同じ成果物が3重**）、`public/standalone.html` と `public/standalone.txt` が同一内容で各17.6MB（計35.3MB）、`public/assets/` 43.2MB（旧ビルドのハッシュ付き JS が7世代分・各2.1〜2.9MB、`public/assets/aistudio/` に動画2本で23.4MBを含む）、ルートにも旧ビルド `index-D_r-YRrP.js`（2.1MB）と CSS（180KB）が残る。
- `.gitignore` には「dist は jsDelivr 配信のため許可」のコメントがあり意図は分かるが、クローン・Pages 配置・jsDelivr 取得すべてが重くなる。世代を最新1つに絞り、動画とアーカイブは Release 添付に移すだけで100MB級の削減になる。

### M8. 遅延ロードなし＋閉じたウィンドウも全てマウントされ続ける

- `React.lazy` / `Suspense` はリポジトリ全体で**使用箇所ゼロ**。`src/os/Desktop.tsx:13-38` が全アプリ（Game 245KB、SynthVisualizer 242KB、Settings 166KB、Desktop 自身 152KB 等）を静的 import するため、初回バンドルに全アプリが入り、実測のビルド成果物 JS は2.1〜2.9MBある。
- `src/os/OSContext.tsx:463` の `mountedWindows = allWindows`（閉じたものを含む）を `src/os/Desktop.tsx:1811-1822` が全て描画し、`src/os/WindowFrame.tsx:345,353` は `display:none` にするだけ。状態保持のための意図的設計（永続化コメント同:1280付近）だが、閉じたゲームやビジュアライザのタイマ/描画ループも裏で生き続け、開いたアプリ数に比例して重くなる。せめて非表示時は RAF/音声を止める「スリープ」状態が欲しい。

### M9. 壁紙・アバターの data URL を単一 localStorage キーに丸ごと保存（容量超過リスク）

- `src/os/apps/Settings.tsx:891-905` の壁紙アップロードはファイルサイズ上限チェックなしで `readAsDataURL` し、`src/os/OSContext.tsx:552` の `customWallpapers` に入れ、同:1191-1196 の「Persist Settings」effect が**全設定を1つの JSON にして単一キーへ**保存する。アバター画像も同様に data URL で user に入る。
- 数MBの写真1枚で base64 化され（+約33%）、ファイルシステム用キー等（同:387-396 の LS キー群）と合わせて localStorage の目安5MBを超えやすく、超過時は保存が黙って失敗して「設定したのに戻る」症状になる。アップロード時のリサイズ/圧縮（Canvas で最大幅 1280px 等）と、失敗時の通知が要る。

### L10. 使えない Wisp プリセット `wss://localhost/api/wisp`

- `src/os/proxyService.ts:127-131` のプリセット先頭が `wss://localhost/api/wisp`。配布環境では localhost は利用者自身の端末を指すため通常つながらない。同:261-273 の接続テストは localhost を WebSocket テストから除外し相対パスの確認に回すため、UI 上は「候補」として残り続ける。開発用と明示するか、ローカル実行時のみ表示すべき。

### L11. SVG フィルタ ID の重複定義

- `src/os/GlassFilters.tsx:49` と `src/os/LiquidGlassFilter.tsx:72` が同じ `id="liquid-glass-lens"` を定義。後者は現在どこからも import されておらず実害は出ていないが、両方マウントされた時点で `url(#liquid-glass-lens)` の解決が先勝ちになり、片方の屈折表現が黙って変わる。未使用側の削除か ID の一意化を。

### L12. ウィンドウドラッグ中の effect 再購読

- `src/os/WindowFrame.tsx:278-287` のドラッグ用 effect の依存配列に `snapPreview` が含まれる。ドラッグ中にスナッププレビューが変わるたび effect が破棄・再登録され、`pointermove` リスナの付け外しと状態リセットが走る。体感しにくいが、低スペック端末ではドラッグの引っかかりの原因になり得る。snapPreview は ref 経由参照に寄せるのが定石。

### L13. バックエンド URL の検証不足（http 許容・検証なし保存）

- `src/os/backendConfig.ts:35,43` は localStorage / 環境変数の値が `http` で始まれば受理するため、`http://` のバックエンドも通る（https サイトからは混合コンテンツでブロックされ、平文区間もできる）。保存側 `setBackendBaseUrl()`（同:49-60）は無検証。`https://` 必須化（localhost 例外のみ）で足りる。

### L14. アクセシビリティと初期表示の重さ（基礎項目）

- アクセシビリティ: `src/` 全体で `<button` 出現881回に対し `aria-` 属性は18回、`role=` は1回のみ。アイコンのみのボタン（ウィンドウ操作、ドック、タスクバー等）にラベルがない箇所が多く、キーボード/読み上げでは操作対象が分からない。主要ボタンへの `aria-label` 付与だけでも効果が大きい。
- 初期表示: `index.html:46-55` が Google Fonts の12ファミリーを一括読み込みしている。実際に使うのは Quicksand / M PLUS Rounded 1c / JetBrains Mono が中心で、残りは時計フォント切替用。切替フォントは選択時に遅延読み込みすれば初回が軽くなる。

---

## c. 新機能追加案

1. **Glassium Craft（Eaglercraft 1.12.2 連携アプリ）** — 難易度: 中〜高 / バックエンド変更: 要（状態・起動 API の追加が前提）
OS 内アプリとして、Minecraft サーバーの状態表示（スリープ中/起動中/稼働中、実測レイテンシ）、「起動」ボタン、ワンクリックで Eaglercraft クライアントをウィンドウ内起動、を提供する。別途試作中の Eaglercraft サーバー計画と直結し、GlassiumOS が「ブラウザで遊べる OS」になる目玉。依存: Eaglercraft サーバーの常駐先と起動トリガ API が決まることが前提。
2. **正直な接続ステータス＆コントロールセンター** — 難易度: 低 / バックエンド変更: 不要
H2 の修正とセットで、タスクバー/クイック設定に実測ベースの接続状態（接続中/スリープ中/到達不可、実レイテンシ、最終確認時刻）と「今すぐ再接続」「バックエンドを起こす（ヘルスチェック連打ではなく Wake ボタン）」を置く。無料枠スリープが前提の運用で最も効く改善。
3. **アプリのスリープ＆遅延ロード（軽量モード2.0）** — 難易度: 中 / バックエンド変更: 不要
M8 の対策を機能として出す: アプリを `React.lazy` で分割し、閉じた/非表示のウィンドウは描画ループと音声を止めてスリープ表示にする。既存の liteMode 設定（OSContext に既にある）の発展版として提供すれば、スマホ・低スペック端末でも快適になる。
4. **コマンドパレット（Ctrl/⌘+K）** — 難易度: 中 / バックエンド変更: 不要
アプリ・ファイル・設定項目・音楽検索を横断する Spotlight 風ランチャー。StartMenu の検索が既にあるので、対象をファイルシステムと設定に広げ、キーボード完結にする。モバイルではタスクバーの検索ボタンから同じ UI を開く。
5. **プレイリスト＆お気に入り（Music 永続化）** — 難易度: 低〜中 / バックエンド変更: 不要
既存の `/api/music/search|play|lyrics` とカラオケ表示（`karaokeGuide.ts`）に、お気に入り・再生履歴・ローカルプレイリストを仮想ファイルシステム上へ保存する層を足す。歌詞同期表示と組み合わせると Music アプリの滞在理由が増える。
6. **設定バックアップ / 復元（JSON 書き出し・読み込み）** — 難易度: 低 / バックエンド変更: 不要
PC を持たず端末が変わり得る利用形態では、設定・ファイル・カレンダーを1ファイルに書き出して移せることが重要。既存の localStorage キー群と仮想 FS をまとめるだけで実装でき、M9 の容量事故時の復旧手段にもなる。
7. **PWA 化（インストール可能＋オフライン起動）** — 難易度: 中 / バックエンド変更: 不要
Web App Manifest と、プロキシ用とは別のアプリシェル用 Service Worker でキャッシュし、ホーム画面から起動できるようにする。バックエンドがスリープ中でも OS 自体は開けるようになり、H2 の状態表示と相性がいい。
8. **レイアウトプリセット（ウィンドウ配置の名前付き保存）** — 難易度: 低 / バックエンド変更: 不要
仮想デスクトップとウィンドウ永続化が既にあるので、「勉強」「音楽制作」など配置スナップショットを名前付きで保存・一括復元する。実装は既存の windows 配列の保存/復元に薄く乗る。
9. **安全な共有アプリ（サンドボックス分離実行）** — 難易度: 中〜高 / バックエンド変更: 要（分離オリジン配信が要る場合）
H1 の修正とセットで、カスタム/TSX アプリや HTML ゲームを「別オリジン＋`allow-same-origin` なし」で実行する公式の仕組みにし、URL を共有すれば友達の GlassiumOS でもそのまま遊べるギャラリーを App Store に足す。安全性が担保できて初めて共有機能が成立する。
10. **横断通知（タイマー×カレンダー×バックエンド）** — 難易度: 低 / バックエンド変更: 不要
既存の NotificationCenter とカレンダー課題を使い、バックエンド起動完了、Craft サーバーの自動スリープ予告、課題期限を OS 通知に統一する。小さいが日常の使い勝手に効く。

---

## d. GlassiumOS 6 デザイン案

### コンセプト

**GlassiumOS 6 — “Deep Prism（深海プリズム）”**：5 の「明るい水面のガラス」から、「深さと屈折で奥行きを作るプリズムガラス」へ。現行の資産（ダイナミックアクセント、SVG 屈折フィルタ、丸みのある書体）を捨てず、色と質感をトークン化して一貫させる進化案。同梱の `glassiumos6-mockup.html` がこの案のホーム画面モックアップである。

### 現行デザイン（実コード確認）

- ブランドグラデーションはフューシャ `#d946ef` → バイオレット `#8b5cf6` → シアン `#06b6d4`（README、favicon グラデも同系）。
- ガラス面は `.liquid-glass-window` が `backdrop-filter: blur(var(--theme-blur, 24px)) saturate(160%)`、角丸 `var(--theme-radius, 16px)`（`src/index.css:202-205`）。強い面では blur 40px / saturate 220%（同:417）やドック系 blur 32px / 角丸24px（同:445-446）など、面ごとに値が散在している。
- 書体は `--font-os-sans`（Quicksand / Outfit / Comfortaa ＋ M PLUS Rounded 1c / Zen Maru Gothic、`src/index.css:11-14`）、等幅は JetBrains Mono。時計フォントは6種のプリセットを持つ。
- アクセントは壁紙や時刻から自動算出され `--os-accent` に流し込まれる（`src/os/OSContext.tsx:1054-1070, 1129-1130`）ダイナミック方式。ライトテーマは `[data-theme='light']` の上書き群（`src/index.css:631-`）で対応。シェルは windows / mac / ubuntu / dex / chromeos / android 等の多モード（WindowFrame の形状切替）。

### 6 のデザインシステム

- **デザイントークン（テーマ＝ tint / blur / radius の3点セットで切替）**

```css
:root{
--glass-accent:#8b5cf6; /* Violet Prism */
--glass-accent-2:#06b6d4; /* Cyan Reef */
--glass-accent-3:#d946ef; /* Fuchsia Glow（差し色） */
--glass-accent-grad:linear-gradient(120deg,var(--glass-accent-3),var(--glass-accent) 48%,var(--glass-accent-2));
--glass-tint:139 92 246; /* 面の色味（RGB triplet、壁紙で可変） */
--glass-bg:rgba(16,14,34,.52);
--glass-bg-strong:rgba(20,17,44,.68);
--glass-bg-soft:rgba(255,255,255,.07);
--glass-stroke:rgba(255,255,255,.22);
--glass-stroke-soft:rgba(255,255,255,.10);
--glass-highlight:rgba(255,255,255,.55); /* 上端スペキュラ */
--glass-blur:22px; --glass-blur-lg:34px; --glass-saturate:170%;
--glass-radius-window:24px; --glass-radius-dock:28px;
--glass-radius-card:18px; --glass-radius-pill:999px;
--glass-text:#f6f4ff; --glass-text-dim:rgba(238,236,255,.68); --glass-text-faint:rgba(238,236,255,.44);
--glass-shadow:0 24px 60px rgba(2,0,16,.45),0 4px 16px rgba(2,0,16,.28);
--glass-ease:cubic-bezier(.22,1.2,.36,1); /* 液体っぽい戻りのあるイージング */
}
[data-theme='light']{
--glass-bg:rgba(255,255,255,.55); --glass-bg-strong:rgba(255,255,255,.72);
--glass-text:#1b1440; --glass-text-dim:rgba(27,20,64,.66); --glass-text-faint:rgba(27,20,64,.45);
--glass-stroke-soft:rgba(27,20,64,.12);
}
```

- **ホーム/デスクトップ**: 左に「時計ヒーロー」（グラデーション文字の大きな時刻＋日付＋挨拶、その下に主要4アプリのガラスタイル）、右に開いているウィンドウ、という非対称レイアウト。壁紙は濃紺ベースに3つのプリズムオーブ（violet / cyan / fuchsia のラジアルグラデーション球）を浮かせ、奥行きを作る。
- **ステータスバー**: 画面上部に浮くピル型バーへ統合（ロゴ、メニュー、右側に接続ステータスのピル＋時計）。5 のタスクバー常駐型より画面が広く使え、状態表示（案 c-2）と相性がいい。
- **ドック**: 下部中央のフローティングドック（角丸28px、`--glass-bg-strong` + blur 34px）。ホバーでアイコンが `translateY(-10px) scale(1.16)` と液体のように膨らみ、ツールチップはピル型。実行中は下に光るドット、アクティブなアプリはグラデーション面になる。
- **ウィンドウ**: 角丸24px、下端の角丸をやや大きめにした「しずく」プロファイル。上端1px のスペキュラライン＋枠のグラデーションマスクで縁が光る。交通信号ボタン（丸3つ）は維持しつつ、フォーカス中ウィンドウのヘッダ下にアクセントグラデーションの細線（focus ring）を引いて、重なり順を色で伝える。ドラッグ中は影が深くなり `scale(1.01)` で「持ち上がる」。
- **アプリアイコン**: 角丸 16〜17px のガラスタイル地（`--glass-bg-soft` ＋ inset ハイライト）に、白のラインアイコン（stroke 1.7、ドロップシャドウ付き）を載せる統一方針。アプリ固有色はアイコン地の淡いティントだけに留め、並べたときの統一感を優先する。
- **タイポグラフィ**: 本文は現行の丸ゴ系（Quicksand / M PLUS Rounded 1c）を継承し、時刻と数値だけ等幅（tabular-nums）を厳密化。ヒーロー時刻は白→ラベンダー→シアンのグラデーション文字にする。
- **モーション**: 全て `--glass-ease`（戻りのあるイージング）に統一。ウィンドウ開閉はドック/アイコン位置からのスケール＋フェード、ホバーは「膨らむ」、押下は `scale(.98)` で沈む。壁紙オーブは16秒周期のゆっくりしたドリフトのみ。`prefers-reduced-motion` では全アニメーション無効を標準装備にする。
- **ダーク/ライト**: 既定はダーク（Deep Prism）。ライトは tint を落として面を白ガラス化し、文字を濃紺 `#1b1440` に反転（トークン差し替えのみで実現）。時刻連動の自動切替は現行の themeMode を継承。
- **モバイル**: 860px 以下で1カラム化し、ウィンドウは全画面、ドックは画面幅いっぱいのタブバー型（拡大ホバーなし）、ステータスバーのメニューは省略して時計と状態ピルだけ残す。デスクトップアイコンは4列グリッドに並べ替える。
- **署名インタラクション**: (1) フォーカスリングのグラデーション線、(2) ドックの液体膨張ホバー、(3) 起動・スリープなどの状態がステータスバーのピル色（緑=稼働/琥珀=待機/赤=到達不可）で常時見えること、の3点を 6 の顔とする。
