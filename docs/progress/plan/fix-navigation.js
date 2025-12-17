const fs = require('fs');
const path = require('path');

const files = [
  '00-TOC.md',
  '01-current-state.md',
  '02-naming-convention.md',
  '03-implementation-plan.md',
  '04-detailed-implementation-checklist-phase-1.md',
  '05-detailed-implementation-checklist-phase-1A.md',
  '06-detailed-implementation-checklist-phase-1B.md',
  '07-detailed-implementation-checklist-phase-1C.md',
  '08-detailed-implementation-checklist-phase-1D.md',
  '09-detailed-implementation-checklist-phase-1E.md',
  '10-detailed-implementation-checklist-phase-2.md',
  '11-detailed-implementation-checklist-phase-3.md',
  '12-detailed-implementation-checklist-phase-4.md',
  '13-detailed-implementation-checklist-phase-5.md',
  '14-component-structure.md',
  '15-technical-details.md',
  '16-time-effort.md',
  '17-risks.md',
  '18-next-step.md',
  '19-mvp-success-criteria.md',
  '20-related-docs.md'
];

function addEndNavigation() {
  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(__dirname, files[i]);

    if (!fs.existsSync(filePath)) {
      console.log(`Файл не найден: ${files[i]}`);
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Определяем предыдущий и следующий файлы
    const prevFile = i > 0 ? files[i-1] : null;
    const nextFile = i < files.length - 1 ? files[i+1] : null;

    // Проверяем, есть ли навигация в конце
    const hasEndNav = content.includes('\n---\n**Навигация:**') &&
                     (content.includes('[← Предыдущий раздел]') ||
                      content.includes('[Следующий раздел →]'));

    if (!hasEndNav) {
      // Создаем навигационную строку для конца
      let endNavLine = '\n---\n';
      endNavLine += '**Навигация:** ';

      if (prevFile) {
        endNavLine += `[← Предыдущий раздел](${prevFile}) | `;
      }

      endNavLine += '[Оглавление](00-TOC.md)';

      if (nextFile) {
        endNavLine += ` | [Следующий раздел →](${nextFile})`;
      }

      endNavLine += '\n---\n';

      // Проверяем, как заканчивается файл
      if (content.trim().endsWith('---')) {
        // Заменяем последний --- на навигацию
        const lines = content.split('\n');
        let lastDashIndex = -1;

        for (let j = lines.length - 1; j >= 0; j--) {
          if (lines[j].trim() === '---') {
            lastDashIndex = j;
            break;
          }
        }

        if (lastDashIndex !== -1) {
          // Удаляем старый --- и добавляем навигацию
          lines[lastDashIndex] = endNavLine.trim();
          content = lines.join('\n');
        } else {
          // Просто добавляем в конец
          content = content.trim() + endNavLine;
        }
      } else {
        // Добавляем в конец
        content = content.trim() + endNavLine;
      }

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Исправлен конец: ${files[i]}`);
    }
  }
}

addEndNavigation();
console.log('Навигация в конце файлов исправлена!');
