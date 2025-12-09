import React from 'react';
import { Settings2 } from 'lucide-react';
import { SelectField } from '../molecules/SelectField';
import { FormField } from '../molecules/FormField';
import { Textarea } from '../atoms/Textarea';
import { Typography } from '../atoms/Typography';
import { Icon } from '../atoms/Icon';

interface ConfigOption {
  id: string;
  name: string;
  description?: string; // Можно использовать для тултипов в будущем
}

interface StageConfigFormProps {
  models: ConfigOption[];
  prompts: ConfigOption[];
  config: {
    modelId: string;
    promptId: string;
    userPrompt: string;
  };
  onChange: (key: string, value: string) => void;
}

export const StageConfigForm: React.FC<StageConfigFormProps> = ({
  models, prompts, config, onChange
}) => {
  const modelOptions = models.map(m => ({ value: m.id, label: m.name }));
  const promptOptions = prompts.map(p => ({ value: p.id, label: p.name }));

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
      <div className="flex items-center gap-2 text-gray-700">
        <Icon icon={Settings2} size="sm" />
        <Typography variant="small" weight="semibold">Настройки этапа</Typography>
      </div>

      <SelectField
        label="Модель ИИ"
        options={modelOptions}
        value={config.modelId}
        onChange={(e) => onChange('modelId', e.target.value)}
      />

      <SelectField
        label="Системный Промпт"
        options={promptOptions}
        value={config.promptId}
        onChange={(e) => onChange('promptId', e.target.value)}
      />

      <FormField label="Пользовательский запрос" helperText="Можно дописать инструкции вручную.">
        <Textarea
          value={config.userPrompt}
          onChange={(e) => onChange('userPrompt', e.target.value)}
          placeholder="Здесь будет сформированный запрос..."
          className="h-24 resize-none"
        />
      </FormField>
    </div>
  );
};