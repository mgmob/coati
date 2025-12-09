import React from 'react';
import { Check, Circle, Zap } from 'lucide-react'; // <-- Импортируем Zap
import { cn } from '../../lib/utils';

export interface ProjectStage {
  id: string | number;
  name: string;
  status: 'completed' | 'active' | 'pending';
}

interface ProjectTimelineProps {
  stages: ProjectStage[];
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ stages }) => {
  return (
    <div className="h-16 border-b border-gray-200 bg-white flex items-center px-8 shrink-0 overflow-x-auto">
      <div className="flex items-center w-full max-w-4xl mx-auto">
        {stages.map((stage, index) => {
          const isCompleted = stage.status === 'completed';
          const isActive = stage.status === 'active';

          return (
            <div key={stage.id} className="flex items-center flex-1 last:flex-none group">
              {/* Icon Circle */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0 z-10",
                isCompleted ? "bg-green-500 border-green-500 text-white" :
                isActive ? "bg-blue-50 border-blue-600 text-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.1)]" : // Активный стиль
                "bg-white border-gray-300 text-gray-300"
              )}>
                {isCompleted ? <Check size={16} strokeWidth={3} /> :
                 isActive ? <Zap size={16} fill="currentColor" /> : // <-- Zap иконка
                 <Circle size={10} fill="currentColor" className="text-gray-200" />}
              </div>

              {/* Text */}
              <div className="ml-3 mr-4">
                <div className={cn(
                  "text-sm font-medium whitespace-nowrap",
                  isActive ? "text-blue-700" : isCompleted ? "text-gray-900" : "text-gray-400"
                )}>
                  {stage.name}
                </div>
              </div>

              {/* Connector Line */}
              {index !== stages.length - 1 && (
                <div className={cn(
                  "h-[2px] w-full mx-2 rounded-full",
                  isCompleted ? "bg-green-500" : "bg-gray-200"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};