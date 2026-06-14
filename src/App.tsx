import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HUDProvider } from "./context/HUDContext";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import { InspectorProvider } from "./context/InspectorContext";
import { WSSyncProvider } from "./context/WSSyncContext";
import { AppLayout } from "./components/AppLayout";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { ExtensionPage } from "./pages/ExtensionPage";
import { MediaDetailsPage } from "./pages/MediaDetailsPage";
import { MediaStreamsPage } from "./pages/MediaStreamsPage";
import { WikiPage } from "./pages/WikiPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

export const App: React.FC = () => {
  return (
    <HUDProvider>
      <WSSyncProvider>
        <AppSettingsProvider>
          <InspectorProvider>
            <BrowserRouter>
              <ErrorBoundary>
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
              </ErrorBoundary>
            </BrowserRouter>
          </InspectorProvider>
        </AppSettingsProvider>
      </WSSyncProvider>
    </HUDProvider>
  );
};

export default App;
