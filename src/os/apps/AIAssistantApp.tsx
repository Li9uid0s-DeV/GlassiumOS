import { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from '../Icon';
import { useOS } from '../OSContext';
import { requestAIChat } from '../aiClient';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const STORAGE_KEY = 'glasis_ai_assistant_messages_v1';

const DEFAULT_WELCOME_MESSAGES: Message[] = [
  {
    id: 'msg-welcome',
    sender: 'assistant',
    text: 'こんにちは。チャット専用AIアシスタントです。質問や調べもの、プログラミング、計算、文章作成など何でも話しかけてください。上部の検索バーから過去の会話履歴をキーワードで素早く絞り込むこともできます。',
    timestamp: Date.now(),
  },
];

const TEMPLATES = [
  { label: 'ブラックホールとは？', prompt: 'ブラックホールとは何か、わかりやすく教えて' },
  { label: '量子コンピュータとは', prompt: '量子コンピュータについて教えて' },
  { label: 'Reactコード作成', prompt: 'ReactとTypeScriptでカウンターコンポーネントを書いて' },
  { label: '集中力を高める方法', prompt: '勉強や仕事の集中力を高めるコツを教えて' },
  { label: 'アルゴリズム解説', prompt: 'ダイクストラ法のアルゴリズムをわかりやすく解説して' },
];

function highlightMatchedText(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark
        key={i}
        className="bg-amber-400/35 text-amber-100 px-1 rounded border border-amber-300/40 font-semibold"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function AIAssistantApp() {
  const { playSound } = useOS();

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_WELCOME_MESSAGES;
  });

  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [senderFilter, setSenderFilter] = useState<'all' | 'user' | 'assistant'>('all');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, searchQuery]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((m) => {
      if (senderFilter !== 'all' && m.sender !== senderFilter) return false;
      if (!q) return true;
      return m.text.toLowerCase().includes(q);
    });
  }, [messages, searchQuery, senderFilter]);

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
      const storedKey =
        localStorage.getItem('gemini_api_key') ||
        localStorage.getItem('glassium_ai_key') ||
        undefined;
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
    setSearchQuery('');
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: 'チャット履歴をクリアしました。何でもお気軽にお尋ねください。',
        timestamp: Date.now(),
      },
    ]);
  };

  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-black/25 backdrop-blur-2xl text-white select-none overflow-hidden">
      {/* Header with Search Bar */}
      <div className="px-5 py-3 bg-white/[0.02] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl glass-jelly flex items-center justify-center text-sky-300">
            <Icon name="Bot" size={16} />
          </div>
          <div>
            <span className="text-sm font-semibold text-white block leading-tight">
              AI アシスタント
            </span>
            <span className="text-[10px] text-white/45 font-mono">
              全 {messages.length} 件のメッセージ
            </span>
          </div>
        </div>

        {/* Conversation Search & Filter Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-xl min-w-[220px]">
          <div className="flex-1 flex items-center gap-2 glass-panel rounded-xl px-3 py-1.5 border border-white/10 focus-within:border-sky-400/50 transition">
            <Icon name="Search" size={14} className="text-sky-300 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="過去のチャットメッセージを検索..."
              className="flex-1 bg-transparent text-xs text-white placeholder-white/40 outline-none"
              aria-label="チャット履歴を検索"
            />
            {searchQuery.trim() !== '' && (
              <span className="px-1.5 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/30 text-[10px] font-mono text-sky-200 shrink-0">
                {filteredMessages.length}件一致
              </span>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-white/50 hover:text-white p-0.5 rounded transition cursor-pointer"
                title="検索をクリア"
              >
                <Icon name="X" size={13} />
              </button>
            )}
          </div>

          {/* Sender Filter Pills */}
          <div className="hidden sm:flex items-center rounded-xl bg-white/[0.04] p-0.5 border border-white/10 shrink-0">
            {(
              [
                { id: 'all', label: 'すべて' },
                { id: 'user', label: '自分' },
                { id: 'assistant', label: 'AI' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSenderFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                  senderFilter === f.id
                    ? 'bg-sky-500/30 text-sky-200 font-semibold'
                    : 'text-white/55 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={clearChat}
          className="p-2 rounded-xl glass-jelly text-white/70 hover:text-white shrink-0 cursor-pointer"
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
            className="px-3 py-1.5 rounded-xl glass-jelly text-xs text-white/85 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-11 h-11 rounded-2xl glass-jelly flex items-center justify-center text-sky-300/80">
              <Icon name="Search" size={20} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white/90">
                「{searchQuery}」に一致するメッセージが見つかりません
              </div>
              <div className="text-xs text-white/50">
                別のキーワードを試すか、検索フィルターを解除してください。
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSenderFilter('all');
              }}
              className="px-3.5 py-1.5 rounded-xl glass-jelly text-xs text-sky-300 hover:text-white font-semibold cursor-pointer"
            >
              検索フィルターをリセット
            </button>
          </div>
        ) : (
          filteredMessages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${
                  isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'
                }`}
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
                  <div className="whitespace-pre-wrap select-text">
                    {highlightMatchedText(m.text, searchQuery)}
                  </div>
                  <div className="mt-1.5 text-[10px] text-white/40 font-mono text-right">
                    {formatTime(m.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isThinking && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-xl glass-jelly flex items-center justify-center shrink-0 text-sky-300">
              <Icon name="Bot" size={15} />
            </div>
            <div className="px-4 py-3 rounded-2xl glass-panel flex items-center gap-2 text-xs text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
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
            className="h-10 px-5 rounded-2xl glass-jelly text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Icon name="Send" size={14} className="text-sky-300" />
            <span>送信</span>
          </button>
        </form>
      </div>
    </div>
  );
}
