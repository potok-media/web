import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { i18n } from "./i18n";
import { HUDProvider } from "./context/HUDContext";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import { InspectorProvider } from "./context/InspectorContext";
import { WSSyncProvider } from "./context/WSSyncContext";
import { WatchTogetherProvider } from "./context/WatchTogetherContext";
import { WatchTogetherEndedModal } from "./components/watchTogether/WatchTogetherEndedModal";
import { CommandPalette } from "./components/search/CommandPalette";
import { AppLayout } from "./components/AppLayout";
import { WikiDocumentRedirect } from "./pages/WikiDocumentRedirect";
const HomePage = React.lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const LibraryPage = React.lazy(() => import("./pages/LibraryPage").then(m => ({ default: m.LibraryPage })));
const StatusLibraryPage = React.lazy(() => import("./pages/StatusLibraryPage").then(m => ({ default: m.StatusLibraryPage })));
const LibraryFolderPage = React.lazy(() => import("./pages/LibraryFolderPage").then(m => ({ default: m.LibraryFolderPage })));
const ContinueWatchingPage = React.lazy(() => import("./pages/ContinueWatchingPage").then(m => ({ default: m.ContinueWatchingPage })));
const SearchPage = React.lazy(() => import("./pages/SearchPage").then(m => ({ default: m.SearchPage })));
const CalendarPage = React.lazy(() => import("./pages/CalendarPage").then(m => ({ default: m.CalendarPage })));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ExtensionPage = React.lazy(() => import("./pages/ExtensionPage").then(m => ({ default: m.ExtensionPage })));
const MediaDetailsPage = React.lazy(() => import("./pages/MediaDetailsPage").then(m => ({ default: m.MediaDetailsPage })));
const MediaArmDetailsPage = React.lazy(() => import("./pages/MediaArmDetailsPage").then(m => ({ default: m.MediaArmDetailsPage })));
const MediaStreamsPage = React.lazy(() => import("./pages/MediaStreamsPage").then(m => ({ default: m.MediaStreamsPage })));
const ContinueWatchPage = React.lazy(() => import("./pages/ContinueWatchPage").then(m => ({ default: m.ContinueWatchPage })));
const SandboxPage = React.lazy(() => import("./pages/SandboxPage").then(m => ({ default: m.SandboxPage })));
const ActorPage = React.lazy(() => import("./pages/ActorPage").then(m => ({ default: m.ActorPage })));
const WatchTogetherPage = React.lazy(() => import("./pages/WatchTogetherPage").then(m => ({ default: m.WatchTogetherPage })));
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingSpinner } from "./components/LoadingSpinner";
import "./index.css";

export const App: React.FC = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <HUDProvider>
        <WSSyncProvider>
        <AppSettingsProvider>
          <InspectorProvider>
            <BrowserRouter>
              <WatchTogetherProvider>
                <ErrorBoundary>
                  <React.Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      <Route path="/" element={<AppLayout />}>
                        <Route index element={<HomePage />} />
                        <Route path="search" element={<SearchPage />} />
                        <Route path="calendar" element={<CalendarPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="profile/:section" element={<ProfilePage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="extensions/:tab" element={<ExtensionPage />} />
                        <Route path="media/p/:potokId" element={<MediaArmDetailsPage />} />
                        <Route path="media/:mediaType/:id" element={<MediaDetailsPage />} />
                        <Route path="media/:mediaType/:id/watch/:tab?" element={<MediaStreamsPage />} />
                        <Route path="continue-watch" element={<ContinueWatchPage />} />
                        <Route path="library/planned" element={<StatusLibraryPage status="planned" titleKey="library.tabs.planned" />} />
                        <Route path="library/watching" element={<StatusLibraryPage status="watching" titleKey="library.tabs.watching" />} />
                        <Route path="library/completed" element={<StatusLibraryPage status="completed" titleKey="library.tabs.completed" />} />
                        <Route path="library/folder/:folderId" element={<LibraryFolderPage />} />
                        {/* Компактные группы серий (owner-approved Variant 3) — НЕ generic LibraryPage:
                            /library/up-next по-прежнему редиректится на /library/continue из LibraryPage. */}
                        <Route path="library/continue" element={<ContinueWatchingPage />} />
                        {/* /collections скрыт: см. комментарий в AppSidebar — раздел «Подборки» временно убран из-за зависания. */}
                        <Route path="library/:collectionType" element={<LibraryPage />} />
                        <Route path="actor/:id" element={<ActorPage />} />
                        <Route path="watch-together" element={<WatchTogetherPage />} />
                      </Route>
                      <Route path="sandbox" element={<SandboxPage />} />
                      <Route path="wiki/*" element={<WikiDocumentRedirect />} />
                    </Routes>
                  </React.Suspense>
                </ErrorBoundary>
                <WatchTogetherEndedModal />
                {/* The palette lives outside the routes ErrorBoundary by design (it is global
                    chrome, not a route), so it gets its own boundary: a palette failure must
                    never take the whole app down with it. */}
                <ErrorBoundary>
                  <CommandPalette />
                </ErrorBoundary>
              </WatchTogetherProvider>
            </BrowserRouter>
          </InspectorProvider>
        </AppSettingsProvider>
        </WSSyncProvider>
      </HUDProvider>
    </I18nextProvider>
  );
};

export default App;
