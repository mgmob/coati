import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { apiLogger } from '../lib/apiLogger';

// Types
export interface AIModel {
  id: string;
  name: string;
  size?: number;
  modified?: string;
  details?: Record<string, unknown>;
}

export interface AIProviderConfig {
  provider: 'ollama' | 'vllm' | 'openai' | 'anthropic';
  url: string;
  apiKey?: string;
  selectedModel?: string;
}

interface AIProviderState {
  // Configuration
  provider: 'ollama' | 'vllm' | 'openai' | 'anthropic';
  url: string;
  apiKey: string;
  selectedModel: string;

  // Data
  availableModels: AIModel[];

  // Status
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastTestedAt: number | null;

  // Actions
  setProvider: (provider: AIProviderConfig['provider']) => void;
  setUrl: (url: string) => void;
  setApiKey: (apiKey: string) => void;
  setSelectedModel: (model: string) => void;

  testConnection: () => Promise<boolean>;
  loadModels: () => Promise<void>;
  applyConfig: (config: Partial<AIProviderConfig>) => void;

  clearError: () => void;
  reset: () => void;
}

// API Base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5678/webhook';

// API helper для AI Provider
const aiProviderApi = {
  testConnection: async (url: string): Promise<{ success: boolean; connected: boolean; error?: string; modelsAvailable?: number }> => {
    const response = await apiLogger.wrappedFetch(`${API_BASE}/ai-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'testConnection',
        payload: { url }
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  listModels: async (url: string): Promise<{ success: boolean; models: AIModel[]; error?: string }> => {
    const response = await apiLogger.wrappedFetch(`${API_BASE}/ai-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'listModels',
        payload: { url }
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  chat: async (params: {
    url: string;
    model: string;
    messages: Array<{ role: string; content: string }>;
    systemPrompt?: string;
  }): Promise<{ success: boolean; reply: string; error?: string }> => {
    const response = await apiLogger.wrappedFetch(`${API_BASE}/ai-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        payload: params
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  analyze: async (params: {
    url: string;
    model: string;
    text: string;
    context?: string;
    systemPrompt?: string;
  }): Promise<{
    success: boolean;
    analysis?: {
      questions: Array<{ id: string; question: string; quote: string }>;
      issues: string[];
      suggestions: string[];
    };
    error?: string;
  }> => {
    const response = await apiLogger.wrappedFetch(`${API_BASE}/ai-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze',
        payload: params
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },
};

// Default values
const DEFAULT_URL_OLLAMA = 'http://ollama:11434';
const DEFAULT_MODEL = 'llama3.2:3b';

// Store
export const useAIProviderStore = create<AIProviderState>()(
  persist(
    (set, get) => ({
      // Initial state
      provider: 'ollama',
      url: DEFAULT_URL_OLLAMA,
      apiKey: '',
      selectedModel: DEFAULT_MODEL,
      availableModels: [],
      isConnected: false,
      isLoading: false,
      error: null,
      lastTestedAt: null,

      // Actions
      setProvider: (provider) => {
        const urls: Record<string, string> = {
          ollama: 'http://ollama:11434',
          vllm: 'http://vllm:8000',
          openai: 'https://api.openai.com',
          anthropic: 'https://api.anthropic.com',
        };

        set({
          provider,
          url: urls[provider] || '',
          isConnected: false,
          availableModels: [],
          selectedModel: '',
        });
      },

      setUrl: (url) => {
        set({ url, isConnected: false });
      },

      setApiKey: (apiKey) => {
        set({ apiKey });
      },

      setSelectedModel: (selectedModel) => {
        set({ selectedModel });
      },

      testConnection: async () => {
        const { url } = get();

        set({ isLoading: true, error: null });

        try {
          const result = await aiProviderApi.testConnection(url);

          if (result.success && result.connected) {
            set({
              isConnected: true,
              isLoading: false,
              lastTestedAt: Date.now(),
            });
            apiLogger.markProcessedGlobally('testConnection', true, `Connected to ${url}`);
            return true;
          } else {
            set({
              isConnected: false,
              isLoading: false,
              error: result.error || 'Connection failed',
            });
            return false;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Connection failed';
          set({
            isConnected: false,
            isLoading: false,
            error: message,
          });
          return false;
        }
      },

      loadModels: async () => {
        const { url } = get();

        set({ isLoading: true, error: null });

        try {
          const result = await aiProviderApi.listModels(url);

          if (result.success) {
            set({
              availableModels: result.models,
              isLoading: false,
              isConnected: true,
            });

            // Auto-select first model if none selected
            const { selectedModel } = get();
            if (!selectedModel && result.models.length > 0) {
              set({ selectedModel: result.models[0].id });
            }

            apiLogger.markProcessedGlobally('listModels', true, `Loaded ${result.models.length} models`);
          } else {
            set({
              isLoading: false,
              error: result.error || 'Failed to load models',
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load models';
          set({
            isLoading: false,
            error: message,
          });
        }
      },

      applyConfig: (config) => {
        set({
          ...config,
          isConnected: false,
        });
      },

      clearError: () => set({ error: null }),

      reset: () => {
        set({
          provider: 'ollama',
          url: DEFAULT_URL_OLLAMA,
          apiKey: '',
          selectedModel: DEFAULT_MODEL,
          availableModels: [],
          isConnected: false,
          isLoading: false,
          error: null,
          lastTestedAt: null,
        });
      },
    }),
    {
      name: 'coati-ai-provider',
      partialize: (state) => ({
        provider: state.provider,
        url: state.url,
        apiKey: state.apiKey,
        selectedModel: state.selectedModel,
      }),
    }
  )
);

// Selector hooks for convenience - using useShallow to prevent infinite loops
export const useAIProvider = () => useAIProviderStore(
  useShallow((state) => ({
    provider: state.provider,
    url: state.url,
    selectedModel: state.selectedModel,
    isConnected: state.isConnected,
  }))
);

export const useAIProviderModels = () => useAIProviderStore((state) => state.availableModels);

export const useAIProviderStatus = () => useAIProviderStore(
  useShallow((state) => ({
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
  }))
);

// Export API for direct use
export { aiProviderApi };
