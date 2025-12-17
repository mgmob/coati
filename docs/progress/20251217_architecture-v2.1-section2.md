# Раздел 2. API Контракты и Взаимодействие (Frontend ↔ Backend v2.1)

В роли Backend выступает **n8n**, который оркестрирует запросы в ArangoDB и Ollama.

## 2.1. Общие принципы
- **Протокол:** REST over HTTP.
- **Формат:** JSON.
- **Даты:** ISO 8601 UTC.
- **Базовый URL:** `http://localhost:5678/webhook/coati/` (для n8n webhooks).

### 2.1.1. Error Handling
- Все ошибки возвращаются как HTTP 4xx/5xx + Body:
  ```json
  { "error": "CODE", "message": "human readable" }
  ```
- **409 CONFLICT** — конфликт версий (Optimistic CAS / `_rev` mismatch). Клиент должен обновить данные и повторить операцию.
- **423 LOCKED** — ресурс логически заблокирован другим пользователем (`locked_by`).

### 2.1.2. Optimistic Concurrency (CAS) — v2.1
ArangoDB ведёт поле `_rev` автоматически. Оно используется как concurrency token.

**Правила:**
1. Все endpoints, которые меняют состояние документа/ребра, **обязаны** использовать CAS.
2. Клиент передаёт заголовок:
   ```
   If-Match: <_rev>
   ```
3. Если `_rev` не совпал (изменение произошло конкурентно) → `409 CONFLICT`.

**Примечание:** CAS применяется к тому документу, который является «истиной» для операции:
- Lock/Unlock/Archive → CAS по `atoms._rev`.
- Merge → CAS по `_rev` **конкретного edge** в `structure_links`, который держит активный atom в структуре.

---

## 2.2. Чтение данных (Query API)

### 2.2.1. Получение структуры документа (Main View)
Основной запрос для отрисовки редактора. Поддерживает два режима: "Черновик" (Draft) и "Архивная версия" (Baseline).

**Endpoint:** `GET /documents/:doc_id/structure`

**Query Params:**
- `baseline_id` (optional): если передан, возвращает замороженную структуру этого релиза. Если нет — возвращает текущий Draft.

**Response:**
```json
{
  "doc_meta": {
    "id": "doc_uuid_1",
    "title": "ТЗ на Корзину",
    "view_mode": "draft",
    "active_baseline": null
  },
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

      "locked_by": null,
      "locked_until": null,

      "atom_rev": "_rev_from_atoms",

      "structure_edge_id": "structure_links/<edgeKey>",
      "structure_edge_rev": "_rev_from_structure_edge",

      "has_open_issues": true,
      "pending_proposals_count": 2
    }
  ]
}
```

**Notes:**
- `atom_rev` используется для CAS на lock/unlock/archive.
- `structure_edge_id`/`structure_edge_rev` используются для CAS на merge.

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
  "atom_rev": "_rev_from_atoms",

  "proposals": [
    {
      "id": "atom_draft_x",
      "author": "AI (Qwen)",
      "created_at": "2023-12-21T10:00:00Z",
      "content": "Система должна отправлять OTP-код через SMS-шлюз.",
      "ai_comment": "Уточнил терминологию (OTP вместо просто SMS).",
      "outdated": false,
      "rebased_from": null
    }
  ],

  "artifacts": [
    {
      "id": "art_issue_55",
      "type": "issue",
      "severity": "medium",
      "content": "Не указан провайдер SMS.",
      "status": "open",
      "generated_by_prompt": {
        "id": "prompts/prompt_tech_v1",
        "role": "Tech Lead"
      }
    },
    {
      "id": "art_error_99",
      "type": "ai_error",
      "error_code": "TIMEOUT",
      "error_message": "Model did not respond within 60 seconds",
      "created_at": "2023-12-21T09:00:00Z",
      "error_details": {
        "prompt_id": "prompts/p_ba_v1",
        "model": "qwen2.5-coder:32b",
        "request_id": "req_xyz_123",
        "raw_response": "..."
      }
    }
  ],

  "parent_version": {
    "id": "atom_uuid_v4",
    "diff_summary": "Initial version"
  }
}
```

### 2.2.4. Просмотр ошибок AI (Error Inspector)
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
        "content_preview": "Система должна отправлять SMS..."
      },
      "error_details": {
        "prompt_id": "prompts/p_ba_v1",
        "model": "qwen2.5-coder:32b",
        "temperature": 0.1,
        "timeout_seconds": 60,
        "request_id": "req_xyz_123",
        "raw_response": "..."
      }
    }
  ],
  "total": 15,
  "has_more": false
}
```

---

## 2.3. Команды изменения (Mutation API)

### 2.3.1. Блокировка атома (Lock Atom)
Блокирует атом для редактирования текущим пользователем.

**Endpoint:** `POST /atoms/:atom_id/lock`

**Request Headers (v2.1):**
```
If-Match: <atom_rev>
```

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
  "locked_until": "2023-12-17T15:35:00Z",
  "atom_rev": "new_rev"
}
```

**Response (Locked by another user) → 423:**
```json
{
  "error": "LOCKED",
  "message": "Atom is locked by user_456 until 2023-12-17T15:30:00Z",
  "locked_by": "user_456",
  "locked_until": "2023-12-17T15:30:00Z"
}
```

**Response (Revision conflict) → 409:**
```json
{
  "error": "REV_CONFLICT",
  "message": "Atom was modified concurrently. Refresh and retry."
}
```

### 2.3.2. Разблокировка атома (Unlock Atom)
Снимает блокировку вручную (при закрытии редактора).

**Endpoint:** `POST /atoms/:atom_id/unlock`

**Request Headers (v2.1):**
```
If-Match: <atom_rev>
```

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
  "atom_rev": "new_rev"
}
```

**Response (Not lock owner) → 423:**
```json
{
  "error": "LOCKED",
  "message": "Atom is locked by another user.",
  "locked_by": "user_456"
}
```

**Response (Revision conflict) → 409:**
```json
{
  "error": "REV_CONFLICT",
  "message": "Atom was modified concurrently. Refresh and retry."
}
```

### 2.3.3. Запуск AI-анализа (Trigger Agent)
Фронтенд просит запустить анализ. Бэкенд сам найдет актуальный промпт в базе.

**Endpoint:** `POST /ai/analyze`

**Request:**
```json
{
  "target_id": "atom_uuid_v5",
  "agent_role_key": "tech_lead"
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

### 2.3.5. Принятие предложения (Merge) — v2.1 CAS
Превращает предложение в активный атом, обновляет структуру документа, ребазирует другие proposals.

**Endpoint:** `POST /proposals/:proposal_atom_id/merge`

**Request Headers (v2.1):**
```
If-Match: <structure_edge_rev>
```

**Request (v2.1):**
```json
{
  "target_active_atom_id": "atom_uuid_v5",
  "structure_edge_id": "structure_links/<edgeKey>",
  "user_id": "user_123",
  "allow_outdated": false
}
```

**Response (Success):**
```json
{
  "success": true,
  "new_active_atom_id": "atom_draft_x",
  "archived_atom_id": "atom_uuid_v5",
  "structure_edge_id": "structure_links/<edgeKey>",
  "structure_edge_rev": "new_edge_rev",
  "rebased_proposals_count": 2,
  "rebased_proposals": [
    { "id": "atoms/atom_draft_z", "outdated": true }
  ]
}
```

**Response (CAS conflict) → 409:**
```json
{
  "error": "REV_CONFLICT",
  "message": "Document structure changed concurrently. Refresh and retry."
}
```

**Response (Locked) → 423:**
```json
{
  "error": "LOCKED",
  "message": "Target atom is locked by another user.",
  "locked_by": "user_456",
  "locked_until": "2023-12-17T15:30:00Z"
}
```

### 2.3.6. Архивирование атома (Archive Atom)
Заменяет удаление. Атом исчезает из документа, но остается в базе.

**Endpoint:** `PATCH /atoms/:atom_id/archive`

**Request Headers (v2.1):**
```
If-Match: <atom_rev>
```

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
  "archived_at": "2023-12-17T15:00:00Z",
  "atom_rev": "new_rev"
}
```

**Response (Protected by Baseline):**
```json
{
  "error": "PROTECTED_BY_BASELINE",
  "message": "Этот атом включен в релизы и не может быть архивирован",
  "baselines": [
    { "id": "base_rel_1", "tag": "v1.0" },
    { "id": "base_rel_2", "tag": "v1.1" }
  ]
}
```

**Response (Revision conflict) → 409:**
```json
{
  "error": "REV_CONFLICT",
  "message": "Atom was modified concurrently. Refresh and retry."
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

### 2.4.2. Lock Indication + CAS
- При клике на атом UI вызывает `POST /atoms/:id/lock` и передает `If-Match: atom_rev`.
- Если получен `423 LOCKED`, показать overlay: "🔒 Редактируется User A, освободится через 3:45".
- Если получен `409 CONFLICT`, UI делает refresh контекста/структуры и предлагает повторить.
- При закрытии редактора (или unmount компонента) вызывать `POST /atoms/:id/unlock` с `If-Match: atom_rev`.

### 2.4.3. Outdated Proposals UI
- Предложения с флагом `outdated: true` показывать с warning badge: "⚠️ Устаревшее".
- Tooltip: "Это предложение было к предыдущей версии. Проверьте актуальность перед принятием."
- Кнопка "Отклонить все устаревшие" для массовой очистки.

### 2.4.4. Merge UX (CAS)
- Для merge UI обязан иметь `structure_edge_id` и `structure_edge_rev` из структуры документа.
- Merge запрос отправляется с `If-Match: structure_edge_rev`.
- При `409 CONFLICT` UI делает reload структуры и заново предлагает выбрать proposal.

### 2.4.5. Visual Diff
- Фронтенд получает полный текст `active` атома и полный текст `proposal` атома.
- Сравнение (diff) происходит на клиенте библиотекой `diff-match-patch` или `react-diff-viewer`.

---

**Конец Раздела 2** ✅
