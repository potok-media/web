import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HUDProvider } from "./context/HUDContext";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import { AppLayout } from "./components/AppLayout";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { MediaDetailsPage } from "./pages/MediaDetailsPage";
import { TorrentsPage } from "./pages/TorrentsPage";
import "./index.css";

export const App: React.FC = () => {
  return (
    <HUDProvider>
      <AppSettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="search" element={<LibraryPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="media/:mediaType/:id" element={<MediaDetailsPage />} />
              <Route path="media/:mediaType/:id/torrents" element={<TorrentsPage />} />
              <Route path="library/:collectionType" element={<LibraryPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppSettingsProvider>
    </HUDProvider>
  );
};

export default App;
