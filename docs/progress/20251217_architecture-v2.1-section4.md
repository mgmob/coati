# Раздел 4. Начальное наполнение БД (Initial Data Seeding v2.1)

Чтобы система заработала, выполните эти AQL-запросы (или импортируйте JSON) для создания конфигурации агентов и стартовой структуры проекта.

---

## 4.1. Коллекция `prompts` (Конфигурация Агентов)

Эти документы определяют поведение ИИ. n8n будет искать их по полю `role_key`.

### Агент 1: Business Analyst (Поиск смысловых ошибок)
* **Задача:** искать размытые формулировки и отсутствие метрик.
* **Модель:** Llama 3.1 / Claude 3.5 Sonnet.

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
* **Задача:** TDD-подход. Искать, что мешает написать код.
* **Модель:** Qwen 2.5 Coder / DeepSeek Coder.

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

### Агент 3: The Fixer (Генератор исправлений)
* **Задача:** переписать текст, учитывая найденные баги.
* **Модель:** Claude 3.5 Sonnet / Mistral Large.

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

> NOTE: `_rev` создается ArangoDB автоматически при вставке и не задается в seed JSON.

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

### 4. Тестовая ошибка AI (для проверки UI)

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
    "request_id": "exec_test_12345",
    "raw_response": ""
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

1. **Индексы созданы:**
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

2. **Доступ n8n:**
   - Убедитесь, что пользователь БД, под которым ходит n8n, имеет права `Write` на все коллекции.
   - Проверьте подключение: `ArangoDB Credentials` в n8n должны работать.

3. **Тест Агента (Manual Query):**
   - Выполните в ArangoDB веб-интерфейсе:
     ```aql
     FOR p IN prompts
       FILTER p.role_key == 'business_analyst' AND p.active == true
       RETURN p
     ```
   - Должен вернуться один JSON-объект с `prompt_ba_v1`.

4. **Тест блокировки (Lock Timeout):**
   - Создайте заблокированный атом вручную:
     ```aql
     UPDATE 'atom_demo_1' WITH {
       locked_by: 'test_user',
       locked_until: DATE_ADD(DATE_NOW(), -1, 'minutes')
     } IN atoms
     ```
   - Запустите cron-workflow вручную (Раздел 3.8). Блокировка должна сняться.

5. **Тест Error Artifact UI:**
   - Откройте фронтенд, перейдите в Debug Panel.
   - Фильтр "Show only errors" должен показать `art_demo_error`.
   - Кнопка "View Details" должна открыть модалку с JSON.
   - JSON должен быть выделяемым (попробуйте Ctrl+A, Ctrl+C).

### Graph Integrity Validation (v2.1)

6. **Single Parent Invariant + запрет docs→atoms:**
   - Запустите скрипт валидации:
     ```aql
     LET multi_parent_atoms = (
       FOR e IN structure_links
         FILTER e.type == "contains"
         FILTER LIKE(e._to, "atoms/%")
         COLLECT to = e._to WITH COUNT INTO c
         FILTER c > 1
         RETURN { atom: to, parents_count: c }
     )

     LET proposal_edges = (
       FOR a IN atoms
         FILTER a.status == "proposal"
         LET edges = (
           FOR pe IN proposal_links
             FILTER pe._from == a._id
             RETURN pe
         )
         FILTER LENGTH(edges) != 1
         RETURN { proposal: a._id, proposal_links_count: LENGTH(edges) }
     )

     LET illegal_doc_to_atom = (
       FOR e IN structure_links
         FILTER LIKE(e._from, "docs/%")
         FILTER LIKE(e._to, "atoms/%")
         RETURN e
     )

     RETURN {
       ok: LENGTH(multi_parent_atoms) == 0 AND LENGTH(proposal_edges) == 0 AND LENGTH(illegal_doc_to_atom) == 0,
       multi_parent_atoms: multi_parent_atoms,
       bad_proposals: proposal_edges,
       illegal_doc_to_atom: illegal_doc_to_atom
     }
     ```
   - Должно вернуться `ok: true`.

---

**Конец Раздела 4** ✅
