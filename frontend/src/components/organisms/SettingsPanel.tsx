import React from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Typography } from '../atoms/Typography';
import { Toggle } from '../atoms/Toggle';
import { useDebugMode } from '../../lib/useDebugMode';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { isDebugEnabled, setDebugEnabled } = useDebugMode();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <Typography variant="h3">Настройки</Typography>
          <Button onClick={onClose} variant="secondary" size="sm">Закрыть</Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Debug Settings */}
          <div className="space-y-4">
            <div>
              <Typography variant="h4" className="mb-2">Отладка</Typography>
              <Typography variant="small" color="text-gray-500">
                Включить вывод отладочных сообщений в консоль браузера для всех компонентов
              </Typography>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="body" className="font-medium">
                  Режим отладки в консоль
                </Typography>
                <Typography variant="small" color="text-gray-400">
                  Показывать данные запросов и обработки в Console
                </Typography>
              </div>
              <Toggle
                checked={isDebugEnabled}
                onChange={setDebugEnabled}
              />
            </div>
          </div>

          {/* Add more settings here in the future */}
          <div className="border-t pt-4">
            <Typography variant="small" color="text-gray-500">
              Другие настройки будут добавлены позже...
            </Typography>
          </div>
        </div>
      </Card>
    </div>
  );
};
