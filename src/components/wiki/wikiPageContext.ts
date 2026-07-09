import { createContext, useContext } from "react";

interface WikiPageContextValue {
  openPage: (pageKey: string) => void;
}

export const WikiPageContext = createContext<WikiPageContextValue | null>(null);

export function useWikiPageNav() {
  return useContext(WikiPageContext);
}