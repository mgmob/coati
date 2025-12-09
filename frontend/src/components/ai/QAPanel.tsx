import React, { useState } from 'react';
import { AlertTriangle, Loader2, MousePointerClick, AlertOctagon } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Card } from '../atoms/Card';
import { cn } from '../../lib/utils';
import { type AnalysisResult } from '../../api';

interface QAPanelProps {
  className?: string;
  analysisData: AnalysisResult | null;
  onSubmitAnswers: (answers: Array<{question: string, answer: string}>, force?: boolean) => void;
  isRefining: boolean;
}

export const QAPanel: React.FC<QAPanelProps> = ({
  className,
  analysisData,
  onSubmitAnswers,
  isRefining
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [autoScroll, setAutoScroll] = useState(true);
  const [showForceSubmit, setShowForceSubmit] = useState(false);

  if (!analysisData) return null;

  const handleSubmit = (force: boolean = false) => {
    if (force) {
      if (!confirm("Внимание! Принудительная отправка может привести к некорректной генерации. Продолжить?")) return;
    }

    const formattedAnswers = analysisData.questions.map(q => ({
      question: q.question,
      answer: answers[q.id] || (force ? "Пропущено" : "")
    }));

    // Простая валидация (если не force)
    if (!force) {
      const missing = formattedAnswers.filter(a => !a.answer.trim());
      if (missing.length > 0) {
        alert(`Пожалуйста, ответьте на все вопросы (${missing.length} пропущено) или используйте Force Submit.`);
        setShowForceSubmit(true); // Показываем кнопку Force Submit при ошибке
        return;
      }
    }

    onSubmitAnswers(formattedAnswers, force);
  };

  return (
    <Card className={cn("flex flex-col h-full border-none shadow-none rounded-none bg-gray-50", className)}>
      {/* HEADER */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Вопросы ({analysisData.questions.length})</h3>
        </div>

        {/* Auto-scroll Toggle */}
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${autoScroll ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
          title="Автоскролл к тексту"
        >
          <MousePointerClick className="w-3 h-3" />
          {autoScroll ? 'Scroll ON' : 'Scroll OFF'}
        </button>
      </div>

      {/* QUESTIONS LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {analysisData.questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Вопрос {idx + 1}</span>
              {!autoScroll && (
                <button className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 hover:underline">
                  Показать в тексте
                </button>
              )}
            </div>

            <blockquote className="text-xs text-gray-500 border-l-2 border-orange-200 pl-2 mb-3 italic line-clamp-2">
              "{q.quote}"
            </blockquote>

            <p className="text-sm font-medium text-gray-900 mb-3">{q.question}</p>

            <Input
              placeholder="Ваш ответ..."
              className="bg-gray-50 border-gray-200 text-sm focus:bg-white transition-all"
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-4 border-t border-gray-200 bg-white space-y-3">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          onClick={() => handleSubmit(false)}
          disabled={isRefining}
        >
          {isRefining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Отправить ответы
        </Button>

        {showForceSubmit && (
          <Button
            variant="ghost"
            className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 text-xs h-8"
            onClick={() => handleSubmit(true)}
          >
            <AlertOctagon className="w-3 h-3 mr-1.5" />
            Force Submit (Пропустить проверку)
          </Button>
        )}
      </div>
    </Card>
  );
};
