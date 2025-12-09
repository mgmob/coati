/**
 * Скрипт инициализации базы данных ArangoDB для проекта Coati
 * Выполняется в контексте ArangoDB arangosh
 */

const Database = require('@arangodb').Database;
const db = Database._databases().includes('coati') ?
          new Database('coati') : new Database('_system');

// Создание базы данных, если не существует
if (!Database._databases().includes('coati')) {
  db._createDatabase('coati');
  const coatiDb = new Database('coati');
  print('✓ Создана база данных "coati"');

  // Переключаемся на неё
  db = coatiDb;
}

// Функции для создания коллекций и индексов
function createCollectionIfNotExists(name, type = 'document') {
  if (db._collections().some(c => c.name === name)) {
    print(`Коллекция "${name}" уже существует`);
    return;
  }

  if (type === 'edge') {
    db._createEdgeCollection(name);
  } else {
    db._createDocumentCollection(name);
  }
  print(`✓ Создана коллекция "${name}"`);
}

function createPersistentIndex(collection, fields, unique = false) {
  try {
    const collectionObj = db._collection(collection);
    collectionObj.ensureIndex({
      type: "persistent",
      fields: fields,
      unique: unique
    });
    print(`✓ Создан индекс на ${collection}.${fields.join(', ')}`);
  } catch (e) {
    if (!e.message.includes('duplicate value')) {
      throw e;
    }
  }
}

// === ДОКУМЕНТНЫЕ КОЛЛЕКЦИИ ===

// Проекты (основные требования)
createCollectionIfNotExists('projects');

// Этапы проекта с шагами
createCollectionIfNotExists('project_stages');

// Шаги в этапах (модели,_prompts, обязанности)
createCollectionIfNotExists('stage_steps');

// AI модели (OpenAI, Gemini, локальные)
createCollectionIfNotExists('ai_models');

// System prompts (шаблоны инструкций для AI)
createCollectionIfNotExists('system_prompts');

// Вопросы и ответы по требованиям
createCollectionIfNotExists('questions');

// Функциональные требования
createCollectionIfNotExists('requirements');

// Нефункциональные требования
createCollectionIfNotExists('nonfunctional_requirements');

// === ИЗОБЛИЧЕНИЕ КОЛЛЕКЦИИ (РЕЛЯЦИОННОСТЬ) ===

// Связь проект - этапы
createCollectionIfNotExists('project_has_stages', 'edge');

// Связь этап - шаги
createCollectionIfNotExists('stage_has_steps', 'edge');

// Связь шаг - модель AI
createCollectionIfNotExists('step_uses_model', 'edge');

// Связь шаг - system prompt
createCollectionIfNotExists('step_uses_prompt', 'edge');

// Связь требование - вопросы
createCollectionIfNotExists('requirement_has_questions', 'edge');

// Связь требование - подтребования (декомпозиция)
createCollectionIfNotExists('requirement_has_sub', 'edge');

// === ИНДЕКСЫ ===

// Проекты
createPersistentIndex('projects', ['id'], true);
createPersistentIndex('projects', ['created_at']);

// Этапы проектов
createPersistentIndex('project_stages', ['projectId']);
createPersistentIndex('project_stages', ['status']);
createPersistentIndex('project_stages', ['order']);

// Шаги этапов
createPersistentIndex('stage_steps', ['stageId']);
createPersistentIndex('stage_steps', ['type']);
createPersistentIndex('stage_steps', ['status']);

// AI модели
createPersistentIndex('ai_models', ['id'], true);
createPersistentIndex('ai_models', ['provider']);
createPersistentIndex('ai_models', ['name']);

// System prompts
createPersistentIndex('system_prompts', ['id'], true);
createPersistentIndex('system_prompts', ['type']);
createPersistentIndex('system_prompts', ['category']);

// Вопросы
createPersistentIndex('questions', ['id'], true);
createPersistentIndex('questions', ['type']);
createPersistentIndex('questions', ['status']);

// Требования
createPersistentIndex('requirements', ['id'], true);
createPersistentIndex('requirements', ['projectId']);
createPersistentIndex('requirements', ['type']);
createPersistentIndex('requirements', ['priority']);

// Нефункциональные требования
createPersistentIndex('nonfunctional_requirements', ['id'], true);
createPersistentIndex('nonfunctional_requirements', ['projectId']);
createPersistentIndex('nonfunctional_requirements', ['category']);

// === ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ ===

// Полнотекстовый поиск по требованиям
try {
  db.requirements.ensureIndex({
    type: "fulltext",
    fields: ["title", "description"],
    minLength: 3
  });
  print('✓ Создан полнотекстовый индекс для требований');
} catch (e) {
  print('Полнотекстовый индекс для требований уже существует');
}

// Аналитический поиск по вопросам
try {
  db.questions.ensureIndex({
    type: "fulltext",
    fields: ["question", "answer"],
    minLength: 3
  });
  print('✓ Создан полнотекстовый индекс для вопросов');
} catch (e) {
  print('Полнотекстовый индекс для вопросов уже существует');
}

print('\n🎉 Инициализация базы данных завершена!');
print('Доступные коллекции:', db._collections().map(c => c.name));
print('Общее количество коллекций:', db._collections().length);

print('\n💡 Следующие шаги:');
print('1. Запустите seed-database.js для начальных данных');
print('2. Разверните Foxx приложения из arangodb_apps/');
print('3. Проверьте соединение frontend с n8n workflow');
