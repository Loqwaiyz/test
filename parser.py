import json
import re
from bs4 import BeautifulSoup


def clean_text(text):
    # Убираем лишние пробелы и неразрывные пробелы
    return text.replace('\xa0', ' ').strip()


def parse_html(file_path):
    all_data = []

    with open(file_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    # Ищем все карточки с вопросами
    cards = soup.find_all("div", class_="card")

    for card in cards:
        # Получаем вопрос целиком
        card_body = card.find("div", class_="card-body")
        # Если не удалось - пропускаем
        if not card_body:
            continue

        # Извлекаем текст вопроса (обычно это первый параграф или текст до первого input/table)
        # Берем первый элемент <p>, который не является заголовком "Статистика:"
        question_p = card_body.find("p")
        if not question_p:
            continue

        # Получаем очищенный текст вопроса
        question_text = clean_text(question_p.get_text())

        multiple = False
        # Получаем input для одиночного ответа
        input = card_body.find("input", {"type": "radio"})
        # Если input'а для одиночного ответа нет, ищем для множественного
        if not input:
            input = card_body.find("input", {"type": "checkbox"})
            multiple = True
        # Если input не найден - пропускаем
        if not input:
            continue
        # Извлекаем текст вариантов ответов
        options_htm = card_body.find_all("input")
        options = []
        for option in options_htm:
            sibling = option.find_next_sibling()
            if (str(sibling).strip() == "<br/>"):
                sibling = option.next_sibling
            opt_text = sibling.get_text(strip=True) if hasattr(
                sibling, 'get_text') else sibling.strip()
            options.append(opt_text)

        # Ищем таблицу со статистикой
        table = card_body.find("table")
        # Если нет статистики правильных ответов - пропускаем
        if not table:
            continue

        correct_answers = []
        answ_stat = table.find_all("tr")

        options_map = dict()
        for row in answ_stat[1:]:  # Пропускаем заголовок таблицы
            data = row.find_all("td")
            option = clean_text(data[0].get_text())
            chosen_by = int(clean_text(data[1].get_text()))
            if not multiple:
                options_map[option] = chosen_by
            else:
                disagree = int(clean_text(data[2].get_text()))
                options_map[option] = chosen_by - disagree
        if not multiple:
            mx = max(options_map.values())
            for option, count in options_map.items():
                if count == mx:
                    correct_answers.append(option)
        else:
            for option, count in options_map.items():
                if count > 0:
                    correct_answers.append(option)
        all_data.append({
            "question": question_text,
            "multiple": multiple,
            "options": options,
            "correctAnswers": correct_answers
        })

    return all_data


# Запуск
try:
    print("Начинаю парсинг HTML...")
    # Убедитесь, что файл называется именно так или поменяйте имя
    results = parse_html("SyncShare.htm")

    # Сохраняем как JSON
    with open("questions.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=4)

    # Сразу создаем questions.js для твоего HTML
    with open("questions.js", "w", encoding="utf-8") as f:
        f.write("const questionsData = " +
                json.dumps(results, ensure_ascii=False, indent=4) + ";")

    print(f"Успех! Извлечено {len(results)} вопросов.")
    print("Созданы файлы: questions.json и questions.js")
except Exception as e:
    print(f"Ошибка: {e}")
