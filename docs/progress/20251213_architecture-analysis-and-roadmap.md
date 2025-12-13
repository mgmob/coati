# Анализ архитектуры проекта Coati и план исправлений

**Дата анализа:** 13 декабря 2025, 13:27 (MSK)
**Аналитик:** Cline AI Assistant
**Версия проекта:** MVP Phase 1
**Статус:** В разработке (~35-40% от ТЗ)

---

## Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Текущая архитектура](#2-текущая-архитектура)
3. [Анализ реализации](#3-анализ-реализации)
4. [Выявленные проблемы](#4-выявленные-проблемы)
5. [Выбранные технологии](#5-выбранные-технологии)
6. [План исправлений Phase 1](#6-план-исправлений-phase-1)
7. [Чеклисты задач](#7-чеклисты-задач)

---

## 1. Обзор проекта

### Название
**Coati** - AI-Driven Requirements Management System

### Концепция
SaaS-платформа для автоматизированной и совместной разработки требований к ПО с использованием ИИ-агентов, которые ведут пользователя через итеративный процесс уточнения (анализ → вопросы → проверка → генерация).

### Ключевые особенности
- Агентный подход (ИИ = бизнес-аналитик)
- Атомарное хранение требований в графовой БД
- Блочный редактор (Notion-style)
- Итеративный цикл уточнения с Quality Gate
- Гибкая настройка workflow из шагов

---

## 2. Текущая архитектура

### 2.1. Технологический стек

**Frontend:**
- ✅ React 19.2.0 + TypeScript
- ✅ TipTap 3.13.0 (Rich Text Editor)
- ✅ Tailwind CSS + clsx + tailwind-merge
- ✅ React Router DOM 7.10.1
- ✅ Axios 1.13.2
- ✅ Lucide React (иконки)

**Backend:**
- ✅ n8n (workflow automation)
- ✅ ArangoDB (мультимодельная БД: документы + графы)
- ⚠️ Docker Compose (настроен частично)

**Infrastructure:**
- ✅ Vite 7.2.4 (dev server)
- ✅ TypeScript 5.9.3
- ✅ ESLint 9.39.1

### 2.2. Структура проекта

```
coati/
├── frontend/              # React SPA
│   ├── src/
│   │   ├── api.ts        # API client
│   │   ├── components/   # UI компоненты (atoms/molecules/organisms)
│   │   ├── contexts/     # React contexts (AIModels, Prompts, Templates)
│   │   ├── pages/        # Страницы (Projects, ProjectDetails)
│   │   ├── lib/          # Утилиты (debugMode, apiLogger)
│   │   └── hooks/
│   └── package.json
├── backend/
│   └── n8n/
│       └── workflows/    # JSON файлы workflows
│           ├── Coati Data API.json
│           └── API - AI Connect.json
├── infra/
│   ├── arangodb_data/    # Данные ArangoDB
│   └── n8n_data/         # Данные n8n
├── docs/                 # Документация
└── docker-compose.yml
```

---

## 3. Анализ реализации

### 3.1. Что реализовано (✅)

#### Frontend (15-20% от ТЗ)

**Архитектура:**
- ✅ Компонентная структура (Atomic Design: atoms, molecules, organisms)
- ✅ TypeScript типизация
- ✅ API слой с типизированными интерфейсами
- ✅ Context providers для глобального состояния
- ✅ Роутинг между страницами

**UI компоненты:**
- ✅ Layout с навигацией
- ✅ Базовые atoms (Button, Card, Input, Logo)
- ✅ TipTap редактор (подключен)
- ✅ Формы создания проектов

**Функциональность:**
- ✅ Список проектов
- ✅ Создание проекта
- ✅ Просмотр деталей проекта
- ✅ Debug Panel с API логированием

#### Backend (25-30% от ТЗ)

**Workflow: Coati Data API**
- ✅ Main Router с CRUD классификацией
- ✅ **CREATE:** createProject, addStage, chat
- ✅ **READ:** getProjectDetails, listPrompts, listProjects, listTemplates, listAIModels, listSystemPrompts
- ✅ **UPDATE:** updateStageSteps
- ⚠️ **DELETE:** Switch node есть, но без реализации

**Workflow: API - AI Connect**
- ✅ Интеграция с Ollama (локальная LLM)
- ✅ Базовый chat endpoint
- ✅ Системный промпт

**База данных:**
- ✅ ArangoDB подключена
- ✅ **Полная схема из ТЗ реализована!**
- ✅ **Document Collections (13):** AI_Models, Attachments, Dictionaries, Documents, Invites, Iterations, Projects, Prompts, Requirements, Stages, StageTemplates, SystemPrompts, Users
- ✅ **Edge Collections (4):** DocLink, MemberOf, Structure, Traceability

### 3.2. Что НЕ реализовано (❌)

#### Ядро системы

- ❌ **AI Engine** - самое главное!
  - ❌ Типы шагов (ambiguity_loop, simple_generation, compliance_check, manual_review)
  - ❌ Context Builder с RAG
  - ❌ Quality Gate (проверка качества ответов)
  - ❌ Compliance Check (сверка с исходником)

- ❌ **Q&A Interface**
  - ❌ Split View (редактор + форма вопросов)
  - ❌ Подсветка цитат
  - ❌ Валидация ответов
  - ❌ Force Submit

#### Управление этапами

- ❌ Таймлайн (горизонтальный и вертикальный)
- ❌ Настройка workflow из шагов
- ❌ Выбор моделей/промптов на уровне шагов
- ❌ Динамическое добавление/удаление шагов

#### Работа с контекстом

- ❌ Загрузка файлов (PDF, DOCX)
- ❌ Парсинг файлов
- ❌ Token Meter
- ❌ RAG с векторным поиском
- ❌ Embeddings generation

#### Атомарные требования

- ❌ Блочный редактор с контейнерами
- ❌ Визуализация ID требований (BR-001)
- ❌ Графовое хранение связей
- ❌ Traceability между требованиями
- ❌ Drag & Drop блоков

#### Многопользовательский режим

- ❌ Авторизация (JWT)
- ❌ Регистрация/логин
- ❌ Система инвайтов
- ❌ Ролевая модель (owner/editor/reader)
- ❌ Админка

---

## 4. Выявленные проблемы

### 🔴 КРИТИЧЕСКИЕ

#### 4.1. Нарушение .clinerules
**Локация:** `frontend/src/api.ts`, `frontend/src/components/organisms/StageTimeline.tsx`

**Проблема:** Использование `eslint-disable` (7 случаев)

```typescript
// ❌ Нарушение правила
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = await api._callDataApi<any>('listProjects');
```

**Правило из .clinerules:**
> ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ eslint-disable, линтер плохого не посоветует

**Причина:** Отсутствие правильных типов для API ответов

**Риск:** Потеря типобезопасности, потенциальные runtime ошибки

---

#### 4.2. Огромный разрыв между ТЗ и реализацией

**Факты:**
- Реализовано: ~25-30% от полного ТЗ
- Отсутствует: Ядро системы (AI Engine)
- Статус: Базовый CRUD, нет главной функциональности

**Риск:** Проект не выполняет свою основную функцию - итеративное уточнение требований с помощью ИИ

---

#### 4.3. Incomplete Backend workflow

**Проблема:** В n8n отсутствует обработка для action `chat` в CREATE switch

**Локация:** `Coati Data API` → Switch CREATE → третья ветка

**Ожидается:** Интеграция с `API - AI Connect` workflow

**Факт:** Ветка есть, но не подключена к AI Connect workflow

---

### ⚠️ СЕРЬЕЗНЫЕ

#### 4.4. React 19 + StrictMode issues

**Проблема:** Костыль для борьбы с двойным рендером

```typescript
// api.ts
let projectsCachePromise: Promise<Project[]> | null = null;
// Комментарий: "Предотвращает множественные API вызовы из-за React.StrictMode"
```

**Причина:** Неправильная архитектура state management

**Решение:** Внедрить Zustand

---

#### 4.5. Отсутствие обработки ошибок

**Проблемы:**
- Нет retry логики для API calls
- Нет Error Boundaries
- Нет fallback UI для failed states
- Ошибки не логируются

**Пример:**
```typescript
// api.ts - нет try-catch обработки на уровне компонентов
const response = await apiLogger.wrappedFetch(N8N_WEBHOOK_URL, {...});
if (!response.ok) {
  throw new Error(`API Error: ${response.statusText}`); // Где catch?
}
```

---

#### 4.6. Debug код в production

**Локация:** `frontend/src/App.tsx`

```typescript
console.log('[DEBUG] App is rendering'); // <--- Оставлен debug
```

**Проблема:** Debug логи должны быть удалены перед production

---

#### 4.7. Отсутствие тестов

**Факты:**
- Vitest настроен: ✅
- Написано тестов: 0
- Test setup file: существует, но пустой

**Риск:** Нет гарантии работоспособности при рефакторинге

---

### 🟡 СРЕДНИЕ

#### 4.8. Hardcoded values

```typescript
// api.ts
const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/data-api';
```

**Проблема:** Нет использования environment variables

**Риск:** Невозможно деплоить в разные окружения

---

#### 4.9. Неоптимальная структура Context Providers

```typescript
// App.tsx
<DebugModeProvider>
  <AIModelsProvider>
    <SystemPromptsProvider>
      <TemplatesProvider>
        <BrowserRouter>...</BrowserRouter>
      </TemplatesProvider>
    </SystemPromptsProvider>
  </AIModelsProvider>
</DebugModeProvider>
```

**Проблема:** 4 вложенных провайдера

**Риск:** Излишние ре-рендеры, сложность отладки

**Решение:** Zustand вместо Context API

---

#### 4.10. Некорректные AQL запросы

**Пример из n8n:**
```json
"bodyParameters": {
  "parameters": [
    {"name": "query", "value": "..."},
    {"name": "bindVars", "value": "={{ {...} }}"}
  ]
}
```

**Проблема:** Использование `bodyParameters` вместо правильного формата ArangoDB API

**Правильно:**
```json
"specifyBody": "json",
"jsonBody": "{\n  \"query\": \"...\",\n  \"bindVars\": {...}\n}"
```

---

#### 4.11. Отсутствие валидации на frontend

**Проблема:** Формы не валидируются перед отправкой

**Пример:** Создание проекта - можно отправить пустое имя

---

## 5. Выбранные технологии

### 5.1. State Management: Zustand ✅

**Выбор обоснован:**
- ✅ Простота (меньше boilerplate vs Redux)
- ✅ React 19 совместимость
- ✅ Не требует Provider (чище App.tsx)
- ✅ TypeScript friendly из коробки
- ✅ Меньше размер (2kb vs 20kb Redux Toolkit)
- ✅ Легче отлаживать

**Альтернатива (отклонена):** Redux Toolkit
- ❌ Слишком тяжеловесно для проекта такого размера
- ❌ Больше boilerplate кода
- ❌ Излишняя сложность для команды

---

### 5.2. Workflows Automation: n8n API

**Решение:** Управлять workflows программно через n8n REST API

**Подход:**
1. **Backup:** Автоматическая выгрузка workflows из n8n в JSON файлы
2. **Sync:** Загрузка workflows из файлов в n8n (IaC подход)
3. **Version Control:** JSON файлы в Git как source of truth

**Преимущества:**
- ✅ Workflows в репозитории
- ✅ Возможность code review
- ✅ Автоматический deployment
- ✅ Backup из коробки

**Инструменты:**
- Node.js скрипты (backup-workflows.js, sync-workflows.js)
- npm scripts для удобства
- n8n API Key для авторизации

---

## 6. План исправлений Phase 1

**Цель:** Устранить критические проблемы и подготовить базу для разработки ядра системы

**Срок:** 1 неделя (5 рабочих дней)

---

### День 1-2: Workflows Automation

#### Задача 6.1. Настроить n8n API

**Шаги:**
1. Открыть n8n UI → Settings → API
2. Включить API Key authentication
3. Сгенерировать API Key
4. Добавить в `.env` файл

**Deliverables:**
- `.env` с `N8N_API_KEY`
- Обновленный `docker-compose.yml` с передачей ключа

---

#### Задача 6.2. Создать скрипты automation

**Структура:**
```
backend/n8n/
├── scripts/
│   ├── backup-workflows.js   # Выгрузка n8n → files
│   ├── sync-workflows.js     # Загрузка files → n8n
│   └── watch-workflows.js    # Авто-бэкап при изменениях (future)
├── workflows/                # JSON файлы (source of truth)
└── package.json              # npm scripts
```

**Содержание package.json:**
```json
{
  "scripts": {
    "workflows:backup": "node scripts/backup-workflows.js",
    "workflows:sync": "node scripts/sync-workflows.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "dotenv": "^16.0.0"
  }
}
```

**Deliverables:**
- ✅ `backup-workflows.js` (готовый код в плане)
- ✅ `sync-workflows.js` (готовый код в плане)
- ✅ `package.json`
- ✅ Инструкция в `backend/n8n/README.md`

---

#### Задача 6.3. Протестировать automation

**Тесты:**
```bash
# 1. Backup
cd backend/n8n
npm run workflows:backup
# Ожидаем: 2 файла обновлены (Coati Data API.json, API - AI Connect.json)

# 2. Изменить workflow в UI
# 3. Backup еще раз
npm run workflows:backup
# Ожидаем: Git показывает изменения

# 4. Sync обратно
npm run workflows:sync
# Ожидаем: Workflows обновлены в n8n
```

**Deliverables:**
- ✅ Успешный backup
- ✅ Успешный sync
- ✅ Git diff показывает корректные изменения

---

### День 3-4: Исправить код

#### Задача 6.4. Убрать eslint-disable

**Файл:** `frontend/src/api.ts`

**Действия:**

1. **Создать типы для ArangoDB ответов:**
```typescript
// Добавить в начало api.ts
interface ArangoResponse<T> {
  result: T;
}

interface ArangoCursorResponse<T> {
  result: T[];
  hasMore: boolean;
  count?: number;
}
```

2. **Обновить все методы API:**
```typescript
// ❌ БЫЛО:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = await api._callDataApi<any>('listProjects');

// ✅ СТАЛО:
const data = await api._callDataApi<ArangoCursorResponse<Project>>('listProjects');
return data.result || [];
```

3. **Проверить:**
```bash
npm run lint
# Ожидаем: 0 ошибок eslint-disable
```

**Deliverables:**
- ✅ 0 использований `eslint-disable` в api.ts
- ✅ Все типы корректны
- ✅ Линтер проходит

---

**Файл:** `frontend/src/components/organisms/StageTimeline.tsx`

**Действие:**
```typescript
// ❌ БЫЛО:
// eslint-disable-next-line react-hooks/set-state-in-effect
setSteps(initialSteps);

// ✅ СТАЛО:
useEffect(() => {
  setSteps(initialSteps);
}, [initialSteps]); // Добавить зависимость
```

---

#### Задача 6.5. Убрать debug код

**Файлы:**
- `frontend/src/App.tsx` - удалить `console.log('[DEBUG] App is rendering')`
- `frontend/src/api.ts` - заменить console.log на proper logger (если есть)

**Deliverables:**
- ✅ Нет console.log в production коде
- ✅ Только apiLogger используется

---

#### Задача 6.6. Environment variables

**Создать `.env`:**
```bash
# n8n Configuration
N8N_URL=http://localhost:5678
N8N_API_KEY=your-generated-key-here

# Frontend API
VITE_N8N_URL=http://localhost:5678
VITE_API_BASE_URL=http://localhost:5678/webhook
VITE_N8N_DATA_API=/data-api
VITE_N8N_CHAT_API=/chat
```

**Создать `.env.example`:**
```bash
N8N_URL=http://localhost:5678
N8N_API_KEY=

VITE_N8N_URL=http://localhost:5678
VITE_API_BASE_URL=http://localhost:5678/webhook
VITE_N8N_DATA_API=/data-api
VITE_N8N_CHAT_API=/chat
```

**Обновить `frontend/src/api.ts`:**
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5678/webhook';
const DATA_ENDPOINT = import.meta.env.VITE_N8N_DATA_API || '/data-api';
const N8N_WEBHOOK_URL = `${API_BASE}${DATA_ENDPOINT}`;
```

**Обновить `.gitignore`:**
```
.env
.env.local
```

**Deliverables:**
- ✅ `.env` (локально, не в Git)
- ✅ `.env.example` (в Git)
- ✅ api.ts использует env variables
- ✅ `.gitignore` обновлен

---

### День 5: Внедрить Zustand

#### Задача 6.7. Установить Zustand

```bash
cd frontend
npm install zustand
```

---

#### Задача 6.8. Создать stores

**Структура:**
```
frontend/src/stores/
├── projectsStore.ts   # Управление проектами
├── aiStore.ts         # AI модели, промпты, templates
└── uiStore.ts         # UI состояния (loading, errors, modals)
```

**Пример `projectsStore.ts`:**
```typescript
import { create } from 'zustand';
import { api, Project } from '../api';

interface ProjectsState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  selectedProjectId: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (name: string, description: string) => Promise<void>;
  selectProject: (id: string) => void;
  clearError: () => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,
  selectedProjectId: null,

  fetchProjects: async () => {
    if (get().loading) return; // Дедупликация

    set({ loading: true, error: null });
    try {
      const projects = await api.getProjects();
      set({ projects, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load projects',
        loading: false
      });
    }
  },

  createProject: async (name, description) => {
    set({ loading: true, error: null });
    try {
      const newProject = await api.createProject(name, description);
      set(state => ({
        projects: [newProject, ...state.projects],
        loading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create project',
        loading: false
      });
      throw error;
    }
  },

  selectProject: (id) => set({ selectedProjectId: id }),
  clearError: () => set({ error: null }),
}));
```

**Deliverables:**
- ✅ `projectsStore.ts`
- ✅ `aiStore.ts`
- ✅ `uiStore.ts`

---

#### Задача 6.9. Обновить компоненты

**ProjectsPage.tsx:**
```typescript
// ❌ БЫЛО:
import { useEffect, useState } from 'react';
const [projects, setProjects] = useState<Project[]>([]);

useEffect(() => {
  api.loadProjectsOnce().then(setProjects);
}, []);

// ✅ СТАЛО:
import { useProjectsStore } from '../stores/projectsStore';

const { projects, loading, error, fetchProjects } = useProjectsStore();

useEffect(() => {
  fetchProjects();
}, [fetchProjects]);
```

**Deliverables:**
- ✅ ProjectsPage.tsx обновлена
- ✅ ProjectDetailsPage.tsx обновлена (если использует state)

---

#### Задача 6.10. Убрать Context Providers

**App.tsx:**
```typescript
// ❌ БЫЛО:
<DebugModeProvider>
  <AIModelsProvider>
    <SystemPromptsProvider>
      <TemplatesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ProjectsPage />} />
            <Route path="/project/:id" element={<ProjectDetailsPage />} />
          </Routes>
        </BrowserRouter>
      </TemplatesProvider>
    </SystemPromptsProvider>
  </AIModelsProvider>
</DebugModeProvider>

// ✅ СТАЛО:
<DebugModeProvider>
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<ProjectsPage />} />
      <Route path="/project/:id" element={<ProjectDetailsPage />} />
    </Routes>
  </BrowserRouter>
</DebugModeProvider>
```

**Удалить файлы (если не используются):**
- `frontend/src/contexts/AIModelsContext.tsx`
- `frontend/src/contexts/SystemPromptsContext.tsx`
- `frontend/src/contexts/TemplatesContext.tsx`

**Deliverables:**
- ✅ App.tsx упрощен
- ✅ Неиспользуемые контексты удалены

---

#### Задача 6.11. Убрать projectsCachePromise костыль

**api.ts:**
```typescript
// ❌ УДАЛИТЬ:
let projectsCachePromise: Promise<Project[]> | null = null;

export const api = {
  loadProjectsOnce: async (): Promise<Project[]> => {
    if (projectsCachePromise) {
      return projectsCachePromise;
    }
    // ...
  }
}

// ✅ Теперь дедупликация в Zustand store
```

**Deliverables:**
- ✅ Костыль удален
- ✅ Код чище

---

## 7. Чеклисты задач

### 📋 Checklist: День 1-2 (Workflows Automation)

- [ ] Открыть n8n Settings → API
- [ ] Сгенерировать API Key
- [ ] Создать `.env` с `N8N_API_KEY`
- [ ] Обновить `docker-compose.yml`
- [ ] Создать `backend/n8n/scripts/`
- [ ] Написать `backup-workflows.js`
- [ ] Написать `sync-workflows.js`
- [ ] Создать `backend/n8n/package.json`
- [ ] Установить зависимости: `npm install`
- [ ] Протестировать: `npm run workflows:backup`
- [ ] Проверить Git diff
- [ ] Протестировать: `npm run workflows:sync`
- [ ] Написать `backend/n8n/README.md` с инструкциями
- [ ] Добавить `.env` в `.gitignore`

---

### 📋 Checklist: День 3-4 (Исправить код)

- [ ] Создать типы `ArangoResponse<T>` в `api.ts`
- [ ] Создать типы `ArangoCursorResponse<T>` в `api.ts`
- [ ] Убрать `eslint-disable` из `getProjects()`
- [ ] Убрать `eslint-disable` из `createProject()`
- [ ] Убрать `eslint-disable` из `getProjectDetails()`
- [ ] Убрать `eslint-disable` из `getAIModels()`
- [ ] Убрать `eslint-disable` из `getSystemPrompts()`
- [ ] Убрать `eslint-disable` из `chatWithAI()`
- [ ] Исправить `eslint-disable` в `StageTimeline.tsx`
- [ ] Удалить `console.log` из `App.tsx`
- [ ] Проверить отсутствие других debug логов
- [ ] Запустить `npm run lint` - должно быть 0 ошибок
- [ ] Создать `.env` файл
- [ ] Создать `.env.example` файл
- [ ] Обновить `api.ts` для использования env variables
- [ ] Обновить `.gitignore`
- [ ] Протестировать dev server: `npm run dev`

---

### 📋 Checklist: День 5 (Zustand)

- [ ] Установить zustand: `npm install zustand`
- [ ] Создать `frontend/src/stores/`
- [ ] Написать `projectsStore.ts`
- [ ] Написать `aiStore.ts`
- [ ] Написать `uiStore.ts`
- [ ] Обновить `ProjectsPage.tsx`
- [ ] Обновить `ProjectDetailsPage.tsx`
- [ ] Упростить `App.tsx` (убрать providers)
- [ ] Удалить `AIModelsContext.tsx`
- [ ] Удалить `SystemPromptsContext.tsx`
- [ ] Удалить `TemplatesContext.tsx`
- [ ] Убрать `projectsCachePromise` из `api.ts`
- [ ] Протестировать: создание проекта
- [ ] Протестировать: переход между страницами
- [ ] Проверить DevTools: нет лишних ре-рендеров

---

## 8. Следующие шаги (Phase 2+)

После завершения Phase 1 переходим к:

### Phase 2: Реализация AI Engine (4-6 недель)
- Типы шагов (ambiguity_loop, simple_generation, quality_gate, compliance_check)
- Context Builder с RAG
- Sub-workflows в n8n
- Интеграция с OpenAI/Anthropic

### Phase 3: Q&A Interface (2-3 недели)
- Split View компонент
- Подсветка текста
- Форма с валидацией
- Force Submit

### Phase 4: Блочный редактор (3-4 недели)
- TipTap Custom Nodes
- Requirement Containers
- Drag & Drop
- Визуализация ID

### Phase 5: Multi-tenancy (3-4 недели)
- Авторизация JWT
- Система инвайтов
- Ролевая модель
- Админка

---

## 9. Метрики успеха

### Phase 1

**Технические метрики:**
- ✅ 0 использований `eslint-disable`
- ✅ 100% API методов используют env variables
- ✅ Workflows автоматически бэкапятся
- ✅ Zustand заменил все Context Providers

**Качественные метрики:**
- ✅ Код проходит линтер без warnings
- ✅ TypeScript строгая типизация (no `any`)
- ✅ Git содержит актуальные workflows
- ✅ Приложение работает без ошибок в консоли

---

## 10. Риски и митигация

### Риск 1: API Key leak
**Митигация:** `.env` в `.gitignore`, использовать `.env.example`

### Риск 2: Breaking changes при рефакторинге
**Митигация:** Написать базовые тесты (vitest) перед Phase 2

### Риск 3: Потеря данных при sync workflows
**Митигация:** Всегда делать `workflows:backup` перед `workflows:sync`

---

## Заключение

Проект **Coati** находится в начальной стадии разработки с реализованным базовым CRUD функционалом (~25-30% от ТЗ).

**Главная проблема:** Отсутствие ядра системы - AI Engine для итеративного уточнения требований.

**План Phase 1** устраняет критические технические долги и подготавливает надежную базу для дальнейшей разработки. После его выполнения можно безопасно приступать к реализации ключевой функциональности.

**Приоритет:** Сначала Phase 1 (фундамент), затем AI Engine (ценность).

---

**Боже в помощь мою вонми, Господи помощи ми потщися** 🙏

---

_Документ создан автоматически на основе анализа кода проекта Coati._
_Последнее обновление: 13.12.2025, 13:27 MSK_
