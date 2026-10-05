export const componentSlug = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export const componentGroups = [
  { label: 'Разметка и контейнеры', en: 'Layout and containers', names: ['VStack', 'HStack', 'Grid', 'Card', 'Divider', 'Spacer', 'Tabs', 'List', 'Tooltip', 'Modal', 'Collapsible', 'SectionHeader', 'Segmented', 'Carousel', 'Scroller', 'Page', 'SidebarGroup'] },
  { label: 'Текст и информация', en: 'Text and information', names: ['Heading', 'Text', 'Badge', 'StatusRow', 'Markdown', 'Icon', 'Alert', 'EmptyState', 'ProgressBar', 'Skeleton', 'Rating', 'TagList'] },
  { label: 'Формы и ввод', en: 'Forms and input', names: ['Button', 'Input', 'Toggle', 'Select', 'CodeEditor', 'Chip', 'IconButton', 'Range', 'Dropdown', 'FileInput', 'Field'] },
  { label: 'Медиа', en: 'Media', names: ['ContentCard', 'ContentRow', 'Hero', 'Image', 'Avatar', 'ContinueWatchingRow', 'TopTenRow', 'PosterGrid', 'DetailHero', 'MediaCard', 'MediaRow', 'HeroSpotlight', 'LoadingSpinner', 'EpisodesSection', 'EpisodeCard', 'EpisodeSelector'] },
  { label: 'Плееры и потоки', en: 'Players and streams', names: ['MediaCast', 'MediaOverview', 'StreamRow', 'StreamList', 'StreamSkeletonList', 'MediaPlayer', 'ProfileSelector', 'SearchBar', 'StreamFilterBar'] },
];
