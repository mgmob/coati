/**
 * API Client Tests
 *
 * Тесты для HTTP клиента (api.ts)
 * Мокируем apiLogger.wrappedFetch, проверяем логику endpoints и обработки ответов
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { api } from '../api';
import type { AnalysisResult, Project, QAItem } from '../api';

// Мокируем apiLogger
vi.mock('../lib/apiLogger', () => ({
  apiLogger: {
    wrappedFetch: vi.fn(),
  },
}));

// Импортируем мок после vi.mock
import { apiLogger } from '../lib/apiLogger';

// Helper для создания mock Response
const createMockResponse = (data: unknown, ok = true, status = 200) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Error',
  json: vi.fn().mockResolvedValue(data),
});

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Очищаем localStorage
    localStorage.clear();
  });

  // =========================================
  // PROJECTS
  // =========================================

  describe('getProjects', () => {
    test('возвращает список проектов при успешном запросе', async () => {
      const mockProjects: Project[] = [
        { id: '1', name: 'Project 1', description: 'Test' },
        { id: '2', name: 'Project 2' },
      ];

      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ result: mockProjects }) as unknown as Response
      );

      const result = await api.getProjects();

      expect(result).toEqual(mockProjects);
      expect(apiLogger.wrappedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/data-api'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'listProjects', payload: {} }),
        })
      );
    });

    test('возвращает пустой массив если result отсутствует', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ result: null }) as unknown as Response
      );

      const result = await api.getProjects();

      expect(result).toEqual([]);
    });

    test('выбрасывает ошибку при неуспешном ответе', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse(null, false, 500) as unknown as Response
      );

      await expect(api.getProjects()).rejects.toThrow('API Error');
    });
  });

  // =========================================
  // SAVE ITERATION
  // =========================================

  describe('saveIteration', () => {
    test('отправляет данные Q&A и возвращает ID', async () => {
      const questions: QAItem[] = [
        { id: 'q1', question: 'Вопрос 1', quote: 'Цитата 1' },
        { id: 'q2', question: 'Вопрос 2', quote: 'Цитата 2' },
      ];
      const answers = { q1: 'Ответ 1', q2: 'Ответ 2' };
      const params = {
        projectId: 'proj123',
        stageId: 'stage1',
        stepId: 'step1',
        questions,
        answers,
      };

      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ result: { id: 'iter123' } }) as unknown as Response
      );

      const result = await api.saveIteration(params);

      expect(result.id).toBe('iter123');
      expect(apiLogger.wrappedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'saveIteration', payload: params }),
        })
      );
    });
  });

  // =========================================
  // GET ITERATIONS
  // =========================================

  describe('getIterations', () => {
    test('возвращает список итераций', async () => {
      const mockIterations = [
        { id: 'iter1', questions: [] },
        { id: 'iter2', questions: [] },
      ];

      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ result: mockIterations }) as unknown as Response
      );

      const result = await api.getIterations('proj123', 'stage1');

      expect(result).toEqual(mockIterations);
    });

    test('возвращает пустой массив если итераций нет', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ result: null }) as unknown as Response
      );

      const result = await api.getIterations('proj123', 'stage1');

      expect(result).toEqual([]);
    });
  });

  // =========================================
  // ANALYZE DOCUMENT
  // =========================================

  describe('analyzeDocument', () => {
    beforeEach(() => {
      // Устанавливаем конфиг AI провайдера в localStorage
      localStorage.setItem('coati-ai-provider', JSON.stringify({
        state: {
          url: 'http://ollama:11434',
          selectedModel: 'llama3.2:3b',
        },
      }));
    });

    test('возвращает результат анализа при успехе', async () => {
      const mockAnalysis: AnalysisResult = {
        questions: [
          { id: 'q1', question: 'Что такое X?', quote: 'X не определен' },
        ],
        issues: ['Нет описания Y'],
        suggestions: ['Добавить раздел Z'],
      };

      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ success: true, analysis: mockAnalysis }) as unknown as Response
      );

      const result = await api.analyzeDocument({ text: 'Тестовый текст' });

      expect(result).toEqual(mockAnalysis);
      expect(apiLogger.wrappedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai-provider'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"analyze"'),
        })
      );
    });

    test('использует настройки из localStorage', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({
          success: true,
          analysis: { questions: [], issues: [], suggestions: [] },
        }) as unknown as Response
      );

      await api.analyzeDocument({ text: 'Тест' });

      const callBody = JSON.parse(
        (apiLogger.wrappedFetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
      );
      expect(callBody.payload.url).toBe('http://ollama:11434');
      expect(callBody.payload.model).toBe('llama3.2:3b');
    });

    test('выбрасывает ошибку если анализ не удался', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({
          success: false,
          error: 'Model not found',
        }) as unknown as Response
      );

      await expect(
        api.analyzeDocument({ text: 'Тест' })
      ).rejects.toThrow('Model not found');
    });

    test('выбрасывает ошибку если analysis отсутствует', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ success: true, analysis: null }) as unknown as Response
      );

      await expect(
        api.analyzeDocument({ text: 'Тест' })
      ).rejects.toThrow('Анализ не удался');
    });
  });

  // =========================================
  // SYSTEM PROMPTS
  // =========================================

  describe('getSystemPrompt', () => {
    test('возвращает промпт по ID', async () => {
      const mockPrompt = {
        id: 'prompt1',
        name: 'BA Prompt',
        body: 'You are a BA...',
        category: 'analysis',
      };

      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ result: mockPrompt }) as unknown as Response
      );

      const result = await api.getSystemPrompt('prompt1');

      expect(result).toEqual(mockPrompt);
    });
  });

  describe('createSystemPrompt', () => {
    test('создает новый промпт и возвращает ID', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue(
        createMockResponse({ result: { id: 'newPrompt123' } }) as unknown as Response
      );

      const result = await api.createSystemPrompt({
        name: 'New Prompt',
        body: 'Prompt body',
        category: 'test',
      });

      expect(result.id).toBe('newPrompt123');
    });
  });

  // =========================================
  // ERROR HANDLING
  // =========================================

  describe('Error Handling', () => {
    test('обрабатывает сетевую ошибку', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockRejectedValue(
        new Error('Network error')
      );

      await expect(api.getProjects()).rejects.toThrow('Network error');
    });

    test('обрабатывает HTTP 404', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn(),
      } as unknown as Response);

      await expect(api.getProjects()).rejects.toThrow('API Error: Not Found');
    });

    test('обрабатывает HTTP 500', async () => {
      vi.mocked(apiLogger.wrappedFetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn(),
      } as unknown as Response);

      await expect(api.getProjects()).rejects.toThrow('API Error: Internal Server Error');
    });
  });
});
