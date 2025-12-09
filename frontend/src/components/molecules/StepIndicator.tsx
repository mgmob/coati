import React from 'react';
import { Check, Circle } from 'lucide-react';
import { Icon } from '../atoms/Icon';
import { Spinner } from '../atoms/Spinner';
import { Typography } from '../atoms/Typography';
import { cn } from '../../lib/utils';

interface StepIndicatorProps {
  title: string;
  status: 'pending' | 'active' | 'done';
  description?: string;
  orientation?: 'vertical' | 'horizontal';
  onClick?: () => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  title, status, description, orientation = 'vertical', onClick
}) => {
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={cn(
        "flex items-start group",
        isVertical ? "flex-row gap-3" : "flex-row items-center gap-2",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Icon Wrapper */}
      <div className={cn(
        "flex items-center justify-center rounded-full border-2 transition-colors shrink-0 bg-white z-10",
        status === 'done' ? "border-green-500 text-green-500" :
        status === 'active' ? "border-blue-500 text-blue-500" : "border-gray-300 text-gray-300",
        isVertical ? "w-5 h-5 mt-0.5" : "w-4 h-4"
      )}>
        {status === 'done' && <Icon icon={Check} size="xs" />}
        {status === 'active' && <Spinner size="sm" />}
        {status === 'pending' && <Icon icon={Circle} size="xs" className="fill-current opacity-0" />}
      </div>

      {/* Text Content */}
      <div className={cn("flex flex-col", !isVertical && "flex-row items-center gap-2")}>
        <Typography
          variant="body"
          weight="medium"
          className={cn(
            "leading-none transition-colors",
            status === 'active' ? "text-blue-700" : "text-gray-700",
            status === 'pending' && "text-gray-400"
          )}
        >
          {title}
        </Typography>

        {description && isVertical && (
          <Typography variant="small" color="text-gray-500" className="mt-1">
            {description}
          </Typography>
        )}
      </div>
    </div>
  );
};