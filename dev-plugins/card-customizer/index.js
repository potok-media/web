import { PotokSDK } from 'potok-sdk';

const { VStack, HStack, Text, Divider, Toggle, Select, Button, Input, CodeEditor } = PotokSDK.ui.components;

// ── Defaults ──────────────────────────────────────────────────────────────────
// Only settings that mainline can honour via pure CSS (injectHostCss). Card-content
// features from the fork (logo/genres/year/textless/enhanced-classic) are gone: they
// needed a modified MediaCardComponent, and by design we don't touch host components.
const DEFAULTS = {
  // Карточки
  titleAlign: 'center',    // .media-card-title text-align (mainline card is centered)
  overlay: 'normal',       // .media-card-overlay gradient strength
  cardHover: 'default',    // hover effect on .media-poster-wrap
  cardRadius: 'normal',    // .media-poster-wrap border-radius
  hideRatings: 'false',    // hide the rating pill
  cardGap: 'normal',       // spacing between cards
  // Размер
  cardSize: 'medium',      // grid --grid-min-width + carousel --carousel-visible-slots
  // Баннер
  heroHeight: 'normal',
  heroOverlay: 'normal',
  heroBgBlur: 'false',
  heroDesc: '3',
  heroWidth: 'normal',
  heroMeta: 'true',
  vignette: 'false',
  grain: 'false',
  // Интерфейс
  uiDensity: 'normal',
  uiRadius: 'default',
  noAnimations: 'false',
  // Свой CSS
  customCss: '',
};

// ── Persistence ───────────────────────────────────────────────────────────────
// storage.local.getItem is synchronous (local mirror); setItem persists to scoped
// storage. Requires the "storage" permission.
function loadSettings() {
  const result = {};
  Object.keys(DEFAULTS).forEach((k) => {
    const val = PotokSDK.storage.local.getItem(k);
    result[k] = val !== null ? val : DEFAULTS[k];
  });
  return result;
}

function saveSetting(key, value) {
  PotokSDK.storage.local.setItem(key, String(value));
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const GRAIN_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

function applySettings(settings) {
  const heroHeights       = { compact: '55vh', normal: '84vh', tall: '95vh' };
  const heroMaxHeights    = { compact: '37.5rem', normal: '50rem', tall: '65rem' };
  const heroHeightsDet    = { compact: '60vh', normal: '90vh', tall: '98vh' };
  const heroMaxHeightsDet = { compact: '42rem', normal: '59.375rem', tall: '70rem' };
  const overlayStops      = { light: '55%', normal: '80%', dark: '100%' };
  const blurPx = settings.heroBgBlur === 'true' ? '10px' : '0px';

  const rules = [];

  // ── Карточки: выравнивание названия ────────────────────────────────────────
  // Реальный класс мейнлайна — .media-card-title (не форковый .media-card-meta-title).
  if (settings.titleAlign) {
    rules.push(`.media-card-title, .media-card-subtitle { text-align: ${settings.titleAlign} !important; }`);
  }

  // ── Затемнение оверлея карточки ─────────────────────────────────────────────
  const overlays = {
    light: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 35%)',
    dark: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 30%, transparent 72%)',
  };
  if (overlays[settings.overlay]) {
    rules.push(`.media-card-overlay { background: ${overlays[settings.overlay]} !important; }`);
  }

  // Запас под свечение/тень при наведении: у .carousel-viewport сверху остаётся мало
  // места — glow обрезается. Расширяем padding и компенсируем margin (видимый отступ тот же).
  rules.push(`
    .carousel-viewport {
      padding-top: 1.75rem !important;
      margin-top: -1.5rem !important;
    }
  `);

  // ── Hover-эффект карточек ────────────────────────────────────────────────────
  const hoverStyles = {
    scale: `transform: translateY(-4px) scale(1.03) !important; box-shadow: 0 10px 24px rgba(0,0,0,0.45) !important;`,
    glow: `transform: translate3d(0,0,0) !important; box-shadow: 0 0 18px var(--accent-semi) !important;`,
    none: `transform: translate3d(0,0,0) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.35) !important;`,
  };
  if (hoverStyles[settings.cardHover]) {
    rules.push(`
      @media (hover: hover) {
        .media-card:hover .media-poster-wrap { ${hoverStyles[settings.cardHover]} }
      }
    `);
  }

  // ── Скругление постеров ───────────────────────────────────────────────────────
  const posterRadii = { sharp: '0.25rem', round: '1.1rem' };
  if (posterRadii[settings.cardRadius]) {
    rules.push(`.media-poster-wrap { border-radius: ${posterRadii[settings.cardRadius]} !important; }`);
  }

  // ── Скрыть рейтинги ───────────────────────────────────────────────────────────
  if (settings.hideRatings === 'true') {
    rules.push(`.media-glass-pill.rating-pill { display: none !important; }`);
  }

  // ── Отступы между карточками ──────────────────────────────────────────────────
  // Carousels compute card width from --space-m; grids read --grid-gap (fallback 0).
  const gaps = { tight: '0.5rem', wide: '1.4rem' };
  if (gaps[settings.cardGap]) {
    rules.push(`
      .carousel-row { --space-m: ${gaps[settings.cardGap]}; }
      .potok-grid, .library-grid { gap: ${gaps[settings.cardGap]} !important; }
    `);
  }

  // ── Размер карточек ───────────────────────────────────────────────────────────
  // Grids resize via --grid-min-width; carousels via the visible-slot count (fewer
  // slots → wider cards). For "small" we also lift the host's nth-child(n+11) hide so
  // the extra narrower cards actually show.
  if (settings.cardSize === 'small') {
    rules.push(`
      .potok-grid, .library-grid { --grid-min-width: 9.5rem !important; }
      .carousel-row { --carousel-visible-slots: 12 !important; }
      .carousel-row .media-card:nth-child(n+11) { display: revert !important; }
      .carousel-row .media-card:nth-child(n+13) { display: none !important; }
    `);
  } else if (settings.cardSize === 'large') {
    rules.push(`
      .potok-grid, .library-grid { --grid-min-width: 15rem !important; }
      .carousel-row { --carousel-visible-slots: 8 !important; }
    `);
  }

  // ── Баннер (hero) ─────────────────────────────────────────────────────────────
  rules.push(`
    .home-page-container .immersive-hero-container {
      height: ${heroHeights[settings.heroHeight] || '84vh'} !important;
      max-height: ${heroMaxHeights[settings.heroHeight] || '50rem'} !important;
    }
    .immersive-hero-container {
      height: ${heroHeightsDet[settings.heroHeight] || '90vh'} !important;
      max-height: ${heroMaxHeightsDet[settings.heroHeight] || '59.375rem'} !important;
    }
    .immersive-hero-overlay {
      background: linear-gradient(to top, var(--bg-window) 0%, transparent ${overlayStops[settings.heroOverlay] || '80%'}) !important;
    }
    .immersive-hero-backdrop {
      filter: blur(${blurPx});
      transform: ${settings.heroBgBlur === 'true' ? 'scale(1.04)' : 'none'};
    }
  `);

  // Описание в hero
  if (settings.heroDesc === 'hidden') {
    rules.push(`.hero-overview { display: none !important; }`);
  } else if (settings.heroDesc !== '3') {
    rules.push(`.hero-overview { -webkit-line-clamp: ${settings.heroDesc} !important; }`);
  }

  // Ширина текстового блока hero
  const heroWidths = { narrow: '40%', wide: '75%' };
  if (heroWidths[settings.heroWidth]) {
    rules.push(`.hero-content { width: ${heroWidths[settings.heroWidth]} !important; }`);
  }

  // Метаданные hero
  if (settings.heroMeta === 'false') {
    rules.push(`.hero-metadata, .hero-metadata-row { display: none !important; }`);
  }

  // Виньетка
  if (settings.vignette === 'true') {
    rules.push(`
      .immersive-hero-container::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%);
      }
    `);
  }

  // Зерно
  if (settings.grain === 'true') {
    rules.push(`
      .immersive-hero-container::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        background-image: ${GRAIN_URI};
        opacity: 0.07;
        mix-blend-mode: overlay;
      }
    `);
  }

  // ── Интерфейс ─────────────────────────────────────────────────────────────────
  if (settings.uiDensity === 'compact') {
    rules.push(`
      :root {
        --space-s: 0.4rem;
        --space-m: 0.6rem;
        --space-l: 0.85rem;
        --space-xl: 1.1rem;
        --space-xxl: 1.7rem;
      }
    `);
  }

  const radiusSets = {
    sharp: `--radius-s: 0.2rem; --radius-m: 0.3rem; --radius-l: 0.45rem; --radius-xl: 0.6rem;`,
    round: `--radius-s: 0.5rem; --radius-m: 0.9rem; --radius-l: 1.4rem; --radius-xl: 2rem;`,
  };
  if (radiusSets[settings.uiRadius]) {
    rules.push(`:root { ${radiusSets[settings.uiRadius]} }`);
  }

  if (settings.noAnimations === 'true') {
    rules.push(`
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
        scroll-behavior: auto !important;
      }
    `);
  }

  // Two named layers: generated rules + the user's free-form CSS on top. Both appended
  // after the app's stylesheets, so their !important rules win. The host safeguard keeps
  // the settings entry + extensions manager reachable, so "Свой CSS" can't lock the user out.
  PotokSDK.ui.injectHostCss('card-settings', rules.join('\n'));
  PotokSDK.ui.injectHostCss('card-settings-user', settings.customCss || '');
}

// ── Reactive state ──────────────────────────────────────────────────────────────
let currentSettings = { ...DEFAULTS };
let cssDraft = null;   // черновик CodeEditor (не перерисовываем на каждый ввод)
let ioText = '';       // поле экспорта/импорта
let activeSection = 'cards';

function rerender() {
  PotokSDK.ui.render(buildLayout(), 'card-settings-tab');
}

function updateSetting(key, value) {
  currentSettings[key] = value;
  saveSetting(key, value);
  applySettings(currentSettings);
  rerender();
}

// ── Секции ──────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'cards', label: 'Карточки', icon: 'LayoutGrid' },
  { id: 'size', label: 'Размер', icon: 'Scaling' },
  { id: 'hero', label: 'Баннер', icon: 'Image' },
  { id: 'ui', label: 'Интерфейс', icon: 'PanelsTopLeft' },
  { id: 'css', label: 'Свой CSS', icon: 'Code' },
  { id: 'io', label: 'Экспорт / импорт', icon: 'ArrowLeftRight' },
];

function buildSectionCards() {
  const s = currentSettings;
  return [
    Select('title-align')
      .label('Выравнивание названия')
      .options([
        { value: 'left', label: 'По левому краю' },
        { value: 'center', label: 'По центру' },
        { value: 'right', label: 'По правому краю' },
      ])
      .value(s.titleAlign)
      .onChange(v => updateSetting('titleAlign', v)),
    Select('card-overlay')
      .label('Затемнение оверлея')
      .options([
        { value: 'light', label: 'Лёгкое' },
        { value: 'normal', label: 'Стандартное' },
        { value: 'dark', label: 'Тёмное' },
      ])
      .value(s.overlay)
      .onChange(v => updateSetting('overlay', v)),
    Select('card-hover')
      .label('Эффект при наведении')
      .options([
        { value: 'default', label: 'Стандартный' },
        { value: 'scale', label: 'Только подъём' },
        { value: 'glow', label: 'Только свечение' },
        { value: 'none', label: 'Выключен' },
      ])
      .value(s.cardHover)
      .onChange(v => updateSetting('cardHover', v)),
    Select('card-radius')
      .label('Скругление постеров')
      .options([
        { value: 'sharp', label: 'Острые углы' },
        { value: 'normal', label: 'Стандартное' },
        { value: 'round', label: 'Сильное' },
      ])
      .value(s.cardRadius)
      .onChange(v => updateSetting('cardRadius', v)),
    Toggle('hide-ratings')
      .label('Скрыть рейтинги')
      .description('Убирает бейдж с оценкой на карточках')
      .checked(s.hideRatings === 'true')
      .onChange(v => updateSetting('hideRatings', v ? 'true' : 'false')),
    Select('card-gap')
      .label('Отступы между карточками')
      .options([
        { value: 'tight', label: 'Плотно' },
        { value: 'normal', label: 'Стандартно' },
        { value: 'wide', label: 'Просторно' },
      ])
      .value(s.cardGap)
      .onChange(v => updateSetting('cardGap', v)),
  ];
}

function buildSectionSize() {
  const s = currentSettings;
  return [
    Select('card-size')
      .label('Размер карточек')
      .options([
        { value: 'small', label: 'Маленький' },
        { value: 'medium', label: 'Средний' },
        { value: 'large', label: 'Большой' },
      ])
      .value(s.cardSize)
      .onChange(v => updateSetting('cardSize', v)),
    Text('Меняет размер карточек в сетках (библиотека, поиск) и в каруселях на главной.')
      .variant('secondary').size('sm'),
  ];
}

function buildSectionHero() {
  const s = currentSettings;
  return [
    Select('hero-height')
      .label('Высота баннера')
      .options([
        { value: 'compact', label: 'Компактный' },
        { value: 'normal', label: 'Стандартный' },
        { value: 'tall', label: 'Высокий' },
      ])
      .value(s.heroHeight)
      .onChange(v => updateSetting('heroHeight', v)),
    Select('hero-overlay')
      .label('Затемнение снизу')
      .options([
        { value: 'light', label: 'Лёгкое' },
        { value: 'normal', label: 'Стандартное' },
        { value: 'dark', label: 'Тёмное' },
      ])
      .value(s.heroOverlay)
      .onChange(v => updateSetting('heroOverlay', v)),
    Select('hero-desc')
      .label('Описание')
      .options([
        { value: 'hidden', label: 'Скрыто' },
        { value: '2', label: '2 строки' },
        { value: '3', label: '3 строки' },
        { value: '5', label: '5 строк' },
      ])
      .value(s.heroDesc)
      .onChange(v => updateSetting('heroDesc', v)),
    Select('hero-width')
      .label('Ширина текстового блока')
      .options([
        { value: 'narrow', label: 'Узкий' },
        { value: 'normal', label: 'Стандартный' },
        { value: 'wide', label: 'Широкий' },
      ])
      .value(s.heroWidth)
      .onChange(v => updateSetting('heroWidth', v)),
    Toggle('hero-meta')
      .label('Метаданные')
      .description('Год, рейтинги и жанры в баннере')
      .checked(s.heroMeta === 'true')
      .onChange(v => updateSetting('heroMeta', v ? 'true' : 'false')),
    Toggle('hero-bg-blur')
      .label('Размытие фона')
      .description('Лёгкий blur на изображении баннера')
      .checked(s.heroBgBlur === 'true')
      .onChange(v => updateSetting('heroBgBlur', v ? 'true' : 'false')),
    Toggle('vignette')
      .label('Виньетка')
      .description('Затемнение по краям баннера, киношный вид')
      .checked(s.vignette === 'true')
      .onChange(v => updateSetting('vignette', v ? 'true' : 'false')),
    Toggle('grain')
      .label('Зерно')
      .description('Лёгкий эффект плёночного шума на баннере')
      .checked(s.grain === 'true')
      .onChange(v => updateSetting('grain', v ? 'true' : 'false')),
  ];
}

function buildSectionUi() {
  const s = currentSettings;
  return [
    Select('ui-density')
      .label('Плотность интерфейса')
      .options([
        { value: 'normal', label: 'Стандартная' },
        { value: 'compact', label: 'Компактная' },
      ])
      .value(s.uiDensity)
      .onChange(v => updateSetting('uiDensity', v)),
    Select('ui-radius')
      .label('Скругления интерфейса')
      .options([
        { value: 'sharp', label: 'Острые' },
        { value: 'default', label: 'Стандартные' },
        { value: 'round', label: 'Круглые' },
      ])
      .value(s.uiRadius)
      .onChange(v => updateSetting('uiRadius', v)),
    Toggle('no-animations')
      .label('Отключить анимации')
      .description('Убирает все переходы и анимации — для слабых устройств')
      .checked(s.noAnimations === 'true')
      .onChange(v => updateSetting('noAnimations', v ? 'true' : 'false')),
  ];
}

function buildSectionCss() {
  const s = currentSettings;
  return [
    Text('Произвольные CSS-правила поверх всех настроек. Применяются кнопкой ниже и сохраняются между сессиями. Кнопку настроек и раздел расширений скрыть нельзя — хост это защищает.')
      .variant('secondary').size('sm'),
    CodeEditor('custom-css')
      .value(cssDraft !== null ? cssDraft : s.customCss)
      .onChange(v => { cssDraft = v; }),
    Button('Применить CSS')
      .variant('secondary')
      .icon('Check')
      .onClick(() => {
        const css = cssDraft !== null ? cssDraft : s.customCss;
        updateSetting('customCss', css);
        PotokSDK.ui.showHUD('success', 'CSS применён');
      }),
  ];
}

function buildSectionIo() {
  return [
    Input('io-field')
      .label('Строка настроек (JSON)')
      .placeholder('Нажми «Экспорт» или вставь сюда строку и нажми «Импорт»')
      .value(ioText)
      .onChange(v => { ioText = v; }),
    HStack().spacing(8).children([
      Button('Экспорт').variant('secondary').icon('Upload')
        .onClick(() => {
          ioText = JSON.stringify(currentSettings);
          rerender();
          PotokSDK.ui.showHUD('success', 'Настройки выгружены в поле — скопируй строку');
        }),
      Button('Импорт').variant('secondary').icon('Download')
        .onClick(() => {
          try {
            const parsed = JSON.parse(ioText);
            let applied = 0;
            Object.keys(DEFAULTS).forEach((k) => {
              if (typeof parsed[k] === 'string') {
                currentSettings[k] = parsed[k];
                saveSetting(k, parsed[k]);
                applied++;
              }
            });
            if (!applied) throw new Error('no keys');
            cssDraft = null;
            applySettings(currentSettings);
            rerender();
            PotokSDK.ui.showHUD('success', `Импортировано настроек: ${applied}`);
          } catch (e) {
            PotokSDK.ui.showHUD('error', 'Не удалось разобрать строку настроек');
          }
        }),
    ]),
    Divider(),
    Button('Сбросить все настройки')
      .variant('ghost')
      .icon('RotateCcw')
      .onClick(() => {
        currentSettings = { ...DEFAULTS };
        Object.entries(DEFAULTS).forEach(([k, v]) => saveSetting(k, v));
        cssDraft = null;
        ioText = '';
        applySettings(currentSettings);
        rerender();
        PotokSDK.ui.showHUD('success', 'Настройки сброшены');
      }),
  ];
}

// ── UI ────────────────────────────────────────────────────────────────────────
function buildLayout() {
  const tabs = HStack()
    .id('custom-section-tabs')
    .spacing(18)
    .children(SECTIONS.map((sec) => {
      const isActive = activeSection === sec.id;
      // Активная вкладка показывает подпись; остальные — компактные иконки.
      return Button(isActive ? sec.label : '')
        .id(`tab-${sec.id}`)
        .variant(isActive ? 'cardtab-active' : 'cardtab')
        .icon(sec.icon)
        .onClick(() => {
          activeSection = sec.id;
          rerender();
        });
    }));

  let sectionRows;
  switch (activeSection) {
    case 'size': sectionRows = buildSectionSize(); break;
    case 'hero': sectionRows = buildSectionHero(); break;
    case 'ui': sectionRows = buildSectionUi(); break;
    case 'css': sectionRows = buildSectionCss(); break;
    case 'io': sectionRows = buildSectionIo(); break;
    case 'cards':
    default: sectionRows = buildSectionCards();
  }

  return VStack().spacing(14).children([
    tabs,
    Divider(),
    VStack().spacing(10).children(sectionRows),
  ]);
}

// ── Bootstrap ───────────────────────────────────────────────────────────────
{
  currentSettings = loadSettings();
  applySettings(currentSettings);

  PotokSDK.registerSlotContribution({
    id: 'card-settings-tab',
    slotName: 'settings-tabs',
    title: 'Custom',
    render() {
      return {
        label: 'Custom',
        layout: buildLayout(),
      };
    },
  });
}
