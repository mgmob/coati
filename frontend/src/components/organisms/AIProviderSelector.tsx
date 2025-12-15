import { useState } from 'react';
import {
  useAIProviderStore,
  useAIProvider,
  useAIProviderModels,
  useAIProviderStatus,
} from '../../stores/aiProviderStore';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Label } from '../atoms/Label';
import { Spinner } from '../atoms/Spinner';
import { Badge } from '../atoms/Badge';

interface AIProviderSelectorProps {
  className?: string;
  compact?: boolean;
}

export function AIProviderSelector({ className = '', compact = false }: AIProviderSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const { provider, url, selectedModel, isConnected } = useAIProvider();
  const models = useAIProviderModels();
  const { isLoading, error } = useAIProviderStatus();

  const {
    setProvider,
    setUrl,
    setApiKey,
    setSelectedModel,
    testConnection,
    loadModels,
    clearError,
  } = useAIProviderStore();

  const handleTestConnection = async () => {
    clearError();
    const success = await testConnection();
    if (success) {
      await loadModels();
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvider(e.target.value as 'ollama' | 'vllm' | 'openai' | 'anthropic');
  };

  // Compact view
  if (compact && !isExpanded) {
    return (
      <div className={`flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'success' : 'neutral'}>
            {provider.toUpperCase()}
          </Badge>
          {selectedModel && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedModel}
            </span>
          )}
          {isConnected ? (
            <span className="text-green-500 text-xs">●</span>
          ) : (
            <span className="text-gray-400 text-xs">○</span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="text-sm text-blue-500 hover:text-blue-700"
        >
          Изменить
        </button>
      </div>
    );
  }

  // Expanded view
  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Провайдер
        </h3>
        {compact && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Provider Selection */}
      <div className="mb-4">
        <Label htmlFor="ai-provider">Провайдер</Label>
        <select
          id="ai-provider"
          value={provider}
          onChange={handleProviderChange}
          className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="ollama">Ollama (локальный)</option>
          <option value="vllm">vLLM (локальный)</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>
      </div>

      {/* URL */}
      <div className="mb-4">
        <Label htmlFor="ai-url">URL</Label>
        <Input
          id="ai-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://ollama:11434"
          className="mt-1"
        />
      </div>

      {/* API Key (for OpenAI/Anthropic) */}
      {(provider === 'openai' || provider === 'anthropic') && (
        <div className="mb-4">
          <Label htmlFor="ai-apikey">API Key</Label>
          <Input
            id="ai-apikey"
            type="password"
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="mt-1"
          />
        </div>
      )}

      {/* Test Connection Button */}
      <div className="mb-4">
        <Button
          onClick={handleTestConnection}
          disabled={isLoading || !url}
          variant={isConnected ? 'secondary' : 'primary'}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Проверка...
            </>
          ) : isConnected ? (
            <>
              ✓ Подключено ({models.length} моделей)
            </>
          ) : (
            'Проверить подключение'
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {/* Model Selection */}
      {isConnected && models.length > 0 && (
        <div className="mb-4">
          <Label htmlFor="ai-model">Модель</Label>
          <select
            id="ai-model"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
                {model.size && ` (${(model.size / 1e9).toFixed(1)}GB)`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status Badge */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <Badge variant={isConnected ? 'success' : 'neutral'}>
          {isConnected ? 'Подключено' : 'Не подключено'}
        </Badge>
        {selectedModel && isConnected && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Модель: {selectedModel}
          </span>
        )}
      </div>
    </div>
  );
}

export default AIProviderSelector;
