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
  { label: 'ブラックホールとは？', query: 'ブラックホールとは何か、わかりやすく教えて' },
  { label: '量子コンピュータの仕組み', query: '量子コンピュータの仕組みを初心者向けに解説して' },
  { label: 'Reactの書き方', query: 'ReactとTypeScriptの基本的なコンポーネント例を教えて' },
  { label: '集中力を高めるコツ', query: '勉強や開発の集中力を高める科学的な方法を教えて' },
  { label: '相対性理論について', query: 'アインシュタインの相対性理論を3行で要約して' },
];

export function AIAssistant() {
  const { openApp, playSound } = useOS();

  const [expanded, setExpanded] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'こんにちは。純粋なチャット専用AIアシスタントです（OS操作機能は無効化されています）。質問や調べもの、プログラミング、アイデア出しなど何でもお気軽に話しかけてください。',
      timestamp: Date.now(),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isThinking, expanded]);

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

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: aiReply,
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
    setChatMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: 'チャット履歴をクリアしました。何でもお気軽にお尋ねください。',
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
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
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

              {/* Quick Prompt Chips */}
              <div className="py-2.5 border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1.5">
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
                {chatMessages.map((msg) => (
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
                ))}

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
