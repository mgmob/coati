#!/bin/bash

# Setup script for Coati development environment
# Run this once after cloning the repository

echo "🚀 Настройка development окружения Coati..."
echo

# Wait for containers to be ready
echo "⏳ Ожидание запуска контейнеров..."
sleep 10

# Initialize database
echo "📄 Создание коллекций и индексов..."
docker compose exec arangodb arangosh --server.database _system --javascript.execute /scripts/init-database.js --init-database.js

# Seed database with test data
echo "🌱 Заполнение тестовыми данными..."
docker compose exec arangodb arangosh --server.database coati --javascript.execute /scripts/seed-database.js --seed-database.js

echo
echo "✅ Development окружение настроено!"
echo
echo "Доступ к сервисам:"
echo "- Frontend: http://localhost:5173"
echo "- n8n:      http://localhost:5678"
echo "- ArangoDB: http://localhost:8529 (_system/coati)"
echo
echo "Начните с создания GitHub репозитория и публикации кода!"
