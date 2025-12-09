import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Card } from '../atoms/Card';
import { cn } from '../../lib/utils';
import { api } from '../../api';

// Типы для пропсов
export interface AnalysisResult {
  has_issues: boolean;
  questions: Array<{
    id: number;
    quote: string;
    question: string;
  }>;
}

interface AIPanelProps {
  className?: string;
  mode?: 'CHAT' | 'AMBIGUITY_CHECK';
  analysisData?: AnalysisResult | null;
  onSwitchToChat?: () => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({
  className,
  mode = 'CHAT',
  analysisData,
  onSwitchToChat
}) => {
  // --- Логика Чата ---
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{id: string, role: 'user'|'ai', text: string}[]>([
    { id: '1', role: 'ai', text: 'Привет! Я Coati AI. Я помогу уточнить требования.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await api.chatWithAI(userText);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: reply }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Рендеринг: Режим Вопросов (Ambiguity Loop) ---
  if (mode === 'AMBIGUITY_CHECK' && analysisData) {
    return (
      <Card className={cn("flex flex-col h-full border-orange-200 shadow-none bg-orange-50/30 rounded-none", className)}>
        <div className="p-4 border-b border-orange-100 bg-orange-100/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-900 text-sm">Уточнение</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onSwitchToChat} className="text-orange-700 hover:bg-orange-200 h-8 px-2">
            Отмена
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
            <p className="text-sm text-gray-600 mb-4">Найдены неопределенности:</p>
            {analysisData.questions.map((q, idx) => (
              <div key={q.id} className="mb-6 last:mb-0">
                <div className="text-xs font-bold text-orange-600 mb-1 uppercase tracking-wider">Вопрос {idx + 1}</div>
                <blockquote className="text-sm text-gray-500 border-l-2 border-orange-300 pl-3 mb-2 italic bg-orange-50 py-1 rounded-r">
                  "{q.quote}"
                </blockquote>
                <p className="text-sm font-medium text-gray-900 mb-2">{q.question}</p>
                <Input placeholder="Введите уточнение..." className="bg-gray-50 border-gray-200" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-orange-100 bg-white">
          <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
            Отправить ответы
          </Button>
        </div>
      </Card>
    );
  }

  // --- Рендеринг: Режим Чата ---
  return (
    <Card className={cn("flex flex-col h-full border-l border-gray-200 shadow-none rounded-none", className)}>
      <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-gray-900 text-sm">AI Assistant</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3 max-w-[90%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", msg.role === 'ai' ? "bg-teal-100 text-teal-700" : "bg-gray-200")}>
              {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={cn("p-3 rounded-2xl text-sm whitespace-pre-wrap", msg.role === 'ai' ? "bg-gray-50 border border-gray-100 text-gray-800" : "bg-blue-600 text-white")}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-xs text-gray-400 ml-12">Анализирую...</div>}
      </div>

      <div className="p-3 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendChat} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Спроси..." className="flex-1" />
          <Button type="submit" size="md" disabled={!input.trim() || isLoading}><Send className="w-4 h-4" /></Button>
        </form>
      </div>
    </Card>
  );
};