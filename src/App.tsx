import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { i18n } from "./i18n";
import { HUDProvider } from "./context/HUDContext";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import { InspectorProvider } from "./context/InspectorContext";
import { WSSyncProvider } from "./context/WSSyncContext";
import { AppLayout } from "./components/AppLayout";
const HomePage = React.lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const LibraryPage = React.lazy(() => import("./pages/LibraryPage").then(m => ({ default: m.LibraryPage })));
const CalendarPage = React.lazy(() => import("./pages/CalendarPage").then(m => ({ default: m.CalendarPage })));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ExtensionPage = React.lazy(() => import("./pages/ExtensionPage").then(m => ({ default: m.ExtensionPage })));
const MediaDetailsPage = React.lazy(() => import("./pages/MediaDetailsPage").then(m => ({ default: m.MediaDetailsPage })));
const MediaStreamsPage = React.lazy(() => import("./pages/MediaStreamsPage").then(m => ({ default: m.MediaStreamsPage })));
const WikiPage = React.lazy(() => import("./pages/WikiPage").then(m => ({ default: m.WikiPage })));
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
              <ErrorBoundary>
                <React.Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route path="/" element={<AppLayout />}>
                      <Route index element={<HomePage />} />
                      <Route path="search" element={<LibraryPage />} />
                      <Route path="calendar" element={<CalendarPage />} />
                      <Route path="profile" element={<ProfilePage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="extensions/:tab" element={<ExtensionPage />} />
                      <Route path="media/:mediaType/:id" element={<MediaDetailsPage />} />
                      <Route path="media/:mediaType/:id/watch/:tab?" element={<MediaStreamsPage />} />
                      <Route path="library/:collectionType" element={<LibraryPage />} />
                    </Route>
                    <Route path="wiki" element={<WikiPage />} />
                  </Routes>
                </React.Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </InspectorProvider>
        </AppSettingsProvider>
        </WSSyncProvider>
      </HUDProvider>
    </I18nextProvider>
  );
};

export default App;
