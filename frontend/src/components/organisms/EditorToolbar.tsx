import React from 'react';
import { Play } from 'lucide-react'; // Убрали Loader2
import { Button } from '../atoms/Button';
import { Typography } from '../atoms/Typography';
import { Badge } from '../atoms/Badge';

interface EditorToolbarProps {
  title: string;
  mode: 'FULL_EDITOR' | 'SPLIT_VIEW';
  onAnalyze: () => void;
  isAnalyzing: boolean;
  canAnalyze: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  title, mode, onAnalyze, isAnalyzing, canAnalyze
}) => {
  return (
    <div className="h-14 border-b border-gray-100 flex items-center px-6 justify-between shrink-0 bg-white z-20">
      <div className="flex items-center gap-3">
        <Typography variant="h4">{title}</Typography>
        {mode === 'SPLIT_VIEW' && (
          <Badge variant="warning">Требует внимания</Badge>
        )}
      </div>

      <div className="flex gap-2">
        {mode === 'FULL_EDITOR' && (
          <Button
            onClick={onAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            loading={isAnalyzing}
            icon={!isAnalyzing ? Play : undefined}
          >
            {isAnalyzing ? 'Анализ...' : 'Запустить анализ'}
          </Button>
        )}
      </div>
    </div>
  );
};