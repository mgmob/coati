import React, { useState, useEffect } from 'react';
import { Check, Circle, Clock, Wrench } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../atoms/Button';
import { type StageStep, type AIModel, type SystemPrompt } from '../../api';

interface StageTimelineProps {
  steps: StageStep[];
  onSave?: (updatedSteps: StageStep[]) => void;
  // Принимаем списки снаружи
  availableModels: AIModel[];
  availablePrompts: SystemPrompt[];
}

export const StageTimeline: React.FC<StageTimelineProps> = ({
  steps: initialSteps,
  onSave,
  availableModels,
  availablePrompts
}) => {
  const [steps, setSteps] = useState<StageStep[]>(initialSteps);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSteps(initialSteps);
    setIsDirty(false);
  }, [initialSteps]);

  const toggleExpand = (id: string) => {
    setExpandedStepId(expandedStepId === id ? null : id);
  };

  const handleConfigChange = (stepId: string, field: 'model_id' | 'system_prompt_id', value: string) => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          config: { ...step.config, [field]: value }
        };
      }
      return step;
    }));
    setIsDirty(true);
  };

  const handleCancel = () => {
    setSteps(initialSteps);
    setIsDirty(false);
    setExpandedStepId(null);
  };

  const handleSave = () => {
    if (onSave) onSave(steps);
    setIsDirty(false);
    setExpandedStepId(null);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto px-1 pb-20">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'done';
          const isCurrent = step.status === 'active';
          const isExpanded = expandedStepId === step.id;

          return (
            <div key={step.id} className="flex gap-4 mb-6 last:mb-0 relative group">
              {/* Линия и Иконки (без изменений) */}
              {index !== steps.length - 1 && (
                <div className="absolute left-[15px] top-8 bottom-[-24px] w-[2px] bg-gray-200" />
              )}
              <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors border-2 bg-white",
                  isCompleted ? "border-green-500 text-green-600 bg-green-50" :
                  isCurrent ? "border-blue-500 text-blue-600 bg-blue-50" :
                  "border-gray-300 text-gray-400"
                )}
              >
                {isCompleted ? <Check size={16} /> : isCurrent ? <Clock size={16} /> : <Circle size={16} />}
              </div>

              <div className="flex-1 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className={cn("text-sm font-medium", isCurrent ? "text-blue-700" : "text-gray-900")}>
                      {step.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isCompleted ? "Завершено" : isCurrent ? "В работе" : "Ожидает"}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExpand(step.id)}
                    className={cn(
                      "p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-blue-600",
                      isExpanded && "text-blue-600 bg-blue-50"
                    )}
                  >
                    <Wrench size={14} />
                  </button>
                </div>

                {/* Dropdowns с данными из пропсов */}
                {isExpanded && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">AI Модель</label>
                      <select
                        className="w-full text-sm border-gray-300 rounded-md p-1.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={step.config?.model_id || ''}
                        onChange={(e) => handleConfigChange(step.id, 'model_id', e.target.value)}
                      >
                        <option value="" disabled>Выберите модель</option>
                        {availableModels.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Системный промпт</label>
                      <select
                        className="w-full text-sm border-gray-300 rounded-md p-1.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={step.config?.system_prompt_id || ''}
                        onChange={(e) => handleConfigChange(step.id, 'system_prompt_id', e.target.value)}
                      >
                         <option value="" disabled>Выберите промпт</option>
                        {availablePrompts.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex gap-2 transition-transform duration-300",
        isDirty ? "translate-y-0" : "translate-y-full"
      )}>
        <Button variant="secondary" size="sm" className="flex-1" onClick={handleCancel}>Отмена</Button>
        <Button size="sm" className="flex-1" onClick={handleSave}>Применить</Button>
      </div>
    </div>
  );
};