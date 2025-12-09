import React from 'react';
import { TokenMeter } from '../molecules/TokenMeter';
import { Typography } from '../atoms/Typography';

export const ContextPanel: React.FC = () => {
  return (
    <div className="space-y-4">
      <TokenMeter usedTokens={1200} maxTokens={8000} />

      <div>
        <Typography variant="small" weight="medium" className="mb-2 block">
          Файлы контекста
        </Typography>
        <Typography variant="small" color="text-gray-400" className="italic text-center py-4 border border-dashed border-gray-200 rounded">
          Нет загруженных файлов
        </Typography>
      </div>
    </div>
  );
};