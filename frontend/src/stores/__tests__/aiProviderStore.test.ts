/**
 * AI Provider Store Tests
 *
 * Тесты для Zustand store (aiProviderStore.ts)
 * Мокируем apiLogger, проверяем бизнес-логику и persist
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAIProviderStore, aiProviderApi } from '../aiProviderStore';

// Мокируем apiLogger
vi.mock('../../lib/apiLogger', () => ({
  apiLogger: {
    wrappedFetch: vi.fn(),
    markProcessedGlobally: vi.fn(),
  },
}));

import { apiLogger } from '../../lib/apiLogger';

// Helper для создания mock Response
const createMockResponse = (data: unknown, ok = true, status = 200) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Error',
  json: vi.fn().mockResolvedValue(data),
});

describe('aiProviderStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Сбрасываем store к начальному состоянию
    useAIProviderStore.getState().reset();
  });

  afterEach(() => {
    // Очищаем localStorage после каждого теста
    localStorage.clear();
  });

  // =========================================
  // INITIAL STATE
  // =========================================

  describe('Initial State', () => {
    test('имеет корректное начальное состояние', () => {
      const state = useAIProviderStore.getState();

      expect(state.provider).toBe('ollama');
      expect(state.url).toBe('http://ollama:11434');
      expect(state.apiKey).toBe('');
      expect(state.selectedModel).toBe('llama3.2:3b');
      expect(state.availableModels).toEqual([]);
      expect(state.isConnected).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  // =========================================
  // SETTERS
  // =========================================

  describe('setProvider', () => {
    test('обновляет provider и устанавливает URL по умолчанию', () => {
      useAIProviderStore.getState().setProvider('vllm');

      const state = useAIProviderStore.getState();
      expect(state.provider).toBe('vllm');
      expect(state.url).toBe('http://vllm:8000');
    });

    test('сбрасывает isConnected и availableModels при смене провайдера', () => {
      // Устанавливаем какие-то данные
      useAIProviderStore.setState({
        isConnected: true,
        availableModels: [{ id: 'model1', name: 'Test' }],
        selectedModel: 'model1',
      });

      useAIProviderStore.getState().setProvider('openai');

      const state = useAIProviderStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.availableModels).toEqual([]);
      expect(state.selectedModel).toBe('');
    });

    test('устанавливает правильный URL для разных провайдеров', () => {
      const providers = {
        ollama: 'http://ollama:11434',
        vllm: 'http://vllm:8000',
        openai: 'https://api.openai.com',
        anthropic: 'https://api.anthropic.com',
      };

      for (const [provider, expectedUrl] of Object.entries(providers)) {
        useAIProviderStore.getState().setProvider(provider as 'ollama' | 'vllm' | 'openai' | 'anthropic');
        expect(useAIProviderStore.getState().url).toBe(expectedUrl);
      }
    });
  });

  describe('setUrl', () => {
    test('обновляет URL и сбрасывает isConnected', () => {
      useAIProviderStore.setState({ isConnected: true });

      useAIProviderStore.getState().setUrl('http://custom:1234');

      const state = useAIProviderStore.getState();
      expect(state.url).toBe('http://custom:1234');
      expect(state.isConnected).toBe(false);
    });
  });

  describe('setApiKey', () => {
    test('обновляет API key', () => {
      useAIProviderStore.getState().setApiKey('sk-test-key');

      expect(useAIProviderStore.getState().apiKey).toBe('sk-test-key');
    });
  });

  describe('setSelectedModel', () => {
    test('обновляет выбранную модель', () => {
      useAIProviderStore.getState().setSelectedModel('gpt-4');

      expect(useAIProviderStore.getState().selectedModel).toBe('gpt-4');
    });
  });

  // =========================================
  // TEST CONNECTION
  // =========================================

  describe('testConnection', () => {
    test('обновляет isConnected на true при успешном подключении', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({
          success: true,
          connected: true,
          modelsAvailable: 5,
        }) as unknown as Response
      );

      const result = await useAIProviderStore.getState().testConnection();

      expect(result).toBe(true);
      const state = useAIProviderStore.getState();
      expect(state.isConnected).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.lastTestedAt).not.toBe(null);
    });

    test('обновляет isConnected на false при ошибке', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({
          success: false,
          connected: false,
          error: 'Connection refused',
        }) as unknown as Response
      );

      const result = await useAIProviderStore.getState().testConnection();

      expect(result).toBe(false);
      const state = useAIProviderStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.error).toBe('Connection refused');
    });

    test('устанавливает isLoading во время запроса', async () => {
      let resolvePromise: (value: Response) => void;
      const promise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(apiLogger.wrappedFetch).mockReturnValue(promise);

      // Начинаем запрос
      const connectionPromise = useAIProviderStore.getState().testConnection();

      // Проверяем что isLoading = true
      expect(useAIProviderStore.getState().isLoading).toBe(true);

      // Резолвим промис
      resolvePromise!(createMockResponse({ success: true, connected: true }) as unknown as Response);
      await connectionPromise;

      // Проверяем что isLoading = false
      expect(useAIProviderStore.getState().isLoading).toBe(false);
    });

    test('обрабатывает сетевую ошибку', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockRejectedValue(new Error('Network error'));

      const result = await useAIProviderStore.getState().testConnection();

      expect(result).toBe(false);
      const state = useAIProviderStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.error).toBe('Network error');
    });

    test('вызывает apiLogger.markProcessedGlobally при успехе', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ success: true, connected: true }) as unknown as Response
      );

      await useAIProviderStore.getState().testConnection();

      expect(apiLogger.markProcessedGlobally).toHaveBeenCalledWith(
        'testConnection',
        true,
        expect.stringContaining('Connected')
      );
    });
  });

  // =========================================
  // LOAD MODELS
  // =========================================

  describe('loadModels', () => {
    test('заполняет availableModels при успехе', async () => {
      const mockModels = [
        { id: 'llama3.2:3b', name: 'Llama 3.2 3B' },
        { id: 'mistral:7b', name: 'Mistral 7B' },
      ];

      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ success: true, models: mockModels }) as unknown as Response
      );

      await useAIProviderStore.getState().loadModels();

      const state = useAIProviderStore.getState();
      expect(state.availableModels).toEqual(mockModels);
      expect(state.isLoading).toBe(false);
      expect(state.isConnected).toBe(true);
    });

    test('автоматически выбирает первую модель если нет выбранной', async () => {
      const mockModels = [
        { id: 'first-model', name: 'First' },
        { id: 'second-model', name: 'Second' },
      ];

      // Сбрасываем selectedModel
      useAIProviderStore.setState({ selectedModel: '' });

      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ success: true, models: mockModels }) as unknown as Response
      );

      await useAIProviderStore.getState().loadModels();

      expect(useAIProviderStore.getState().selectedModel).toBe('first-model');
    });

    test('не меняет selectedModel если уже есть выбранная модель', async () => {
      const mockModels = [
        { id: 'first-model', name: 'First' },
        { id: 'second-model', name: 'Second' },
      ];

      useAIProviderStore.setState({ selectedModel: 'existing-model' });

      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ success: true, models: mockModels }) as unknown as Response
      );

      await useAIProviderStore.getState().loadModels();

      expect(useAIProviderStore.getState().selectedModel).toBe('existing-model');
    });

    test('устанавливает error при ошибке загрузки', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({
          success: false,
          error: 'Failed to fetch models',
        }) as unknown as Response
      );

      await useAIProviderStore.getState().loadModels();

      const state = useAIProviderStore.getState();
      expect(state.error).toBe('Failed to fetch models');
      expect(state.isLoading).toBe(false);
    });
  });

  // =========================================
  // APPLY CONFIG
  // =========================================

  describe('applyConfig', () => {
    test('обновляет конфигурацию и сбрасывает isConnected', () => {
      useAIProviderStore.setState({ isConnected: true });

      useAIProviderStore.getState().applyConfig({
        provider: 'openai',
        url: 'https://api.openai.com',
        selectedModel: 'gpt-4',
      });

      const state = useAIProviderStore.getState();
      expect(state.provider).toBe('openai');
      expect(state.url).toBe('https://api.openai.com');
      expect(state.selectedModel).toBe('gpt-4');
      expect(state.isConnected).toBe(false);
    });
  });

  // =========================================
  // CLEAR ERROR & RESET
  // =========================================

  describe('clearError', () => {
    test('очищает error', () => {
      useAIProviderStore.setState({ error: 'Some error' });

      useAIProviderStore.getState().clearError();

      expect(useAIProviderStore.getState().error).toBe(null);
    });
  });

  describe('reset', () => {
    test('сбрасывает состояние к начальному', () => {
      useAIProviderStore.setState({
        provider: 'openai',
        url: 'https://custom.url',
        apiKey: 'secret-key',
        selectedModel: 'gpt-4',
        availableModels: [{ id: 'm1', name: 'Model 1' }],
        isConnected: true,
        isLoading: true,
        error: 'Some error',
      });

      useAIProviderStore.getState().reset();

      const state = useAIProviderStore.getState();
      expect(state.provider).toBe('ollama');
      expect(state.url).toBe('http://ollama:11434');
      expect(state.apiKey).toBe('');
      expect(state.selectedModel).toBe('llama3.2:3b');
      expect(state.availableModels).toEqual([]);
      expect(state.isConnected).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  // =========================================
  // aiProviderApi (exported helper)
  // =========================================

  describe('aiProviderApi', () => {
    test('testConnection вызывает правильный endpoint', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ success: true, connected: true }) as unknown as Response
      );

      await aiProviderApi.testConnection('http://test:1234');

      expect(apiLogger.wrappedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai-provider'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'testConnection',
            payload: { url: 'http://test:1234' },
          }),
        })
      );
    });

    test('listModels возвращает список моделей', async () => {
      const models = [{ id: 'm1', name: 'Model 1' }];
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ success: true, models }) as unknown as Response
      );

      const result = await aiProviderApi.listModels('http://test:1234');

      expect(result.models).toEqual(models);
    });
  });
});
