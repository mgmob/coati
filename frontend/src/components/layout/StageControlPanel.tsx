import React, { useState } from 'react';
import { Loader2, Settings2 } from 'lucide-react';
import { AI_MODELS, SYSTEM_PROMPTS } from '../../data/mockData';

// Типы шагов
export type StepStatus = 'pending' | 'active' | 'done';
export interface StageStep {
  id: number;
  name: string;
  status: StepStatus;
  type: 'analysis' | 'refinement' | 'generation';
}

interface StageControlPanelProps {
  steps: StageStep[];
  currentStepId: number;
  config: {
    modelId: string;
    promptId: string;
    userPrompt: string;
  };
  onConfigChange: (key: string, value: string) => void;
}

export const StageControlPanel: React.FC<StageControlPanelProps> = ({
  steps,
  currentStepId,
  config,
  onConfigChange
}) => {
  const [activeTab, setActiveTab] = useState<'process' | 'context'>('process');
  const activeStep = steps.find(s => s.id === currentStepId);

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80 shrink-0">
      {/* TABS */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('process')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'process' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Процесс
        </button>
        <button
          onClick={() => setActiveTab('context')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'context' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Контекст
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'process' ? (
          <div className="space-y-6">
            <div className="relative border-l-2 border-gray-200 ml-2 space-y-6 pb-2">
              {steps.map((step) => (
                <div key={step.id} className="relative pl-6">
                  <div className={`
                    absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-white
                    ${step.status === 'done' ? 'border-green-500 text-green-500' :
                      step.status === 'active' ? 'border-blue-500 text-blue-500' : 'border-gray-300 text-gray-300'}
                  `}>
                    {step.status === 'done' && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                    {step.status === 'active' && <Loader2 className="w-3 h-3 animate-spin" />}
                  </div>

                  <div>
                    <div className={`text-sm font-medium ${step.status === 'active' ? 'text-blue-700' : 'text-gray-900'}`}>
                      {step.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.status === 'done' ? 'Завершено' : step.status === 'active' ? 'В работе' : 'Ожидание'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {activeStep?.type === 'analysis' && activeStep.status !== 'done' && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Settings2 className="w-4 h-4" />
                  Настройки этапа
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Модель ИИ</label>
                  <select
                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={config.modelId}
                    onChange={(e) => onConfigChange('modelId', e.target.value)}
                  >
                    {AI_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <div className="text-[10px] text-gray-500 leading-tight">
                    {AI_MODELS.find(m => m.id === config.modelId)?.description}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Системный Промпт</label>
                  <select
                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={config.promptId}
                    onChange={(e) => onConfigChange('promptId', e.target.value)}
                  >
                    {SYSTEM_PROMPTS.map(p => (
                      <option key={p.id} value={p.id}>{p.title} ({p.category})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Пользовательский запрос</label>
                  <textarea
                    className="w-full text-xs border-gray-300 rounded-md shadow-sm p-2 border h-20 resize-none"
                    value={config.userPrompt}
                    onChange={(e) => onConfigChange('userPrompt', e.target.value)}
                    placeholder="Здесь будет сформированный запрос..."
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded border border-blue-100">
              <div className="text-xs font-semibold text-blue-700 mb-1">Token Meter</div>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-[15%]" />
              </div>
              <div className="text-xs text-blue-600 mt-1 text-right">15% (1200 / 8000)</div>
            </div>
            <div className="text-sm font-medium text-gray-700">Файлы контекста</div>
            <div className="text-sm text-gray-400 italic text-center py-4">Нет загруженных файлов</div>
          </div>
        )}
      </div>
    </div>
  );
};