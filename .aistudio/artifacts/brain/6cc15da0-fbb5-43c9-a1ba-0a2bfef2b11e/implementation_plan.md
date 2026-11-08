# Glassium Music & Entertainment — Full-Length Audio, Exact Lyric Sync, Dolby Atmos & Settings Overhaul

このプランでは、音楽が30秒で止まる問題と別の曲・ズレた歌詞が表示される問題を根本から解決し、Music・Entertainment両アプリの全機能が100%確実に動作するよう刷新します。さらに、Dolby Atmos（3D空間オーディオ）エンジン、音質・取得サイト・曲ダウンロード品質・MV画質を変更できる統合設定パネル、および画面内で自由にドラッグ移動・最小化できる再生ピル（Dock）を実装します。

## User Review & Critical Decisions

> [!IMPORTANT]
> 事前質問でご回答いただいた以下の3つの仕様を確定方針として設計に反映しています。

- **Confirmed Decision 1 (フル尺再生と歌詞の厳密一致)**: **フル尺優先の自動マルチソース切替と厳密な曲名・歌手名一致の歌詞同期**を採用します。30秒プレビューへの安易なフォールバックを廃止し、フル尺ストリーム（NetEase Direct / GDStudio Multi-Source / Saavn 320kbps / Monochrome）を並列解決して実時間（3〜5分フル尺）で再生します。歌詞は曲名・アーティスト名の厳密一致検証とネイティブLRCタイムスタンプ保持により、別曲混入と同期ズレを完全に防ぎます。
- **Confirmed Decision 2 (Dolby Atmos 空間オーディオ)**: **3D空間オーディオ＋サラウンドリバーブ＋ダイナミックEQのDolby Atmosエンジン**をWeb Audio APIで構築し、ワンタップ切替およびプリセット調整（シアター / ミュージックスタジオ / バイノーラル / オフ）に対応します。
- **Confirmed Decision 3 (再生バー/ピルの移動・最小化)**: **画面内の自由なドラッグ移動＋最小化でコンパクトなミニピルに変形**するフローティング機構を実装します。最小化時はアートワーク・曲名・再生/一時停止ボタンのみの超小型ピルになり、ドラッグで好きな位置へ配置・ワンクリックで元のDockバーへ展開できます。

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **100% フル尺音楽再生 & 実曲ダウンロード機能**: 30秒制限のないフル尺音源ソースを優先取得・ストリーミングし、指定したダウンロード品質（FLAC 24-bit / 320kbps MP3 / 256kbps AAC / 128kbps 省データ）でローカルへ直接ファイル保存（ダウンロード）できます。
  2. **厳密一致・ミリ秒同期の歌詞エンジン**: LRCLIB `/api/get`・厳密フィルタ付き検索・NetEase LRCを組み合わせ、曲名とアーティスト名が一致する歌詞のみを取得。LRC本来のタイムスタンプを歪めずにそのまま同期させ、手動オフセット微調整（±0.1秒単位）も備えます。
  3. **Dolby Atmos 3D Spatial Audio DSP**: Web Audio APIの3Dステレオワイドナー・コンボルバー空間リバーブ・マルチバンドコンプレッサー・低域エンハンサーを統合したリアルタイムDolby Atmosプロセッサを搭載します。
  4. **統合設定パネル（音質・取得サイト・DL品質・MV画質）**: ストリーミング音質、優先取得サイト（Monochrome / NetEase Hi-Fi / Saavn Global / Kuwo Lossless / 自動マルチソース）、曲ダウンロード品質、MV再生画質（2160p 4K / 1080p FHD / 720p HD / 480p 軽量）を一元管理・即時反映します。
  5. **ドラッグ移動＆最小化対応の再生ピル（Dock）**: アプリ内の下部再生DockおよびOSデスクトップ上の音楽ピルの両方を、ポインタードラッグで自由な座標へ移動でき、最小化ボタンでコンパクトなミニピルへ変形できます。
  6. **Entertainment アプリの完全安定化**: Mapple.fun 映画・アニメ・海外ドラマ再生時に複数埋め込みサーバーの自動フェイルオーバーとエピソード切替検証を行い、エラーゼロで視聴できるようにします。

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  - **フル尺再生 & 歌詞同期**: 曲をクリックするとフル尺ストリームが即座に開始され、再生バーの総再生時間が実際のフル尺長（例: `3:45` / `4:21`）に自動同期します。歌詞はその曲固有のLRCタイムスタンプで正確にハイライトされます。
  - **設定パネル（Settings）操作**: サイドバーまたは再生ピルの「設定」から、ストリーミング音質・取得サイト・ダウンロード品質・MV画質・Dolby Atmosモードをリアルタイムに変更できます。
  - **曲ダウンロード**: 各曲の行または再生バーの「DL」ボタンを押すと、設定されたダウンロード品質で音声ファイルを即座にダウンロードします。
  - **再生ピルのドラッグ & 最小化**: 再生バー左端のドラッグハンドル（またはバー上部）を掴んでウィンドウ内の好きな場所へ移動でき、「最小化」ボタンで邪魔にならないミニピルへ縮小できます。
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: GlassiumOS Liquid Glass デザイン。通常時は視認性の高いダークスレート（`#121316`）を基調とし、アートワーク最大化時のみ4象限カラー抽出による流体グラデーション背景が展開します。
  - *Typography & Hierarchy*: 見出し・曲名には視認性の高いサンセリフ体、再生時間・ビットレート・周波数・タイムスタンプにはすべて等幅の `font-mono tabular-nums` を適用し、数値変化時のレイアウト揺れを防止します。

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: フル尺ストリーム優先解決と30秒プレビュー排除**
  - *Chosen Approach*: バックエンドの `/api/music/play` でタイムアウト上限を適切に拡張し、`X-Real-IP` / `Referer` ヘッダー付き NetEase Direct・GDStudio（`netease` / `kuwo` / `tidal`）・JioSaavn 320kbps フル尺ストリームを優先取得します。レスポンスの `Content-Length` と Content-Type を検証し、フル尺音源を確実にストリーミングします。
  - *Why*: 従来は2.6秒の短いタイムアウトによりフル尺解決が中断され、30秒のプレビュー音源にフォールバックしていたため、これを根本解決します。
- **Decision 2: 歌詞の曲名・歌手名厳密スコアリングとネイティブタイムスタンプ維持**
  - *Chosen Approach*: 歌詞検索時に「曲名の一致度」と「メインアーティスト名の一致度」の両方が閾値を満たす候補のみを採用し、尺の長さだけで別曲の歌詞を選んでしまうバグを排除します。また、LRCの `[mm:ss.xx]` タイムスタンプを曲尺に合わせて引き伸ばす処理をやめ、原曲の歌唱タイミング通りに同期させます。
  - *Why*: 別の曲の歌詞が表示されたり、歌詞タイミングが歌とズレる問題を100%防ぐためです。
- **Decision 3: Web Audio API によるリアル Dolby Atmos 空間オーディオ処理**
  - *Chosen Approach*: `GlobalAudioManager` に Web Audio API ノードグラフ（`MediaElementAudioSourceNode` → Bass/Presence EQ → Stereo Spatial Matrix / Delay Haasing & Impulse Convolver → DynamicsCompressor → Destination）を組み込み、スイッチ1つで立体音響を有効化します。
  - *Why*: 見た目だけのバッジではなく、実際に音の広がり・奥行き・定位が変化する本物の空間オーディオ体験を提供するためです。

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Glassium Music & Entertainment                      │
├───────────────────────────────────┬────────────────────────────────────────┤
│     SynthVisualizer (Music UI)    │       GlobalAudioManager & DSP         │
│  ┌─────────────────────────────┐  │  ┌──────────────────────────────────┐  │
│  │ Browse / Artist / MV Stage  │  │  │ HTML5 <audio> (CORS / Range OK)  │  │
│  │ + Direct Track Downloader   │  │  └────────────────┬─────────────────┘  │
│  └──────────────┬──────────────┘  │                   ▼                    │
│                 ▼                 │  ┌──────────────────────────────────┐  │
│  ┌─────────────────────────────┐  │  │ Dolby Atmos 3D Web Audio Graph   │  │
│  │ Music Settings View         │──┼─►│ • 3D Spatial Panner / Widener    │  │
│  │ • Audio Bitrate / Quality   │  │  │ • Surround Convolver Reverb      │  │
│  │ • Source Site Selector      │  │  │ • Dynamic EQ & Limiter           │  │
│  │ • Track Download Quality    │  │  └──────────────────────────────────┘  │
│  │ • MV Video Resolution       │  │                                        │
│  │ • Dolby Atmos Mode & EQ     │  │  ┌──────────────────────────────────┐  │
│  └──────────────┬──────────────┘  │  │ Exact Lyric Sync Engine          │  │
│                 ▼                 │  │ • Strict Title + Artist Verifier │  │
│  ┌─────────────────────────────┐  │  │ • Native [mm:ss.xx] LRC Parser   │  │
│  │ Draggable & Minimizable     │  │  └──────────────────────────────────┘  │
│  │ Liquid Glass Player Pill    │  │                                        │
│  └─────────────────────────────┘  │                                        │
└─────────────────┬─────────────────┴───────────────────┬────────────────────┘
                  │                                     │
                  ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     Express Backend Proxy (/api/music/*)                   │
│  • /api/music/play     : Multi-Source Full-Length Resolver (br & source)   │
│  • /api/music/download : Content-Disposition Full Track File Download      │
│  • /api/music/lyrics   : Verified Exact Track + Artist LRC Resolver        │
│  • /api/music/mv       : Multi-Resolution (4K/1080p/720p/480p) MV Stream   │
└────────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping
- **Settings State (`MusicSettingsConfig`)**: `localStorage` に永続化され、`streamingQuality`（`lossless` / `320` / `192` / `128`）、`sourceSite`（`auto` / `monochrome` / `netease` / `saavn` / `kuwo`）、`downloadQuality`（`flac` / `320` / `192` / `128`）、`mvQuality`（`2160p` / `1080p` / `720p` / `480p`）、`dolbyAtmosEnabled`（boolean）、`dolbyAtmosPreset`（`theater` / `studio` / `binaural`）を保持します。
- **Draggable & Minimizable Pill State**: `pillPosition: { x: number; y: number }` と `isPillMinimized: boolean` を持ち、ポインターイベント（`onPointerDown` / `onPointerMove` / `onPointerUp`）で画面境界内にクランプしながら滑らかに移動・最小化・展開します。
