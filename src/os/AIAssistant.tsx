import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from './OSContext';
import { Icon } from './Icon';
import { requestAIChat } from './aiClient';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  action?: () => void;
  actionLabel?: string;
  timestamp: number;
}

const QUICK_PROMPTS = [
  { label: '🎬 映画・アニメを開く', query: '映画を開いて' },
  { label: '🎵 音楽プレイヤー起動', query: '音楽を開いて' },
  { label: '🌙 ダーク/ライト切替', query: 'ライトモードにして' },
  { label: '🍎 macOSモードにする', query: 'macOSモードにして' },
  { label: '📐 ウィンドウ左右整列', query: 'ウィンドウを左右に整列して' },
];

export function AIAssistant() {
  const {
    openApp,
    playSound,
    setShellMode,
    setTheme,
    setWallpaper,
    setAuroraColor,
    setVolume,
    lockSystem,
    snapAllWindows5050,
    closeAllWindows,
  } = useOS();

  const [expanded, setExpanded] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'こんにちは！Glassium AI アシスタントです。「映画を開いて」「macOSモードにして」「壁紙を桜にして」「音量を50にして」などのOS操作や質問に何でも対応します。',
      timestamp: Date.now(),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && !searchFilter.trim()) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isThinking, expanded, searchFilter]);

  const visibleMessages = chatMessages.filter((msg) => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return true;
    return msg.text.toLowerCase().includes(q);
  });

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsThinking(true);
    playSound?.('click');

    try {
      const data = await requestAIChat({ message: trimmed });
      const aiReply = data.reply || '応答を受信しました。';
      const act = data.action || data.osAction;

      if (act && act.type) {
        const target = String(act.target ?? act.value ?? '');
        if (act.type === 'open_app' || act.type === 'open') {
          openApp(target as Parameters<typeof openApp>[0]);
        } else if (act.type === 'set_shell' || act.type === 'shell') {
          setShellMode(target as Parameters<typeof setShellMode>[0]);
        } else if (act.type === 'set_theme' || act.type === 'theme') {
          if (target === 'light' || target === 'dark') setTheme(target);
        } else if (act.type === 'set_wallpaper' || act.type === 'wallpaper') {
          setWallpaper(target as Parameters<typeof setWallpaper>[0]);
        } else if (act.type === 'set_aurora') {
          setWallpaper('live2d');
          setAuroraColor(target as Parameters<typeof setAuroraColor>[0]);
        } else if (act.type === 'set_volume' || act.type === 'volume') {
          const v = Number(target);
          if (Number.isFinite(v)) setVolume(Math.max(0, Math.min(100, v)));
        } else if (act.type === 'lock_screen' || act.type === 'lock') {
          lockSystem();
        } else if (act.type === 'snap_windows') {
          snapAllWindows5050();
        } else if (act.type === 'close_all') {
          closeAllWindows();
        }
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: aiReply,
          actionLabel: act?.label,
          timestamp: Date.now(),
        },
      ]);
      playSound?.('notify');
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: '回答を生成しました。続けてご質問があれば入力してください。',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(chatInput);
  };

  const clearChat = () => {
    setSearchFilter('');
    setChatMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: 'チャット履歴をクリアしました。OSの操作や質問などお気軽にお尋ねください。',
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <>
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`relative h-8 w-8 rounded-lg flex items-center justify-center transition shrink-0 ${
          expanded ? 'glass-jelly text-sky-300' : 'hover:bg-white/10 text-white/80'
        }`}
        title="AI アシスタント"
      >
        <Icon name="Sparkles" size={16} className="text-sky-300" />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {expanded && (
              <>
                <div className="fixed inset-0 z-[5100]" onClick={() => setExpanded(false)} />
                <motion.div
                  initial={{ opacity: 0, x: 80 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 80 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                  className="liquid-glass-card fixed top-3 right-3 bottom-14 z-[5200] w-84 sm:w-96 max-w-[calc(100vw-24px)] flex flex-col justify-between p-4 shadow-2xl"
                >
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl glass-jelly flex items-center justify-center text-sky-300">
                    <Icon name="Bot" size={16} />
                  </div>
                  <div className="text-sm font-semibold text-white">AI アシスタント</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setExpanded(false);
                      openApp('ai');
                    }}
                    className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition"
                    title="ウィンドウで開く"
                  >
                    <Icon name="ExternalLink" size={14} />
                  </button>
                  <button
                    onClick={clearChat}
                    className="p-1.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition"
                    title="履歴を消去"
                  >
                    <Icon name="RotateCcw" size={14} />
                  </button>
                  <button
                    onClick={() => setExpanded(false)}
                    className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition"
                  >
                    <Icon name="X" size={16} />
                  </button>
                </div>
              </div>

              {/* Search Bar for Chat Messages */}
              <div className="pt-2 pb-1.5 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2 glass-panel rounded-xl px-2.5 py-1.5 border border-white/10 focus-within:border-sky-400/40">
                  <Icon name="Search" size={13} className="text-sky-300 shrink-0" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="会話メッセージを検索..."
                    className="flex-1 bg-transparent text-[11px] text-white placeholder:text-white/40 outline-none"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="text-white/50 hover:text-white p-0.5"
                    >
                      <Icon name="X" size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Prompt Chips */}
              <div className="py-2 border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1.5">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(qp.query)}
                    className="px-2.5 py-1 rounded-xl text-[11px] glass-jelly text-white/85 whitespace-nowrap"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3">
                {visibleMessages.length === 0 ? (
                  <div className="text-center py-8 text-xs text-white/50">
                    「{searchFilter}」に一致するメッセージはありません
                  </div>
                ) : (
                  visibleMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap select-text ${
                        msg.sender === 'user'
                          ? 'glass-jelly bg-sky-500/25 text-white'
                          : 'glass-panel text-white/95'
                      }`}
                    >
                      {msg.text}
                      {msg.action && (
                        <div className="mt-2.5 pt-2 border-t border-white/10">
                          <button
                            onClick={msg.action}
                            className="px-3 py-1.5 rounded-xl glass-jelly text-sky-300 font-semibold text-[11px] flex items-center gap-1.5"
                          >
                            <Icon name="Sparkles" size={12} />
                            <span>{msg.actionLabel || '実行する'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
                )}

                {isThinking && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-panel w-fit text-xs text-white/80">
                    <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                    <span>考え中...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleChatSubmit} className="pt-2 border-t border-white/10 shrink-0">
                <div className="flex items-center gap-2 glass-panel rounded-2xl px-3 py-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="質問やOSの操作を入力..."
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/40"
                    disabled={isThinking}
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl glass-jelly text-sky-300 disabled:opacity-30 flex items-center justify-center"
                    disabled={!chatInput.trim() || isThinking}
                  >
                    <Icon name="Send" size={13} />
                  </button>
                </div>
              </form>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
