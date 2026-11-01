import { useState, useEffect } from 'react';
import { useOS } from '../OSContext';
import { Icon } from '../Icon';
import { KanbanView, HabitView, WhiteboardView } from './ExtraAppsSuite';

type CalTab = 'agenda' | 'kanban' | 'habit' | 'whiteboard';

export function CalendarApp({ initialTab }: { initialTab?: string }) {
  const { calendarTasks, addTask, toggleTask, deleteTask } = useOS();
  const [activeTab, setActiveTab] = useState<CalTab>(() => {
    if (initialTab === 'kanban' || initialTab === 'habit' || initialTab === 'whiteboard') {
      return initialTab;
    }
    return 'agenda';
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'system' | 'work' | 'personal'>('work');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    if (initialTab === 'kanban' || initialTab === 'habit' || initialTab === 'whiteboard') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthName = today.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask({
      title: newTitle.trim(),
      date: selectedDate,
      time: '12:00',
      category: newCategory,
      completed: false,
      priority: newPriority,
    });
    setNewTitle('');
  };

  const tasksForSelectedDate = calendarTasks.filter((t) => t.date === selectedDate);

  const TABS: { id: CalTab; label: string }[] = [
    { id: 'agenda', label: 'カレンダー予定' },
    { id: 'kanban', label: 'カンバン管理 (AI分解)' },
    { id: 'habit', label: '習慣トラッカー' },
    { id: 'whiteboard', label: 'アイデアメモ' },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white select-none overflow-hidden">
      {/* Top Hairline Navigation */}
      <div className="px-6 border-b border-white/10 flex items-center gap-6 shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`py-3.5 text-xs border-b-2 transition whitespace-nowrap ${
              activeTab === t.id
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'kanban' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <KanbanView />
        </div>
      ) : activeTab === 'habit' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <HabitView />
        </div>
      ) : activeTab === 'whiteboard' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <WhiteboardView />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Calendar Grid */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/10 p-5 flex flex-col justify-between shrink-0">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Icon name="Calendar" size={16} className="text-cyan-400" />
                  <h2 className="text-sm font-semibold">{monthName}</h2>
                </div>
                <span className="text-[11px] text-cyan-300 font-mono">Today</span>
              </div>

              <div className="grid grid-cols-7 text-center text-[10px] text-white/40 mb-1 font-semibold uppercase">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const isToday = dayNum === today.getDate();
                  const hasTasks = calendarTasks.some((t) => t.date === dateStr);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`h-8 w-8 mx-auto flex flex-col items-center justify-center relative transition ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : isToday
                          ? 'border-b-2 border-cyan-400 text-cyan-300 font-semibold'
                          : 'hover:bg-white/10 text-white/80'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {hasTasks && (
                        <span
                          className={`w-1 h-1 rounded-full absolute bottom-1 ${
                            isSelected ? 'bg-slate-950' : 'bg-cyan-400'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-1 text-xs">
              <div className="flex justify-between items-center text-white/70">
                <span>全タスク数</span>
                <span className="font-mono text-cyan-300">{calendarTasks.length}</span>
              </div>
              <div className="flex justify-between items-center text-white/50 text-[11px]">
                <span>完了済み</span>
                <span className="font-mono text-emerald-400">{calendarTasks.filter((t) => t.completed).length}</span>
              </div>
            </div>
          </div>

          {/* Right Tasks Agenda */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <div className="mb-4 pb-2 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">{selectedDate} の予定</h3>
            </div>

            <form onSubmit={handleCreateTask} className="pb-4 mb-4 border-b border-white/10 flex flex-col gap-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="新しい予定を追加..."
                  className="flex-1 bg-transparent border-b border-white/20 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 text-slate-950 text-xs font-semibold transition"
                >
                  追加
                </button>
              </div>

              <div className="flex items-center gap-6 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <span>カテゴリ:</span>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as 'system' | 'work' | 'personal')}
                    className="bg-slate-900 border-b border-white/20 py-1 text-white text-xs focus:outline-none"
                  >
                    <option value="system">System</option>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span>優先度:</span>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="bg-slate-900 border-b border-white/20 py-1 text-white text-xs focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </form>

            <div className="flex-1">
              {tasksForSelectedDate.length === 0 ? (
                <div className="py-12 text-center text-white/40 text-xs">
                  この日の予定はありません
                </div>
              ) : (
                <div className="divide-y divide-white/10 border-b border-white/10">
                  {tasksForSelectedDate.map((task) => (
                    <div
                      key={task.id}
                      className={`py-3 flex items-center justify-between group transition ${
                        task.completed ? 'opacity-45' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`h-4 w-4 border flex items-center justify-center transition ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                              : 'border-white/30 hover:border-cyan-400'
                          }`}
                        >
                          {task.completed && <Icon name="Check" size={11} />}
                        </button>

                        <div>
                          <div className={`text-xs font-medium ${task.completed ? 'line-through text-white/50' : 'text-white'}`}>
                            {task.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-white/45">
                            <span>{task.category}</span>
                            <span>·</span>
                            <span>{task.priority}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-rose-400 transition"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
