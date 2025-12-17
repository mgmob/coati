# Requirements Traceability & Analysis System - Architecture Specification v2.0

**Дата:** 2025-12-17
**Статус:** Production-Ready (после аудита и стратегических решений)
**Изменения от v1:** Исправлены критические блокеры, добавлена обработка concurrency и ошибок AI

---

## Принятые стратегические решения

В результате Destructive Architecture Review были приняты следующие решения:

- **Concurrency:** Pessimistic Locking (блокировка атомов при редактировании)
- **Deletion:** Hard Block - только архивирование, полная иммутабельность
- **Orphaned Proposals:** Auto-Rebase с флагом `outdated`
- **AI Errors:** Explicit Error Artifacts с UI для просмотра и копирования
- **Edge Naming:** Переименование `generated_by` → `created_with`
- **Denormalization:** Удаление `parent_doc_id` - граф как единственный источник истины
- **Indexes:** Добавлены `atoms.status` и `proposal_links._to`

---

# Раздел 1. Архитектура данных ArangoDB (Data Schema v2)

## 1. Концепция
Используется гибридный подход: **Document Store** для хранения контента и **Graph** для хранения структуры, истории версий и трассировки требований.

**Ключевые принципы:**
- **Immutability (Неизменяемость):** Контент атомов (текст требований) никогда не обновляется (`UPDATE`). При правках создается новый документ.
- **Single Source of Truth:** Граф - единственный источник истины о структуре. Никакой денормализации.
- **Pessimistic Locking:** Атомы блокируются при редактировании для предотвращения race conditions.
- **No Hard Delete:** Удаление запрещено. Только архивирование через смену статуса.
- **Naming Convention:** Snake_case для полей JSON.

---

## 2. Коллекции вершин (Document Collections)

### 2.1. `docs` (Метаданные документа)
Корневой узел проекта/документа.

```json
{
  "_key": "doc_uuid_1",
  "title": "ТЗ на Мобильное приложение",
  "status": "draft", // draft, review, approved
  "created_at": "2023-10-27T10:00:00Z",
  "updated_at": "2023-10-27T12:00:00Z",
  "owner_id": "user_123"
}
```

### 2.2. `sections` (Структура оглавления)
Узлы, формирующие иерархию (главы, подглавы). Не содержат текста требований.

```json
{
  "_key": "sec_uuid_2",
  "title": "3. Аутентификация",
  "level": 1, // Уровень вложенности (1 = H1, 2 = H2)
  // УДАЛЕНО: parent_doc_id (v2 - граф как единственный источник истины)
  "created_at": "2023-10-27T10:00:00Z"
}
```

**⚠️ BREAKING CHANGE от v1:** Удалено поле `parent_doc_id`. Связь определяется только через `structure_links`.

### 2.3. `atoms` (Атомарные требования)
Главная сущность. Хранит **неизменяемую версию** конкретного абзаца/требования.

```json
{
  "_key": "atom_uuid_v1",
  "content": "Пользователь входит по номеру телефона.",
  "content_hash": "a1b2c3...", // Для дедупликации (опционально)
  "author": "analyst_ai",
  "status": "active", // Варианты: 'active' (в документе), 'proposal' (предложение), 'archived' (история), 'rejected' (отклонено)
  "created_at": "2023-10-27T10:05:00Z",

  // v2: Pessimistic Locking Fields (Решение 1A)
  "locked_by": null, // user_id или null
  "locked_until": null, // ISO timestamp или null

  // v2: Deprecated flag (больше не используется, т.к. истина определяется связями)
  // "is_current": false
}
```

**🔒 Locking Logic:**
- При открытии атома для редактирования UI вызывает `POST /atoms/:id/lock`.
- Поле `locked_until` устанавливается на `current_time + 5 минут`.
- Другие пользователи видят "🔒 Редактируется User A, освободится через 3:45".
- Таймаут автоматически освобождает блокировку.

### 2.4. `artifacts` (Результаты AI-анализа и взаимодействия)
Любые объекты, порожденные анализом или обсуждением.

```json
{
  "_key": "art_uuid_5",
  "type": "issue", // issue, question, answer, summary, ai_error (v2)
  "content": "Не указан формат валидации телефона.",
  "severity": "critical", // только для type=issue
  "source_model": "qwen-coder-32b",
  "status": "open", // open, resolved, ignored
  "created_at": "2023-10-27T10:06:00Z",

  // v2: Error Handling Fields (Решение 4B - только для type=ai_error)
  "error_code": "TIMEOUT", // TIMEOUT, INVALID_JSON, MODEL_ERROR, NETWORK_ERROR
  "error_message": "Model did not respond within 60 seconds",
  "error_details": {
    "prompt_id": "prompts/p_ba_v1",
    "model": "qwen2.5-coder:32b",
    "temperature": 0.1,
    "timeout_seconds": 60,
    "request_id": "req_xyz_123" // Для корреляции с n8n логами
  }
}
```

**📋 UI Requirement для `ai_error`:**
- В UI показывать "⚠️ AI Analysis failed: TIMEOUT (60s)"
- Кнопка "View Details" открывает модалку с `error_details` (JSON formatted)
- Текст `error_details` должен быть **выделяемым** (selectable) для копирования Ctrl+C
- Фильтр "Show only errors" в Debug Panel

---

## 3. Коллекции ребер (Edge Collections)

### 3.1. `structure_links` (Скелет документа)
Определяет, **что** входит в документ и в **каком порядке**.

- **Откуда (`_from`):** `docs/*`, `sections/*`
- **Куда (`_to`):** `sections/*`, `atoms/*`

```json
{
  "_from": "sections/sec_uuid_2",
  "_to": "atoms/atom_uuid_v1",
  "order": 10.0, // Float для вставок между элементами без пересчета
  "type": "contains"
}
```

**💡 Best Practice:** Используйте шаг 10.0 между элементами (10, 20, 30...). При вставке между 10 и 20 используйте 15.0.

### 3.2. `semantic_links` (Смысловые связи / Traceability)
Связывает требования с проблемами, вопросы с ответами.

- **Откуда (`_from`):** `artifacts/*`, `atoms/*`
- **Куда (`_to`):** `atoms/*`, `artifacts/*`

```json
{
  "_from": "artifacts/art_uuid_5", // Issue (баг)
  "_to": "atoms/atom_uuid_v1",     // Requirement (требование)
  "type": "detected_in",           // detected_in, resolves, relates_to, justifies
  "confidence": 0.95               // Уверенность модели (если связь создана AI)
}
```

**Типы связей:**
- `Issue` → `detected_in` → `Atom`
- `Question` → `relates_to` → `Issue`
- `Answer` → `resolves` → `Question`
- `Atom (v2)` → `justified_by` → `Answer`
- `ai_error` → `failed_for` → `Atom` (v2)

### 3.3. `revision_links` (История изменений)
Связывает версии одного и того же логического блока.

- **Откуда (`_from`):** `atoms/*` (Новая версия)
- **Куда (`_to`):** `atoms/*` (Старая версия)

```json
{
  "_from": "atoms/atom_uuid_v2",
  "_to": "atoms/atom_uuid_v1",
  "type": "replaces",
  "created_at": "2023-10-28T10:00:00Z",
  "diff_summary": "Добавлена маска ввода +7" // Можно генерировать AI
}
```

### 3.4. `proposal_links` (Предполагаемые изменения)
Связывает предложения с атомами, которые они хотят заменить.

- **Откуда (`_from`):** `atoms/*` (Кандидат со статусом `proposal`)
- **Куда (`_to`):** `atoms/*` (Текущий атом со статусом `active`)

```json
{
  "_from": "atoms/atom_draft_xyz",
  "_to": "atoms/atom_current_v1",
  "type": "alternative", // "alternative" (вариант правки), "addition" (вставка нового)
  "ai_comment": "Это изменение повысит безопасность (Score: 0.9)",

  // v2: Auto-Rebase Flag (Решение 3B)
  "outdated": false, // true, если target атом был заменен после создания этого proposal
  "rebased_from": null, // ID атома, к которому изначально относилось предложение
  "rebased_at": null // Timestamp ребейза
}
```

**🔄 Auto-Rebase Logic (v2):**
При Merge атома A→B все proposals, указывающие на A, автоматически ребазируются на B:
- `_to` меняется с A на B
- `outdated: true`
- `rebased_from: "atoms/A"`

---

## 4. Коллекции для управления конфигурацией (System Collections)

### 4.1. `prompts` (Промпты как код)
Хранит шаблоны инструкций для ИИ.

```json
{
  "_key": "p_ba_v3",
  "role_key": "business_analyst", // Уникальный ключ роли для поиска
  "name": "Business Analyst Audit",
  "version": 3,
  "active": true, // Только один промпт с данным role_key может быть active
  "template": "Analyze this text: {{content}}. Output JSON...",
  "model_config": {
    "temperature": 0.1,
    "model": "qwen2.5-coder",
    "response_format": { "type": "json_object" }
  },
  "created_at": "2023-12-15T10:00:00Z"
}
```

**⚠️ CONSTRAINT:** Должен быть уникальный индекс на `(role_key, active)` где `active = true`. Нельзя активировать два промпта с одним role_key одновременно.

### 4.2. `baselines` (Зафиксированные версии документов)
Узлы, представляющие собой "снимок" состояния.

```json
{
  "_key": "base_rel_1",
  "doc_id": "docs/doc_1",
  "tag": "v1.0", // Git-like тег
  "title": "Release 1.0 (MVP)",
  "frozen_at": "2023-12-17T12:00:00Z"
}
```

---

## 5. Ребра для конфигурации

### 5.1. `baseline_items` (Состав релиза)
Связывает Baseline с конкретными версиями атомов, актуальными в момент создания снимка.

- **_from:** `baselines/*`
- **_to:** `atoms/*` (Именно конкретная версия, даже если позже вышла новая!)

```json
{
  "_from": "baselines/base_rel_1",
  "_to": "atoms/atom_uuid_v5",
  "order": 10.0, // Копируется из structure_links в момент создания
  "type": "snapshot_item"
}
```

**🔒 CRITICAL RULE:** Атомы, включенные в baseline_items, **ЗАПРЕЩЕНО физически удалять** из БД. Можно менять только статус.

### 5.2. `created_with` (Трассировка промптов)
Связывает результат работы ИИ с версией промпта.

- **_from:** `artifacts/*`
- **_to:** `prompts/*`

```json
{
  "_from": "artifacts/issue_77",
  "_to": "prompts/p_ba_v3",
  "type": "created_with",
  "created_at": "2023-12-17T10:00:00Z"
}
```

**⚠️ BREAKING CHANGE от v1:** Переименовано с `generated_by` на `created_with` для семантической ясности (Решение 5A).

**Зачем:** Если промпт v3 оказался ошибочным, легко найти все артефакты, созданные им:
```aql
FOR artifact IN OUTBOUND "prompts/p_ba_v3" created_with
  RETURN artifact
```

---

## 6. Индексы (Для производительности)

Для ArangoDB создайте следующие Persistent Indexes:

1. **`structure_links`**: Индекс по `_from` + `order` (для быстрой сборки документа в правильном порядке).
   ```js
   db.structure_links.ensureIndex({ type: "persistent", fields: ["_from", "order"] });
   ```

2. **`artifacts`**: Индекс по `status` (для выборки "Покажи все нерешенные вопросы").
   ```js
   db.artifacts.ensureIndex({ type: "persistent", fields: ["status"] });
   ```

3. **`atoms`**: Fulltext Index по полю `content` (для RAG и поиска похожих требований).
   ```js
   db.atoms.ensureIndex({ type: "fulltext", fields: ["content"], minLength: 3 });
   ```

4. **`atoms`**: Индекс по `status` (для быстрой фильтрации active/archived/proposal) - **v2 Added**.
   ```js
   db.atoms.ensureIndex({ type: "persistent", fields: ["status"] });
   ```

5. **`proposal_links`**: Индекс по `_to` (для быстрого поиска всех предложений к атому) - **v2 Added**.
   ```js
   db.proposal_links.ensureIndex({ type: "persistent", fields: ["_to"] });
   ```

6. **`prompts`**: Уникальный индекс на `(role_key, active)` для предотвращения дубликатов активных промптов.
   ```js
   db.prompts.ensureIndex({
     type: "persistent",
     fields: ["role_key", "active"],
     unique: true,
     sparse: true // Только для active = true
   });
   ```

7. **`atoms`**: Индекс по `locked_by` для админских запросов "Показать все заблокированные атомы" - **v2 Added**.
   ```js
   db.atoms.ensureIndex({ type: "persistent", fields: ["locked_by"], sparse: true });
   ```

---

## 7. Правила целостности данных (Data Integrity Rules)

### 7.1. Запрет удаления (No Hard Delete)
- Атомы **НЕЛЬЗЯ физически удалять** из БД (решение 2A).
- Для "удаления" используйте `status: "archived"`.
- Физическое удаление разрешено только через админский скрипт для очистки тестовых данных.

### 7.2. Защита Baselines
- Атомы, связанные с `baselines` через `baseline_items`, **ЗАПРЕЩЕНО удалять**.
- При попытке архивирования такого атома показывать предупреждение: "Этот атом включен в 2 релиза (v1.0, v1.1). Архивировать всё равно?"

### 7.3. Locking Timeout
- Блокировка атома автоматически снимается через 5 минут.
- n8n должен запускать cron-задачу каждую минуту:
  ```aql
  FOR atom IN atoms
    FILTER atom.locked_until != null AND atom.locked_until < DATE_NOW()
    UPDATE atom WITH { locked_by: null, locked_until: null } IN atoms
  ```

### 7.4. Уникальность активных промптов
- Только один промпт с данным `role_key` может иметь `active: true`.
- При активации нового промпта автоматически деактивировать старый.

---

**Конец Раздела 1** ✅

---

# Раздел 2. API Контракты и Взаимодействие (Frontend ↔ Backend v2)

В роли Backend выступает **n8n**, который оркестрирует запросы в ArangoDB и Ollama.

## 2.1. Общие принципы
- **Протокол:** REST over HTTP.
- **Формат:** JSON.
- **Даты:** ISO 8601 UTC.
- **Error Handling:** HTTP 4xx/5xx + Body `{ "error": "code", "message": "human readable" }`.
- **Базовый URL:** `http://localhost:5678/webhook/coati/` (для n8n webhooks).

---

## 2.2. Чтение данных (Query API)

### 2.2.1. Получение структуры документа (Main View)
Основной запрос для отрисовки редактора. Поддерживает два режима: "Черновик" (Draft) и "Архивная версия" (Baseline).

**Endpoint:** `GET /documents/:doc_id/structure`

**Query Params:**
- `baseline_id` (optional): Если передан, возвращает замороженную структуру этого релиза. Если нет — возвращает текущий Draft.

**Response:**
```json
{
  "doc_meta": {
    "id": "doc_uuid_1",
    "title": "ТЗ на Корзину",
    "view_mode": "draft", // или "read_only_baseline"
    "active_baseline": null // или { "id": "base_rel_1", "tag": "v1.0" }
  },
  // Плоский список для виртуализации (Sections + Atoms), отсортированный по 'order'
  "items": [
    {
      "id": "sec_uuid_1",
      "type": "section",
      "level": 1,
      "content": "1. Введение",
      "order": 1.0
    },
    {
      "id": "atom_uuid_v5",
      "type": "atom",
      "status": "active",
      "content": "Система должна отправлять SMS...",
      "order": 1.1,
      // v2: Locking Info
      "locked_by": null, // или "user_123"
      "locked_until": null, // или "2023-12-17T15:30:00Z"
      // Флаги для UI
      "has_open_issues": true,
      "pending_proposals_count": 2
    },
    {
      "id": "sec_uuid_2",
      "type": "section",
      "level": 1,
      "content": "2. Безопасность",
      "order": 2.0
    }
  ]
}
```

### 2.2.2. Список версий документа (Version Selector)
Для выпадающего списка "История версий" в шапке сайта.

**Endpoint:** `GET /documents/:doc_id/baselines`

**Response:**
```json
[
  {
    "id": "base_rel_2",
    "tag": "v1.1",
    "title": "Release with fixes",
    "frozen_at": "2023-12-20T14:00:00Z",
    "items_count": 45
  },
  {
    "id": "base_rel_1",
    "tag": "v1.0",
    "title": "MVP Release",
    "frozen_at": "2023-12-10T09:00:00Z",
    "items_count": 40
  }
]
```

### 2.2.3. Контекст Атома (Inspector / Sidebar)
Загружает детали по клику на конкретный абзац. Показывает предложения, баги и *каким промптом* они были найдены.

**Endpoint:** `GET /atoms/:atom_id/context`

**Response:**
```json
{
  "atom_id": "atom_uuid_v5",
  "content": "Система должна отправлять SMS...",
  "status": "active",
  "locked_by": null,
  "locked_until": null,

  // 1. Предложения (Proposals) - альтернативные ветки будущего
  "proposals": [
    {
      "id": "atom_draft_x",
      "author": "AI (Qwen)",
      "created_at": "2023-12-21T10:00:00Z",
      "content": "Система должна отправлять OTP-код через SMS-шлюз.",
      "ai_comment": "Уточнил терминологию (OTP вместо просто SMS).",
      "generated_by_prompt": {
        "id": "prompt_fixer_v2",
        "role": "Fixer Agent"
      },
      // v2: Auto-Rebase Info
      "outdated": false,
      "rebased_from": null
    },
    {
      "id": "atom_draft_y",
      "author": "AI (Claude)",
      "created_at": "2023-12-20T15:00:00Z",
      "content": "Старое предложение к предыдущей версии...",
      "outdated": true, // v2: Флаг устаревшего предложения
      "rebased_from": "atom_uuid_v4",
      "ai_comment": "⚠️ Это предложение было к предыдущей версии. Проверьте актуальность."
    }
  ],

  // 2. Артефакты (Issues / Questions / Errors)
  "artifacts": [
    {
      "id": "art_issue_55",
      "type": "issue",
      "severity": "medium",
      "content": "Не указан провайдер SMS.",
      "status": "open",
      "generated_by_prompt": {
        "id": "prompt_tech_lead_v1",
        "role": "Tech Lead"
      }
    },
    {
      "id": "art_error_99",
      "type": "ai_error", // v2: Ошибки AI видны в контексте
      "error_code": "TIMEOUT",
      "error_message": "Model did not respond within 60 seconds",
      "created_at": "2023-12-21T09:00:00Z",
      "error_details": {
        "prompt_id": "prompts/p_ba_v1",
        "model": "qwen2.5-coder:32b",
        "request_id": "req_xyz_123"
      }
    }
  ],

  // 3. История (Предок)
  "parent_version": {
    "id": "atom_uuid_v4",
    "diff_summary": "Initial version"
  }
}
```

### 2.2.4. Просмотр ошибок AI (Error Inspector) - **v2 NEW**
Для Debug Panel и админской отладки.

**Endpoint:** `GET /errors`

**Query Params:**
- `error_code` (optional): TIMEOUT, INVALID_JSON, MODEL_ERROR, NETWORK_ERROR
- `from_date` (optional): ISO timestamp
- `limit` (optional): default 50

**Response:**
```json
{
  "errors": [
    {
      "id": "art_error_99",
      "type": "ai_error",
      "error_code": "TIMEOUT",
      "error_message": "Model did not respond within 60 seconds",
      "created_at": "2023-12-21T09:00:00Z",
      "related_atom": {
        "id": "atom_uuid_v5",
        "content_preview": "Система должна отправлять SMS..." // Первые 100 символов
      },
      "error_details": {
        "prompt_id": "prompts/p_ba_v1",
        "model": "qwen2.5-coder:32b",
        "temperature": 0.1,
        "timeout_seconds": 60,
        "request_id": "req_xyz_123"
      }
    }
  ],
  "total": 15,
  "has_more": false
}
```

**UI Requirements:**
- JSON в `error_details` должен быть отформатирован с отступами (pretty-print).
- Весь блок `error_details` должен быть выделяемым текстом для Ctrl+C.
- Кнопка "Copy Request ID" для быстрого копирования `request_id` (для поиска в n8n логах).

---

## 2.3. Команды изменения (Mutation API)

### 2.3.1. Блокировка атома (Lock Atom) - **v2 NEW**
Блокирует атом для редактирования текущим пользователем.

**Endpoint:** `POST /atoms/:atom_id/lock`

**Request:**
```json
{
  "user_id": "user_123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "locked_until": "2023-12-17T15:35:00Z" // +5 минут от текущего времени
}
```

**Response (Already Locked):**
```json
{
  "error": "ALREADY_LOCKED",
  "message": "Atom is locked by user_456 until 2023-12-17T15:30:00Z",
  "locked_by": "user_456",
  "locked_until": "2023-12-17T15:30:00Z"
}
```

### 2.3.2. Разблокировка атома (Unlock Atom) - **v2 NEW**
Снимает блокировку вручную (при закрытии редактора).

**Endpoint:** `POST /atoms/:atom_id/unlock`

**Request:**
```json
{
  "user_id": "user_123"
}
```

**Response:**
```json
{
  "success": true
}
```

### 2.3.3. Запуск AI-анализа (Trigger Agent)
Фронтенд просит запустить анализ. Бэкенд сам найдет актуальный промпт в базе.

**Endpoint:** `POST /ai/analyze`

**Request:**
```json
{
  "target_id": "atom_uuid_v5", // Или ID документа целиком
  "agent_role_key": "tech_lead" // Ключ для поиска в коллекции 'prompts'
}
```

**Response:**
```json
{
  "status": "processing",
  "job_id": "job_123",
  "message": "Agent 'Tech Lead' started using prompt v3."
}
```

### 2.3.4. Создание предложения (Manual Proposal)
Человек предлагает правку.

**Endpoint:** `POST /atoms/:target_atom_id/proposals`

**Request:**
```json
{
  "content": "Текст правки...",
  "comment": "Исправил опечатку"
}
```

**Response:**
```json
{
  "id": "atom_draft_y",
  "status": "proposal"
}
```

### 2.3.5. Принятие предложения (Merge) - **v2 Updated**
Превращает предложение в активный атом, обновляет структуру документа, ребазирует другие proposals.

**Endpoint:** `POST /proposals/:proposal_atom_id/merge`

**Request:**
```json
{
  "target_active_atom_id": "atom_uuid_v5" // То, что заменяем
}
```

**Response:**
```json
{
  "success": true,
  "new_active_atom_id": "atom_draft_x", // Бывший proposal, ставший active
  "archived_atom_id": "atom_uuid_v5",
  // v2: Информация о ребейзе
  "rebased_proposals_count": 2, // Сколько других proposals были автоматически ребазированы
  "rebased_proposals": [
    {
      "id": "atom_draft_z",
      "outdated": true
    }
  ]
}
```

### 2.3.6. Архивирование атома (Archive Atom) - **v2 NEW**
Заменяет удаление. Атом исчезает из документа, но остается в базе.

**Endpoint:** `PATCH /atoms/:atom_id/archive`

**Request:**
```json
{
  "reason": "Требование отменено заказчиком"
}
```

**Response (Success):**
```json
{
  "success": true,
  "archived_at": "2023-12-17T15:00:00Z"
}
```

**Response (Protected by Baseline):**
```json
{
  "error": "PROTECTED_BY_BASELINE",
  "message": "Этот атом включен в 2 релиза и не может быть архивирован",
  "baselines": [
    { "id": "base_rel_1", "tag": "v1.0" },
    { "id": "base_rel_2", "tag": "v1.1" }
  ]
}
```

### 2.3.7. Создание снимка версии (Create Baseline)
Фиксация состояния документа ("Release v1.0").

**Endpoint:** `POST /documents/:doc_id/baselines`

**Request:**
```json
{
  "tag": "v1.0",
  "title": "Release Candidate 1"
}
```

**Response:**
```json
{
  "id": "base_rel_3",
  "items_snapshotted": 52,
  "frozen_at": "2023-12-21T15:30:00Z"
}
```

---

## 2.4. UI-Логика (Ответственность React)

### 2.4.1. Read-Only Mode
- Если в URL есть `?baseline_id=...`, интерфейс блокирует все кнопки редактирования, принятия пропозалов и запуска AI.
- Показывается плашка: *"Вы просматриваете архивную версию от [Дата]"*.

### 2.4.2. Lock Indication
- При клике на атом UI вызывает `POST /atoms/:id/lock`.
- Если получен `ALREADY_LOCKED`, показать overlay: "🔒 Редактируется User A, освободится через 3:45".
- При закрытии редактора (или unmount компонента) вызывать `POST /atoms/:id/unlock`.

### 2.4.3. Outdated Proposals UI
- Предложения с флагом `outdated: true` показывать с warning badge: "⚠️ Устаревшее".
- Tooltip: "Это предложение было к предыдущей версии. Проверьте актуальность перед принятием."
- Кнопка "Отклонить все устаревшие" для массовой очистки.

### 2.4.4. Error Details Copy UI
- В модалке с `error_details` использовать `<pre>` с `user-select: text`.
- Кнопка "Copy JSON" копирует весь JSON в буфер обмена.
- Кнопка "Copy Request ID" копирует только `request_id` для поиска в n8n.

### 2.4.5. Visual Diff
- Фронтенд получает полный текст `active` атома и полный текст `proposal` атома.
- Сравнение (diff) происходит на клиенте библиотекой `diff-match-patch` или `react-diff-viewer`.

---

**Конец Раздела 2** ✅

---

# Раздел 3. Логика Workflow в n8n (Алгоритмы v2)

В этом разделе описаны сценарии (Workflows), которые должен реализовывать n8n. Все изменения данных должны выполняться транзакционно (через AQL-транзакции в ArangoDB), чтобы не нарушить целостность графа.

## 3.1. Сценарий: AI Analysis (Запуск Агента) - **v2 Updated**

Реализует паттерн **Dynamic Prompt Injection** с обработкой ошибок.

### Входные данные (Webhook):
```json
{
  "target_atom_id": "atom_uuid_v5",
  "agent_role_key": "tech_lead"
}
```

### Алгоритм:

**Шаг 1. Fetch Context (ArangoDB Query)**
Получаем текст Атома и **Шаблон Промпта** одной выборкой.
```aql
// 1. Находим целевой атом
LET atom = DOCUMENT(CONCAT('atoms/', @target_atom_id))

// 2. Находим активный промпт для роли
LET prompt = (
  FOR p IN prompts
  FILTER p.role_key == @agent_role_key AND p.active == true
  SORT p.version DESC // Берем самую свежую версию
  LIMIT 1
  RETURN p
)[0]

// 3. v2: Если agent_role_key == "fixer", загружаем связанные issues для context
LET issues_context = (
  @agent_role_key == "fixer" ? (
    FOR artifact IN INBOUND CONCAT('atoms/', @target_atom_id) semantic_links
      FILTER artifact.type == "issue" AND artifact.status == "open"
      RETURN {
        severity: artifact.severity,
        description: artifact.content
      }
  ) : []
)

RETURN {
  atom_text: atom.content,
  prompt: prompt,
  issues_context: issues_context
}
```

**Шаг 2. Prepare Payload (n8n Code Node)**
```javascript
const { atom_text, prompt, issues_context } = $input.item.json;

// Замена плейсхолдеров
let finalPrompt = prompt.template
  .replace('{{content}}', atom_text);

// v2: Для Fixer агента подставляем issues_context
if (issues_context && issues_context.length > 0) {
  const issuesText = issues_context
    .map(i => `- [${i.severity.toUpperCase()}] ${i.description}`)
    .join('\n');
  finalPrompt = finalPrompt.replace('{{issues_context}}', issuesText);
}

return {
  json: {
    model: prompt.model_config.model,
    temperature: prompt.model_config.temperature,
    prompt: finalPrompt,
    response_format: prompt.model_config.response_format,
    // v2: Tracking для ошибок
    prompt_id: prompt._id,
    target_atom_id: $('Webhook').item.json.target_atom_id,
    request_id: $execution.id // n8n execution ID
  }
};
```

**Шаг 3. AI Execution (HTTP Request -> Ollama) - v2: С timeout и error handling**
```javascript
// n8n HTTP Request Node настройки:
// URL: http://ollama:11434/api/generate
// Method: POST
// Timeout: 60000 (60 секунд)
// Error handling: Continue On Fail = true
```

**Шаг 4. Check Response (n8n IF Node) - **v2 NEW**
```javascript
// Проверка успешности запроса
const response = $input.item.json;
const statusCode = $input.item.statusCode;

// Условие успеха:
return statusCode === 200 && response.response;
```

**Шаг 5a. Success Branch: Save Results (ArangoDB Transaction)**
```aql
LET prompt_id = @prompt_id
LET target_atom_id = @target_atom_id
LET ai_response = @ai_response // Парсенный JSON от модели

// Сохраняем артефакты (issues/questions/etc)
FOR item IN ai_response.issues
  LET new_artifact = INSERT {
    type: "issue",
    content: item.description,
    severity: item.severity,
    status: "open",
    source_model: @model,
    created_at: DATE_NOW()
  } INTO artifacts RETURN NEW

  // Связь с атомом (Где нашли?)
  INSERT {
    _from: new_artifact._id,
    _to: CONCAT('atoms/', target_atom_id),
    type: "detected_in"
  } INTO semantic_links

  // v2: Связь с промптом (Кто нашел?) - ТРАССИРОВКА
  INSERT {
    _from: new_artifact._id,
    _to: prompt_id,
    type: "created_with",
    created_at: DATE_NOW()
  } INTO created_with

RETURN { success: true, artifacts_created: LENGTH(ai_response.issues) }
```

**Шаг 5b. Error Branch: Save Error Artifact (ArangoDB Transaction) - **v2 NEW**
```aql
// Определяем тип ошибки
LET error_code = (
  @statusCode == null ? "TIMEOUT" :
  @statusCode >= 500 ? "MODEL_ERROR" :
  @response_text LIKE "%invalid json%" ? "INVALID_JSON" :
  "NETWORK_ERROR"
)

// Создаем артефакт ошибки
LET error_artifact = INSERT {
  type: "ai_error",
  error_code: error_code,
  error_message: @error_message,
  status: "open",
  created_at: DATE_NOW(),
  error_details: {
    prompt_id: @prompt_id,
    model: @model,
    temperature: @temperature,
    timeout_seconds: 60,
    request_id: @request_id,
    raw_response: @response_text // Для дебага
  }
} INTO artifacts RETURN NEW

// Связываем с атомом
INSERT {
  _from: error_artifact._id,
  _to: CONCAT('atoms/', @target_atom_id),
  type: "failed_for"
} INTO semantic_links

// Связываем с промптом (для статистики "какой промпт чаще падает")
INSERT {
  _from: error_artifact._id,
  _to: @prompt_id,
  type: "created_with",
  created_at: DATE_NOW()
} INTO created_with

RETURN { success: false, error_artifact_id: error_artifact._id }
```

---

## 3.2. Сценарий: Merge Proposal (Принятие Правки) - **v2 Updated**

Реализует логику "Гребенки" (Re-linking), иммутабельности и **Auto-Rebase** других proposals.

### Входные данные (Webhook):
```json
{
  "winner_proposal_id": "atom_draft_x",
  "current_active_id": "atom_uuid_v5"
}
```

### Алгоритм (ArangoDB Transaction):

```aql
// v2: Проверка блокировки перед merge
LET current_atom = DOCUMENT(CONCAT('atoms/', @current_active_id))
FILTER current_atom.locked_by == null OR current_atom.locked_by == @user_id
  // Если атом заблокирован другим - отклоняем

// 1. "Убиваем" текущий активный атом
UPDATE @current_active_id WITH {
  status: "archived",
  archived_at: DATE_NOW()
} IN atoms

// 2. "Коронуем" победителя
UPDATE @winner_proposal_id WITH {
  status: "active",
  activated_at: DATE_NOW()
} IN atoms

// 3. Переключаем Структуру (Structure Link)
FOR edge IN structure_links
  FILTER edge._to == CONCAT('atoms/', @current_active_id)
  UPDATE edge WITH {
    _to: CONCAT('atoms/', @winner_proposal_id)
  } IN structure_links

// 4. Создаем Историю (Revision Link)
INSERT {
  _from: CONCAT('atoms/', @winner_proposal_id),
  _to: CONCAT('atoms/', @current_active_id),
  type: "replaces",
  created_at: DATE_NOW()
} INTO revision_links

// 5. v2: AUTO-REBASE - Перевешиваем проигравшие proposals на нового короля
LET rebased_proposals = (
  FOR prop_edge IN proposal_links
    FILTER prop_edge._to == CONCAT('atoms/', @current_active_id)
    FILTER prop_edge._from != CONCAT('atoms/', @winner_proposal_id) // Победителя не трогаем

    // Обновляем ребро: новый target + флаг outdated
    UPDATE prop_edge WITH {
      _to: CONCAT('atoms/', @winner_proposal_id),
      outdated: true,
      rebased_from: CONCAT('atoms/', @current_active_id),
      rebased_at: DATE_NOW()
    } IN proposal_links

    RETURN { id: prop_edge._from, outdated: true }
)

// 6. Удаляем связь предложения у победителя (он больше не предложение)
FOR self_edge IN proposal_links
  FILTER self_edge._from == CONCAT('atoms/', @winner_proposal_id)
  REMOVE self_edge IN proposal_links

RETURN {
  success: true,
  new_active_atom_id: @winner_proposal_id,
  archived_atom_id: @current_active_id,
  rebased_proposals_count: LENGTH(rebased_proposals),
  rebased_proposals: rebased_proposals
}
```

---

## 3.3. Сценарий: Create Baseline (Снимок Версии)

Фиксирует состояние документа "как есть" на данный момент.

### Входные данные (Webhook):
```json
{
  "doc_id": "docs/doc_1",
  "version_tag": "v1.0",
  "title": "MVP Release"
}
```

### Алгоритм (ArangoDB Transaction):

```aql
// 1. Создаем узел Бейслайна
LET new_baseline = INSERT {
  doc_id: @doc_id,
  tag: @version_tag,
  title: @title,
  frozen_at: DATE_NOW()
} INTO baselines RETURN NEW

// 2. Собираем всех АКТИВНЫХ детей документа
// Идем от Doc -> Sections -> Atoms (только active!)
LET baseline_items = (
  FOR section IN OUTBOUND @doc_id structure_links
    FOR atom, edge IN OUTBOUND section._id structure_links
      FILTER atom.status == "active" // Только активные атомы

      // Копируем в baseline_items
      INSERT {
        _from: new_baseline._id,
        _to: atom._id,
        order: edge.order, // Сохраняем порядок из structure_links
        type: "snapshot_item",
        snapshotted_at: DATE_NOW()
      } INTO baseline_items

      RETURN atom._id
)

RETURN {
  baseline_id: new_baseline._id,
  items_snapshotted: LENGTH(baseline_items),
  frozen_at: new_baseline.frozen_at
}
```

---

## 3.4. Сценарий: Manual Proposal (Ручная правка)

Простой сценарий для создания альтернативной ветки.

### Входные данные (Webhook):
```json
{
  "target_active_id": "atom_uuid_v5",
  "new_content": "Исправленный текст...",
  "comment": "Убрал опечатку",
  "author": "user_123"
}
```

### Алгоритм (ArangoDB Transaction):

```aql
// 1. Создаем атом-черновик
LET draft = INSERT {
  content: @new_content,
  status: "proposal",
  author: @author,
  created_at: DATE_NOW()
} INTO atoms RETURN NEW

// 2. Создаем связь предложения
INSERT {
  _from: draft._id,
  _to: CONCAT('atoms/', @target_active_id),
  type: "alternative",
  comment: @comment,
  outdated: false, // Изначально не устаревшее
  rebased_from: null
} INTO proposal_links

RETURN {
  proposal_id: draft._id,
  status: "proposal"
}
```

---

## 3.5. Сценарий: Reject Proposal (Отклонение)

### Входные данные (Webhook):
```json
{
  "proposal_id": "atom_draft_y"
}
```

### Алгоритм:
```aql
UPDATE @proposal_id WITH {
  status: "rejected",
  rejected_at: DATE_NOW()
} IN atoms

RETURN { success: true }
```

---

## 3.6. Сценарий: Lock/Unlock Atom - **v2 NEW**

### 3.6.1. Lock Atom

**Входные данные:**
```json
{
  "atom_id": "atom_uuid_v5",
  "user_id": "user_123"
}
```

**Алгоритм:**
```aql
LET atom = DOCUMENT(CONCAT('atoms/', @atom_id))

// Проверка: свободен ли атом?
FILTER atom.locked_by == null OR atom.locked_until < DATE_NOW()

// Блокируем на 5 минут
LET locked_until = DATE_ADD(DATE_NOW(), 5, 'minutes')

UPDATE @atom_id WITH {
  locked_by: @user_id,
  locked_until: locked_until
} IN atoms

RETURN {
  success: true,
  locked_until: locked_until
}
```

**Если уже заблокирован:**
```aql
LET atom = DOCUMENT(CONCAT('atoms/', @atom_id))
FILTER atom.locked_by != null AND atom.locked_until > DATE_NOW()

RETURN {
  error: "ALREADY_LOCKED",
  locked_by: atom.locked_by,
  locked_until: atom.locked_until
}
```

### 3.6.2. Unlock Atom

**Алгоритм:**
```aql
UPDATE @atom_id WITH {
  locked_by: null,
  locked_until: null
} IN atoms

RETURN { success: true }
```

---

## 3.7. Сценарий: Archive Atom - **v2 NEW**

### Входные данные:
```json
{
  "atom_id": "atom_uuid_v5",
  "reason": "Требование отменено заказчиком"
}
```

### Алгоритм:

```aql
// 1. Проверка: включен ли атом в какой-либо baseline?
LET protected_baselines = (
  FOR baseline IN INBOUND CONCAT('atoms/', @atom_id) baseline_items
    RETURN { id: baseline._id, tag: baseline.tag }
)

// Если да - вернуть ошибку
FILTER LENGTH(protected_baselines) == 0

// 2. Архивируем атом
UPDATE @atom_id WITH {
  status: "archived",
  archived_at: DATE_NOW(),
  archive_reason: @reason
} IN atoms

// 3. Удаляем из structure_links (чтобы исчез из документа)
FOR edge IN structure_links
  FILTER edge._to == CONCAT('atoms/', @atom_id)
  REMOVE edge IN structure_links

RETURN {
  success: true,
  archived_at: DATE_NOW()
}
```

**Если защищен baseline:**
```aql
RETURN {
  error: "PROTECTED_BY_BASELINE",
  message: "Атом включен в релизы и не может быть архивирован",
  baselines: protected_baselines
}
```

---

## 3.8. Cron: Unlock Expired Locks - **v2 NEW**

Запускается каждую минуту для автоматического снятия истекших блокировок.

**Cron Expression:** `* * * * *` (каждую минуту)

**Алгоритм:**
```aql
FOR atom IN atoms
  FILTER atom.locked_until != null AND atom.locked_until < DATE_NOW()

  UPDATE atom WITH {
    locked_by: null,
    locked_until: null
  } IN atoms

  RETURN { id: atom._id, unlocked: true }
```

---

**Конец Раздела 3** ✅

---

# Раздел 4. Начальное наполнение БД (Initial Data Seeding v2)

Чтобы система заработала, выполните эти AQL-запросы (или импортируйте JSON) для создания конфигурации агентов и стартовой структуры проекта.

## 4.1. Коллекция `prompts` (Конфигурация Агентов) - **v2 Updated**

Эти документы определяют поведение ИИ. n8n будет искать их по полю `role_key`.

### Агент 1: Business Analyst (Поиск смысловых ошибок)
*   **Задача:** Искать размытые формулировки и отсутствие метрик.
*   **Модель:** Llama 3.1 / Claude 3.5 Sonnet.

```json
{
  "_key": "prompt_ba_v1",
  "role_key": "business_analyst",
  "name": "Senior BA Audit (Strict)",
  "version": 1,
  "active": true,
  "model_config": {
    "temperature": 0.1,
    "model": "llama3.1:8b",
    "response_format": { "type": "json_object" }
  },
  "template": "Role: Senior Business Analyst.\nTask: Analyze the following Requirement Atom for ambiguity, missing logical links, and lack of SMART criteria.\n\nInput Text: \"{{content}}\"\n\nRules:\n1. Ignore grammatical errors.\n2. Flag vague words like \"fast\", \"easy\", \"secure\" if no metrics are provided.\n3. Output strictly valid JSON.\n\nJSON Schema:\n{\n  \"issues\": [\n    {\n      \"severity\": \"low\" | \"medium\" | \"critical\",\n      \"description\": \"Short explanation\",\n      \"suggested_question\": \"What to ask stakeholders?\"\n    }\n  ]\n}",
  "created_at": "2023-12-15T10:00:00Z"
}
```

### Агент 2: Tech Lead (Техническая валидация)
*   **Задача:** TDD-подход. Искать, что мешает написать код.
*   **Модель:** Qwen 2.5 Coder / DeepSeek Coder.

```json
{
  "_key": "prompt_tech_v1",
  "role_key": "tech_lead",
  "name": "Principal Backend Architect Review",
  "version": 1,
  "active": true,
  "model_config": {
    "temperature": 0.2,
    "model": "qwen2.5-coder:32b",
    "response_format": { "type": "json_object" }
  },
  "template": "Role: Principal Backend Architect.\nTask: Review the Requirement Atom regarding implementation feasibility.\nMethod: Imagine writing Unit Tests and SQL Schema for this.\n\nInput Text: \"{{content}}\"\n\nOutput JSON with blocking issues (missing data types, edge cases, security risks).\n\nJSON Schema:\n{\n  \"issues\": [\n    {\n      \"type\": \"technical_blocker\" | \"security_risk\" | \"edge_case\",\n      \"severity\": \"medium\" | \"critical\",\n      \"description\": \"Why code cannot be written\",\n      \"technical_details\": \"Specifics (e.g. missing HTTP error codes)\"\n    }\n  ]\n}",
  "created_at": "2023-12-15T10:00:00Z"
}
```

### Агент 3: The Fixer (Генератор исправлений) - **v2 Updated**
*   **Задача:** Переписать текст, учитывая найденные баги.
*   **Модель:** Claude 3.5 Sonnet / Mistral Large.
*   **v2 Fix:** Явная инструкция для `{{issues_context}}`.

```json
{
  "_key": "prompt_fixer_v1",
  "role_key": "fixer",
  "name": "Technical Editor Rewrite",
  "version": 1,
  "active": true,
  "model_config": {
    "temperature": 0.4,
    "model": "claude-3-5-sonnet",
    "response_format": { "type": "json_object" }
  },
  "template": "Role: Technical Writer.\nTask: Rewrite the Requirement Atom to resolve the detected issues.\n\nOriginal Text: \"{{content}}\"\n\nIssues to fix:\n{{issues_context}}\n\nRules:\n1. Maintain the original style.\n2. Be precise and concise.\n3. Do not add conversational filler.\n4. Address each issue from the list above.\n\nJSON Schema:\n{\n  \"new_content\": \"The rewritten text ready for insertion\",\n  \"change_summary\": \"What was improved (e.g. Added phone mask, specified timeout)\"\n}",
  "created_at": "2023-12-15T10:00:00Z"
}
```

---

## 4.2. Пример проекта (Hello World)

Залейте эти данные, чтобы у фронтенда было что отображать сразу после запуска (структура: Документ -> Раздел -> Атом).

### 1. Вершины (Nodes)

**Коллекция `docs`:**
```json
{
  "_key": "doc_demo",
  "title": "Демонстрационное ТЗ",
  "status": "draft",
  "created_at": "2023-12-01T10:00:00Z",
  "updated_at": "2023-12-01T10:00:00Z",
  "owner_id": "user_demo"
}
```

**Коллекция `sections`:**
```json
{
  "_key": "sec_auth",
  "title": "1. Аутентификация",
  "level": 1,
  "created_at": "2023-12-01T10:00:00Z"
}
```

**Коллекция `atoms`:**
```json
{
  "_key": "atom_demo_1",
  "content": "Пользователь заходит в приложение быстро и безопасно.",
  "status": "active",
  "author": "analyst_ai",
  "created_at": "2023-12-01T10:00:00Z",
  "locked_by": null,
  "locked_until": null
}
```

### 2. Ребра (Edges)

**Коллекция `structure_links`:**
```json
[
  {
    "_from": "docs/doc_demo",
    "_to": "sections/sec_auth",
    "order": 10.0,
    "type": "contains"
  },
  {
    "_from": "sections/sec_auth",
    "_to": "atoms/atom_demo_1",
    "order": 10.0,
    "type": "contains"
  }
]
```

### 3. Тестовый артефакт (Issue)

**Коллекция `artifacts`:**
```json
{
  "_key": "art_demo_issue",
  "type": "issue",
  "content": "Не указаны метрики для 'быстро' и 'безопасно'.",
  "severity": "medium",
  "source_model": "llama3.1:8b",
  "status": "open",
  "created_at": "2023-12-01T10:05:00Z"
}
```

**Коллекция `semantic_links`:**
```json
{
  "_from": "artifacts/art_demo_issue",
  "_to": "atoms/atom_demo_1",
  "type": "detected_in",
  "confidence": 0.92
}
```

**Коллекция `created_with`:**
```json
{
  "_from": "artifacts/art_demo_issue",
  "_to": "prompts/prompt_ba_v1",
  "type": "created_with",
  "created_at": "2023-12-01T10:05:00Z"
}
```

### 4. Тестовая ошибка AI (для проверки UI) - **v2 NEW**

**Коллекция `artifacts`:**
```json
{
  "_key": "art_demo_error",
  "type": "ai_error",
  "error_code": "TIMEOUT",
  "error_message": "Model did not respond within 60 seconds",
  "status": "open",
  "created_at": "2023-12-01T10:10:00Z",
  "error_details": {
    "prompt_id": "prompts/prompt_tech_v1",
    "model": "qwen2.5-coder:32b",
    "temperature": 0.2,
    "timeout_seconds": 60,
    "request_id": "exec_test_12345"
  }
}
```

**Коллекция `semantic_links`:**
```json
{
  "_from": "artifacts/art_demo_error",
  "_to": "atoms/atom_demo_1",
  "type": "failed_for"
}
```

---

## 4.3. Чек-лист проверки (Validation Checklist)

Перед сдачей MVP убедитесь, что:

### Базовая конфигурация ArangoDB:

1.  **Индексы созданы:**
    ```js
    // Запустите в ArangoDB Web UI (/_db/your_database/_admin/aardvark/index.html#queries)

    db.structure_links.ensureIndex({ type: "persistent", fields: ["_from", "order"] });
    db.artifacts.ensureIndex({ type: "persistent", fields: ["status"] });
    db.atoms.ensureIndex({ type: "fulltext", fields: ["content"], minLength: 3 });
    db.atoms.ensureIndex({ type: "persistent", fields: ["status"] });
    db.proposal_links.ensureIndex({ type: "persistent", fields: ["_to"] });
    db.prompts.ensureIndex({
      type: "persistent",
      fields: ["role_key", "active"],
      unique: true,
      sparse: true
    });
    db.atoms.ensureIndex({ type: "persistent", fields: ["locked_by"], sparse: true });
    ```

2.  **Доступ n8n:**
    *   Убедитесь, что пользователь БД, под которым ходит n8n, имеет права `Write` на все коллекции.
    *   Проверьте подключение: `ArangoDB Credentials` в n8n должны работать.

3.  **Тест Агента (Manual Query):**
    *   Выполните в ArangoDB веб-интерфейсе:
        ```aql
        FOR p IN prompts
        FILTER p.role_key == 'business_analyst' AND p.active == true
        RETURN p
        ```
    *   Должен вернуться один JSON-объект с `prompt_ba_v1`.

4.  **Тест блокировки (Lock Timeout):**
    *   Создайте заблокированный атом вручную:
        ```aql
        UPDATE 'atom_demo_1' WITH {
          locked_by: 'test_user',
          locked_until: DATE_ADD(DATE_NOW(), -1, 'minutes') // Истекшая блокировка
        } IN atoms
        ```
    *   Запустите cron-workflow вручную (Раздел 3.8). Блокировка должна сняться.

5.  **Тест Error Artifact UI:**
    *   Откройте фронтенд, перейдите в Debug Panel.
    *   Фильтр "Show only errors" должен показать `art_demo_error`.
    *   Кнопка "View Details" должна открыть модалку с JSON.
    *   JSON должен быть выделяемым (попробуйте Ctrl+A, Ctrl+C).

---

**Конец Раздела 4** ✅

---

# Раздел 5. UI Requirements для Error Handling (v2 NEW)

Спецификация UI компонентов для работы с ошибками AI.

## 5.1. AI Errors Panel (Debug Panel Extension)

### Расположение:
Вкладка "Errors" в существующем Debug Panel (рядом с "API Logs").

### Функционал:

**Фильтры:**
- Dropdown: "Error Type" (All / TIMEOUT / INVALID_JSON / MODEL_ERROR / NETWORK_ERROR)
- Date Picker: "From Date" (по умолчанию: последние 24 часа)
- Toggle: "Show Resolved" (по умолчанию: Off)

**Список ошибок:**
Таблица со столбцами:
1. **Time** - `created_at` (формат: "HH:MM:SS DD.MM.YYYY")
2. **Type** - Badge с цветом по error_code:
   - TIMEOUT → Orange
   - INVALID_JSON → Yellow
   - MODEL_ERROR → Red
   - NETWORK_ERROR → Purple
3. **Atom Preview** - Первые 50 символов `related_atom.content_preview` + "..."
4. **Prompt** - `error_details.prompt_id` (короткий ID)
5. **Actions** - Кнопки:
   - "View Details" → Открывает модалку (см. 5.2)
   - "Copy Request ID" → Копирует `request_id` в буфер

**Пагинация:**
- Показывать по 20 записей.
- Кнопки "Previous" / "Next".

---

## 5.2. Error Details Modal

### Триггер:
Клик на "View Details" в AI Errors Panel.

### Содержимое:

**Header:**
```
⚠️ AI Analysis Failed: [ERROR_CODE]
Time: [created_at]
```

**Body:**
1. **Related Atom:**
   ```
   Atom ID: [related_atom.id]
   Content: [related_atom.content_preview] (кликабельная ссылка -> переход к атому)
   ```

2. **Error Message:**
   ```
   [error_message]
   ```

3. **Technical Details:**
   ```json
   {
     "prompt_id": "prompts/p_ba_v1",
     "model": "qwen2.5-coder:32b",
     "temperature": 0.1,
     "timeout_seconds": 60,
     "request_id": "req_xyz_123"
   }
   ```
   **Требования:**
   - JSON отформатирован с отступами (2 spaces).
   - Использовать `<pre>` с CSS: `user-select: text; white-space: pre-wrap;`
   - Фон: светло-серый (#f5f5f5)
   - Шрифт: `monospace`

**Footer (Кнопки):**
- **"Copy JSON"** → Копирует весь блок `error_details` в буфер
- **"Copy Request ID"** → Копирует только `request_id`
- **"Go to Atom"** → Закрывает модалку, скроллит к атому в документе
- **"Mark as Resolved"** → Меняет статус error artifact на "resolved"
- **"Close"** → Закрывает модалку

---

## 5.3. In-Context Error Indicator

### Расположение:
В Inspector/Sidebar (при клике на атом) в списке Artifacts.

### Вид:
```
⚠️ AI Analysis Error
Type: TIMEOUT (60s)
Prompt: Tech Lead v1
Created: 2 hours ago
[View Details]
```

**Цвет фона карточки:** Светло-красный (#fff5f5)

**Клик на "View Details":** Открывает модалку из 5.2.

---

## 5.4. Batch Actions

### Расположение:
Над таблицей в AI Errors Panel.

### Функционал:
**Кнопка "Resolve All Displayed":**
- Меняет статус всех ошибок на текущей странице на "resolved".
- Показывает confirmation dialog: "Mark 15 errors as resolved? This cannot be undone."

---

## 5.5. Clipboard Copy Implementation

### Технические требования:

**Для "Copy JSON":**
```javascript
navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
// Toast: "JSON copied to clipboard"
```

**Для "Copy Request ID":**
```javascript
navigator.clipboard.writeText(errorDetails.request_id);
// Toast: "Request ID copied: req_xyz_123"
```

**Fallback для старых браузеров:**
```javascript
const textarea = document.createElement('textarea');
textarea.value = text;
document.body.appendChild(textarea);
textarea.select();
document.execCommand('copy');
document.body.removeChild(textarea);
```

---

**Конец Раздела 5** ✅

---

# Validation Checklist для Product Owner

## Перед началом разработки:

- [ ] **1. ArangoDB Setup:**
  - [ ] БД создана (имя: `coati_dev`)
  - [ ] Все коллекции созданы (8 document collections, 6 edge collections)
  - [ ] Все 7 индексов созданы и работают
  - [ ] Пользователь для n8n имеет права `Read/Write`

- [ ] **2. n8n Setup:**
  - [ ] n8n запущен и доступен
  - [ ] ArangoDB Credentials настроены и протестированы
  - [ ] Ollama API доступен из n8n (проверить через HTTP Request node)

- [ ] **3. Seed Data:**
  - [ ] Загружены 3 промпта (BA, Tech Lead, Fixer)
  - [ ] Создан демонстрационный документ (doc_demo)
  - [ ] Создан тестовый issue
  - [ ] Создан тестовый ai_error (для проверки UI)

## После реализации n8n Workflows:

- [ ] **4. Basic Workflows (CRUD):**
  - [ ] GET /documents/:id/structure возвращает корректную структуру
  - [ ] POST /atoms/:id/lock блокирует атом
  - [ ] POST /atoms/:id/unlock разблокирует атом
  - [ ] Cron job снимает истекшие блокировки

- [ ] **5. AI Workflows:**
  - [ ] POST /ai/analyze (BA) находит issues
  - [ ] POST /ai/analyze (Tech Lead) находит technical blockers
  - [ ] POST /ai/analyze (Fixer) с `{{issues_context}}` работает
  - [ ] При timeout создается ai_error artifact

- [ ] **6. Merge & Rebase:**
  - [ ] POST /proposals/:id/merge переключает атом
  - [ ] Другие proposals автоматически ребазируются
  - [ ] Флаг `outdated: true` устанавливается корректно
  - [ ] После 5 последовательных merge граф не сломан

- [ ] **7. Baselines:**
  - [ ] POST /documents/:id/baselines создает снимок
  - [ ] GET /documents/:id/structure?baseline_id=... возвращает замороженную версию
  - [ ] PATCH /atoms/:id/archive проверяет защиту baseline

## После реализации Frontend:

- [ ] **8. Error Handling UI:**
  - [ ] AI Errors Panel отображается в Debug Panel
  - [ ] Фильтры работают
  - [ ] "View Details" открывает модалку с выделяемым JSON
  - [ ] "Copy Request ID" копирует в буфер
  - [ ] In-context error indicator виден в Inspector

- [ ] **9. Lock UI:**
  - [ ] При открытии атома появляется индикатор блокировки
  - [ ] Если атом заблокирован другим - показывается overlay
  - [ ] Countdown timer отображает оставшееся время

- [ ] **10. Outdated Proposals UI:**
  - [ ] Устаревшие proposals помечены badge "⚠️ Устаревшее"
  - [ ] Tooltip объясняет причину
  - [ ] Кнопка "Reject All Outdated" работает

## Интеграционные тесты:

- [ ] **11. "50 Merges" Stress Test:**
  - [ ] Создать 50 proposals для одного атома
  - [ ] Принять их последовательно
  - [ ] Проверить, что граф не деградировал (нет orphaned nodes)
  - [ ] Проверить, что history корректная (все revision_links на месте)

- [ ] **12. Concurrent Edit Test:**
  - [ ] Два пользователя пытаются заблокировать один атом
  - [ ] Второй получает ALREADY_LOCKED
  - [ ] После таймаута оба могут заблокировать

- [ ] **13. Baseline Protection Test:**
  - [ ] Создать baseline с атомом A
  - [ ] Попытаться архивировать A
  - [ ] Должна вернуться ошибка PROTECTED_BY_BASELINE

---

# Summary: Что изменилось в v2.0

## Критические исправления (Blockers):

1. **✅ Исправлено:** Удален `parent_doc_id` из `sections` (единственный источник истины - граф)
2. **✅ Исправлено:** Дописан пункт 4 в индексах (`atoms.status`, `proposal_links._to`)
3. **✅ Исправлено:** Добавлена загрузка `issues_context` для Fixer Agent (баг с missing variable)
4. **✅ Исправлено:** Переименовано `generated_by` → `created_with` (семантика)

## Новые возможности (Features):

1. **🔒 Pessimistic Locking:** Атомы блокируются при редактировании, предотвращая race conditions
2. **🗑️ Hard Block Deletion:** Физическое удаление запрещено, только архивирование
3. **🔄 Auto-Rebase Proposals:** При merge другие proposals автоматически ребазируются с флагом `outdated`
4. **⚠️ AI Error Tracking:** Ошибки AI сохраняются как артефакты, доступны в UI с копированием JSON
5. **📊 Traceability:** Связь артефактов с версиями промптов через `created_with`

## Новые API Endpoints:

- `POST /atoms/:id/lock` - Блокировка атома
- `POST /atoms/:id/unlock` - Разблокировка атома
- `PATCH /atoms/:id/archive` - Архивирование (вместо удаления)
- `GET /errors` - Просмотр ошибок AI

## Новые UI Components:

- **AI Errors Panel** - Вкладка в Debug Panel для просмотра ошибок
- **Error Details Modal** - Модалка с выделяемым JSON
- **Lock Indicator** - Overlay при редактировании заблокированного атома
- **Outdated Proposals Badge** - Warning для устаревших предложений

## Новые n8n Workflows:

- **Lock/Unlock Atom** (3.6)
- **Archive Atom** (3.7)
- **Unlock Expired Locks Cron** (3.8)

## Breaking Changes:

⚠️ **Миграция данных не требуется**, но:
- Удалите поле `parent_doc_id` из существующих `sections` (если есть)
- Переименуйте коллекцию ребер `generated_by` → `created_with` (или создайте новую и удалите старую)
- Пересоздайте промпты с обновленными шаблонами (особенно Fixer Agent)

---

**Спецификация v2.0 завершена** ✅

Готова к имплементации. Да поможет вам Господь! 🙏
