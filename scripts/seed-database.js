/**
 * Seed скрипт для добавления начальных тестовых данных
 * Выполняется после init-database.js
 */

if (!Database._databases().includes('coati')) {
  print('❌ База данных "coati" не найдена! Сначала запустите init-database.js');
  exit(0);
}

const db = new Database('coati');
print('📋 Заполнение базы тестовыми данными...');

// === СИСТЕМНЫЕ ДАННЫЕ ===

// AI модели
const aiModels = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', type: 'chat', capabilities: ['text'], context_window: 128000 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', type: 'chat', capabilities: ['text'], context_window: 128000 },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', type: 'chat', capabilities: ['text'], context_window: 32000 },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', type: 'chat', capabilities: ['text'], context_window: 200000 },
];

aiModels.forEach(model => {
  try {
    db.ai_models.insert(model);
    print(`✓ Добавлена AI модель: ${model.name}`);
  } catch (e) {
    print(`Модель ${model.name} уже существует`);
  }
});

// System prompts
const systemPrompts = [
  {
    id: 'requirements-extractor',
    name: 'Извлечение требований',
    type: 'extraction',
    category: 'analysis',
    prompt: 'Ты эксперт по анализу бизнес-требований. Извлеки все функциональные и нефункциональные требования из предоставленного текста. Структурируй их по категориям.'
  },
  {
    id: 'qa-generator',
    name: 'Генератор Q&A',
    type: 'generation',
    category: 'qa',
    prompt: 'Создай поиск вопросов и ответов, которые помогут тостовым пользователям понять приведенные требованиям. Опиши то, удовлетворительно и понятно.'
  },
  {
    id: 'quality-assessor',
    name: 'Оценка качества требований',
    type: 'analysis',
    category: 'quality',
    prompt: 'Оцени качество предоставленных требований по критериям: четкость, полнота, непротиворечивость, выполнимость, тестируемость. Дай конкретные рекомендации по улучшению.'
  }
];

systemPrompts.forEach(prompt => {
  try {
    db.system_prompts.insert(prompt);
    print(`✓ Добавлен system prompt: ${prompt.name}`);
  } catch (e) {
    print(`Prompt ${prompt.name} уже существует`);
  }
});

// === ТЕСТОВЫЕ ПРОЕКТ И ДАННЫЕ ===

// Создание тестового проекта
let testProject;
try {
  testProject = db.projects.insert({
    id: 'demo-project-001',
    name: 'Демо-проект: Система управления задачами',
    description: 'Пример проект для демонстрации возможностей системы Coati',
    status: 'active',
    created_at: new Date().toISOString(),
    priority: 'high'
  });
  print(`✓ Создан демо-проект: ${testProject.name}`);
} catch (e) {
  testProject = db.projects.firstExample({ id: 'demo-project-001' });
  print(`Демо-проект уже существует: ${testProject.name}`);
}

// Создание этапов проекта
const stages = [
  {
    id: 'requirements-analysis',
    name: 'Анализ требований',
    status: 'completed',
    order: 1,
    description: 'Сбор и анализ пользовательских требований'
  },
  {
    id: 'technical-design',
    name: 'Техническое проектирование',
    status: 'active',
    order: 2,
    description: 'Проектирование архитектуры и API'
  },
  {
    id: 'implementation',
    name: 'Разработка',
    status: 'pending',
    order: 3,
    description: 'Реализация запланированного решения'
  },
  {
    id: 'testing',
    name: 'Тестирование',
    status: 'pending',
    order: 4,
    description: 'Функциональное и приемочное тестирование'
  }
];

stages.forEach(stage => {
  try {
    const stageDoc = db.project_stages.insert(stage);
    // Создание связи проект-этап
    db.project_has_stages.insert({
      _from: `projects/${testProject._key}`,
      _to: `project_stages/${stageDoc._key}`,
      type: 'has_stage'
    });
    print(`✓ Создан этап проекта: ${stage.name} (${stage.status})`);
  } catch (e) {
    print(`Этап ${stage.name} уже существует`);
  }
});

// Создание шагов для текущего этапа технического проектирования
const currentStage = db.project_stages.firstExample({ order: 2 });
if (currentStage) {
  const steps = [
    {
      id: 'api-design',
      type: 'design',
      name: 'Проектирование API',
      is_required: true,
      order: 1,
      status: 'completed',
      config: {
        description: 'Определить endpoints и структуры данных'
      }
    },
    {
      id: 'db-schema',
      type: 'design',
      name: 'Проектирование БД',
      is_required: true,
      order: 2,
      status: 'completed',
      config: {
        description: 'Определить коллекции и связи в ArangoDB'
      }
    },
    {
      id: 'ui-wireframes',
      type: 'design',
      name: 'Черновики интерфейса',
      is_required: false,
      order: 3,
      status: 'in_progress',
      config: {
        description: 'Создать wireframes основных экранов'
      }
    }
  ];

  steps.forEach(step => {
    try {
      const stepDoc = db.stage_steps.insert(step);
      // Связь этап-шаг
      db.stage_has_steps.insert({
        _from: `project_stages/${currentStage._key}`,
        _to: `stage_steps/${stepDoc._key}`,
        type: 'has_step'
      });
      print(`✓ Добавлен шаг: ${step.name} (${step.status})`);
    } catch (e) {
      print(`Шаг ${step.name} уже существует`);
    }
  });
}

// === ДЕМОНСТРАЦИОННЫЕ ТРЕБОВАНИЯ ===

// Создание демонстрационных требований
const requirements = [
  {
    id: 'req-001',
    title: 'Интерфейс создания проекта',
    description: 'Пользователь должен иметь возможность создать новый проект с названием и описанием',
    type: 'functional',
    priority: 'high',
    status: 'approved',
    projectId: testProject.id
  },
  {
    id: 'req-002',
    title: 'Список проектов',
    description: 'Пользователь должен видеть список всех своих проектов с возможностью сортировки и поиска',
    type: 'functional',
    priority: 'high',
    status: 'approved',
    projectId: testProject.id
  },
  {
    id: 'req-003',
    title: 'Отклик системы не более 2 секунд',
    description: 'Все операции системы должны выполняться не более 2 секунд',
    type: 'non-functional',
    priority: 'medium',
    status: 'approved',
    category: 'performance'
  },
  {
    id: 'req-004',
    title: 'Mobile-friendly интерфейс',
    description: 'Приложение должно корректно работать на мобильных устройствах',
    type: 'non-functional',
    priority: 'high',
    status: 'pending',
    category: 'usability'
  }
];

requirements.forEach(req => {
  try {
    const reqDoc = db.requirements.insert(req);
    print(`✓ Добавлено требование: ${req.title}`);
  } catch (e) {
    print(`Требование ${req.title} уже существует`);
  }
});

// Создание демо вопросов
const demoQuestions = [
  {
    id: 'q-001',
    question: 'Как создать новый проект в системе?',
    answer: '1. Нажмите кнопку "Новый проект" в левом меню\n2. Введите название проекта\n3. При необходимости добавьте описание\n4. Проект будет создан и появится в списке',
    type: 'how-to',
    status: 'approved'
  },
  {
    id: 'q-002',
    question: 'Какие типы требований поддерживает система?',
    answer: 'Система поддерживает:\n- Функциональные требования (что система делает)\n- Нефункциональные требования (производительность, безопасность и т.д.)',
    type: 'informational',
    status: 'approved'
  },
  {
    id: 'q-003',
    question: 'Как отлаживать API запросы?',
    answer: 'Используйте кнопку "Debug API" в левом меню. Откроется панель с живym логом всех API запросов с фильтрами и возможностью экспорта.',
    type: 'troubleshooting',
    status: 'approved'
  }
];

demoQuestions.forEach(q => {
  try {
    const qDoc = db.questions.insert(q);
    print(`✓ Добавлен вопрос: ${q.question}`);
  } catch (e) {
    print(`Вопрос ${q.question} уже существует`);
  }
});

// === СТАТИСТИКА И ЗАВЕРШЕНИЕ ===

const collections = db._collections();
print('\n📊 Статистика заполнения:');
collections.forEach(col => {
  const count = db._collection(col.name)._length || db._collection(col.name).count();
  if (count > 0) {
    print(`- ${col.name}: ${count} документов`);
  }
});

print('\n🎉 Seed завершён!');
print('💡 Теперь можно запускать frontend и n8n для тестирования.');
print('🌐 Frontend: http://localhost:5173');
print('🔗 n8n: http://localhost:5678');
print('🐘 ArangoDB UI: http://localhost:8529');
