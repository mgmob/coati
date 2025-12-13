#!/usr/bin/env node
/**
 * Sync n8n Workflows
 *
 * Загружает workflows из JSON файлов в n8n
 * Создает новые или обновляет существующие
 * Использует n8n REST API
 *
 * Использование: node scripts/sync-workflows.js
 * Или: npm run workflows:sync
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Загрузка переменных окружения из корневого .env
// Ищем .env в корне проекта (3 уровня вверх от scripts/)
const envPath = path.resolve(__dirname, '..', '..', '..', '.env');
require('dotenv').config({ path: envPath });

const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOWS_DIR = path.join(__dirname, '../workflows/Coati');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * HTTP/HTTPS запрос
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(N8N_API_KEY ? { 'X-N8N-API-KEY': N8N_API_KEY } : {}),
        ...options.headers
      }
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Получить список всех workflows из n8n
 */
async function getExistingWorkflows() {
  try {
    const response = await makeRequest(`${N8N_URL}/api/v1/workflows`);
    return response.data || [];
  } catch (error) {
    throw new Error(`Не удалось получить список workflows: ${error.message}`);
  }
}

/**
 * Создать новый workflow
 */
async function createWorkflow(workflowData) {
  try {
    const response = await makeRequest(`${N8N_URL}/api/v1/workflows`, {
      method: 'POST',
      body: workflowData
    });
    return response.data || response;
  } catch (error) {
    throw new Error(`Не удалось создать workflow: ${error.message}`);
  }
}

/**
 * Обновить существующий workflow
 * Использует PUT метод и фильтрует поля по схеме n8n API
 */
async function updateWorkflow(id, workflowData) {
  try {
    // Фильтруем поля согласно схеме PUT /workflows/{id}
    // Только допустимые поля: name, nodes, connections, settings
    const filteredData = {
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings || {}
    };

    // Опциональные поля (если есть)
    if (workflowData.staticData) {
      filteredData.staticData = workflowData.staticData;
    }

    const response = await makeRequest(`${N8N_URL}/api/v1/workflows/${id}`, {
      method: 'PUT',
      body: filteredData
    });
    return response.data || response;
  } catch (error) {
    throw new Error(`Не удалось обновить workflow ${id}: ${error.message}`);
  }
}

/**
 * Прочитать все JSON файлы из папки workflows
 */
function readWorkflowFiles() {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    throw new Error(`Папка workflows не найдена: ${WORKFLOWS_DIR}`);
  }

  const files = fs.readdirSync(WORKFLOWS_DIR)
    .filter(file => file.endsWith('.json'));

  if (files.length === 0) {
    throw new Error('Не найдено JSON файлов в папке workflows');
  }

  const workflows = [];
  for (const file of files) {
    const filepath = path.join(WORKFLOWS_DIR, file);
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const workflow = JSON.parse(content);
      workflows.push({ file, workflow });
    } catch (error) {
      log(`⚠️  Ошибка чтения ${file}: ${error.message}`, 'yellow');
    }
  }

  return workflows;
}

/**
 * Главная функция
 */
async function syncWorkflows() {
  console.log('');
  log('═══════════════════════════════════════', 'cyan');
  log('   🔄 SYNC N8N WORKFLOWS', 'cyan');
  log('═══════════════════════════════════════', 'cyan');
  console.log('');

  // Проверка API Key
  if (!N8N_API_KEY) {
    log('❌ ОШИБКА: N8N_API_KEY не найден в .env файле', 'red');
    log('', 'reset');
    log('Пожалуйста, добавьте в .env файл:', 'yellow');
    log('  N8N_API_KEY=your-api-key-here', 'gray');
    console.log('');
    process.exit(1);
  }

  try {
    // Прочитать файлы workflows
    log('📂 Чтение файлов из папки workflows...', 'cyan');
    const workflowFiles = readWorkflowFiles();
    log(`📦 Найдено файлов: ${workflowFiles.length}`, 'cyan');
    console.log('');

    // Получить существующие workflows из n8n
    log('🔄 Получение списка существующих workflows...', 'cyan');
    const existingWorkflows = await getExistingWorkflows();
    log(`📦 В n8n найдено: ${existingWorkflows.length}`, 'cyan');
    console.log('');

    // Создать карту существующих workflows по именам
    const existingMap = new Map();
    for (const wf of existingWorkflows) {
      existingMap.set(wf.name, wf);
    }

    let created = 0;
    let updated = 0;
    let errors = 0;

    // Обработать каждый файл
    for (const { file, workflow } of workflowFiles) {
      const workflowName = workflow.name;
      log(`🔄 Обработка: ${workflowName}`, 'cyan');

      try {
        const existing = existingMap.get(workflowName);

        if (existing) {
          // UPDATE существующего workflow
          await updateWorkflow(existing.id, workflow);
          log(`  ✅ Обновлен: ${workflowName}`, 'green');
          updated++;
        } else {
          // CREATE нового workflow
          await createWorkflow(workflow);
          log(`  ✨ Создан: ${workflowName}`, 'green');
          created++;
        }
      } catch (error) {
        log(`  ❌ Ошибка: ${error.message}`, 'red');
        errors++;
      }
    }

    console.log('');
    log('═══════════════════════════════════════', 'green');
    log('   ✅ SYNC ЗАВЕРШЕН', 'green');
    log('═══════════════════════════════════════', 'green');
    console.log('');
    log(`✨ Создано: ${created}`, 'green');
    log(`🔄 Обновлено: ${updated}`, 'yellow');
    if (errors > 0) {
      log(`❌ Ошибок: ${errors}`, 'red');
    }
    console.log('');
    log('Боже в помощь мою вонми, Господи помощи ми потщися', 'cyan');
    console.log('');

    if (errors > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.log('');
    log('═══════════════════════════════════════', 'red');
    log('   ❌ ОШИБКА SYNC', 'red');
    log('═══════════════════════════════════════', 'red');
    console.log('');
    log(`Ошибка: ${error.message}`, 'red');
    console.log('');
    process.exit(1);
  }
}

// Запуск
syncWorkflows();
