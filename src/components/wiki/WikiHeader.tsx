import React from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "../ui";

interface WikiHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const WikiHeader: React.FC<WikiHeaderProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <header className="wiki-header-nav">
      <div className="wiki-header-left">
        <img src="/favicon.svg" className="wiki-wolf-logo" alt="Potok Logo" />
        <Link to="/" className="wiki-brand-title">Potok</Link>
      </div>

      <div className="wiki-header-right">
        <form className="wiki-search-form" onSubmit={handleSearch}>
          <Search size="0.875rem" className="wiki-search-icon-inside" />
          <Input
            type="text"
            className="wiki-search-input-field"
            placeholder="Быстрый поиск по Wiki..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <a href="https://github.com/potok-media" target="_blank" rel="noreferrer" className="wiki-icon-btn">
          <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </a>
      </div>
    </header>
  );
};
