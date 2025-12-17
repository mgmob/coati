# План реализации AI Engine для Coati (ФИНАЛЬНАЯ ВЕРСИЯ)

> **Статус:** Утвержден
> **Дата:** 15 декабря 2025 (обновлён 17 декабря 2025)
> **Версия:** 3.0 (с учётом Architecture Specification v2.1)

---

## 📊 Анализ текущего состояния

### ✅ Что уже реализовано:

**Frontend компоненты:**
- `TiptapEditor` - базовый редактор (StarterKit)
- `QAPanel` - панель вопросов-ответов с валидацией и Force Submit
- `TokenMeter` - счетчик токенов
- `StageTimeline` - выбор моделей/промптов для каждого шага (**требует рефакторинга**)

**Backend workflows (n8n):**
- `Coati Data API` - базовый CRUD (**неполный**: нет удаления, создание только проекта)
- `API - AI Connect` - интеграция с Ollama (базовая)
- `RAG: Indexing To Arango` - индексация чанков для **кодовой базы** (коллекция `docs`)
- `RAG: Search` - векторный поиск по **кодовой базе** (коллекция `docs`)

**База данных (ArangoDB):**
- Полная схема из ТЗ (13 коллекций документов + 4 edge коллекции)
- Коллекция `docs` с embeddings кодовой базы (для разработчиков)

### ❌ Что требует реализации:

**Критически важное:**
1. **Глобальный селектор AI модели** (вместо выбора на уровне шагов)
2. **Рефакторинг StageTimeline** - убрать выбор модели, улучшить работу с промптами
3. **AI анализ текста** с генерацией структурированных вопросов
4. **Context Builder** - сборка контекста для AI из разных источников
5. **Compliance Check** - сверка ответов пользователя с исходным текстом
6. **Split View** - двухпанельный редактор с react-resizable-panels
7. **RAG для пользовательских документов** - отдельные workflows и коллекция `user_documents`
8. **MCP-Arango** - MCP-сервер для управления ArangoDB из Cline
9. **Optimistic Concurrency Control (CAS)** - защита от race conditions через `_rev`

**Управление workflow:**
1. Добавление/удаление шагов этапа
2. Добавление/удаление этапов
3. Шаблоны этапов и шагов
4. Сохранение настроек workflow

---

## 🏷️ Naming Convention для n8n Workflows

**Все новые workflows для Coati должны начинаться с префикса "Coati"**

**Существующие workflows (оставляем как есть):**
- `Coati Data API` ✅
- `API - AI Connect` ✅
- `RAG: Indexing To Arango` ✅ (для кодовой базы → `docs`)
- `RAG: Search` ✅ (для кодовой базы → `docs`)

**Новые workflows для создания:**
| Название | Назначение |
|----------|------------|
| `Coati AI Provider Manager` | Управление AI провайдерами |
| `Coati AI Generate Embeddings` | Генерация embeddings (Ollama + nomic-embed-text) |
| `Coati RAG Indexing To Arango` | Индексация пользовательских документов → `user_documents` |
| `Coati RAG Search` | Поиск в пользовательских документах → `user_documents` |
| `Coati AI Build Context` | Сборка контекста для AI |
| `Coati AI Analyze Document` | Анализ документа и генерация вопросов |
| `Coati AI Compliance Check` | Проверка соответствия ответов |
| `Coati AI Parse Response` | Sub-workflow: парсинг JSON от AI |
| `Coati DB Validation Script` | Проверка целостности графа ArangoDB |

---

## 🎯 План реализации (обновлённый порядок фаз)

### **Фаза 1: AI Provider Infrastructure (4-5 дней)**

#### 1.1. Глобальный селектор AI провайдера

**Frontend компоненты:**

**`frontend/src/components/organisms/AIProviderSelector.tsx`**
```typescript
interface AIProviderConfig {
  provider: 'ollama' | 'vllm' | 'openai' | 'anthropic';
  url?: string;
  apiKey?: string;
  selectedModel?: string;
}

// Состояния:
// 1. Форма выбора (развернутая)
// 2. Компактный вид (провайдер + модель)
// 3. Загрузка моделей
// 4. Ошибка подключения
```

**Функционал:**
- Dropdown выбора провайдера
- Поле URL (для Ollama/vLLM)
- Поле API Key (для OpenAI/Anthropic)
- Кнопка "Проверить подключение" → запрос списка моделей
- Dropdown выбора модели (динамический)
- Кнопка "Применить" → сохранение в Zustand store
- Компактный вид: `Ollama | llama3.2:3b [изменить]`

**Backend (n8n):**

**Новый workflow: `Coati AI Provider Manager`**
```
Webhook (/ai-provider)
  ↓
Switch by action:
  - listModels
  - testConnection
  ↓
HTTP Request (динамический URL)
  ↓
Format Response
  ↓
Respond
```

**Actions:**
1. `listModels` - получить список моделей от провайдера
2. `testConnection` - проверка доступности

**Zustand store:**

**`frontend/src/stores/aiProviderStore.ts`**
```typescript
interface AIProviderState {
  provider: string;
  url: string;
  apiKey: string;
  selectedModel: string;
  availableModels: AIModel[];
  isConnected: boolean;

  testConnection: () => Promise<boolean>;
  loadModels: () => Promise<void>;
  setProvider: (config: AIProviderConfig) => void;
}
```

---

#### 1.2. Embeddings Integration (Ollama + nomic-embed-text)

**Установка модели:**
```bash
ollama pull nomic-embed-text
```

**Backend workflow: `Coati AI Generate Embeddings`**

```
Webhook (/generate-embeddings)
  ↓
HTTP Request to Ollama
  POST http://ollama:11434/api/embeddings
  Body: {
    model: "nomic-embed-text",
    prompt: {{ $json.text }}
  }
  ↓
Extract embedding vector (768 dimensions)
  ↓
Respond with {embedding: [...]}
```

**Характеристики nomic-embed-text:**
- **Размерность:** 768
- **Контекст:** 8192 токена
- **Язык:** Multilingual (включая русский)
- **Скорость:** ~10-20ms на embedding
- **Качество:** Сравнимо с OpenAI text-embedding-ada-002

---

#### 1.3. JSON Response Protection

**Backend sub-workflow: `Coati AI Parse Response`**

```javascript
function parseAIResponse(rawText) {
  let cleaned = rawText;

  // 1. Удалить markdown обертку
  cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // 2. Удалить текст до первой {
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart > 0) cleaned = cleaned.slice(jsonStart);

  // 3. Удалить текст после последней }
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonEnd > 0) cleaned = cleaned.slice(0, jsonEnd + 1);

  // 4. Удалить JS комментарии
  cleaned = cleaned.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // 5. Попытка парсинга
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 6. Использовать json-repair
    const { jsonRepair } = require('json-repair');
    return JSON.parse(jsonRepair(cleaned));
  }
}
```

**Frontend валидация (Zod):**
```typescript
import { z } from 'zod';

const AnalysisResultSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    quote: z.string()
  })),
  issues: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional()
});
```

---

## 📋 Детальный чеклист реализации

### Фаза 1: AI Provider Infrastructure (4-5 дней) ✅ ЗАВЕРШЕНА

> **Дата выполнения:** 15-16 декабря 2025

#### Backend (n8n workflows)
- [x] Создать workflow `Coati AI Provider Manager` ✅
  - [x] Action `listModels` (Ollama) ✅
  - [x] Action `testConnection` ✅
  - [x] Action `chat` ✅
  - [x] Action `analyze` (с JSON парсером) ✅
  - [ ] Заглушки для OpenAI/Anthropic (в будущем)
- [x] Создать workflow `Coati AI Generate Embeddings` ✅
  - [x] HTTP Request to Ollama /api/embeddings ✅
  - [x] Model: nomic-embed-text ✅
  - [x] Return 768-dimensional vector ✅
- [x] JSON парсер встроен в `Coati AI Provider Manager` (analyze action)
  - [x] Smart JSON extraction ✅
  - [x] Markdown cleanup ✅
  - [x] json-repair fallback ✅
- [x] Дополнить `Coati Data API`:
  - [x] Обновлена логика CRUD routing (save* actions → CREATE) ✅
  - [x] Добавлен switch-case для `saveIteration` ✅
  - [x] Добавлен switch-case для `createSystemPrompt` ✅

#### Frontend
- [x] Создать `aiProviderStore.ts` (Zustand) ✅
  - [x] persist middleware ✅
  - [x] useShallow для предотвращения infinite loops ✅
- [x] Создать компонент `AIProviderSelector.tsx` ✅
  - [x] Форма выбора провайдера ✅
  - [x] Поля URL/API Key ✅
  - [x] Кнопка "Проверить подключение" ✅
  - [x] Dropdown моделей (динамический) ✅
  - [x] Компактный вид ✅
- [x] Обновить `api.ts` ✅
  - [x] `saveIteration()` ✅
  - [x] `getIterations()` ✅
  - [x] `getSystemPrompt()` ✅
  - [x] `updateSystemPrompt()` ✅
  - [x] `createSystemPrompt()` ✅
  - [x] `analyzeDocument()` ✅
- [x] Интегрировать AIProviderSelector в ProjectDetailsPage ✅

#### Скрипты синхронизации
- [x] Исправлен `sync-workflows.js` ✅
  - [x] Фильтрация полей при создании workflow ✅
  - [x] Добавлены алиасы `npm run sync`, `npm run backup` ✅
- [x] Все workflows синхронизированы в n8n ✅

---

### Фаза 1A: Тестирование Frontend (1 день) ✅ ЗАВЕРШЕНА

> **Цель:** Покрыть тестами существующую логику (TDD Lite)
> **Дата выполнения:** 16 декабря 2025

#### Настройка тестирования ✅
- [x] Обновить `.clinerules` с правилами TDD Lite ✅
- [x] Добавить devDependencies: `@testing-library/react`, `@vitest/ui`, `@vitest/coverage-v8`, `vitest`, `jsdom` ✅
- [x] Добавить скрипт `test:coverage` в package.json ✅
- [x] Создать структуру `__tests__/` папок ✅
- [x] Запустить `npm install` для установки зависимостей ✅

#### Unit тесты для API Client (`frontend/src/__tests__/api.test.ts`) ✅ 15 тестов
- [x] `getProjects()` - корректный endpoint + обработка ответа ✅
- [x] `analyzeDocument()` - отправка body, обработка JSON ✅
- [x] `saveIteration()` - отправка данных Q&A ✅
- [x] `getIterations()` - получение списка итераций ✅
- [x] `getSystemPrompt()`, `createSystemPrompt()` ✅
- [x] Обработка ошибок сети (timeout, 404, 500) ✅

#### Unit тесты для aiProviderStore (`frontend/src/stores/__tests__/aiProviderStore.test.ts`) ✅ 21 тест
- [x] `testConnection()` обновляет `isConnected` ✅
- [x] `loadModels()` заполняет `availableModels` ✅
- [x] `setProvider()` сохраняет конфиг ✅
- [x] `setUrl()`, `setApiKey()`, `setSelectedModel()` ✅
- [x] `applyConfig()`, `clearError()`, `reset()` ✅
- [x] Async loading states (isLoading) ✅
- [x] Error handling ✅

#### Unit тесты для projectsStore (`frontend/src/stores/__tests__/projectsStore.test.ts`) ✅ 14 тестов
- [x] `fetchProjects()` загружает список ✅
- [x] `createProject()` создает проект ✅
- [x] `selectProject()` выбирает проект ✅
- [x] `clearError()` очищает ошибку ✅
- [x] Обработка ошибок ✅
- [x] Предотвращение дублирующих запросов ✅

---

### Фаза 1B: Architecture Specification v2.1 (2-3 дня) ✅ ЗАВЕРШЕНА

> **Цель:** Создать production-ready спецификацию архитектуры с учетом всех критических блокеров
> **Дата выполнения:** 17 декабря 2025

#### ✅ Выполненная работа:

**1. Destructive Architecture Review** (`docs/progress/20251217_SPEC-2.0-AUDIT.md`)
- [x] Проведен детальный аудит спецификации v2.0 на предмет дедлоков и гонок
- [x] Выявлены критические проблемы с Pessimistic Locking (возможны race conditions)
- [x] Обнаружены риски "lock stealing", "двойного merge", orphan active атомов
- [x] Идентифицированы недостающие функции (CRUD holes, error handling, concurrency)

**2. Technical Patch v2.1** (`docs/progress/20251217_PATCH.md`)
- [x] Разработаны точечные исправления для всех критических блокеров
- [x] Добавлен Optimistic CAS (Compare-And-Swap) через `_rev`
- [x] Переработана логика merge/lock/unlock с атомарными операциями
- [x] Добавлен Validation Script для проверки целостности графа

**3. Architecture Specification v2.1** (4 раздела)
- [x] Раздел 1: Data Schema v2.1 (`20251217_architecture-v2.1-section1.md`)
  - Optimistic CAS через `_rev`
  - Single Parent Invariant
  - Запрет `docs -> atoms` связей
- [x] Раздел 2: API Contracts v2.1 (`20251217_architecture-v2.1-section2.md`)
  - If-Match headers для всех мутаций
  - Новые коды ошибок: 409 CONFLICT, 423 LOCKED
  - CAS для lock/unlock/merge/archive
- [x] Раздел 3: n8n Workflows v2.1 (`20251217_architecture-v2.1-section3.md`)
  - Все AQL-транзакции с `ignoreRevs: false`
  - Retry policy для conflicts
  - Lock timeout cron job
- [x] Раздел 4: Initial Data Seeding v2.1 (`20251217_architecture-v2.1-section4.md`)
  - Validation Checklist
  - Graph Integrity Validation Script

**Результат:** Architecture Specification v2.1 готова к реализации

---

### Фаза 1C: MCP-Arango Setup (1 день) ⏳ СЛЕДУЮЩАЯ

> **Цель:** Создать MCP-сервер для управления ArangoDB из Cline-чата
> **Приоритет:** Высокий (требуется для миграций v2.0 → v2.1)

#### MCP Server Setup
- [ ] Создать `backend/mcp-arango/` директорию
- [ ] Создать `package.json` с зависимостями:
  ```json
  {
    "name": "mcp-arango",
    "dependencies": {
      "@modelcontextprotocol/sdk": "latest",
      "arangojs": "^8.x"
    }
  }
  ```
- [ ] Создать `index.js` с MCP server
- [ ] Добавить в `.cline_mcp_settings.json`:
  ```json
  {
    "mcpServers": {
      "arango": {
        "command": "node",
        "args": ["backend/mcp-arango/index.js"],
        "env": {
          "ARANGO_URL": "http://localhost:8529",
          "ARANGO_DB": "coati_dev"
        }
      }
    }
  }
  ```

#### MCP Tools
- [ ] `arango_query(aql, bindVars)` - выполнить AQL запрос
- [ ] `arango_create_index(collection, fields, type)` - создать индекс
- [ ] `arango_list_collections()` - список коллекций
- [ ] `arango_validate_graph()` - запустить validation script
- [ ] `arango_migrate(description, aql)` - выполнить миграцию с логированием

#### Миграция v2.0 → v2.1
- [ ] Удалить `parent_doc_id` из всех `sections`:
  ```aql
  FOR s IN sections
    UPDATE s WITH {parent_doc_id: null} IN sections
    OPTIONS {keepNull: false}
  ```
- [ ] Проверить отсутствие `docs -> atoms` связей
- [ ] Добавить недостающие индексы (если нужны)
- [ ] Запустить validation script

#### Документация
- [ ] Создать `docs/mcp-arango.md` с примерами использования
- [ ] Обновить README.md с инструкцией по настройке MCP

**Использование (примеры):**
```
User: "Добавь индекс на atoms.status"
Cline → MCP-Arango → arango_create_index('atoms', ['status'])

User: "Запусти миграцию v2.1: удали parent_doc_id из sections"
Cline → MCP-Arango → arango_migrate('Remove parent_doc_id', '...')

User: "Покажи все атомы с locked_by != null"
Cline → MCP-Arango → arango_query('FOR a IN atoms FILTER a.locked_by != null RETURN a')
```

---

### Фаза 1D: Optimistic Concurrency Control (CAS) (2-3 дня) ⏳

> **Цель:** Реализовать защиту от race conditions через `_rev` и If-Match headers
> **Приоритет:** Критический (блокирует Фазу 1E)

#### Backend (n8n: `Coati Data API`)

**Обновить существующие workflows с CAS:**
- [ ] `POST /atoms/:id/lock`
  - Принимать If-Match header с `atom_rev`
  - CAS UPDATE с `ignoreRevs: false`
  - Возвращать новый `atom_rev`
  - 409 CONFLICT при revision mismatch
  - 423 LOCKED при активной блокировке
- [ ] `POST /atoms/:id/unlock`
  - Принимать If-Match header
  - Проверка владельца (`locked_by == user_id`)
  - CAS UPDATE
  - 423 LOCKED если не владелец
- [ ] `PATCH /atoms/:id/archive`
  - Принимать If-Match header
  - Проверка baseline protection
  - CAS UPDATE
  - Удаление из `structure_links`
- [ ] `POST /proposals/:id/merge`
  - Принимать If-Match header с `structure_edge_rev`
  - CAS UPDATE по edge `_rev`
  - Auto-rebase других proposals
  - Обновление статусов атомов
  - Создание revision_links

**Новые endpoints:**
- [ ] `GET /documents/:id/structure` - вернуть `atom_rev` + `structure_edge_rev`
- [ ] `GET /errors` - список AI ошибок для Debug Panel

**Retry Policy:**
- [ ] Реализовать exponential backoff для 409 conflicts
  - 1st retry: 50ms
  - 2nd retry: 150ms
  - 3rd retry: 450ms
  - Max 3 retries

**Validation Script:**
- [ ] Создать workflow `Coati DB Validation Script`
  - Поиск атомов с multiple parents
  - Проверка proposal_links корректности
  - Обнаружение illegal `docs -> atoms` edges
  - Возврат `{ok: boolean, issues: [...]}`

#### Frontend

**Обновить api.ts:**
```typescript
// Новые сигнатуры с _rev
async lockAtom(atomId: string, userId: string, expectedRev: string): Promise<{
  success: boolean;
  locked_until: string;
  atom_rev: string;
}>

async mergeProposal(proposalId: string, params: {
  target_active_atom_id: string;
  structure_edge_id: string;
  structure_edge_rev: string;
  user_id: string;
}): Promise<MergeResult>

// Retry logic
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T>

// Error classes
class RevisionConflictError extends Error {
  status = 409;
}

class ResourceLockedError extends Error {
  status = 423;
  constructor(message: string, public lockedBy: string, public lockedUntil: string) {}
}
```

**Обновить stores:**
- [ ] `projectsStore` - хранение `_rev` для каждого атома
- [ ] Автоматическое обновление `_rev` после мутаций
- [ ] Обработка 409 с UI feedback ("Data changed, please refresh")
- [ ] Обработка 423 с UI feedback ("Locked by User X until HH:MM")

**UI Components:**
- [ ] Conflict Dialog - "Document changed. Refresh?" [Refresh] [Cancel]
- [ ] Lock Indicator - "🔒 Editing by User A (3:45 remaining)"
- [ ] Toast notifications для ошибок

#### Тесты

**Unit-тесты (api.ts):**
- [ ] `lockAtom()` отправляет If-Match header
- [ ] `lockAtom()` retry на 409 (3 раза)
- [ ] `lockAtom()` НЕ retry на 423
- [ ] `mergeProposal()` использует structure_edge_rev
- [ ] `withRetry()` exponential backoff
- [ ] Error handling (409, 423)

**Integration-тесты:**
- [ ] Concurrent lock attempts (User A vs User B)
- [ ] Stale revision on merge
- [ ] Baseline protection на archive
- [ ] Lock timeout (5 минут)

**Stress-тесты (опционально для post-MVP):**
- [ ] 50 sequential merges
- [ ] 10+ concurrent users editing

#### Validation Script (npm script)
- [ ] Создать `scripts/validate-graph.js`
- [ ] Добавить в package.json:
  ```json
  {
    "scripts": {
      "db:validate": "node scripts/validate-graph.js"
    }
  }
  ```
- [ ] Pre-release checklist: запускать вручную перед релизом

**Обоснование ручного запуска (не CI/CD):**
- Скорость разработки: CI/CD integration занимает 1-2 дня
- Частота использования: На MVP релизы 1-2 раза в неделю
- Простота отладки: Ручной запуск → сразу видишь результат
- Гибкость: Можно запускать по требованию

---

### Фаза 1E: Data API v2.1 (1-2 дня) ⏳

> **Цель:** Завершить CRUD endpoints с поддержкой CAS
> **Зависимости:** Фаза 1D (CAS Implementation)

#### Backend (n8n: `Coati Data API`)

**Дополнить недостающие endpoints:**
- [ ] `GET /iterations/:projectId/:stageId` - история Q&A
- [ ] `GET /prompts/:id` - получить промпт (с _rev)
- [ ] `PATCH /prompts/:id` - обновить промпт (с If-Match)
- [ ] `DELETE /projects/:id` - удалить проект
- [ ] `DELETE /stages/:id` - удалить этап
- [ ] `DELETE /documents/:id` - удалить документ

**Все endpoints должны:**
- Поддерживать CAS (If-Match headers)
- Возвращать обновлённый `_rev`
- Обрабатывать 409/423 errors
- Использовать retry policy (где применимо)

#### Frontend

**Обновить api.ts:**
- [ ] Добавить недостающие функции с CAS-поддержкой
- [ ] Zod схемы валидации: `AnalysisResultSchema`, `AIProviderConfigSchema`

**Тесты:**
- [ ] Unit-тесты для новых endpoints
- [ ] Валидация Zod схем

---

### Фаза 2: Рефакторинг StageTimeline (2-3 дня)

> **Зависимости:** Фаза 1E (промпты с _rev)

#### Frontend
- [ ] Удалить dropdown выбора AI модели из `StageTimeline.tsx`
- [ ] Создать компонент `PromptEditor.tsx`
  - [ ] Compact view: `🤖 {name} [👁️] [✏️]`
  - [ ] Edit mode: Textarea + toolbar
  - [ ] Dropdown выбора шаблона (фильтр по типу шага)
  - [ ] Подсветка переменных `{{...}}`
  - [ ] Split Button: [Apply] + Menu
    - Apply (сохранить для шага)
    - Update Template (с CAS!)
    - Save as New
  - [ ] Кнопка "Reset"
- [ ] Dirty state tracking
- [ ] Валидация переменных
- [ ] CAS при обновлении шаблонов (If-Match: prompt._rev)

---

### Фаза 3: AI Analysis Engine (5-6 дней)

> **Зависимости:** Фаза 2 (промпты)

#### Backend (n8n)
- [ ] Создать workflow `Coati AI Build Context`
  - [ ] Query: project metadata
  - [ ] Query: existing requirements
  - [ ] Query: previous iterations
  - [ ] Optional: RAG search
  - [ ] Format context string
- [ ] Создать workflow `Coati AI Analyze Document`
  - [ ] Вызов Context Builder
  - [ ] Вызов AI Provider
  - [ ] Parse AI Response
  - [ ] Save to Iterations
- [ ] Создать workflow `Coati AI Compliance Check`
  - [ ] For each Q&A → AI call
  - [ ] Return compliance results

#### Frontend
- [ ] Обновить `QAPanel.tsx`
  - [ ] Показ Compliance Check результатов
  - [ ] Предупреждение о несоответствиях
- [ ] Добавить кнопку "Анализировать"
- [ ] Индикаторы загрузки
- [ ] Zod схемы валидации

#### Промпты
- [ ] Создать "Анализ неопределенностей"
- [ ] Создать "Compliance Check"
- [ ] Создать "Генерация требований"

---

### Фаза 4: RAG Integration (3-4 дня)

> **Зависимости:** Фаза 3 (AI workflows)

#### Подготовка
- [ ] `ollama pull nomic-embed-text`
- [ ] Проверить API: `curl http://ollama:11434/api/embeddings`

#### ArangoDB
- [ ] Создать коллекцию `user_documents` (через MCP-Arango)
- [ ] Создать индекс по `project_id`
- [ ] (Опционально) Создать ArangoSearch View

#### Backend (n8n)
- [ ] Создать workflow `Coati RAG Indexing To Arango`
  - [ ] Разбиение на чанки (500 tokens)
  - [ ] Вызов `Coati AI Generate Embeddings`
  - [ ] Batch insert в ArangoDB
- [ ] Создать workflow `Coati RAG Search`
  - [ ] Generate embedding для query
  - [ ] AQL с COSINE_SIMILARITY
  - [ ] Return top-N results
- [ ] Интегрировать в `Coati AI Build Context`

#### Frontend
- [ ] Кнопка "Загрузить документ"
- [ ] Прогресс-бар индексации
- [ ] Список документов
- [ ] Показ источников RAG

---

### Фаза 5: UI/UX & Workflow Management (2-3 дня)

#### Frontend
- [ ] Установить `react-resizable-panels`
- [ ] Создать `SplitViewEditor.tsx`
- [ ] Страница `/templates`
- [ ] Модальное окно "Настройка этапа"
- [ ] Toast уведомления
- [ ] Keyboard shortcuts

#### Backend
- [ ] `createStageTemplate`
- [ ] `updateStageTemplate`
- [ ] `deleteStageTemplate`
- [ ] `addStageFromTemplate`

---

## 📦 Итоговая структура компонентов

```
ProjectDetailsPage
├─ AIProviderSelector (глобальный выбор модели)
├─ StageTimeline (только статусы + inline PromptEditor)
├─ SplitViewEditor
│  ├─ TiptapEditor (слева)
│  │  └─ Кнопка "Анализировать"
│  └─ QAPanel (справа)
│     ├─ Вопросы
│     ├─ Поля для ответов
│     └─ Кнопка "Отправить ответы"
├─ TokenMeter (вверху)
└─ Кнопка "+ Добавить этап"
```

---

## 🔧 Технические детали

### API Endpoints (n8n webhooks) - обновлённые контракты v2.1

```
POST /webhook/ai-provider
  Actions: testConnection, listModels, setProvider

POST /webhook/generate-embeddings
  Body: {text: string}
  Response: {embedding: number[]}  // 768 dimensions

POST /webhook/atoms/:id/lock
  Headers: If-Match: <atom_rev>
  Body: {user_id: string}
  Response: {success, locked_until, atom_rev} | 409 | 423

POST /webhook/atoms/:id/unlock
  Headers: If-Match: <atom_rev>
  Body: {user_id: string}
  Response: {success, atom_rev} | 409 | 423

POST /webhook/proposals/:id/merge
  Headers: If-Match: <structure_edge_rev>
  Body: {target_active_atom_id, structure_edge_id, user_id}
  Response: {success, new_active_atom_id, structure_edge_rev, rebased_proposals} | 409 | 423

PATCH /webhook/atoms/:id/archive
  Headers: If-Match: <atom_rev>
  Body: {reason: string}
  Response: {success, archived_at, atom_rev} | 409 | 423

POST /webhook/analyze-document
  Body: {projectId, stageId, content}
  Response: AnalysisResult

POST /webhook/submit-answers
  Body: {projectId, stageId, iterationId, answers}
  Response: {success, complianceResults, requirements}

POST /webhook/rag-index
  Body: {projectId, documentId, content}
  Response: {chunksCount, indexed}

POST /webhook/rag-search
  Body: {projectId?, query, limit}
  Response: {results: [{text, score, source}]}

GET /webhook/documents/:id/structure
  Query: baseline_id?
  Response: {doc_meta, items: [{id, type, atom_rev?, structure_edge_rev?, ...}]}

GET /webhook/errors
  Query: error_code?, from_date?, limit?
  Response: {errors: [...], total, has_more}
```

### NPM Dependencies

**Frontend:**
```bash
npm install zod react-resizable-panels react-hot-toast
```

**Backend (n8n):**
```bash
npm install json-repair
```

**MCP-Arango:**
```bash
npm install @modelcontextprotocol/sdk arangojs
```

---

## ⏱️ Оценка времени (обновлённая)

| Фаза | Дни | Статус |
|------|-----|--------|
| Фаза 1: AI Provider Infrastructure | 4-5 | ✅ Завершена (15-16 дек) |
| Фаза 1A: Тестирование Frontend | 1 | ✅ Завершена (16 дек) |
| Фаза 1B: Architecture Spec v2.1 | 2-3 | ✅ Завершена (17 дек) |
| **Фаза 1C: MCP-Arango Setup** | **1** | ⏳ **Следующая** |
| **Фаза 1D: CAS Implementation** | **2-3** | ⏳ |
| **Фаза 1E: Data API v2.1** | **1-2** | ⏳ |
| Фаза 2: Рефакторинг StageTimeline | 2-3 | ⏳ |
| Фаза 3: AI Analysis Engine | 5-6 | ⏳ |
| Фаза 4: RAG Integration | 3-4 | ⏳ |
| Фаза 5: UI/UX & Workflow Management | 2-3 | ⏳ |
| **ИТОГО** | **26-34** | **+4 дня от v2.0** |

**Изменения от предыдущей версии:**
- Добавлена Фаза 1C: MCP-Arango (+1 день)
- Добавлена Фаза 1D: CAS Implementation (+2-3 дня)
- Переименована старая 1C → 1E

---

## 🚨 Риски и митигация

| Риск | Митигация |
|------|-----------|
| Качество AI ответов (кривой JSON) | Трехуровневая защита: API format, промпт, smart parser |
| Race conditions при concurrent edits | CAS через `_rev` + retry policy + unit/integration тесты |
| Производительность RAG | Тестирование на ~1000 документов, оптимизация индексов |
| UX сложность PromptEditor | User testing, итеративное улучшение |
| Интеграция с разными AI провайдерами | Единый интерфейс адаптера, начинаем с Ollama |
| Миграция данных v2.0 → v2.1 | MCP-Arango для безопасных миграций из Cline |

---

## ✅ Критерии успеха MVP

### Функциональность:
1. ✅ Пользователь может выбрать AI провайдера (Ollama/vLLM)
2. ✅ Пользователь вводит бриф → получает структурированные вопросы
3. ✅ Пользователь отвечает на вопросы → проходит Compliance Check
4. ✅ Система генерирует требования на основе ответов
5. ✅ Split View работает корректно (редактор + вопросы)
6. ✅ Можно добавлять/удалять этапы из шаблонов
7. ✅ Можно редактировать системные промпты inline
8. ✅ RAG находит похожие документы и добавляет в контекст
9. ✅ TokenMeter показывает корректное использование токенов

### Надёжность (v2.1):
10. ✅ Concurrent edits не приводят к race conditions (CAS protection)
11. ✅ Merge не создаёт orphan active атомы (atomic transactions)
12. ✅ Lock stealing невозможен (CAS + owner check)
13. ✅ Граф остаётся консистентным (validation script)
14. ✅ UI показывает conflicts/locks понятно (409/423 handling)

---

## 📝 Следующие шаги

**Текущая фаза: 1C - MCP-Arango Setup**

1. ✅ Финализация спецификации архитектуры v2.1 (Фаза 1B завершена)
2. 📍 Создать MCP-сервер для ArangoDB (Фаза 1C - следующая)
3. Реализовать Optimistic Concurrency Control (Фаза 1D)
4. Завершить Data API с CAS-поддержкой (Фаза 1E)
5. После завершения Фазы 1E → переход к Фазе 2 (Рефакторинг StageTimeline)

---

## 📚 Связанная документация

**Architecture Specification v2.1:**
- `docs/progress/20251217_architecture-v2.1-section1.md` - Data Schema
- `docs/progress/20251217_architecture-v2.1-section2.md` - API Contracts
- `docs/progress/20251217_architecture-v2.1-section3.md` - n8n Workflows
- `docs/progress/20251217_architecture-v2.1-section4.md` - Initial Data Seeding

**Review & Audit:**
- `docs/progress/20251217_architecture-v2-FINAL.md` - Spec v2.0 (superseded)
- `docs/progress/20251217_SPEC-2.0-AUDIT.md` - Destructive Review
- `docs/progress/20251217_PATCH.md` - Technical Patch v2.1

---

**Боже в помощь мою вонми, Господи помощи ми потщися** 🙏
