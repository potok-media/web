import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/** Files refactored to strict standards — `any` is forbidden here. */
const strictTypedFiles = [
  'src/components/**',
  'src/pages/ActorPage.tsx',
  'src/pages/ProfilePage.tsx',
  'src/pages/CalendarPage.tsx',
  'src/pages/MediaDetailsPage.tsx',
  'src/pages/MediaStreamsPage.tsx',
  'src/pages/LibraryPage.tsx',
  'src/pages/SettingsPage.tsx',
  'src/pages/HomePage.tsx',
  'src/hooks/useActorDetails.ts',
  'src/hooks/useSubtitlesOctopus.ts',
  'src/hooks/useDebouncedSeek.ts',
  'src/hooks/usePlayerPlaylist.ts',
  'src/hooks/usePlayerSubtitlePipeline.ts',
  'src/hooks/usePlayerBackendSession.ts',
  'src/hooks/useWebMediaPlayer.ts',
  'src/hooks/usePlayerMenus.ts',
  'src/hooks/usePlayerBufferingSpinner.ts',
  'src/hooks/usePlayerResumeToast.ts',
  'src/hooks/usePlayerLoadingState.ts',
  'src/hooks/usePlayerVideoError.ts',
  'src/hooks/usePlayerTrackSwitching.ts',
  'src/hooks/useEpisodeSelectorState.ts',
  'src/hooks/useDeclarativeSettings.ts',
  'src/hooks/useInspectorMonaco.ts',
  'src/hooks/usePopoverCoords.ts',
  'src/hooks/useCustomThemesBootstrap.ts',
  'src/hooks/useMonacoEditor.ts',
  'src/hooks/usePluginSandbox.ts',
  'src/hooks/useHlsPlayer.ts',
  'src/hooks/player/**',
  'src/hooks/mediaDetails/**',
  'src/hooks/useMediaDetails.ts',
  'src/hooks/subtitles/**',
  'src/context/**',
  'src/network/**',
  'src/hooks/useSeasonEpisodes.ts',
  'src/hooks/usePlaybackTracker.ts',
  'src/hooks/usePlayerInactivity.ts',
  'src/hooks/useLibraryPage.ts',
  'src/hooks/usePlayerMetadataAndTracks.ts',
  'src/hooks/useMediaStreamsEpisodePlay.ts',
  'src/hooks/mediaStreams/**',
  'src/hooks/useExtensionInstall.ts',
  'src/hooks/useHeroWatchlist.ts',
  'src/hooks/useHeroSlideshow.ts',
  'src/hooks/useEpisodePickerData.ts',
  'src/hooks/usePotokAuth.ts',
  'src/hooks/useProfileHandshake.ts',
  'src/network/apiClientHelpers.ts',
  'src/network/syncTraktPayloads.ts',
  'src/hooks/useLibraryPageRendering.ts',
  'src/hooks/**',
  'src/pages/**',
  'src/utils/extensions/**',
  'src/utils/worker/**',
  'src/workers/**',
  'src/utils/playbackUrl.ts',
  'src/utils/actorFilmography.ts',
  'src/utils/actorLifeDates.ts',
  'src/utils/actorDepartment.ts',
  'src/utils/language.ts',
  'src/utils/formatDate.ts',
  'src/utils/actorFilmography.test.ts',
  'src/utils/language.test.ts',
  'src/utils/logger.ts',
  'src/utils/monaco/**',
  'src/utils/extensions/pluginSandbox/**',
  'src/utils/hls/**',
]

/** ui primitives may use native button/input elements internally. */
const rawControlExceptions = ['src/components/ui/**']

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Legacy debt: warn until modules are migrated incrementally.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Honor the `_`-prefix convention for intentionally-unused bindings (signature params, etc.).
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      'no-console': 'error',
      // Existing data-fetch effects; migrate to async patterns incrementally.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: strictTypedFiles,
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/components/**/*.tsx'],
    ignores: rawControlExceptions,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.name="button"]',
          message: 'Use Button, IconButton, or Chip from components/ui instead of a raw <button>.',
        },
        {
          selector: 'JSXOpeningElement[name.name="input"]',
          message: 'Use Input or Switch from components/ui instead of a raw <input>.',
        },
      ],
    },
  },
  {
    files: [
      'src/utils/logger.ts',
      'src/sdk/**',
      'src/pages/wiki/**',
      'vite.config.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
])