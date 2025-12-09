import React from 'react';
import { QuoteBlock } from '../molecules/QuoteBlock';
import { FormField } from  '../molecules/FormField';
import { Typography } from '../atoms/Typography';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { cn } from '../../lib/utils';

interface QuestionCardProps {
  id: string;
  index: number;
  quote: string;
  question: string;
  answer: string;
  error?: string;
  onAnswerChange: (value: string) => void;
  onShowContext?: () => void;
  className?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  index, quote, question, answer, error, onAnswerChange, onShowContext, className
}) => {
  return (
    <div className={cn("bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors group space-y-3", className)}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <Typography variant="caption" weight="bold" color="text-gray-500">
          Вопрос {index + 1}
        </Typography>
        {onShowContext && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-[10px] text-blue-600 opacity-0 group-hover:opacity-100"
            onClick={onShowContext}
          >
            Показать в тексте
          </Button>
        )}
      </div>

      {/* Quote */}
      <QuoteBlock text={quote} />

      {/* Question Text */}
      <Typography variant="body" weight="medium">
        {question}
      </Typography>

      {/* Answer Input */}
      <FormField error={error}>
        <Input
          placeholder="Ваш ответ..."
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
        />
      </FormField>
    </div>
  );
};
