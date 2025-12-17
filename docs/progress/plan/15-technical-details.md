---
**Навигация:** [← Предыдущий раздел](14-component-structure.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](16-time-effort.md)
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
**Навигация:** [← Предыдущий раздел](14-component-structure.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](16-time-effort.md)
---