from bs4 import BeautifulSoup

with open('billing.xml', 'r', encoding='utf-8') as f:
    content = f.read()

soup = BeautifulSoup(content, 'lxml')

transactions = []

for container in soup.find_all('div', class_='stage-1hwl07i-Flexbox-container'):
    try:
        type_elem = container.find('span', class_='stage-1y0l9r1-Text-container')
        type_text = type_elem.text.strip() if type_elem else ''
        model_elem = container.find('span', class_='stage-xp73ge-Text-container')
        model_text = model_elem.text.strip() if model_elem else ''
        date_time_spans = container.find_all('span', class_='stage-1stirej-Text-container')
        date_elem = date_time_spans[0].text.strip() if date_time_spans else ''
        time_elem = date_time_spans[1].text.strip() if len(date_time_spans) > 1 else ''
        amount_elem = container.find('span', class_='stage-81qmp1-Text-container')
        amount_text = amount_elem.text.strip().replace('\xa0', ' ').replace('₽', '') if amount_elem else ''
        amount_num = float(amount_text.replace(',', '.')) if amount_text else 0.0
        transactions.append({
            'type': type_text,
            'model': model_text,
            'date': date_elem,
            'time': time_elem,
            'amount': amount_num
        })
    except Exception as e:
        print(f'Ошибка при обработке контейнера: {e}')
        pass

import json

with open('billing_extracted.json', 'w', encoding='utf-8') as f:
    json.dump(transactions, f, ensure_ascii=False, indent=2)

print(f'Извлечено {len(transactions)} транзакций.')
