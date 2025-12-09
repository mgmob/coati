import React from 'react';
import { Typography } from '../atoms/Typography';
import { cn } from '../../lib/utils';

interface QuoteBlockProps {
  text: string;
  className?: string;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({ text, className }) => {
  return (
    <div className={cn("flex pl-3 border-l-2 border-orange-300 bg-orange-50/50 py-2 pr-2 rounded-r-sm", className)}>
      <Typography variant="small" className="italic text-gray-600 line-clamp-3">
        "{text}"
      </Typography>
    </div>
  );
};