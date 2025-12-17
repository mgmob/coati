/**
 * Projects Store Tests
 *
 * Тесты для Zustand store (projectsStore.ts)
 * Мокируем api.ts, проверяем CRUD операции и состояние
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useProjectsStore } from '../projectsStore';
import type { Project } from '../../api';

// Мокируем api.ts
vi.mock('../../api', () => ({
  api: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
  },
}));

// Мокируем apiLogger
vi.mock('../../lib/apiLogger', () => ({
  apiLogger: {
    markProcessedGlobally: vi.fn(),
  },
}));

import { api } from '../../api';
import { apiLogger } from '../../lib/apiLogger';

describe('projectsStore', () => {
  // Сбрасываем store перед каждым тестом
  beforeEach(() => {
    vi.clearAllMocks();
    // Сбрасываем store к начальному состоянию
    useProjectsStore.setState({
      projects: [],
      loading: false,
      error: null,
      selectedProjectId: null,
    });
  });

  // =========================================
  // INITIAL STATE
  // =========================================

  describe('Initial State', () => {
    test('имеет корректное начальное состояние', () => {
      const state = useProjectsStore.getState();

      expect(state.projects).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.selectedProjectId).toBe(null);
    });
  });

  // =========================================
  // FETCH PROJECTS
  // =========================================

  describe('fetchProjects', () => {
    test('загружает список проектов при успехе', async () => {
      const mockProjects: Project[] = [
        { id: '1', name: 'Project 1', description: 'Test 1' },
        { id: '2', name: 'Project 2', description: 'Test 2' },
      ];

      vi.mocked(api.getProjects).mockResolvedValue(mockProjects);

      await useProjectsStore.getState().fetchProjects();

      const state = useProjectsStore.getState();
      expect(state.projects).toEqual(mockProjects);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });

    test('устанавливает loading во время запроса', async () => {
      let resolvePromise: (value: Project[]) => void;
      const promise = new Promise<Project[]>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(api.getProjects).mockReturnValue(promise);

      // Начинаем запрос
      const fetchPromise = useProjectsStore.getState().fetchProjects();

      // Проверяем что loading = true
      expect(useProjectsStore.getState().loading).toBe(true);

      // Резолвим промис
      resolvePromise!([]);
      await fetchPromise;

      // Проверяем что loading = false
      expect(useProjectsStore.getState().loading).toBe(false);
    });

    test('устанавливает error при ошибке', async () => {
      vi.mocked(api.getProjects).mockRejectedValue(new Error('Network error'));

      await useProjectsStore.getState().fetchProjects();

      const state = useProjectsStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.loading).toBe(false);
      expect(state.projects).toEqual([]);
    });

    test('не запускает дублирующие запросы', async () => {
      let resolvePromise: (value: Project[]) => void;
      const promise = new Promise<Project[]>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(api.getProjects).mockReturnValue(promise);

      // Запускаем первый запрос
      useProjectsStore.getState().fetchProjects();

      // Пытаемся запустить второй
      useProjectsStore.getState().fetchProjects();

      // API должен быть вызван только 1 раз
      expect(api.getProjects).toHaveBeenCalledTimes(1);

      // Завершаем промис
      resolvePromise!([]);
    });

    test('вызывает apiLogger.markProcessedGlobally при успехе', async () => {
      vi.mocked(api.getProjects).mockResolvedValue([]);

      await useProjectsStore.getState().fetchProjects();

      expect(apiLogger.markProcessedGlobally).toHaveBeenCalledWith(
        'listProjects',
        true,
        'Projects loaded successfully'
      );
    });
  });

  // =========================================
  // CREATE PROJECT
  // =========================================

  describe('createProject', () => {
    test('создает новый проект и добавляет в список', async () => {
      const newProject: Project = {
        id: 'new-id',
        name: 'New Project',
        description: 'New description',
      };

      vi.mocked(api.createProject).mockResolvedValue(newProject);

      const result = await useProjectsStore.getState().createProject('New Project', 'New description');

      expect(result).toEqual(newProject);

      const state = useProjectsStore.getState();
      expect(state.projects).toContainEqual(newProject);
      expect(state.loading).toBe(false);
    });

    test('добавляет проект в начало списка', async () => {
      const existingProjects: Project[] = [
        { id: '1', name: 'Old Project' },
      ];
      useProjectsStore.setState({ projects: existingProjects });

      const newProject: Project = { id: 'new-id', name: 'New Project' };
      vi.mocked(api.createProject).mockResolvedValue(newProject);

      await useProjectsStore.getState().createProject('New Project', '');

      const state = useProjectsStore.getState();
      expect(state.projects[0]).toEqual(newProject);
      expect(state.projects.length).toBe(2);
    });

    test('выбрасывает ошибку и устанавливает error при неудаче', async () => {
      vi.mocked(api.createProject).mockRejectedValue(new Error('Creation failed'));

      await expect(
        useProjectsStore.getState().createProject('Test', '')
      ).rejects.toThrow('Creation failed');

      const state = useProjectsStore.getState();
      expect(state.error).toBe('Creation failed');
      expect(state.loading).toBe(false);
    });

    test('вызывает api.createProject с правильными параметрами', async () => {
      vi.mocked(api.createProject).mockResolvedValue({ id: '1', name: 'Test' });

      await useProjectsStore.getState().createProject('Test Name', 'Test Description');

      expect(api.createProject).toHaveBeenCalledWith('Test Name', 'Test Description');
    });
  });

  // =========================================
  // SELECT PROJECT
  // =========================================

  describe('selectProject', () => {
    test('устанавливает selectedProjectId', () => {
      useProjectsStore.getState().selectProject('project-123');

      expect(useProjectsStore.getState().selectedProjectId).toBe('project-123');
    });

    test('позволяет изменить выбранный проект', () => {
      useProjectsStore.getState().selectProject('project-1');
      useProjectsStore.getState().selectProject('project-2');

      expect(useProjectsStore.getState().selectedProjectId).toBe('project-2');
    });
  });

  // =========================================
  // CLEAR ERROR
  // =========================================

  describe('clearError', () => {
    test('очищает error', () => {
      useProjectsStore.setState({ error: 'Some error' });

      useProjectsStore.getState().clearError();

      expect(useProjectsStore.getState().error).toBe(null);
    });

    test('не влияет на другие поля', () => {
      const projects: Project[] = [{ id: '1', name: 'Test' }];
      useProjectsStore.setState({
        projects,
        error: 'Some error',
        loading: false,
        selectedProjectId: '1',
      });

      useProjectsStore.getState().clearError();

      const state = useProjectsStore.getState();
      expect(state.projects).toEqual(projects);
      expect(state.selectedProjectId).toBe('1');
    });
  });
});
