import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target files
const commonPath = path.resolve(__dirname, '../src/sdk/src/components/common.ts');
const mediaPath = path.resolve(__dirname, '../src/sdk/src/components/media.ts');
const metadataPath = path.resolve(__dirname, '../src/pages/wiki/docs-metadata.json');

const componentsMetadata = {
  VStack: {
    title: "VStack (Вертикальный стек)",
    description: "Контейнер, который выстраивает дочерние компоненты вертикально друг под другом.",
    example: `// Вертикальный стек
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(20)
    .alignItems("center")
    .child(Heading("Заголовок"))
    .child(Text("Параграф текста под заголовком."))
    .child(Button("Ок"))
);`,
    methods: {},
    extendsLayout: true
  },
  HStack: {
    title: "HStack (Горизонтальный стек)",
    description: "Контейнер, который выстраивает дочерние компоненты горизонтально слева направо.",
    example: `// Горизонтальный стек
const { ui } = PotokSDK;

ui.render(
  HStack()
    .spacing(15)
    .justifyContent("between")
    .alignItems("center")
    .child(Text("Элемент 1"))
    .child(Text("Элемент 2"))
    .child(Button("Кнопка"))
);`,
    methods: {},
    extendsLayout: true
  },
  Grid: {
    title: "Grid (Сетка)",
    description: "Контейнер, который отрисовывает адаптивную сетку ячеек с фиксированной минимальной шириной колонки.",
    example: `// Адаптивная сетка
const { ui } = PotokSDK;

ui.render(
  Grid()
    .minWidth("8rem")
    .gap("1rem")
    .child(Card().title("Карточка 1").child(Text("Текст")))
    .child(Card().title("Карточка 2").child(Text("Текст")))
    .child(Card().title("Карточка 3").child(Text("Текст")))
);`,
    methods: {
      minWidth: {
        argument: "string",
        description: "Минимально допустимая ширина одной колонки сетки (например, '12rem').",
        default: "'180px'"
      },
      gap: {
        argument: "string",
        description: "Зазор/отступ между ячейками сетки (например, '1rem').",
        default: "'var(--space-m)'"
      }
    },
    extendsLayout: true
  },
  Card: {
    title: "Card (Стеклянная карточка)",
    description: "Панель-карточка с границами, размытием и эффектом матового стекла (glassmorphism). Используется для визуальной группировки логических блоков.",
    example: `// Карточка
const { ui } = PotokSDK;

ui.render(
  Card()
    .title("Основные сведения")
    .subtitle("Дополнительная информация")
    .child(Text("Внутри карточки находится этот текст."))
);`,
    methods: {
      title: {
        argument: "string",
        description: "Заголовок карточки, выводимый в её верхней части."
      },
      subtitle: {
        argument: "string",
        description: "Подзаголовок карточки, выводимый мелким приглушенным шрифтом."
      },
      child: {
        argument: "UIComponent",
        description: "Вкладывает один дочерний компонент внутрь тела карточки."
      }
    }
  },
  Divider: {
    title: "Divider (Разделитель)",
    description: "Горизонтальная тонкая линия-разделитель для визуального отделения блоков контента или строк в списках.",
    example: `// Разделитель
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(12)
    .child(Text("Текст сверху"))
    .child(Divider())
    .child(Text("Текст снизу"))
);`,
    methods: {}
  },
  Spacer: {
    title: "Spacer (Распорка)",
    description: "Пустой упругий элемент (распорка), заполняющий все доступное свободное пространство во флекс-контейнере. Полезен внутри HStack или VStack для прижатия элементов к краям.",
    example: `// Распорка
const { ui } = PotokSDK;

ui.render(
  HStack()
    .child(Text("Левая сторона"))
    .child(Spacer())
    .child(Text("Правая сторона"))
);`,
    methods: {}
  },
  Heading: {
    title: "Heading (Заголовок)",
    description: "Компонент для вывода крупных структурированных заголовков разного уровня (аналог тегов h1-h4).",
    example: `// Заголовки
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(12)
    .child(Heading("Главный заголовок H1").level(1))
    .child(Heading("Подзаголовок уровня H2").level(2))
    .child(Heading("Раздел H3").level(3))
    .child(Heading("Мелкий заголовок H4").level(4))
);`,
    methods: {
      level: {
        argument: "number (1-4)",
        description: "Определяет размер и важность заголовка (1 — самый большой, 4 — самый маленький).",
        default: "1"
      }
    }
  },
  Text: {
    title: "Text (Обычный текст)",
    description: "Основной текстовый элемент для вывода описаний, подписей, ошибок или любого другого неструктурированного контента.",
    example: `// Оформление текстов
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(10)
    .child(Text("Это стандартный основной текст (primary).").variant("primary"))
    .child(Text("Это второстепенный текст описания (secondary).").variant("secondary").size("sm"))
    .child(Text("Успешная операция завершена (success).").variant("success").bold(true))
    .child(Text("Приглушённая подсказка (hint).").variant("hint"))
    .child(Text("Критическая ошибка приложения (error).").variant("error").size("lg").bold(true))
);`,
    methods: {
      variant: {
        argument: "'primary' | 'secondary' | 'success' | 'warning' | 'error'",
        description: "Цветовой вариант текста (тема). Обычный, приглушенный серый, зеленый, желтый или красный соответственно.",
        default: "'primary'"
      },
      size: {
        argument: "'sm' | 'md' | 'lg' | 'xl'",
        description: "Задает размер шрифта текста.",
        default: "'md'"
      },
      bold: {
        argument: "boolean",
        description: "Делает начертание шрифта жирным при значении true.",
        default: "false"
      }
    }
  },
  Badge: {
    title: "Badge (Бейдж)",
    description: "Компактная закругленная метка с цветным фоном. Подходит для вывода качества видео, статусов подписки, меток «Новинка» и других тегов.",
    example: `// Бейджи
const { ui } = PotokSDK;

ui.render(
  HStack()
    .spacing(8)
    .child(Badge("FullHD").color("info"))
    .child(Badge("Новое").color("success"))
    .child(Badge("Популярное").color("warning"))
    .child(Badge("18+").color("error"))
);`,
    methods: {
      color: {
        argument: "'info' | 'success' | 'warning' | 'error'",
        description: "Цветовая схема заливки бейджа.",
        default: "'info'"
      }
    }
  },
  StatusRow: {
    title: "StatusRow (Строка статуса)",
    description: "Компонент для отображения состояния внешних систем или соединений с цветным индикатором (точкой) и текстовым значением.",
    example: `// Строки статуса
const { ui } = PotokSDK;

ui.render(
  Card()
    .title("Состояние системы")
    .child(
      VStack()
        .spacing(8)
        .child(StatusRow("Основной сервер (BFF)").status("success").value("Активен (18ms)"))
        .child(StatusRow("Локальный прокси-сервер").status("warning").value("Таймаут (450ms)"))
        .child(StatusRow("Резервное зеркало").status("offline").value("Недоступно"))
    )
);`,
    methods: {
      status: {
        argument: "'success' | 'warning' | 'offline'",
        description: "Состояние статуса (меняет цвет точки: зеленый/желтый/серый соответственно)."
      },
      value: {
        argument: "string",
        description: "Текстовое значение, выравниваемое по правому краю строки (например, '24 ms' или 'v1.2.0')."
      }
    }
  },
  Markdown: {
    title: "Markdown (Рендеринг разметки)",
    description: "Компонент для форматированного вывода текста с поддержкой списков, жирного шрифта, таблиц и гиперссылок. Безопасно парсит Markdown разметку, исключая XSS-уязвимости.",
    example: `// Рендеринг Markdown
const { ui } = PotokSDK;

const markdownContent = \`# Описание плагина
Этот плагин позволяет осуществлять быстрый поиск фильмов по открытым базам.

## Возможности
* Просмотр постеров в высоком качестве
* Быстрая фильтрация по раздачам
* Интеграция с VLC-плеером
\`;

ui.render(
  Card()
    .title("Справка")
    .child(
      // content() позволяет заменить разметку динамически уже после создания компонента
      Markdown("# Загрузка…").content(markdownContent)
    )
);`,
    methods: {
      content: {
        argument: "string",
        description: "Задает или динамически обновляет текстовое содержимое Markdown разметки. Позволяет перезаписать текст после вызова конструктора."
      }
    }
  },
  Button: {
    title: "Button (Кнопка)",
    description: "Интерактивный элемент интерфейса для выполнения различных действий, запуска воспроизведения или переходов по страницам.",
    example: `// Кнопки управления
const { ui } = PotokSDK;

ui.render(
  Card()
    .title("Управление плеером")
    .child(
      HStack()
        .spacing(10)
        .child(Button("Смотреть").variant("primary").icon("play").onClick(() => ui.showHUD("success", "Воспроизведение...")))
        .child(Button("Настройки").variant("secondary").icon("settings").onClick(() => ui.showHUD("info", "Открываем настройки...")))
        .child(Button("Удалить").variant("danger").icon("trash").onClick(() => ui.showHUD("error", "Элемент удален")))
    )
);`,
    methods: {
      variant: {
        argument: "'primary' | 'secondary' | 'danger' | 'ghost' | 'sidebar-item'",
        description: "Визуальный стиль кнопки (основной цвет акцента, нейтральный серый, красный предупреждающий, прозрачный фон или стиль элемента бокового меню).",
        default: "'secondary'"
      },
      icon: {
        argument: "string",
        description: "Имя иконки из коллекции Lucide (например, 'play', 'settings', 'trash'). Иконка отрисовывается перед текстом."
      },
      onClick: {
        argument: "CallbackFunction",
        description: "Коллбек-функция обратного вызова, срабатывающая при клике на кнопку."
      }
    }
  },
  Input: {
    title: "Input (Поле ввода)",
    description: "Текстовое поле ввода для заполнения данных форм, адресов серверов, ключей авторизации или фильтров.",
    example: `// Ввод данных формы
const { ui, createState } = PotokSDK;

const state = createState({ username: "", password: "" });

function draw() {
  ui.render(
    Card()
      .title("Авторизация")
      .child(
        VStack()
          .spacing(12)
          .child(
            Input("login")
              .label("Имя пользователя")
              .placeholder("Введите email")
              .value(state.username)
              .onChange((v) => state.username = v)
          )
          .child(
            Input("password")
              .label("Пароль")
              .placeholder("••••••••")
              .inputType("password")
              .value(state.password)
              .onChange((v) => state.password = v)
          )
      )
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      label: {
        argument: "string",
        description: "Заголовок (ярлык), отображаемый непосредственно над полем ввода."
      },
      placeholder: {
        argument: "string",
        description: "Текст подсказки, отображаемый внутри пустого поля ввода."
      },
      inputType: {
        argument: "string ('text' | 'password' | 'number')",
        description: "Задает тип вводимых данных. Изменяет поведение поля и маскирует ввод для 'password'.",
        default: "'text'"
      },
      type: {
        argument: "string",
        description: "Устаревший (deprecated) синоним для inputType."
      },
      value: {
        argument: "string",
        description: "Текущее текстовое значение поля.",
        default: "''"
      },
      onChange: {
        argument: "CallbackFunction",
        description: "Обработчик ввода текста, вызываемый при каждом изменении значения."
      }
    }
  },
  Toggle: {
    title: "Toggle (Переключатель)",
    description: "Интерактивный переключатель (чекбокс/свитч) для активации/деактивации булевых параметров конфигурации.",
    example: `// Переключатель настроек
const { ui, createState } = PotokSDK;
const state = createState({ autoplay: false });

function draw() {
  ui.render(
    Toggle("autoplay-toggle")
      .label("Автовоспроизведение")
      .description("Воспроизводить следующую серию автоматически")
      .value(state.autoplay)
      .onChange((v) => {
        state.autoplay = v;
        ui.showHUD("info", "Автовоспроизведение: " + (v ? "ВКЛ" : "ВЫКЛ"));
      })
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      label: {
        argument: "string",
        description: "Текстовый ярлык, отображаемый справа от переключателя."
      },
      description: {
        argument: "string",
        description: "Дополнительное описание (текст мелким шрифтом), отображаемое под меткой переключателя."
      },
      value: {
        argument: "boolean",
        description: "Текущее булево состояние переключателя (true / false).",
        default: "false"
      },
      checked: {
        argument: "boolean",
        description: "Устаревший (deprecated) синоним для value."
      },
      onChange: {
        argument: "CallbackFunction",
        description: "Обработчик клика, возвращающий новое булево состояние свитча."
      }
    }
  },
  Select: {
    title: "Select (Выпадающий список)",
    description: "Компонент выпадающего списка (Dropdown) для выбора одного текстового значения из предопределенного массива вариантов. Поддерживает группировку элементов по категориям при помощи разделителей и заголовков.",
    example: `// Настройки фильтрации с категориями и множественным выбором
const { ui, createState } = PotokSDK;
const state = createState({ activeFilters: ["1080p", "dub"] });

function draw() {
  ui.render(
    Select("filter-select")
      .label("Фильтры поиска")
      .variant("glass")
      .icon("Filter")
      .multiple(true)
      .closeOnSelect(false)
      .resetLabel("Сбросить всё")
      .resetValue([])
      .options([
        { type: "header", label: "Разрешение" },
        { value: "2160p", label: "4K (2160p)" },
        { value: "1080p", label: "Full HD (1080p)" },
        { value: "720p", label: "HD (720p)" },
        { type: "divider" },
        { type: "header", label: "Озвучка" },
        { value: "dub", label: "Дубляж" },
        { value: "sub", label: "Субтитры" }
      ])
      .value(state.activeFilters)
      .onChange((newVals) => {
        state.activeFilters = newVals;
        ui.showHUD("success", "Выбрано: " + newVals.join(", "));
      })
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      label: {
        argument: "string",
        description: "Заголовок списка, выводимый над полем выбора."
      },
      options: {
        argument: "{ value?: string, label?: string, type?: string }[]",
        description: "Массив доступных элементов списка. Опции могут содержать текстовое значение и код, а также выступать в роли разделителей ({ type: 'divider' }) или заголовков категорий ({ type: 'header', label: 'Текст' }).",
        default: "[]"
      },
      value: {
        argument: "string | string[]",
        description: "Текущее выбранное значение или массив выбранных значений при множественном выборе (multiple).",
        default: "''"
      },
      selected: {
        argument: "string | string[]",
        description: "Устаревший (deprecated) синоним для value."
      },
      onChange: {
        argument: "CallbackFunction",
        description: "Вызывается при выборе нового элемента или элементов из списка. Передает выбранное значение или массив значений при множественном выборе (multiple)."
      },
      variant: {
        argument: "'default' | 'glass'",
        description: "Визуальный стиль выпадающего списка. 'default' — стандартное поле формы, 'glass' — стильная полупрозрачная кнопка с размытием (аналогичная кнопкам в верхней панели фильтров).",
        default: "'default'"
      },
      icon: {
        argument: "string",
        description: "Имя иконки из библиотеки Lucide для отображения внутри кнопки слева (применяется только если variant: 'glass', например: 'Flame', 'Settings', 'Filter')."
      },
      closeOnSelect: {
        argument: "boolean",
        description: "Определяет, закрывать ли меню при выборе элемента. По умолчанию true для обычного выбора и false при множественном выборе (multiple).",
        default: "true"
      },
      multiple: {
        argument: "boolean",
        description: "Включает режим множественного выбора. Выбранные значения возвращаются в виде массива, а клики по опциям переключают их активность без автоматического закрытия меню.",
        default: "false"
      },
      resetLabel: {
        argument: "string",
        description: "Текст кнопки сброса параметров внизу поповера (если задан, кнопка сброса будет отображаться)."
      },
      resetValue: {
        argument: "string | string[]",
        description: "Значение, устанавливаемое при нажатии на кнопку сброса параметров (например, пустой массив [] для множественного выбора).",
        default: "''"
      }
    }
  },
  CodeEditor: {
    title: "CodeEditor (Редактор кода)",
    description: "Встроенный полнофункциональный редактор кода на базе Monaco. Поддерживает подсветку синтаксиса, автодополнение, номера строк и форматирование кода.",
    example: `// Редактор кода Monaco
const { ui, createState } = PotokSDK;
const state = createState({ code: "console.log('Привет, мир!');" });

function draw() {
  ui.render(
    VStack()
      .spacing(12)
      .child(
        CodeEditor("js-editor")
          .label("Редактор скриптов")
          .value(state.code)
          .readOnly(false)
          .onChange((v) => state.code = v)
      )
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      label: {
        argument: "string",
        description: "Заголовок-подпись над контейнером редактора."
      },
      value: {
        argument: "string",
        description: "Исходный или текущий текст в редакторе.",
        default: "''"
      },
      readOnly: {
        argument: "boolean",
        description: "Флаг блокировки редактирования. При true редактор переходит в режим просмотра.",
        default: "false"
      },
      onChange: {
        argument: "CallbackFunction",
        description: "Срабатывает при любом изменении исходного кода в окне редактора."
      }
    }
  },
  StreamSkeletonList: {
    title: "StreamSkeletonList (Плейсхолдер поиска)",
    description: "Вспомогательный компонент, отображающий красивую анимированную скелетную заглушку (мерцающие строки) во время ожидания парсинга раздач по торрент-трекерам.",
    example: `// Скелетная загрузка
const { ui } = PotokSDK;

ui.render(
  Card()
    .title("Поиск на раздачах...")
    .child(
      VStack()
        .spacing(12)
        .child(Text("Ищем подходящие раздачи...").variant("secondary"))
        .child(StreamSkeletonList())
    )
);`,
    methods: {}
  },
  StreamRow: {
    title: "StreamRow (Строка раздачи)",
    description: "Строковый элемент списка торрентов. Отображает название раздачи, размер файла, имя торрент-трекера, качество видео, а также число сидов/пиров с цветовой подсветкой.",
    example: `// Отдельная раздача
const { ui } = PotokSDK;

// Форма SDKStreamUIItem: сиды/личи — seeders/leechers, размер — sizeLabel (строка) или sizeBytes (число).
const streamData = {
  id: "rt-12345",
  title: "Интерстеллар (2014) BDRip [1080p]",
  tracker: "Rutracker",
  sizeLabel: "14.5 GB",
  sizeBytes: 15569256448,
  seeders: 120,
  leechers: 15,
  publishDate: "2015-03-10",
  tags: [
    { kind: "quality", value: "1080p" },
    { kind: "voice", value: "Дубляж" }
  ]
};

ui.render(
  StreamRow()
    .stream(streamData)
    .onClick((s) => {
      ui.showHUD("success", "Запуск: " + s.title);
    })
);`,
    methods: {
      stream: {
        argument: "object",
        description: "Метаданные раздачи (форма SDKStreamUIItem): id, title, tracker, sizeLabel или sizeBytes, seeders, leechers, publishDate, tags."
      },
      onClick: {
        argument: "CallbackFunction",
        description: "Обработчик клика по строительным раздачам для запуска воспроизведения."
      }
    }
  },
  MediaCard: {
    title: "MediaCard (Карточка фильма)",
    description: "Вертикальная карточка медиаресурса. Отображает постер, рейтинг (Кинопоиск/IMDb) и накладывает название и год выпуска при наведении курсора.",
    example: `// Карточка медиа
const { ui } = PotokSDK;

// Форма SDKMediaCard: id + mediaType обязательны для перехода, рейтинги и постер — по именам posterSrc/tmdbRating.
const movie = {
  id: 157336,
  title: "Интерстеллар",
  subtitle: "Interstellar (2014)",
  mediaType: "movie",
  posterSrc: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg",
  backdropSrc: "https://image.tmdb.org/t/p/original/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg",
  genres: "Фантастика, Драма",
  ageRating: "12+",
  tmdbRating: 8.4,
  kpRating: 8.6,
  imdbRating: 8.7,
  progress: { percentage: 45 }
};

ui.render(
  MediaCard()
    .item(movie)
    .onClick((item) => {
      ui.showHUD("success", "Вы выбрали: " + item.title);
    })
);`,
    methods: {
      item: {
        argument: "object",
        description: "Объект с метаданными фильма (title, posterUrl, year, rating)."
      },
      onClick: {
        argument: "CallbackFunction",
        description: "Коллбек-обработчик клика по карточке. Передает объект медиа."
      }
    }
  },
  HeroSpotlight: {
    title: "HeroSpotlight (Промо-баннер)",
    description: "Огромный рекламный промо-баннер для главной страницы плагина. Выводит фоновое изображение (арт) высокого разрешения, заголовок, описание и предоставляет интерактивные кнопки «Смотреть» и «Подробнее».",
    example: `// Промо баннер
const { ui } = PotokSDK;

// Фон берётся из backdropSrc (обязателен, иначе баннер не отрисуется); id + mediaType нужны для перехода «Подробнее».
const promo = {
  id: 335984,
  title: "Бегущий по лезвию 2049",
  mediaType: "movie",
  overview: "В новый век репликанты выполняют самую грязную работу...",
  backdropSrc: "https://image.tmdb.org/t/p/original/il8gr7YStcrui1EM2crk14G4HjL.jpg",
  genres: "Фантастика, Драма",
  tmdbRating: 8.0
};

ui.render(
  HeroSpotlight()
    .items([promo])
    .onPlay((item) => ui.showHUD("success", "Смотрим " + item.title))
    .onDetails((item) => ui.showHUD("info", "Открываем " + item.title))
);`,
    methods: {
      items: {
        argument: "any[]",
        description: "Массив медиа-элементов для слайдера баннера (title, overview, backdropUrl)."
      },
      onPlay: {
        argument: "CallbackFunction",
        description: "Обработчик клика по главной кнопке «Смотреть». Возвращает активный объект слайда."
      },
      onDetails: {
        argument: "CallbackFunction",
        description: "Обработчик клика по дополнительной кнопке «Подробнее»."
      }
    }
  },
  StreamList: {
    title: "StreamList (Список потоков)",
    description: "Готовый список раздач с интегрированной панелью фильтрации по качеству видео и весу файлов. Включает индикатор загрузки и заглушку пустого списка.",
    example: `// Список раздач с фильтрацией
const { ui } = PotokSDK;

const streams = [
  {
    title: "Интерстеллар (2014) BDRip [1080p]",
    size: "14.5 GB",
    seeds: 120,
    peers: 15,
    quality: "1080p",
    tracker: "Rutracker"
  }
];

ui.render(
  StreamList()
    .streams(streams)
    .loading(false)
    .showFilters(true)
    .emptyText("Потоки не найдены")
    .nounPlurals(["раздача", "раздачи", "раздач"])
    .onSelectStream((stream) => {
      ui.showHUD("success", "Выбран стрим: " + stream.title);
    })
);`,
    methods: {
      streams: {
        argument: "any[]",
        description: "Массив раздач для рендеринга. Каждая раздача должна соответствовать параметрам StreamRow.",
        default: "[]"
      },
      loading: {
        argument: "boolean",
        description: "При true переводит список в состояние загрузки и отображает мерцающие плейсхолдеры.",
        default: "false"
      },
      showFilters: {
        argument: "boolean",
        description: "Управляет отображением панели быстрой фильтрации по качеству и трекерам.",
        default: "false"
      },
      emptyText: {
        argument: "string",
        description: "Сообщение, отображаемое на экране при отсутствии элементов.",
        default: "'Раздачи не найдены'"
      },
      nounPlurals: {
        argument: "string[]",
        description: "Массив из трех склонений для правильного вывода числительных раздач (например, ['раздача', 'раздачи', 'раздач'])."
      },
      onSelectStream: {
        argument: "CallbackFunction",
        description: "Коллбек-функция, вызываемая при выборе потока. Передает выбранный объект стрима."
      }
    }
  },
  LoadingSpinner: {
    title: "LoadingSpinner (Анимированный спиннер)",
    description: "Круговой анимированный индикатор загрузки для индикации длительного ожидания ответов сети, парсинга торрентов или отрисовки UI.",
    example: `// Спиннер загрузки
const { ui } = PotokSDK;

ui.render(
  LoadingSpinner()
    .message("Пожалуйста, подождите...")
    .fullscreen(true)
    .height(200)
);`,
    methods: {
      message: {
        argument: "string",
        description: "Отображает поясняющий текст ожидания непосредственно под спиннером."
      },
      fullscreen: {
        argument: "boolean",
        description: "При true растягивает оверлей спиннера на весь экран поверх остальных элементов, блокируя интерфейс.",
        default: "false"
      }
    }
  },
  EpisodesSection: {
    title: "EpisodesSection (Каталог серий)",
    description: "Автономный блок сериала. Он запрашивает эпизоды из API шлюза по идентификатору, разделяет их на вкладки сезонов и отрисовывает в виде сетки эпизодов.",
    example: `// Сетка эпизодов сериала
const { ui } = PotokSDK;

ui.render(
  EpisodesSection()
    .mediaId("1399")
    .numberOfSeasons(8)
    .onEpisodeClick(({ episode, seasonNumber }) => {
      ui.showHUD("success", "S" + seasonNumber + " · эпизод " + episode.episodeNumber);
    })
);`,
    methods: {
      mediaId: {
        argument: "string | number",
        description: "Уникальный идентификатор сериала в базе данных медиа."
      },
      numberOfSeasons: {
        argument: "number",
        description: "Общее число сезонов сериала для отрисовки вкладок переключения."
      },
      onEpisodeClick: {
        argument: "CallbackFunction",
        description: "Коллбек при клике по конкретному эпизоду. Передает объект с параметрами серии."
      }
    }
  },
  MediaCast: {
    title: "MediaCast (Актерский состав)",
    description: "Горизонтальный ряд с карточками создателей фильма или актерского состава. Выводит круглые фотографии (аватары), реальные имена актеров и названия их ролей.",
    example: `// Актерский состав
const { ui } = PotokSDK;

// Фото актёра читается из profileSrc (по форме SDKCastMember), не из profilePath.
const actors = [
  {
    name: "Мэттью Макконахи",
    character: "Купер",
    profileSrc: "https://image.tmdb.org/t/p/w185/wD6U1N7Caw58tO43fT245U62y4a.jpg"
  },
  {
    name: "Энн Хэтэуэй",
    character: "Амелия Брэнд",
    profileSrc: "https://image.tmdb.org/t/p/w185/tLelKoPNiyJCSEtQTz1FGv4TLGc.jpg"
  }
];

ui.render(
  MediaCast()
    .cast(actors)
);`,
    methods: {
      cast: {
        argument: "any[]",
        description: "Массив объектов актеров (name, character, profilePath).",
        default: "[]"
      }
    }
  },
  MediaOverview: {
    title: "MediaOverview (Обзор медиаресурса)",
    description: "Большая интерактивная панель описания фильма или сериала. Отображает постер, оригинальное название, описание, год производства, страну, рейтинг, жанры и список создателей.",
    example: `// Описание сериала. Компонент читает форму SDKMediaCard: originalTitle, subtitle, genres (СТРОКА),
// ageRating, numberOfSeasons, overview, imdbRating/kpRating. selectedEpisode переключает описание на серию.
const { ui, createState } = PotokSDK;

const series = {
  id: 1399,
  title: "Игра престолов",
  originalTitle: "Game of Thrones",
  subtitle: "2011 · США",
  mediaType: "tv",
  overview: "Девять благородных семей ведут борьбу за контроль над мифическими землями Вестероса...",
  genres: "Фэнтези, Драма, Боевик",
  ageRating: "18+",
  numberOfSeasons: 8,
  imdbRating: 9.2,
  kpRating: 9.0
};

const state = createState({
  selectedEpisode: { episode: { episodeNumber: 1, name: "Зима близко" }, seasonNumber: 1 }
});

function draw() {
  ui.render(
    MediaOverview()
      .media(series)
      .selectedEpisode(state.selectedEpisode)
      .onResetEpisode(() => state.selectedEpisode = null)
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      media: {
        argument: "object",
        description: "Детальные метаданные фильма/сериала (title, overview, posterUrl, rating, genres, year, country)."
      },
      selectedEpisode: {
        argument: "object",
        description: "Объект текущей выбранной серии для отображения информации о серии вместо описания всего сезона (если это сериал)."
      },
      onResetEpisode: {
        argument: "CallbackFunction",
        description: "Коллбек сброса выбранной серии обратно к деталям всего сезона (клик по кнопке «Вернуться к описанию»)."
      }
    }
  },
  MediaRow: {
    title: "MediaRow (Горизонтальный ряд)",
    description: "Карусель с горизонтальной прокруткой для отображения списка карточек MediaCard. Снабжена общим заголовком и кнопкой «Показать все».",
    example: `// Карусель медиа
const { ui } = PotokSDK;

const movies = [
  { id: 157336, title: "Интерстеллар", subtitle: "2014", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg", tmdbRating: 8.4 },
  { id: 335984, title: "Бегущий по лезвию 2049", subtitle: "2017", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg", kpRating: 7.9 },
  { id: 27205, title: "Начало", subtitle: "2010", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", imdbRating: 8.8 }
];

ui.render(
  MediaRow()
    .title("Рекомендуемые фильмы")
    .items(movies)
    .onCardClick((item) => {
      ui.showHUD("info", "Клик: " + item.title);
    })
    .onSeeAllClick(() => {
      ui.showHUD("success", "Показать все!");
    })
);`,
    methods: {
      title: {
        argument: "string",
        description: "Заголовок для секции ряда (например, 'Сейчас смотрят')."
      },
      items: {
        argument: "any[]",
        description: "Массив объектов фильмов для отображения в ряду в виде карточек.",
        default: "[]"
      },
      onCardClick: {
        argument: "CallbackFunction",
        description: "Коллбек при клике на любую карточку фильма в ряду."
      },
      onSeeAllClick: {
        argument: "CallbackFunction",
        description: "Коллбек при клике на кнопку «Показать все» / «Смотреть все»."
      }
    }
  },
  MediaPlayer: {
    title: "MediaPlayer (Видеоплеер)",
    description: "Встроенный HTML5-видеоплеер с поддержкой форматов HLS (.m3u8), Dash (.mpd) и обычных MP4-файлов. Предоставляет полноценное управление воспроизведением, субтитрами и звуковыми дорожками.",
    example: `// Встроенный плеер
const { ui } = PotokSDK;

ui.render(
  MediaPlayer()
    .playback({
      streamUrl: "http://example.com/video.m3u8",
      streamType: "m3u8",
      title: "Название фильма",
      season: 1,
      episode: 3,
      torrentHash: "abc123def456",
      fileIndex: "0",
      audios: [
        { id: "ru", name: "Русский дубляж", url: "http://example.com/video_ru.m3u8" },
        { id: "en", name: "Английский оригинал", url: "http://example.com/video_en.m3u8" }
      ],
      headers: { "User-Agent": "PotokPlayer" },
      providerId: "my-torrents",
      voice: "dub",
      subtitles: [
        {
          id: "ru-vtt",
          src: "http://example.com/subs_ru.vtt",
          label: "Русские",
          language: "ru",
          isDefault: true,
          format: "vtt",
          name: "Русские",
          srclang: "ru",
          url: "http://example.com/subs_ru.vtt"
        }
      ],
      session: {
        keepaliveUrl: "http://example.com/session/keepalive",
        stopUrl: "http://example.com/session/stop",
        intervalSec: 30,
        hash: "abc123def456",
        file: "0",
        statusUrl: "http://example.com/session/status",
        statusIntervalSec: 5
      },
      duration: 7200,
      introStart: 0,
      introEnd: 90,
      outroStart: 7080,
      outroEnd: 7200,
      thumbnails: {
        urlTemplate: "http://example.com/thumbs/{time}.jpg",
        intervalSec: 5
      },
      requiresBuffering: false
    })
    .isNetworkOffline(false)
    .height(400)
);`,
    methods: {
      playback: {
        argument: "object",
        description: "Метаданные воспроизводимого потока (SDKPlaybackInfo): streamUrl, streamType, title, season, episode, torrentHash, fileIndex, audios ({id, name, url}[]), headers, providerId, voice, subtitles, session, duration, introStart/End, outroStart/End, thumbnails, requiresBuffering."
      },
      isNetworkOffline: {
        argument: "boolean",
        description: "Управляет оффлайн-режимом. При значении true останавливает проигрывание и выводит ошибку сети.",
        default: "false"
      }
    }
  },
  ProfileSelector: {
    title: "ProfileSelector (Селектор профилей)",
    description: "Компонент управления профилями соединений (серверами) для переключения адресов шлюзов Potok Gateway с пингом статуса, добавлением, удалением и редактированием серверов.",
    example: `// Менеджер серверов
const { ui } = PotokSDK;

const profiles = [
  {
    id: "p1",
    name: "Локальный шлюз",
    gatewayURL: "http://localhost:5000",
    playerServerURL: "http://localhost:8080",
    searchEngineURL: "http://localhost:6000",
    playerServerAuthEnabled: false,
    playerServerAuthLogin: "",
    playerServerAuthPassword: ""
  }
];

ui.render(
  ProfileSelector()
    .connectionProfiles(profiles)
    .activeProfileID("p1")
    .isSettingsLocked(false)
    .onSelectProfile((profileId) => {
      ui.showHUD("success", "Выбран профиль: " + profileId);
    })
    .onStartEdit((profile) => {
      ui.showHUD("info", "Редактирование: " + profile.name);
    })
    .onDeleteProfile((profileId) => {
      ui.showHUD("warning", "Удаление профиля: " + profileId);
    })
    .onStartAdd(() => {
      ui.showHUD("info", "Добавление профиля");
    })
);`,
    methods: {
      connectionProfiles: {
        argument: "any[]",
        description: "Массив доступных серверов/профилей (id, name, gatewayURL).",
        default: "[]"
      },
      activeProfileID: {
        argument: "string | null",
        description: "Идентификатор текущего выбранного/активного профиля подключения."
      },
      isSettingsLocked: {
        argument: "boolean",
        description: "При true блокирует кнопки создания, редактирования и удаления профилей.",
        default: "false"
      },
      onSelectProfile: {
        argument: "CallbackFunction",
        description: "Коллбек при переключении/клике по профилю. Передает объект выбранного профиля."
      },
      onStartEdit: {
        argument: "CallbackFunction",
        description: "Коллбек при клике на иконку «Карандаш» для изменения адреса или имени профиля."
      },
      onDeleteProfile: {
        argument: "CallbackFunction",
        description: "Коллбек при клике на удаление профиля («Корзина»)."
      },
      onStartAdd: {
        argument: "CallbackFunction",
        description: "Коллбек при клике по кнопке создания нового подключения («Добавить сервер»)."
      }
    }
  },
  SearchBar: {
    title: "SearchBar (Панель поиска)",
    description: "Специализированная поисковая строка со встроенной иконкой лупы и кнопкой быстрой очистки поля ввода. Отлично подходит для создания систем поиска контента.",
    example: `// Строка поиска
const { ui, createState } = PotokSDK;
const state = createState({ query: "" });

function draw() {
  ui.render(
    VStack()
      .spacing(12)
      .child(
        SearchBar()
          .value(state.query)
          .placeholder("Введите название...")
          .onChange((v) => state.query = v)
          .onClear(() => state.query = "")
      )
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      value: {
        argument: "string",
        description: "Текущий текст в поисковой строке.",
        default: "''"
      },
      placeholder: {
        argument: "string",
        description: "Подсказка ввода внутри поисковой строки.",
        default: "'Поиск...'"
      },
      onChange: {
        argument: "CallbackFunction",
        description: "Коллбек при изменении текста поискового запроса пользователем."
      },
      onClear: {
        argument: "CallbackFunction",
        description: "Коллбек при клике на иконку «Крестик» для сброса поисковой строки."
      }
    }
  },
  StreamFilterBar: {
    title: "StreamFilterBar (Панель сортировки)",
    description: "Готовая панель управления сортировкой и фильтрацией найденных раздач. Позволяет быстро переключать качество видео, выбирать трекер и сортировать раздачи (по весу, по сидерам).",
    example: `// Панель фильтров
const { ui, createState } = PotokSDK;
const state = createState({ sort: "seeds" });

function draw() {
  ui.render(
    StreamFilterBar()
      .countLabel("Всего найдено: 8 торрентов")
      .qualityFilter("1080p")
      .activeTracker("Rutracker")
      .trackers(["Rutracker", "Kinozal"])
      .showSort(true)
      .sortOption(state.sort)
      .onRefresh(() => ui.showHUD("info", "Обновление поиска"))
      .onQualityChange((q) => ui.showHUD("info", "Качество: " + q))
      .onTrackerChange((t) => ui.showHUD("info", "Трекер: " + t))
      .onSortChange((s) => {
        state.sort = s;
        ui.showHUD("success", "Сортировка: " + s);
      })
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      countLabel: {
        argument: "string",
        description: "Текстовая строка с количеством найденных раздач (выводится слева)."
      },
      qualityFilter: {
        argument: "string",
        description: "Устанавливает текущее выбранное качество для фильтрации (например, '1080p')."
      },
      activeTracker: {
        argument: "string",
        description: "Устанавливает активный выбранный трекер для фильтрации."
      },
      trackers: {
        argument: "string[]",
        description: "Массив названий трекеров для отображения в фильтре по источникам.",
        default: "[]"
      },
      showSort: {
        argument: "boolean",
        description: "Включает или выключает отображение выпадающего списка сортировки в правой части панели.",
        default: "true"
      },
      sortOption: {
        argument: "string",
        description: "Текущий активный вариант сортировки (например, 'seeds' или 'size')."
      },
      onRefresh: {
        argument: "CallbackFunction",
        description: "Коллбек при клике на кнопку «Обновить поиск»."
      },
      onQualityChange: {
        argument: "CallbackFunction",
        description: "Коллбек смены выбранного разрешения видео."
      },
      onTrackerChange: {
        argument: "CallbackFunction",
        description: "Коллбек смены активного трекера."
      },
      onSortChange: {
        argument: "CallbackFunction",
        description: "Коллбек при изменении порядка сортировки раздач."
      }
    }
  },
  EpisodeSelector: {
    title: "EpisodeSelector (Модальный выбор серий)",
    description: "Встроенный модальный селектор для детального выбора серий и сезонов сериала с прокруткой и фоновым постером.",
    example: `// Модальный селектор
const { ui, createState } = PotokSDK;
const state = createState({ open: false });

const mockEp = {
  id: "s01e01",
  season: 1,
  episode: 1,
  rawSeason: 1,
  rawEpisode: 1,
  title: "Зима близко",
  fileName: "Show.S01E01.mkv",
  stillPath: "https://image.tmdb.org/t/p/w500/j5M3P1xMWh1Sohc29N3L9B6c4W0.jpg",
  airDate: "2011-04-17",
  isWatched: false,
  sizeLabel: "1.2 GB",
  audios: [
    { id: "ru", name: "Русский дубляж", url: "http://example.com/s01e01_ru.m3u8" }
  ],
  url: "http://example.com/s01e01.m3u8"
};

function draw() {
  ui.render(
    VStack()
      .child(Button("Выбрать серию").onClick(() => state.open = true))
      .child(
        EpisodeSelector()
          .isOpen(state.open)
          .title("Игра Престолов")
          .subtitle("Выберите серию для просмотра")
          .backdropSrc("https://image.tmdb.org/t/p/original/example.jpg")
          .seasonsLoading(false)
          .seasons([{
            id: 1,
            seasonNumber: 1,
            season_number: 1,
            episodes: [{
              id: 101,
              episodeNumber: 1,
              episode_number: 1,
              name: "Зима близко",
              stillPath: "https://image.tmdb.org/t/p/w500/j5M3P1xMWh1Sohc29N3L9B6c4W0.jpg",
              airDate: "2011-04-17",
              overview: "Описание серии"
            }]
          }])
          .episodes([mockEp])
          .onClose(() => state.open = false)
          .onPlay((ep, audioId) => {
            state.open = false;
            ui.showHUD("success", "Запускаем: " + ep.title + " (" + audioId + ")");
          })
          .onApplyOverride(({ sourceSeason, targetSeason, offset }) => {
            ui.showHUD("info", "Override: " + sourceSeason + " -> " + targetSeason + " (offset " + offset + ")");
          })
          .onStartEditing(() => {
            ui.showHUD("info", "Редактирование сезонов");
          })
      )
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      isOpen: {
        argument: "boolean",
        description: "Управляет видимостью модального окна.",
        default: "false"
      },
      title: {
        argument: "string",
        description: "Главный заголовок модального окна (название сериала)."
      },
      subtitle: {
        argument: "string",
        description: "Подзаголовок (описание)."
      },
      episodes: {
        argument: "any[]",
        description: "Массив серий выбранного в данный момент сезона.",
        default: "[]"
      },
      backdropSrc: {
        argument: "string",
        description: "Ссылка на фоновое промо-изображение."
      },
      seasonsLoading: {
        argument: "boolean",
        description: "Состояние загрузки списков серий (при true отображает спиннер загрузки).",
        default: "false"
      },
      seasons: {
        argument: "any[]",
        description: "Массив доступных сезонов для отображения во вкладках.",
        default: "[]"
      },
      onClose: {
        argument: "CallbackFunction",
        description: "Коллбек, срабатывающий при закрытии модального окна."
      },
      onPlay: {
        argument: "CallbackFunction",
        description: "Коллбек при клике на воспроизведение серии в селекторе."
      },
      onApplyOverride: {
        argument: "CallbackFunction",
        description: "Коллбек при переопределении параметров серии."
      },
      onStartEditing: {
        argument: "CallbackFunction",
        description: "Коллбек в начале редактирования серий."
      }
    }
  },
  EpisodeCard: {
    title: "EpisodeCard (Карточка серии)",
    description: "Компонент отображения отдельной серии сериала. Выводит превью (кадр), номер эпизода, название и текстовое описание серии.",
    example: `// Карточка эпизода
const { ui } = PotokSDK;

const epData = {
  episodeNumber: 1,
  seasonNumber: 1,
  name: "Зима Близко",
  overview: "Лорд Эддард Старк принимает короля Роберта в своем замке Винтерфелл...",
  stillPath: "https://image.tmdb.org/t/p/w500/j5M3P1xMWh1Sohc29N3L9B6c4W0.jpg"
};

ui.render(
  EpisodeCard()
    .episode(epData)
    .onClick((ep) => {
      ui.showHUD("success", "Выбрана серия " + ep.episodeNumber);
    })
);`,
    methods: {
      episode: {
        argument: "object",
        description: "Объект с описанием серии (episodeNumber, seasonNumber, name, overview, stillPath)."
      },
      onClick: {
        argument: "CallbackFunction",
        description: "Обработчик клика по карточке серии. Передает выбранный объект серии."
      }
    }
  },
  ContentCard: {
    title: "ContentCard (Универсальная карточка)",
    description: "Карточка контента, НЕ привязанная к форме TMDB. Рисует постер, бейджи, полосу прогресса и заголовок из вашей собственной модели данных (SDKContentItem: id, title, subtitle, image, wideImage, badges, meta, progress, rank).",
    example: `// Карточка из своих данных
const { ui } = PotokSDK;

ui.render(
  ContentCard()
    .item({
      id: "track-1",
      title: "Nightcall",
      subtitle: "Kavinsky",
      image: "https://image.tmdb.org/t/p/w500/9O1Iy9od7uEuw6Bs4POV62Zzg2H.jpg",
      badges: [{ text: "NEW", color: "accent" }],
      meta: ["2010", "Synthwave"],
      progress: 0.4,
      rank: 1
    })
    .orientation("portrait")
    .onClick((item) => ui.showHUD("info", "Открыто: " + item.title))
);`,
    methods: {
      item: {
        argument: "SDKContentItem",
        description: "Объект контента: id, title, subtitle, image, wideImage, badges, meta, progress, rank, href."
      },
      orientation: {
        argument: "'portrait' | 'landscape'",
        description: "Ориентация карточки: вертикальный постер или широкий кадр.",
        default: "'portrait'"
      },
      onClick: {
        argument: "CallbackFunction",
        description: "Коллбек клика по карточке. Передаёт объект контента."
      }
    }
  },
  ContentRow: {
    title: "ContentRow (Универсальная карусель)",
    description: "Горизонтальный ряд карточек ContentCard из вашей собственной модели данных (SDKContentItem[]). Обобщённая версия MediaRow без привязки к TMDB: заголовок секции, кнопка «Показать все» и D-pad-скролл.",
    example: `// Ряд категории из своих данных
const { ui } = PotokSDK;

const items = [
  { id: "1", title: "Элемент 1", image: "https://image.tmdb.org/t/p/w500/9O1Iy9od7uEuw6Bs4POV62Zzg2H.jpg" },
  { id: "2", title: "Элемент 2", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" }
];

ui.render(
  ContentRow()
    .title("Моя подборка")
    .items(items)
    .orientation("portrait")
    .seeAllLabel("Все")
    .onCardClick((item) => ui.showHUD("info", "Клик: " + item.title))
    .onSeeAllClick(() => ui.showHUD("success", "Показать все"))
);`,
    methods: {
      title: {
        argument: "string",
        description: "Заголовок секции ряда."
      },
      items: {
        argument: "SDKContentItem[]",
        description: "Массив контента для карточек ряда.",
        default: "[]"
      },
      orientation: {
        argument: "'portrait' | 'landscape'",
        description: "Ориентация карточек ряда.",
        default: "'portrait'"
      },
      seeAllLabel: {
        argument: "string",
        description: "Текст кнопки «Показать все» (кнопка появляется только если задан onSeeAllClick)."
      },
      onCardClick: {
        argument: "CallbackFunction",
        description: "Коллбек клика по любой карточке ряда."
      },
      onSeeAllClick: {
        argument: "CallbackFunction",
        description: "Коллбек клика по кнопке «Показать все»."
      }
    }
  },
  Hero: {
    title: "Hero (Универсальный промо-баннер)",
    description: "Широкий промо-баннер из вашей собственной модели данных (SDKContentItem[]). Обобщённая версия HeroSpotlight без привязки к TMDB: фон wideImage, логотип/заголовок, метаданные, бейджи и кнопки «Смотреть» / «Подробнее».",
    example: `// Промо из своих данных
const { ui } = PotokSDK;

ui.render(
  Hero()
    .items([{
      id: "feature-1",
      title: "Мой контент",
      subtitle: "Описание featured-элемента, которое видно поверх фона.",
      wideImage: "https://image.tmdb.org/t/p/original/il8gr7YStcrui1EM2crk14G4HjL.jpg",
      meta: ["2024", "Драма", "2ч 15м"],
      badges: [{ text: "4K", color: "info" }]
    }])
    .playLabel("Смотреть")
    .detailsLabel("Подробнее")
    .onPlay((item) => ui.showHUD("success", "Смотрим: " + item.title))
    .onDetails((item) => ui.showHUD("info", "Подробнее: " + item.title))
);`,
    methods: {
      items: {
        argument: "SDKContentItem[]",
        description: "Массив featured-элементов. Отрисовывается первый элемент.",
        default: "[]"
      },
      playLabel: {
        argument: "string",
        description: "Текст главной кнопки.",
        default: "'Смотреть'"
      },
      detailsLabel: {
        argument: "string",
        description: "Текст дополнительной кнопки.",
        default: "'Подробнее'"
      },
      onPlay: {
        argument: "CallbackFunction",
        description: "Коллбек клика по главной кнопке. Передаёт активный элемент."
      },
      onDetails: {
        argument: "CallbackFunction",
        description: "Коллбек клика по кнопке «Подробнее»."
      }
    }
  },
  Image: {
    title: "Image (Изображение)",
    description: "Адаптивное изображение с ленивой загрузкой и запасной картинкой (fallback) при ошибке. Позволяет плагину выводить произвольные картинки, а не только через MediaCard.",
    example: `// Изображение с соотношением сторон и скруглением
const { ui } = PotokSDK;

ui.render(
  Image("https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg")
    .alt("Постер")
    .aspectRatio("2/3")
    .rounded(true)
    .fit("cover")
    .fallback("https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg")
    .width("12rem")
    .onClick(() => ui.showHUD("info", "Клик по изображению"))
);`,
    methods: {
      alt: { argument: "string", description: "Альтернативный текст изображения." },
      aspectRatio: { argument: "string", description: "Соотношение сторон рамки (например, '16/9' или '2/3')." },
      fallback: { argument: "string", description: "URL запасного изображения, показываемого при ошибке загрузки." },
      rounded: { argument: "boolean | string", description: "Скругление углов: true для стандартного радиуса или CSS-значение." },
      fit: { argument: "'cover' | 'contain'", description: "Режим вписывания изображения в рамку.", default: "'cover'" },
      onClick: { argument: "CallbackFunction", description: "Коллбек клика по изображению." }
    }
  },
  Icon: {
    title: "Icon (Иконка)",
    description: "Отдельная иконка из коллекции Lucide (например, 'play', 'heart', 'settings').",
    example: `// Набор иконок
const { ui } = PotokSDK;

ui.render(
  HStack()
    .spacing(12)
    .child(Icon("heart").color("#ff4d4f"))
    .child(Icon("star").size("1.5rem").color("#faad14"))
    .child(Icon("settings"))
);`,
    methods: {
      size: { argument: "string | number", description: "Размер иконки (например, '1.5rem' или 24)." },
      color: { argument: "string", description: "Цвет иконки (CSS-цвет)." }
    }
  },
  Tabs: {
    title: "Tabs (Вкладки)",
    description: "Горизонтальный таб-бар для переключения секций. Управляется значением value; клик по вкладке вызывает onChange(id), после чего плагин обновляет своё состояние и перерисовывается.",
    example: `// Переключение вкладок
const { ui, createState } = PotokSDK;
const state = createState({ tab: "overview" });

function draw() {
  ui.render(
    Tabs()
      .items([
        { id: "overview", label: "Обзор", icon: "info" },
        { id: "episodes", label: "Серии", icon: "list" },
        { id: "about", label: "О проекте" }
      ])
      .value(state.tab)
      .onChange((id) => state.tab = id)
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      items: { argument: "Array", description: "Массив вкладок: { id, label, icon? }.", default: "[]" },
      value: { argument: "string", description: "Идентификатор активной вкладки." },
      onChange: { argument: "CallbackFunction", description: "Коллбек смены вкладки. Передаёт id выбранной вкладки." }
    }
  },
  List: {
    title: "List (Список строк)",
    description: "Вертикальный список кликабельных строк с иконкой, заголовком, подзаголовком, бейджем и завершающей иконкой.",
    example: `// Список пунктов меню
const { ui } = PotokSDK;

ui.render(
  List()
    .items([
      { id: "a", title: "Настройки", subtitle: "Общие параметры", icon: "settings", trailingIcon: "chevron-right" },
      { id: "b", title: "Аккаунт", badge: "PRO", icon: "user", trailingIcon: "chevron-right" }
    ])
    .onItemClick((item) => ui.showHUD("info", "Выбрано: " + item.title))
);`,
    methods: {
      items: { argument: "Array", description: "Массив строк: { id, title, subtitle?, icon?, badge?, trailingIcon?, disabled? }.", default: "[]" },
      onItemClick: { argument: "CallbackFunction", description: "Коллбек клика по строке. Передаёт объект строки." }
    }
  },
  Tooltip: {
    title: "Tooltip (Всплывающая подсказка)",
    description: "Оборачивает дочерний элемент и показывает текстовую подсказку при наведении или фокусе.",
    example: `// Подсказка на кнопке
const { ui } = PotokSDK;

ui.render(
  Tooltip("Удалить навсегда")
    .placement("top")
    .child(Button("Удалить").variant("danger"))
);`,
    methods: {
      placement: { argument: "'top' | 'bottom' | 'left' | 'right'", description: "Позиция подсказки относительно элемента.", default: "'top'" },
      child: { argument: "UIComponent", description: "Обёрнутый элемент, к которому привязана подсказка." }
    }
  },
  ProgressBar: {
    title: "ProgressBar (Полоса прогресса)",
    description: "Горизонтальный индикатор прогресса (0..1) с необязательной подписью и процентом.",
    example: `// Полосы прогресса
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(12)
    .child(ProgressBar().value(0.35).label("Загрузка").showValue(true))
    .child(ProgressBar().value(0.8).variant("success"))
);`,
    methods: {
      value: { argument: "number", description: "Значение прогресса от 0 до 1.", default: "0" },
      variant: { argument: "'accent' | 'success' | 'warning' | 'error'", description: "Цвет полосы прогресса.", default: "'accent'" },
      label: { argument: "string", description: "Подпись над полосой." },
      showValue: { argument: "boolean", description: "Показывать процент справа.", default: "false" }
    }
  },
  Skeleton: {
    title: "Skeleton (Плейсхолдер загрузки)",
    description: "Обобщённый мерцающий плейсхолдер произвольного размера. Полезен для собственных состояний загрузки.",
    example: `// Плейсхолдеры загрузки
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(10)
    .child(Skeleton().height(24).width("60%"))
    .child(Skeleton().height(120).rounded("0.75rem"))
    .child(Skeleton().height(16).count(3))
);`,
    methods: {
      rounded: { argument: "boolean | string", description: "Скругление углов: true или CSS-значение." },
      count: { argument: "number", description: "Количество повторяющихся строк-плейсхолдеров.", default: "1" }
    }
  },
  EmptyState: {
    title: "EmptyState (Пустое состояние)",
    description: "Заглушка для пустых списков и экранов: иконка, заголовок, описание и необязательная кнопка действия.",
    example: `// Пустое состояние
const { ui } = PotokSDK;

ui.render(
  EmptyState()
    .icon("inbox")
    .title("Пока ничего нет")
    .description("Добавьте первый элемент, чтобы начать.")
    .actionLabel("Добавить")
    .onAction(() => ui.showHUD("info", "Создание..."))
);`,
    methods: {
      icon: { argument: "string", description: "Имя иконки Lucide по центру заглушки." },
      title: { argument: "string", description: "Заголовок заглушки." },
      description: { argument: "string", description: "Пояснительное описание." },
      actionLabel: { argument: "string", description: "Текст кнопки действия (кнопка появляется только если задан)." },
      onAction: { argument: "CallbackFunction", description: "Коллбек клика по кнопке действия." }
    }
  },
  Alert: {
    title: "Alert (Инлайн-уведомление)",
    description: "Цветной баннер уведомления (info/success/warning/error) с иконкой, заголовком и текстом.",
    example: `// Уведомления
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(10)
    .child(Alert("Соединение установлено").variant("success").icon("check-circle"))
    .child(Alert("Проверьте настройки сервера").variant("warning").title("Внимание").icon("alert-triangle"))
);`,
    methods: {
      title: { argument: "string", description: "Заголовок уведомления." },
      variant: { argument: "'info' | 'success' | 'warning' | 'error'", description: "Цветовая схема уведомления.", default: "'info'" },
      icon: { argument: "string", description: "Имя иконки Lucide (по умолчанию подбирается по variant)." }
    }
  },
  Chip: {
    title: "Chip (Чип/тег)",
    description: "Компактный переключаемый элемент-пилюля. Подходит для фильтров, жанров и быстрых действий.",
    example: `// Чипы-фильтры
const { ui, createState } = PotokSDK;
const state = createState({ genre: "all" });

function draw() {
  ui.render(
    HStack().spacing(8).children(
      [
        { id: "all", label: "Все", icon: "layers" },
        { id: "drama", label: "Драма", icon: "drama" },
        { id: "comedy", label: "Комедия", icon: "laugh" }
      ].map((g) =>
        Chip(g.label).icon(g.icon).active(state.genre === g.id).onClick(() => state.genre = g.id)
      )
    )
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      active: { argument: "boolean", description: "Активное (выбранное) состояние.", default: "false" },
      icon: { argument: "string", description: "Имя иконки Lucide перед текстом." },
      onClick: { argument: "CallbackFunction", description: "Коллбек клика по чипу." }
    }
  },
  IconButton: {
    title: "IconButton (Кнопка-иконка)",
    description: "Квадратная кнопка только с иконкой (без текста). Требует label (aria-label) для доступности.",
    example: `// Кнопки-иконки
const { ui } = PotokSDK;

ui.render(
  HStack()
    .spacing(8)
    .child(IconButton("play").label("Смотреть").size("lg").accent(true).onClick(() => ui.showHUD("success", "Пуск")))
    .child(IconButton("heart").label("В избранное").size("md").onClick(() => ui.showHUD("info", "Добавлено")))
);`,
    methods: {
      label: { argument: "string", description: "Текст aria-label (доступность и подсказка)." },
      accent: { argument: "boolean", description: "Подсвечивать акцентным цветом при наведении.", default: "false" },
      size: { argument: "'sm' | 'md' | 'lg'", description: "Размер кнопки.", default: "'md'" },
      onClick: { argument: "CallbackFunction", description: "Коллбек клика." }
    }
  },
  Modal: {
    title: "Modal (Модальное окно)",
    description: "Портальное окно поверх приложения: диалог, шторка (sheet) или поповер. Закрывается по ESC и клику на фон. Управляется состоянием open; содержимое — любые дочерние компоненты.",
    example: `// Диалог подтверждения
const { ui, createState } = PotokSDK;
const state = createState({ open: false });

function draw() {
  ui.render(
    VStack()
      .spacing(12)
      .children([
        Button("Открыть окно").onClick(() => state.open = true),
        Modal()
          .open(state.open)
          .title("Подтверждение")
          .variant("modal")
          .closeOnBackdrop(true)
          .onClose(() => state.open = false)
          .child(Text("Вы уверены, что хотите продолжить?").variant("secondary"))
          .child(
            HStack()
              .spacing(8)
              .children([
                Button("Отмена").variant("secondary").onClick(() => state.open = false),
                Button("Продолжить").variant("primary").onClick(() => {
                  state.open = false;
                  ui.showHUD("success", "Готово");
                })
              ])
          )
      ])
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      open: { argument: "boolean", description: "Управляет видимостью окна.", default: "false" },
      title: { argument: "string", description: "Заголовок в шапке окна." },
      variant: { argument: "'modal' | 'sheet' | 'popover'", description: "Тип оверлея: центрированный диалог, нижняя шторка или поповер.", default: "'modal'" },
      closeOnBackdrop: { argument: "boolean", description: "Закрывать окно по клику на затемнённый фон.", default: "true" },
      onClose: { argument: "CallbackFunction", description: "Коллбек закрытия (ESC, клик на фон)." }
    }
  },
  Collapsible: {
    title: "Collapsible (Сворачиваемая секция)",
    description: "Секция с кликабельным заголовком и скрываемым телом. Управляется состоянием open; несколько секций подряд образуют аккордеон.",
    example: `// Раскрывающаяся секция настроек
const { ui, createState } = PotokSDK;
const state = createState({ open: true });

function draw() {
  ui.render(
    Collapsible("Дополнительные параметры")
      .open(state.open)
      .onToggle((open) => state.open = open)
      .child(Text("Скрытое содержимое секции.").variant("secondary"))
      .child(Toggle("adv").label("Экспертный режим").value(false).onChange(() => {}))
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      open: { argument: "boolean", description: "Раскрыта ли секция.", default: "false" },
      onToggle: { argument: "CallbackFunction", description: "Коллбек переключения. Передаёт новое булево состояние." }
    }
  },
  Avatar: {
    title: "Avatar (Аватар)",
    description: "Круглое или квадратное изображение пользователя/актёра с ленивой загрузкой. При отсутствии картинки показывает инициалы из имени.",
    example: `// Аватары
const { ui } = PotokSDK;

ui.render(
  HStack()
    .spacing(12)
    .alignItems("center")
    .children([
      Avatar("https://image.tmdb.org/t/p/w185/wD6U1N7Caw58tO43fT245U62y4a.jpg")
        .name("Мэттью Макконахи")
        .size("lg")
        .shape("circle"),
      Avatar("")
        .name("Энн Хэтэуэй")
        .size("md")
        .shape("square")
        .fallback("https://image.tmdb.org/t/p/w185/tLelKoPNiyJCSEtQTz1FGv4TLGc.jpg")
    ])
);`,
    methods: {
      name: { argument: "string", description: "Имя: инициалы для запасного варианта и alt-текст." },
      size: { argument: "'sm' | 'md' | 'lg'", description: "Размер аватара.", default: "'md'" },
      fallback: { argument: "string", description: "URL запасного изображения при ошибке загрузки." },
      shape: { argument: "'circle' | 'square'", description: "Форма аватара.", default: "'circle'" }
    }
  },
  Rating: {
    title: "Rating (Рейтинг звёздами)",
    description: "Строка звёзд, отображающая оценку от 0 до max с поддержкой половинных звёзд и необязательным числовым значением.",
    example: `// Рейтинги
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(10)
    .children([
      Rating().value(4.5).max(5).showValue(true).size("md"),
      Rating().value(3).max(5).size("sm")
    ])
);`,
    methods: {
      value: { argument: "number", description: "Значение рейтинга (поддерживает дробное для половинных звёзд).", default: "0" },
      max: { argument: "number", description: "Максимальное число звёзд.", default: "5" },
      showValue: { argument: "boolean", description: "Показывать числовое значение справа.", default: "false" },
      size: { argument: "'sm' | 'md' | 'lg'", description: "Размер звёзд.", default: "'md'" }
    }
  },
  TagList: {
    title: "TagList (Список тегов)",
    description: "Набор тегов/жанров в виде пилюль. Статичные по умолчанию; при заданном onTagClick становятся кликабельными.",
    example: `// Жанры-теги
const { ui } = PotokSDK;

ui.render(
  TagList()
    .tags(["Фэнтези", "Драма", { id: "action", label: "Боевик" }])
    .onTagClick((id) => ui.showHUD("info", "Тег: " + id))
);`,
    methods: {
      tags: { argument: "Array<string | { id?, label }>", description: "Массив тегов: строки или объекты { id?, label }.", default: "[]" },
      onTagClick: { argument: "CallbackFunction", description: "Коллбек клика по тегу. Передаёт id (или строку)." }
    }
  },
  SectionHeader: {
    title: "SectionHeader (Заголовок секции)",
    description: "Заголовок раздела страницы с необязательным подзаголовком и кнопкой действия («Показать все»).",
    example: `// Заголовок раздела
const { ui } = PotokSDK;

ui.render(
  SectionHeader("Продолжить просмотр")
    .subtitle("12 фильмов и сериалов")
    .actionLabel("Показать все")
    .onAction(() => ui.showHUD("info", "Все элементы раздела"))
);`,
    methods: {
      subtitle: { argument: "string", description: "Подзаголовок под основным заголовком." },
      actionLabel: { argument: "string", description: "Текст кнопки действия справа (кнопка появляется только если задан onAction)." },
      onAction: { argument: "CallbackFunction", description: "Коллбек клика по кнопке действия." }
    }
  },
  ContinueWatchingRow: {
    title: "ContinueWatchingRow (Продолжить просмотр)",
    description: "Горизонтальный ряд широких карточек с полосой прогресса — раздел «Продолжить просмотр» из вашей модели данных (SDKContentItem[], поле progress 0..1).",
    example: `// Ряд «Продолжить просмотр»
const { ui } = PotokSDK;

const items = [
  { id: "1", title: "Дюна: Часть вторая", subtitle: "2024", wideImage: "https://image.tmdb.org/t/p/w780/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg", progress: 0.6 },
  { id: "2", title: "Интерстеллар", subtitle: "2014", wideImage: "https://image.tmdb.org/t/p/w780/il8gr7YStcrui1EM2crk14G4HjL.jpg", progress: 0.25 }
];

ui.render(
  ContinueWatchingRow()
    .title("Продолжить просмотр")
    .items(items)
    .onCardClick((item) => ui.showHUD("info", "Продолжаем: " + item.title))
);`,
    methods: {
      title: { argument: "string", description: "Заголовок ряда." },
      items: { argument: "SDKContentItem[]", description: "Элементы с полем progress (0..1) для полосы прогресса.", default: "[]" },
      onCardClick: { argument: "CallbackFunction", description: "Коллбек клика по карточке." }
    }
  },
  TopTenRow: {
    title: "TopTenRow (Топ-10)",
    description: "Ранжированный ряд с крупным номером позиции у каждого постера. Номер берётся из поля rank или из позиции элемента (до 10).",
    example: `// Ранжированный ряд «Топ-10»
const { ui } = PotokSDK;

const items = [
  { id: "1", title: "Фильм 1", image: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg" },
  { id: "2", title: "Фильм 2", image: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg" },
  { id: "3", title: "Фильм 3", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" }
];

ui.render(
  TopTenRow()
    .title("Топ-10 сегодня")
    .items(items)
    .onCardClick((item) => ui.showHUD("info", item.title))
);`,
    methods: {
      title: { argument: "string", description: "Заголовок ряда." },
      items: { argument: "SDKContentItem[]", description: "До 10 элементов; номер — из поля rank или позиции.", default: "[]" },
      onCardClick: { argument: "CallbackFunction", description: "Коллбек клика по карточке." }
    }
  },
  PosterGrid: {
    title: "PosterGrid (Сетка постеров)",
    description: "Адаптивная сетка карточек-постеров с необязательной кнопкой догрузки (бесконечный список) — для страниц каталога/категории из вашей модели данных.",
    example: `// Сетка постеров с догрузкой
const { ui } = PotokSDK;

const items = [
  { id: "1", title: "Дюна", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
  { id: "2", title: "Начало", image: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg" },
  { id: "3", title: "Интерстеллар", image: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg" }
];

ui.render(
  PosterGrid()
    .items(items)
    .minWidth("10rem")
    .loadMoreLabel("Показать ещё")
    .onCardClick((item) => ui.showHUD("info", item.title))
    .onLoadMore(() => ui.showHUD("info", "Загрузка следующей страницы..."))
);`,
    methods: {
      items: { argument: "SDKContentItem[]", description: "Карточки сетки.", default: "[]" },
      minWidth: { argument: "string", description: "Минимальная ширина колонки.", default: "'10rem'" },
      loadMoreLabel: { argument: "string", description: "Текст кнопки догрузки (появляется только если задан onLoadMore)." },
      onCardClick: { argument: "CallbackFunction", description: "Коллбек клика по карточке." },
      onLoadMore: { argument: "CallbackFunction", description: "Коллбек догрузки следующей страницы." }
    }
  },
  DetailHero: {
    title: "DetailHero (Hero детальной страницы)",
    description: "Крупный баннер детальной страницы: фон, логотип/заголовок, метаданные, бейджи и настраиваемые кнопки действий. Клик по кнопке возвращает её id.",
    example: `// Hero детальной страницы
const { ui } = PotokSDK;

ui.render(
  DetailHero()
    .item({
      id: "1",
      title: "Дюна: Часть вторая",
      subtitle: "Пол Атрейдес объединяется с Чани и фрименами...",
      wideImage: "https://image.tmdb.org/t/p/original/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg",
      meta: ["2024", "Фантастика", "2ч 46м"],
      badges: [{ text: "4K", color: "info" }]
    })
    .actions([
      { id: "play", label: "Смотреть", icon: "play" },
      { id: "trailer", label: "Трейлер", icon: "film", variant: "ghost" }
    ])
    .onAction((actionId) => ui.showHUD("success", "Действие: " + actionId))
);`,
    methods: {
      item: { argument: "SDKContentItem", description: "Featured-элемент: wideImage/logo/title/subtitle/meta/badges." },
      actions: { argument: "Array<{ id, label, icon?, variant? }>", description: "Кнопки действий. variant: 'ghost' — прозрачная.", default: "[]" },
      onAction: { argument: "CallbackFunction", description: "Коллбек клика по кнопке. Передаёт id действия." }
    }
  },
  Range: {
    title: "Range (Ползунок)",
    description: "Ползунок выбора числового значения в диапазоне [min, max] с шагом step и необязательным отображением текущего значения.",
    example: `// Ползунок громкости
const { ui, createState } = PotokSDK;
const state = createState({ volume: 50 });

function draw() {
  ui.render(
    Range("volume")
      .label("Громкость")
      .min(0)
      .max(100)
      .step(1)
      .value(state.volume)
      .showValue(true)
      .onChange((v) => state.volume = v)
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      value: { argument: "number", description: "Текущее значение.", default: "0" },
      min: { argument: "number", description: "Минимальное значение диапазона." },
      max: { argument: "number", description: "Максимальное значение диапазона." },
      step: { argument: "number", description: "Шаг изменения значения." },
      label: { argument: "string", description: "Подпись над ползунком." },
      showValue: { argument: "boolean", description: "Показывать текущее значение справа от подписи.", default: "false" },
      onChange: { argument: "CallbackFunction", description: "Коллбек изменения. Передаёт число." }
    }
  },
  Segmented: {
    title: "Segmented (Сегмент-контрол)",
    description: "Компактный переключатель из нескольких соединённых сегментов. Управляется значением value; альтернатива Tabs для 2–4 вариантов.",
    example: `// Переключатель вида
const { ui, createState } = PotokSDK;
const state = createState({ view: "grid" });

function draw() {
  ui.render(
    Segmented()
      .items([
        { id: "grid", label: "Сетка" },
        { id: "list", label: "Список" }
      ])
      .value(state.view)
      .onChange((id) => state.view = id)
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      items: { argument: "Array<{ id, label }>", description: "Сегменты переключателя.", default: "[]" },
      value: { argument: "string", description: "Идентификатор активного сегмента." },
      onChange: { argument: "CallbackFunction", description: "Коллбек смены. Передаёт id сегмента." }
    }
  },
  Dropdown: {
    title: "Dropdown (Выпадающее меню)",
    description: "Кнопка-триггер с выпадающим списком вариантов. Открытие/закрытие управляется самим компонентом; выбор пункта возвращает его id.",
    example: `// Выпадающая сортировка
const { ui, createState } = PotokSDK;
const state = createState({ sort: "new" });

function draw() {
  ui.render(
    Dropdown()
      .label("Сортировка")
      .icon("arrow-up-down")
      .value(state.sort)
      .items([
        { id: "new", label: "Сначала новые", icon: "clock" },
        { id: "rating", label: "По рейтингу", icon: "star" },
        { id: "az", label: "По алфавиту" }
      ])
      .onSelect((id) => state.sort = id)
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      label: { argument: "string", description: "Текст кнопки-триггера по умолчанию." },
      icon: { argument: "string", description: "Имя иконки Lucide в триггере." },
      items: { argument: "Array<{ id, label, icon? }>", description: "Пункты меню.", default: "[]" },
      value: { argument: "string", description: "Идентификатор выбранного пункта." },
      onSelect: { argument: "CallbackFunction", description: "Коллбек выбора пункта. Передаёт id." }
    }
  },
  FileInput: {
    title: "FileInput (Выбор файла)",
    description: "Поле выбора файла с фильтром типов. onChange получает { names, count } — имена и количество выбранных файлов.",
    example: `// Загрузка постера
const { ui } = PotokSDK;

ui.render(
  FileInput("poster")
    .label("Загрузить постер")
    .accept("image/*")
    .multiple(false)
    .onChange((info) => ui.showHUD("info", "Выбрано файлов: " + info.count))
);`,
    methods: {
      label: { argument: "string", description: "Подпись над полем." },
      accept: { argument: "string", description: "Фильтр типов файлов (например, 'image/*')." },
      multiple: { argument: "boolean", description: "Разрешить выбор нескольких файлов.", default: "false" },
      onChange: { argument: "CallbackFunction", description: "Коллбек выбора. Получает { names: string[], count }." }
    }
  },
  Field: {
    title: "Field (Поле формы)",
    description: "Обёртка контрола с подписью сверху и подсказкой снизу. Оборачивает любой вложенный контрол (Input, Select, Range и т.д.).",
    example: `// Поле с подписью и подсказкой
const { ui, createState } = PotokSDK;
const state = createState({ url: "" });

function draw() {
  ui.render(
    Field()
      .label("Адрес сервера")
      .hint("Например, http://localhost:8080")
      .child(
        Input("url")
          .placeholder("http://...")
          .value(state.url)
          .onChange((v) => state.url = v)
      )
  );
}
state.$subscribe(draw); draw();`,
    methods: {
      label: { argument: "string", description: "Подпись над контролом." },
      hint: { argument: "string", description: "Подсказка под контролом." }
    }
  },
  Carousel: {
    title: "Carousel (Карусель)",
    description: "Горизонтальная карусель произвольных элементов со скролл-снапом. В отличие от рядов контента, принимает любые компоненты.",
    example: `// Карусель карточек
const { ui } = PotokSDK;

ui.render(
  Carousel()
    .spacing(16)
    .children([
      Card().title("Слайд 1").child(Text("Первый слайд")),
      Card().title("Слайд 2").child(Text("Второй слайд")),
      Card().title("Слайд 3").child(Text("Третий слайд"))
    ])
);`,
    methods: {
      spacing: { argument: "number", description: "Зазор между элементами в пикселях." }
    }
  },
  Scroller: {
    title: "Scroller (Скролл-контейнер)",
    description: "Обобщённый контейнер с прокруткой (горизонтальной или вертикальной) для произвольных элементов.",
    example: `// Горизонтальная лента тегов
const { ui } = PotokSDK;

ui.render(
  Scroller()
    .orientation("horizontal")
    .spacing(12)
    .children([
      Badge("Тег 1"),
      Badge("Тег 2"),
      Badge("Тег 3"),
      Badge("Тег 4"),
      Badge("Тег 5")
    ])
);`,
    methods: {
      orientation: { argument: "'horizontal' | 'vertical'", description: "Направление прокрутки.", default: "'vertical'" },
      spacing: { argument: "number", description: "Зазор между элементами в пикселях." }
    }
  },
  Page: {
    title: "Page (Оболочка страницы)",
    description: "Оболочка кастомной страницы плагина с заголовком и областью контента (на базе PageFrame).",
    example: `// Оболочка страницы
const { ui } = PotokSDK;

ui.render(
  Page()
    .title("Моя страница")
    .spacing(16)
    .children([
      SectionHeader("Раздел"),
      Text("Контент страницы во всю ширину, обёрнутый в оболочку PageFrame.").variant("secondary")
    ])
);`,
    methods: {
      title: { argument: "string", description: "Заголовок страницы в шапке." },
      spacing: { argument: "number", description: "Зазор между элементами контента в пикселях." }
    }
  }
};

// 1. Generate JSON
const newMetadataStr = JSON.stringify(componentsMetadata, null, 2);
let existingMetadata = '';
try {
  existingMetadata = fs.readFileSync(metadataPath, 'utf8');
} catch (err) {}

if (newMetadataStr !== existingMetadata) {
  fs.writeFileSync(metadataPath, newMetadataStr, 'utf8');
  console.log(`[document-sdk] JSON metadata generated at: ${metadataPath}`);
} else {
  console.log(`[document-sdk] JSON metadata is already up to date.`);
}

// Helper to find the class block range using brace matching
function findClassRange(content, className) {
  const startIdx = content.indexOf(`export class ${className} `);
  if (startIdx === -1) return null;
  
  // Find the opening brace of the class
  const openBraceIdx = content.indexOf('{', startIdx);
  if (openBraceIdx === -1) return null;
  
  let braceCount = 1;
  let idx = openBraceIdx + 1;
  while (braceCount > 0 && idx < content.length) {
    if (content[idx] === '{') {
      braceCount++;
    } else if (content[idx] === '}') {
      braceCount--;
    }
    idx++;
  }
  return { start: startIdx, end: idx };
}

// Helper to inject JSDoc comments into a file
function injectJSDoc(filePath) {
  const originalContent = fs.readFileSync(filePath, 'utf8');
  let content = originalContent;

  // Go through all components in metadata
  for (const [name, meta] of Object.entries(componentsMetadata)) {
    const builderName = `${name}Builder`;
    let range = findClassRange(content, builderName);
    if (!range) continue;

    // 1. Strip class JSDoc
    // Find if there is a JSDoc block ending before the class start (range.start)
    const beforeClass = content.substring(0, range.start);
    const jsdocMatch = beforeClass.match(/\/\*\*(?:[^*]|\*(?!\/))*\*\/\s*$/);
    if (jsdocMatch) {
      content = content.substring(0, jsdocMatch.index) + content.substring(range.start);
      // Recalculate range after modification
      range = findClassRange(content, builderName);
    }

    if (!range) continue;
    let classContent = content.substring(range.start, range.end);

    // 2. Strip existing method JSDocs inside classContent
    for (const methodName of Object.keys(meta.methods || {})) {
      const methodRegex = new RegExp(`([ \\t]*)\\/\\*\\*(?:\\r?\\n\\s*\\*.*)*\\r?\\n\\s*\\*\\/\\s*?${methodName}\\(`, 'g');
      classContent = classContent.replace(methodRegex, '$1' + methodName + '(');
    }

    // 3. Inject new method JSDocs
    for (const [methodName, methodMeta] of Object.entries(meta.methods || {})) {
      const methodRegex = new RegExp(`^([ \\t]+)${methodName}\\(`, 'm');
      const match = classContent.match(methodRegex);
      if (match) {
        const indent = match[1];
        const replacement = `${indent}/**\n${indent} * ${methodMeta.description}\n${indent} *\n${indent} * @param v Значение метода\n${methodMeta.default ? `${indent} * @default ${methodMeta.default}\n` : ''}${indent} */\n${indent}${methodName}(`;
        classContent = classContent.replace(new RegExp(`^${indent}${methodName}\\(`, 'm'), replacement);
      }
    }

    // 4. Construct class JSDoc
    const classDoc = `/**
 * ${meta.title}
 * 
 * ${meta.description}
 * 
 * @example
 * ${meta.example.split('\n').join('\n * ')}
 */
`;

    // 5. Replace class block in content
    content = content.substring(0, range.start) + classDoc + classContent + content.substring(range.end);
  }

  if (content.replace(/\r\n/g, '\n') !== originalContent.replace(/\r\n/g, '\n')) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[document-sdk] JSDocs injected successfully into: ${filePath}`);
  } else {
    console.log(`[document-sdk] JSDocs in ${filePath} are already up to date.`);
  }
}

injectJSDoc(commonPath);
injectJSDoc(mediaPath);

console.log('[document-sdk] Documentation injection completed successfully.');
