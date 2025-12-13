#!/usr/bin/env node
/**
 * Backup n8n Workflows
 *
 * Выгружает все workflows из n8n в JSON файлы
 * Использует n8n REST API
 *
 * Использование: node scripts/backup-workflows.js
 * Или: npm run workflows:backup
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
 * Получить список всех workflows
 */
async function getWorkflows() {
  log('🔄 Получение списка workflows из n8n...', 'cyan');

  try {
    const response = await makeRequest(`${N8N_URL}/api/v1/workflows`);
    return response.data || [];
  } catch (error) {
    throw new Error(`Не удалось получить список workflows: ${error.message}`);
  }
}

/**
 * Получить полную информацию о workflow
 */
async function getWorkflowDetails(id) {
  try {
    const response = await makeRequest(`${N8N_URL}/api/v1/workflows/${id}`);
    return response.data || response;
  } catch (error) {
    throw new Error(`Не удалось получить детали workflow ${id}: ${error.message}`);
  }
}

/**
 * Очистить workflow от служебной информации
 */
function cleanWorkflow(workflow) {
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    active: workflow.active,
    settings: workflow.settings || {},
    pinData: workflow.pinData || {},
    tags: workflow.tags || []
  };
}

/**
 * Определить папку для workflow на основе названия
 */
function getWorkflowFolder(workflowName) {
  // RAG workflows → папка RAG
  if (workflowName.startsWith('RAG:') || workflowName.startsWith('RAG ')) {
    return path.join(path.dirname(WORKFLOWS_DIR), 'RAG');
  }
  // Тестовые workflows → пропускаем
  if (workflowName.startsWith('My workflow')) {
    return null;
  }
  // Дублирующиеся workflows (функции есть в Coati Data API) → пропускаем
  if (workflowName === 'API - Projects' || workflowName === 'API - Create Project') {
    return null;
  }
  // Остальные → папка Coati (API, Coati Data API и т.д.)
  return WORKFLOWS_DIR;
}

/**
 * Очистить имя файла от недопустимых символов
 */
function sanitizeFilename(filename) {
  // Заменить недопустимые символы для Windows: < > : " / \ | ? *
  return filename.replace(/[<>:"/\\|?*]/g, '-');
}

/**
 * Сохранить workflow в файл
 */
function saveWorkflow(workflow, filename) {
  const folder = getWorkflowFolder(workflow.name);

  // Пропустить, если папка null (тестовые workflows)
  if (!folder) {
    log(`  ⏭️  Пропущен: ${filename} (тестовый)`, 'gray');
    return false;
  }

  // Создать папку если не существует
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  // Очистить имя файла от недопустимых символов
  const safeFilename = sanitizeFilename(filename);

  const filepath = path.join(folder, safeFilename);
  fs.writeFileSync(filepath, JSON.stringify(workflow, null, 2), 'utf8');
  log(`  ✅ Сохранен: ${safeFilename}`, 'green');
  return true;
}

/**
 * Главная функция
 */
async function backupWorkflows() {
  console.log('');
  log('═══════════════════════════════════════', 'cyan');
  log('   🔄 BACKUP N8N WORKFLOWS', 'cyan');
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

  // Проверка/создание папки workflows
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
    log(`📁 Создана папка: ${WORKFLOWS_DIR}`, 'yellow');
  }

  try {
    // Получить список workflows
    const workflows = await getWorkflows();
    log(`📦 Найдено workflows: ${workflows.length}`, 'cyan');
    console.log('');

    if (workflows.length === 0) {
      log('⚠️  Нет workflows для backup', 'yellow');
      console.log('');
      return;
    }

    // Backup каждого workflow
    for (const workflow of workflows) {
      log(`🔄 Обработка: ${workflow.name}`, 'cyan');

      // Получить полные данные
      const fullWorkflow = await getWorkflowDetails(workflow.id);

      // Очистить от служебной информации
      const cleanedWorkflow = cleanWorkflow(fullWorkflow);

      // Сохранить в файл
      const filename = `${workflow.name}.json`;
      saveWorkflow(cleanedWorkflow, filename);
    }

    console.log('');
    log('═══════════════════════════════════════', 'green');
    log('   ✅ BACKUP ЗАВЕРШЕН УСПЕШНО', 'green');
    log('═══════════════════════════════════════', 'green');
    console.log('');
    log(`📁 Файлы сохранены в: ${WORKFLOWS_DIR}`, 'gray');
    console.log('');
    log('Боже в помощь мою вонми, Господи помощи ми потщися', 'cyan');
    console.log('');

  } catch (error) {
    console.log('');
    log('═══════════════════════════════════════', 'red');
    log('   ❌ ОШИБКА BACKUP', 'red');
    log('═══════════════════════════════════════', 'red');
    console.log('');
    log(`Ошибка: ${error.message}`, 'red');
    console.log('');
    process.exit(1);
  }
}

// Запуск
backupWorkflows();
