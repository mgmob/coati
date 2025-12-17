---
**Навигация:** [← Предыдущий раздел](11-detailed-implementation-checklist-phase-3.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](13-detailed-implementation-checklist-phase-5.md)
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
**Навигация:** [← Предыдущий раздел](11-detailed-implementation-checklist-phase-3.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](13-detailed-implementation-checklist-phase-5.md)
---