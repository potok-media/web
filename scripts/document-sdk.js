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
    .child(Text("Внимание! Требуется действие (warning).").variant("warning"))
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
      Markdown(markdownContent)
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

const state = createState({ username: "" });

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

const streamData = {
  title: "Интерстеллар (2014) BDRip [1080p]",
  size: "14.5 GB",
  seeds: 120,
  peers: 15,
  quality: "1080p",
  tracker: "Rutracker"
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
        description: "Метаданные потока раздачи. Должен содержать: title, size, seeds, peers, quality, tracker."
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

const movie = {
  title: "Интерстеллар",
  posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg",
  year: 2014,
  rating: 8.6
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

const promo = {
  title: "Бегущий по лезвию 2049",
  overview: "В новый век репликанты выполняют самую грязную работу...",
  backdropUrl: "https://image.tmdb.org/t/p/original/il8gr7YStcrui1EM2crk14G4HjL.jpg"
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
    .onEpisodeClick((ep) => {
      ui.showHUD("success", "Выбран эпизод " + ep.episodeNumber);
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

const actors = [
  {
    name: "Мэттью Макконахи",
    character: "Купер",
    profilePath: "https://image.tmdb.org/t/p/w185/wD6U1N7Caw58tO43fT245U62y4a.jpg"
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
    example: `// Описание фильма
const { ui } = PotokSDK;

const movieData = {
  title: "Интерстеллар",
  overview: "Наше время на Земле подошло к концу, группа исследователей предпринимает путешествие в космос...",
  posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg",
  rating: 8.6,
  genres: ["Научная фантастика", "Драма"],
  year: 2014,
  country: "США"
};

ui.render(
  MediaOverview()
    .media(movieData)
);`,
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

const movie = {
  title: "Интерстеллар",
  posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg",
  year: 2014,
  rating: 8.6
};

ui.render(
  MediaRow()
    .title("Рекомендуемые фильмы")
    .items([movie, movie, movie])
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
    searchEngineURL: "http://localhost:7000",
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
    .onSelectProfile((p) => {
      ui.showHUD("success", "Выбран профиль: " + p.name);
    })
    .onStartEdit((p) => {
      ui.showHUD("info", "Редактирование: " + p.name);
    })
    .onDeleteProfile((p) => {
      ui.showHUD("warning", "Удаление: " + p.name);
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
          .onApplyOverride((sourceSeason, targetSeason, offset) => {
            ui.showHUD("info", "Override: " + sourceSeason + " -> " + targetSeason);
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
