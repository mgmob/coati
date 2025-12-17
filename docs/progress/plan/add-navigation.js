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

function addNavigation() {
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

    // Создаем навигационную строку
    let navLine = '---\n';
    navLine += '**Навигация:** ';

    if (prevFile) {
      navLine += `[← Предыдущий раздел](${prevFile}) | `;
    }

    navLine += '[Оглавление](00-TOC.md)';

    if (nextFile) {
      navLine += ` | [Следующий раздел →](${nextFile})`;
    }

    navLine += '\n---\n\n';

    // Проверяем, есть ли уже навигация в начале
    if (!content.startsWith('---\n**Навигация:**')) {
      // Добавляем навигацию в начало
      content = navLine + content;
    }

    // Проверяем, есть ли навигация в конце
    const endNav = `---\n**Навигация:**`;
    if (!content.includes(endNav + ' [← Предыдущий раздел]') && !content.endsWith('---\n')) {
      // Находим последний разделитель ---
      const lastDashIndex = content.lastIndexOf('\n---\n');
      if (lastDashIndex !== -1) {
        // Добавляем навигацию после последнего ---
        const before = content.substring(0, lastDashIndex + 5); // +5 для \n---\n
        const after = content.substring(lastDashIndex + 5);

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

        content = before + endNavLine + after;
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Обновлен: ${files[i]}`);
  }
}

addNavigation();
console.log('Навигация добавлена во все файлы!');
