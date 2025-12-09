import React from 'react';
import { ProgressBar } from '../atoms/ProgressBar';
import { Typography } from '../atoms/Typography';

interface TokenMeterProps {
  usedTokens: number;
  maxTokens: number;
}

export const TokenMeter: React.FC<TokenMeterProps> = ({ usedTokens, maxTokens }) => {
  const percentage = Math.round((usedTokens / maxTokens) * 100);

  return (
    <div className="p-3 bg-blue-50 rounded border border-blue-100 space-y-2">
      <div className="flex justify-between items-end">
        <Typography variant="caption" weight="bold" color="text-blue-700">
          Token Usage
        </Typography>
        <Typography variant="small" color="text-blue-600">
          {percentage}% ({usedTokens} / {maxTokens})
        </Typography>
      </div>

      <ProgressBar value={usedTokens} max={maxTokens} />
    </div>
  );
};