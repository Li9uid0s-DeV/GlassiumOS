import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { soundService } from './soundService';
import { UserProfile, UIStyle, Theme } from './types';

export interface InitialSetupResult {
  user: UserProfile;
  uiStyle: UIStyle;
  theme: Theme;
  accentColor: string;
}

export interface InitialSetupWizardProps {
  onComplete: (result: InitialSetupResult) => void;
  initialUser?: UserProfile | null;
  initialUiStyle?: UIStyle;
  initialTheme?: Theme;
  initialAccent?: string;
}

const AVATAR_PRESETS = [
  { id: 'av-glass', label: 'Liquid Glass', emoji: '💎' },
  { id: 'av-astronaut', label: 'Astronaut', emoji: '🚀' },
  { id: 'av-galaxy', label: 'Cosmos', emoji: '🌌' },
  { id: 'av-neon', label: 'Cyber Spark', emoji: '⚡' },
  { id: 'av-music', label: 'Audiophile', emoji: '🎧' },
  { id: 'av-gamer', label: 'Game Master', emoji: '🎮' },
  { id: 'av-creator', label: 'Creator', emoji: '🎨' },
  { id: 'av-planet', label: 'Saturn', emoji: '🪐' },
  { id: 'av-cat', label: 'Cyber Cat', emoji: '🐱' },
];

const ACCENT_PRESETS = [
  { hex: '#06b6d4', name: 'Glassium Cyan (標準)' },
  { hex: '#3b82f6', name: 'Electric Blue' },
  { hex: '#8b5cf6', name: 'Hyper Purple' },
  { hex: '#ec4899', name: 'Neon Pink' },
  { hex: '#10b981', name: 'Aurora Emerald' },
  { hex: '#f59e0b', name: 'Golden Amber' },
  { hex: '#ef4444', name: 'Ruby Red' },
  { hex: '#14b8a6', name: 'Deep Teal' },
];

const UI_STYLE_OPTIONS: Array<{
  id: UIStyle;
  title: string;
  sub: string;
  desc: string;
}> = [
  {
    id: 'liquid-glass',
    title: 'iOS 27 Liquid Glass (推奨)',
    sub: '流体ガラス & ゼロボーダー',
    desc: '光学的透過・屈折と深度効果を備えた Glassium OS 最先端の近未来UIスタイル。',
  },
  {
    id: 'acrylic',
    title: 'Fluent Acrylic',
    sub: 'Windows 11 アクリル調',
    desc: '美しく洗練されたソフトブラーと均整の取れたタスクバー・ウィンドウ構成。',
  },
  {
    id: 'mica',
    title: 'Mica Alt',
    sub: '高コントラスト・マイカ調',
    desc: '壁紙の色調を自然に馴染ませる落ち着いたデスクトップテクスチャ。',
  },
  {
    id: 'neumorphic',
    title: 'Soft Neumorphism',
    sub: '立体エンボス・ソフトシャドウ',
    desc: '物理的な押し込み感とやわらかな光と影の質感を再現。',
  },
];

const THEME_OPTIONS: Array<{
  id: Theme;
  title: string;
  sub: string;
  bgPreview: string;
}> = [
  {
    id: 'dark',
    title: 'Deep Dark (推奨)',
    sub: 'ディープスペース・ダーク',
    bgPreview: 'from-slate-950 via-slate-900 to-slate-950',
  },
  {
    id: 'amoled',
    title: 'Pure Black (AMOLED)',
    sub: '純黒・漆黒コントラスト',
    bgPreview: 'from-black via-zinc-950 to-black',
  },
  {
    id: 'light',
    title: 'Snow Light',
    sub: 'クリーン・スノーライト',
    bgPreview: 'from-slate-100 via-white to-slate-200',
  },
  {
    id: 'cyber',
    title: 'Neon Cyber',
    sub: 'サイバーパンク・ネオン',
    bgPreview: 'from-purple-950 via-slate-950 to-cyan-950',
  },
];

export const InitialSetupWizard: React.FC<InitialSetupWizardProps> = ({
  onComplete,
  initialUser,
  initialUiStyle = 'liquid-glass',
  initialTheme = 'dark',
  initialAccent = '#06b6d4',
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Account & Password
  const [name, setName] = useState(initialUser?.name || 'Glassium User');
  const [selectedAvatar, setSelectedAvatar] = useState(initialUser?.avatar || '💎');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Step 2: UI Style
  const [chosenUiStyle, setChosenUiStyle] = useState<UIStyle>(initialUiStyle);

  // Step 3: Theme & Accent Color
  const [chosenTheme, setChosenTheme] = useState<Theme>(initialTheme);
  const [chosenAccent, setChosenAccent] = useState<string>(initialAccent);

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setName('Glassium User');
    }
    if (password && password !== confirmPassword) {
      setPasswordError('確認用パスワードと一致しません');
      soundService.playNotify();
      return;
    }
    setPasswordError('');
    soundService.playClick();
    setStep(2);
  };

  const handleFinish = () => {
    soundService.playOpen();
    const finalProfile: UserProfile = {
      name: name.trim() || 'Glassium User',
      avatar: selectedAvatar,
      password: password ? password : undefined,
      createdAt: Date.now(),
    };

    onComplete({
      user: finalProfile,
      uiStyle: chosenUiStyle,
      theme: chosenTheme,
      accentColor: chosenAccent,
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 select-none overflow-y-auto">
      {/* Immersive background with dynamic ambient glow */}
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-3xl" />
      <div
        className="fixed -top-32 -left-32 w-96 h-96 rounded-full blur-[110px] opacity-60 pointer-events-none transition-colors duration-500"
        style={{ background: chosenAccent }}
      />
      <div className="fixed -bottom-32 -right-32 w-96 h-96 rounded-full blur-[110px] opacity-40 bg-fuchsia-600 pointer-events-none" />

      {/* Main Setup Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xl rounded-3xl bg-slate-900/90 border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.7)] text-white overflow-hidden p-6 sm:p-8"
      >
        {/* Top Header & Progress Stepper */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-colors"
              style={{ background: chosenAccent }}
            >
              <Icon name="Sparkles" size={20} className="text-slate-950 font-bold" />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-cyan-300 font-bold">
                GLASSIUM OS · INITIAL SETUP
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">
                {step === 1 && 'アカウントとセキュリティの作成'}
                {step === 2 && 'UI スタイルの選択'}
                {step === 3 && 'テーマとアクセントカラーの選択'}
                {step === 4 && 'セットアップ完了'}
              </h2>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === s
                    ? 'w-6 bg-cyan-400'
                    : s < step
                    ? 'w-2 bg-white/50'
                    : 'w-2 bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: ACCOUNT & PASSWORD SETTING */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleNextStep1}
              className="space-y-5"
            >
              {/* Avatar selection */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-2">
                  アバターを選択
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {AVATAR_PRESETS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(av.emoji);
                        soundService.playClick();
                      }}
                      className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center border transition cursor-pointer ${
                        selectedAvatar === av.emoji
                          ? 'bg-white/20 border-cyan-400 scale-110 shadow-lg'
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                      title={av.label}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">
                  ユーザー名（表示名）
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ユーザー名を入力..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-black/45 border border-white/20 text-white text-sm outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Password Setting (Optional!) */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="Key" size={15} className="text-cyan-300" />
                    <span className="text-xs font-bold text-white">
                      パスワードの設定（任意）
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-white/70">
                    設定なしもOK
                  </span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  ※ パスワードを設定するとロック画面で解除時にパスワードが必要になります。空白のままにすると、ワンクリックで即座にロック解除できます。
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] text-white/60 mb-1">
                      パスワード
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="パスワード（省略可能）"
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/60 mb-1">
                      パスワード再確認
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="再確認用"
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {passwordError && (
                  <div className="text-[11px] font-bold text-rose-400">{passwordError}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-lg hover:scale-105 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>次へ（UI スタイル）</span>
                  <Icon name="ArrowRight" size={14} />
                </button>
              </div>
            </motion.form>
          )}

          {/* STEP 2: UI STYLE SELECTION */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {UI_STYLE_OPTIONS.map((opt) => {
                  const isSelected = chosenUiStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setChosenUiStyle(opt.id);
                        soundService.playClick();
                      }}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-cyan-400/15 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-xs text-white">{opt.title}</span>
                          {isSelected && (
                            <Icon name="Check" size={14} className="text-cyan-300" />
                          )}
                        </div>
                        <div className="text-[10px] text-cyan-200/90 font-bold mb-1.5">
                          {opt.sub}
                        </div>
                        <p className="text-[11px] text-white/65 leading-relaxed">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                >
                  戻る
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setStep(3);
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-lg hover:scale-105 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>次へ（テーマ & カラー）</span>
                  <Icon name="ArrowRight" size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: THEME & ACCENT COLOR */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* Theme selector */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-2">
                  システムテーマ
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {THEME_OPTIONS.map((th) => {
                    const isSelected = chosenTheme === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          setChosenTheme(th.id);
                          soundService.playClick();
                        }}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-400/20 border-cyan-400 shadow-md'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
                        }`}
                      >
                        <div
                          className={`w-full h-8 rounded-xl bg-gradient-to-br ${th.bgPreview} border border-white/20 mb-2`}
                        />
                        <div className="text-xs font-bold text-white">{th.title}</div>
                        <div className="text-[10px] text-white/60">{th.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color selector */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-2">
                  アクセントカラー
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ACCENT_PRESETS.map((ac) => {
                    const isSelected = chosenAccent === ac.hex;
                    return (
                      <button
                        key={ac.hex}
                        type="button"
                        onClick={() => {
                          setChosenAccent(ac.hex);
                          soundService.playClick();
                        }}
                        className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'border-white bg-white/15 shadow-md'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/10'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-full shrink-0 shadow border border-white/40"
                          style={{ background: ac.hex }}
                        />
                        <span className="text-[11px] font-bold text-white truncate">
                          {ac.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                >
                  戻る
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setStep(4);
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-lg hover:scale-105 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>確認画面へ</span>
                  <Icon name="ArrowRight" size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: REVIEW & CONFIRMATION */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="p-5 rounded-3xl bg-white/[0.05] border border-white/15 space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl text-3xl flex items-center justify-center shadow-xl border border-white/30"
                    style={{ background: chosenAccent }}
                  >
                    {selectedAvatar}
                  </div>
                  <div>
                    <div className="text-base font-black text-white">{name}</div>
                    <div className="text-xs text-cyan-300 font-mono">
                      {password ? '🔒 パスワード保護あり' : '🔓 パスワードなし (即時解除)'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <div className="text-[10px] text-white/60 mb-0.5">UIスタイル</div>
                    <div className="font-bold text-white">{chosenUiStyle}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/60 mb-0.5">テーマ</div>
                    <div className="font-bold text-white capitalize">{chosenTheme}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/60 mb-0.5">アクセント</div>
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <div
                        className="w-3 h-3 rounded-full border border-white/50"
                        style={{ background: chosenAccent }}
                      />
                      <span>{chosenAccent}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                >
                  戻る
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-8 py-3 rounded-2xl text-slate-950 font-black text-sm shadow-2xl hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer"
                  style={{ background: chosenAccent }}
                >
                  <Icon name="Sparkles" size={17} />
                  <span>GlassiumOS を開始する</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
