import type React from "react";

export interface WikiTocItem {
  id: string;
  text: string;
}

export interface WikiPageEntry {
  title: string;
  category: string;
  categoryKey: string;
  toc: WikiTocItem[];
  render: (openInSandbox: (code: string) => void) => React.ReactNode;
}

export type WikiPagesMap = Record<string, WikiPageEntry>;