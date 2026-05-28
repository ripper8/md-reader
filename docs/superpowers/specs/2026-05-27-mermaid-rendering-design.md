# Спецификация на дизайна: Визуализиране на Mermaid диаграми в MDReader

**Дата:** 27 май 2026 г.  
**Статус:** Одобрен от потребителя  

---

## 1. Цел
Да се добави функционалност за динамично и красиво визуализиране на Mermaid диаграми директно в прегледа (Preview) на Markdown редактора MDReader. Потребителите трябва да могат да пишат Mermaid синтаксис в кодови блокове (означени с \`mermaid\`) и да виждат интерактивни, стилизирани графики в реално време, съобразени с избраната цветова тема на приложението.

---

## 2. Изисквания

### Функционални изисквания:
1. **Интеграция с Marked**: При парсване на Markdown, кодовите блокове с език `mermaid` се трансформират в специални HTML контейнери с атрибути, вместо в стандартни `<pre><code>`.
2. **Синхронизация с темата**: Диаграмите се рендират с `theme: 'default'` при светла тема и `theme: 'dark'` при тъмна тема на редактора.
3. **Хващане на синтактични грешки**: Ако потребителят въведе невалиден Mermaid код по време на писане, диаграмата временно се заменя с премиум стилизирано червено поле за грешка, показващо синтактичните детайли без да се чупи приложението.
4. **Експортиране към HTML**: При натискане на бутона "Export to HTML", генерираният HTML съдържа CDN скрипт за автоматично зареждане и динамично изчертаване на Mermaid диаграмите в браузъра.

---

## 3. Архитектура и техническо изпълнение

### А. Зависимости
Инсталиране на официалния `mermaid` npm пакет:
```json
"dependencies": {
  "mermaid": "^11.4.0"
}
```

### Б. Промени по компонентите

#### 1. [App.tsx](file:///d:/projects/MDReader/src/App.tsx)
*   Предаване на променливата за тема `isDark` към компонента `<Preview />`:
    ```tsx
    <Preview content={content} scrollRatio={scrollRatio} isDark={isDark} />
    ```
*   Обновяване на `handleExportHtml` за включване на CDN скрипт и стилове за Mermaid:
    ```html
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
      mermaid.initialize({ startOnLoad: true, theme: 'default' });
    </script>
    ```

#### 2. [Preview.tsx](file:///d:/projects/MDReader/src/components/Preview.tsx)
*   **Нов интерфейс за props**:
    ```tsx
    interface PreviewProps {
      content: string
      scrollRatio: number
      isDark: boolean
    }
    ```
*   **Custom Renderer на Marked**:
    ```tsx
    renderer.code = function ({ text, lang }) {
      if (lang === 'mermaid') {
        const encoded = encodeURIComponent(text);
        return `<div class="mermaid-diagram-container" data-code="${encoded}"></div>`;
      }
      // Стандартно поведение за други езици...
    }
    ```
*   **useEffect за рендиране на SVG**:
    При промяна на `content` или `isDark`, се изпълнява ефект, който:
    *   Инициализира `mermaid` с правилната тема: `mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default', securityLevel: 'loose' })`.
    *   Асинхронно извлича всички елементи с клас `.mermaid-diagram-container`.
    *   Генерира уникално ID: `mermaid-svg-${index}` и извиква `await mermaid.render(id, decodedCode)`.
    *   В случай на грешка, улавя изключението с `try-catch`, изчиства евентуалните остатъчни DOM елементи, които Mermaid създава в `body`, и инжектира красива кутия с грешка.

---

## 4. Стилизация (CSS)

В [src/index.css](file:///d:/projects/MDReader/src/index.css) ще добавим:

```css
/* Контейнер на диаграмата */
.mermaid-diagram-container {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0;
  padding: 1rem;
  background-color: var(--mermaid-bg, #ffffff);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
  transition: all 0.2s ease;
  overflow-x: auto;
}

[data-theme="dark"] .mermaid-diagram-container {
  --mermaid-bg: #12151a;
}

/* Кутия за синтактична грешка */
.mermaid-error-box {
  width: 100%;
  padding: 1rem;
  margin: 1rem 0;
  border-left: 4px solid #ef4444;
  background-color: #fef2f2;
  border-radius: 0 8px 8px 0;
  color: #991b1b;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

[data-theme="dark"] .mermaid-error-box {
  background-color: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
  border-left-color: #f87171;
}

.mermaid-error-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #b91c1c;
}

[data-theme="dark"] .mermaid-error-title {
  color: #fca5a5;
}
```

---

## 5. Верификация
1. **Функционален тест**: Създаване на `.md` файл с тестовата Mermaid диаграма, предоставена от потребителя. Уверяване, че диаграмата се рендира коректно.
2. **Синхронизация на теми**: Превключване между Light/Dark режим и проверка дали темата на Mermaid диаграмата веднага се пренастройва и изглежда отлично.
3. **Редактиране в реално време**: Бързо писане в редактора, за да се гарантира, че няма увисвания или сривове при невалиден синтаксис.
4. **Валидация на експорта**: Експортиране на файла към HTML, отварянето му в браузъра и верификация, че диаграмата се визуализира коректно там.
