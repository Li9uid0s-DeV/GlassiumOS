import { useState, useRef, useEffect } from 'react';
import { Icon } from '../Icon';
import { useOS } from '../OSContext';
import { requestAIChat } from '../aiClient';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const TEMPLATES = [
  { label: 'ブラックホールとは？', prompt: 'ブラックホールとは何か、わかりやすく教えて' },
  { label: '量子コンピュータとは', prompt: '量子コンピュータについて教えて' },
  { label: 'Reactコード作成', prompt: 'ReactとTypeScriptでカウンターコンポーネントを書いて' },
  { label: '集中力を高める方法', prompt: '勉強や仕事の集中力を高めるコツを教えて' },
  { label: 'アルゴリズム解説', prompt: 'ダイクストラ法のアルゴリズムをわかりやすく解説して' },
];

export function AIAssistantApp() {
  const { playSound } = useOS();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'こんにちは。チャット専用AIアシスタントです（OS操作は行いません）。質問や調べもの、プログラミング、計算、文章作成など何でも話しかけてください。',
      timestamp: Date.now(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isThinking) return;

    playSound('click');
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const storedKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('glassium_ai_key') || undefined;
      const data = await requestAIChat({
        message: textToSend,
        apiKey: storedKey,
      });

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: data.reply || '応答を取得しました。',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'assistant',
          text: '回答を生成しました。続けてご質問があれば入力してください。',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const clearChat = () => {
    playSound('click');
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: 'チャット履歴をクリアしました。何でもお気軽にお尋ねください。',
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <div className="h-full w-full flex flex-col bg-black/25 backdrop-blur-2xl text-white select-none overflow-hidden">
      {/* Header */}
      <div className="h-13 px-5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl glass-jelly flex items-center justify-center text-sky-300">
            <Icon name="Bot" size={16} />
          </div>
          <span className="text-sm font-semibold text-white">AI アシスタント</span>
        </div>

        <button
          onClick={clearChat}
          className="p-2 rounded-xl glass-jelly text-white/70 hover:text-white"
          title="履歴をクリア"
        >
          <Icon name="Trash2" size={14} />
        </button>
      </div>

      {/* Quick Chips */}
      <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        {TEMPLATES.map((t, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(t.prompt)}
            className="px-3 py-1.5 rounded-xl glass-jelly text-xs text-white/85 hover:text-white whitespace-nowrap shrink-0"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl glass-jelly flex items-center justify-center shrink-0 text-sky-300">
                  <Icon name="Bot" size={15} />
                </div>
              )}

              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'glass-jelly bg-sky-500/25 text-white font-medium'
                    : 'glass-panel text-white/95'
                }`}
              >
                <div className="whitespace-pre-wrap select-text">{m.text}</div>
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-xl glass-jelly flex items-center justify-center shrink-0 text-sky-300">
              <Icon name="Bot" size={15} className="animate-pulse" />
            </div>
            <div className="px-4 py-3 rounded-2xl glass-panel flex items-center gap-2 text-xs text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
              <span>考え中...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="p-3.5 border-t border-white/[0.06] bg-white/[0.02] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2.5 max-w-4xl mx-auto"
        >
          <div className="flex-1 flex items-center gap-2.5 glass-panel rounded-2xl px-4 py-2.5 focus-within:border-sky-400/50 transition">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="質問、コード作成、計算、アイデア相談などを入力..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="h-10 px-5 rounded-2xl glass-jelly text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-40"
          >
            <Icon name="Send" size={14} className="text-sky-300" />
            <span>送信</span>
          </button>
        </form>
      </div>
    </div>
  );
}
