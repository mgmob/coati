import React from 'react';
import { Typography } from '../atoms/Typography';
import { cn } from '../../lib/utils';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-3 text-center transition-colors relative",
        isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
      )}
    >
      <Typography variant="body" weight="medium" color={isActive ? "text-blue-600" : "text-gray-500"}>
        {label}
      </Typography>
      {isActive && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
      )}
    </button>
  );
};