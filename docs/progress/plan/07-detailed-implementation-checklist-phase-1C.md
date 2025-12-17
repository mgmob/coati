---
**Навигация:** [← Предыдущий раздел](06-detailed-implementation-checklist-phase-1B.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](07a-detailed-implementation-checklist-phase-1C-migration.md)
---

### Фаза 1C: MCP-Arango Setup (1 день) ✅ ЗАВЕРШЕНА

> **Цель:** Создать MCP-сервер для управления ArangoDB из Cline-чата
> **Приоритет:** Высокий (требуется для безопасной работы с БД из Cline)
> **Версия:** 2.0 (без миграции - миграция вынесена в отдельную фазу 1C-Migration)

#### MCP Server Setup
- [x] Создать `backend/mcp-arango/` директорию ✅
- [x] Создать `package.json` с зависимостями: ✅
  ```json
  {
    "name": "mcp-arango",
    "version": "1.0.0",
    "description": "MCP server for ArangoDB management",
    "main": "index.js",
    "dependencies": {
      "@modelcontextprotocol/sdk": "latest",
      "arangojs": "^8.x"
    }
  }
  ```
- [x] Создать `index.js` с MCP server ✅
- [x] Создать `lib/database.js` - ArangoDB connection wrapper ✅
- [x] Создать `lib/tools.js` - MCP tools implementation ✅
- [x] Создать `lib/validators.js` - Graph validation logic ✅
- [x] Добавить в `.cline_mcp_settings.json`: ✅
  ```json
  {
    "mcpServers": {
      "arango": {
        "command": "node",
        "args": ["backend/mcp-arango/index.js"],
        "env": {
          "ARANGO_URL": "http://localhost:8529",
          "ARANGO_DB": "coati_dev",
          "ARANGO_USERNAME": "root",
          "ARANGO_PASSWORD": ""
        }
      }
    }
  }
  ```

#### MCP Tools (5 инструментов)
- [x] `arango_query(aql, bindVars)` - выполнить AQL запрос ✅
  - Параметры: `aql` (string), `bindVars` (object, optional)
  - Возвращает: результаты запроса в JSON
  - Безопасность: санитизация параметров
  - Тесты: 4 unit-теста
- [x] `arango_create_index(collection, fields, type)` - создать индекс ✅
  - Параметры: `collection` (string), `fields` (array), `type` (persistent|fulltext|unique)
  - Проверяет: не существует ли уже индекс
  - Возвращает: статус создания
  - Тесты: 5 unit-тестов
- [x] `arango_list_collections()` - список коллекций ✅
  - Возвращает: список всех коллекций (document + edge) с count документов
  - Тесты: 3 unit-теста
- [x] `arango_validate_graph()` - запустить validation script ✅
  - Проверяет:
    - Single Parent Invariant (atoms имеют ≤1 входящего structure_links)
    - Orphaned nodes (атомы без связей)
    - Illegal `docs -> atoms` связи
    - Циклы в revision_links
  - Возвращает: `{ok: boolean, issues: [...]}`
  - Тесты: 2 unit-теста
- [x] `arango_get_stats()` - статистика БД ✅
  - Возвращает: количество документов в каждой коллекции, размер БД
  - Тесты: 2 unit-теста

#### Тестирование
- [x] Unit-тесты написаны (16 тестов) ✅
- [x] Все тесты проходят (16/16 passed) ✅
- [x] Покрытие всех 5 tools ✅
- [x] Error handling протестирован ✅
- [x] Mock database используется корректно ✅

#### Документация
- [x] Создать `backend/mcp-arango/README.md` с: ✅
  - Описанием каждого инструмента
  - Примерами использования
  - Требованиями к окружению
  - Инструкциями по тестированию
- [x] Создать `docs/mcp-arango.md` с примерами команд для Cline ✅
- [ ] Обновить корневой `README.md` с инструкцией по настройке MCP

**Примеры использования (для документации):**

```bash
# После установки MCP-сервера, в Cline можно использовать:

User: "Покажи все коллекции в базе"
Cline → MCP-Arango → arango_list_collections()
→ Ответ: docs(1), sections(3), atoms(15), artifacts(5)...

User: "Добавь индекс на atoms.status"
Cline → MCP-Arango → arango_create_index('atoms', ['status'], 'persistent')
→ Ответ: Index created successfully

User: "Покажи все атомы с locked_by != null"
Cline → MCP-Arango → arango_query('FOR a IN atoms FILTER a.locked_by != null RETURN a')
→ Ответ: [список заблокированных атомов]

User: "Проверь целостность графа"
Cline → MCP-Arango → arango_validate_graph()
→ Ответ: ✅ No issues found. Graph is healthy.
```

**⚠️ Важно:**
- Миграции данных НЕ входят в эту фазу
- Миграция v2.0 → v2.1 вынесена в отдельную фазу 1C-Migration
- Сначала нужно финализировать изменения в схеме БД
- MCP-сервер будет использован для безопасного выполнения миграций

---
**Навигация:** [← Предыдущий раздел](06-detailed-implementation-checklist-phase-1B.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](07a-detailed-implementation-checklist-phase-1C-migration.md)
---
