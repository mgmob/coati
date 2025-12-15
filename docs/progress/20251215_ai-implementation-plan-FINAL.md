# План реализации AI Engine для Coati (ФИНАЛЬНАЯ ВЕРСИЯ)

> **Статус:** Утвержден
> **Дата:** 15 декабря 2025
> **Версия:** 2.0 (с учетом всех уточнений)

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

---

## 🎯 План реализации (5 фаз)

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

#### 1.4. Дополнить Coati Data API

**CREATE (добавить):**
```javascript
- saveIteration(projectId, stageId, {questions, answers, aiResponse})
- uploadDocument(projectId, file, metadata)
- createRequirement(projectId, content, source)
- createSystemPrompt(name, body, category)
```

**READ (добавить):**
```javascript
- getIterations(projectId, stageId) // История вопросов-ответов
- getDocument(documentId)
- listDocuments(projectId)
- getRequirements(projectId)
- getSystemPrompt(id) // Полный текст промпта
```

**UPDATE (добавить):**
```javascript
- updateStage(stageId, {status, current_step_index})
- updateProject(projectId, {name, description, stage})
- updateRequirement(requirementId, content)
- updateSystemPrompt(id, body)
- updateStepPrompt(stageId, stepId, customPrompt)
```

**DELETE (добавить):**
```javascript
- deleteProject(projectId)
- deleteStage(stageId)
- deleteDocument(documentId)
- deleteRequirement(requirementId)
```

---

### **Фаза 2: Рефакторинг StageTimeline (2-3 дня)**

#### 2.1. Проблема текущей реализации

В `StageTimeline.tsx` есть два dropdown:
- ❌ Выбор AI модели — **нужно убрать** (модель выбирается глобально)
- ✅ Выбор системного промпта — **оставить и улучшить**

#### 2.2. Новый UX для работы с промптами (Progressive Disclosure)

**Состояние 1: Compact View (по умолчанию)**
```
[Step 1: Анализ требований]
  🤖 Senior Business Analyst  [👁️ View] [✏️ Edit]
  (badge "Modified" если промпт был изменен)
```

**Состояние 2: Edit Mode (Accordion/Collapsible)**
```
[Step 1: Анализ требований]
  ┌─────────────────────────────────────────┐
  │ Template: [Senior Business Analyst ▼]   │
  │           (фильтр по типу шага)          │
  │                                          │
  │ You are an experienced BA...            │
  │ Focus on edge cases and missing reqs... │
  │ {{ context }}  {{ text }}               │  ← Variables подсвечены
  │                                          │
  │ [↩️ Reset] [Save Actions ▼] [Apply]     │
  └─────────────────────────────────────────┘
```

**Save Actions Dropdown:**
1. **Apply** — сохранить только для этого шага (основная кнопка)
2. **Update Template "{name}"** — перезаписать глобальный шаблон (с подтверждением)
3. **Save as New...** — создать новый шаблон (запрос имени)

#### 2.3. Компонент PromptEditor

**`frontend/src/components/organisms/PromptEditor.tsx`**
```typescript
interface PromptEditorProps {
  step: StageStep;
  availablePrompts: SystemPrompt[];  // Фильтрованные по типу шага
  onApply: (stepId: string, promptText: string) => void;
  onUpdateTemplate: (promptId: string, body: string) => Promise<void>;
  onCreateTemplate: (name: string, body: string, category: string) => Promise<void>;
}

// Состояния:
// - isExpanded: boolean
// - editedText: string
// - isDirty: boolean
// - selectedTemplateId: string | null
// - isCustom: boolean (флаг "Modified")
```

#### 2.4. Функционал редактора промптов

1. **Подсветка переменных:** `{{context}}`, `{{text}}`, `{{previous_result}}` — как badges
2. **Валидация:** Проверка наличия обязательных переменных
3. **Dirty State:** Предупреждение при закрытии без сохранения
4. **Diff View (опционально):** Показать "Было/Стало" перед обновлением шаблона

---

### **Фаза 3: AI Analysis Engine (5-6 дней)**

#### 3.1. Context Builder

**Backend workflow: `Coati AI Build Context`**

```
Input: {projectId, stageId, stepType}
  ↓
Parallel queries to ArangoDB:
  1. Get project metadata
  2. Get completed stages
  3. Get previous iterations
  4. Get requirements from graph
  5. RAG search (if enabled)
  ↓
Merge & format context:
  """
  # Проект: {{ projectName }}

  ## История изменений:
  {{ iterations }}

  ## Существующие требования:
  {{ requirements }}

  ## Похожие документы (RAG):
  {{ ragResults }}
  """
  ↓
Return formatted context string
```

#### 3.2. Базовый AI анализ

**Backend workflow: `Coati AI Analyze Document`**

```
Webhook (/analyze-document)
  ↓
Call "Coati AI Build Context"
  ↓
Get System Prompt from ArangoDB
  ↓
Call AI Provider (from config)
  System Prompt: {{ systemPrompt }}
  User Prompt: {{ context + brief }}
  ↓
Call "Coati AI Parse Response"
  ↓
Validate JSON structure
  ↓
Save to Iterations collection
  ↓
Respond with AnalysisResult
```

**Системный промпт "Анализ неопределенностей":**
```
Ты опытный бизнес-аналитик. Твоя задача - проанализировать техническое задание и задать уточняющие вопросы.

ПРАВИЛА:
1. Найди неопределенности, противоречия, неполные требования
2. Для КАЖДОГО вопроса укажи:
   - id: уникальный идентификатор
   - question: сам вопрос (конкретный и короткий)
   - quote: цитата из текста, к которой относится вопрос
3. Верни JSON в формате:
{
  "questions": [{id, question, quote}],
  "issues": ["проблема 1", ...],
  "suggestions": ["рекомендация 1", ...]
}

IMPORTANT: You must output ONLY valid JSON.
Do not include markdown formatting like ```json.
Do not include any intro or outro text.

НЕ придумывай информацию. Задавай вопросы только о реально найденных неопределенностях.
```

#### 3.3. Compliance Check

**Backend workflow: `Coati AI Compliance Check`**

```
Input: {iterationId, originalBrief}
  ↓
For each Q&A pair:
  ↓
  Call AI with prompt:
    "Исходный текст: {{ brief }}"
    "Вопрос: {{ question }}"
    "Ответ пользователя: {{ answer }}"
    "ЗАДАЧА: Проверь, согласуется ли ответ с исходным текстом.
     Верни JSON: {compliant: boolean, reason: string}"
  ↓
  Parse result
  ↓
Aggregate results:
  {
    allCompliant: boolean,
    results: [{questionId, compliant, reason}]
  }
  ↓
Update Iteration with compliance status
  ↓
Respond
```

---

### **Фаза 4: RAG Integration (3-4 дня)**

#### 4.1. Архитектура RAG

**Важно:** Создаем НОВЫЕ workflows для пользовательских документов, старые оставляем для кодовой базы!

| Workflow | Коллекция | Назначение |
|----------|-----------|------------|
| `RAG: Indexing To Arango` | `docs` | Кодовая база (для разработчиков) |
| `RAG: Search` | `docs` | Поиск по кодовой базе |
| `Coati RAG Indexing To Arango` | `user_documents` | Пользовательские документы |
| `Coati RAG Search` | `user_documents` | Поиск в пользовательских документах |

#### 4.2. Коллекция user_documents

**ArangoDB Schema:**
```javascript
{
  "_key": "auto-generated",
  "project_id": "project123",
  "document_id": "doc456",
  "chunk_index": 0,
  "text": "Система должна поддерживать...",
  "embedding": [0.123, -0.456, ...],  // 768 elements (nomic-embed-text)
  "metadata": {
    "source": "brief_v2.txt",
    "uploadedAt": 1702857600000,
    "page": 1
  }
}
```

**Индексы:**
```javascript
// Для фильтрации по проекту
db.user_documents.ensureIndex({
  type: "persistent",
  fields: ["project_id"]
});
```

#### 4.3. Workflow Coati RAG Indexing To Arango

```
Webhook (/rag-index)
  ↓
Split document into chunks (500 tokens)
  ↓
For each chunk:
  Call "Coati AI Generate Embeddings"
  ↓
  Insert into ArangoDB:
    Collection: user_documents
    Document: {project_id, document_id, chunk_index, text, embedding, metadata}
  ↓
Return: {indexed: chunkCount, documentId}
```

#### 4.4. Workflow Coati RAG Search

```
Webhook (/rag-search)
  Input: {query, projectId?, limit: 5}
  ↓
Call "Coati AI Generate Embeddings" for query
  ↓
ArangoDB AQL Query:
  FOR doc IN user_documents
    FILTER @projectId ? doc.project_id == @projectId : true
    LET score = COSINE_SIMILARITY(doc.embedding, @queryVector)
    FILTER score > 0.6
    SORT score DESC
    LIMIT @limit
    RETURN {
      text: doc.text,
      score: score,
      source: doc.metadata.source,
      documentId: doc.document_id
    }
  ↓
Respond: {results: [...]}
```

---

### **Фаза 5: UI/UX & Workflow Management (2-3 дня)**

#### 5.1. Split View Component

**Библиотека:** `react-resizable-panels`

```bash
npm install react-resizable-panels
```

**Компонент `SplitViewEditor.tsx`:**
```typescript
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

<PanelGroup direction="horizontal">
  <Panel defaultSize={60} minSize={30}>
    <TiptapEditor content={brief} onChange={setBrief} />
  </Panel>

  <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-500" />

  <Panel defaultSize={40} minSize={25}>
    <QAPanel analysisData={analysis} onSubmitAnswers={handleAnswers} />
  </Panel>
</PanelGroup>
```

**Функционал:**
- Изменяемый размер панелей
- Минимальная ширина каждой панели
- Сохранение размеров в localStorage
- Кнопка "Развернуть" для полноэкранного редактора

#### 5.2. Workflow Management UI

**A) Управление этапами**
- Кнопка "+ Добавить этап" → модальное окно
- Выбор шаблона этапа из `StageTemplates`
- После выбора → создание этапа с шагами из шаблона
- Кнопка "Удалить этап" (с подтверждением)

**B) Управление шагами**
- Модальное окно "Настройка этапа"
- Список шагов (drag & drop)
- Добавление/удаление шагов
- Сохранение изменений

**C) Страница /templates**
- Список существующих шаблонов
- Редактор шаблона с шагами
- Создание новых шаблонов

#### 5.3. UX Improvements

- Toast уведомления (react-hot-toast)
- Индикаторы загрузки
- Keyboard shortcuts (Ctrl+Enter для отправки)
- Error boundaries
- Responsive design

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
  - [ ] `getIterations` (READ) - требуется node
  - [ ] `getSystemPrompt` (READ) - требуется node
  - [ ] `updateSystemPrompt` (UPDATE) - требуется node
  - [ ] `deleteProject`, `deleteStage` (DELETE) - требуется node

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
- [ ] Установить и настроить Zod (отложено)

#### Скрипты синхронизации
- [x] Исправлен `sync-workflows.js` ✅
  - [x] Фильтрация полей при создании workflow ✅
  - [x] Добавлены алиасы `npm run sync`, `npm run backup` ✅
- [x] Все workflows синхронизированы в n8n ✅

---

### Фаза 2: Рефакторинг StageTimeline (2-3 дня)

#### Frontend
- [ ] Удалить dropdown выбора AI модели из `StageTimeline.tsx`
- [ ] Создать компонент `PromptEditor.tsx`
  - [ ] Compact view: `🤖 {name} [👁️] [✏️]`
  - [ ] Edit mode: Textarea + toolbar
  - [ ] Dropdown выбора шаблона (фильтр по типу шага)
  - [ ] Подсветка переменных `{{...}}`
  - [ ] Split Button: [Apply] + Menu
  - [ ] Кнопка "Reset"
- [ ] Dirty state tracking
- [ ] Валидация переменных

---

### Фаза 3: AI Analysis Engine (5-6 дней)

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

#### Подготовка
- [ ] `ollama pull nomic-embed-text`
- [ ] Проверить API: `curl http://ollama:11434/api/embeddings`

#### ArangoDB
- [ ] Создать коллекцию `user_documents`
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

## 🔧 Технические детали

### API Endpoints (n8n webhooks)

```
POST /webhook/ai-provider
  Actions: testConnection, listModels, setProvider

POST /webhook/generate-embeddings
  Body: {text: string}
  Response: {embedding: number[]}  // 768 dimensions

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

---

## ⏱️ Оценка времени

| Фаза | Дни |
|------|-----|
| Фаза 1: AI Provider Infrastructure | 4-5 |
| Фаза 2: Рефакторинг StageTimeline | 2-3 |
| Фаза 3: AI Analysis Engine | 5-6 |
| Фаза 4: RAG Integration | 3-4 |
| Фаза 5: UI/UX & Workflow Management | 2-3 |
| **ИТОГО** | **16-21** |

---

## 🚨 Риски и митигация

| Риск | Митигация |
|------|-----------|
| Качество AI ответов (кривой JSON) | Трехуровневая защита: API format, промпт, smart parser |
| Производительность RAG | Тестирование на ~1000 документов, оптимизация индексов |
| UX сложность PromptEditor | User testing, итеративное улучшение |
| Интеграция с разными AI провайдерами | Единый интерфейс адаптера, начинаем с Ollama |

---

## ✅ Критерии успеха MVP

1. ✅ Пользователь может выбрать AI провайдера (Ollama/vLLM)
2. ✅ Пользователь вводит бриф → получает структурированные вопросы
3. ✅ Пользователь отвечает на вопросы → проходит Compliance Check
4. ✅ Система генерирует требования на основе ответов
5. ✅ Split View работает корректно (редактор + вопросы)
6. ✅ Можно добавлять/удалять этапы из шаблонов
7. ✅ Можно редактировать системные промпты inline
8. ✅ RAG находит похожие документы и добавляет в контекст
9. ✅ TokenMeter показывает корректное использование токенов

---

## 📝 Следующие шаги

**Реализация начинается с Фазы 1:**
1. Создать `Coati AI Provider Manager` workflow
2. Создать `Coati AI Generate Embeddings` workflow
3. Создать `Coati AI Parse Response` sub-workflow
4. Дополнить `Coati Data API`
5. Создать frontend компоненты

---

**Боже в помощь мою вонми, Господи помощи ми потщися** 🙏
