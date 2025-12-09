import React from 'react';
import { AlertTriangle, AlertOctagon } from 'lucide-react'; // Убрали MousePointerClick
import { QuestionCard } from './QuestionCard';
import { Button } from '../atoms/Button';
import { Typography } from '../atoms/Typography';
import { Toggle } from '../atoms/Toggle';
import { Icon } from '../atoms/Icon';
import { cn } from '../../lib/utils';
import type { AnalysisResult } from '../../api';

interface QAListProps {
  analysisData: AnalysisResult;
  answers: Record<string, string>;
  onAnswerChange: (id: string, val: string) => void;
  onSubmit: (force?: boolean) => void;
  isRefining: boolean;
  autoScroll: boolean;
  onToggleAutoScroll: (val: boolean) => void;
  className?: string;
}

export const QAList: React.FC<QAListProps> = ({
  analysisData, answers, onAnswerChange, onSubmit, isRefining, autoScroll, onToggleAutoScroll, className
}) => {
  const [showForce, setShowForce] = React.useState(false);

  const handleSubmit = (force: boolean) => {
    if (!force) {
      const missing = analysisData.questions.some(q => !answers[q.id]?.trim());
      if (missing) {
        setShowForce(true);
        alert("Пожалуйста, ответьте на все вопросы.");
        return;
      }
    }
    onSubmit(force);
  };

  return (
    <div className={cn("flex flex-col h-full bg-gray-50", className)}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Icon icon={AlertTriangle} size="sm" className="text-orange-600" />
          <Typography variant="body" weight="semibold">
            Вопросы ({analysisData.questions.length})
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Typography variant="small" color="text-gray-500">Автоскролл</Typography>
          <Toggle checked={autoScroll} onChange={onToggleAutoScroll} />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {analysisData.questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            id={q.id}
            index={idx}
            quote={q.quote}
            question={q.question}
            answer={answers[q.id] || ''}
            onAnswerChange={(val) => onAnswerChange(q.id, val)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-white space-y-3">
        <Button
          className="w-full"
          onClick={() => handleSubmit(false)}
          loading={isRefining}
        >
          Отправить ответы
        </Button>

        {showForce && (
          <Button
            variant="ghost"
            className="w-full text-red-600 hover:bg-red-50 h-8 text-xs"
            onClick={() => handleSubmit(true)}
            icon={AlertOctagon}
          >
            Force Submit (Пропустить проверку)
          </Button>
        )}
      </div>
    </div>
  );
};
