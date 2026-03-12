import { createContext, ReactElement } from 'react';
import { TabManagerIpc } from 'src/ipc';

export interface InternalTabMetaItem {
  title: string;
  icon: ReactElement;
}

export interface InternalTabMeta {
  tabs: Record<string, InternalTabMetaItem>;
  setTabMeta: (meta: InternalTabMetaItem, tabId?: string) => void;
}

export const TabMetaContext = createContext<TabManagerIpc | null>(null);
export const InternalTabMetaContext = createContext<InternalTabMeta | null>(
  null,
);
